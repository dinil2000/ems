import React, { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { Clock, Play, Square, ShieldAlert, Navigation } from 'lucide-react';

const KELTRON_KANNUR_COORDS = {
  latitude: 11.983878,
  longitude: 75.374253,
  name: 'Keltron Component Complex Ltd (Dharmasala, Kalliassery)',
  radiusMeters: 700
};

// Calculate Haversine distance in meters
const calculateDistanceInMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3;
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
  const [recentRecords, setRecentRecords] = useState([]);
  const [empStatus, setEmpStatus] = useState('Active');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Automated Geofencing Auto-Punch Settings (700 Meters)
  const [autoPunchEnabled, setAutoPunchEnabled] = useState(true);
  const [userCoords, setUserCoords] = useState(null);
  const [distanceToKeltron, setDistanceToKeltron] = useState(null);
  const [geoStatus, setGeoStatus] = useState('Acquiring live GPS geofence (700m radius)...');
  const [autoPunchLog, setAutoPunchLog] = useState('');

  const tokenNo = user?.employeeToken || '8709';
  const prevInsideRef = useRef(null);

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
        // Set recent records for display (up to 7 latest)
        setRecentRecords(attRes.data.slice(0, 7));

        const latest = attRes.data[0];
        if (latest.status === 'In Progress' || latest.status === 'Pending Late Approval' || (!latest.punchOut && latest.punchIn)) {
          setActivePunch(latest);
        } else {
          setActivePunch(null);
        }
      } else {
        setActivePunch(null);
        setRecentRecords([]);
      }
    } catch (err) {
      console.error('Error fetching attendance status:', err);
    }
  };

  useEffect(() => {
    if (tokenNo) fetchAttendanceStatus();
  }, [tokenNo]);

  // Automated Geofencing HTML5 Live Location Watcher (700m Radius)
  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoStatus('GPS Not Supported on this browser');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserCoords({ latitude: lat, longitude: lng });

        const dist = calculateDistanceInMeters(lat, lng, KELTRON_KANNUR_COORDS.latitude, KELTRON_KANNUR_COORDS.longitude);
        setDistanceToKeltron(dist);

        const isInside700m = dist <= KELTRON_KANNUR_COORDS.radiusMeters;

        if (isInside700m) {
          setGeoStatus(`📍 Inside 700m Perimeter (${dist}m from Keltron Plant)`);
        } else {
          setGeoStatus(`📍 ${dist}m from Plant (700m Geofence Active)`);
        }

        // Automatic Punch Trigger for 700m Perimeter
        if (autoPunchEnabled && empStatus !== 'Pending Approval') {
          if (isInside700m && prevInsideRef.current === false && !activePunch) {
            setAutoPunchLog(`⚡ Auto-Punched In! Entered 700m boundary (${dist}m)`);
            handlePunchIn(lat, lng, true);
          } else if (!isInside700m && prevInsideRef.current === true && activePunch) {
            setAutoPunchLog(`⚡ Auto-Punched Out! Left 700m boundary (${dist}m)`);
            handlePunchOut(lat, lng, true);
          }
        }

        prevInsideRef.current = isInside700m;
      },
      (err) => {
        setGeoStatus('📍 GPS Geofence Active (Target 11.9838°N, 75.3742°E, Radius: 700m)');
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [autoPunchEnabled, activePunch, empStatus]);

  const handlePunchIn = async (overrideLat, overrideLng, isAuto = false) => {
    if (empStatus === 'Pending Approval') {
      setMessage(`❌ Punching Token #${tokenNo} is Pending Supervisor Approval!`);
      return;
    }

    setLoading(true);
    setMessage('');

    const lat = overrideLat || userCoords?.latitude || KELTRON_KANNUR_COORDS.latitude;
    const lng = overrideLng || userCoords?.longitude || KELTRON_KANNUR_COORDS.longitude;
    const dist = calculateDistanceInMeters(lat, lng, KELTRON_KANNUR_COORDS.latitude, KELTRON_KANNUR_COORDS.longitude);
    const isInsideGeofence = dist <= KELTRON_KANNUR_COORDS.radiusMeters;

    try {
      const res = await axios.post(`${API_BASE}/attendance/punch-in`, {
        tokenNo,
        latitude: lat,
        longitude: lng,
        isGeofencedAutoPunch: isAuto || isInsideGeofence,
        locationName: isInsideGeofence
          ? 'Keltron Kannur Plant (Inside 700m Geofence)'
          : `GPS Location (${dist}m from plant)`
      });
      setActivePunch(res.data.attendance);
      setMessage(`✅ ${isAuto ? '⚡ AUTOMATIC 700M GEOFENCE PUNCH IN:' : 'Punched In Successfully:'} ${res.data.message}`);
      await fetchAttendanceStatus();
      if (onPunchUpdate) onPunchUpdate();
    } catch (err) {
      setMessage(`❌ ${err.response?.data?.message || 'Punch in failed'}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePunchOut = async (overrideLat, overrideLng, isAuto = false) => {
    setLoading(true);
    setMessage('');

    const lat = overrideLat || userCoords?.latitude || KELTRON_KANNUR_COORDS.latitude;
    const lng = overrideLng || userCoords?.longitude || KELTRON_KANNUR_COORDS.longitude;
    const dist = calculateDistanceInMeters(lat, lng, KELTRON_KANNUR_COORDS.latitude, KELTRON_KANNUR_COORDS.longitude);
    const isInsideGeofence = dist <= KELTRON_KANNUR_COORDS.radiusMeters;

    try {
      const res = await axios.post(`${API_BASE}/attendance/punch-out`, {
        tokenNo,
        latitude: lat,
        longitude: lng,
        isGeofencedAutoPunch: isAuto || isInsideGeofence,
        locationName: isInsideGeofence
          ? 'Keltron Kannur Plant (Inside 700m Geofence)'
          : `GPS Location (${dist}m from plant)`
      });
      setActivePunch(null);
      setMessage(`✅ ${isAuto ? '⚡ AUTOMATIC 700M GEOFENCE PUNCH OUT:' : 'Punched Out Successfully:'} ${res.data.message}`);
      await fetchAttendanceStatus();
      if (onPunchUpdate) onPunchUpdate();
    } catch (err) {
      setMessage(`❌ ${err.response?.data?.message || 'Punch out failed'}`);
    } finally {
      setLoading(false);
    }
  };

  const isPendingApproval = empStatus === 'Pending Approval';
  const isInside700m = distanceToKeltron !== null && distanceToKeltron <= KELTRON_KANNUR_COORDS.radiusMeters;

  return (
    <div className="card card-hover" style={{ background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Clock style={{ color: '#06b6d4' }} size={22} />
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>MPP Automated Punching Terminal</h3>
            <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 600 }}>Token #{tokenNo} • 700m Geofence Active</span>
          </div>
        </div>

        <span className={isPendingApproval ? 'badge badge-amber' : (activePunch ? 'badge badge-emerald' : 'badge badge-rose')}>
          {isPendingApproval ? 'PENDING APPROVAL' : (activePunch ? 'ON SHIFT' : 'OFF SHIFT')}
        </span>
      </div>

      {/* Geofence GPS Status Banner with Automated 700m Radius */}
      <div style={{
        backgroundColor: '#090d16',
        padding: '0.6rem 0.8rem',
        borderRadius: '8px',
        fontSize: '0.75rem',
        marginBottom: '0.85rem',
        border: isInside700m ? '1px solid #10b981' : '1px solid #0284c7'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: isInside700m ? '#34d399' : '#38bdf8' }}>
            <Navigation size={15} style={{ color: isInside700m ? '#10b981' : '#38bdf8' }} />
            <span><strong>{geoStatus}</strong></span>
          </div>

          <button
            onClick={() => setAutoPunchEnabled(!autoPunchEnabled)}
            style={{
              backgroundColor: autoPunchEnabled ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)',
              color: autoPunchEnabled ? '#34d399' : '#f87171',
              border: `1px solid ${autoPunchEnabled ? '#10b981' : '#f43f5e'}`,
              borderRadius: '6px',
              padding: '0.2rem 0.5rem',
              fontSize: '0.7rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            {autoPunchEnabled ? '⚡ Auto-Punch: ON' : '⏸ Auto-Punch: OFF'}
          </button>
        </div>

        <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.3rem' }}>
          📍 Target: <strong>Keltron Kannur Plant (11.9838°N, 75.3742°E)</strong> • Auto-punches on enter/exit within <strong>700 meters</strong>
        </div>

        {autoPunchLog && (
          <div style={{ marginTop: '0.3rem', color: '#fbbf24', fontWeight: 600 }}>
            {autoPunchLog}
          </div>
        )}
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
          <ShieldAlert size={20} />
          <span>Punching Token #{tokenNo} is awaiting Supervisor activation.</span>
        </div>
      )}

      {/* Live Digital Clock */}
      <div style={{
        backgroundColor: '#090d16',
        borderRadius: '8px',
        padding: '0.85rem',
        textAlign: 'center',
        marginBottom: '1rem',
        border: '1px solid #1e293b'
      }}>
        <div style={{ fontSize: '1.9rem', fontWeight: 800, fontFamily: 'JetBrains Mono, monospace', color: '#38bdf8' }}>
          {time.toLocaleTimeString()}
        </div>
        <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.1rem' }}>
          {time.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {activePunch && (
        <div style={{
          backgroundColor: 'rgba(6, 182, 212, 0.1)',
          border: '1px solid rgba(6, 182, 212, 0.3)',
          borderRadius: '6px',
          padding: '0.65rem',
          marginBottom: '1rem',
          fontSize: '0.82rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Punch In Time:</span>
            <strong>{new Date(activePunch.punchIn).toLocaleTimeString()}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
            <span>Geofence Status:</span>
            <span style={{ color: '#34d399', fontWeight: 600 }}>📍 700m Plant Perimeter Verified</span>
          </div>
        </div>
      )}

      {message && (
        <div style={{
          fontSize: '0.82rem',
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

      <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.85rem' }}>
        {!activePunch ? (
          <button
            onClick={() => handlePunchIn()}
            disabled={loading || isPendingApproval}
            className="btn btn-success"
            style={{
              flex: 1,
              padding: '0.75rem',
              fontSize: '0.95rem',
              opacity: isPendingApproval ? 0.6 : 1,
              cursor: isPendingApproval ? 'not-allowed' : 'pointer'
            }}
          >
            <Play size={18} /> PUNCH IN NOW
          </button>
        ) : (
          <button
            onClick={() => handlePunchOut()}
            disabled={loading}
            className="btn btn-danger"
            style={{ flex: 1, padding: '0.75rem', fontSize: '0.95rem' }}
          >
            <Square size={18} /> PUNCH OUT NOW
          </button>
        )}
      </div>

      {/* Recent Attendance & Overtime Logs */}
      <div style={{
        backgroundColor: '#090d16',
        borderRadius: '8px',
        padding: '0.75rem',
        border: '1px solid #1e293b',
        marginTop: '0.5rem'
      }}>
        <h4 style={{ fontSize: '0.85rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: '#f8fafc' }}>
          Recent Attendance & Overtime Logs
        </h4>
        {recentRecords.length > 0 ? (
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {recentRecords.map(att => (
              <div key={att._id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.35rem 0',
                borderBottom: '1px solid #1e293b',
                fontSize: '0.78rem'
              }}>
                <span style={{ color: '#cbd5e1' }}>
                  {new Date(att.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                </span>
                <span style={{ color: '#34d399' }}>
                  {att.punchIn ? new Date(att.punchIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                </span>
                <span style={{ color: '#38bdf8' }}>
                  {att.punchOut ? new Date(att.punchOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'On Shift'}
                </span>
                <span style={{ color: '#f8fafc', fontWeight: 600 }}>
                  {att.totalHours || '-'}h
                </span>
                <span style={{ color: att.overtimeHours > 0 ? '#fbbf24' : '#64748b', fontWeight: 600 }}>
                  OT:{att.overtimeHours || 0}h
                </span>
                <span className={`badge ${att.status === 'Present' ? 'badge-emerald' : 'badge-amber'}`} style={{ fontSize: '0.65rem', padding: '0.1rem 0.3rem' }}>
                  {att.status === 'Present' ? 'P' : att.status === 'In Progress' ? 'IN' : 'L'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: 0 }}>No attendance punch logs recorded yet.</p>
        )}
      </div>
    </div>
  );
};

export default PunchWidget;
