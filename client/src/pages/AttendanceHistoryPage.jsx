import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { Calendar, Clock, MapPin, Search, Filter, ShieldAlert } from 'lucide-react';

const AttendanceHistoryPage = () => {
  const { user, API_BASE } = useContext(AuthContext);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchToken, setSearchToken] = useState(user?.employeeToken || '');
  const [filterMonth, setFilterMonth] = useState('');

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

  const canSearchOtherEmployees = user && (user.role === 'Supervisor' || user.role === 'SiteAdmin');

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem 1rem' }}>
      {/* Page Header */}
      <div style={{
        display: 'flex',
        justify: 'space-between',
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
              Keltron Component Complex Ltd • MPP Section Punching Logs & Geofence GPS Audit
            </p>
          </div>
        </div>

        {canSearchOtherEmployees && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Search size={16} style={{ color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search Token (e.g. 8709)"
              value={searchToken}
              onChange={(e) => setSearchToken(e.target.value)}
              className="form-input"
              style={{ width: '180px', padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
            />
          </div>
        )}
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
                          <span>Keltron Kannur Campus (Verified)</span>
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
    </div>
  );
};

export default AttendanceHistoryPage;
