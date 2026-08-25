import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { DollarSign, Save, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

const SalaryDeductionManager = ({ onSelectEmployeePayslip }) => {
  const { API_BASE } = useContext(AuthContext);
  const [employees, setEmployees] = useState([]);
  const [selectedToken, setSelectedToken] = useState('8356');
  const [month, setMonth] = useState('2026-05');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  // Form State
  const [dailyRate, setDailyRate] = useState('825.94');
  const [canteenDeduction, setCanteenDeduction] = useState('262.50');
  const [festivalAdvance, setFestivalAdvance] = useState('1500.00');
  const [providentFund, setProvidentFund] = useState('1800.00');
  const [professionalTax, setProfessionalTax] = useState('250.00');
  const [medicalInsurance, setMedicalInsurance] = useState('532.00');
  const [cooperativeDeduction, setCooperativeDeduction] = useState('0.00');
  const [specialPay, setSpecialPay] = useState('0.00');
  const [conveyanceAllowance, setConveyanceAllowance] = useState('0.00');
  const [shift1Rate, setShift1Rate] = useState('30.00');
  const [shift2Rate, setShift2Rate] = useState('50.00');
  const [shift3Rate, setShift3Rate] = useState('78.00');

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await axios.get(`${API_BASE}/employees?status=Active`);
        setEmployees(res.data || []);
        if (res.data.length > 0 && !selectedToken) {
          setSelectedToken(res.data[0].tokenNo);
        }
      } catch (err) {
        console.error('Error fetching employees:', err);
      }
    };
    fetchEmployees();
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
        setCanteenDeduction(d.canteenDeduction !== undefined ? String(d.canteenDeduction) : '262.50');
        setFestivalAdvance(d.festivalAdvance !== undefined ? String(d.festivalAdvance) : '1500.00');
        setProvidentFund(d.providentFund !== undefined ? String(d.providentFund) : '1800.00');
        setProfessionalTax(d.professionalTax !== undefined ? String(d.professionalTax) : '250.00');
        setMedicalInsurance(d.medicalInsurance !== undefined ? String(d.medicalInsurance) : '532.00');
        setCooperativeDeduction(d.cooperativeDeduction !== undefined ? String(d.cooperativeDeduction) : '0.00');
        setSpecialPay(d.specialPay !== undefined ? String(d.specialPay) : '0.00');
        setConveyanceAllowance(d.conveyanceAllowance !== undefined ? String(d.conveyanceAllowance) : '0.00');
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
      await axios.post(`${API_BASE}/payroll/deductions`, {
        tokenNo: selectedToken,
        yearMonth: month,
        canteenDeduction: Number(canteenDeduction),
        festivalAdvance: Number(festivalAdvance),
        providentFund: Number(providentFund),
        professionalTax: Number(professionalTax),
        medicalInsurance: Number(medicalInsurance),
        cooperativeDeduction: Number(cooperativeDeduction),
        specialPay: Number(specialPay),
        conveyanceAllowance: Number(conveyanceAllowance),
        shift1Rate: Number(shift1Rate),
        shift2Rate: Number(shift2Rate),
        shift3Rate: Number(shift3Rate),
      });

      setMessage({ type: 'success', text: `Monthly Deductions & Rates updated for Token #${selectedToken} (${month})` });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '1.5rem 1rem' }}>
      {/* Page Header */}
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
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
            Monthly Salary Deductions & Rates Manager
          </h2>
          <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '0.2rem 0 0 0' }}>
            Set Canteen Coupons, Festival Advance, PF, Professional Tax & Shift Allowances per Employee
          </p>
        </div>

        {onSelectEmployeePayslip && (
          <button className="btn btn-secondary" onClick={() => onSelectEmployeePayslip(selectedToken)}>
            Preview Authentic Slip 📄
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

      {/* Select Employee Bar */}
      <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '0.3rem' }}>
            Select Employee Token & Name
          </label>
          <select
            value={selectedToken}
            onChange={(e) => setSelectedToken(e.target.value)}
            className="form-input"
          >
            {employees.map(e => (
              <option key={e._id} value={e.tokenNo}>
                Token #{e.tokenNo} - {e.name} ({e.qualification} • Rate: ₹{e.dailyRate || 825.94}/day)
              </option>
            ))}
          </select>
        </div>

        <div style={{ width: '180px' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '0.3rem' }}>
            Select Pay Month
          </label>
          <input
            type="text"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            placeholder="2026-05"
            className="form-input"
          />
        </div>
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>Loading employee payroll settings...</p>
      ) : (
        <form onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          {/* Deductions Column */}
          <div className="card">
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f87171', borderBottom: '1px solid #334155', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
              🔻 Monthly Deductions Section (₹)
            </h3>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1' }}>
                Canteen Deduction (CANT):
              </label>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0.1rem 0 0.4rem 0' }}>
                Varies monthly based on coupons bought (enter 0 if no coupons bought)
              </p>
              <input
                type="number"
                step="0.01"
                value={canteenDeduction}
                onChange={(e) => setCanteenDeduction(e.target.value)}
                className="form-input"
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1' }}>
                Festival Advance (FEST.ADV):
              </label>
              <input
                type="number"
                step="0.01"
                value={festivalAdvance}
                onChange={(e) => setFestivalAdvance(e.target.value)}
                className="form-input"
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
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

            <div style={{ marginBottom: '1rem' }}>
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

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1' }}>
                Medical Insurance / ESI (MEDI_INS):
              </label>
              <input
                type="number"
                step="0.01"
                value={medicalInsurance}
                onChange={(e) => setMedicalInsurance(e.target.value)}
                className="form-input"
              />
            </div>
          </div>

          {/* Earnings & Shift Rates Column */}
          <div className="card">
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#34d399', borderBottom: '1px solid #334155', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
              🟢 Earnings & Shift Allowance Rates (₹/day)
            </h3>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1' }}>
                Daily Basic Pay Rate (Rate):
              </label>
              <input
                type="number"
                step="0.01"
                value={dailyRate}
                onChange={(e) => setDailyRate(e.target.value)}
                className="form-input"
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1' }}>
                Shift-I Allowance Rate (per day):
              </label>
              <input
                type="number"
                step="0.01"
                value={shift1Rate}
                onChange={(e) => setShift1Rate(e.target.value)}
                className="form-input"
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1' }}>
                Shift-II Allowance Rate (per day):
              </label>
              <input
                type="number"
                step="0.01"
                value={shift2Rate}
                onChange={(e) => setShift2Rate(e.target.value)}
                className="form-input"
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1' }}>
                Shift-III Allowance Rate (per day):
              </label>
              <input
                type="number"
                step="0.01"
                value={shift3Rate}
                onChange={(e) => setShift3Rate(e.target.value)}
                className="form-input"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.8rem', marginTop: '1.5rem', fontWeight: 800 }}
            >
              {saving ? <RefreshCw className="spin" size={18} /> : <Save size={18} />} Save Monthly Deductions & Rates
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default SalaryDeductionManager;
