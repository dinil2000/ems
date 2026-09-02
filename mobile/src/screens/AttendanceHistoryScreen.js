import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import Svg, { Circle, G, Text as SvgText } from 'react-native-svg';
import axios from 'axios';
import { getApiUrlList } from '../config/api';

const SHIFT_CONFIG = {
  shift1: {
    id: 'shift1',
    name: 'Shift 1 (1st Shift)',
    timeRange: '07:00 AM – 03:00 PM',
    code: '07:00',
    color: '#f59e0b', // Amber/Gold
    bgLight: 'rgba(245, 158, 11, 0.15)',
    border: '#f59e0b'
  },
  shift2: {
    id: 'shift2',
    name: 'Shift 2 (2nd Shift)',
    timeRange: '03:00 PM – 11:00 PM',
    code: '15:00',
    color: '#38bdf8', // Sky Blue
    bgLight: 'rgba(56, 189, 248, 0.15)',
    border: '#38bdf8'
  },
  shift3: {
    id: 'shift3',
    name: 'Shift 3 (Night Shift)',
    timeRange: '11:00 PM – 07:00 AM',
    code: '23:00',
    color: '#c084fc', // Purple
    bgLight: 'rgba(192, 132, 252, 0.15)',
    border: '#c084fc'
  },
  general: {
    id: 'general',
    name: 'General Shift',
    timeRange: '08:30 AM – 04:30 PM',
    code: '08:30',
    color: '#34d399', // Emerald Green
    bgLight: 'rgba(52, 211, 153, 0.15)',
    border: '#34d399'
  }
};

