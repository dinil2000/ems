import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import PunchWidget from '../components/PunchWidget';
import RegisterEmployeeModal from '../components/RegisterEmployeeModal';
import { Users, Cpu, Shield, UserPlus, Sparkles, AlertTriangle, UserCheck, CheckCircle, RefreshCw } from 'lucide-react';

const SupervisorDashboard = ({ setActiveTab }) => {
  const { user, API_BASE } = useContext(AuthContext);
  const [employees, setEmployees] = useState([]);
  const [pendingEmps, setPendingEmps] = useState([]);
  const [machines, setMachines] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [message, setMessage] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [empRes, pendingRes, machRes, alertRes] = await Promise.all([
        axios.get(`${API_BASE}/employees?status=Active`),
        axios.get(`${API_BASE}/employees/pending`),
        axios.get(`${API_BASE}/machines`),
        axios.get(`${API_BASE}/maintenance`)
      ]);
      setEmployees(empRes.data);
      setPendingEmps(pendingRes.data);
      setMachines(machRes.data);
      setAlerts(alertRes.data);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApprove = async (id, tokenNo, name) => {
    setMessage('');
    try {
      const res = await axios.post(`${API_BASE}/employees/approve/${id}`, {
        approvedBy: user?.employeeToken || 'Supervisor'
      });
      setMessage(`✅ ${res.data.message}`);
      loadData();
    } catch (err) {
      setMessage(`❌ Failed: ${err.response?.data?.message || err.message}`);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem 1rem' }}>
      {/* Header Banner */}
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
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Shield style={{ color: '#06b6d4' }} size={28} />
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
              Supervisor Operations Dashboard
            </h1>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '0.3rem 0 0 0' }}>
            Keltron Component Complex Limited • MPP Section Management
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={() => setIsRegisterOpen(true)} className="btn btn-primary">
            <UserPlus size={18} /> Register New Employee
          </button>
          <button onClick={() => setActiveTab('shifts')} className="btn btn-success">
            <Sparkles size={18} /> Generate Weekly Roster
          </button>
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

      {/* Overview Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>ACTIVE WORKFORCE</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f8fafc', marginTop: '0.2rem' }}>
                {employees.length}
              </div>
            </div>
            <Users style={{ color: '#38bdf8' }} size={32} />
          </div>
          <div style={{ fontSize: '0.75rem', color: '#34d399', marginTop: '0.5rem' }}>
            Permanent & Casual Active
          </div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>PENDING APPROVALS</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: pendingEmps.length > 0 ? '#fbbf24' : '#34d399', marginTop: '0.2rem' }}>
                {pendingEmps.length}
              </div>
            </div>
            <UserCheck style={{ color: pendingEmps.length > 0 ? '#f59e0b' : '#10b981' }} size={32} />
          </div>
          <div style={{ fontSize: '0.75rem', color: '#fbbf24', marginTop: '0.5rem' }}>
            Awaiting Supervisor Activation
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>MPP MACHINES</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f8fafc', marginTop: '0.2rem' }}>
                {machines.length}
              </div>
            </div>
            <Cpu style={{ color: '#06b6d4' }} size={32} />
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.5rem' }}>
            Winding (5), Testing (3), Metalizing (4)
          </div>
        </div>

        <div className="card" onClick={() => setActiveTab('maintenance')} style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>CLEANING ALERTS</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: alerts.length > 0 ? '#fbbf24' : '#34d399', marginTop: '0.2rem' }}>
                {alerts.length}
              </div>
            </div>
            <AlertTriangle style={{ color: alerts.length > 0 ? '#f59e0b' : '#10b981' }} size={32} />
          </div>
          <div style={{ fontSize: '0.75rem', color: '#fbbf24', marginTop: '0.5rem' }}>
            2-Wk Metalizing & 1-Mo General
          </div>
        </div>
      </div>

      {/* Pending Approvals Section */}
      {pendingEmps.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UserCheck style={{ color: '#f59e0b' }} size={22} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                New Employee Registrations Awaiting Approval ({pendingEmps.length})
              </h3>
            </div>
            <span className="badge badge-amber">Action Required</span>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Token #</th>
                  <th>Employee Name</th>
                  <th>Type / Qualification</th>
                  <th>Gender</th>
                  <th>Machine Expertise</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingEmps.map(emp => (
                  <tr key={emp._id}>
                    <td><strong>#{emp.tokenNo}</strong></td>
                    <td>{emp.name}</td>
                    <td>{emp.employmentType} ({emp.qualification})</td>
                    <td>{emp.gender}</td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                        {emp.machineExpertise && emp.machineExpertise.map((m, idx) => (
                          <span key={idx} className="badge badge-cyan" style={{ fontSize: '0.7rem' }}>
                            #{m}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <button
                        onClick={() => handleApprove(emp._id, emp.tokenNo, emp.name)}
                        className="btn btn-success"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                      >
                        <CheckCircle size={14} /> Approve & Activate Account
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Main Grid: Clock Punch Widget & Employee Table */}
      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '1.5rem' }}>
        <div>
          <PunchWidget onPunchUpdate={loadData} />
        </div>

        <div>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Active Workforce & Machine Expertise</h3>
              <button onClick={loadData} className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem' }}>
                <RefreshCw size={14} /> Refresh
              </button>
            </div>

            {loading ? (
              <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>Loading active roster...</p>
            ) : (
              <div className="table-container" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Token #</th>
                      <th>Employee Name</th>
                      <th>Qualification</th>
                      <th>Exp</th>
                      <th>Gender</th>
                      <th>Monthly Base</th>
                      <th>Machine Expertise</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map(emp => (
                      <tr key={emp._id}>
                        <td><strong>#{emp.tokenNo}</strong></td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{emp.name}</div>
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{emp.employmentType}</div>
                        </td>
                        <td>{emp.qualification}</td>
                        <td>{emp.experienceYears} yrs</td>
                        <td>
                          <span className={emp.gender === 'Female' ? 'badge badge-rose' : 'badge badge-cyan'}>
                            {emp.gender}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700, color: '#34d399' }}>
                          ₹{emp.basicSalary?.toLocaleString('en-IN')}
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                            {emp.machineExpertise && emp.machineExpertise.map((m, idx) => (
                              <span key={idx} className="badge badge-indigo" style={{ fontSize: '0.7rem' }}>
                                #{m}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      <RegisterEmployeeModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onSuccess={loadData}
      />
    </div>
  );
};

export default SupervisorDashboard;
