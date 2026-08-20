import React, { useState, useContext } from 'react';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Navbar from './components/Navbar';
import SupervisorDashboard from './pages/SupervisorDashboard';
import EmployeeDashboard from './pages/EmployeeDashboard';
import AdminPage from './pages/AdminPage';
import ShiftRosterNotice from './components/ShiftRosterNotice';
import PayrollTable from './components/PayrollTable';
import MaintenanceAlerts from './components/MaintenanceAlerts';
import LoginPage from './pages/LoginPage';

const MainApp = () => {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('dashboard');

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0b1120' }}>
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main style={{ padding: '1.5rem 1rem', maxWidth: '1280px', margin: '0 auto' }}>
        {activeTab === 'admin' && <AdminPage />}

        {activeTab === 'dashboard' && (
          user.role === 'SiteAdmin' ? (
            <AdminPage />
          ) : user.role === 'Supervisor' ? (
            <SupervisorDashboard setActiveTab={setActiveTab} />
          ) : (
            <EmployeeDashboard setActiveTab={setActiveTab} />
          )
        )}

        {activeTab === 'employee' && <EmployeeDashboard setActiveTab={setActiveTab} />}
        {activeTab === 'shifts' && <ShiftRosterNotice />}
        {activeTab === 'payroll' && <PayrollTable />}
        {activeTab === 'maintenance' && <MaintenanceAlerts />}
      </main>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
