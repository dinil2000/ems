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
import { API_BASE, FALLBACK_API_BASE } from '../config/api';

export default function HomeScreen({ user, onLogout, onNavigate }) {
  const [clockTime, setClockTime] = useState(new Date().toLocaleTimeString());
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setClockTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchStatus = async () => {
    try {
      const urls = [API_BASE, FALLBACK_API_BASE, 'http://localhost:5000/api'];
      for (const url of urls) {
        try {
          const res = await axios.get(`${url}/attendance/employee/${user.employeeToken}`);
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
    await fetchStatus();
    setRefreshing(false);
  };

  const handlePunchIn = async () => {
    setLoading(true);
    try {
      const urls = [API_BASE, FALLBACK_API_BASE, 'http://localhost:5000/api'];
      let res = null;
      for (const url of urls) {
        try {
          res = await axios.post(`${url}/attendance/punch-in`, {
            tokenNo: user.employeeToken,
          });
          if (res) break;
        } catch (e) {}
      }

      if (res) {
        Alert.alert('Punch In Success', res.data.message);
        fetchStatus();
      }
    } catch (err) {
      Alert.alert('Punch Failed', err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePunchOut = async () => {
    setLoading(true);
    try {
      const urls = [API_BASE, FALLBACK_API_BASE, 'http://localhost:5000/api'];
      let res = null;
      for (const url of urls) {
        try {
          res = await axios.post(`${url}/attendance/punch-out`, {
            tokenNo: user.employeeToken,
          });
          if (res) break;
        } catch (e) {}
      }

      if (res) {
        Alert.alert('Punch Out Success', res.data.message);
        fetchStatus();
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
      {/* User Info Bar */}
      <View style={styles.userCard}>
        <View>
          <Text style={styles.userName}>{user.employeeProfile?.name || `Token #${user.employeeToken}`}</Text>
          <Text style={styles.userRole}>
            Token #{user.employeeToken} • {user.role === 'SiteAdmin' ? 'ROOT ADMIN' : user.role}
          </Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Digital Clock & Punch Widget */}
      <View style={styles.clockCard}>
        <Text style={styles.clockLabel}>MPP PRODUCTION LINE DIGITAL CLOCK</Text>
        <Text style={styles.clockTime}>{clockTime}</Text>
        <Text style={styles.dateLabel}>{new Date().toDateString()}</Text>

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
          ℹ️ 10-Minute Grace Period Rule: Punch in within 10 minutes of shift start is auto-approved. Late punch &gt; 10 mins sends approval request to Supervisor.
        </Text>
      </View>

      {/* Navigation Shortcut Cards */}
      <View style={styles.navGrid}>
        <TouchableOpacity style={styles.navCard} onPress={() => onNavigate('notice')}>
          <Text style={styles.navIcon}>📋</Text>
          <Text style={styles.navTitle}>Weekly Shift Notice</Text>
          <Text style={styles.navSubtitle}>View Unit 1 & Unit 2 Roster Sheets</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navCard} onPress={() => onNavigate('profile')}>
          <Text style={styles.navIcon}>👤</Text>
          <Text style={styles.navTitle}>My Profile & Password</Text>
          <Text style={styles.navSubtitle}>Edit details or change password</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Attendance Card */}
      {attendance && (
        <View style={styles.historyCard}>
          <Text style={styles.historyTitle}>Latest Clock Activity</Text>
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
  userName: {
    fontSize: 16,
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
    marginBottom: 16,
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
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 14,
    lineHeight: 15,
  },
  navGrid: {
    flexDirection: 'row',
    justify: 'space-between',
    marginBottom: 16,
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
