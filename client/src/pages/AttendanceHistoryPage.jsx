import React, { useState, useEffect, useContext, useMemo } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { Calendar, MapPin, Search, PieChart, Clock, Award, CheckCircle2, ChevronRight, Trash2 } from 'lucide-react';

const SHIFT_CONFIG = {
  shift1: {
    id: 'shift1',
    name: 'Shift 1 (1st Shift)',
    timeRange: '07:00 AM – 03:00 PM',
    code: '07:00',
    color: '#f59e0b', // Amber/Gold
    bgLight: 'rgba(245, 158, 11, 0.12)',
    border: '#f59e0b'
  },
  shift2: {
    id: 'shift2',
    name: 'Shift 2 (2nd Shift)',
    timeRange: '03:00 PM – 11:00 PM',
    code: '15:00',
    color: '#38bdf8', // Sky Blue
    bgLight: 'rgba(56, 189, 248, 0.12)',
    border: '#38bdf8'
  },
  shift3: {
    id: 'shift3',
    name: 'Shift 3 (Night Shift)',
    timeRange: '11:00 PM – 07:00 AM',
    code: '23:00',
    color: '#a855f7', // Purple
    bgLight: 'rgba(168, 85, 247, 0.12)',
    border: '#a855f7'
  },
  general: {
    id: 'general',
    name: 'General Shift',
    timeRange: '08:30 AM – 04:30 PM',
    code: '08:30',
    color: '#10b981', // Emerald Green
    bgLight: 'rgba(16, 185, 129, 0.12)',
    border: '#10b981'
  }
};

