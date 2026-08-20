import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import RegisterEmployeeModal from '../components/RegisterEmployeeModal';
import { Cpu, ShieldCheck, UserPlus, LogIn, Lock, User, KeyRound } from 'lucide-react';

const LoginPage = () => {
  const { login } = useContext(AuthContext);
  const [tokenOrEmail, setTokenOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!tokenOrEmail || !password) {
      setMessage('❌ Please enter your Token Number/Email and Password.');
      return;
    }

    setLoading(true);
    setMessage('');

    const res = await login(tokenOrEmail, password);
    setLoading(false);

    if (!res.success) {
      setMessage(`❌ ${res.message}`);
    }
  };

  const handleQuickFill = (tokenVal, passVal) => {
    setTokenOrEmail(tokenVal);
    setPassword(passVal);
  };

  return (
    <div style={{
      minHeight: '85vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem'
    }}>
      <div className="card animate-fade-in" style={{ maxWidth: '460px', width: '100%', padding: '2.25rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{
            backgroundColor: '#0284c7',
            color: '#fff',
            width: '56px',
            height: '56px',
            borderRadius: '12px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '0.75rem',
            boxShadow: '0 4px 12px rgba(2, 132, 199, 0.4)'
          }}>
            <Cpu size={32} />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
            KELTRON COMPONENT COMPLEX
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#06b6d4', fontWeight: 600, marginTop: '0.2rem' }}>
            MPP Manufacturing Section EMS Authentication
          </p>
        </div>

        {message && (
          <div style={{
            backgroundColor: 'rgba(244, 63, 94, 0.15)',
            color: '#f87171',
            border: '1px solid #f43f5e',
            padding: '0.65rem 0.85rem',
            borderRadius: '6px',
            marginBottom: '1.25rem',
            fontSize: '0.85rem'
          }}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Employee Token # or Email *</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="e.g. ADMIN01, 3085, or 8709"
                value={tokenOrEmail}
                onChange={(e) => setTokenOrEmail(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '2.4rem' }}
                required
              />
              <User size={16} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">Password *</label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '2.4rem' }}
                required
              />
              <Lock size={16} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', padding: '0.75rem', fontSize: '0.95rem' }}>
            <LogIn size={18} /> {loading ? 'Authenticating...' : 'Sign In to MPP System'}
          </button>
        </form>

        {/* Demo Quick Credentials Assistant */}
        <div style={{
          backgroundColor: '#090d16',
          border: '1px solid #334155',
          borderRadius: '8px',
          padding: '0.85rem',
          marginTop: '1.5rem',
          fontSize: '0.78rem'
        }}>
          <div style={{ fontWeight: 700, color: '#38bdf8', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <KeyRound size={14} /> Account Credentials Helper:
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <div
              onClick={() => handleQuickFill('ADMIN01', 'admin')}
              style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', color: '#818cf8' }}
            >
              <span>🔑 <strong>Root Site Admin:</strong> ADMIN01</span>
              <span>Pass: <code>admin</code></span>
            </div>

            <div
              onClick={() => handleQuickFill('3085', 'mpp12345')}
              style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', color: '#22d3ee' }}
            >
              <span>🛡️ <strong>Supervisor:</strong> Token 3085</span>
              <span>Pass: <code>mpp12345</code></span>
            </div>

            <div
              onClick={() => handleQuickFill('8709', 'mpp12345')}
              style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', color: '#34d399' }}
            >
              <span>👷 <strong>Employee:</strong> Token 8709</span>
              <span>Pass: <code>mpp12345</code></span>
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #334155' }}>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.6rem' }}>
            New employee joining MPP section?
          </p>
          <button onClick={() => setIsRegisterOpen(true)} className="btn btn-secondary" style={{ width: '100%' }}>
            <UserPlus size={16} /> Register New Employee Profile
          </button>
        </div>
      </div>

      <RegisterEmployeeModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
      />
    </div>
  );
};

export default LoginPage;
