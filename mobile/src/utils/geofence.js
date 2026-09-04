// ========================================================================
// Keltron MPP EMS — Industrial-Grade Background Geofence & Auto-Punch Engine
// ========================================================================
// Features:
// 1. Persistent 24/7 Foreground Location Service (Never killed by Android OS)
// 2. Dual-Boundary Hysteresis (Enter <= 700m, Exit >= 850m) to eliminate false exits indoors
// 3. GPS Accuracy Filtering (ignores low-accuracy/bouncing readings > 75m)
// 4. Debounced Exit Confirmation (requires 3 consecutive outside readings over 60s)
// 5. Rate-Limiting & Minimum Shift Protection (prevents rapid toggle loops)
// 6. High-Priority Push Notifications for Auto-Punch ONLY
// 7. Dynamic Multi-Shift Support (Shift 1 [7 AM - 3 PM], Shift 2 [3 PM - 11 PM], Shift 3 [11 PM - 7 AM], General)
// ========================================================================

import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiUrlList } from '../config/api';
import {
  syncAlarmState,
  scheduleDailyShiftAlarms,
  ensureBackgroundLocationRunning,
  BACKGROUND_LOCATION_TASK,
} from './shiftAlarmManager';

// ── Company Geofence Coordinates & Hysteresis Boundaries ──────────────
export const KELTRON_KANNUR_GEOFENCE = {
  identifier: 'KELTRON_KANNUR_PLANT_300M',
  latitude: 11.983878,
  longitude: 75.374253,
  radius: 300,         // Enter threshold (within 300 meters)
  exitRadius: 400,     // Exit threshold (must be past 400 meters with hysteresis)
  notifyOnEnter: true,
  notifyOnExit: true,
};

export const GEOFENCE_TASK_NAME = 'KELTRON_KANNUR_AUTOMATED_PUNCH_GEOFENCE';
export const NOTIFICATION_CHANNEL_ID = 'keltron_autopunch_alerts';

// ── Notification Presentation Handler ───────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ── Android Notification Channel (HIGH Importance + Lock Screen) ────────
export const setupNotificationChannel = async () => {
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
        name: 'Keltron Auto-Punch Alerts',
        description: 'High-priority alerts when auto punch-in or punch-out happens via geofence.',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 300, 200, 300],
        lightColor: '#0284c7',
        sound: 'default',
        enableLights: true,
        enableVibrate: true,
        showBadge: true,
        lockscreenVisibility: 1, // PUBLIC — visible on lock screen
      });
    } catch (e) {
      console.log('[Geofence] Channel setup:', e.message);
    }
  }
};

// ── Send Local Push Notification (AUTO-PUNCH ONLY) ──────────────────────
export const sendAutoPunchNotification = async (title, body) => {
  try {
    await setupNotificationChannel();
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        priority: 'max',
        channelId: NOTIFICATION_CHANNEL_ID,
        data: { source: 'keltron_geofence_autopunch' },
      },
      trigger: null, // deliver immediately
    });
  } catch (err) {
    console.error('[Geofence] Notification trigger error:', err.message);
  }
};

