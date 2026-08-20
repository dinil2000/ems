import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { ShieldAlert, UserCheck, UserPlus, Key, CheckCircle, XCircle, Shield } from 'lucide-react';

const AdminPage = () => {
  const { user, API_BASE } = useContext(AuthContext);
  const [pendingEmps, setPendingEmps] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  // Token-Only Supervisor Appointment State
  const [supTokenNo, setSupTokenNo] = useState('');

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [pendingRes, empRes] = await Promise.all([
        axios.get(`${API_BASE}/employees/pending`),
        axios.get(`${API_BASE}/employees?status=Active`)
      ]);
      setPendingEmps(pendingRes.data);
      setAllUsers(empRes.data);
    } catch (err) {
      console.error('Error loading admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleApprove = async (id, tokenNo, name) => {
    setMessage('');
    try {
      const res = await axios.post(`${API_BASE}/employees/approve/${id}`, {
        approvedBy: user?.employeeToken || 'SiteAdmin'
      });
      setMessage(`✅ ${res.data.message}`);
      loadAdminData();
    } catch (err) {
      setMessage(`❌ Failed: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleReject = async (id) => {
    setMessage('');
    try {
      const res = await axios.post(`${API_BASE}/employees/reject/${id}`);
      setMessage(`❌ ${res.data.message}`);
      loadAdminData();
    } catch (err) {
      setMessage(`❌ Failed: ${err.response?.data?.message || err.message}`);
    }
  };

  // Appoint Supervisor by ONLY providing Token Number!
  const handleCreateSupervisor = async (e) => {
    e.preventDefault();
    if (!supTokenNo) {
      setMessage('❌ Please enter or select an Employee Token Number.');
      return;
    }
    setMessage('');
    try {
      const res = await axios.post(`${API_BASE}/auth/create-supervisor`, { tokenNo: supTokenNo });
      setMessage(`✅ ${res.data.message}`);
      setSupTokenNo('');
      loadAdminData();
    } catch (err) {
      setMessage(`❌ Failed: ${err.response?.data?.message || err.message}`);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem 1rem' }}>
      {/* Site Admin Header Banner */}
      <div style={{
        display: 'flex',
        justify: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        backgroundColor: '#0f172a',
        padding: '1.5rem',
        borderRadius: '12px',
        border: '2px solid #6366f1'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <ShieldAlert style={{ color: '#818cf8' }} size={32} />
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
              Site Admin Master Operations Control Portal (/admin)
            </h1>
            <p style={{ fontSize: '0.85rem', color: '#818cf8', margin: '0.2rem 0 0 0' }}>
              Full Control • Appoint Supervisors by Token # • Approve Pending Registrations
            </p>
          </div>
        </div>

        <span className="badge badge-indigo" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
          Role: UNIQUE SITE ADMIN
        </span>
      </div>

      {message && (
        <div style={{
          backgroundColor: message.includes('✅') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
          color: message.includes('✅') ? '#34d399' : '#f87171',
          border: message.includes('✅') ? '1px solid #10b981' : '1px solid #f43f5e',
          padding: '0.8rem 1rem',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          fontSize: '0.9rem'
        }}>
          {message}
        </div>
      )}

      {/* Main Grid: Pending Approvals & Appoint Supervisor */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.5rem' }}>
        {/* Left Column: Pending Employee Approvals & Roster */}
        <div>
          <div className="card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid #f59e0b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <UserCheck style={{ color: '#f59e0b' }} size={22} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                  Pending Public Registrations ({pendingEmps.length})
                </h3>
              </div>
              <span className="badge badge-amber">Awaiting Activation</span>
            </div>

            {loading ? (
              <p style={{ color: '#94a3b8', padding: '1.5rem', textAlign: 'center' }}>Loading pending registrations...</p>
            ) : pendingEmps.length > 0 ? (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Token #</th>
                      <th>Name</th>
                      <th>Type / Qualification</th>
                      <th>Machine Expertise</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingEmps.map(emp => (
                      <tr key={emp._id}>
                        <td><strong>#{emp.tokenNo}</strong></td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{emp.name}</div>
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{emp.gender}</div>
                        </td>
                        <td>{emp.employmentType} ({emp.qualification})</td>
                        <td>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.2rem' }}>
                            {emp.machineExpertise && emp.machineExpertise.map((m, idx) => (
                              <span key={idx} className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>
                                #{m}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.35rem' }}>
                            <button
                              onClick={() => handleApprove(emp._id, emp.tokenNo, emp.name)}
                              className="btn btn-success"
                              style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
                            >
                              <CheckCircle size={14} /> Approve
                            </button>
                            <button
                              onClick={() => handleReject(emp._id)}
                              className="btn btn-danger"
                              style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
                            >
                              <XCircle size={14} /> Deactivate
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: '#94a3b8', padding: '1.5rem', textAlign: 'center', fontSize: '0.9rem' }}>
                🎉 No pending employee registrations! All registered accounts are activated.
              </p>
            )}
          </div>

          {/* Active Employee Roster */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Active Staff & Machine Allocations</h3>
            <div className="table-container" style={{ maxHeight: '300px', overflowY: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Token #</th>
                    <th>Name</th>
                    <th>Qualification</th>
                    <th>Monthly Pay</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {allUsers.map(emp => (
                    <tr key={emp._id}>
                      <td><strong>#{emp.tokenNo}</strong></td>
                      <td>{emp.name}</td>
                      <td>{emp.qualification} ({emp.experienceYears} yrs)</td>
                      <td style={{ color: '#34d399', fontWeight: 600 }}>₹{emp.basicSalary?.toLocaleString('en-IN')}</td>
                      <td><span className="badge badge-emerald">{emp.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Token-Only Appoint Supervisor Form */}
        <div>
          <div className="card" style={{ borderLeft: '4px solid #6366f1' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Key style={{ color: '#818cf8' }} size={22} />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>Appoint Supervisor Account</h3>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '1.25rem' }}>
              Enter or select an <strong>Employee Token Number</strong> to promote them to Supervisor:
            </p>

            <form onSubmit={handleCreateSupervisor}>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Employee Token Number *</label>
                <input
                  type="text"
                  placeholder="e.g. 8709 or 8356"
                  value={supTokenNo}
                  onChange={(e) => setSupTokenNo(e.target.value)}
                  className="form-input"
                  style={{ fontSize: '1.05rem', fontWeight: 700, color: '#38bdf8' }}
                  required
                />
              </div>

              {/* Quick Select Buttons from Active Staff */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                  Quick Select Token from Active Staff:
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.4rem', maxHeight: '100px', overflowY: 'auto' }}>
                  {allUsers.slice(0, 10).map(e => (
                    <button
                      key={e._id}
                      type="button"
                      onClick={() => setSupTokenNo(e.tokenNo)}
                      className="badge badge-cyan"
                      style={{ cursor: 'pointer', border: supTokenNo === e.tokenNo ? '1px solid #38bdf8' : 'none' }}
                    >
                      #{e.tokenNo} ({e.name.split(' ')[0]})
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.75rem', fontSize: '0.95rem' }}>
                <UserPlus size={18} /> Appoint as Supervisor
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
