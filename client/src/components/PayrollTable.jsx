import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { DollarSign, RefreshCw, Calendar, CheckCircle2, TrendingUp } from 'lucide-react';

const PayrollTable = () => {
  const { user, API_BASE } = useContext(AuthContext);
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
      {/* Header & Controls */}
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
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <DollarSign style={{ color: '#10b981' }} size={24} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>MPP Section Payroll & Salary Engine</h2>
          </div>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0.2rem 0 0 0' }}>
            Billing Cycle: <strong>25th Previous Month to 25th Current Month</strong> • Payout: <strong>Last Day of Month</strong>
          </p>
        </div>

        {user?.role === 'Supervisor' && (
          <button
            onClick={handleRecalculatePayroll}
            disabled={calculating}
            className="btn btn-success"
          >
            <RefreshCw size={16} className={calculating ? 'animate-spin' : ''} />
            {calculating ? 'Processing Batch...' : 'Recalculate 25th-25th Payroll'}
          </button>
        )}
      </div>

      {/* Rules Notice */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div className="card" style={{ borderLeft: '4px solid #06b6d4', padding: '1rem' }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#38bdf8' }}>Billing Cycle Rule</div>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.2rem' }}>
            Calculated strictly from 25th of previous month to 25th of current month. Payout on last day of month.
          </div>
        </div>
        <div className="card" style={{ borderLeft: '4px solid #f59e0b', padding: '1rem' }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fbbf24' }}>Overtime (OT) Rule</div>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.2rem' }}>
            Work beyond 7.5 hours per day or double shift is paid at <strong>DOUBLE (2.0x)</strong> basic hourly rate.
          </div>
        </div>
        <div className="card" style={{ borderLeft: '4px solid #10b981', padding: '1rem' }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#34d399' }}>Sunday Wage Rule</div>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.2rem' }}>
            Full week work including Sunday is calculated at <strong>DOUBLE (2.0x)</strong> normal daily wage.
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

      {/* Payroll Table */}
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
                <th>Hourly Rate</th>
                <th>Days Present</th>
                <th>OT Hours</th>
                <th>2x OT Pay</th>
                <th>Sunday Days</th>
                <th>2x Sunday Pay</th>
                <th>Gross Salary</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {payrollData.map((rec) => (
                <tr key={rec._id}>
                  <td><strong>#{rec.tokenNo}</strong></td>
                  <td>{rec.employeeName}</td>
                  <td>₹{rec.basicMonthlySalary?.toLocaleString('en-IN')}</td>
                  <td>₹{rec.hourlyRate}/hr</td>
                  <td>{rec.totalDaysPresent} days</td>
                  <td style={{ color: rec.totalOvertimeHours > 0 ? '#fbbf24' : '#94a3b8', fontWeight: 600 }}>
                    {rec.totalOvertimeHours} hrs
                  </td>
                  <td style={{ color: '#34d399', fontWeight: 600 }}>
                    +₹{rec.overtimePay?.toLocaleString('en-IN')}
                  </td>
                  <td>{rec.sundayDaysWorked} days</td>
                  <td style={{ color: '#34d399', fontWeight: 600 }}>
                    +₹{rec.sundayPay?.toLocaleString('en-IN')}
                  </td>
                  <td style={{ fontSize: '1rem', fontWeight: 800, color: '#38bdf8' }}>
                    ₹{rec.grossSalary?.toLocaleString('en-IN')}
                  </td>
                  <td>
                    <span className="badge badge-emerald">
                      <CheckCircle2 size={12} /> {rec.status}
                    </span>
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
  );
};

export default PayrollTable;
