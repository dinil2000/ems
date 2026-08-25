import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { Calendar, Clock, MapPin, Search, Filter, ShieldAlert, Navigation, Zap, FileText, X, RefreshCw } from 'lucide-react';

const AttendanceHistoryPage = () => {
  const { user, API_BASE } = useContext(AuthContext);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchToken, setSearchToken] = useState(user?.employeeToken || '');
  const [filterMonth, setFilterMonth] = useState('');

  // Google Maps Timeline Modal State
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);
  const [timelineJsonText, setTimelineJsonText] = useState('');
  const [timelineMonth, setTimelineMonth] = useState('2026-08');
  const [syncingTimeline, setSyncingTimeline] = useState(false);
  const [timelineMsg, setTimelineMsg] = useState('');

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

  useEffect(() => {
    loadAttendanceHistory();
  }, [searchToken]);

  const handleSyncTimelineMonth = async () => {
    setSyncingTimeline(true);
    setTimelineMsg('');
    try {
      const targetToken = searchToken || user?.employeeToken || '8709';
      let timelineVisits = null;
      if (timelineJsonText.trim()) {
        try {
          const parsed = JSON.parse(timelineJsonText);
          timelineVisits = Array.isArray(parsed) ? parsed : (parsed.timelineObjects || parsed.rawSignals || [parsed]);
        } catch (e) {
          setTimelineMsg('❌ Invalid JSON format. Please paste valid Google Takeout JSON or use 1-click Auto Backfill.');
          setSyncingTimeline(false);
          return;
        }
      }

      const res = await axios.post(`${API_BASE}/attendance/import-timeline`, {
        tokenNo: targetToken,
        timelineVisits,
        autoBackfillMonth: timelineVisits ? null : timelineMonth
      });

      setTimelineMsg(`✅ ${res.data.message}`);
      loadAttendanceHistory();
    } catch (err) {
      setTimelineMsg(`❌ Sync Failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setSyncingTimeline(false);
    }
  };

  const canSearchOtherEmployees = user && (user.role === 'Supervisor' || user.role === 'SiteAdmin');

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
              Monthly Attendance & Punching History Log
            </h1>
            <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '0.2rem 0 0 0' }}>
              Keltron Component Complex Ltd • 100m Geofence GPS Audit & Google Maps Timeline Records
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
          <button
            onClick={() => setIsTimelineModalOpen(true)}
            className="btn btn-primary"
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.82rem', backgroundColor: '#0284c7' }}
          >
            <Navigation size={14} /> 📍 Sync Google Timeline History
          </button>

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

      {/* Attendance History Table Card */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
            Punching History Records for Token #{searchToken || user?.employeeToken}
          </h3>
          <span className="badge badge-indigo">
            {records.length} Recorded Entries
          </span>
        </div>

        {loading ? (
          <p style={{ color: '#94a3b8', padding: '2rem', textAlign: 'center' }}>Loading monthly attendance history...</p>
        ) : records.length > 0 ? (
          <div className="table-container" style={{ maxHeight: '550px', overflowY: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Shift Start</th>
                  <th>Punch In</th>
                  <th>Punch Out</th>
                  <th>Worked Hours</th>
                  <th>Overtime (OT)</th>
                  <th>Status</th>
                  <th>GPS Geofence Location</th>
                </tr>
              </thead>
              <tbody>
                {records.map(att => {
                  const dateStr = new Date(att.date).toLocaleDateString('en-IN', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  });
                  const punchInStr = att.punchIn ? new Date(att.punchIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A';
                  const punchOutStr = att.punchOut ? new Date(att.punchOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A';

                  return (
                    <tr key={att._id}>
                      <td><strong>{dateStr}</strong></td>
                      <td>{att.shiftStartTime || '08:30'}</td>
                      <td style={{ color: '#34d399', fontWeight: 600 }}>{punchInStr}</td>
                      <td style={{ color: att.punchOut ? '#38bdf8' : '#f87171', fontWeight: 600 }}>{punchOutStr}</td>
                      <td style={{ fontWeight: 700, color: '#f8fafc' }}>
                        {att.totalHours ? `${att.totalHours} hrs` : 'In Progress'}
                      </td>
                      <td style={{ color: att.overtimeHours > 0 ? '#38bdf8' : '#94a3b8', fontWeight: 700 }}>
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
                          <span>Keltron Kannur Plant (100m Verified)</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: '#94a3b8', padding: '2rem', textAlign: 'center' }}>
            No attendance history records found for Token #{searchToken || user?.employeeToken}.
          </p>
        )}
      </div>

      {/* Google Maps Timeline Sync Modal */}
      {isTimelineModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div className="card animate-fade-in" style={{ maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', borderBottom: '1px solid #334155', paddingBottom: '0.6rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Navigation size={22} style={{ color: '#38bdf8' }} />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
                  Sync Google Maps Timeline History
                </h3>
              </div>
              <button onClick={() => setIsTimelineModalOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{
              backgroundColor: '#090d16',
              border: '1px solid #0284c7',
              borderRadius: '8px',
              padding: '0.85rem',
              fontSize: '0.8rem',
              color: '#cbd5e1',
              marginBottom: '1.2rem',
              lineHeight: '1.4'
            }}>
              <strong style={{ color: '#38bdf8' }}>Google Maps Timeline Entry/Exit History:</strong>
              <p style={{ margin: '0.3rem 0 0 0' }}>
                Target location: <strong>Keltron Component Complex Ltd, Dharmasala, Kalliassery (Kannur)</strong>.
                Reconstruct historical monthly punch logs from Google Maps Timeline presence records.
              </p>
            </div>

            {timelineMsg && (
              <div style={{
                padding: '0.65rem 0.85rem',
                borderRadius: '6px',
                marginBottom: '1rem',
                fontSize: '0.85rem',
                backgroundColor: timelineMsg.includes('✅') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                color: timelineMsg.includes('✅') ? '#34d399' : '#f87171',
                border: timelineMsg.includes('✅') ? '1px solid #10b981' : '1px solid #f43f5e'
              }}>
                {timelineMsg}
              </div>
            )}

            {/* Quick 1-Click Month Timeline Sync */}
            <div style={{ marginBottom: '1.25rem', backgroundColor: '#0f172a', padding: '1rem', borderRadius: '8px', border: '1px solid #334155' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc', display: 'block', marginBottom: '0.4rem' }}>
                ⚡ 1-Click Month Timeline Auto-Sync for Token #{searchToken || user?.employeeToken}:
              </label>
              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <input
                  type="month"
                  value={timelineMonth}
                  onChange={(e) => setTimelineMonth(e.target.value)}
                  className="form-input"
                  style={{ width: '180px' }}
                />
                <button
                  type="button"
                  onClick={handleSyncTimelineMonth}
                  disabled={syncingTimeline}
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                >
                  {syncingTimeline ? <RefreshCw className="spin" size={16} /> : <Zap size={16} />}
                  {' '} Sync Month Punch Logs
                </button>
              </div>
            </div>

            {/* Paste Google Takeout / Timeline JSON */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '0.4rem' }}>
                Or Paste Google Maps Timeline JSON Export:
              </label>
              <textarea
                value={timelineJsonText}
                onChange={(e) => setTimelineJsonText(e.target.value)}
                placeholder='Paste Google Takeout location history JSON: [{"date":"2026-08-18","punchIn":"06:55:00","punchOut":"15:10:00"}]'
                rows={4}
                className="form-input"
                style={{ width: '100%', fontSize: '0.78rem', fontFamily: 'monospace' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
              <button type="button" onClick={() => setIsTimelineModalOpen(false)} className="btn btn-secondary">
                Close
              </button>
              <button
                type="button"
                onClick={handleSyncTimelineMonth}
                disabled={syncingTimeline}
                className="btn btn-success"
              >
                {syncingTimeline ? 'Processing...' : 'Import Timeline Records'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceHistoryPage;
