import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { ShieldAlert, UserCheck, UserPlus, Key, CheckCircle, XCircle, UserMinus, Edit3, Save, X, Cpu } from 'lucide-react';

const availableMachinesList = [
  { id: '700,705', name: 'Winding 700/705', unit: 'Unit 2' },
  { id: '701', name: 'Winding 701', unit: 'Unit 2' },
  { id: '710', name: 'Testing 710', unit: 'Unit 2' },
  { id: '711', name: 'Testing 711', unit: 'Unit 2' },
  { id: '765(1)', name: 'Metalizing 765(1)', unit: 'Unit 2' },
  { id: '765(2)', name: 'Metalizing 765(2)', unit: 'Unit 2' },
  { id: '766', name: 'Metalizing 766', unit: 'Unit 2' },
  { id: '0450', name: 'Winding 0450', unit: 'Unit 1' },
  { id: '0460', name: 'Winding 0460', unit: 'Unit 1' },
  { id: '0480', name: 'Testing 0480', unit: 'Unit 1' },
  { id: '0470', name: 'Metalizing 0470', unit: 'Unit 1' },
];

const AdminPage = () => {
  const { user, API_BASE } = useContext(AuthContext);
  const [pendingEmps, setPendingEmps] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [userRolesList, setUserRolesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  // Token-Only Supervisor Appointment State
  const [supTokenNo, setSupTokenNo] = useState('');

  // Edit Employee Modal State
  const [editingEmp, setEditingEmp] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    employmentType: 'Permanent',
    qualification: 'ITI',
    experienceYears: 0,
    basicSalary: 0,
    dailyRate: 825.94,
    gender: 'Male',
    unit: 'Unit 2',
    machineExpertise: []
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [pendingRes, empRes, usersRes] = await Promise.all([
        axios.get(`${API_BASE}/employees/pending`),
        axios.get(`${API_BASE}/employees?status=Active`),
        axios.get(`${API_BASE}/auth/users`)
      ]);
      setPendingEmps(pendingRes.data);
      setAllUsers(empRes.data);
      setUserRolesList(usersRes.data);
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

  // Appoint / Promote Supervisor by Token Number
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

  // Demote Supervisor to Employee position
  const handleDemoteSupervisor = async (tokenNo) => {
    if (!window.confirm(`Are you sure you want to demote Supervisor (Token #${tokenNo}) to Employee position?`)) {
      return;
    }
    setMessage('');
    try {
      const res = await axios.post(`${API_BASE}/auth/demote-supervisor`, { tokenNo });
      setMessage(`✅ ${res.data.message}`);
      loadAdminData();
    } catch (err) {
      setMessage(`❌ Failed: ${err.response?.data?.message || err.message}`);
    }
  };

  // Open Edit Employee Modal
  const openEditModal = (empProfile) => {
    if (!empProfile) return;
    setEditingEmp(empProfile);
    setEditForm({
      name: empProfile.name || '',
      employmentType: empProfile.employmentType || 'Permanent',
      qualification: empProfile.qualification || 'ITI',
      experienceYears: empProfile.experienceYears || 0,
      basicSalary: empProfile.basicSalary || 0,
      dailyRate: empProfile.dailyRate || 825.94,
      gender: empProfile.gender || 'Male',
      unit: empProfile.unit || 'Unit 2',
      machineExpertise: empProfile.machineExpertise || []
    });
  };

  const handleMachineToggle = (machineId) => {
    setEditForm(prev => {
      const exists = prev.machineExpertise.includes(machineId);
      if (exists) {
        return { ...prev, machineExpertise: prev.machineExpertise.filter(m => m !== machineId) };
      } else {
        return { ...prev, machineExpertise: [...prev.machineExpertise, machineId] };
      }
    });
  };

  // Submit Employee Edits
  const handleSaveEmployeeEdits = async (e) => {
    e.preventDefault();
    if (!editingEmp) return;
    setSavingEdit(true);
    setMessage('');
    try {
      const res = await axios.put(`${API_BASE}/employees/${editingEmp._id}`, editForm);
      setMessage(`✅ ${res.data.message}`);
      setEditingEmp(null);
      loadAdminData();
    } catch (err) {
      setMessage(`❌ Update Failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setSavingEdit(false);
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
              Full Control • Edit Every Employee's Details & Machine Expertise • Promote & Demote Roles
            </p>
          </div>
        </div>

        <span className="badge badge-indigo" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
          Role: UNIQUE ROOT SITE ADMIN
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

          {/* Active Employee Roster & Role Control */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Registered Staff & Full Employee Details Control</h3>
            <div className="table-container" style={{ maxHeight: '420px', overflowY: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Token #</th>
                    <th>Name</th>
                    <th>Role Position</th>
                    <th>Machine Expertise</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {userRolesList.map(usr => (
                    <tr key={usr._id}>
                      <td><strong>#{usr.employeeToken}</strong></td>
                      <td>{usr.employeeProfile?.name || 'Site Admin'}</td>
                      <td>
                        <span className={`badge ${usr.role === 'SiteAdmin' ? 'badge-indigo' : usr.role === 'Supervisor' ? 'badge-cyan' : 'badge-emerald'}`}>
                          {usr.role}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.2rem' }}>
                          {usr.employeeProfile?.machineExpertise?.map((m, idx) => (
                            <span key={idx} className="badge badge-amber" style={{ fontSize: '0.65rem' }}>
                              #{m}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                          {usr.employeeProfile && (
                            <button
                              onClick={() => openEditModal(usr.employeeProfile)}
                              className="btn btn-secondary"
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem', backgroundColor: '#334155' }}
                            >
                              <Edit3 size={13} /> Edit Details
                            </button>
                          )}

                          {usr.role === 'Supervisor' ? (
                            <button
                              onClick={() => handleDemoteSupervisor(usr.employeeToken)}
                              className="btn btn-danger"
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem' }}
                            >
                              <UserMinus size={13} /> Demote to Employee
                            </button>
                          ) : usr.role === 'Employee' ? (
                            <button
                              onClick={() => {
                                setSupTokenNo(usr.employeeToken);
                                handleCreateSupervisor({ preventDefault: () => {} });
                              }}
                              className="btn btn-primary"
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem' }}
                            >
                              <UserPlus size={13} /> Promote to Supervisor
                            </button>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: '#818cf8', fontWeight: 700 }}>Master Root</span>
                          )}
                        </div>
                      </td>
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
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>Appoint / Promote Supervisor</h3>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '1.25rem' }}>
              Enter or select an <strong>Employee Token Number</strong> to promote them to Supervisor:
            </p>

            <form onSubmit={handleCreateSupervisor}>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Employee Token Number *</label>
                <input
                  type="text"
                  placeholder="e.g. 8709 or 3085"
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
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.4rem', maxHeight: '120px', overflowY: 'auto' }}>
                  {allUsers.slice(0, 15).map(e => (
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
                <UserPlus size={18} /> Promote to Supervisor
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* ✏️ EDIT EMPLOYEE DETAILS MODAL */}
      {editingEmp && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div className="card animate-fade-in" style={{ maxWidth: '650px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #334155', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Edit3 style={{ color: '#38bdf8' }} size={22} />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
                  Edit Details: #{editingEmp.tokenNo} ({editingEmp.name})
                </h3>
              </div>
              <button onClick={() => setEditingEmp(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEmployeeEdits}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Full Employee Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Employment Type *</label>
                  <select
                    className="form-input"
                    value={editForm.employmentType}
                    onChange={(e) => setEditForm({ ...editForm, employmentType: e.target.value })}
                  >
                    <option value="Permanent">Permanent</option>
                    <option value="Casual">Casual</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Qualification *</label>
                  <select
                    className="form-input"
                    value={editForm.qualification}
                    onChange={(e) => setEditForm({ ...editForm, qualification: e.target.value })}
                  >
                    <option value="ITI">ITI</option>
                    <option value="Diploma">Diploma</option>
                    <option value="BE/B.Tech">BE / B.Tech</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Exp (Yrs)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={editForm.experienceYears}
                    onChange={(e) => setEditForm({ ...editForm, experienceYears: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Daily Rate (₹/day) *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={editForm.dailyRate}
                    onChange={(e) => setEditForm({ ...editForm, dailyRate: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Monthly Base (₹)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={editForm.basicSalary}
                    onChange={(e) => setEditForm({ ...editForm, basicSalary: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div className="form-group">
                  <label className="form-label">Gender *</label>
                  <select
                    className="form-input"
                    value={editForm.gender}
                    onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Unit Section *</label>
                  <select
                    className="form-input"
                    value={editForm.unit}
                    onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                  >
                    <option value="Unit 2">Unit 2 (MPP Section)</option>
                    <option value="Unit 1">Unit 1 (MPP Section)</option>
                  </select>
                </div>
              </div>

              {/* Machine Expertise Selectors */}
              <div style={{ marginBottom: '1.5rem', backgroundColor: '#090d16', padding: '1rem', borderRadius: '8px', border: '1px solid #334155' }}>
                <label className="form-label" style={{ color: '#38bdf8', fontWeight: 700, marginBottom: '0.5rem' }}>
                  ⚙️ Machine Operational Expertise (Used during Auto-Shift Generation):
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', maxHeight: '150px', overflowY: 'auto' }}>
                  {availableMachinesList.map(m => {
                    const isChecked = editForm.machineExpertise.includes(m.id);
                    return (
                      <label
                        key={m.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          fontSize: '0.8rem',
                          color: isChecked ? '#38bdf8' : '#94a3b8',
                          cursor: 'pointer',
                          backgroundColor: isChecked ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
                          padding: '0.3rem 0.5rem',
                          borderRadius: '4px'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleMachineToggle(m.id)}
                        />
                        <span>#{m.id} ({m.name})</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setEditingEmp(null)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={savingEdit} className="btn btn-primary" style={{ backgroundColor: '#10b981' }}>
                  <Save size={16} /> {savingEdit ? 'Saving...' : 'Save Employee Edits'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
