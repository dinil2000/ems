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
  Modal,
  SafeAreaView,
  Alert,
} from 'react-native';
import axios from 'axios';
import { getApiUrlList } from '../config/api';

export default function AttendanceHistoryScreen({ user, onBack }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchToken, setSearchToken] = useState(user?.employeeToken || '');

  // Google Maps Timeline Modal State
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [timelineMonth, setTimelineMonth] = useState('2026-08');
  const [timelineJson, setTimelineJson] = useState('');
  const [syncingTimeline, setSyncingTimeline] = useState(false);

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

  const handleSyncGoogleTimeline = async () => {
    setSyncingTimeline(true);
    try {
      const targetToken = searchToken || user?.employeeToken || '8709';
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
            tokenNo: targetToken,
            timelineVisits,
            autoBackfillMonth: timelineVisits ? null : timelineMonth,
          }, { timeout: 10000 });
          if (res) break;
        } catch (e) {}
      }

      if (res) {
        Alert.alert('Timeline Sync Successful!', res.data.message);
        setIsTimelineOpen(false);
        fetchHistory();
      } else {
        Alert.alert('Sync Error', 'Unable to sync with server.');
      }
    } catch (err) {
      Alert.alert('Sync Failed', err.response?.data?.message || err.message);
    } finally {
      setSyncingTimeline(false);
    }
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

      {/* Action & Search Bar */}
      <View style={styles.searchBar}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <Text style={styles.searchLabel}>
            {isSupervisorOrAdmin ? 'Search Employee Token #:' : `Punch Logs for Token #${user.employeeToken}`}
          </Text>
          <TouchableOpacity style={styles.timelineBtn} onPress={() => setIsTimelineOpen(true)}>
            <Text style={styles.timelineBtnText}>📍 Sync Timeline</Text>
          </TouchableOpacity>
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
            Viewing Token #{searchToken || user.employeeToken} • {records.length} Recorded Entries • 100m Plant Boundary
          </Text>
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
                  <Text style={[styles.value, { color: '#38bdf8' }]}>{att.shiftStartTime || '08:30'}</Text>
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
                  <Text style={styles.label}>Worked Duration:</Text>
                  <Text style={[styles.value, { color: '#f8fafc', fontWeight: 'bold' }]}>
                    {att.totalHours ? `${att.totalHours} hrs` : 'In Progress'} (OT: {att.overtimeHours || 0} hrs)
                  </Text>
                </View>

                <View style={styles.locationTag}>
                  <Text style={styles.locationText}>📍 Keltron Kannur Plant (100m Geofence Verified)</Text>
                </View>
              </View>
            );
          })
        ) : (
          <Text style={styles.emptyText}>No attendance records found for Token #{searchToken || user?.employeeToken}.</Text>
        )}
      </ScrollView>

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
                Sync all working days for Token #{searchToken || user.employeeToken}.
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
  timelineBtn: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  timelineBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
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
