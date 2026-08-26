import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const KELTRON_KANNUR_GEOFENCE = {
  identifier: 'KELTRON_KANNUR_PLANT_700M',
  latitude: 11.983878,
  longitude: 75.374253,
  radius: 700, // 700-meter company perimeter as requested
  notifyOnEnter: true,
  notifyOnExit: true,
};

export const GEOFENCE_TASK_NAME = 'KELTRON_KANNUR_AUTOMATED_PUNCH_GEOFENCE';
export const BACKGROUND_LOCATION_TASK = 'KELTRON_KANNUR_BACKGROUND_LOCATION_SERVICE';
export const NOTIFICATION_CHANNEL_ID = 'keltron_autopunch_alerts';

// Configure Notification Handler to display alerts immediately
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Setup Android Notification Channel with High Importance
export const setupNotificationChannel = async () => {
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
        name: 'Keltron Auto-Punch Notifications',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0284c7',
        sound: 'default',
        enableLights: true,
        enableVibrate: true,
        showBadge: true,
      });
    } catch (e) {
      console.log('Notification channel setup note:', e.message);
    }
  }
};

// Send Local Push Notification (Used for AUTO-PUNCH ONLY, manual punches do not trigger this)
export const sendAutoPunchNotification = async (title, body) => {
  try {
    await setupNotificationChannel();
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        channelId: NOTIFICATION_CHANNEL_ID,
        data: { source: 'keltron_geofence_autopunch' },
      },
      trigger: null, // Send immediately
    });
  } catch (err) {
    console.error('Error sending auto-punch notification:', err.message);
  }
};

// Calculate Haversine distance in meters to Keltron Kannur Campus (11.983878, 75.374253)
export const calculateDistanceToKeltron = (lat, lng) => {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat * Math.PI) / 180;
  const φ2 = (KELTRON_KANNUR_GEOFENCE.latitude * Math.PI) / 180;
  const Δφ = ((KELTRON_KANNUR_GEOFENCE.latitude - lat) * Math.PI) / 180;
  const Δλ = ((KELTRON_KANNUR_GEOFENCE.longitude - lng) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
};

// Background Execution Engine for Automated Punch In / Out when app is closed or open
export const performBackgroundAutoPunch = async (isPunchIn, lat, lng) => {
  try {
    const userStr = await AsyncStorage.getItem('ems_user');
    const apiUrl = (await AsyncStorage.getItem('ems_active_api_url')) || 'https://mppems.vercel.app/api';

    if (!userStr) return;
    const user = JSON.parse(userStr);
    const tokenNo = user.employeeToken;
    if (!tokenNo) return;

    // Rate-limit check: prevent duplicate background punch calls within 90 seconds
    const lastAction = await AsyncStorage.getItem('ems_last_auto_action');
    const lastActionTime = await AsyncStorage.getItem('ems_last_auto_time');
    const now = Date.now();

    if (lastAction === (isPunchIn ? 'IN' : 'OUT') && lastActionTime && (now - parseInt(lastActionTime)) < 90000) {
      return;
    }

    // Verify current live shift status from server before executing punch
    let isCurrentlyOnShift = false;
    try {
      const statusRes = await axios.get(`${apiUrl}/attendance/employee/${tokenNo}`, { timeout: 6000 });
      if (statusRes.data && statusRes.data.length > 0) {
        const latest = statusRes.data[0];
        isCurrentlyOnShift = latest.status === 'In Progress' || latest.status === 'Pending Late Approval' || (latest.punchIn && !latest.punchOut);
      }
    } catch (e) {
      // If network check fails, fallback to local storage state
      const localState = await AsyncStorage.getItem('ems_is_on_shift');
      isCurrentlyOnShift = localState === 'true';
    }

    if (isPunchIn) {
      // Only punch in if currently OFF shift
      if (isCurrentlyOnShift) {
        return;
      }

      console.log(`📍 [BACKGROUND AUTO-PUNCH] Entering 700m zone -> Punching IN for Token #${tokenNo}`);
      const res = await axios.post(`${apiUrl}/attendance/punch-in`, {
        tokenNo,
        latitude: lat || KELTRON_KANNUR_GEOFENCE.latitude,
        longitude: lng || KELTRON_KANNUR_GEOFENCE.longitude,
        isGeofencedAutoPunch: true,
        locationName: 'Keltron Kannur Plant (Inside 700m Geofence)'
      }, { timeout: 10000 });

      await AsyncStorage.setItem('ems_last_auto_action', 'IN');
      await AsyncStorage.setItem('ems_last_auto_time', String(now));
      await AsyncStorage.setItem('ems_is_on_shift', 'true');

      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      // Send High-Priority Notification ONLY for Auto-Punching
      await sendAutoPunchNotification(
        '🟢 Auto Punched In (700m Plant Zone)',
        `Token #${tokenNo} automatically punched in at ${timeStr} upon entering Keltron Kannur Plant.`
      );
    } else {
      // Only punch out if currently ON shift
      if (!isCurrentlyOnShift) {
        return;
      }

      console.log(`👋 [BACKGROUND AUTO-PUNCH] Exiting 700m zone -> Punching OUT for Token #${tokenNo}`);
      const res = await axios.post(`${apiUrl}/attendance/punch-out`, {
        tokenNo,
        latitude: lat || KELTRON_KANNUR_GEOFENCE.latitude,
        longitude: lng || KELTRON_KANNUR_GEOFENCE.longitude,
        isGeofencedAutoPunch: true,
        locationName: 'Keltron Kannur Plant (Exited 700m Geofence)'
      }, { timeout: 10000 });

      await AsyncStorage.setItem('ems_last_auto_action', 'OUT');
      await AsyncStorage.setItem('ems_last_auto_time', String(now));
      await AsyncStorage.setItem('ems_is_on_shift', 'false');

      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const record = res.data?.attendance;
      const workedMsg = record?.totalHours ? `Worked: ${record.totalHours} hrs (OT: ${record.overtimeHours || 0} hrs)` : 'Shift completed.';

      // Send High-Priority Notification ONLY for Auto-Punching
      await sendAutoPunchNotification(
        '🔴 Auto Punched Out (Left 700m Zone)',
        `Token #${tokenNo} automatically punched out at ${timeStr} upon leaving Keltron Kannur Plant. ${workedMsg}`
      );
    }
  } catch (err) {
    console.error('Background Auto-Punch execution error:', err.message);
  }
};

