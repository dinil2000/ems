// ========================================================================
// Keltron MPP EMS — Smart Shift Alarm & 24/7 Background Attendance Engine
// ========================================================================
// Features:
// 1. Persistent 24/7 Foreground Location Service (NEVER stopped/killed by OS)
// 2. Intelligent Dynamic Shift Auto-Detection (Shift 1, Shift 2, Shift 3, General)
// 3. Shift Alarm Notifications at Window Openings
// 4. Guaranteed Background Wake-Up for Punch-Out at 11 PM, 3 PM, 7 AM or any OT time
// ========================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

export const SHIFT_PRESETS = [
  {
    id: 'shift_1',
    name: 'Shift 1 (1st Shift)',
    startHour: 7,
    startMin: 0,
    endHour: 15,
    endMin: 0,
    label: '07:00 AM – 03:00 PM',
    inWindowLabel: '06:00 AM – 07:30 AM',
    outWindowLabel: '03:00 PM onwards',
  },
  {
    id: 'general',
    name: 'General Shift',
    startHour: 8,
    startMin: 30,
    endHour: 16,
    endMin: 30,
    label: '08:30 AM – 04:30 PM',
    inWindowLabel: '07:30 AM – 09:00 AM',
    outWindowLabel: '04:30 PM onwards',
  },
  {
    id: 'shift_2',
    name: 'Shift 2 (2nd Shift)',
    startHour: 15,
    startMin: 0,
    endHour: 23,
    endMin: 0,
    label: '03:00 PM – 11:00 PM',
    inWindowLabel: '02:00 PM – 03:30 PM',
    outWindowLabel: '11:00 PM onwards',
  },
  {
    id: 'shift_3',
    name: 'Shift 3 (Night Shift)',
    startHour: 23,
    startMin: 0,
    endHour: 7,
    endMin: 0,
    label: '11:00 PM – 07:00 AM',
    inWindowLabel: '10:00 PM – 11:30 PM',
    outWindowLabel: '07:00 AM onwards',
  },
];

export const BACKGROUND_LOCATION_TASK = 'KELTRON_KANNUR_BACKGROUND_LOCATION_SERVICE';
export const ALARM_CHANNEL_ID = 'keltron_shift_alarm_channel';

// ── Setup Android Alarm Notification Channel ────────────────────────────
export const setupAlarmChannel = async () => {
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync(ALARM_CHANNEL_ID, {
        name: 'Keltron Shift Alarms',
        description: 'Scheduled alarm notifications for Punch-In and Punch-Out shift windows.',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0284c7',
        sound: 'default',
        enableLights: true,
        enableVibrate: true,
        showBadge: true,
        lockscreenVisibility: 1,
      });
    } catch (e) {
      console.log('[Alarm] Channel setup:', e.message);
    }
  }
};

// ── Pure Automatic Shift Detector from Current Time ──────────────────────
export const detectShiftFromTime = (date = new Date()) => {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const currentMinutes = hours * 60 + minutes;

  // Shift 1: 06:00 AM to 07:45 AM (360 to 465 mins)
  if (currentMinutes >= 360 && currentMinutes < 465) {
    return SHIFT_PRESETS[0]; // Shift 1 (07:00 - 15:00)
  }
  // General Shift: 07:45 AM to 01:45 PM (465 to 825 mins)
  if (currentMinutes >= 465 && currentMinutes < 825) {
    return SHIFT_PRESETS[1]; // General Shift (08:30 - 16:30)
  }
  // Shift 2: 01:45 PM to 08:30 PM (825 to 1230 mins) -> 2:00 PM early arrival, 2:45 PM punch, up to 3:30 PM
  if (currentMinutes >= 825 && currentMinutes < 1230) {
    return SHIFT_PRESETS[2]; // Shift 2 (15:00 - 23:00)
  }
  // Shift 3: 08:30 PM to 06:00 AM (1230 to 360 mins) -> 10:00 PM early arrival, 11:00 PM start, up to 11:30 PM
  return SHIFT_PRESETS[3]; // Shift 3 (23:00 - 07:00)
};

// ── Get Current Active Shift (Pure Automatic Detection) ───────────────────
export const getActiveShift = async (date = new Date(), activeAttendance = null) => {
  const isPunchedIn = Boolean(activeAttendance && activeAttendance.punchIn && !activeAttendance.punchOut);
  if (isPunchedIn && activeAttendance.shiftStartTime) {
    const st = activeAttendance.shiftStartTime;
    if (st === '07:00') return SHIFT_PRESETS[0];
    if (st === '08:30') return SHIFT_PRESETS[1];
    if (st === '15:00') return SHIFT_PRESETS[2];
    if (st === '23:00') return SHIFT_PRESETS[3];
  }
  return detectShiftFromTime(date);
};

// ── Set Active Shift (Preserved for compatibility) ────────────────────────
export const setActiveShift = async (shiftId) => {
  await scheduleDailyShiftAlarms();
};

