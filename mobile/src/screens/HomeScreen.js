import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  RefreshControl,
  Image,
  Linking,
  Platform,
  Modal,
} from 'react-native';
import axios from 'axios';
import * as Location from 'expo-location';
import * as IntentLauncher from 'expo-intent-launcher';
import { getApiUrlList } from '../config/api';
import {
  KELTRON_KANNUR_GEOFENCE,
  calculateDistanceToKeltron,
  setupGeofenceTracking,
  sendAutoPunchNotification,
} from '../utils/geofence';
import {
  SHIFT_PRESETS,
  getActiveShift,
  setActiveShift,
  evaluateShiftWindow,
  syncAlarmState,
  scheduleDailyShiftAlarms,
} from '../utils/shiftAlarmManager';

export default function HomeScreen({ user, onLogout, onNavigate }) {
  const [clockTime, setClockTime] = useState(new Date().toLocaleTimeString());
  const [attendance, setAttendance] = useState(null);
  const [recentRecords, setRecentRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [locationStatus, setLocationStatus] = useState('📍 Geofence Active (Keltron 700m Zone)');
  const [userLocation, setUserLocation] = useState(null);
  const [distanceMeters, setDistanceMeters] = useState(null);
  const [autoPunchEnabled, setAutoPunchEnabled] = useState(true);
  const [autoPunchMessage, setAutoPunchMessage] = useState('');
  const [hasBgPermission, setHasBgPermission] = useState(true);

  // Shift & Alarm Manager state
  const [activeShift, setActiveShiftState] = useState(SHIFT_PRESETS[0]);
  const [shiftEvaluation, setShiftEvaluation] = useState(null);
  const [shiftModalVisible, setShiftModalVisible] = useState(false);

  const prevInsideRef = useRef(null);

  const checkBgPermission = async () => {
    try {
      const { status } = await Location.getBackgroundPermissionsAsync();
      setHasBgPermission(status === 'granted');
    } catch (e) {}
  };

  const requestBatteryOptimization = async () => {
    if (Platform.OS === 'android') {
      try {
        await IntentLauncher.startActivityAsync(
          IntentLauncher.ActivityAction.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
          { data: 'package:com.keltron.mpp.ems' }
        );
      } catch (e) {
        try {
          await IntentLauncher.startActivityAsync(
            IntentLauncher.ActivityAction.IGNORE_BATTERY_OPTIMIZATION_SETTINGS
          );
        } catch (err) {
          Linking.openSettings();
        }
      }
    } else {
      Linking.openSettings();
    }
  };

  const requestBgPerm = async () => {
    try {
      const { status } = await Location.requestBackgroundPermissionsAsync();
      if (status === 'granted') {
        setHasBgPermission(true);
        await setupGeofenceTracking();
        await requestBatteryOptimization();
        Alert.alert('Background Location Enabled', 'Automated Punch In/Out will now run automatically in the background even when app is closed!');
      } else {
        Alert.alert(
          'Background Permission Required',
          'To auto-punch without opening the app, please select "Allow all the time" in Location settings.'
        );
      }
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  // Clock & Alarm evaluation tick
  useEffect(() => {
    const timer = setInterval(() => {
      setClockTime(new Date().toLocaleTimeString());
      if (activeShift) {
        const isCurrentlyOnShift = attendance && (attendance.status === 'In Progress' || attendance.status === 'Pending Late Approval' || (attendance.punchIn && !attendance.punchOut));
        setShiftEvaluation(evaluateShiftWindow(activeShift, !!isCurrentlyOnShift));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [activeShift, attendance]);

  useEffect(() => {
    const init = async () => {
      checkBgPermission();
      const currentShift = await getActiveShift();
      setActiveShiftState(currentShift);
      await setupGeofenceTracking().catch(e => console.log('Geofence setup note:', e.message));
    };
    init();
  }, []);

  const handleSelectShift = async (shift) => {
    setActiveShiftState(shift);
    setShiftModalVisible(false);
    await setActiveShift(shift.id);
    const isCurrentlyOnShift = attendance && (attendance.status === 'In Progress' || attendance.status === 'Pending Late Approval' || (attendance.punchIn && !attendance.punchOut));
    const evalResult = await syncAlarmState(!!isCurrentlyOnShift);
    setShiftEvaluation(evalResult);
    Alert.alert('Shift Updated', `Active Shift set to ${shift.name} (${shift.label}). Alarm windows updated!`);
  };

  // Live Location Watcher with Hysteresis & Accuracy Filtering
  useEffect(() => {
    let subscriber = null;
    let outsideCounter = 0;

    const startLocationWatch = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationStatus('📍 GPS Permission Denied (Using Factory Default)');
          return;
        }

        subscriber = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 5000,
            distanceInterval: 10,
          },
          (loc) => {
            const accuracy = loc.coords.accuracy || 100;
            // Ignore inaccurate GPS jumps (> 75m)
            if (accuracy > 75) return;

            const lat = loc.coords.latitude;
            const lng = loc.coords.longitude;
            setUserLocation({ latitude: lat, longitude: lng });

            const dist = calculateDistanceToKeltron(lat, lng);
            setDistanceMeters(dist);

            const isInside700m = dist <= KELTRON_KANNUR_GEOFENCE.radius;
            const isOutside850m = dist >= (KELTRON_KANNUR_GEOFENCE.exitRadius || 850);

            if (isInside700m) {
              setLocationStatus(`📍 Inside 700m Plant Boundary (${dist}m)`);
              outsideCounter = 0;
            } else if (isOutside850m) {
              setLocationStatus(`📍 Outside Plant Perimeter (${dist}m)`);
            } else {
              setLocationStatus(`📍 Buffer Zone (${dist}m from Plant)`);
            }

            // Real-Time Automated Punch In / Out Trigger with Hysteresis
            if (autoPunchEnabled) {
              const isPunchedIn = attendance && (attendance.status === 'In Progress' || attendance.status === 'Pending Late Approval' || (attendance.punchIn && !attendance.punchOut));

              // ENTER 700m boundary -> Auto Punch In
              if (isInside700m && !isPunchedIn && prevInsideRef.current !== true) {
                setAutoPunchMessage(`⚡ Auto-Punched In! Entered 700m perimeter (${dist}m)`);
                handleAutoPunchIn(lat, lng);
                prevInsideRef.current = true;
              }
              // EXIT past 850m boundary with debouncing (3 consecutive checks) -> Auto Punch Out
              else if (isOutside850m && isPunchedIn) {
                outsideCounter += 1;
                if (outsideCounter >= 3 && prevInsideRef.current !== false) {
                  setAutoPunchMessage(`⚡ Auto-Punched Out! Left plant perimeter (${dist}m)`);
                  handleAutoPunchOut(lat, lng);
                  prevInsideRef.current = false;
                  outsideCounter = 0;
                }
              }
            }
          }
        );
      } catch (err) {
        console.warn('Location watch error:', err.message);
      }
    };

    startLocationWatch();

    return () => {
      if (subscriber) subscriber.remove();
    };
  }, [autoPunchEnabled, attendance]);

  const fetchStatus = async () => {
    try {
      const urls = await getApiUrlList();
      for (const url of urls) {
        try {
          const res = await axios.get(`${url}/attendance/employee/${user.employeeToken}`, { timeout: 6000 });
          if (res.data && res.data.length > 0) {
            setRecentRecords(res.data.slice(0, 5));
            const latest = res.data[0];
            setAttendance(latest);
            const isCurrentlyOnShift = latest.status === 'In Progress' || latest.status === 'Pending Late Approval' || (latest.punchIn && !latest.punchOut);
            await syncAlarmState(!!isCurrentlyOnShift);
          } else {
            setAttendance(null);
            setRecentRecords([]);
            await syncAlarmState(false);
          }
          break;
        } catch (e) {}
      }
    } catch (err) {
      console.error('Error fetching attendance status:', err);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchStatus();
    setRefreshing(false);
  };

  const handleAutoPunchIn = async (lat, lng) => {
    try {
      const urls = await getApiUrlList();
      for (const url of urls) {
        try {
          const res = await axios.post(`${url}/attendance/punch-in`, {
            tokenNo: user.employeeToken,
            latitude: lat || KELTRON_KANNUR_GEOFENCE.latitude,
            longitude: lng || KELTRON_KANNUR_GEOFENCE.longitude,
            isGeofencedAutoPunch: true,
            locationName: 'Keltron Kannur Plant (Inside 700m Geofence)'
          }, { timeout: 6000 });
          if (res.data) {
            const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            await sendAutoPunchNotification(
              '🟢 Auto Punched In (700m Plant Zone)',
              `Token #${user.employeeToken} automatically punched in at ${timeStr} upon entering Keltron Kannur Plant.`
            );
            await syncAlarmState(true);
            Alert.alert('⚡ Automated Punch In', 'You entered the 700m Keltron Kannur plant perimeter!');
            await fetchStatus();
            break;
          }
        } catch (e) {}
      }
    } catch (e) {}
  };

  const handleAutoPunchOut = async (lat, lng) => {
    try {
      const urls = await getApiUrlList();
      for (const url of urls) {
        try {
          const res = await axios.post(`${url}/attendance/punch-out`, {
            tokenNo: user.employeeToken,
            latitude: lat || KELTRON_KANNUR_GEOFENCE.latitude,
            longitude: lng || KELTRON_KANNUR_GEOFENCE.longitude,
            isGeofencedAutoPunch: true,
            locationName: 'Keltron Kannur Plant (Exited 700m Geofence)'
          }, { timeout: 6000 });
          if (res.data) {
            const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            await sendAutoPunchNotification(
              '🔴 Auto Punched Out (Left 700m Zone)',
              `Token #${user.employeeToken} automatically punched out at ${timeStr} upon leaving Keltron Kannur Plant.`
            );
            await syncAlarmState(false);
            Alert.alert('⚡ Automated Punch Out', 'You left the 700m Keltron Kannur plant perimeter!');
            await fetchStatus();
            break;
          }
        } catch (e) {}
      }
    } catch (e) {}
  };

  const handlePunchIn = async () => {
    setLoading(true);
    const lat = userLocation?.latitude || KELTRON_KANNUR_GEOFENCE.latitude;
    const lng = userLocation?.longitude || KELTRON_KANNUR_GEOFENCE.longitude;
    const isInside = distanceMeters !== null ? distanceMeters <= KELTRON_KANNUR_GEOFENCE.radius : true;

    try {
      const urls = await getApiUrlList();
      let res = null;
      for (const url of urls) {
        try {
          res = await axios.post(`${url}/attendance/punch-in`, {
            tokenNo: user.employeeToken,
            latitude: lat,
            longitude: lng,
            isGeofencedAutoPunch: isInside,
            locationName: isInside ? 'Keltron Kannur Plant (Inside 700m Geofence)' : `Mobile GPS (${distanceMeters || 0}m away)`
          }, { timeout: 6000 });
          if (res) break;
        } catch (e) {}
      }

      if (res) {
        Alert.alert('Punch In Success', res.data.message);
        await syncAlarmState(true);
        await fetchStatus();
      } else {
        Alert.alert('Error', 'Unable to connect to server.');
      }
    } catch (err) {
      Alert.alert('Punch Failed', err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePunchOut = async () => {
    setLoading(true);
    const lat = userLocation?.latitude || KELTRON_KANNUR_GEOFENCE.latitude;
    const lng = userLocation?.longitude || KELTRON_KANNUR_GEOFENCE.longitude;
    const isInside = distanceMeters !== null ? distanceMeters <= KELTRON_KANNUR_GEOFENCE.radius : true;

    try {
      const urls = await getApiUrlList();
      let res = null;
      for (const url of urls) {
        try {
          res = await axios.post(`${url}/attendance/punch-out`, {
            tokenNo: user.employeeToken,
            latitude: lat,
            longitude: lng,
            isGeofencedAutoPunch: isInside,
            locationName: isInside ? 'Keltron Kannur Plant (Inside 700m Geofence)' : `Mobile GPS (${distanceMeters || 0}m away)`
          }, { timeout: 6000 });
          if (res) break;
        } catch (e) {}
      }

      if (res) {
        Alert.alert('Punch Out Success', res.data.message);
        await syncAlarmState(false);
        await fetchStatus();
      } else {
        Alert.alert('Error', 'Unable to connect to server.');
      }
    } catch (err) {
      Alert.alert('Punch Out Failed', err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const isPunchedIn = attendance && (attendance.status === 'In Progress' || attendance.status === 'Pending Late Approval' || (attendance.punchIn && !attendance.punchOut));
  const isInside700m = distanceMeters !== null && distanceMeters <= KELTRON_KANNUR_GEOFENCE.radius;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#38bdf8" />}
    >
      {/* User Info Bar with MPP Official Logo Header */}
      <View style={styles.userCard}>
        <Image
          source={require('../../assets/icon.png')}
          style={styles.headerLogo}
          resizeMode="contain"
        />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.userName}>{user.employeeProfile?.name || `Token #${user.employeeToken}`}</Text>
          <Text style={styles.userRole}>
            Token #{user.employeeToken} • {user.role === 'SiteAdmin' ? 'ROOT ADMIN' : user.role}
          </Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Background Permission Notification Banner if needed */}
      {!hasBgPermission && (
        <TouchableOpacity style={styles.bgPermBanner} onPress={requestBgPerm}>
          <Text style={styles.bgPermTitle}>📍 Background Location Setup Needed</Text>
          <Text style={styles.bgPermText}>
            To punch in/out automatically without opening the app, tap here to enable "Allow all the time".
          </Text>
        </TouchableOpacity>
      )}

      {/* Smart Shift Alarm & Auto-Punch Scheduler Widget */}
      <View style={styles.alarmCard}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 16, marginRight: 6 }}>⏰</Text>
            <Text style={styles.alarmCardTitle}>SHIFT ALARM SCHEDULER</Text>
          </View>
          <TouchableOpacity
            style={styles.shiftChangeBtn}
            onPress={() => setShiftModalVisible(true)}
          >
            <Text style={styles.shiftChangeText}>{activeShift?.name} ▾</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.alarmShiftDetails}>
          <Text style={styles.alarmShiftTime}>
            Shift: <Text style={{ color: '#38bdf8', fontWeight: '800' }}>{activeShift?.label}</Text>
          </Text>
          <Text style={styles.alarmWindowsText}>
            In: {activeShift?.inWindowLabel} • Out: {activeShift?.outWindowLabel}
          </Text>
        </View>

        {shiftEvaluation && (
          <View style={[styles.alarmStatusBadge, { borderColor: shiftEvaluation.color, backgroundColor: `${shiftEvaluation.color}18` }]}>
            <Text style={[styles.alarmBadgeText, { color: shiftEvaluation.color }]}>
              {shiftEvaluation.badge}
            </Text>
            <Text style={styles.alarmDescText}>
              {shiftEvaluation.description}
            </Text>
          </View>
        )}
      </View>

      {/* Digital Clock & 700m Automated Geofence Punch Widget */}
      <View style={styles.clockCard}>
        <Text style={styles.clockLabel}>MPP 700M AUTOMATED GEOFENCE PUNCHING</Text>
        <Text style={styles.clockTime}>{clockTime}</Text>
        <Text style={styles.dateLabel}>{new Date().toDateString()}</Text>

        {/* Live GPS Radar Bar (700m Radius) */}
        <View style={[styles.locationBar, isInside700m && styles.locationBarInside]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={[styles.locationText, isInside700m && { color: '#34d399' }]}>
              {locationStatus}
            </Text>
            <TouchableOpacity
              style={[styles.autoToggle, autoPunchEnabled && styles.autoToggleActive]}
              onPress={() => setAutoPunchEnabled(!autoPunchEnabled)}
            >
              <Text style={[styles.autoToggleText, autoPunchEnabled && { color: '#ffffff' }]}>
                {autoPunchEnabled ? '⚡ Auto: ON' : '⏸ Auto: OFF'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.geofenceNote}>
            📍 Target: Keltron Kannur Plant (11.9838°N, 75.3742°E) • 700m Auto Zone
          </Text>

          {autoPunchMessage ? (
            <Text style={styles.autoMsgText}>{autoPunchMessage}</Text>
          ) : null}
        </View>

        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Current Shift Status:</Text>
          <View style={isPunchedIn ? styles.badgeActive : styles.badgeInactive}>
            <Text style={isPunchedIn ? styles.badgeTextActive : styles.badgeTextInactive}>
              {isPunchedIn ? '🟢 ON SHIFT (PUNCHED IN)' : '⚪ OFF SHIFT'}
            </Text>
          </View>
        </View>

        {isPunchedIn ? (
          <TouchableOpacity style={styles.punchOutBtn} onPress={handlePunchOut} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.punchBtnText}>🔴 PUNCH OUT NOW</Text>}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.punchInBtn} onPress={handlePunchIn} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.punchBtnText}>🟢 PUNCH IN NOW</Text>}
          </TouchableOpacity>
        )}

        <View style={styles.rulesNoteBox}>
          <Text style={styles.rulesNoteText}>
            ⏱ Working Hours = 7h 30m (30m lunch deducted) • OT after 8h 30m presence (30m grace) • Billing Cycle: 26th-25th
          </Text>
          <TouchableOpacity onPress={requestBatteryOptimization} style={{ marginTop: 6, alignItems: 'center' }}>
            <Text style={{ fontSize: 10, color: '#38bdf8', fontWeight: '700' }}>
              ⚙️ Tap to Enable 24/7 Background Running ("Allow Background Power")
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Navigation Options Grid */}
      <View style={styles.navGrid}>
        <TouchableOpacity style={styles.navCard} onPress={() => onNavigate('history')}>
          <Text style={styles.navIcon}>📊</Text>
          <Text style={styles.navTitle}>Punching Logs</Text>
          <Text style={styles.navSubtitle}>Monthly Attendance Data</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navCard} onPress={() => onNavigate('notice')}>
          <Text style={styles.navIcon}>📋</Text>
          <Text style={styles.navTitle}>Shift Notice</Text>
          <Text style={styles.navSubtitle}>Unit 1 & 2 Roster Sheets</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.navGrid}>
        <TouchableOpacity style={styles.navCard} onPress={() => onNavigate('payroll')}>
          <Text style={styles.navIcon}>💰</Text>
          <Text style={styles.navTitle}>Payroll (26th-25th)</Text>
          <Text style={styles.navSubtitle}>View Salary & OT Payslip</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navCard} onPress={() => onNavigate('maintenance')}>
          <Text style={styles.navIcon}>🔧</Text>
          <Text style={styles.navTitle}>Cleaning Alerts</Text>
          <Text style={styles.navSubtitle}>Machine Status & Alerts</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Attendance & Overtime Logs */}
      <View style={styles.historyCard}>
        <Text style={styles.historyTitle}>Recent Attendance & Overtime Logs</Text>
        {recentRecords.length > 0 ? (
          recentRecords.map((rec) => {
            const dateStr = new Date(rec.date).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short'
            });
            const inTime = rec.punchIn ? new Date(rec.punchIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-';
            const outTime = rec.punchOut ? new Date(rec.punchOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'On Shift';

            return (
              <View key={rec._id} style={styles.logItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.logDate}>{dateStr}</Text>
                  <Text style={styles.logSub}>
                    In: {inTime} • Out: {outTime}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.logHours}>
                    {rec.totalHours ? `${rec.totalHours} hrs` : 'In Progress'}
                  </Text>
                  <Text style={[styles.logOt, rec.overtimeHours > 0 && { color: '#fbbf24' }]}>
                    OT: {rec.overtimeHours > 0 ? `+${rec.overtimeHours} hrs` : '0 hrs'}
                  </Text>
                </View>
              </View>
            );
          })
        ) : (
          <Text style={styles.emptyNote}>No attendance punch logs recorded yet.</Text>
        )}
      </View>

      {/* Shift Selector Modal */}
      <Modal
        visible={shiftModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShiftModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Your Working Shift</Text>
            <Text style={styles.modalSub}>
              Alarm Manager will wake up for Punch-In & Punch-Out during the shift windows.
            </Text>

            {SHIFT_PRESETS.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={[
                  styles.shiftOptionCard,
                  activeShift?.id === s.id && styles.shiftOptionCardActive,
                ]}
                onPress={() => handleSelectShift(s)}
              >
                <View>
                  <Text style={[styles.shiftOptionName, activeShift?.id === s.id && { color: '#38bdf8' }]}>
                    {s.name}
                  </Text>
                  <Text style={styles.shiftOptionTime}>
                    {s.label}
                  </Text>
                  <Text style={styles.shiftOptionWindow}>
                    Window: In ({s.inWindowLabel}) • Out ({s.outWindowLabel})
                  </Text>
                </View>
                {activeShift?.id === s.id && (
                  <Text style={{ fontSize: 18, color: '#38bdf8' }}>✓</Text>
                )}
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setShiftModalVisible(false)}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  headerLogo: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f8fafc',
  },
  userRole: {
    fontSize: 12,
    color: '#06b6d4',
    fontWeight: '600',
    marginTop: 2,
  },
  logoutBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  logoutText: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '600',
  },
  bgPermBanner: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: '#f59e0b',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  bgPermTitle: {
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 3,
  },
  bgPermText: {
    color: '#fde68a',
    fontSize: 11,
    lineHeight: 15,
  },
  alarmCard: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  alarmCardTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#38bdf8',
    letterSpacing: 0.5,
  },
  shiftChangeBtn: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#0284c7',
  },
  shiftChangeText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '700',
  },
  alarmShiftDetails: {
    marginTop: 8,
    marginBottom: 8,
  },
  alarmShiftTime: {
    fontSize: 13,
    color: '#f8fafc',
    fontWeight: '600',
  },
  alarmWindowsText: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  alarmStatusBadge: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
  },
  alarmBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 3,
  },
  alarmDescText: {
    fontSize: 10.5,
    color: '#cbd5e1',
    lineHeight: 14,
  },
  clockCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  clockLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  clockTime: {
    fontSize: 32,
    fontWeight: '800',
    color: '#38bdf8',
    marginVertical: 4,
  },
  dateLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 8,
  },
  locationBar: {
    width: '100%',
    backgroundColor: '#0f172a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0284c7',
    marginBottom: 12,
  },
  locationBarInside: {
    borderColor: '#10b981',
  },
  locationText: {
    fontSize: 11,
    color: '#38bdf8',
    fontWeight: '700',
    flex: 1,
  },
  autoToggle: {
    backgroundColor: 'rgba(244, 63, 94, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#f43f5e',
  },
  autoToggleActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  autoToggleText: {
    color: '#f87171',
    fontSize: 10,
    fontWeight: '700',
  },
  geofenceNote: {
    fontSize: 9,
    color: '#94a3b8',
    marginTop: 4,
  },
  autoMsgText: {
    fontSize: 10,
    color: '#fbbf24',
    fontWeight: '700',
    marginTop: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 13,
    color: '#cbd5e1',
    marginRight: 8,
  },
  badgeActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: '#10b981',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeTextActive: {
    color: '#34d399',
    fontSize: 12,
    fontWeight: '700',
  },
  badgeInactive: {
    backgroundColor: 'rgba(148, 163, 184, 0.2)',
    borderColor: '#64748b',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeTextInactive: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700',
  },
  punchInBtn: {
    backgroundColor: '#10b981',
    width: '100%',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  punchOutBtn: {
    backgroundColor: '#f43f5e',
    width: '100%',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  punchBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  rulesNoteBox: {
    marginTop: 10,
    backgroundColor: '#090d16',
    borderRadius: 6,
    padding: 8,
    width: '100%',
  },
  rulesNoteText: {
    fontSize: 9.5,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 14,
  },
  navGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  navCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    width: '48%',
    borderWidth: 1,
    borderColor: '#334155',
  },
  navIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  navTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f8fafc',
  },
  navSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  historyCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 10,
  },
  logItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  logDate: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f8fafc',
  },
  logSub: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  logHours: {
    fontSize: 13,
    fontWeight: '700',
    color: '#34d399',
  },
  logOt: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
    marginTop: 2,
  },
  emptyNote: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 16,
    lineHeight: 16,
  },
  shiftOptionCard: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shiftOptionCardActive: {
    borderColor: '#0284c7',
    backgroundColor: '#0c1b33',
  },
  shiftOptionName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f8fafc',
  },
  shiftOptionTime: {
    fontSize: 12,
    color: '#cbd5e1',
    marginTop: 2,
  },
  shiftOptionWindow: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },
  modalCloseBtn: {
    marginTop: 8,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#334155',
    borderRadius: 8,
  },
  modalCloseText: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '700',
  },
});
