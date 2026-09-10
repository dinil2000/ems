import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import OfficialKeltronPayslip from './OfficialKeltronPayslip';
import SalaryDeductionManager from '../pages/SalaryDeductionManager';
import {
  User,
  FileText,
  DollarSign,
  Calendar,
  X,
  Edit3,
  Save,
  CheckCircle,
  Clock,
  Briefcase,
  Cpu,
  Shield,
  Layers,
  MapPin,
  AlertCircle
} from 'lucide-react';

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

const EmployeeProfileModal = ({ isOpen, onClose, employee, tokenNo, onEmployeeUpdated }) => {
  const { user, API_BASE } = useContext(AuthContext);
  const isSiteAdmin = user?.role === 'SiteAdmin';

  const [activeTab, setActiveTab] = useState('profile'); // 'profile', 'payslip', 'deductions', 'attendance'
  const [empData, setEmpData] = useState(null);
  const [loadingEmp, setLoadingEmp] = useState(false);

  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
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
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // Attendance History State
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  // Load employee profile details
  const loadEmployeeDetails = async () => {
    const targetToken = employee?.tokenNo || tokenNo || employee?.employeeToken;
    if (!targetToken) return;

    if (employee && employee.name) {
      setEmpData(employee);
      initEditForm(employee);
    }

    setLoadingEmp(true);
    try {
      const res = await axios.get(`${API_BASE}/employees/${targetToken}`);
      if (res.data) {
        setEmpData(res.data);
        initEditForm(res.data);
      }
    } catch (err) {
      console.error('Failed to load employee details:', err);
    } finally {
      setLoadingEmp(false);
    }
  };

  const initEditForm = (data) => {
    setEditForm({
      name: data.name || '',
      employmentType: data.employmentType || 'Permanent',
      qualification: data.qualification || 'ITI',
      experienceYears: data.experienceYears || 0,
      basicSalary: data.basicSalary || 0,
      dailyRate: data.dailyRate || 825.94,
      gender: data.gender || 'Male',
      unit: data.unit || 'Unit 2',
      machineExpertise: data.machineExpertise || []
    });
  };

  // Load attendance logs
  const loadAttendance = async () => {
    const targetToken = empData?.tokenNo || employee?.tokenNo || tokenNo || employee?.employeeToken;
    if (!targetToken) return;
    setLoadingAttendance(true);
    try {
      const res = await axios.get(`${API_BASE}/attendance/employee/${targetToken}?limit=30`);
      setAttendanceLogs(res.data || []);
    } catch (err) {
      console.error('Error fetching employee attendance:', err);
    } finally {
      setLoadingAttendance(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setIsEditing(false);
      setFeedbackMsg('');
      loadEmployeeDetails();
    }
  }, [isOpen, employee, tokenNo]);

  useEffect(() => {
    if (isOpen && activeTab === 'attendance') {
      loadAttendance();
    }
  }, [activeTab, isOpen, empData]);

  if (!isOpen) return null;

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

  const handleSaveEdits = async (e) => {
    e.preventDefault();
    if (!empData) return;
    setSavingEdit(true);
    setFeedbackMsg('');
    try {
      const res = await axios.put(`${API_BASE}/employees/${empData._id || empData.tokenNo}`, editForm);
      setFeedbackMsg(`✅ ${res.data.message || 'Profile updated successfully!'}`);
      setEmpData(prev => ({ ...prev, ...editForm }));
      setIsEditing(false);
      if (onEmployeeUpdated) onEmployeeUpdated();
    } catch (err) {
      setFeedbackMsg(`❌ Failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setSavingEdit(false);
    }
  };

  const curToken = empData?.tokenNo || tokenNo || employee?.tokenNo || employee?.employeeToken || '';
  const curName = empData?.name || employee?.name || `Employee #${curToken}`;
  const curRole = empData?.role || employee?.role || 'Employee';

  return (
    <div className="modal-overlay" style={{ zIndex: 1200 }}>
      <div
        className="modal-content animate-fade-in"
        style={{
          maxWidth: '920px',
          width: '95%',
          maxHeight: '92vh',
          padding: '1.75rem',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#0f172a',
          border: '1px solid #334155'
        }}
      >
        {/* Header Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingBottom: '1rem',
          borderBottom: '1px solid #334155',
          marginBottom: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '10px',
              backgroundColor: '#1e293b',
              border: '2px solid #38bdf8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#38bdf8',
              fontWeight: 800,
              fontSize: '1.1rem'
            }}>
              #{curToken}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
                  {curName}
                </h2>
                <span className={`badge ${
                  curRole === 'SiteAdmin' ? 'badge-indigo' : curRole === 'Supervisor' ? 'badge-cyan' : 'badge-emerald'
                }`}>
                  {curRole}
                </span>
                <span className="badge badge-amber">Token #{curToken}</span>
              </div>
              <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '0.2rem 0 0 0' }}>
                Keltron Component Complex Limited • MPP Section Workforce Dossier
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '0.4rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Tabs Bar */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1.25rem',
          backgroundColor: '#1e293b',
          padding: '0.35rem',
          borderRadius: '8px',
          border: '1px solid #334155',
          overflowX: 'auto'
        }}>
          <button
            onClick={() => setActiveTab('profile')}
            className={`btn ${activeTab === 'profile' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.84rem', padding: '0.45rem 0.9rem', flex: 1, whiteSpace: 'nowrap' }}
          >
            <User size={15} /> 👤 Profile & Credentials
          </button>

          <button
            onClick={() => setActiveTab('payslip')}
            className={`btn ${activeTab === 'payslip' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.84rem', padding: '0.45rem 0.9rem', flex: 1, whiteSpace: 'nowrap' }}
          >
            <FileText size={15} /> 🧾 Official Keltron Payslip
          </button>

          <button
            onClick={() => setActiveTab('deductions')}
            className={`btn ${activeTab === 'deductions' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.84rem', padding: '0.45rem 0.9rem', flex: 1, whiteSpace: 'nowrap' }}
          >
            <DollarSign size={15} /> ✏️ Salary Deductions
          </button>

          <button
            onClick={() => setActiveTab('attendance')}
            className={`btn ${activeTab === 'attendance' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.84rem', padding: '0.45rem 0.9rem', flex: 1, whiteSpace: 'nowrap' }}
          >
            <Calendar size={15} /> 📅 Punching & OT Logs
          </button>
        </div>

        {feedbackMsg && (
          <div style={{
            backgroundColor: feedbackMsg.includes('✅') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
            color: feedbackMsg.includes('✅') ? '#34d399' : '#f87171',
            border: feedbackMsg.includes('✅') ? '1px solid #10b981' : '1px solid #f43f5e',
            padding: '0.65rem 1rem',
            borderRadius: '8px',
            marginBottom: '1rem',
            fontSize: '0.85rem'
          }}>
            {feedbackMsg}
          </div>
        )}

        {/* Tab Content Body */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.25rem' }}>
          {/* TAB 1: PROFILE & CREDENTIALS */}
          {activeTab === 'profile' && (
            <div>
              {loadingEmp && !empData ? (
                <p style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>Loading profile details...</p>
              ) : isEditing ? (
                /* EDIT FORM */
                <form onSubmit={handleSaveEdits} className="card" style={{ backgroundColor: '#1e293b' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #334155', paddingBottom: '0.5rem' }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#38bdf8' }}>
                      Edit Staff Profile #{curToken}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="btn btn-secondary"
                      style={{ padding: '0.25rem 0.6rem', fontSize: '0.78rem' }}
                    >
                      Cancel Edit
                    </button>
                  </div>

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
                        className="form-select"
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
                        className="form-select"
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
                        onChange={(e) => setEditForm({ ...editForm, experienceYears: parseInt(e.target.value) || 0 })}
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
                        className="form-select"
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
                        className="form-select"
                        value={editForm.unit}
                        onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                      >
                        <option value="Unit 2">Unit 2 (MPP Section)</option>
                        <option value="Unit 1">Unit 1 (MPP Section)</option>
                      </select>
                    </div>
                  </div>

                  {/* Machine Expertise Selectors */}
                  <div style={{ marginBottom: '1.25rem', backgroundColor: '#090d16', padding: '1rem', borderRadius: '8px', border: '1px solid #334155' }}>
                    <label className="form-label" style={{ color: '#38bdf8', fontWeight: 700, marginBottom: '0.5rem' }}>
                      ⚙️ Machine Operational Expertise:
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', maxHeight: '140px', overflowY: 'auto' }}>
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
                    <button type="button" onClick={() => setIsEditing(false)} className="btn btn-secondary">
                      Cancel
                    </button>
                    <button type="submit" disabled={savingEdit} className="btn btn-success">
                      <Save size={15} /> {savingEdit ? 'Saving...' : 'Save Profile Changes'}
                    </button>
                  </div>
                </form>
              ) : (
                /* READ-ONLY DOSSIER VIEW */
                <div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                    {isSiteAdmin && (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="btn btn-primary"
                        style={{ fontSize: '0.82rem', padding: '0.4rem 0.8rem' }}
                      >
                        <Edit3 size={14} /> ✏️ Edit Details & Wages
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                    <div className="card" style={{ backgroundColor: '#1e293b' }}>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>IDENTIFICATION</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc', marginTop: '0.2rem' }}>
                        #{curToken}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#38bdf8', marginTop: '0.2rem' }}>
                        {empData?.employmentType || 'Permanent Staff'}
                      </div>
                    </div>

                    <div className="card" style={{ backgroundColor: '#1e293b' }}>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>QUALIFICATION & EXP</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc', marginTop: '0.2rem' }}>
                        {empData?.qualification || 'ITI'}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#34d399', marginTop: '0.2rem' }}>
                        {empData?.experienceYears || 0} Years Experience
                      </div>
                    </div>

                    <div className="card" style={{ backgroundColor: '#1e293b' }}>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>DAILY WAGE RATE</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#34d399', marginTop: '0.2rem' }}>
                        ₹{empData?.dailyRate ? parseFloat(empData.dailyRate).toFixed(2) : '825.94'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                        Official Keltron Daily Base
                      </div>
                    </div>

                    <div className="card" style={{ backgroundColor: '#1e293b' }}>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>MONTHLY SALARY BASE</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#38bdf8', marginTop: '0.2rem' }}>
                        ₹{empData?.basicSalary ? Number(empData.basicSalary).toLocaleString('en-IN') : '0'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                        Section: {empData?.unit || 'Unit 2'}
                      </div>
                    </div>
                  </div>

                  {/* Operational Capabilities & Machines */}
                  <div className="card" style={{ backgroundColor: '#1e293b', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <Cpu style={{ color: '#06b6d4' }} size={18} />
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>
                        Certified Machine Operational Expertise
                      </h4>
                    </div>
                    {empData?.machineExpertise && empData.machineExpertise.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        {empData.machineExpertise.map((m, idx) => (
                          <span
                            key={idx}
                            className="badge badge-cyan"
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}
                          >
                            Machine #{m}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>
                        No specific machines assigned yet.
                      </p>
                    )}
                  </div>

                  {/* Section & Account Metadata */}
                  <div className="card" style={{ backgroundColor: '#1e293b' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', fontSize: '0.85rem' }}>
                      <div>
                        <span style={{ color: '#94a3b8' }}>Gender: </span>
                        <strong>{empData?.gender || 'Male'}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#94a3b8' }}>Section / Plant: </span>
                        <strong>{empData?.unit || 'Unit 2 (MPP Section)'}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#94a3b8' }}>Account Status: </span>
                        <span className="badge badge-emerald">{empData?.status || 'Active'}</span>
                      </div>
                      <div>
                        <span style={{ color: '#94a3b8' }}>Registered Since: </span>
                        <strong>{empData?.createdAt ? new Date(empData.createdAt).toLocaleDateString() : 'N/A'}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: OFFICIAL KELTRON PAYSLIP TICKET */}
          {activeTab === 'payslip' && (
            <div>
              <OfficialKeltronPayslip
                tokenNoInput={curToken}
                onManageDeductions={() => setActiveTab('deductions')}
              />
            </div>
          )}

          {/* TAB 3: SALARY DEDUCTIONS MANAGER */}
          {activeTab === 'deductions' && (
            <div>
              <SalaryDeductionManager
                tokenNo={curToken}
                onSelectEmployeePayslip={() => setActiveTab('payslip')}
              />
            </div>
          )}

          {/* TAB 4: ATTENDANCE & PUNCHING LOGS */}
          {activeTab === 'attendance' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
                  Recent Attendance Logs for Token #{curToken} ({attendanceLogs.length} Records)
                </h4>
                <button
                  onClick={loadAttendance}
                  className="btn btn-secondary"
                  style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem' }}
                >
                  Refresh Logs
                </button>
              </div>

              {loadingAttendance ? (
                <p style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>Loading attendance records...</p>
              ) : attendanceLogs.length > 0 ? (
                <div className="table-container" style={{ maxHeight: '450px', overflowY: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Shift</th>
                        <th>Punch In</th>
                        <th>Punch Out</th>
                        <th>Hours</th>
                        <th>OT (hrs)</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceLogs.map(att => {
                        const dateStr = att.date ? new Date(att.date).toLocaleDateString('en-IN', {
                          weekday: 'short',
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        }) : 'N/A';

                        const inTime = att.punchIn ? new Date(att.punchIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
                        const outTime = att.punchOut ? new Date(att.punchOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'On Shift';

                        return (
                          <tr key={att._id}>
                            <td><strong>{dateStr}</strong></td>
                            <td>
                              <span className="badge badge-indigo" style={{ fontSize: '0.7rem' }}>
                                {att.shiftStartTime ? `Shift (${att.shiftStartTime})` : 'Shift'}
                              </span>
                            </td>
                            <td>{inTime}</td>
                            <td>{outTime}</td>
                            <td style={{ fontWeight: 600, color: '#38bdf8' }}>{att.totalHours || 0} hrs</td>
                            <td style={{ fontWeight: 600, color: (att.overtimeHours > 0) ? '#fbbf24' : '#94a3b8' }}>
                              {att.overtimeHours > 0 ? `+${att.overtimeHours} hrs` : '0 hrs'}
                            </td>
                            <td>
                              <span className={`badge ${
                                att.status === 'Present' ? 'badge-emerald' : att.status === 'Pending Late Approval' ? 'badge-rose' : 'badge-cyan'
                              }`} style={{ fontSize: '0.7rem' }}>
                                {att.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>
                  No attendance records found for this employee.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeProfileModal;
