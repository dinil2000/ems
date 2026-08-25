import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { User, Lock, CheckSquare, Square, X, Save, KeyRound } from 'lucide-react';

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

const ProfileModal = ({ isOpen, onClose }) => {
  const { user, API_BASE } = useContext(AuthContext);
  const profile = user?.employeeProfile || {};

  const [activeSubTab, setActiveSubTab] = useState('profile'); // 'profile' or 'password'

  // Profile Form State
  const [name, setName] = useState(profile.name || user?.employeeToken || '');
  const [qualification, setQualification] = useState(profile.qualification || 'ITI');
  const [experienceYears, setExperienceYears] = useState(profile.experienceYears || 0);
  const [dailyRate, setDailyRate] = useState(profile.dailyRate || 825.94);
  const [gender, setGender] = useState(profile.gender || 'Male');
  const [machineExpertise, setMachineExpertise] = useState(profile.machineExpertise || ['700', '705']);

  // Change Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen || !user) return null;

  const handleMachineToggle = (mId) => {
    if (machineExpertise.includes(mId)) {
      setMachineExpertise(machineExpertise.filter(id => id !== mId));
    } else {
      setMachineExpertise([...machineExpertise, mId]);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const res = await axios.put(`${API_BASE}/employees/${user.employeeProfile?._id || user.employeeToken}`, {
        name,
        qualification,
        experienceYears: parseInt(experienceYears) || 0,
        dailyRate: parseFloat(dailyRate) || 825.94,
        gender,
        machineExpertise
      });

      // Update local storage user session
      const updatedUser = {
        ...user,
        employeeProfile: {
          ...user.employeeProfile,
          name,
          qualification,
          experienceYears: parseInt(experienceYears) || 0,
          dailyRate: parseFloat(dailyRate) || 825.94,
          gender,
          machineExpertise
        }
      };
      localStorage.setItem('ems_user', JSON.stringify(updatedUser));

      setMessage('✅ Profile updated successfully!');
    } catch (err) {
      setMessage(`❌ Failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      setMessage('❌ Please enter current and new password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage('❌ New password and confirmation do not match.');
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const res = await axios.post(`${API_BASE}/auth/change-password`, {
        tokenNo: user.employeeToken,
        currentPassword,
        newPassword
      });

      setMessage(`✅ ${res.data.message}`);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setMessage(`❌ Failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content animate-fade-in" style={{ maxWidth: '580px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #334155', paddingBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <User style={{ color: '#06b6d4' }} size={24} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
              My Profile & Security Settings
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Tab Toggle */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <button
            onClick={() => { setActiveSubTab('profile'); setMessage(''); }}
            className={`btn ${activeSubTab === 'profile' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1 }}
          >
            <User size={16} /> Edit My Profile
          </button>
          <button
            onClick={() => { setActiveSubTab('password'); setMessage(''); }}
            className={`btn ${activeSubTab === 'password' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1 }}
          >
            <Lock size={16} /> Change Password
          </button>
        </div>

        {message && (
          <div style={{
            backgroundColor: message.includes('✅') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
            color: message.includes('✅') ? '#34d399' : '#f87171',
            border: message.includes('✅') ? '1px solid #10b981' : '1px solid #f43f5e',
            padding: '0.65rem 0.85rem',
            borderRadius: '6px',
            marginBottom: '1rem',
            fontSize: '0.85rem'
          }}>
            {message}
          </div>
        )}

        {/* Sub-Tab 1: Edit Profile */}
        {activeSubTab === 'profile' && (
          <form onSubmit={handleSaveProfile}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Punching Token #</label>
                <input
                  type="text"
                  value={user.employeeToken}
                  disabled
                  className="form-input"
                  style={{ opacity: 0.7, backgroundColor: '#090d16' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="form-input"
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Qualification *</label>
                <select value={qualification} onChange={(e) => setQualification(e.target.value)} className="form-select">
                  <option value="ITI">ITI</option>
                  <option value="Diploma">Diploma</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Experience (Yrs) *</label>
                <input
                  type="number"
                  min="0"
                  max="40"
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Daily Basic Rate (₹/day) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={dailyRate}
                  onChange={(e) => setDailyRate(e.target.value)}
                  placeholder="825.94"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Gender *</label>
                <select value={gender} onChange={(e) => setGender(e.target.value)} className="form-select">
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" style={{ color: '#38bdf8' }}>
                Machine Expertise (Which machines do you operate?) *
              </label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                gap: '0.5rem',
                backgroundColor: '#0f172a',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid #334155',
                maxHeight: '160px',
                overflowY: 'auto'
              }}>
                {MPP_MACHINES.map((m) => {
                  const isSelected = machineExpertise.includes(m.id);
                  return (
                    <div
                      key={m.id}
                      onClick={() => handleMachineToggle(m.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        fontSize: '0.8rem',
                        padding: '0.35rem 0.5rem',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        backgroundColor: isSelected ? 'rgba(6, 182, 212, 0.15)' : '#1e293b',
                        border: isSelected ? '1px solid #06b6d4' : '1px solid #334155',
                        color: isSelected ? '#22d3ee' : '#f8fafc'
                      }}
                    >
                      {isSelected ? <CheckSquare size={14} style={{ color: '#06b6d4' }} /> : <Square size={14} style={{ color: '#64748b' }} />}
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
                <Save size={16} /> Save Profile Changes
              </button>
            </div>
          </form>
        )}

        {/* Sub-Tab 2: Change Password */}
        {activeSubTab === 'password' && (
          <form onSubmit={handleChangePassword}>
            <div className="form-group">
              <label className="form-label">Current Password * (Default: admin)</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password (default: admin)"
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">New Password *</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="form-input"
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label">Confirm New Password *</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="form-input"
                required
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>
                Cancel
              </button>
              <button type="submit" disabled={loading} className="btn btn-primary" style={{ flex: 1 }}>
                <KeyRound size={16} /> Update Password
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ProfileModal;
