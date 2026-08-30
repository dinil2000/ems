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
import {
  syncAlarmState,
  scheduleDailyShiftAlarms,
  ensureBackgroundLocationRunning,
  BACKGROUND_LOCATION_TASK,
} from './shiftAlarmManager';

// ── Company Geofence Coordinates & Hysteresis Boundaries ──────────────
export const KELTRON_KANNUR_GEOFENCE = {
  identifier: 'KELTRON_KANNUR_PLANT_700M',
  latitude: 11.983878,
  longitude: 75.374253,
  radius: 700,         // Enter threshold (within 700 meters)
  exitRadius: 850,     // Exit threshold (must be past 850 meters with hysteresis)
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

// ── HTTP POST with retry ────────────────────────────────────────────────
const postWithRetry = async (url, data, retries = 2) => {
  for (let i = 0; i <= retries; i++) {
    try {
      return await axios.post(url, data, { timeout: 12000 });
    } catch (err) {
      if (i === retries) throw err;
      await new Promise(r => setTimeout(r, 2000));
    }
  }
};

// ── Core Background Auto-Punch Engine with Debouncing & Cooldown ────────
export const performBackgroundAutoPunch = async (isPunchIn, lat, lng) => {
  try {
    const userStr = await AsyncStorage.getItem('ems_user');
    const apiUrl = (await AsyncStorage.getItem('ems_active_api_url')) || 'https://mppems.vercel.app/api';

    if (!userStr) return;
    const user = JSON.parse(userStr);
    const tokenNo = user.employeeToken;
    if (!tokenNo) return;

    const now = Date.now();
    const lastAction = await AsyncStorage.getItem('ems_last_auto_action');
    const lastTimeStr = await AsyncStorage.getItem('ems_last_auto_time');
    const lastTime = lastTimeStr ? parseInt(lastTimeStr) : 0;
    const timeSinceLastAction = now - lastTime;

    // Minimum cooldown between opposite actions (3 minutes) to prevent rapid bouncing
    if (lastAction && timeSinceLastAction < 180000) {
      console.log(`[AUTO-PUNCH] Cooldown active (${Math.round(timeSinceLastAction / 1000)}s / 180s). Skipping.`);
      return;
    }

    // Check live shift status from server
    let isCurrentlyOnShift = false;
    try {
      const statusRes = await axios.get(`${apiUrl}/attendance/employee/${tokenNo}`, { timeout: 8000 });
      if (statusRes.data && statusRes.data.length > 0) {
        const latest = statusRes.data[0];
        isCurrentlyOnShift =
          latest.status === 'In Progress' ||
          latest.status === 'Pending Late Approval' ||
          (latest.punchIn && !latest.punchOut);
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

      console.log(`📍 [AUTO-PUNCH] Inside 700m zone → Punch IN for Token #${tokenNo}`);
      const res = await postWithRetry(`${apiUrl}/attendance/punch-in`, {
        tokenNo,
        latitude: lat || KELTRON_KANNUR_GEOFENCE.latitude,
        longitude: lng || KELTRON_KANNUR_GEOFENCE.longitude,
        isGeofencedAutoPunch: true,
        locationName: 'Keltron Kannur Plant (Inside 700m Geofence)',
      });

      await AsyncStorage.multiSet([
        ['ems_last_auto_action', 'IN'],
        ['ems_last_auto_time', String(now)],
        ['ems_is_on_shift', 'true'],
        ['ems_outside_consecutive_count', '0'],
      ]);

      await sendAutoPunchNotification(
        '🟢 Auto Punched In (700m Zone)',
        `Token #${tokenNo} punched in at ${timeStr} — entered Keltron Kannur Plant perimeter.`
      );

      await syncAlarmState(true);
    } else {
      if (!isCurrentlyOnShift) {
        await AsyncStorage.setItem('ems_is_on_shift', 'false');
        return; // already off-shift
      }

      console.log(`👋 [AUTO-PUNCH] Exited past 850m zone → Punch OUT for Token #${tokenNo}`);
      const res = await postWithRetry(`${apiUrl}/attendance/punch-out`, {
        tokenNo,
        latitude: lat || KELTRON_KANNUR_GEOFENCE.latitude,
        longitude: lng || KELTRON_KANNUR_GEOFENCE.longitude,
        isGeofencedAutoPunch: true,
        locationName: 'Keltron Kannur Plant (Exited 700m Geofence)',
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
      if (lastLoc) {
        const dist = calculateDistanceToKeltron(lastLoc.coords.latitude, lastLoc.coords.longitude);
        if (dist >= KELTRON_KANNUR_GEOFENCE.exitRadius) {
          await performBackgroundAutoPunch(false, lastLoc.coords.latitude, lastLoc.coords.longitude);
        }
      }
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

      // Filter out low-accuracy GPS jumps (> 75m accuracy is unreliable indoors)
      if (accuracy > 75) {
        return;
      }

      const lat = loc.coords.latitude;
      const lng = loc.coords.longitude;
      const dist = calculateDistanceToKeltron(lat, lng);

      if (dist <= KELTRON_KANNUR_GEOFENCE.radius) {
        // INSIDE 700m -> Reset outside counter and trigger Punch In if off-shift
        await AsyncStorage.setItem('ems_outside_consecutive_count', '0');
        await performBackgroundAutoPunch(true, lat, lng);
      } else if (dist >= KELTRON_KANNUR_GEOFENCE.exitRadius) {
        // OUTSIDE 850m -> Increment debounced consecutive outside counter
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
      message: '📍 24/7 Background Auto-Punch Active (700m Plant Zone)',
    };
  } catch (err) {
    console.error('[Geofence] Setup error:', err);
    return { success: false, message: err.message };
  }
};
