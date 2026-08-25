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

export const GEOFENCE_TASK_NAME = 'KELTRON_KANNUR_AUTOMATED_PUNCH_TASK';

// Define Background Task Handler for Automated Geofence Punch In & Out
TaskManager.defineTask(GEOFENCE_TASK_NAME, async ({ data: { eventType, region }, error }) => {
  if (error) {
    console.error('Geofence Task Error:', error.message);
    return;
  }

  try {
    const userStr = await AsyncStorage.getItem('ems_user');
    const apiUrl = (await AsyncStorage.getItem('ems_active_api_url')) || 'https://mppems.vercel.app/api';

    if (!userStr) return;
    const user = JSON.parse(userStr);
    const tokenNo = user.employeeToken;

    if (eventType === Location.GeofencingEventType.Enter) {
      console.log(`📍 Entered 700m Keltron Kannur Plant boundary! Automated Punch In for Token #${tokenNo}`);
      await axios.post(`${apiUrl}/attendance/punch-in`, {
        tokenNo,
        latitude: KELTRON_KANNUR_GEOFENCE.latitude,
        longitude: KELTRON_KANNUR_GEOFENCE.longitude,
        isGeofencedAutoPunch: true,
        locationName: 'Keltron Kannur Plant (Inside 700m Geofence)'
      }, { timeout: 8000 });
    } else if (eventType === Location.GeofencingEventType.Exit) {
      console.log(`👋 Exited 700m Keltron Kannur Plant boundary! Automated Punch Out for Token #${tokenNo}`);
      await axios.post(`${apiUrl}/attendance/punch-out`, {
        tokenNo,
        latitude: KELTRON_KANNUR_GEOFENCE.latitude,
        longitude: KELTRON_KANNUR_GEOFENCE.longitude,
        isGeofencedAutoPunch: true,
        locationName: 'Keltron Kannur Plant (Exited 700m Geofence)'
      }, { timeout: 8000 });
    }
  } catch (err) {
    console.error('Auto Geofence Punch Failed:', err.message);
  }
});

// Start Background Geofence Service
export const setupGeofenceTracking = async () => {
  try {
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
      return { success: false, message: 'Foreground location permission denied.' };
    }

    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== 'granted') {
      return { success: false, message: 'Background location permission required for Auto Geofenced Punching.' };
    }

    const isDefined = await TaskManager.isTaskDefined(GEOFENCE_TASK_NAME);
    if (isDefined) {
      await Location.startGeofencingAsync(GEOFENCE_TASK_NAME, [KELTRON_KANNUR_GEOFENCE]);
      return {
        success: true,
        message: '📍 Keltron Kannur Plant 700m Geofence Auto-Punch Active (Lat: 11.9838°N, Lng: 75.3742°E, Radius: 700m)'
      };
    }

    return { success: false, message: 'Task manager failed to register geofence task.' };
  } catch (err) {
    return { success: false, message: err.message };
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
