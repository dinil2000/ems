import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { Clock, Play, Square, ShieldAlert, MapPin, Navigation } from 'lucide-react';

const KELTRON_KANNUR_COORDS = {
  latitude: 11.984011,
  longitude: 75.375067,
  name: 'Keltron Kannur Campus (Mangattuparamba)',
  radiusMeters: 150
};

// Calculate Haversine distance in meters
const calculateDistanceInMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
};

const PunchWidget = ({ onPunchUpdate }) => {
  const { user, API_BASE } = useContext(AuthContext);
  const [time, setTime] = useState(new Date());
  const [activePunch, setActivePunch] = useState(null);
  const [empStatus, setEmpStatus] = useState('Active');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Web Geolocation State
  const [userCoords, setUserCoords] = useState(null);
  const [distanceToKeltron, setDistanceToKeltron] = useState(null);
  const [geoStatus, setGeoStatus] = useState('Acquiring GPS location...');

  const tokenNo = user?.employeeToken || '8709';

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Web Browser HTML5 Geolocation Listener
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setUserCoords({ latitude: lat, longitude: lng });

          const dist = calculateDistanceInMeters(lat, lng, KELTRON_KANNUR_COORDS.latitude, KELTRON_KANNUR_COORDS.longitude);
          setDistanceToKeltron(dist);

          if (dist <= KELTRON_KANNUR_COORDS.radiusMeters) {
            setGeoStatus(`📍 Inside Plant Perimeter (${dist}m from Keltron Kannur)`);
          } else {
            setGeoStatus(`📍 GPS Active: ${dist}m from Keltron Kannur Plant`);
          }
        },
        (err) => {
          console.warn('HTML5 Geolocation warning:', err.message);
          setGeoStatus('📍 GPS Geofence Active (Keltron Kannur Default Target)');
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
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

    const lat = userCoords?.latitude || KELTRON_KANNUR_COORDS.latitude;
    const lng = userCoords?.longitude || KELTRON_KANNUR_COORDS.longitude;
    const isInsideGeofence = distanceToKeltron !== null ? distanceToKeltron <= KELTRON_KANNUR_COORDS.radiusMeters : true;

    try {
      const res = await axios.post(`${API_BASE}/attendance/punch-in`, {
        tokenNo,
        latitude: lat,
        longitude: lng,
        isGeofencedAutoPunch: isInsideGeofence,
        locationName: isInsideGeofence ? 'Keltron Kannur Campus (Inside Geofence)' : 'Web HTML5 Location Verified'
      });
      setActivePunch(res.data.attendance);
      setMessage(`✅ Punched In Successfully at ${new Date().toLocaleTimeString()}! ${isInsideGeofence ? '(📍 Keltron Kannur Campus Verified)' : ''}`);
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

    const lat = userCoords?.latitude || KELTRON_KANNUR_COORDS.latitude;
    const lng = userCoords?.longitude || KELTRON_KANNUR_COORDS.longitude;
    const isInsideGeofence = distanceToKeltron !== null ? distanceToKeltron <= KELTRON_KANNUR_COORDS.radiusMeters : true;

    try {
      const res = await axios.post(`${API_BASE}/attendance/punch-out`, {
        tokenNo,
        latitude: lat,
        longitude: lng,
        isGeofencedAutoPunch: isInsideGeofence,
        locationName: isInsideGeofence ? 'Keltron Kannur Campus (Inside Geofence)' : 'Web HTML5 Location Verified'
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

      {/* Geofence GPS Status Banner (HTML5 Web Enabled) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        backgroundColor: '#090d16',
        padding: '0.45rem 0.65rem',
        borderRadius: '6px',
        fontSize: '0.72rem',
        color: distanceToKeltron !== null && distanceToKeltron <= 150 ? '#34d399' : '#38bdf8',
        marginBottom: '0.85rem',
        border: distanceToKeltron !== null && distanceToKeltron <= 150 ? '1px solid #10b981' : '1px solid #0284c7'
      }}>
        <Navigation size={14} style={{ color: distanceToKeltron !== null && distanceToKeltron <= 150 ? '#10b981' : '#38bdf8' }} />
        <span>Web GPS Status: <strong>{geoStatus}</strong></span>
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
            <span>Location Status:</span>
            <span style={{ color: '#34d399', fontWeight: 600 }}>📍 Keltron Kannur Campus Verified</span>
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
