import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import OfficialKeltronPayslip from './OfficialKeltronPayslip';
import SalaryDeductionManager from '../pages/SalaryDeductionManager';
import { DollarSign, RefreshCw, CheckCircle2, FileText, Settings, Table } from 'lucide-react';

const PayrollTable = () => {
  const { user, API_BASE } = useContext(AuthContext);
  const [activeSubTab, setActiveSubTab] = useState('slip'); // 'slip', 'deductions', 'register'
  const [selectedTokenForSlip, setSelectedTokenForSlip] = useState(user?.employeeToken || '8356');

  const [payrollData, setPayrollData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [message, setMessage] = useState('');

  const fetchPayroll = async () => {
    setLoading(true);
    try {
      let endpoint = `${API_BASE}/payroll/month`;
      if (user?.role === 'Employee') {
        endpoint = `${API_BASE}/payroll/employee/${user.employeeToken}`;
      }
      const res = await axios.get(endpoint);
      setPayrollData(res.data);
    } catch (err) {
      console.error('Error fetching payroll:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayroll();
  }, [user]);

  const handleRecalculatePayroll = async () => {
    setCalculating(true);
    setMessage('');
    try {
      const res = await axios.post(`${API_BASE}/payroll/calculate`, {});
      setMessage(res.data.message);
      fetchPayroll();
    } catch (err) {
      setMessage(`❌ Failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setCalculating(false);
    }
  };

  return (
    <div>
      {/* Sub Navigation Bar */}
      <div style={{
        display: 'flex',
        justify: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        backgroundColor: '#1e293b',
        padding: '1rem 1.5rem',
        borderRadius: '12px',
        border: '1px solid #334155'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <DollarSign style={{ color: '#10b981' }} size={26} />
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
              Keltron Payroll & Salary Slip Center
            </h2>
            <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '0.1rem 0 0 0' }}>
              Official Thermal Pay Tickets • Canteen & PF Deductions Manager • Shift Allowances
            </p>
          </div>
        </div>

        {/* Sub-Tab Navigation Toggle */}
        <div style={{ display: 'flex', gap: '0.5rem', backgroundColor: '#0f172a', padding: '0.3rem', borderRadius: '8px' }}>
          <button
            className={`btn ${activeSubTab === 'slip' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveSubTab('slip')}
            style={{ fontSize: '0.82rem', padding: '0.4rem 0.8rem' }}
          >
            <FileText size={14} /> Authentic Keltron Slip
          </button>

          <button
            className={`btn ${activeSubTab === 'deductions' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveSubTab('deductions')}
            style={{ fontSize: '0.82rem', padding: '0.4rem 0.8rem' }}
          >
            <Settings size={14} /> ✏️ Edit My Deductions
          </button>

          <button
            className={`btn ${activeSubTab === 'register' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveSubTab('register')}
            style={{ fontSize: '0.82rem', padding: '0.4rem 0.8rem' }}
          >
            <Table size={14} /> Monthly Register
          </button>
        </div>
      </div>

      {/* Sub-Tab Content Rendering */}
      {activeSubTab === 'slip' && (
        <OfficialKeltronPayslip
          tokenNoInput={selectedTokenForSlip}
          onManageDeductions={() => setActiveSubTab('deductions')}
        />
      )}

      {activeSubTab === 'deductions' && (
        <SalaryDeductionManager
          onSelectEmployeePayslip={(token) => {
            setSelectedTokenForSlip(token);
            setActiveSubTab('slip');
          }}
        />
      )}

      {activeSubTab === 'register' && (
        <div>
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
              <RefreshCw className="animate-spin" size={32} />
              <p style={{ marginTop: '0.75rem' }}>Computing MPP Section Payroll Records...</p>
            </div>
          ) : payrollData.length > 0 ? (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Token #</th>
                    <th>Employee Name</th>
                    <th>Monthly Base</th>
                    <th>Daily Rate</th>
                    <th>Days Present</th>
                    <th>OT Hours</th>
                    <th>2x OT Pay</th>
                    <th>Gross Salary</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {payrollData.map((rec) => (
                    <tr key={rec._id}>
                      <td><strong>#{rec.tokenNo}</strong></td>
                      <td>{rec.employeeName}</td>
                      <td>₹{rec.basicMonthlySalary?.toLocaleString('en-IN')}</td>
                      <td>₹{rec.hourlyRate ? (rec.hourlyRate * 7.5).toFixed(2) : '825.94'}</td>
                      <td>{rec.totalDaysPresent} days</td>
                      <td style={{ color: rec.totalOvertimeHours > 0 ? '#fbbf24' : '#94a3b8', fontWeight: 600 }}>
                        {rec.totalOvertimeHours} hrs
                      </td>
                      <td style={{ color: '#34d399', fontWeight: 600 }}>
                        +₹{rec.overtimePay?.toLocaleString('en-IN')}
                      </td>
                      <td style={{ fontSize: '1rem', fontWeight: 800, color: '#38bdf8' }}>
                        ₹{rec.grossSalary?.toLocaleString('en-IN')}
                      </td>
                      <td>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
                          onClick={() => {
                            setSelectedTokenForSlip(rec.tokenNo);
                            setActiveSubTab('slip');
                          }}
                        >
                          View Slip 📄
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <p style={{ color: '#94a3b8' }}>No payroll records found for this billing cycle.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PayrollTable;
