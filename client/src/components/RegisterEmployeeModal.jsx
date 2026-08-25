import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { UserPlus, CheckSquare, Square, X, Calculator, ShieldCheck } from 'lucide-react';

const MPP_MACHINES = [
  { id: '700', name: 'Winding Machine #700', cat: 'Winding' },
  { id: '705', name: 'Winding Machine #705', cat: 'Winding' },
  { id: '701', name: 'Winding Machine #701', cat: 'Winding' },
  { id: '0450', name: 'Winding Machine #0450', cat: 'Winding' },
  { id: '0460', name: 'Winding Machine #0460', cat: 'Winding' },
  { id: '0480', name: 'Testing Machine #0480', cat: 'Testing' },
  { id: '710', name: 'Testing Machine #710', cat: 'Testing' },
  { id: '711', name: 'Testing Machine #711', cat: 'Testing' },
  { id: '0470', name: 'Metalizing Machine #0470', cat: 'Metalizing' },
  { id: '765(1)', name: 'Metalizing Machine #765(1)', cat: 'Metalizing' },
  { id: '765(2)', name: 'Metalizing Machine #765(2)', cat: 'Metalizing' },
  { id: '766', name: 'Metalizing Machine #766', cat: 'Metalizing' },
];

const RegisterEmployeeModal = ({ isOpen, onClose, onSuccess }) => {
  const { register } = useContext(AuthContext);

  const [formData, setFormData] = useState({
    tokenNo: '',
    name: '',
    email: '',
    password: 'mpp12345',
    employmentType: 'Permanent',
    qualification: 'ITI',
    experienceYears: 2,
    gender: 'Male',
    dailyRate: '825.94',
    basicSalary: '',
    unit: 'Unit 2',
    machineExpertise: ['700', '705'],
  });

  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const calculatedSalary = formData.qualification === 'Diploma'
    ? 24000 + (parseInt(formData.experienceYears) || 0) * 2000
    : 18000 + (parseInt(formData.experienceYears) || 0) * 1500;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleMachineToggle = (machineId) => {
    setFormData(prev => {
      const current = prev.machineExpertise;
      if (current.includes(machineId)) {
        return { ...prev, machineExpertise: current.filter(id => id !== machineId) };
      } else {
        return { ...prev, machineExpertise: [...current, machineId] };
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.tokenNo || !formData.name || !formData.email) {
      setMessage('❌ Please fill in Token Number, Full Name, and Email.');
      return;
    }
    if (formData.machineExpertise.length === 0) {
      setMessage('❌ Select at least one machine from the MPP section machine list.');
      return;
    }

    setLoading(true);
    setMessage('');

    const salary = formData.basicSalary ? parseFloat(formData.basicSalary) : calculatedSalary;
    const rate = formData.dailyRate ? parseFloat(formData.dailyRate) : Math.round((salary / 26) * 100) / 100;

    const payload = {
      ...formData,
      role: 'Employee', // Role is strictly Employee for public registration
      basicSalary: salary,
      dailyRate: rate,
    };

    const res = await register(payload);
    setLoading(false);

    if (res.success) {
      if (onSuccess) onSuccess();
      onClose();
    } else {
      setMessage(`❌ ${res.message}`);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content animate-fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #334155', paddingBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <UserPlus style={{ color: '#06b6d4' }} size={24} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Register New MPP Employee Profile</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Supervisor Activation Rule Banner */}
        <div style={{
          backgroundColor: 'rgba(245, 158, 11, 0.15)',
          color: '#fbbf24',
          border: '1px solid #f59e0b',
          padding: '0.6rem 0.8rem',
          borderRadius: '6px',
          marginBottom: '1rem',
          fontSize: '0.8rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <ShieldCheck size={18} />
          <span>Note: Registered accounts are assigned <strong>Employee</strong> role and set to <strong>Pending Approval</strong> until activated by a Supervisor or Site Admin.</span>
        </div>

        {message && (
          <div style={{
            backgroundColor: 'rgba(244, 63, 94, 0.15)',
            color: '#f87171',
            border: '1px solid #f43f5e',
            padding: '0.6rem 0.8rem',
            borderRadius: '6px',
            marginBottom: '1rem',
            fontSize: '0.85rem'
          }}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Employee Token / ID # *</label>
              <input
                type="text"
                name="tokenNo"
                placeholder="e.g. 9903"
                value={formData.tokenNo}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input
                type="text"
                name="name"
                placeholder="e.g. Rajesh Nair"
                value={formData.name}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Email Address *</label>
              <input
                type="email"
                name="email"
                placeholder="e.g. rajesh@keltron.co.in"
                value={formData.email}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Account Password *</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Employment Type *</label>
              <select name="employmentType" value={formData.employmentType} onChange={handleChange} className="form-select">
                <option value="Permanent">Permanent</option>
                <option value="Casual">Casual</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Qualification *</label>
              <select name="qualification" value={formData.qualification} onChange={handleChange} className="form-select">
                <option value="ITI">ITI</option>
                <option value="Diploma">Diploma</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Experience (Years) *</label>
              <input
                type="number"
                name="experienceYears"
                min="0"
                max="30"
                value={formData.experienceYears}
                onChange={handleChange}
                className="form-input"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Gender * (General Shift Rule Priority)</label>
              <select name="gender" value={formData.gender} onChange={handleChange} className="form-select">
                <option value="Male">Male</option>
                <option value="Female">Female (Assigned to General Shift)</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Daily Basic Rate (₹/day) *</label>
              <input
                type="number"
                step="0.01"
                name="dailyRate"
                placeholder="825.94"
                value={formData.dailyRate}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>
          </div>

          {/* Salary Calculation Preview */}
          <div style={{
            backgroundColor: '#090d16',
            border: '1px solid #334155',
            padding: '0.85rem 1rem',
            borderRadius: '8px',
            marginBottom: '1.25rem',
            display: 'flex',
            justify: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#94a3b8' }}>
              <Calculator size={18} style={{ color: '#10b981' }} />
              <span>Basic Monthly Salary Formula:</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#34d399' }}>
                ₹{(formData.basicSalary ? parseFloat(formData.basicSalary) : calculatedSalary).toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                Base ({formData.qualification}) + {formData.experienceYears} yrs experience
              </div>
            </div>
          </div>

          {/* Machine Expertise Selection (Multiple-Choice) */}
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label" style={{ color: '#38bdf8', fontSize: '0.9rem' }}>
              Which machines do you know how to operate? (MPP Machine Expertise Selection) *
            </label>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: '0.6rem',
              backgroundColor: '#0f172a',
              padding: '0.85rem',
              borderRadius: '8px',
              border: '1px solid #334155',
              maxHeight: '180px',
              overflowY: 'auto'
            }}>
              {MPP_MACHINES.map((m) => {
                const isSelected = formData.machineExpertise.includes(m.id);
                return (
                  <div
                    key={m.id}
                    onClick={() => handleMachineToggle(m.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.82rem',
                      padding: '0.4rem 0.6rem',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      backgroundColor: isSelected ? 'rgba(6, 182, 212, 0.15)' : '#1e293b',
                      border: isSelected ? '1px solid #06b6d4' : '1px solid #334155',
                      color: isSelected ? '#22d3ee' : '#f8fafc'
                    }}
                  >
                    {isSelected ? <CheckSquare size={16} style={{ color: '#06b6d4' }} /> : <Square size={16} style={{ color: '#64748b' }} />}
                    <span>#{m.id} ({m.cat})</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary" style={{ flex: 1 }}>
              {loading ? 'Submitting...' : 'Register Employee Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterEmployeeModal;
