import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
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

// Helper to perform background punch
const performBackgroundPunch = async (isPunchIn, lat, lng) => {
  try {
    const userStr = await AsyncStorage.getItem('ems_user');
    const apiUrl = (await AsyncStorage.getItem('ems_active_api_url')) || 'https://mppems.vercel.app/api';

    if (!userStr) return;
    const user = JSON.parse(userStr);
    const tokenNo = user.employeeToken;
    if (!tokenNo) return;

    // Check last punch state saved in storage to avoid duplicate spam requests
    const lastAction = await AsyncStorage.getItem('ems_last_auto_action');
    const lastActionTime = await AsyncStorage.getItem('ems_last_auto_time');
    const now = Date.now();

    // Prevent repeated punch calls within 2 minutes
    if (lastAction === (isPunchIn ? 'IN' : 'OUT') && lastActionTime && (now - parseInt(lastActionTime)) < 120000) {
      return;
    }

    if (isPunchIn) {
      console.log(`📍 [BACKGROUND] Entering 700m Keltron Zone -> Auto Punch IN for Token #${tokenNo}`);
      await axios.post(`${apiUrl}/attendance/punch-in`, {
        tokenNo,
        latitude: lat || KELTRON_KANNUR_GEOFENCE.latitude,
        longitude: lng || KELTRON_KANNUR_GEOFENCE.longitude,
        isGeofencedAutoPunch: true,
        locationName: 'Keltron Kannur Plant (Inside 700m Background Geofence)'
      }, { timeout: 10000 });
      await AsyncStorage.setItem('ems_last_auto_action', 'IN');
      await AsyncStorage.setItem('ems_last_auto_time', String(now));
    } else {
      console.log(`👋 [BACKGROUND] Exiting 700m Keltron Zone -> Auto Punch OUT for Token #${tokenNo}`);
      await axios.post(`${apiUrl}/attendance/punch-out`, {
        tokenNo,
        latitude: lat || KELTRON_KANNUR_GEOFENCE.latitude,
        longitude: lng || KELTRON_KANNUR_GEOFENCE.longitude,
        isGeofencedAutoPunch: true,
        locationName: 'Keltron Kannur Plant (Exited 700m Background Geofence)'
      }, { timeout: 10000 });
      await AsyncStorage.setItem('ems_last_auto_action', 'OUT');
      await AsyncStorage.setItem('ems_last_auto_time', String(now));
    }
  } catch (err) {
    console.error('Background Auto Punch Failed:', err.message);
  }
};

// 1. Task 1: Native Android Geofencing Event Handler
TaskManager.defineTask(GEOFENCE_TASK_NAME, async ({ data: { eventType, region }, error }) => {
  if (error) {
    console.error('Geofence Task Error:', error.message);
    return;
  }

  if (eventType === Location.GeofencingEventType.Enter) {
    await performBackgroundPunch(true, KELTRON_KANNUR_GEOFENCE.latitude, KELTRON_KANNUR_GEOFENCE.longitude);
  } else if (eventType === Location.GeofencingEventType.Exit) {
    await performBackgroundPunch(false, KELTRON_KANNUR_GEOFENCE.latitude, KELTRON_KANNUR_GEOFENCE.longitude);
  }
});

// 2. Task 2: Persistent Background Location Tracking Service (Runs even when app is closed / phone locked)
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

    const prevInside = await AsyncStorage.getItem('ems_is_inside_700m');

    if (isInside700m && prevInside === 'false') {
      await AsyncStorage.setItem('ems_is_inside_700m', 'true');
      await performBackgroundPunch(true, lat, lng);
    } else if (!isInside700m && prevInside === 'true') {
      await AsyncStorage.setItem('ems_is_inside_700m', 'false');
      await performBackgroundPunch(false, lat, lng);
    } else if (!prevInside) {
      await AsyncStorage.setItem('ems_is_inside_700m', isInside700m ? 'true' : 'false');
    }
  }
});

// Start All Background Geofence & Location Services
export const setupGeofenceTracking = async () => {
  try {
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
      return { success: false, message: 'Foreground location permission denied.' };
    }

    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== 'granted') {
      return {
        success: false,
        message: 'Background location permission required ("Allow all the time"). Please enable it in Settings.'
      };
    }

    // Register Native Geofencing
    const isGeofenceDefined = await TaskManager.isTaskDefined(GEOFENCE_TASK_NAME);
    if (isGeofenceDefined) {
      const isGeofenceStarted = await Location.hasStartedGeofencingAsync(GEOFENCE_TASK_NAME).catch(() => false);
      if (!isGeofenceStarted) {
        await Location.startGeofencingAsync(GEOFENCE_TASK_NAME, [KELTRON_KANNUR_GEOFENCE]);
      }
    }

    // Register Persistent Background Location Updates with Android Foreground Notification
    const isLocTaskDefined = await TaskManager.isTaskDefined(BACKGROUND_LOCATION_TASK);
    if (isLocTaskDefined) {
      const isLocStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).catch(() => false);
      if (!isLocStarted) {
        await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
          accuracy: Location.Accuracy.High,
          timeInterval: 10000,
          distanceInterval: 15,
          pausesUpdatesAutomatically: false,
          showsBackgroundLocationIndicator: true,
          foregroundService: {
            notificationTitle: 'Keltron EMS 700m Geofence Active',
            notificationBody: 'Automated Factory Punch In / Punch Out active at Kannur Plant (700m zone)',
            notificationColor: '#0284c7',
          },
        });
      }
    }

    return {
      success: true,
      message: '📍 700m Background Auto-Punch Service Active (Runs even when app is closed)'
    };
  } catch (err) {
    console.error('setupGeofenceTracking error:', err);
    return { success: false, message: err.message };
  }
};
