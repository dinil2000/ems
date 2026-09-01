import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Image,
} from 'react-native';
import axios from 'axios';
import { getApiUrlList } from '../config/api';

export default function AttendanceHistoryScreen({ user, onBack }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchToken, setSearchToken] = useState(user?.employeeToken || '');

  const isSupervisorOrAdmin = user?.role === 'Supervisor' || user?.role === 'SiteAdmin';

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const targetToken = searchToken || user?.employeeToken || '8709';
      const urls = await getApiUrlList();
      for (const url of urls) {
        try {
          const res = await axios.get(`${url}/attendance/employee/${targetToken}`, { timeout: 6000 });
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
  }, [searchToken]);

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

        {/* MPP Brand Logo */}
        <Image
          source={require('../../assets/icon.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />

        <Text style={styles.headerTitle}>Punching History Log</Text>
      </View>

      {/* Action & Search Bar */}
      <View style={styles.searchBar}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: isSupervisorOrAdmin ? 6 : 0 }}>
          <Text style={styles.searchLabel}>
            {isSupervisorOrAdmin ? 'Search Employee Token #:' : `Punch Logs for Token #${user.employeeToken}`}
          </Text>
          <Text style={{ fontSize: 11, color: '#38bdf8', fontWeight: '700' }}>
            {records.length} Entries
          </Text>
        </View>

        {isSupervisorOrAdmin && (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              style={styles.searchInput}
              placeholder="e.g. 8709, 3085, 8356"
              placeholderTextColor="#64748b"
              value={searchToken}
              onChangeText={setSearchToken}
              keyboardType="numeric"
            />
            <TouchableOpacity style={styles.searchBtn} onPress={fetchHistory}>
              <Text style={styles.searchBtnText}>Search 🔍</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#38bdf8" />}
      >
        <View style={styles.bannerCard}>
          <Text style={styles.bannerTitle}>📊 Monthly Punching & Attendance Logs</Text>
          <Text style={styles.bannerSubtitle}>
            Viewing Token #{searchToken || user.employeeToken} • {records.length} Recorded Entries • 300m Plant Boundary
          </Text>
          <View style={styles.rulesBox}>
            <Text style={styles.rulesText}>
              ⏱ Working Hours = 7h 30m (30m lunch deducted from 8h shift) • OT starts after 8h 30m presence (30m grace) • Salary Cycle: 26th to 25th
            </Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#38bdf8" style={{ marginTop: 40 }} />
        ) : records.length > 0 ? (
          records.map((att) => {
            const dateStr = new Date(att.date).toLocaleDateString('en-IN', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric'
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
                  <Text style={styles.label}>Shift Start:</Text>
                  <Text style={[styles.value, { color: '#38bdf8' }]}>
                    {att.shiftStartTime === '07:00' ? '07:00 (1st Shift)' :
                     att.shiftStartTime === '15:00' ? '15:00 (2nd Shift)' :
                     att.shiftStartTime === '23:00' ? '23:00 (3rd Shift)' :
                     att.shiftStartTime === '08:30' ? '08:30 (Gen Shift)' : (att.shiftStartTime || '08:30')}
                  </Text>
                </View>

                <View style={styles.row}>
                  <Text style={styles.label}>Punch In:</Text>
                  <Text style={[styles.value, { color: '#34d399' }]}>{punchInStr}</Text>
                </View>

                <View style={styles.row}>
                  <Text style={styles.label}>Punch Out:</Text>
                  <Text style={[styles.value, { color: att.punchOut ? '#38bdf8' : '#f87171' }]}>{punchOutStr}</Text>
                </View>

                <View style={styles.row}>
                  <Text style={styles.label}>Working Hours:</Text>
                  <Text style={[styles.value, { color: '#f8fafc', fontWeight: 'bold' }]}>
                    {att.totalHours ? `${att.totalHours} hrs` : 'In Progress'}
                  </Text>
                </View>

                <View style={styles.row}>
                  <Text style={styles.label}>Overtime (OT):</Text>
                  <Text style={[styles.value, { color: att.overtimeHours > 0 ? '#fbbf24' : '#94a3b8', fontWeight: 'bold' }]}>
                    {att.overtimeHours > 0 ? `+${att.overtimeHours} hrs` : '0 hrs'}
                  </Text>
                </View>

                <View style={styles.locationTag}>
                  <Text style={styles.locationText}>📍 Keltron Kannur Plant (300m Geofence Verified)</Text>
                </View>
              </View>
            );
          })
        ) : (
          <Text style={styles.emptyText}>No attendance records found for Token #{searchToken || user?.employeeToken}.</Text>
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
  logoImage: {
    width: 28,
    height: 28,
    borderRadius: 6,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#f8fafc',
  },
  searchBar: {
    backgroundColor: '#1e293b',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  searchLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#f8fafc',
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
  },
  searchBtn: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    justifyContent: 'center',
  },
  searchBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  bannerCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#38bdf8',
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#f8fafc',
  },
  bannerSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  rulesBox: {
    backgroundColor: '#090d16',
    borderRadius: 6,
    padding: 8,
    marginTop: 8,
  },
  rulesText: {
    fontSize: 10,
    color: '#cbd5e1',
    lineHeight: 14,
  },
  logCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 14,
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
    marginVertical: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  label: {
    fontSize: 12,
    color: '#94a3b8',
  },
  value: {
    fontSize: 12,
    fontWeight: '600',
    color: '#f8fafc',
  },
  locationTag: {
    backgroundColor: '#0f172a',
    padding: 6,
    borderRadius: 6,
    marginTop: 6,
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
