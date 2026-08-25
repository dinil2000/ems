import React, { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { Clock, Play, Square, ShieldAlert, Navigation, Zap, Upload, FileText, CheckCircle, RefreshCw, X } from 'lucide-react';

const KELTRON_KANNUR_COORDS = {
  latitude: 11.983878,
  longitude: 75.374253,
  name: 'Keltron Component Complex Ltd (Dharmasala, Kalliassery)',
  radiusMeters: 100 // Exact 100-meter company perimeter as requested
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

  // Automated Geofencing Auto-Punch Settings
  const [autoPunchEnabled, setAutoPunchEnabled] = useState(true);
  const [userCoords, setUserCoords] = useState(null);
  const [distanceToKeltron, setDistanceToKeltron] = useState(null);
  const [geoStatus, setGeoStatus] = useState('Acquiring live GPS geofence...');
  const [autoPunchLog, setAutoPunchLog] = useState('');

  // Google Maps Timeline Importer Modal State
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);
  const [timelineJsonText, setTimelineJsonText] = useState('');
  const [timelineMonth, setTimelineMonth] = useState('2026-08');
  const [syncingTimeline, setSyncingTimeline] = useState(false);
  const [timelineMsg, setTimelineMsg] = useState('');

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

  // Automated Geofencing HTML5 Live Location Watcher
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

        const isInside100m = dist <= KELTRON_KANNUR_COORDS.radiusMeters;

        if (isInside100m) {
          setGeoStatus(`📍 Inside 100m Perimeter (${dist}m from Keltron Plant)`);
        } else {
          setGeoStatus(`📍 ${dist}m from Plant (100m Geofence Active)`);
        }

        // Automatic Punch Trigger
        if (autoPunchEnabled && empStatus !== 'Pending Approval') {
          // ENTER 100m perimeter -> Automatic Punch In
          if (isInside100m && prevInsideRef.current === false && !activePunch) {
            console.log('⚡ Entered 100m factory zone! Auto-punching in...');
            setAutoPunchLog(`⚡ Auto-Punched In! Entered 100m boundary (${dist}m)`);
            handlePunchIn(lat, lng, true);
          }
          // EXIT 100m perimeter -> Automatic Punch Out
          else if (!isInside100m && prevInsideRef.current === true && activePunch) {
            console.log('⚡ Exited 100m factory zone! Auto-punching out...');
            setAutoPunchLog(`⚡ Auto-Punched Out! Left 100m boundary (${dist}m)`);
            handlePunchOut(lat, lng, true);
          }
        }

        prevInsideRef.current = isInside100m;
      },
      (err) => {
        console.warn('Geolocation Watch Error:', err.message);
        setGeoStatus('📍 GPS Geofence Active (Target 11.9838°N, 75.3742°E)');
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
          ? 'Keltron Kannur Plant (Inside 100m Geofence)'
          : `GPS Location (${dist}m from plant)`
      });
      setActivePunch(res.data.attendance);
      setMessage(`✅ ${isAuto ? '⚡ AUTOMATIC GEOFENCE PUNCH IN:' : 'Punched In Successfully:'} ${res.data.message}`);
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
          ? 'Keltron Kannur Plant (Inside 100m Geofence)'
          : `GPS Location (${dist}m from plant)`
      });
      setActivePunch(null);
      setMessage(`✅ ${isAuto ? '⚡ AUTOMATIC GEOFENCE PUNCH OUT:' : 'Punched Out Successfully:'} ${res.data.message}`);
      if (onPunchUpdate) onPunchUpdate();
    } catch (err) {
      setMessage(`❌ ${err.response?.data?.message || 'Punch out failed'}`);
    } finally {
      setLoading(false);
    }
  };

  // Google Maps Timeline History Synchronization
  const handleSyncTimelineMonth = async () => {
    setSyncingTimeline(true);
    setTimelineMsg('');
    try {
      let timelineVisits = null;
      if (timelineJsonText.trim()) {
        try {
          const parsed = JSON.parse(timelineJsonText);
          timelineVisits = Array.isArray(parsed) ? parsed : (parsed.timelineObjects || parsed.rawSignals || [parsed]);
        } catch (e) {
          setTimelineMsg('❌ Invalid JSON format in Timeline box. Please paste valid Google Takeout JSON or use 1-click Auto Backfill.');
          setSyncingTimeline(false);
          return;
        }
      }

      const res = await axios.post(`${API_BASE}/attendance/import-timeline`, {
        tokenNo,
        timelineVisits,
        autoBackfillMonth: timelineVisits ? null : timelineMonth
      });

      setTimelineMsg(`✅ ${res.data.message}`);
      fetchAttendanceStatus();
      if (onPunchUpdate) onPunchUpdate();
    } catch (err) {
      setTimelineMsg(`❌ Sync Failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setSyncingTimeline(false);
    }
  };

  const isPendingApproval = empStatus === 'Pending Approval';
  const isInside100m = distanceToKeltron !== null && distanceToKeltron <= KELTRON_KANNUR_COORDS.radiusMeters;

  return (
    <div className="card card-hover" style={{ background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Clock style={{ color: '#06b6d4' }} size={22} />
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>MPP Automated Punching Terminal</h3>
            <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 600 }}>Token #{tokenNo} • 100m Geofence Active</span>
          </div>
        </div>

        <span className={isPendingApproval ? 'badge badge-amber' : (activePunch ? 'badge badge-emerald' : 'badge badge-rose')}>
          {isPendingApproval ? 'PENDING APPROVAL' : (activePunch ? 'ON SHIFT' : 'OFF SHIFT')}
        </span>
      </div>

      {/* Geofence GPS Status Banner with Automated 100m Radius */}
      <div style={{
        backgroundColor: '#090d16',
        padding: '0.6rem 0.8rem',
        borderRadius: '8px',
        fontSize: '0.75rem',
        marginBottom: '0.85rem',
        border: isInside100m ? '1px solid #10b981' : '1px solid #0284c7'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: isInside100m ? '#34d399' : '#38bdf8' }}>
            <Navigation size={15} style={{ color: isInside100m ? '#10b981' : '#38bdf8' }} />
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
          📍 Target: <strong>Keltron Kannur Plant (11.9838°N, 75.3742°E)</strong> • Auto-punches on enter/exit within <strong>100 meters</strong>
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
            <span style={{ color: '#34d399', fontWeight: 600 }}>📍 100m Plant Perimeter Verified</span>
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

      {/* Google Timeline History Sync Trigger Button */}
      <button
        onClick={() => setIsTimelineModalOpen(true)}
        className="btn btn-secondary"
        style={{ width: '100%', padding: '0.5rem', fontSize: '0.8rem', backgroundColor: '#1e293b', border: '1px solid #334155' }}
      >
        <FileText size={15} style={{ color: '#06b6d4' }} /> 📍 Sync Google Maps Timeline History
      </button>

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
              <strong style={{ color: '#38bdf8' }}>How Google Maps Timeline Sync Works:</strong>
              <p style={{ margin: '0.3rem 0 0 0' }}>
                Google Maps Timeline records your arrival and departure times when you visit <strong>Keltron Component Complex Ltd (Dharmasala, Kalliassery)</strong>. You can paste your Timeline JSON export or use 1-click monthly backfill to generate all past daily Punch In & Punch Out logs automatically.
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

            {/* Quick 1-Click Monthly Timeline Sync */}
            <div style={{ marginBottom: '1.25rem', backgroundColor: '#0f172a', padding: '1rem', borderRadius: '8px', border: '1px solid #334155' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc', display: 'block', marginBottom: '0.4rem' }}>
                ⚡ 1-Click Month Timeline Auto-Sync:
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
                  {' '} Sync Month Timeline Punch Logs
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
                placeholder='Paste Google Takeout location history JSON or visit objects: [{"date":"2026-08-18","punchIn":"06:55:00","punchOut":"15:10:00"}]'
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

export default PunchWidget;
