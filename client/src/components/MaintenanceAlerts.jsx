import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { AlertTriangle, Wrench, CheckCircle2, Clock, ShieldAlert } from 'lucide-react';

const MaintenanceAlerts = () => {
  const { user, API_BASE } = useContext(AuthContext);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/maintenance`);
      setAlerts(res.data);
    } catch (err) {
      console.error('Error fetching maintenance alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleMarkCompleted = async (id) => {
    setMessage('');
    try {
      const res = await axios.post(`${API_BASE}/maintenance/complete/${id}`);
      setMessage(`✅ ${res.data.message}`);
      fetchAlerts();
    } catch (err) {
      setMessage(`❌ Failed: ${err.response?.data?.message || err.message}`);
    }
  };

  return (
    <div>
      <div style={{
        display: 'flex',
        justify: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        backgroundColor: '#1e293b',
        padding: '1.25rem 1.5rem',
        borderRadius: '12px',
        border: '1px solid #334155'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Wrench style={{ color: '#f59e0b' }} size={24} />
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>MPP Machine Maintenance & Cleaning Alert System</h2>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0.2rem 0 0 0' }}>
              Automated Cron Alerts: <strong>Metalizing Central Cleaning (Every 2 Weeks)</strong> & <strong>General Cleaning (Every 1 Month)</strong>
            </p>
          </div>
        </div>
      </div>

      {message && (
        <div style={{
          backgroundColor: 'rgba(16, 185, 129, 0.15)',
          color: '#34d399',
          border: '1px solid #10b981',
          padding: '0.75rem 1rem',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          fontSize: '0.9rem'
        }}>
          {message}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
          <Clock className="animate-spin" size={32} />
          <p style={{ marginTop: '0.75rem' }}>Scanning MPP Section machine cleaning schedules...</p>
        </div>
      ) : alerts.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {alerts.map((alert) => {
            const isOverdue = alert.status === 'Overdue';
            const isMetalizing = alert.machineCategory === 'Metalizing';

            return (
              <div
                key={alert._id}
                className="card card-hover"
                style={{
                  borderLeft: isOverdue ? '4px solid #f43f5e' : (isMetalizing ? '4px solid #f59e0b' : '4px solid #06b6d4'),
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div>
                    <span className={isOverdue ? 'badge badge-rose' : 'badge badge-amber'}>
                      {isOverdue ? <AlertTriangle size={12} /> : <Clock size={12} />}
                      {alert.status}
                    </span>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: '0.4rem', color: '#f8fafc' }}>
                      Machine #{alert.machineId}
                    </h3>
                  </div>
                  <span className="badge badge-cyan">{alert.machineCategory}</span>
                </div>

                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#38bdf8', marginBottom: '0.5rem' }}>
                  {alert.alertType}
                </div>

                <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: '0.75rem', lineHeight: '1.4' }}>
                  {alert.notes || 'Routine cleaning and maintenance check mandatory.'}
                </div>

                <div style={{
                  fontSize: '0.78rem',
                  backgroundColor: '#0f172a',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  marginBottom: '1rem',
                  display: 'flex',
                  justify: 'space-between'
                }}>
                  <span>Due Date: <strong>{new Date(alert.nextDueDate).toLocaleDateString()}</strong></span>
                  <span>Frequency: <strong>Every {alert.frequencyDays} Days</strong></span>
                </div>

                {user?.role === 'Supervisor' && (
                  <button
                    onClick={() => handleMarkCompleted(alert._id)}
                    className="btn btn-success"
                    style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem' }}
                  >
                    <CheckCircle2 size={16} /> Mark Cleaning Completed
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <CheckCircle2 size={40} style={{ color: '#10b981', margin: '0 auto 1rem auto' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>All MPP Machines Clean & Operational</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.3rem' }}>
            No pending 2-week Metalizing central cleaning or 1-month General cleaning alerts.
          </p>
        </div>
      )}
    </div>
  );
};

export default MaintenanceAlerts;
