// ========================================================================
// Keltron MPP EMS — Background Geofence Auto-Punch Engine
// ========================================================================
// This file defines TWO TaskManager background tasks at the TOP LEVEL:
//   1. GEOFENCE TASK — fires on native Android geofence enter/exit events
//   2. BACKGROUND LOCATION SERVICE — persistent foreground service that
//      monitors GPS every 10 seconds with killServiceOnDestroy: false
//      so it survives app close, swipe-away, and screen lock.
//
// Both tasks call performBackgroundAutoPunch() which:
//   - Reads user credentials from AsyncStorage (works headlessly)
//   - Checks server for current shift status before punching
//   - Rate-limits to prevent duplicate punches within 120 seconds
//   - Sends HIGH-PRIORITY local push notifications for auto-punch ONLY
//   - Manual punches from the UI NEVER trigger notifications
// ========================================================================

import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Company Geofence Coordinates ────────────────────────────────────────
export const KELTRON_KANNUR_GEOFENCE = {
  identifier: 'KELTRON_KANNUR_PLANT_700M',
  latitude: 11.983878,
  longitude: 75.374253,
  radius: 700, // 700-meter perimeter around factory
  notifyOnEnter: true,
  notifyOnExit: true,
};

export const GEOFENCE_TASK_NAME = 'KELTRON_KANNUR_AUTOMATED_PUNCH_GEOFENCE';
export const BACKGROUND_LOCATION_TASK = 'KELTRON_KANNUR_BACKGROUND_LOCATION_SERVICE';
export const NOTIFICATION_CHANNEL_ID = 'keltron_autopunch_alerts';

// ── Notification Presentation Handler ───────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ── Android Notification Channel (HIGH importance) ──────────────────────
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
        lockscreenVisibility: 1, // PUBLIC — show on lock screen
      });
    } catch (e) {
      console.log('[Geofence] Channel setup:', e.message);
    }
  }
};

// ── Send Local Push Notification (AUTO-PUNCH ONLY) ──────────────────────
// Manual punches from the UI NEVER call this function.
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
      trigger: null, // immediate delivery
    });
  } catch (err) {
    console.error('[Geofence] Notification error:', err.message);
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

// ── HTTP POST with retry (for unreliable mobile networks) ───────────────
const postWithRetry = async (url, data, retries = 2) => {
  for (let i = 0; i <= retries; i++) {
    try {
      return await axios.post(url, data, { timeout: 12000 });
    } catch (err) {
      if (i === retries) throw err;
      await new Promise(r => setTimeout(r, 2000)); // wait 2s before retry
    }
  }
};

// ── Core Background Auto-Punch Engine ───────────────────────────────────
// Called by BOTH the geofence task and the location service task.
// Works even when the app is completely closed (headless JS execution).
export const performBackgroundAutoPunch = async (isPunchIn, lat, lng) => {
  try {
    const userStr = await AsyncStorage.getItem('ems_user');
    const apiUrl = (await AsyncStorage.getItem('ems_active_api_url')) || 'https://mppems.vercel.app/api';

    if (!userStr) return;
    const user = JSON.parse(userStr);
    const tokenNo = user.employeeToken;
    if (!tokenNo) return;

    // Rate-limit: prevent duplicate auto-punch calls within 120 seconds
    const lastAction = await AsyncStorage.getItem('ems_last_auto_action');
    const lastTime = await AsyncStorage.getItem('ems_last_auto_time');
    const now = Date.now();
    const actionKey = isPunchIn ? 'IN' : 'OUT';

    if (lastAction === actionKey && lastTime && (now - parseInt(lastTime)) < 120000) {
      return; // same action within 2 minutes, skip
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
      // Network failed — fallback to local state
      const localState = await AsyncStorage.getItem('ems_is_on_shift');
      isCurrentlyOnShift = localState === 'true';
    }

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (isPunchIn) {
      if (isCurrentlyOnShift) return; // already on shift

      console.log(`[AUTO-PUNCH] Entering 700m zone → Punch IN Token #${tokenNo}`);
      const res = await postWithRetry(`${apiUrl}/attendance/punch-in`, {
        tokenNo,
        latitude: lat || KELTRON_KANNUR_GEOFENCE.latitude,
        longitude: lng || KELTRON_KANNUR_GEOFENCE.longitude,
        isGeofencedAutoPunch: true,
        locationName: 'Keltron Kannur (Auto 700m Geofence)',
      });

      await AsyncStorage.multiSet([
        ['ems_last_auto_action', 'IN'],
        ['ems_last_auto_time', String(now)],
        ['ems_is_on_shift', 'true'],
      ]);

      await sendAutoPunchNotification(
        '🟢 Auto Punched In (700m Zone)',
        `Token #${tokenNo} punched in at ${timeStr} — entered Keltron Kannur Plant perimeter.`
      );
    } else {
      if (!isCurrentlyOnShift) return; // not on shift

      console.log(`[AUTO-PUNCH] Exiting 700m zone → Punch OUT Token #${tokenNo}`);
      const res = await postWithRetry(`${apiUrl}/attendance/punch-out`, {
        tokenNo,
        latitude: lat || KELTRON_KANNUR_GEOFENCE.latitude,
        longitude: lng || KELTRON_KANNUR_GEOFENCE.longitude,
        isGeofencedAutoPunch: true,
        locationName: 'Keltron Kannur (Auto 700m Geofence)',
      });

      await AsyncStorage.multiSet([
        ['ems_last_auto_action', 'OUT'],
        ['ems_last_auto_time', String(now)],
        ['ems_is_on_shift', 'false'],
      ]);

      const record = res.data?.attendance;
      const workedMsg = record?.totalHours
        ? `Worked: ${record.totalHours}h (OT: ${record.overtimeHours || 0}h)`
        : 'Shift completed.';

      await sendAutoPunchNotification(
        '🔴 Auto Punched Out (Left 700m)',
        `Token #${tokenNo} punched out at ${timeStr} — left Keltron Plant. ${workedMsg}`
      );
    }
  } catch (err) {
    console.error('[AUTO-PUNCH] Error:', err.message);
  }
};

// ════════════════════════════════════════════════════════════════════════
// TASK 1: Native Android Geofencing (fires on ENTER / EXIT events)
// MUST be defined at top-level module scope — NOT inside any component
// ════════════════════════════════════════════════════════════════════════
TaskManager.defineTask(GEOFENCE_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('[Geofence Task] Error:', error.message);
    return;
  }
  try {
    const { eventType, region } = data;
    if (eventType === Location.GeofencingEventType.Enter) {
      await performBackgroundAutoPunch(true, KELTRON_KANNUR_GEOFENCE.latitude, KELTRON_KANNUR_GEOFENCE.longitude);
    } else if (eventType === Location.GeofencingEventType.Exit) {
      await performBackgroundAutoPunch(false, KELTRON_KANNUR_GEOFENCE.latitude, KELTRON_KANNUR_GEOFENCE.longitude);
    }
  } catch (e) {
    console.error('[Geofence Task] Execution error:', e.message);
  }
});

