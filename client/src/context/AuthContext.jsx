import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

const API_BASE = 'http://localhost:5000/api';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('ems_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('ems_user');
    if (savedUser && token) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error('Failed to parse user session');
      }
    } else {
      // Default initial Site Admin user for instant demo & testing
      const defaultAdmin = {
        id: 'siteadmin01',
        employeeToken: 'ADMIN01',
        email: 'admin@keltron.co.in',
        role: 'SiteAdmin',
        employeeProfile: {
          tokenNo: 'ADMIN01',
          name: 'Site Administrator (Keltron Head)',
          qualification: 'Diploma',
          experienceYears: 10,
          basicSalary: 60000,
          gender: 'Male',
          machineExpertise: ['700', '705', '710', '765(1)', '766'],
        }
      };
      setUser(defaultAdmin);
    }
    setLoading(false);
  }, []);

  const login = async (tokenOrEmail, password) => {
    try {
      const res = await axios.post(`${API_BASE}/auth/login`, { tokenOrEmail, password });
      const { token, user } = res.data;
      localStorage.setItem('ems_token', token);
      localStorage.setItem('ems_user', JSON.stringify(user));
      setToken(token);
      setUser(user);
      return { success: true };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Login failed' };
    }
  };

  const register = async (formData) => {
    try {
      const res = await axios.post(`${API_BASE}/auth/register`, formData);
      const { token, user, message } = res.data;
      localStorage.setItem('ems_token', token);
      localStorage.setItem('ems_user', JSON.stringify(user));
      setToken(token);
      setUser(user);
      return { success: true, message };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Registration failed' };
    }
  };

  const logout = () => {
    localStorage.removeItem('ems_token');
    localStorage.removeItem('ems_user');
    setToken(null);
    setUser(null);
  };

  // Toggle role helper for quick testing between SiteAdmin, Supervisor, and Employee
  const toggleRole = () => {
    if (!user) return;
    let newRole = 'Employee';
    if (user.role === 'Employee') newRole = 'Supervisor';
    else if (user.role === 'Supervisor') newRole = 'SiteAdmin';
    else if (user.role === 'SiteAdmin') newRole = 'Employee';

    const updatedUser = { ...user, role: newRole };
    setUser(updatedUser);
    localStorage.setItem('ems_user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, toggleRole, API_BASE }}>
      {children}
    </AuthContext.Provider>
  );
};
