import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import ProfileModal from './ProfileModal';
import { ShieldAlert, LogOut, User, Calendar, History } from 'lucide-react';

const Navbar = ({ activeTab, setActiveTab }) => {
  const { user, logout } = useContext(AuthContext);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  return (
    <nav style={{
      backgroundColor: '#0f172a',
      borderBottom: '1px solid #334155',
      padding: '0.8rem 2rem',
      display: 'flex',
      alignItems: 'center',
      justify: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      {/* Official Keltron & MPP Brand Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
        <img
          src="/logo.png"
          alt="MPP Logo"
          style={{ width: '42px', height: '42px', borderRadius: '8px', objectFit: 'contain' }}
        />
        <div style={{
          backgroundColor: '#0284c7',
          color: '#fff',
          padding: '0.3rem 0.6rem',
          borderRadius: '6px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid #38bdf8'
        }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 900, letterSpacing: '0.5px' }}>KELTRON</span>
          <span style={{ fontSize: '0.5rem', fontWeight: 700, color: '#e0f2fe' }}>കെൽട്രോൺ</span>
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
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {user.role === 'SiteAdmin' && (
            <button
              className={`btn ${activeTab === 'admin' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('admin')}
              style={{ border: '1px solid #6366f1' }}
            >
              <ShieldAlert size={16} style={{ color: '#818cf8' }} /> Root Admin (/admin)
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
                className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveTab('history')}
              >
                <History size={15} /> Attendance History
              </button>
              <button
                className={`btn ${activeTab === 'payroll' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveTab('payroll')}
              >
                Payroll (26th-25th)
              </button>
              <button
                className={`btn ${activeTab === 'maintenance' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveTab('maintenance')}
              >
                Cleaning Alerts
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
                className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveTab('history')}
              >
                <History size={15} /> My Punching Logs
              </button>
              <button
                className={`btn ${activeTab === 'shifts' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveTab('shifts')}
              >
                My Shift Notice
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

      {/* User Info & Profile Modal Trigger */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span
              className={user.role === 'SiteAdmin' ? 'badge badge-indigo' : (user.role === 'Supervisor' ? 'badge badge-cyan' : 'badge badge-emerald')}
              style={{ padding: '0.35rem 0.75rem' }}
            >
              Role: {user.role === 'SiteAdmin' ? 'ROOT SITE ADMIN' : user.role}
            </span>

            <button
              onClick={() => setIsProfileOpen(true)}
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
              title="Edit Profile & Password"
            >
              <User size={14} /> My Profile & Password
            </button>

            <button onClick={logout} className="btn btn-secondary" title="Logout" style={{ padding: '0.4rem 0.6rem' }}>
              <LogOut size={16} /> Logout
            </button>
          </div>
        )}
      </div>

      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </nav>
  );
};

export default Navbar;