// ════════════════════════════════════════════════════════════════════════
// TASK 2: Persistent Foreground Location Service (runs 24/7 even closed)
// This is the BACKUP that ensures auto-punch works even if Android
// throttles native geofence events (which happens on many devices).
// killServiceOnDestroy: false keeps it alive after app swipe-away.
// ════════════════════════════════════════════════════════════════════════
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('[Location Service] Error:', error.message);
    return;
  }
  try {
    if (data && data.locations && data.locations.length > 0) {
      const loc = data.locations[data.locations.length - 1];
      const lat = loc.coords.latitude;
      const lng = loc.coords.longitude;
      const dist = calculateDistanceToKeltron(lat, lng);
      const isInside = dist <= KELTRON_KANNUR_GEOFENCE.radius;
      await performBackgroundAutoPunch(isInside, lat, lng);
    }
  } catch (e) {
    console.error('[Location Service] Execution error:', e.message);
  }
});

// ── Start All Background Services ───────────────────────────────────────
export const setupGeofenceTracking = async () => {
  try {
    await setupNotificationChannel();

    // Request notification permission (Android 13+)
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      console.log('[Geofence] Notification permission:', status);
    } catch (e) {}

    // Request foreground location permission
    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
    if (fgStatus !== 'granted') {
      return { success: false, message: 'Foreground location denied.' };
    }

    // Request background location permission ("Allow all the time")
    const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
    if (bgStatus !== 'granted') {
      return { success: false, message: 'Background location required. Please select "Allow all the time" in Settings → Location.' };
    }

    // ── Start Native Geofencing ─────────────────────────────────────
    const isGeofenceDefined = await TaskManager.isTaskDefined(GEOFENCE_TASK_NAME);
    if (isGeofenceDefined) {
      // Stop any existing geofence first to apply fresh config
      try {
        const isRunning = await Location.hasStartedGeofencingAsync(GEOFENCE_TASK_NAME);
        if (isRunning) {
          await Location.stopGeofencingAsync(GEOFENCE_TASK_NAME);
        }
      } catch (e) {}
      await Location.startGeofencingAsync(GEOFENCE_TASK_NAME, [KELTRON_KANNUR_GEOFENCE]);
      console.log('[Geofence] Native geofencing started (700m)');
    }

    // ── Start Persistent Background Location Service ────────────────
    const isLocDefined = await TaskManager.isTaskDefined(BACKGROUND_LOCATION_TASK);
    if (isLocDefined) {
      // Stop any existing service first to apply fresh config
      try {
        const isRunning = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
        if (isRunning) {
          await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
        }
      } catch (e) {}

      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: Location.Accuracy.High,
        timeInterval: 10000,       // check every 10 seconds
        distanceInterval: 5,       // or every 5 meters of movement
        deferredUpdatesInterval: 10000,
        pausesUpdatesAutomatically: false,
        showsBackgroundLocationIndicator: true,
        activityType: Location.ActivityType.OtherNavigation,
        foregroundService: {
          notificationTitle: '📍 Keltron EMS Geofence Active',
          notificationBody: 'Auto Punch In/Out monitoring (700m factory zone). Do not disable.',
          notificationColor: '#0284c7',
          killServiceOnDestroy: false, // ← KEY: keeps service alive when app is closed!
        },
      });
      console.log('[Geofence] Background location service started (killServiceOnDestroy=false)');
    }

    return {
      success: true,
      message: '📍 Background Auto-Punch Active (works when app is closed)',
    };
  } catch (err) {
    console.error('[Geofence] Setup error:', err);
    return { success: false, message: err.message };
  }
};
