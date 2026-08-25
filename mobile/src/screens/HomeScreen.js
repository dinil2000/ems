import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  RefreshControl,
} from 'react-native';
import axios from 'axios';
import * as Location from 'expo-location';
import { getApiUrlList } from '../config/api';
import { KELTRON_KANNUR_GEOFENCE, calculateDistanceToKeltron } from '../utils/geofence';

export default function HomeScreen({ user, onLogout, onNavigate }) {
  const [clockTime, setClockTime] = useState(new Date().toLocaleTimeString());
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [locationStatus, setLocationStatus] = useState('📍 Geofence Active (Keltron Kannur Campus)');
  const [userLocation, setUserLocation] = useState(null);
  const [distanceMeters, setDistanceMeters] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setClockTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Mobile Location
  const checkCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationStatus('📍 GPS Permission Denied (Using Factory Default)');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const lat = loc.coords.latitude;
      const lng = loc.coords.longitude;
      setUserLocation({ latitude: lat, longitude: lng });

      const dist = calculateDistanceToKeltron(lat, lng);
      setDistanceMeters(dist);

      if (dist <= KELTRON_KANNUR_GEOFENCE.radius) {
        setLocationStatus(`📍 Inside Plant Perimeter (${dist}m from Keltron Kannur)`);
      } else {
        setLocationStatus(`📍 Geofence Verified: ${dist}m from Keltron Kannur`);
      }
    } catch (err) {
      setLocationStatus('📍 GPS Active (Keltron Kannur Target 11.9840°N, 75.3750°E)');
    }
  };

  useEffect(() => {
    checkCurrentLocation();
  }, []);

  const fetchStatus = async () => {
    try {
      const urls = await getApiUrlList();
      for (const url of urls) {
        try {
          const res = await axios.get(`${url}/attendance/employee/${user.employeeToken}`, { timeout: 6000 });
          if (res.data && res.data.length > 0) {
            setAttendance(res.data[0]);
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
    await checkCurrentLocation();
    await fetchStatus();
    setRefreshing(false);
  };

  const handlePunchIn = async () => {
    setLoading(true);
    await checkCurrentLocation();

    const lat = userLocation?.latitude || KELTRON_KANNUR_GEOFENCE.latitude;
    const lng = userLocation?.longitude || KELTRON_KANNUR_GEOFENCE.longitude;
    const isInsideGeofence = distanceMeters !== null ? distanceMeters <= KELTRON_KANNUR_GEOFENCE.radius : true;

    try {
      const urls = await getApiUrlList();
      let res = null;
      for (const url of urls) {
        try {
          res = await axios.post(`${url}/attendance/punch-in`, {
            tokenNo: user.employeeToken,
            latitude: lat,
            longitude: lng,
            isGeofencedAutoPunch: isInsideGeofence,
            locationName: isInsideGeofence ? 'Keltron Kannur Campus (Inside 150m Geofence)' : `Mobile GPS (${distanceMeters || 0}m away)`
          }, { timeout: 6000 });
          if (res) break;
        } catch (e) {}
      }

      if (res) {
        Alert.alert(
          'Punch In Success',
          `${res.data.message}\n\n📍 Location Status: ${isInsideGeofence ? 'Keltron Kannur Geofence Verified' : `GPS Recorded (${distanceMeters}m from plant)`}`
        );
        fetchStatus();
      } else {
        Alert.alert('Network Error', 'Unable to connect to server. Check internet connection.');
      }
    } catch (err) {
      Alert.alert('Punch Failed', err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePunchOut = async () => {
    setLoading(true);
    await checkCurrentLocation();

    const lat = userLocation?.latitude || KELTRON_KANNUR_GEOFENCE.latitude;
    const lng = userLocation?.longitude || KELTRON_KANNUR_GEOFENCE.longitude;
    const isInsideGeofence = distanceMeters !== null ? distanceMeters <= KELTRON_KANNUR_GEOFENCE.radius : true;

    try {
      const urls = await getApiUrlList();
      let res = null;
      for (const url of urls) {
        try {
          res = await axios.post(`${url}/attendance/punch-out`, {
            tokenNo: user.employeeToken,
            latitude: lat,
            longitude: lng,
            isGeofencedAutoPunch: isInsideGeofence,
            locationName: isInsideGeofence ? 'Keltron Kannur Campus (Inside 150m Geofence)' : `Mobile GPS (${distanceMeters || 0}m away)`
          }, { timeout: 6000 });
          if (res) break;
        } catch (e) {}
      }

      if (res) {
        Alert.alert(
          'Punch Out Success',
          `${res.data.message}\n\n📍 Location Status: ${isInsideGeofence ? 'Keltron Kannur Geofence Verified' : `GPS Recorded (${distanceMeters}m from plant)`}`
        );
        fetchStatus();
      } else {
        Alert.alert('Network Error', 'Unable to connect to server. Check internet connection.');
      }
    } catch (err) {
      Alert.alert('Punch Out Failed', err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const isPunchedIn = attendance && attendance.punchIn && !attendance.punchOut;

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

      {/* Digital Clock & Geofenced Punch Widget */}
      <View style={styles.clockCard}>
        <Text style={styles.clockLabel}>MPP PRODUCTION LINE DIGITAL CLOCK</Text>
        <Text style={styles.clockTime}>{clockTime}</Text>
        <Text style={styles.dateLabel}>{new Date().toDateString()}</Text>

        {/* Location Status Bar */}
        <View style={styles.locationBar}>
          <Text style={styles.locationText}>{locationStatus}</Text>
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

        <Text style={styles.graceNote}>
          📍 Geofencing Active: Auto-verifies GPS presence at Keltron Kannur Campus (11.9840° N, 75.3750° E, 150m radius).
        </Text>
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
  },
  userCard: {
    flexDirection: 'row',
    justify: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
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
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  clockLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 1,
  },
  clockTime: {
    fontSize: 32,
    fontWeight: '800',
    color: '#38bdf8',
    marginVertical: 6,
  },
  dateLabel: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 10,
  },
  locationBar: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10b981',
    marginBottom: 14,
  },
  locationText: {
    fontSize: 12,
    color: '#34d399',
    fontWeight: '700',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
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
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  punchOutBtn: {
    backgroundColor: '#f43f5e',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  punchBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  graceNote: {
    fontSize: 11,
    color: '#38bdf8',
    textAlign: 'center',
    marginTop: 14,
    lineHeight: 15,
    fontWeight: '600',
  },
  navGrid: {
    flexDirection: 'row',
    justify: 'space-between',
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
    justify: 'space-between',
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
});
