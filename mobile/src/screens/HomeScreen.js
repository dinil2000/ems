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
  Modal,
  TextInput,
  SafeAreaView,
} from 'react-native';
import axios from 'axios';
import * as Location from 'expo-location';
import { getApiUrlList } from '../config/api';
import { KELTRON_KANNUR_GEOFENCE, calculateDistanceToKeltron, setupGeofenceTracking } from '../utils/geofence';

export default function HomeScreen({ user, onLogout, onNavigate }) {
  const [clockTime, setClockTime] = useState(new Date().toLocaleTimeString());
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [locationStatus, setLocationStatus] = useState('📍 Geofence Active (Keltron 700m Zone)');
  const [userLocation, setUserLocation] = useState(null);
  const [distanceMeters, setDistanceMeters] = useState(null);
  const [autoPunchEnabled, setAutoPunchEnabled] = useState(true);
  const [autoPunchMessage, setAutoPunchMessage] = useState('');

  // Google Maps Timeline Modal State
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [timelineMonth, setTimelineMonth] = useState('2026-08');
  const [timelineJson, setTimelineJson] = useState('');
  const [syncingTimeline, setSyncingTimeline] = useState(false);

  const prevInsideRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setClockTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Initialize Background Geofencing Task (700m radius)
  useEffect(() => {
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
                console.log('⚡ Entered 700m plant boundary! Auto Punching In...');
                setAutoPunchMessage(`⚡ Auto-Punched In! Entered 700m perimeter (${dist}m)`);
                handleAutoPunchIn(lat, lng);
              }
              // EXIT 700m boundary -> Auto Punch Out
              else if (!isInside700m && prevInsideRef.current === true && isPunchedIn) {
                console.log('⚡ Exited 700m plant boundary! Auto Punching Out...');
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
            setAttendance(res.data[0]);
          } else {
            setAttendance(null);
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

  const handleSyncGoogleTimeline = async () => {
    setSyncingTimeline(true);
    try {
      let timelineVisits = null;
      if (timelineJson.trim()) {
        try {
          const parsed = JSON.parse(timelineJson);
          timelineVisits = Array.isArray(parsed) ? parsed : (parsed.timelineObjects || parsed.rawSignals || [parsed]);
        } catch (e) {
          Alert.alert('Invalid JSON', 'Please enter valid Google Takeout JSON format or use 1-click Auto Backfill.');
          setSyncingTimeline(false);
          return;
        }
      }

      const urls = await getApiUrlList();
      let res = null;
      for (const url of urls) {
        try {
          res = await axios.post(`${url}/attendance/import-timeline`, {
            tokenNo: user.employeeToken,
            timelineVisits,
            autoBackfillMonth: timelineVisits ? null : timelineMonth,
          }, { timeout: 10000 });
          if (res) break;
        } catch (e) {}
      }

      if (res) {
        Alert.alert('Timeline Sync Successful!', res.data.message);
        setIsTimelineOpen(false);
        await fetchStatus();
      } else {
        Alert.alert('Sync Error', 'Unable to sync with server.');
      }
    } catch (err) {
      Alert.alert('Sync Failed', err.response?.data?.message || err.message);
    } finally {
      setSyncingTimeline(false);
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
      {/* User Info Bar with Keltron Logo Header */}
      <View style={styles.userCard}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <View style={styles.miniLogo}>
              <Text style={styles.miniLogoText}>KELTRON</Text>
            </View>
            <Text style={styles.userName}>{user.employeeProfile?.name || `Token #${user.employeeToken}`}</Text>
          </View>
          <Text style={styles.userRole}>
            Token #{user.employeeToken} • {user.role === 'SiteAdmin' ? 'ROOT ADMIN' : user.role}
          </Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
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
                {autoPunchEnabled ? '⚡ Auto-Punch: ON' : '⏸ Auto-Punch: OFF'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.geofenceNote}>
            📍 Target: Keltron Kannur Plant (11.9838°N, 75.3742°E) • 700m Auto Enter/Exit Zone
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

        {/* Google Maps Timeline Sync Trigger */}
        <TouchableOpacity style={styles.timelineSyncBtn} onPress={() => setIsTimelineOpen(true)}>
          <Text style={styles.timelineSyncBtnText}>📍 Sync Google Maps Timeline History</Text>
        </TouchableOpacity>
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
          <Text style={styles.navTitle}>Payroll (25th-25th)</Text>
          <Text style={styles.navSubtitle}>View Salary & OT Payslip</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navCard} onPress={() => onNavigate('maintenance')}>
          <Text style={styles.navIcon}>🔧</Text>
          <Text style={styles.navTitle}>Cleaning Alerts</Text>
          <Text style={styles.navSubtitle}>Machine Status & Alerts</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Attendance Card */}
      {attendance && (
        <View style={styles.historyCard}>
          <Text style={styles.historyTitle}>Latest Clock Activity & Location</Text>
          <View style={styles.historyRow}>
            <Text style={styles.historyLabel}>Punch In:</Text>
            <Text style={styles.historyValue}>
              {attendance.punchIn ? new Date(attendance.punchIn).toLocaleTimeString() : 'N/A'}
            </Text>
          </View>
          <View style={styles.historyRow}>
            <Text style={styles.historyLabel}>Punch Out:</Text>
            <Text style={styles.historyValue}>
              {attendance.punchOut ? new Date(attendance.punchOut).toLocaleTimeString() : 'N/A'}
            </Text>
          </View>
          <View style={styles.historyRow}>
            <Text style={styles.historyLabel}>Total Worked:</Text>
            <Text style={[styles.historyValue, { color: '#34d399', fontWeight: 'bold' }]}>
              {attendance.totalHours || 0} hrs (OT: {attendance.overtimeHours || 0} hrs)
            </Text>
          </View>
        </View>
      )}

      {/* Google Timeline Sync Modal */}
      <Modal visible={isTimelineOpen} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sync Google Maps Timeline History</Text>
            <TouchableOpacity onPress={() => setIsTimelineOpen(false)} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕ Close</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            <View style={styles.timelineInfoBox}>
              <Text style={styles.timelineInfoTitle}>How Google Maps Timeline Works:</Text>
              <Text style={styles.timelineInfoText}>
                Google Maps Timeline records arrival and departure times whenever you visit Keltron Component Complex Ltd (Dharmasala, Kalliassery).
                You can auto-backfill your month or paste Takeout JSON to reconstruct all daily Punch In & Punch Out logs.
              </Text>
            </View>

            <View style={styles.syncCard}>
              <Text style={styles.syncCardTitle}>⚡ 1-Click Month Timeline Auto-Sync:</Text>
              <Text style={styles.inputHelp}>Sync all working days for selected month:</Text>
              <TextInput
                style={styles.input}
                value={timelineMonth}
                onChangeText={setTimelineMonth}
                placeholder="2026-08 (YYYY-MM)"
                placeholderTextColor="#64748b"
              />

              <TouchableOpacity
                style={styles.syncBtn}
                onPress={handleSyncGoogleTimeline}
                disabled={syncingTimeline}
              >
                {syncingTimeline ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.syncBtnText}>⚡ Sync Month Timeline Punch Logs</Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.syncCard}>
              <Text style={styles.syncCardTitle}>Or Paste Google Takeout Timeline JSON:</Text>
              <TextInput
                style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                multiline
                placeholder='Paste Google Takeout location history JSON or visit objects: [{"date":"2026-08-18","punchIn":"06:55:00","punchOut":"15:10:00"}]'
                placeholderTextColor="#64748b"
                value={timelineJson}
                onChangeText={setTimelineJson}
              />

              <TouchableOpacity
                style={[styles.syncBtn, { backgroundColor: '#0284c7' }]}
                onPress={handleSyncGoogleTimeline}
                disabled={syncingTimeline}
              >
                <Text style={styles.syncBtnText}>Import Timeline JSON Records</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  miniLogo: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  miniLogoText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
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
  timelineSyncBtn: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#38bdf8',
    width: '100%',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  timelineSyncBtnText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700',
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
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  historyLabel: {
    fontSize: 13,
    color: '#94a3b8',
  },
  historyValue: {
    fontSize: 13,
    color: '#e2e8f0',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    backgroundColor: '#1e293b',
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#f8fafc',
  },
  closeBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  closeBtnText: {
    color: '#f87171',
    fontWeight: '700',
    fontSize: 12,
  },
  modalContent: {
    padding: 16,
  },
  timelineInfoBox: {
    backgroundColor: '#090d16',
    borderWidth: 1,
    borderColor: '#0284c7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
  },
  timelineInfoTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#38bdf8',
    marginBottom: 4,
  },
  timelineInfoText: {
    fontSize: 11,
    color: '#cbd5e1',
    lineHeight: 16,
  },
  syncCard: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 14,
  },
  syncCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 6,
  },
  inputHelp: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 10,
  },
  syncBtn: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  syncBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
});