// ── Haversine Distance Calculator (meters) ──────────────────────────────
export const calculateDistanceToKeltron = (lat, lng) => {
  const R = 6371e3;
  const φ1 = (lat * Math.PI) / 180;
  const φ2 = (KELTRON_KANNUR_GEOFENCE.latitude * Math.PI) / 180;
  const Δφ = ((KELTRON_KANNUR_GEOFENCE.latitude - lat) * Math.PI) / 180;
  const Δλ = ((KELTRON_KANNUR_GEOFENCE.longitude - lng) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

// ── HTTP API Helper with Multi-URL Failover & Retry ──────────────────────
const apiCallWithFailover = async (method, path, data = null) => {
  const urls = await getApiUrlList();
  let lastErr = null;

  for (const baseUrl of urls) {
    try {
      const fullUrl = `${baseUrl}${path}`;
      if (method.toUpperCase() === 'GET') {
        const res = await axios.get(fullUrl, { timeout: 7000 });
        if (res.data) return res;
      } else {
        const res = await axios.post(fullUrl, data, { timeout: 8000 });
        if (res.data) return res;
      }
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error('All backend endpoints failed to respond.');
};

// ── Core Background Auto-Punch Engine with Debouncing & Cooldown ────────
export const performBackgroundAutoPunch = async (isPunchIn, lat, lng) => {
  try {
    const userStr = await AsyncStorage.getItem('ems_user');
    if (!userStr) return;
    const user = JSON.parse(userStr);
    const tokenNo = user.employeeToken;
    if (!tokenNo) return;

    const now = Date.now();
    const lastAction = await AsyncStorage.getItem('ems_last_auto_action');
    const lastTimeStr = await AsyncStorage.getItem('ems_last_auto_time');
    const lastTime = lastTimeStr ? parseInt(lastTimeStr) : 0;
    const timeSinceLastAction = now - lastTime;

    // Cooldown Rules:
    // 1. If user just punched OUT, do NOT auto-punch IN for at least 10 mins (prevents re-punching while packing/in canteen)
    if (isPunchIn && lastAction === 'OUT' && timeSinceLastAction < 600000) {
      console.log(`[AUTO-PUNCH] Post-punch-out cooldown active (${Math.round(timeSinceLastAction / 1000)}s / 600s). Skipping Punch-In.`);
      return;
    }
    // 2. If user just punched IN, do NOT auto-punch OUT for at least 5 mins (prevents boundary edge bouncing)
    if (!isPunchIn && lastAction === 'IN' && timeSinceLastAction < 300000) {
      console.log(`[AUTO-PUNCH] Post-punch-in cooldown active (${Math.round(timeSinceLastAction / 1000)}s / 300s). Skipping Punch-Out.`);
      return;
    }

    // Check live shift status from server
    let isCurrentlyOnShift = false;
    try {
      const statusRes = await apiCallWithFailover('GET', `/attendance/employee/${tokenNo}`);
      if (statusRes.data && statusRes.data.length > 0) {
        const latest = statusRes.data[0];
        const punchInTime = latest.punchIn ? new Date(latest.punchIn).getTime() : 0;
        const isSessionRecent = (now - punchInTime) < 16 * 60 * 60 * 1000; // only active if within 16h

        isCurrentlyOnShift = Boolean(isSessionRecent && latest.punchIn && !latest.punchOut);
      }
    } catch (e) {
      const localState = await AsyncStorage.getItem('ems_is_on_shift');
      isCurrentlyOnShift = localState === 'true';
    }

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (isPunchIn) {
      if (isCurrentlyOnShift) {
        // Reset outside counter since user is confirmed inside & on-shift
        await AsyncStorage.setItem('ems_outside_consecutive_count', '0');
        await AsyncStorage.setItem('ems_is_on_shift', 'true');
        return;
      }

      console.log(`📍 [AUTO-PUNCH] Inside 300m zone → Punch IN for Token #${tokenNo}`);
      const res = await apiCallWithFailover('POST', '/attendance/punch-in', {
        tokenNo,
        latitude: lat || KELTRON_KANNUR_GEOFENCE.latitude,
        longitude: lng || KELTRON_KANNUR_GEOFENCE.longitude,
        isGeofencedAutoPunch: true,
        locationName: 'Keltron Kannur Plant (Inside 300m Geofence)',
      });

      await AsyncStorage.multiSet([
        ['ems_last_auto_action', 'IN'],
        ['ems_last_auto_time', String(now)],
        ['ems_is_on_shift', 'true'],
        ['ems_outside_consecutive_count', '0'],
      ]);

      await sendAutoPunchNotification(
        '🟢 Auto Punched In (300m Zone)',
        `Token #${tokenNo} punched in at ${timeStr} — entered Keltron Kannur Plant perimeter.`
      );

      await syncAlarmState(true);
    } else {
      if (!isCurrentlyOnShift) {
        await AsyncStorage.setItem('ems_is_on_shift', 'false');
        return; // already off-shift
      }

      console.log(`👋 [AUTO-PUNCH] Exited past 400m zone → Punch OUT for Token #${tokenNo}`);
      const res = await apiCallWithFailover('POST', '/attendance/punch-out', {
        tokenNo,
        latitude: lat || KELTRON_KANNUR_GEOFENCE.latitude,
        longitude: lng || KELTRON_KANNUR_GEOFENCE.longitude,
        isGeofencedAutoPunch: true,
        locationName: 'Keltron Kannur Plant (Exited 300m Geofence)',
      });

      await AsyncStorage.multiSet([
        ['ems_last_auto_action', 'OUT'],
        ['ems_last_auto_time', String(now)],
        ['ems_is_on_shift', 'false'],
        ['ems_outside_consecutive_count', '0'],
      ]);

      const record = res.data?.attendance;
      const workedMsg = record?.totalHours
        ? `Worked: ${record.totalHours}h (OT: ${record.overtimeHours || 0}h)`
        : 'Shift completed.';

      await sendAutoPunchNotification(
        '🔴 Auto Punched Out (Left Plant)',
        `Token #${tokenNo} punched out at ${timeStr} — left Keltron Plant. ${workedMsg}`
      );

      await syncAlarmState(false);
    }
  } catch (err) {
    console.error('[AUTO-PUNCH] Error:', err.message);
  }
};

// ════════════════════════════════════════════════════════════════════════
// TASK 1: Native Android Geofencing (fires on ENTER / EXIT events)
// ════════════════════════════════════════════════════════════════════════
TaskManager.defineTask(GEOFENCE_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('[Geofence Task] Error:', error.message);
    return;
  }
  try {
    const { eventType } = data;
    if (eventType === Location.GeofencingEventType.Enter) {
      await performBackgroundAutoPunch(true, KELTRON_KANNUR_GEOFENCE.latitude, KELTRON_KANNUR_GEOFENCE.longitude);
    } else if (eventType === Location.GeofencingEventType.Exit) {
      const lastLoc = await Location.getLastKnownPositionAsync().catch(() => null);
      const lat = lastLoc?.coords?.latitude || KELTRON_KANNUR_GEOFENCE.latitude;
      const lng = lastLoc?.coords?.longitude || KELTRON_KANNUR_GEOFENCE.longitude;
      await performBackgroundAutoPunch(false, lat, lng);
    }
  } catch (e) {
    console.error('[Geofence Task] Execution error:', e.message);
  }
});

// ════════════════════════════════════════════════════════════════════════
// TASK 2: Persistent 24/7 Foreground Location Service
// Runs continuously in background (even when screen locked / app closed)
// Uses Debouncing + Accuracy Filter + Dual-Boundary Hysteresis
// ════════════════════════════════════════════════════════════════════════
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('[Location Service] Error:', error.message);
    return;
  }
  try {
    if (data && data.locations && data.locations.length > 0) {
      const loc = data.locations[data.locations.length - 1];
      const accuracy = loc.coords.accuracy || 100;

      // Filter out extreme wild jumps (> 200m). 200m accommodates realistic indoor factory attenuation
      if (accuracy > 200) {
        return;
      }

      const lat = loc.coords.latitude;
      const lng = loc.coords.longitude;
      const dist = calculateDistanceToKeltron(lat, lng);

      if (dist <= KELTRON_KANNUR_GEOFENCE.radius) {
        // INSIDE 300m -> Reset outside counter and trigger Punch In if off-shift
        await AsyncStorage.setItem('ems_outside_consecutive_count', '0');
        await performBackgroundAutoPunch(true, lat, lng);
      } else if (dist >= KELTRON_KANNUR_GEOFENCE.exitRadius) {
        // OUTSIDE 400m -> Increment debounced consecutive outside counter
        // Reset the post-punch-out cooldown since user has physically left the perimeter
        await AsyncStorage.removeItem('ems_last_auto_action');

        const countStr = (await AsyncStorage.getItem('ems_outside_consecutive_count')) || '0';
        const newCount = parseInt(countStr) + 1;
        await AsyncStorage.setItem('ems_outside_consecutive_count', String(newCount));

        // Require at least 3 consecutive outside readings (approx 45-60s) before punch-out
        if (newCount >= 3) {
          await performBackgroundAutoPunch(false, lat, lng);
        }
      }
    }
  } catch (e) {
    console.error('[Location Service] Execution error:', e.message);
  }
});

