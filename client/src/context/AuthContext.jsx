import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('ems_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('ems_user');
    const savedToken = localStorage.getItem('ems_token');
    if (savedUser && savedToken) {
      try {
        setUser(JSON.parse(savedUser));
        setToken(savedToken);
      } catch (e) {
        console.error('Failed to parse user session');
        localStorage.removeItem('ems_user');
        localStorage.removeItem('ems_token');
      }
    } else {
      setUser(null);
      setToken(null);
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

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, API_BASE }}>
      {children}
    </AuthContext.Provider>
  );
};