// 1. Task 1: Native Android Geofencing Event Handler (Defined in global scope)
TaskManager.defineTask(GEOFENCE_TASK_NAME, async ({ data: { eventType, region }, error }) => {
  if (error) {
    console.error('Geofence Task Error:', error.message);
    return;
  }

  if (eventType === Location.GeofencingEventType.Enter) {
    await performBackgroundAutoPunch(true, KELTRON_KANNUR_GEOFENCE.latitude, KELTRON_KANNUR_GEOFENCE.longitude);
  } else if (eventType === Location.GeofencingEventType.Exit) {
    await performBackgroundAutoPunch(false, KELTRON_KANNUR_GEOFENCE.latitude, KELTRON_KANNUR_GEOFENCE.longitude);
  }
});

// 2. Task 2: Persistent Background Location Tracking Service (Runs 24/7 even when app is closed)
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data: { locations }, error }) => {
  if (error) {
    console.error('Background Location Service Error:', error.message);
    return;
  }

  if (locations && locations.length > 0) {
    const loc = locations[locations.length - 1];
    const lat = loc.coords.latitude;
    const lng = loc.coords.longitude;
    const dist = calculateDistanceToKeltron(lat, lng);
    const isInside700m = dist <= KELTRON_KANNUR_GEOFENCE.radius;

    if (isInside700m) {
      await performBackgroundAutoPunch(true, lat, lng);
    } else {
      await performBackgroundAutoPunch(false, lat, lng);
    }
  }
});

// Start All Background Geofence & Persistent Location Services
export const setupGeofenceTracking = async () => {
  try {
    await setupNotificationChannel();

    // 1. Request Notification Permissions (Android 13+)
    try {
      const { status: notifStatus } = await Notifications.requestPermissionsAsync();
      if (notifStatus !== 'granted') {
        console.log('Notification permission not granted yet');
      }
    } catch (e) {}

    // 2. Request Foreground Location Permission
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
      return { success: false, message: 'Foreground location permission denied.' };
    }

    // 3. Request Background Location Permission ("Allow all the time")
    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== 'granted') {
      return {
        success: false,
        message: 'Background location permission required ("Allow all the time") so auto-punch runs when the app is closed.'
      };
    }

    // 4. Start Native Geofencing Service
    const isGeofenceDefined = await TaskManager.isTaskDefined(GEOFENCE_TASK_NAME);
    if (isGeofenceDefined) {
      const isGeofenceStarted = await Location.hasStartedGeofencingAsync(GEOFENCE_TASK_NAME).catch(() => false);
      if (!isGeofenceStarted) {
        await Location.startGeofencingAsync(GEOFENCE_TASK_NAME, [KELTRON_KANNUR_GEOFENCE]);
      }
    }

    // 5. Start Persistent Android Background Location Updates (with killServiceOnDestroy: false)
    const isLocTaskDefined = await TaskManager.isTaskDefined(BACKGROUND_LOCATION_TASK);
    if (isLocTaskDefined) {
      const isLocStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).catch(() => false);
      if (!isLocStarted) {
        await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
          accuracy: Location.Accuracy.High,
          timeInterval: 8000,
          distanceInterval: 10,
          pausesUpdatesAutomatically: false,
          showsBackgroundLocationIndicator: true,
          foregroundService: {
            notificationTitle: 'Keltron EMS 700m Geofence Active',
            notificationBody: 'Automated Factory Punch In / Punch Out active in background (700m perimeter)',
            notificationColor: '#0284c7',
            killServiceOnDestroy: false, // Ensures service stays alive when app is closed from Recents!
          },
        });
      }
    }

    return {
      success: true,
      message: '📍 700m Background Auto-Punch Service & Notifications Active (Works even when app is closed)'
    };
  } catch (err) {
    console.error('setupGeofenceTracking error:', err);
    return { success: false, message: err.message };
  }
};
