import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, BackHandler, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Ensure TaskManager background tasks are defined globally at root level
import './src/utils/geofence';
import { setupGeofenceTracking } from './src/utils/geofence';

import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import ShiftNoticeScreen from './src/screens/ShiftNoticeScreen';
import PayrollScreen from './src/screens/PayrollScreen';
import MaintenanceScreen from './src/screens/MaintenanceScreen';
import AdminScreen from './src/screens/AdminScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import AttendanceHistoryScreen from './src/screens/AttendanceHistoryScreen';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentScreen, setCurrentScreen] = useState('home'); // 'home', 'history', 'notice', 'payroll', 'maintenance', 'admin', 'profile'

  // Initialize background geofencing & persistent location service
  useEffect(() => {
    setupGeofenceTracking().catch(e => console.log('Geofence auto-init:', e.message));
  }, []);

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

  // Hardware Back Button Event Listener for Android
  useEffect(() => {
    const onBackPress = () => {
      if (currentScreen !== 'home') {
        setCurrentScreen('home');
        return true;
      } else {
        Alert.alert(
          'Exit Application',
          'Are you sure you want to exit the Keltron EMS application?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Exit App', onPress: () => BackHandler.exitApp() }
          ]
        );
        return true;
      }
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backHandler.remove();
  }, [currentScreen]);

  const handleLogout = async () => {
    await AsyncStorage.removeItem('ems_token');
    await AsyncStorage.removeItem('ems_user');
    setUser(null);
    setCurrentScreen('home');
  };

  const handleExitApp = () => {
    Alert.alert(
      'Exit Application',
      'Are you sure you want to exit the Keltron EMS application?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Exit App', onPress: () => BackHandler.exitApp() }
      ]
    );
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

  const getScreenHeaderTitle = () => {
    switch (currentScreen) {
      case 'history': return '📊 Attendance & Cycle Graph';
      case 'notice': return '📅 Weekly Shift Notice';
      case 'payroll': return '💰 Monthly Payslip & OT';
      case 'maintenance': return '🔧 Machine Cleaning Alerts';
      case 'admin': return '🛡️ Master Admin Console';
      case 'profile': return '👤 Employee Profile';
      default: return 'Keltron MPP EMS';
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Clean Modern Top App Bar */}
      <View style={styles.topAppBar}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>KELTRON</Text>
            <Text style={styles.logoSubText}>കെൽട്രോൺ</Text>
          </View>
          <View>
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#f8fafc' }}>
              {currentScreen === 'home' ? 'Keltron MPP EMS' : getScreenHeaderTitle()}
            </Text>
            <Text style={{ fontSize: 9, color: '#06b6d4', fontWeight: '600' }}>Kannur Unit • 300m Geofence</Text>
          </View>
        </View>

        <TouchableOpacity onPress={handleExitApp} style={styles.appBarExitBtn}>
          <Text style={styles.appBarExitText}>🚪 Exit</Text>
        </TouchableOpacity>
      </View>

      {/* Screen Views */}
      <View style={{ flex: 1 }}>
        {currentScreen === 'home' && (
          <HomeScreen
            user={user}
            onLogout={handleLogout}
            onNavigate={(screen) => setCurrentScreen(screen)}
          />
        )}

        {currentScreen === 'history' && (
          <AttendanceHistoryScreen user={user} onBack={() => setCurrentScreen('home')} />
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
            onNavigate={(screen) => setCurrentScreen(screen)}
            onUserUpdate={(updatedUser) => setUser(updatedUser)}
          />
        )}
      </View>

      {/* ── Beautiful Rearranged 5-Tab Bottom Navigation Bar ─────────── */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, currentScreen === 'home' && styles.tabActive]}
          onPress={() => setCurrentScreen('home')}
        >
          <Text style={styles.tabIcon}>🏠</Text>
          <Text style={[styles.tabText, currentScreen === 'home' && styles.tabTextActive]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, currentScreen === 'history' && styles.tabActive]}
          onPress={() => setCurrentScreen('history')}
        >
          <Text style={styles.tabIcon}>📊</Text>
          <Text style={[styles.tabText, currentScreen === 'history' && styles.tabTextActive]}>Attendance</Text>
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
  topAppBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingTop: 45,
    paddingBottom: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  logoBadge: {
    backgroundColor: '#0284c7',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  logoSubText: {
    color: '#e0f2fe',
    fontSize: 7,
    fontWeight: '700',
  },
  appBarExitBtn: {
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    borderWidth: 1,
    borderColor: '#f43f5e',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  appBarExitText: {
    color: '#f87171',
    fontSize: 11,
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingBottom: 14,
    paddingTop: 6,
    paddingHorizontal: 6,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: 'rgba(2, 132, 199, 0.2)',
    borderTopWidth: 2,
    borderTopColor: '#38bdf8',
  },
  tabIcon: {
    fontSize: 17,
    marginBottom: 2,
  },
  tabText: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#38bdf8',
    fontWeight: '800',
  },
});
