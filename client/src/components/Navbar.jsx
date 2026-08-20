import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Cpu, Shield, ShieldAlert, LogOut, RefreshCw } from 'lucide-react';

const Navbar = ({ activeTab, setActiveTab }) => {
  const { user, logout, toggleRole } = useContext(AuthContext);

  return (
    <nav style={{
      backgroundColor: '#0f172a',
      borderBottom: '1px solid #334155',
      padding: '0.8rem 2rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      {/* Brand Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
        <div style={{
          backgroundColor: '#0284c7',
          color: '#fff',
          padding: '0.5rem',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Cpu size={24} />
        </div>
        <div>
          <h1 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc', margin: 0, letterSpacing: '-0.02em' }}>
            KELTRON COMPONENT COMPLEX LIMITED
          </h1>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#06b6d4', margin: 0 }}>
            Production Unit (MPP Section) • Automated EMS
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      {user && (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {user.role === 'SiteAdmin' && (
            <button
              className={`btn ${activeTab === 'admin' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('admin')}
              style={{ border: '1px solid #6366f1' }}
            >
              <ShieldAlert size={16} style={{ color: '#818cf8' }} /> Site Admin (/admin)
            </button>
          )}

          {(user.role === 'Supervisor' || user.role === 'SiteAdmin') && (
            <>
              <button
                className={`btn ${activeTab === 'dashboard' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveTab('dashboard')}
              >
                Supervisor Dashboard
              </button>
              <button
                className={`btn ${activeTab === 'shifts' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveTab('shifts')}
              >
                Weekly Roster Notice
              </button>
              <button
                className={`btn ${activeTab === 'payroll' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveTab('payroll')}
              >
                Payroll (25th-25th)
              </button>
              <button
                className={`btn ${activeTab === 'maintenance' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveTab('maintenance')}
              >
                Machine Cleaning Alerts
              </button>
            </>
          )}

          {user.role === 'Employee' && (
            <>
              <button
                className={`btn ${activeTab === 'employee' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveTab('employee')}
              >
                My Punch & Portal
              </button>
              <button
                className={`btn ${activeTab === 'shifts' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveTab('shifts')}
              >
                My Weekly Shift Notice
              </button>
              <button
                className={`btn ${activeTab === 'payroll' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveTab('payroll')}
              >
                My Salary Slips
              </button>
            </>
          )}
        </div>
      )}

      {/* User Info & Role Switcher */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={toggleRole}
              title="Click to toggle role between SiteAdmin, Supervisor, and Employee for testing"
              className={user.role === 'SiteAdmin' ? 'badge badge-indigo' : (user.role === 'Supervisor' ? 'badge badge-cyan' : 'badge badge-emerald')}
              style={{ cursor: 'pointer', padding: '0.35rem 0.75rem' }}
            >
              <RefreshCw size={12} /> Role: {user.role}
            </button>

            <div style={{ textAlign: 'right', fontSize: '0.85rem' }}>
              <div style={{ fontWeight: 700, color: '#f8fafc' }}>
                {user.employeeProfile?.name || `Token: ${user.employeeToken}`}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                Token #{user.employeeToken}
              </div>
            </div>

            <button onClick={logout} className="btn btn-secondary" title="Logout" style={{ padding: '0.4rem 0.6rem' }}>
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
