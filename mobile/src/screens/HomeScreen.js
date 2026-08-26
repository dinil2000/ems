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
} from 'react-native';
import axios from 'axios';
import * as Location from 'expo-location';
import { getApiUrlList } from '../config/api';
import { KELTRON_KANNUR_GEOFENCE, calculateDistanceToKeltron, setupGeofenceTracking, sendAutoPunchNotification } from '../utils/geofence';

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

  const prevInsideRef = useRef(null);

  const checkBgPermission = async () => {
    try {
      const { status } = await Location.getBackgroundPermissionsAsync();
      setHasBgPermission(status === 'granted');
    } catch (e) {}
  };

  const requestBgPerm = async () => {
    try {
      const { status } = await Location.requestBackgroundPermissionsAsync();
      if (status === 'granted') {
        setHasBgPermission(true);
        await setupGeofenceTracking();
        Alert.alert('Background Location Enabled', 'Automated Punch In/Out will now run automatically in the background even when app is closed!');
      } else {
        Alert.alert(
          'Background Permission Required',
          'To auto-punch without opening the app, please go to your phone Settings > Apps > Keltron MPP EMS > Permissions > Location and select "Allow all the time".'
        );
      }
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  useEffect(() => {
    checkBgPermission();
    setupGeofenceTracking().catch(e => console.log('Geofence setup note:', e.message));
  }, []);

  // Live Location Watcher for Real-Time Automated 700m Punch In / Punch Out
  useEffect(() => {
    let subscriber = null;

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
            timeInterval: 4000,
            distanceInterval: 5,
          },
          (loc) => {
            const lat = loc.coords.latitude;
            const lng = loc.coords.longitude;
            setUserLocation({ latitude: lat, longitude: lng });

            const dist = calculateDistanceToKeltron(lat, lng);
            setDistanceMeters(dist);

            const isInside700m = dist <= KELTRON_KANNUR_GEOFENCE.radius;

            if (isInside700m) {
              setLocationStatus(`📍 Inside 700m Plant Boundary (${dist}m)`);
            } else {
              setLocationStatus(`📍 ${dist}m from Plant (700m Zone Active)`);
            }

            // Real-Time Automated Punch In / Out Trigger for 700m Boundary
            if (autoPunchEnabled) {
              const isPunchedIn = attendance && (attendance.status === 'In Progress' || attendance.status === 'Pending Late Approval' || (attendance.punchIn && !attendance.punchOut));

              // ENTER 700m boundary -> Auto Punch In
              if (isInside700m && prevInsideRef.current === false && !isPunchedIn) {
                setAutoPunchMessage(`⚡ Auto-Punched In! Entered 700m perimeter (${dist}m)`);
                handleAutoPunchIn(lat, lng);
              }
              // EXIT 700m boundary -> Auto Punch Out
              else if (!isInside700m && prevInsideRef.current === true && isPunchedIn) {
                setAutoPunchMessage(`⚡ Auto-Punched Out! Left 700m perimeter (${dist}m)`);
                handleAutoPunchOut(lat, lng);
              }
            }

            prevInsideRef.current = isInside700m;
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
            if (latest.status === 'In Progress' || latest.status === 'Pending Late Approval' || (latest.punchIn && !latest.punchOut)) {
              setAttendance(latest);
            } else {
              setAttendance(latest);
            }
          } else {
            setAttendance(null);
            setRecentRecords([]);
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
          <TouchableOpacity onPress={() => Linking.openSettings()} style={{ marginTop: 6, alignItems: 'center' }}>
            <Text style={{ fontSize: 10, color: '#38bdf8', fontWeight: '700' }}>
              ⚙️ Phone Settings (Ensure "Allow All The Time" & "Unrestricted Battery")
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
});
