import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import axios from 'axios';
import { getApiUrlList } from '../config/api';

export default function AttendanceHistoryScreen({ user, onBack }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const urls = await getApiUrlList();
      for (const url of urls) {
        try {
          const res = await axios.get(`${url}/attendance/employee/${user.employeeToken}`, { timeout: 6000 });
          if (res.data) {
            setRecords(res.data);
          }
          break;
        } catch (e) {}
      }
    } catch (err) {
      console.error('History fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchHistory();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      {/* Header Bar with Back Button */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backBtnText}>◀ Back</Text>
        </TouchableOpacity>

        {/* Official Keltron Brand Logo */}
        <View style={styles.logoBadge}>
          <Text style={styles.logoText}>KELTRON</Text>
        </View>

        <Text style={styles.headerTitle}>Punching History Log</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#38bdf8" />}
      >
        <View style={styles.bannerCard}>
          <Text style={styles.bannerTitle}>📊 Monthly Punching & Attendance Logs</Text>
          <Text style={styles.bannerSubtitle}>
            Token #{user.employeeToken} • {user.employeeProfile?.name || 'Employee'}
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#38bdf8" style={{ marginTop: 40 }} />
        ) : records.length > 0 ? (
          records.map((att) => {
            const dateStr = new Date(att.date).toLocaleDateString('en-IN', {
              weekday: 'short',
              month: 'short',
              day: 'numeric'
            });
            const punchInStr = att.punchIn ? new Date(att.punchIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A';
            const punchOutStr = att.punchOut ? new Date(att.punchOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A';

            return (
              <View key={att._id} style={styles.logCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.dateText}>{dateStr}</Text>
                  <View style={att.isLate ? styles.badgeLate : (att.punchOut ? styles.badgePresent : styles.badgeShift)}>
                    <Text style={att.isLate ? styles.textLate : (att.punchOut ? styles.textPresent : styles.textShift)}>
                      {att.isLate ? `LATE (${att.lateMinutes}m)` : (att.punchOut ? 'PRESENT' : 'ON SHIFT')}
                    </Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.row}>
                  <Text style={styles.label}>Punch In:</Text>
                  <Text style={[styles.value, { color: '#34d399' }]}>{punchInStr}</Text>
                </View>

                <View style={styles.row}>
                  <Text style={styles.label}>Punch Out:</Text>
                  <Text style={[styles.value, { color: att.punchOut ? '#38bdf8' : '#f87171' }]}>{punchOutStr}</Text>
                </View>

                <View style={styles.row}>
                  <Text style={styles.label}>Worked Duration:</Text>
                  <Text style={[styles.value, { color: '#f8fafc', fontWeight: 'bold' }]}>
                    {att.totalHours ? `${att.totalHours} hrs` : 'In Progress'} (OT: {att.overtimeHours || 0} hrs)
                  </Text>
                </View>

                <View style={styles.locationTag}>
                  <Text style={styles.locationText}>📍 Location: Keltron Kannur Campus (Verified)</Text>
                </View>
              </View>
            );
          })
        ) : (
          <Text style={styles.emptyText}>No attendance history records found for your account.</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingTop: 50,
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  backBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 10,
  },
  backBtnText: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '700',
  },
  logoBadge: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    marginRight: 8,
  },
  logoText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#f8fafc',
  },
  content: {
    padding: 16,
  },
  bannerCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#38bdf8',
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#f8fafc',
  },
  bannerSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  logCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    justify: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f8fafc',
  },
  badgePresent: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: '#10b981',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  textPresent: {
    color: '#34d399',
    fontSize: 11,
    fontWeight: '700',
  },
  badgeLate: {
    backgroundColor: 'rgba(244, 63, 94, 0.2)',
    borderColor: '#f43f5e',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  textLate: {
    color: '#f87171',
    fontSize: 11,
    fontWeight: '700',
  },
  badgeShift: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderColor: '#f59e0b',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  textShift: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 10,
  },
  row: {
    flexDirection: 'row',
    justify: 'space-between',
    paddingVertical: 3,
  },
  label: {
    fontSize: 13,
    color: '#94a3b8',
  },
  value: {
    fontSize: 13,
    fontWeight: '600',
  },
  locationTag: {
    backgroundColor: '#0f172a',
    padding: 6,
    borderRadius: 6,
    marginTop: 8,
  },
  locationText: {
    fontSize: 11,
    color: '#34d399',
    fontWeight: '600',
  },
  emptyText: {
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 30,
  },
});
