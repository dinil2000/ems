import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { DollarSign, Save, RefreshCw, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';

const SalaryDeductionManager = ({ onSelectEmployeePayslip }) => {
  const { user, API_BASE } = useContext(AuthContext);
  const isAdmin = user?.role === 'SiteAdmin' || user?.role === 'Supervisor';

  const [employees, setEmployees] = useState([]);
  // Regular employee: always their own token. Admin: can select any employee.
  const [selectedToken, setSelectedToken] = useState(user?.employeeToken || '');

  // Default to current month
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [month, setMonth] = useState(currentMonthStr);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  // Deduction Form State — editable by every employee
  const [canteenDeduction, setCanteenDeduction] = useState('0');
  const [festivalAdvance, setFestivalAdvance] = useState('0');
  const [providentFund, setProvidentFund] = useState('0');
  const [professionalTax, setProfessionalTax] = useState('0');
  const [medicalInsurance, setMedicalInsurance] = useState('0');
  const [cooperativeDeduction, setCooperativeDeduction] = useState('0');

  // Admin-only settings (shift rates, daily rate)
  const [dailyRate, setDailyRate] = useState('825.94');
  const [specialPay, setSpecialPay] = useState('0');
  const [conveyanceAllowance, setConveyanceAllowance] = useState('0');
  const [shift1Rate, setShift1Rate] = useState('30.00');
  const [shift2Rate, setShift2Rate] = useState('50.00');
  const [shift3Rate, setShift3Rate] = useState('78.00');

  // If admin, fetch employee list for selector
  useEffect(() => {
    if (isAdmin) {
      const fetchEmployees = async () => {
        try {
          const res = await axios.get(`${API_BASE}/employees?status=Active`);
          setEmployees(res.data || []);
        } catch (err) {
          console.error('Error fetching employees:', err);
        }
      };
      fetchEmployees();
    }
  }, []);

  const loadEmployeeData = async () => {
    if (!selectedToken) return;
    setLoading(true);
    try {
      const [empRes, dedRes] = await Promise.all([
        axios.get(`${API_BASE}/payroll/slip/${selectedToken}?month=${month}`),
        axios.get(`${API_BASE}/payroll/deductions/${selectedToken}?month=${month}`),
      ]);

      if (empRes.data) {
        setDailyRate(empRes.data.dailyRate || '825.94');
      }

      if (dedRes.data) {
        const d = dedRes.data;
        setCanteenDeduction(d.canteenDeduction !== undefined ? String(d.canteenDeduction) : '0');
        setFestivalAdvance(d.festivalAdvance !== undefined ? String(d.festivalAdvance) : '0');
        setProvidentFund(d.providentFund !== undefined ? String(d.providentFund) : '0');
        setProfessionalTax(d.professionalTax !== undefined ? String(d.professionalTax) : '0');
        setMedicalInsurance(d.medicalInsurance !== undefined ? String(d.medicalInsurance) : '0');
        setCooperativeDeduction(d.cooperativeDeduction !== undefined ? String(d.cooperativeDeduction) : '0');
        setSpecialPay(d.specialPay !== undefined ? String(d.specialPay) : '0');
        setConveyanceAllowance(d.conveyanceAllowance !== undefined ? String(d.conveyanceAllowance) : '0');
        setShift1Rate(d.shift1Rate !== undefined ? String(d.shift1Rate) : '30.00');
        setShift2Rate(d.shift2Rate !== undefined ? String(d.shift2Rate) : '50.00');
        setShift3Rate(d.shift3Rate !== undefined ? String(d.shift3Rate) : '78.00');
      }
    } catch (err) {
      console.error('Error loading employee deduction data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployeeData();
  }, [selectedToken, month]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const payload = {
        tokenNo: selectedToken,
        yearMonth: month,
        canteenDeduction: Number(canteenDeduction),
        festivalAdvance: Number(festivalAdvance),
        providentFund: Number(providentFund),
        professionalTax: Number(professionalTax),
        medicalInsurance: Number(medicalInsurance),
        cooperativeDeduction: Number(cooperativeDeduction),
      };

      // Admin can also edit shift rates & daily rate
      if (isAdmin) {
        payload.specialPay = Number(specialPay);
        payload.conveyanceAllowance = Number(conveyanceAllowance);
        payload.shift1Rate = Number(shift1Rate);
        payload.shift2Rate = Number(shift2Rate);
        payload.shift3Rate = Number(shift3Rate);
      }

      await axios.post(`${API_BASE}/payroll/deductions`, payload);

      setMessage({ type: 'success', text: `✅ Monthly deductions saved for Token #${selectedToken} (${month}). Go back to Salary Slip to see updated values.` });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || err.message });
    } finally {
      setSaving(false);
    }
  };

  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const [yr, mn] = month.split('-').map(Number);
  const monthLabel = `${monthNames[(mn || 1) - 1]} ${yr || now.getFullYear()}`;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '1.5rem 1rem' }}>
      {/* Page Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        backgroundColor: '#1e293b',
        padding: '1.25rem 1.5rem',
        borderRadius: '12px',
        border: '1px solid #334155'
      }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
            ✏️ Edit My Monthly Deductions
          </h2>
          <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '0.2rem 0 0 0' }}>
            Enter your deductions for <strong style={{ color: '#38bdf8' }}>{monthLabel}</strong> • Earnings are auto-calculated from attendance
          </p>
        </div>

        {onSelectEmployeePayslip && (
          <button className="btn btn-secondary" onClick={() => onSelectEmployeePayslip(selectedToken)}>
            <ArrowLeft size={15} /> Back to Salary Slip
          </button>
        )}
      </div>

      {message && (
        <div style={{
          backgroundColor: message.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
          border: `1px solid ${message.type === 'success' ? '#10b981' : '#f43f5e'}`,
          color: message.type === 'success' ? '#34d399' : '#f87171',
          padding: '0.8rem 1rem',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Admin: Employee selector. Regular employee: shows their own token only */}
      <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        {isAdmin ? (
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '0.3rem' }}>
              Select Employee
            </label>
            <select
              value={selectedToken}
              onChange={(e) => setSelectedToken(e.target.value)}
              className="form-input"
            >
              {employees.map(e => (
                <option key={e._id} value={e.tokenNo}>
                  Token #{e.tokenNo} - {e.name} (Rate: ₹{e.dailyRate || 825.94}/day)
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '0.3rem' }}>
              Employee
            </label>
            <div style={{
              backgroundColor: '#0f172a',
              padding: '0.6rem 0.8rem',
              borderRadius: '8px',
              border: '1px solid #334155',
              color: '#38bdf8',
              fontWeight: 700,
              fontSize: '0.95rem'
            }}>
              Token #{user?.employeeToken} — {user?.employeeProfile?.name || user?.employeeToken}
            </div>
          </div>
        )}

        <div style={{ width: '160px' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '0.3rem' }}>
            Pay Month
          </label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="form-input"
          />
        </div>
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>Loading deductions...</p>
      ) : (
        <form onSubmit={handleSave}>
          {/* Deductions Section — available to ALL employees */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f87171', borderBottom: '1px solid #334155', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
              🔻 DEDUCTIONS (₹) — Enter your deductions for {monthLabel}
            </h3>
            <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '1.25rem' }}>
              Every employee's deductions are different. Enter the exact amounts deducted this month.
              If you didn't buy canteen coupons, enter 0 for Canteen.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1' }}>
                  Canteen Deduction (CANT):
                </label>
                <p style={{ fontSize: '0.72rem', color: '#64748b', margin: '0.1rem 0 0.3rem 0' }}>
                  Varies monthly — enter 0 if no coupon bought
                </p>
                <input
                  type="number"
                  step="0.01"
                  value={canteenDeduction}
                  onChange={(e) => setCanteenDeduction(e.target.value)}
                  className="form-input"
                />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1' }}>
                  Festival Advance (FEST.ADV):
                </label>
                <p style={{ fontSize: '0.72rem', color: '#64748b', margin: '0.1rem 0 0.3rem 0' }}>
                  If any festival advance taken this month
                </p>
                <input
                  type="number"
                  step="0.01"
                  value={festivalAdvance}
                  onChange={(e) => setFestivalAdvance(e.target.value)}
                  className="form-input"
                />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1' }}>
                  Provident Fund (PF):
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={providentFund}
                  onChange={(e) => setProvidentFund(e.target.value)}
                  className="form-input"
                />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1' }}>
                  Professional Tax (PROF_TAX):
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={professionalTax}
                  onChange={(e) => setProfessionalTax(e.target.value)}
                  className="form-input"
                />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1' }}>
                  Medical Insurance (MEDI_INS):
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={medicalInsurance}
                  onChange={(e) => setMedicalInsurance(e.target.value)}
                  className="form-input"
                />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1' }}>
                  Cooperative Deduction (COP_DED):
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={cooperativeDeduction}
                  onChange={(e) => setCooperativeDeduction(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>

            {/* Total Preview */}
            <div style={{
              marginTop: '1.25rem',
              padding: '0.8rem 1rem',
              backgroundColor: 'rgba(244, 63, 94, 0.1)',
              border: '1px solid #f43f5e',
              borderRadius: '8px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ color: '#f87171', fontWeight: 700, fontSize: '0.95rem' }}>
                TOTAL DEDUCTIONS:
              </span>
              <span style={{ color: '#f87171', fontWeight: 900, fontSize: '1.15rem' }}>
                ₹{(
                  Number(canteenDeduction || 0) +
                  Number(festivalAdvance || 0) +
                  Number(providentFund || 0) +
                  Number(professionalTax || 0) +
                  Number(medicalInsurance || 0) +
                  Number(cooperativeDeduction || 0)
                ).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Admin-Only: Shift Rates & Daily Rate */}
          {isAdmin && (
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#34d399', borderBottom: '1px solid #334155', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                🟢 Admin Only: Shift Allowance Rates (₹/day)
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1' }}>Shift-I Rate (₹/day):</label>
                  <input type="number" step="0.01" value={shift1Rate} onChange={(e) => setShift1Rate(e.target.value)} className="form-input" />
                </div>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1' }}>Shift-II Rate (₹/day):</label>
                  <input type="number" step="0.01" value={shift2Rate} onChange={(e) => setShift2Rate(e.target.value)} className="form-input" />
                </div>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1' }}>Shift-III Rate (₹/day):</label>
                  <input type="number" step="0.01" value={shift3Rate} onChange={(e) => setShift3Rate(e.target.value)} className="form-input" />
                </div>
              </div>
            </div>
          )}

          {/* Save Button */}
          <button
            type="submit"
            disabled={saving}
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.9rem', fontWeight: 800, fontSize: '1rem' }}
          >
            {saving ? <RefreshCw className="spin" size={18} /> : <Save size={18} />}
            {' '} 💾 Save My Deductions for {monthLabel}
          </button>
        </form>
      )}
    </div>
  );
};

export default SalaryDeductionManager;