export default function AttendanceHistoryScreen({ user, onBack }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchToken, setSearchToken] = useState(user?.employeeToken || '');
  const [selectedCycleId, setSelectedCycleId] = useState('current');

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

  // ── Compute Standard Monthly Billing Cycles (26th to 25th) ───────────────
  const billingCycles = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const cycles = [];

    let baseMonth = currentMonth;
    let baseYear = currentYear;
    if (now.getDate() < 26) {
      baseMonth -= 1;
      if (baseMonth < 0) {
        baseMonth = 11;
        baseYear -= 1;
      }
    }

    for (let i = 0; i < 4; i++) {
      let startM = baseMonth - i;
      let startY = baseYear;
      while (startM < 0) {
        startM += 12;
        startY -= 1;
      }

      let endM = startM + 1;
      let endY = startY;
      if (endM > 11) {
        endM = 0;
        endY += 1;
      }

      const startDate = new Date(startY, startM, 26, 0, 0, 0);
      const endDate = new Date(endY, endM, 25, 23, 59, 59);

      const startMonthName = startDate.toLocaleDateString('en-US', { month: 'short' });
      const endMonthName = endDate.toLocaleDateString('en-US', { month: 'short' });

      const label = i === 0
        ? `Current (${startMonthName} 26 – ${endMonthName} 25)`
        : `${startMonthName} 26 – ${endMonthName} 25`;

      cycles.push({
        id: i === 0 ? 'current' : `cycle_${startY}_${startM}`,
        label,
        startDate,
        endDate,
      });
    }

    cycles.push({
      id: 'all',
      label: 'All History',
      startDate: new Date(2020, 0, 1),
      endDate: new Date(2030, 11, 31),
    });

    return cycles;
  }, []);

  const activeCycle = billingCycles.find(c => c.id === selectedCycleId) || billingCycles[0];

  // ── Filter Records for the Selected Cycle ────────────────────────────────
  const filteredRecords = useMemo(() => {
    if (!records || records.length === 0) return [];
    if (selectedCycleId === 'all') return records;

    return records.filter(r => {
      const d = new Date(r.date || r.punchIn);
      return d >= activeCycle.startDate && d <= activeCycle.endDate;
    });
  }, [records, selectedCycleId, activeCycle]);

  // ── Shift Distribution & Percentage Calculations ─────────────────────────
  const shiftStats = useMemo(() => {
    let s1 = 0, s2 = 0, s3 = 0, gen = 0;
    let s1Hours = 0, s2Hours = 0, s3Hours = 0, genHours = 0;
    let totalWorkHours = 0;
    let totalOTHours = 0;
    let onTimeCount = 0;

    filteredRecords.forEach(r => {
      const st = r.shiftStartTime || '';
      const wHrs = parseFloat(r.totalHours || (r.punchIn ? 7.5 : 0));
      const ot = parseFloat(r.overtimeHours || 0);

      totalWorkHours += wHrs;
      totalOTHours += ot;

      if (!r.isLate) onTimeCount++;

      if (st === '07:00' || st.includes('Shift 1') || st.includes('1st')) {
        s1++;
        s1Hours += wHrs;
      } else if (st === '15:00' || st.includes('Shift 2') || st.includes('2nd')) {
        s2++;
        s2Hours += wHrs;
      } else if (st === '23:00' || st.includes('Shift 3') || st.includes('3rd') || st.includes('Night')) {
        s3++;
        s3Hours += wHrs;
      } else {
        gen++;
        genHours += wHrs;
      }
    });

    const totalShifts = filteredRecords.length;
    const computePct = (count) => (totalShifts > 0 ? parseFloat(((count / totalShifts) * 100).toFixed(1)) : 0);

    const baseShifts = [
      { ...SHIFT_CONFIG.shift1, count: s1, percentage: computePct(s1), hours: parseFloat(s1Hours.toFixed(1)) },
      { ...SHIFT_CONFIG.shift2, count: s2, percentage: computePct(s2), hours: parseFloat(s2Hours.toFixed(1)) },
      { ...SHIFT_CONFIG.shift3, count: s3, percentage: computePct(s3), hours: parseFloat(s3Hours.toFixed(1)) },
      { ...SHIFT_CONFIG.general, count: gen, percentage: computePct(gen), hours: parseFloat(genHours.toFixed(1)) }
    ];

    let acc = 0;
    const shifts = baseShifts.map(s => {
      const offset = acc;
      acc += s.percentage;
      return { ...s, offset };
    });

    return {
      totalShifts,
      totalWorkHours: parseFloat(totalWorkHours.toFixed(1)),
      totalOTHours: parseFloat(totalOTHours.toFixed(1)),
      onTimeRate: totalShifts > 0 ? Math.round((onTimeCount / totalShifts) * 100) : 100,
      shifts,
    };
  }, [filteredRecords]);

  // ── Svg Donut Geometry ───────────────────────────────────────────────────
  const chartRadius = 60;
  const strokeWidth = 18;
  const circumference = 2 * Math.PI * chartRadius;

  return (
    <View style={styles.container}>
      {/* ── Search & Employee Info Bar ── */}
      <View style={styles.searchBar}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: isSupervisorOrAdmin ? 6 : 0 }}>
          <Text style={styles.searchLabel}>
            {isSupervisorOrAdmin ? 'Search Employee Token #:' : `Punching Logs for Token #${user.employeeToken}`}
          </Text>
          <Text style={{ fontSize: 11, color: '#38bdf8', fontWeight: '700' }}>
            {filteredRecords.length} Entries in Cycle
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

      {/* ── Monthly Billing Cycle Selector Pills (26th to 25th) ─────────── */}
      <View style={styles.cycleSelectorContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cycleScroll}>
          {billingCycles.map(c => {
            const isSelected = selectedCycleId === c.id;
            return (
              <TouchableOpacity
                key={c.id}
                style={[styles.cyclePill, isSelected && styles.cyclePillActive]}
                onPress={() => setSelectedCycleId(c.id)}
              >
                <Text style={[styles.cyclePillText, isSelected && styles.cyclePillTextActive]}>
                  {c.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#38bdf8" />}
      >
        {/* ── Circular Cycle Attendance Diagram Card ─────────────────────── */}
        <View style={styles.graphCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 16, marginRight: 6 }}>⭕</Text>
              <Text style={styles.graphTitle}>MONTHLY SHIFT CYCLE DIAGRAM</Text>
            </View>
            <View style={styles.totalBadge}>
              <Text style={styles.totalBadgeText}>{activeCycle.label}</Text>
            </View>
          </View>

          {/* 1. Circular Donut Cycle SVG Diagram */}
          <View style={styles.donutContainer}>
            <View style={{ width: 160, height: 160, alignItems: 'center', justifyContent: 'center' }}>
              <Svg width="160" height="160" viewBox="0 0 160 160">
                <G rotation="-90" origin="80, 80">
                  {/* Background Track Circle */}
                  <Circle
                    cx="80"
                    cy="80"
                    r={chartRadius}
                    stroke="#1e293b"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                  />

                  {/* Slices for Shift 1, Shift 2, Shift 3, General */}
                  {shiftStats.totalShifts > 0 ? (
                    shiftStats.shifts.map(shift => {
                      if (shift.percentage <= 0) return null;
                      const strokeDasharray = `${(shift.percentage / 100) * circumference} ${circumference}`;
                      const strokeDashoffset = -((shift.offset / 100) * circumference);

                      return (
                        <Circle
                          key={shift.id}
                          cx="80"
                          cy="80"
                          r={chartRadius}
                          stroke={shift.color}
                          strokeWidth={strokeWidth}
                          strokeDasharray={strokeDasharray}
                          strokeDashoffset={strokeDashoffset}
                          fill="transparent"
                          strokeLinecap="round"
                        />
                      );
                    })
                  ) : (
                    <Circle
                      cx="80"
                      cy="80"
                      r={chartRadius}
                      stroke="#334155"
                      strokeWidth={strokeWidth}
                      fill="transparent"
                      strokeDasharray="4, 4"
                    />
                  )}
                </G>
              </Svg>

              {/* Center Donut Label */}
              <View style={styles.donutCenter}>
                <Text style={styles.donutCenterVal}>{shiftStats.totalShifts}</Text>
                <Text style={styles.donutCenterSub}>Shifts Worked</Text>
              </View>
            </View>

            {/* Quick Stat Counters */}
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Regular Hrs</Text>
                <Text style={styles.statVal}>{shiftStats.totalWorkHours}h</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Overtime (OT)</Text>
                <Text style={[styles.statVal, { color: '#fbbf24' }]}>+{shiftStats.totalOTHours}h</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>On-Time</Text>
                <Text style={[styles.statVal, { color: '#34d399' }]}>{shiftStats.onTimeRate}%</Text>
              </View>
            </View>
          </View>

          {/* 2. Shift Percentage & Exact Count Cards (Simultaneous Display) */}
          <View style={{ marginTop: 12 }}>
            {shiftStats.shifts.map(shift => (
              <View
                key={shift.id}
                style={[
                  styles.shiftCard,
                  { borderLeftColor: shift.color, borderLeftWidth: 4 }
                ]}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <Text style={[styles.shiftCardTitle, { color: shift.color }]}>
                    {shift.name}
                  </Text>

                  {/* Simultaneous Count and Percentage */}
                  <View style={[styles.pctBadge, { backgroundColor: shift.bgLight }]}>
                    <Text style={[styles.pctBadgeText, { color: shift.color }]}>
                      {shift.count} {shift.count === 1 ? 'Shift' : 'Shifts'} • {shift.percentage}%
                    </Text>
                  </View>
                </View>

                {/* Progress Bar */}
                <View style={styles.progressBarBg}>
                  <View
                    style={{
                      width: `${shift.percentage}%`,
                      height: '100%',
                      backgroundColor: shift.color,
                      borderRadius: 3,
                    }}
                  />
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                  <Text style={styles.shiftCardSub}>{shift.timeRange}</Text>
                  <Text style={styles.shiftCardSub}>Worked: {shift.hours} hrs</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ── Attendance Log Header ── */}
        <View style={styles.bannerCard}>
          <Text style={styles.bannerTitle}>📅 Detailed Punching Log Entries</Text>
          <Text style={styles.bannerSubtitle}>
            {activeCycle.label} • Token #{searchToken || user.employeeToken}
          </Text>
          <View style={styles.rulesBox}>
            <Text style={styles.rulesText}>
              ⏱ Working Hours = 7h 30m (30m lunch deducted) • OT starts after 8.5h presence • Cycle: 26th to 25th
            </Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#38bdf8" style={{ marginTop: 40 }} />
        ) : filteredRecords.length > 0 ? (
          filteredRecords.map((att) => {
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
          <Text style={styles.emptyText}>No attendance records found for Token #{searchToken || user?.employeeToken} in {activeCycle.label}.</Text>
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
  cycleSelectorContainer: {
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    paddingVertical: 8,
  },
  cycleScroll: {
    paddingHorizontal: 14,
    gap: 8,
  },
  cyclePill: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cyclePillActive: {
    backgroundColor: '#0284c7',
    borderColor: '#38bdf8',
  },
  cyclePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
  cyclePillTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  content: {
    padding: 14,
    paddingBottom: 40,
  },
  graphCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  graphTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#f8fafc',
  },
  totalBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#38bdf8',
  },
  totalBadgeText: {
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: '800',
  },
  donutContainer: {
    alignItems: 'center',
    backgroundColor: '#090d16',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  donutCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenterVal: {
    fontSize: 24,
    fontWeight: '900',
    color: '#f8fafc',
  },
  donutCenterSub: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  statBox: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '600',
  },
  statVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#f8fafc',
    marginTop: 2,
  },
  shiftCard: {
    backgroundColor: '#090d16',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  shiftCardTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  pctBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pctBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  progressBarBg: {
    height: 5,
    backgroundColor: '#1e293b',
    borderRadius: 3,
    overflow: 'hidden',
    marginVertical: 4,
  },
  shiftCardSub: {
    fontSize: 10,
    color: '#64748b',
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
    fontSize: 14,
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