const AttendanceHistoryPage = () => {
  const { user, API_BASE } = useContext(AuthContext);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchToken, setSearchToken] = useState(user?.employeeToken || '');
  const [selectedCycleId, setSelectedCycleId] = useState('current');

  const loadAttendanceHistory = async () => {
    setLoading(true);
    try {
      const targetToken = searchToken || user?.employeeToken || '8709';
      const res = await axios.get(`${API_BASE}/attendance/employee/${targetToken}`);
      setRecords(res.data || []);
    } catch (err) {
      console.error('Error fetching attendance history:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRecord = async (id, dateStr) => {
    if (!window.confirm(`Are you sure you want to delete the attendance punch record for ${dateStr}? This will remove the punch and recalculate your cycle hours.`)) {
      return;
    }
    try {
      await axios.delete(`${API_BASE}/attendance/${id}`);
      setRecords(prev => prev.filter(r => r._id !== id));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete attendance record.');
    }
  };

  useEffect(() => {
    loadAttendanceHistory();
  }, [searchToken]);

  const canSearchOtherEmployees = user && (user.role === 'Supervisor' || user.role === 'SiteAdmin');

  // ── Compute Standard Monthly Billing Cycles (26th to 25th) ───────────────
  const billingCycles = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed

    const cycles = [];

    // Determine current cycle anchor
    // If today >= 26th, cycle is currentMonth 26th to nextMonth 25th
    // If today < 26th, cycle is prevMonth 26th to currentMonth 25th
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
        ? `Current Cycle (${startMonthName} 26 – ${endMonthName} 25, ${endY})`
        : `${startMonthName} 26 – ${endMonthName} 25, ${endY}`;

      cycles.push({
        id: i === 0 ? 'current' : `cycle_${startY}_${startM}`,
        label,
        startDate,
        endDate,
        isCurrent: i === 0
      });
    }

    cycles.push({
      id: 'all',
      label: 'All Time History',
      startDate: new Date(2020, 0, 1),
      endDate: new Date(2030, 11, 31),
      isCurrent: false
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
    let lateCount = 0;

    filteredRecords.forEach(r => {
      const st = r.shiftStartTime || '';
      const wHrs = parseFloat(r.totalHours || (r.punchIn ? 7.5 : 0));
      const ot = parseFloat(r.overtimeHours || 0);

      totalWorkHours += wHrs;
      totalOTHours += ot;

      if (r.isLate) lateCount++;
      else onTimeCount++;

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
      onTimeCount,
      lateCount,
      onTimeRate: totalShifts > 0 ? Math.round((onTimeCount / totalShifts) * 100) : 100,
      shifts
    };
  }, [filteredRecords]);

  // ── SVG Donut Chart Geometry ─────────────────────────────────────────────
  const radius = 68;
  const circumference = 2 * Math.PI * radius;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem 1rem' }}>
      {/* Page Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        backgroundColor: '#1e293b',
        padding: '1.5rem',
        borderRadius: '12px',
        border: '1px solid #334155'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <Calendar style={{ color: '#38bdf8' }} size={28} />
          <div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
              Monthly Attendance Cycle & Shift Analytics
            </h1>
            <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '0.2rem 0 0 0' }}>
              Keltron Component Complex Ltd • Dharmasala • 300m Geofence GPS Verified Records
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
          {canSearchOtherEmployees && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Search size={16} style={{ color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search Token (e.g. 8709)"
                value={searchToken}
                onChange={(e) => setSearchToken(e.target.value)}
                className="form-input"
                style={{ width: '160px', padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Monthly Billing Cycle Selector Bar (26th to 25th) ─────────────── */}
      <div style={{
        backgroundColor: '#0f172a',
        padding: '0.85rem 1rem',
        borderRadius: '10px',
        marginBottom: '1.5rem',
        border: '1px solid #1e293b',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Clock size={18} style={{ color: '#38bdf8' }} />
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc' }}>
            Select Billing Cycle (26th – 25th):
          </span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
          {billingCycles.map(c => {
            const isSelected = selectedCycleId === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedCycleId(c.id)}
                style={{
                  backgroundColor: isSelected ? '#0284c7' : '#1e293b',
                  color: isSelected ? '#ffffff' : '#94a3b8',
                  border: isSelected ? '1px solid #38bdf8' : '1px solid #334155',
                  padding: '0.4rem 0.75rem',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Cycle Graphical Representation & Shift Percentage Section ─────── */}
      <div className="card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <PieChart style={{ color: '#06b6d4' }} size={22} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
              Monthly Shift Breakdown & Graphical Cycle Representation
            </h3>
          </div>
          <span className="badge badge-indigo">
            Token #{searchToken || user?.employeeToken} • {activeCycle.label}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', alignItems: 'center' }}>
          
          {/* 1. Circular Donut Cycle Graph */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem', backgroundColor: '#090d16', borderRadius: '12px', border: '1px solid #1e293b' }}>
            <div style={{ position: 'relative', width: '180px', height: '180px' }}>
              <svg width="180" height="180" viewBox="0 0 180 180" style={{ transform: 'rotate(-90deg)' }}>
                {/* Background Ring */}
                <circle
                  cx="90"
                  cy="90"
                  r={radius}
                  fill="transparent"
                  stroke="#1e293b"
                  strokeWidth="20"
                />

                {/* Dynamic Shift Slices */}
                {shiftStats.totalShifts > 0 ? (
                  shiftStats.shifts.map(shift => {
                    if (shift.percentage <= 0) return null;
                    const strokeDasharray = `${(shift.percentage / 100) * circumference} ${circumference}`;
                    const strokeDashoffset = -((shift.offset / 100) * circumference);

                    return (
                      <circle
                        key={shift.id}
                        cx="90"
                        cy="90"
                        r={radius}
                        fill="transparent"
                        stroke={shift.color}
                        strokeWidth="20"
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        style={{ transition: 'stroke-dasharray 0.6s ease, stroke-dashoffset 0.6s ease' }}
                      />
                    );
                  })
                ) : (
                  <circle
                    cx="90"
                    cy="90"
                    r={radius}
                    fill="transparent"
                    stroke="#334155"
                    strokeWidth="20"
                    strokeDasharray="4 4"
                  />
                )}
              </svg>

              {/* Center Donut Stats */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none'
              }}>
                <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f8fafc', fontFamily: 'JetBrains Mono, monospace' }}>
                  {shiftStats.totalShifts}
                </span>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>
                  Total Shifts
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', fontSize: '0.75rem', color: '#94a3b8' }}>
              <span>⏱ Regular: <strong style={{ color: '#f8fafc' }}>{shiftStats.totalWorkHours}h</strong></span>
              <span>⭐ OT: <strong style={{ color: '#fbbf24' }}>+{shiftStats.totalOTHours}h</strong></span>
              <span>🎯 On-Time: <strong style={{ color: '#34d399' }}>{shiftStats.onTimeRate}%</strong></span>
            </div>
          </div>

          {/* 2. Shift Percentage & Exact Count Cards (Simultaneous Display) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {shiftStats.shifts.map(shift => (
              <div
                key={shift.id}
                style={{
                  backgroundColor: '#090d16',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  border: `1px solid ${shift.border}`,
                  borderLeft: `5px solid ${shift.color}`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: '0.88rem', color: shift.color }}>
                      {shift.name}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginLeft: '0.5rem' }}>
                      ({shift.timeRange})
                    </span>
                  </div>

                  {/* Simultaneous Count & Percentage Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{
                      backgroundColor: shift.bgLight,
                      color: shift.color,
                      padding: '0.2rem 0.55rem',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      fontFamily: 'JetBrains Mono, monospace'
                    }}>
                      {shift.count} {shift.count === 1 ? 'Shift' : 'Shifts'} • {shift.percentage}%
                    </span>
                  </div>
                </div>

                {/* Visual Progress Fill Bar */}
                <div style={{ width: '100%', height: '6px', backgroundColor: '#1e293b', borderRadius: '4px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${shift.percentage}%`,
                      height: '100%',
                      backgroundColor: shift.color,
                      borderRadius: '4px',
                      transition: 'width 0.6s ease-in-out'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b', marginTop: '0.3rem' }}>
                  <span>Recorded Code: <code>{shift.code}</code></span>
                  <span>Contribution: {shift.hours} hrs</span>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* Attendance History Table Card */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
              Punching History Records for Token #{searchToken || user?.employeeToken}
            </h3>
            <span style={{ fontSize: '0.78rem', color: '#38bdf8' }}>
              Showing {filteredRecords.length} entries for {activeCycle.label}
            </span>
          </div>
          <span className="badge badge-indigo">
            {filteredRecords.length} Entries in Cycle
          </span>
        </div>

        <div style={{
          backgroundColor: '#090d16',
          borderRadius: '6px',
          padding: '0.5rem 0.75rem',
          marginBottom: '1rem',
          fontSize: '0.78rem',
          color: '#94a3b8',
          border: '1px solid #1e293b'
        }}>
          ℹ️ Working Hours = 7h 30m (30min lunch deducted from 8hr shift) • OT starts after 8.5hrs presence (30min post-shift grace) • Billing Cycle: 26th prev month to 25th current month
        </div>

        {loading ? (
          <p style={{ color: '#94a3b8', padding: '2rem', textAlign: 'center' }}>Loading monthly attendance history...</p>
        ) : filteredRecords.length > 0 ? (
          <div className="table-container" style={{ maxHeight: '550px', overflowY: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Shift Start</th>
                  <th>Punch In</th>
                  <th>Punch Out</th>
                  <th>Working Hours</th>
                  <th>Overtime (OT)</th>
                  <th>Status</th>
                  <th>GPS Location</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map(att => {
                  const dateStr = new Date(att.date).toLocaleDateString('en-IN', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  });
                  const punchInStr = att.punchIn ? new Date(att.punchIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A';
                  const punchOutStr = att.punchOut ? new Date(att.punchOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A';

                  const formatShiftName = (st) => {
                    if (!st) return '08:30 (Gen)';
                    if (st === '07:00') return '07:00 (1st Shift)';
                    if (st === '15:00') return '15:00 (2nd Shift)';
                    if (st === '23:00') return '23:00 (3rd Shift)';
                    if (st === '08:30') return '08:30 (Gen Shift)';
                    return st;
                  };

                  return (
                    <tr key={att._id}>
                      <td><strong>{dateStr}</strong></td>
                      <td>
                        <span style={{ fontWeight: 600, color: '#38bdf8' }}>
                          {formatShiftName(att.shiftStartTime)}
                        </span>
                      </td>
                      <td style={{ color: '#34d399', fontWeight: 600 }}>{punchInStr}</td>
                      <td style={{ color: att.punchOut ? '#38bdf8' : '#f87171', fontWeight: 600 }}>{punchOutStr}</td>
                      <td style={{ fontWeight: 700, color: '#f8fafc' }}>
                        {att.totalHours ? `${att.totalHours} hrs` : 'In Progress'}
                      </td>
                      <td style={{ color: att.overtimeHours > 0 ? '#fbbf24' : '#94a3b8', fontWeight: 700 }}>
                        {att.overtimeHours > 0 ? `+${att.overtimeHours} hrs` : '0 hrs'}
                      </td>
                      <td>
                        <span className={`badge ${att.isLate ? 'badge-rose' : (att.punchOut ? 'badge-emerald' : 'badge-amber')}`}>
                          {att.isLate ? `LATE (${att.lateMinutes}m)` : (att.punchOut ? 'PRESENT' : 'ON SHIFT')}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', color: '#34d399' }}>
                          <MapPin size={13} style={{ color: '#10b981' }} />
                          <span>Keltron Kannur Plant (300m Verified)</span>
                        </div>
                      </td>
                      <td>
                        <button
                          onClick={() => handleDeleteRecord(att._id, dateStr)}
                          style={{
                            backgroundColor: 'rgba(244, 63, 94, 0.12)',
                            border: '1px solid #f43f5e',
                            color: '#f87171',
                            padding: '0.25rem 0.55rem',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            transition: 'all 0.2s'
                          }}
                          title="Delete accidental/unwanted punch"
                        >
                          <Trash2 size={13} />
                          <span>Delete</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: '#94a3b8', padding: '2rem', textAlign: 'center' }}>
            No attendance records found for Token #{searchToken || user?.employeeToken} in {activeCycle.label}.
          </p>
        )}
      </div>
    </div>
  );
};

export default AttendanceHistoryPage;
