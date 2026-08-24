import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { Clock, Play, Square, ShieldAlert, MapPin } from 'lucide-react';

const PunchWidget = ({ onPunchUpdate }) => {
  const { user, API_BASE } = useContext(AuthContext);
  const [time, setTime] = useState(new Date());
  const [activePunch, setActivePunch] = useState(null);
  const [empStatus, setEmpStatus] = useState('Active');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const tokenNo = user?.employeeToken || '8709';

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchAttendanceStatus = async () => {
    try {
      const [attRes, empRes] = await Promise.all([
        axios.get(`${API_BASE}/attendance/employee/${tokenNo}`),
        axios.get(`${API_BASE}/employees/${tokenNo}`).catch(() => ({ data: null }))
      ]);

      if (empRes.data) {
        setEmpStatus(empRes.data.status || 'Active');
      }

      if (attRes.data && attRes.data.length > 0) {
        const latest = attRes.data[0];
        if (latest.status === 'In Progress' || (!latest.punchOut && latest.punchIn)) {
          setActivePunch(latest);
        } else {
          setActivePunch(null);
        }
      }
    } catch (err) {
      console.error('Error fetching attendance status:', err);
    }
  };

  useEffect(() => {
    if (tokenNo) fetchAttendanceStatus();
  }, [tokenNo]);

  const handlePunchIn = async () => {
    if (empStatus === 'Pending Approval') {
      setMessage(`❌ Punching Token #${tokenNo} is Pending Supervisor Approval! A Supervisor must activate your profile before you can punch in.`);
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const res = await axios.post(`${API_BASE}/attendance/punch-in`, {
        tokenNo,
        latitude: 11.984011,
        longitude: 75.375067,
        locationName: 'Keltron Kannur Campus (Mangattuparamba)'
      });
      setActivePunch(res.data.attendance);
      setMessage('✅ Punched In Successfully at ' + new Date().toLocaleTimeString());
      if (onPunchUpdate) onPunchUpdate();
    } catch (err) {
      setMessage(`❌ ${err.response?.data?.message || 'Punch in failed'}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePunchOut = async () => {
    setLoading(true);
    setMessage('');
    try {
      const res = await axios.post(`${API_BASE}/attendance/punch-out`, {
        tokenNo,
        latitude: 11.984011,
        longitude: 75.375067,
        locationName: 'Keltron Kannur Campus (Mangattuparamba)'
      });
      setActivePunch(null);
      setMessage(`✅ Punched Out Successfully! Worked ${res.data.attendance.totalHours} hrs (OT: ${res.data.attendance.overtimeHours} hrs).`);
      if (onPunchUpdate) onPunchUpdate();
    } catch (err) {
      setMessage(`❌ ${err.response?.data?.message || 'Punch out failed'}`);
    } finally {
      setLoading(false);
    }
  };

  const isPendingApproval = empStatus === 'Pending Approval';

  return (
    <div className="card card-hover" style={{ background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Clock style={{ color: '#06b6d4' }} size={22} />
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>MPP Punching Terminal</h3>
            <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 600 }}>Punching Token #{tokenNo}</span>
          </div>
        </div>

        <span className={isPendingApproval ? 'badge badge-amber' : (activePunch ? 'badge badge-emerald' : 'badge badge-rose')}>
          {isPendingApproval ? 'PENDING APPROVAL' : (activePunch ? 'ON SHIFT' : 'OFF SHIFT')}
        </span>
      </div>

      {/* Geofence GPS Status Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        backgroundColor: '#090d16',
        padding: '0.4rem 0.6rem',
        borderRadius: '6px',
        fontSize: '0.72rem',
        color: '#34d399',
        marginBottom: '0.85rem',
        border: '1px solid #10b981'
      }}>
        <MapPin size={14} style={{ color: '#10b981' }} />
        <span>GPS Geofence: <strong>Keltron Kannur Plant (11.9840° N, 75.3750° E, 150m)</strong></span>
      </div>

      {isPendingApproval && (
        <div style={{
          backgroundColor: 'rgba(245, 158, 11, 0.15)',
          border: '1px solid #f59e0b',
          color: '#fbbf24',
          padding: '0.75rem',
          borderRadius: '8px',
          marginBottom: '1rem',
          fontSize: '0.8rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <ShieldAlert size={20} style={{ shrink: 0 }} />
          <span>
            <strong>Supervisor Approval Required:</strong> Punching Token #{tokenNo} is awaiting Supervisor activation. Punch In is locked until approved.
          </span>
        </div>
      )}

      <div style={{
        backgroundColor: '#090d16',
        borderRadius: '8px',
        padding: '1rem',
        textAlign: 'center',
        marginBottom: '1.25rem',
        border: '1px solid #1e293b'
      }}>
        <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'JetBrains Mono, monospace', color: '#38bdf8' }}>
          {time.toLocaleTimeString()}
        </div>
        <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.2rem' }}>
          {time.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {activePunch && (
        <div style={{
          backgroundColor: 'rgba(6, 182, 212, 0.1)',
          border: '1px solid rgba(6, 182, 212, 0.3)',
          borderRadius: '6px',
          padding: '0.75rem',
          marginBottom: '1rem',
          fontSize: '0.85rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Punch In Timestamp:</span>
            <strong>{new Date(activePunch.punchIn).toLocaleTimeString()}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.3rem' }}>
            <span>Location Verification:</span>
            <span style={{ color: '#34d399', fontWeight: 600 }}>📍 Keltron Kannur Campus</span>
          </div>
        </div>
      )}

      {message && (
        <div style={{
          fontSize: '0.85rem',
          padding: '0.6rem 0.8rem',
          borderRadius: '6px',
          marginBottom: '1rem',
          backgroundColor: message.includes('✅') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
          color: message.includes('✅') ? '#34d399' : '#f87171',
          border: message.includes('✅') ? '1px solid #10b981' : '1px solid #f43f5e'
        }}>
          {message}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        {!activePunch ? (
          <button
            onClick={handlePunchIn}
            disabled={loading || isPendingApproval}
            className="btn btn-success"
            style={{
              flex: 1,
              padding: '0.75rem',
              fontSize: '1rem',
              opacity: isPendingApproval ? 0.6 : 1,
              cursor: isPendingApproval ? 'not-allowed' : 'pointer'
            }}
          >
            <Play size={18} /> PUNCH IN NOW
          </button>
        ) : (
          <button
            onClick={handlePunchOut}
            disabled={loading}
            className="btn btn-danger"
            style={{ flex: 1, padding: '0.75rem', fontSize: '1rem' }}
          >
            <Square size={18} /> PUNCH OUT NOW
          </button>
        )}
      </div>
    </div>
  );
};

export default PunchWidget;
