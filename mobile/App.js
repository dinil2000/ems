import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import ShiftNoticeScreen from './src/screens/ShiftNoticeScreen';
import PayrollScreen from './src/screens/PayrollScreen';
import MaintenanceScreen from './src/screens/MaintenanceScreen';
import AdminScreen from './src/screens/AdminScreen';
import ProfileScreen from './src/screens/ProfileScreen';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentScreen, setCurrentScreen] = useState('home'); // 'home', 'notice', 'payroll', 'maintenance', 'admin', 'profile'

  useEffect(() => {
    const checkSession = async () => {
      try {
        const savedUser = await AsyncStorage.getItem('ems_user');
        const savedToken = await AsyncStorage.getItem('ems_token');
        if (savedUser && savedToken) {
          setUser(JSON.parse(savedUser));
        }
      } catch (e) {
        console.error('Session restoration error:', e);
      } finally {
        setLoading(false);
      }
    };
    checkSession();
  }, []);

  const handleLogout = async () => {
    await AsyncStorage.removeItem('ems_token');
    await AsyncStorage.removeItem('ems_user');
    setUser(null);
    setCurrentScreen('home');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#38bdf8" />
      </View>
    );
  }

  if (!user) {
    return <LoginScreen onLoginSuccess={(loggedInUser) => setUser(loggedInUser)} />;
  }

  const isSiteAdmin = user.role === 'SiteAdmin';

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Screen Views */}
      <View style={{ flex: 1 }}>
        {currentScreen === 'home' && (
          <HomeScreen
            user={user}
            onLogout={handleLogout}
            onNavigate={(screen) => setCurrentScreen(screen)}
          />
        )}

        {currentScreen === 'notice' && (
          <ShiftNoticeScreen user={user} onBack={() => setCurrentScreen('home')} />
        )}

        {currentScreen === 'payroll' && (
          <PayrollScreen user={user} onBack={() => setCurrentScreen('home')} />
        )}

        {currentScreen === 'maintenance' && (
          <MaintenanceScreen user={user} onBack={() => setCurrentScreen('home')} />
        )}

        {currentScreen === 'admin' && (
          <AdminScreen user={user} onBack={() => setCurrentScreen('home')} />
        )}

        {currentScreen === 'profile' && (
          <ProfileScreen
            user={user}
            onBack={() => setCurrentScreen('home')}
            onUserUpdate={(updatedUser) => setUser(updatedUser)}
          />
        )}
      </View>

      {/* Bottom Navigation Tab Bar (Provides All Web Options & Back Navigation) */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, currentScreen === 'home' && styles.tabActive]}
          onPress={() => setCurrentScreen('home')}
        >
          <Text style={styles.tabIcon}>🏠</Text>
          <Text style={[styles.tabText, currentScreen === 'home' && styles.tabTextActive]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, currentScreen === 'notice' && styles.tabActive]}
          onPress={() => setCurrentScreen('notice')}
        >
          <Text style={styles.tabIcon}>📅</Text>
          <Text style={[styles.tabText, currentScreen === 'notice' && styles.tabTextActive]}>Shifts</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, currentScreen === 'payroll' && styles.tabActive]}
          onPress={() => setCurrentScreen('payroll')}
        >
          <Text style={styles.tabIcon}>💰</Text>
          <Text style={[styles.tabText, currentScreen === 'payroll' && styles.tabTextActive]}>Payroll</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, currentScreen === 'maintenance' && styles.tabActive]}
          onPress={() => setCurrentScreen('maintenance')}
        >
          <Text style={styles.tabIcon}>🔧</Text>
          <Text style={[styles.tabText, currentScreen === 'maintenance' && styles.tabTextActive]}>Cleaning</Text>
        </TouchableOpacity>

        {isSiteAdmin && (
          <TouchableOpacity
            style={[styles.tabItem, currentScreen === 'admin' && styles.tabActive]}
            onPress={() => setCurrentScreen('admin')}
          >
            <Text style={styles.tabIcon}>🛡️</Text>
            <Text style={[styles.tabText, currentScreen === 'admin' && styles.tabTextActive]}>Admin</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.tabItem, currentScreen === 'profile' && styles.tabActive]}
          onPress={() => setCurrentScreen('profile')}
        >
          <Text style={styles.tabIcon}>👤</Text>
          <Text style={[styles.tabText, currentScreen === 'profile' && styles.tabTextActive]}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingVertical: 8,
    paddingHorizontal: 4,
    justifyContent: 'space-around',
  },
  tabItem: {
    alignItems: 'center',
    justify: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  tabIcon: {
    fontSize: 18,
  },
  tabText: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '600',
    marginTop: 2,
  },
  tabTextActive: {
    color: '#38bdf8',
    fontWeight: '800',
  },
});
