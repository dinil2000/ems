// ========================================================================
// Keltron MPP EMS — Smart Shift Alarm & Window-Based Location Scheduler
// ========================================================================
// Rules:
// 1. Shift 1: 07:00 AM to 03:00 PM (Primary default)
// 2. Punch-In Window: 06:30 AM to 07:30 AM (30 min early to 30 min late)
// 3. Working Sleep Period: 07:30 AM to 03:00 PM (GPS completely STOPPED to save battery & prevent false indoor exits)
// 4. Punch-Out Window: 03:00 PM onwards (Shift End wake-up until departure)
// 5. Off-Shift Sleep Period: After Punch-Out until next morning 06:30 AM (GPS completely STOPPED)
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
    inWindowLabel: '06:30 AM – 07:30 AM',
    outWindowLabel: '03:00 PM – 04:00 PM',
  },
  {
    id: 'general',
    name: 'General Shift',
    startHour: 8,
    startMin: 30,
    endHour: 16,
    endMin: 30,
    label: '08:30 AM – 04:30 PM',
    inWindowLabel: '08:00 AM – 09:00 AM',
    outWindowLabel: '04:30 PM – 05:30 PM',
  },
  {
    id: 'shift_2',
    name: 'Shift 2 (2nd Shift)',
    startHour: 15,
    startMin: 0,
    endHour: 23,
    endMin: 0,
    label: '03:00 PM – 11:00 PM',
    inWindowLabel: '02:30 PM – 03:30 PM',
    outWindowLabel: '11:00 PM – 12:00 AM',
  },
  {
    id: 'shift_3',
    name: 'Shift 3 (Night Shift)',
    startHour: 23,
    startMin: 0,
    endHour: 7,
    endMin: 0,
    label: '11:00 PM – 07:00 AM',
    inWindowLabel: '10:30 PM – 11:30 PM',
    outWindowLabel: '07:00 AM – 08:00 AM',
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
        description: 'Scheduled alarm wake-ups for automated Punch-In and Punch-Out windows.',
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

// ── Get Current Active Shift ────────────────────────────────────────────
export const getActiveShift = async () => {
  try {
    const savedId = await AsyncStorage.getItem('ems_selected_shift_id');
    const shift = SHIFT_PRESETS.find(s => s.id === savedId) || SHIFT_PRESETS[0];
    return shift;
  } catch (e) {
    return SHIFT_PRESETS[0];
  }
};

// ── Set Active Shift ────────────────────────────────────────────────────
export const setActiveShift = async (shiftId) => {
  await AsyncStorage.setItem('ems_selected_shift_id', shiftId);
  await scheduleDailyShiftAlarms();
};

// ── Calculate Current Shift Window Status ───────────────────────────────
export const evaluateShiftWindow = (shift, isCurrentlyOnShift, now = new Date()) => {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const shiftStartMinutes = shift.startHour * 60 + shift.startMin;
  const shiftEndMinutes = shift.endHour * 60 + shift.endMin;

  // Punch In Window: [Start - 30m, Start + 30m]
  const inWindowStart = (shiftStartMinutes - 30 + 1440) % 1440;
  const inWindowEnd = (shiftStartMinutes + 30) % 1440;

  // Check if inside morning punch in window
  let isInMorningWindow = false;
  if (inWindowStart < inWindowEnd) {
    isInMorningWindow = currentMinutes >= inWindowStart && currentMinutes <= inWindowEnd;
  } else {
    // Night wrap-around
    isInMorningWindow = currentMinutes >= inWindowStart || currentMinutes <= inWindowEnd;
  }

  // Punch Out Window: From shiftEnd onwards
  let isAfterShiftEnd = false;
  if (shiftStartMinutes < shiftEndMinutes) {
    isAfterShiftEnd = currentMinutes >= shiftEndMinutes;
  } else {
    // Crosses midnight (e.g. night shift)
    isAfterShiftEnd = currentMinutes >= shiftEndMinutes && currentMinutes < shiftStartMinutes;
  }

  if (!isCurrentlyOnShift) {
    if (isInMorningWindow || (currentMinutes >= inWindowStart && currentMinutes < shiftStartMinutes + 60)) {
      return {
        status: 'HUNTING_PUNCH_IN',
        badge: '🟢 Active: Scanning for Punch In',
        description: `Punch In Window active (${shift.inWindowLabel}). Background GPS is actively monitoring for plant arrival.`,
        gpsShouldRun: true,
        color: '#10b981',
      };
    } else {
      return {
        status: 'OFF_SHIFT_IDLE',
        badge: '💤 Off Shift (Sleeping)',
        description: `GPS sleeping to save battery. Alarm will wake up at ${shift.inWindowLabel.split('–')[0].trim()} for Punch In.`,
        gpsShouldRun: false,
        color: '#64748b',
      };
    }
  } else {
    // Currently on shift
    if (isAfterShiftEnd) {
      return {
        status: 'HUNTING_PUNCH_OUT',
        badge: '🟢 Active: Scanning for Punch Out',
        description: `Shift completed (${shift.label.split('–')[1].trim()}). Background GPS is actively monitoring for plant exit.`,
        gpsShouldRun: true,
        color: '#f59e0b',
      };
    } else {
      return {
        status: 'ON_SHIFT_SLEEPING',
        badge: '⏸️ On Shift (Battery Saver)',
        description: `Working on shift. GPS is sleeping to save battery until shift ends at ${shift.label.split('–')[1].trim()}.`,
        gpsShouldRun: false,
        color: '#0284c7',
      };
    }
  }
};

// ── Start / Stop Background Location Service Dynamically ────────────────
export const syncBackgroundLocationService = async (gpsShouldRun) => {
  try {
    const isDefined = await TaskManager.isTaskDefined(BACKGROUND_LOCATION_TASK);
    if (!isDefined) return;

    const isRunning = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).catch(() => false);

    if (gpsShouldRun && !isRunning) {
      console.log('⚡ [Alarm Manager] Window OPEN → Starting Background Location Service');
      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: Location.Accuracy.High,
        timeInterval: 15000,
        distanceInterval: 10,
        deferredUpdatesInterval: 15000,
        pausesUpdatesAutomatically: false,
        showsBackgroundLocationIndicator: true,
        activityType: Location.ActivityType.OtherNavigation,
        foregroundService: {
          notificationTitle: '📍 Keltron EMS Shift Tracking',
          notificationBody: 'Active attendance window monitoring (Auto Punch In/Out).',
          notificationColor: '#0284c7',
          killServiceOnDestroy: false,
        },
      });
    } else if (!gpsShouldRun && isRunning) {
      console.log('🛑 [Alarm Manager] Window CLOSED / Sleeping → Stopping Background Location Service');
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).catch(() => {});
    }
  } catch (err) {
    console.error('[Alarm Manager] Sync error:', err.message);
  }
};