// ── Evaluate Shift Window Status for UI ─────────────────────────────────
export const evaluateShiftWindow = (shift, isCurrentlyOnShift, now = new Date()) => {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const shiftStartMinutes = shift.startHour * 60 + shift.startMin;
  const shiftEndMinutes = shift.endHour * 60 + shift.endMin;

  // 1 hour early arrival allowed (start - 60 mins), 30 minutes window allowed after shift start
  const inWindowStart = (shiftStartMinutes - 60 + 1440) % 1440;
  const inWindowEnd = (shiftStartMinutes + 30) % 1440;

  let isInMorningWindow = false;
  if (inWindowStart < inWindowEnd) {
    isInMorningWindow = currentMinutes >= inWindowStart && currentMinutes <= inWindowEnd;
  } else {
    isInMorningWindow = currentMinutes >= inWindowStart || currentMinutes <= inWindowEnd;
  }

  let isAfterShiftEnd = false;
  if (shiftStartMinutes < shiftEndMinutes) {
    isAfterShiftEnd = currentMinutes >= shiftEndMinutes;
  } else {
    isAfterShiftEnd = currentMinutes >= shiftEndMinutes && currentMinutes < shiftStartMinutes;
  }

  if (!isCurrentlyOnShift) {
    if (isInMorningWindow) {
      return {
        status: 'HUNTING_PUNCH_IN',
        badge: '🟢 Active: Punch-In Window Open',
        description: `Punch-In window (${shift.inWindowLabel}). Entering 300m plant zone will auto punch in.`,
        color: '#10b981',
      };
    } else {
      return {
        status: 'OFF_SHIFT_READY',
        badge: '📍 24/7 Background Geofence Active',
        description: `Ready for shift. Auto Punch-In will trigger immediately whenever you arrive at the plant.`,
        color: '#06b6d4',
      };
    }
  } else {
    if (isAfterShiftEnd) {
      return {
        status: 'HUNTING_PUNCH_OUT',
        badge: '🟢 Shift Completed: Ready for Punch-Out',
        description: `Shift ended (${shift.label.split('–')[1].trim()}). Leaving 400m perimeter will auto punch out.`,
        color: '#f59e0b',
      };
    } else {
      return {
        status: 'ON_SHIFT_WORKING',
        badge: '🟢 On Shift (Working)',
        description: `Working on shift. Auto Punch-Out will trigger when you exit the plant after shift.`,
        color: '#3b82f6',
      };
    }
  }
};

// ── Ensure 24/7 Persistent Background Location Service is Running ────────
export const ensureBackgroundLocationRunning = async () => {
  try {
    const isDefined = await TaskManager.isTaskDefined(BACKGROUND_LOCATION_TASK);
    if (!isDefined) return;

    const isRunning = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).catch(() => false);
    if (!isRunning) {
      console.log('🚀 [24/7 Attendance Engine] Starting Persistent Background Location Service');
      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: Location.Accuracy.High,
        timeInterval: 20000,      // check every 20 seconds
        distanceInterval: 10,      // or 10m movement
        deferredUpdatesInterval: 20000,
        pausesUpdatesAutomatically: false,
        showsBackgroundLocationIndicator: true,
        activityType: Location.ActivityType.OtherNavigation,
        foregroundService: {
          notificationTitle: '📍 Keltron EMS: Automated Attendance Active',
          notificationBody: '24/7 plant geofence monitoring (Auto Punch In / Out).',
          notificationColor: '#0284c7',
          killServiceOnDestroy: false,
        },
      });
    }
  } catch (err) {
    console.error('[24/7 Attendance Engine] Error ensuring service runs:', err.message);
  }
};

// ── Synchronize State from Punch In / Out Events ────────────────────────
export const syncAlarmState = async (isPunchedIn) => {
  try {
    await AsyncStorage.setItem('ems_is_on_shift', isPunchedIn ? 'true' : 'false');
    await ensureBackgroundLocationRunning();
    const shift = await getActiveShift();
    return evaluateShiftWindow(shift, isPunchedIn);
  } catch (e) {
    console.error('[Alarm Manager] syncAlarmState error:', e);
  }
};

// ── Schedule Daily Android Alarm Reminder Notifications ────────────────
export const scheduleDailyShiftAlarms = async () => {
  try {
    await setupAlarmChannel();
    const shift = await getActiveShift();

    await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});

    // 1. Morning / Shift Start Alarm (30 mins before shift start)
    const morningHour = shift.startHour;
    let morningMin = shift.startMin - 30;
    let actualMorningHour = morningHour;
    if (morningMin < 0) {
      morningMin += 60;
      actualMorningHour = (morningHour - 1 + 24) % 24;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `⏰ Keltron Shift Reminder: ${shift.name}`,
        body: `Shift starts at ${shift.label.split('–')[0].trim()}. Auto Punch-In is active as you enter the plant.`,
        sound: 'default',
        channelId: ALARM_CHANNEL_ID,
        data: { action: 'SHIFT_START_REMINDER' },
      },
      trigger: {
        hour: actualMorningHour,
        minute: morningMin,
        repeats: true,
      },
    });

    // 2. Shift End Alarm (Shift end time)
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `⏰ Keltron Shift End: ${shift.name}`,
        body: `Shift completed at ${shift.label.split('–')[1].trim()}. Auto Punch-Out will record when you leave the plant.`,
        sound: 'default',
        channelId: ALARM_CHANNEL_ID,
        data: { action: 'SHIFT_END_REMINDER' },
      },
      trigger: {
        hour: shift.endHour,
        minute: shift.endMin,
        repeats: true,
      },
    });

    console.log(`⏰ [Alarm Manager] Shift alarms set for ${String(actualMorningHour).padStart(2,'0')}:${String(morningMin).padStart(2,'0')} and ${String(shift.endHour).padStart(2,'0')}:${String(shift.endMin).padStart(2,'0')}`);
  } catch (err) {
    console.log('[Alarm Manager] Error scheduling alarms:', err.message);
  }
};