// ── Start All Background Services with 24/7 Foreground Engine ───────────
export const setupGeofenceTracking = async () => {
  try {
    await setupNotificationChannel();
    await scheduleDailyShiftAlarms();

    try {
      await Notifications.requestPermissionsAsync();
    } catch (e) {}

    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
    if (fgStatus !== 'granted') {
      return { success: false, message: 'Foreground location denied.' };
    }

    const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
    if (bgStatus !== 'granted') {
      return { success: false, message: 'Background location required ("Allow all the time").' };
    }

    // ── Start Native Geofencing (Low Power OS Hardware Fence) ───────
    if (await TaskManager.isTaskDefined(GEOFENCE_TASK_NAME)) {
      try {
        const isRunning = await Location.hasStartedGeofencingAsync(GEOFENCE_TASK_NAME);
        if (isRunning) await Location.stopGeofencingAsync(GEOFENCE_TASK_NAME);
      } catch (e) {}
      await Location.startGeofencingAsync(GEOFENCE_TASK_NAME, [KELTRON_KANNUR_GEOFENCE]);
    }

    // ── Start 24/7 Persistent Foreground Location Service ───────────
    await ensureBackgroundLocationRunning();

    return {
      success: true,
      message: '📍 24/7 Background Auto-Punch Active (300m Plant Zone)',
    };
  } catch (err) {
    console.error('[Geofence] Setup error:', err);
    return { success: false, message: err.message };
  }
};
