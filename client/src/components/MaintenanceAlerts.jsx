import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { AlertTriangle, Wrench, CheckCircle2, Clock, ShieldCheck, XCircle, Send } from 'lucide-react';

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

  // Worker submits machine cleaning request to Supervisor
  const handleWorkerRequestCleaning = async (id) => {
    setMessage('');
    try {
      const tokenNo = user?.employeeToken || '8356';
      const name = user?.employeeProfile?.name || 'Operator';
      const res = await axios.post(`${API_BASE}/maintenance/request-completion/${id}`, {
        tokenNo,
        name
      });
      setMessage(`✅ ${res.data.message}`);
      fetchAlerts();
    } catch (err) {
      setMessage(`❌ Failed: ${err.response?.data?.message || err.message}`);
    }
  };

  // Supervisor approves worker machine cleaning request
  const handleSupervisorApproveCleaning = async (id) => {
    setMessage('');
    try {
      const supervisorToken = user?.employeeToken || '3085';
      const supervisorName = user?.employeeProfile?.name || 'Supervisor';
      const res = await axios.post(`${API_BASE}/maintenance/approve/${id}`, {
        supervisorToken,
        supervisorName
      });
      setMessage(`✅ ${res.data.message}`);
      fetchAlerts();
    } catch (err) {
      setMessage(`❌ Failed: ${err.response?.data?.message || err.message}`);
    }
  };

  // Supervisor rejects worker machine cleaning request
  const handleSupervisorRejectCleaning = async (id) => {
    setMessage('');
    try {
      const res = await axios.post(`${API_BASE}/maintenance/reject/${id}`);
      setMessage(`⚠️ ${res.data.message}`);
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
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>MPP Machine Cleaning & Supervisor Approval Portal</h2>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0.2rem 0 0 0' }}>
              Worker submits machine cleaning request • Supervisor verifies and approves cleaning completion
            </p>
          </div>
        </div>
      </div>

      {message && (
        <div style={{
          backgroundColor: message.includes('✅') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
          color: message.includes('✅') ? '#34d399' : '#f87171',
          border: message.includes('✅') ? '1px solid #10b981' : '1px solid #f43f5e',
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
            const isPendingApproval = alert.status === 'Pending Approval';
            const isMetalizing = alert.machineCategory === 'Metalizing';

            return (
              <div
                key={alert._id}
                className="card card-hover"
                style={{
                  borderLeft: isPendingApproval ? '4px solid #fbbf24' : (isOverdue ? '4px solid #f43f5e' : '4px solid #06b6d4'),
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div>
                    <span className={isPendingApproval ? 'badge badge-amber' : (isOverdue ? 'badge badge-rose' : 'badge badge-cyan')}>
                      {isPendingApproval ? <ShieldCheck size={12} /> : (isOverdue ? <AlertTriangle size={12} /> : <Clock size={12} />)}
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

                {alert.requestedBy?.name && (
                  <div style={{
                    fontSize: '0.78rem',
                    backgroundColor: 'rgba(245, 158, 11, 0.15)',
                    color: '#fbbf24',
                    padding: '0.4rem 0.6rem',
                    borderRadius: '6px',
                    marginBottom: '0.6rem'
                  }}>
                    Worker Request: <strong>Token #{alert.requestedBy.tokenNo} ({alert.requestedBy.name})</strong>
                  </div>
                )}

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

                {/* Worker View: Request Cleaning Button */}
                {user?.role === 'Employee' && (
                  <div>
                    {isPendingApproval ? (
                      <button disabled className="btn btn-secondary" style={{ width: '100%', opacity: 0.75 }}>
                        <ShieldCheck size={16} /> Request Sent (Awaiting Supervisor Approval)
                      </button>
                    ) : (
                      <button
                        onClick={() => handleWorkerRequestCleaning(alert._id)}
                        className="btn btn-primary"
                        style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem' }}
                      >
                        <Send size={16} /> Submit Cleaning Done Request to Supervisor
                      </button>
                    )}
                  </div>
                )}

                {/* Supervisor / SiteAdmin View: Approve or Reject Cleaning Request */}
                {(user?.role === 'Supervisor' || user?.role === 'SiteAdmin') && (
                  <div>
                    {isPendingApproval ? (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleSupervisorApproveCleaning(alert._id)}
                          className="btn btn-success"
                          style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem' }}
                        >
                          <CheckCircle2 size={16} /> Approve & Verify
                        </button>
                        <button
                          onClick={() => handleSupervisorRejectCleaning(alert._id)}
                          className="btn btn-danger"
                          style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
                        >
                          <XCircle size={16} /> Reject
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleSupervisorApproveCleaning(alert._id)}
                        className="btn btn-success"
                        style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem' }}
                      >
                        <CheckCircle2 size={16} /> Mark & Approve Cleaning Done
                      </button>
                    )}
                  </div>
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
