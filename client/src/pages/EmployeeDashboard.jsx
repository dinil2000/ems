import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import PunchWidget from '../components/PunchWidget';
import { User, Calendar, Clock, DollarSign, Cpu, CheckCircle2 } from 'lucide-react';

const EmployeeDashboard = ({ setActiveTab }) => {
  const { user, API_BASE } = useContext(AuthContext);
  const [attendance, setAttendance] = useState([]);
  const [payroll, setPayroll] = useState([]);
  const [myShift, setMyShift] = useState(null);
  const [loading, setLoading] = useState(true);

  const tokenNo = user?.employeeToken || '8709';

  const loadData = async () => {
    setLoading(true);
    try {
      const [attRes, payRes, shiftRes] = await Promise.all([
        axios.get(`${API_BASE}/attendance/employee/${tokenNo}`).catch(() => ({ data: [] })),
        axios.get(`${API_BASE}/payroll/employee/${tokenNo}`).catch(() => ({ data: [] })),
        axios.get(`${API_BASE}/shifts/latest`).catch(() => ({ data: null }))
      ]);

      setAttendance(Array.isArray(attRes.data) ? attRes.data : []);
      setPayroll(Array.isArray(payRes.data) ? payRes.data : []);

      if (shiftRes.data && shiftRes.data.shifts) {
        // Find employee's assigned shift in current roster
        let foundShift = null;
        shiftRes.data.shifts.forEach(slot => {
          slot.allocations.forEach(alloc => {
            if (alloc.assignedEmployees && alloc.assignedEmployees.some(e => e.tokenNo === tokenNo)) {
              foundShift = {
                shiftType: slot.shiftType,
                shiftInCharge: slot.shiftInCharge,
                machineId: alloc.machineId,
                machineName: alloc.machineName,
              };
            }
          });
        });
        setMyShift(foundShift);
      }
    } catch (err) {
      console.error('Error loading employee profile data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tokenNo) loadData();
  }, [tokenNo]);

  const profile = user?.employeeProfile || {};

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '1.5rem 1rem' }}>
      {/* Employee Welcome Banner */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            backgroundColor: '#0284c7',
            color: '#fff',
            width: '54px',
            height: '54px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.4rem',
            fontWeight: 800
          }}>
            {profile.name ? profile.name.charAt(0) : 'E'}
          </div>
          <div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
              Welcome, {profile.name || `Employee #${tokenNo}`}
            </h1>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '0.2rem 0 0 0' }}>
              Token #{tokenNo} • {profile.qualification || 'ITI'} ({profile.experienceYears || 0} Yrs Exp) • {profile.employmentType || 'Permanent'}
            </p>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Basic Monthly Pay</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#34d399' }}>
            ₹{(profile.basicSalary || 22500).toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '1.5rem' }}>
        {/* Left Column: Clock Punch & My Assigned Shift */}
        <div>
          <PunchWidget onPunchUpdate={loadData} />

          {/* Assigned Shift Card */}
          <div className="card" style={{ marginTop: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <Cpu style={{ color: '#06b6d4' }} size={20} />
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>My Weekly Shift Schedule</h3>
            </div>

            {myShift ? (
              <div style={{ backgroundColor: '#090d16', padding: '0.85rem', borderRadius: '8px', border: '1px solid #334155' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#38bdf8' }}>{myShift.shiftType}</div>
                <div style={{ fontSize: '0.82rem', color: '#f8fafc', marginTop: '0.3rem' }}>
                  Assigned Machine: <strong style={{ color: '#fbbf24' }}>#{myShift.machineId}</strong> ({myShift.machineName})
                </div>
                {myShift.shiftInCharge?.name && (
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.3rem' }}>
                    Shift In Charge: {myShift.shiftInCharge.tokenNo} {myShift.shiftInCharge.name}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                Currently assigned to <strong>General Shift (08.30AM - 04.30PM)</strong> or check notice board.
              </div>
            )}

            <button onClick={() => setActiveTab('shifts')} className="btn btn-secondary" style={{ width: '100%', marginTop: '1rem', fontSize: '0.85rem' }}>
              View Full Notice Board Roster
            </button>
          </div>
        </div>

        {/* Right Column: Attendance & Salary History */}
        <div>
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem' }}>Recent Attendance & Overtime Logs</h3>
            {attendance.length > 0 ? (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Punch In</th>
                      <th>Punch Out</th>
                      <th>Working Hours</th>
                      <th>Overtime (Double Rate)</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.map((att) => (
                      <tr key={att._id}>
                        <td>{new Date(att.date).toLocaleDateString('en-IN')}</td>
                        <td>{att.punchIn ? new Date(att.punchIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                        <td>{att.punchOut ? new Date(att.punchOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'On Shift'}</td>
                        <td>{att.totalHours || '-'} hrs</td>
                        <td style={{ color: att.overtimeHours > 0 ? '#fbbf24' : '#94a3b8', fontWeight: 600 }}>
                          {att.overtimeHours > 0 ? `+${att.overtimeHours} hrs (2x Pay)` : '0 hrs'}
                        </td>
                        <td>
                          <span className={att.status === 'Present' ? 'badge badge-emerald' : 'badge badge-amber'}>
                            {att.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No attendance punch logs recorded yet. Punch in to start logging.</p>
            )}
          </div>

          <div className="card">
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem' }}>My Salary Slips (26th to 25th Cycle)</h3>
            {payroll.length > 0 ? (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Billing Month</th>
                      <th>Basic Rate</th>
                      <th>Days Present</th>
                      <th>2x OT Earned</th>
                      <th>2x Sunday Earned</th>
                      <th>Gross Payout</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payroll.map((pay) => (
                      <tr key={pay._id}>
                        <td><strong>{pay.billingCycleMonth}</strong></td>
                        <td>₹{pay.basicMonthlySalary?.toLocaleString('en-IN')}</td>
                        <td>{pay.totalDaysPresent} days</td>
                        <td style={{ color: '#34d399' }}>+₹{pay.overtimePay?.toLocaleString('en-IN')}</td>
                        <td style={{ color: '#34d399' }}>+₹{pay.sundayPay?.toLocaleString('en-IN')}</td>
                        <td style={{ fontSize: '1rem', fontWeight: 800, color: '#38bdf8' }}>
                          ₹{pay.grossSalary?.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No computed payroll slip available for this billing cycle.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