// ── Synchronize State from Punch In / Out Events ────────────────────────
export const syncAlarmState = async (isPunchedIn) => {
  try {
    await AsyncStorage.setItem('ems_is_on_shift', isPunchedIn ? 'true' : 'false');
    const shift = await getActiveShift();
    const evaluation = evaluateShiftWindow(shift, isPunchedIn);
    await syncBackgroundLocationService(evaluation.gpsShouldRun);
    return evaluation;
  } catch (e) {
    console.error('[Alarm Manager] syncAlarmState error:', e);
  }
};

// ── Schedule Daily Android Alarm Wake-Up Notifications ─────────────────
export const scheduleDailyShiftAlarms = async () => {
  try {
    await setupAlarmChannel();
    const shift = await getActiveShift();

    // Cancel previously scheduled alarms
    await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});

    // 1. Morning Alarm Window (30 mins before shift start, e.g. 06:30 AM)
    const morningHour = shift.startHour;
    let morningMin = shift.startMin - 30;
    let actualMorningHour = morningHour;
    if (morningMin < 0) {
      morningMin += 60;
      actualMorningHour = (morningHour - 1 + 24) % 24;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⏰ Keltron Shift Alarm: Punch-In Window Open',
        body: `Shift starts at ${shift.label.split('–')[0].trim()}. Auto Punch-In is active as you enter the plant.`,
        sound: 'default',
        channelId: ALARM_CHANNEL_ID,
        data: { action: 'WAKEUP_PUNCH_IN_WINDOW' },
      },
      trigger: {
        hour: actualMorningHour,
        minute: morningMin,
        repeats: true,
      },
    });

    // 2. Evening Alarm Window (Shift end time, e.g. 03:00 PM)
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⏰ Keltron Shift Alarm: Shift End & Punch-Out Active',
        body: `Shift completed at ${shift.label.split('–')[1].trim()}. Auto Punch-Out will trigger when you exit the plant.`,
        sound: 'default',
        channelId: ALARM_CHANNEL_ID,
        data: { action: 'WAKEUP_PUNCH_OUT_WINDOW' },
      },
      trigger: {
        hour: shift.endHour,
        minute: shift.endMin,
        repeats: true,
      },
    });

    console.log(`⏰ [Alarm Manager] Alarms scheduled daily at ${String(actualMorningHour).padStart(2,'0')}:${String(morningMin).padStart(2,'0')} and ${String(shift.endHour).padStart(2,'0')}:${String(shift.endMin).padStart(2,'0')}`);
  } catch (err) {
    console.log('[Alarm Manager] Error scheduling alarms:', err.message);
  }
};
