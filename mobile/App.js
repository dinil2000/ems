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
  const [currentScreen, setCurrentScreen] = useState('home'); // 'home', 'notice', 'history', 'payroll', 'maintenance', 'admin', 'profile'

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

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Top App Bar with Official Keltron Logo, Back & Exit App Buttons */}
      <View style={styles.topAppBar}>
        {currentScreen !== 'home' ? (
          <TouchableOpacity onPress={() => setCurrentScreen('home')} style={styles.appBarBackBtn}>
            <Text style={styles.appBarBackText}>◀ Back to Home</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoText}>KELTRON</Text>
              <Text style={styles.logoSubText}>കെൽട്രോൺ</Text>
            </View>
            <View>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#f8fafc' }}>Keltron MPP EMS</Text>
              <Text style={{ fontSize: 10, color: '#06b6d4', fontWeight: '600' }}>Kannur Plant</Text>
            </View>
          </View>
        )}

        <TouchableOpacity onPress={handleExitApp} style={styles.appBarExitBtn}>
          <Text style={styles.appBarExitText}>🚪 Exit App</Text>
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
            onUserUpdate={(updatedUser) => setUser(updatedUser)}
          />
        )}
      </View>

      {/* Bottom Navigation Tab Bar (Provides All Options & Back Navigation) */}
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
          <Text style={[styles.tabText, currentScreen === 'history' && styles.tabTextActive]}>Punching</Text>
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
  topAppBar: {
    flexDirection: 'row',
    justify: 'space-between',
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
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignItems: 'center',
    justify: 'center',
    borderWidth: 1,
    borderColor: '#38bdf8',
  },
  logoText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  logoSubText: {
    color: '#e0f2fe',
    fontSize: 8,
    fontWeight: '700',
  },
  appBarBackBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  appBarBackText: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '700',
  },
  appBarExitBtn: {
    backgroundColor: 'rgba(244, 63, 94, 0.2)',
    borderColor: '#f43f5e',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  appBarExitText: {
    color: '#f87171',
    fontSize: 12,
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingVertical: 8,
    paddingHorizontal: 2,
    justify: 'space-around',
  },
  tabItem: {
    alignItems: 'center',
    justify: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  tabIcon: {
    fontSize: 17,
  },
  tabText: {
    fontSize: 9,
    color: '#94a3b8',
    fontWeight: '600',
    marginTop: 2,
  },
  tabTextActive: {
    color: '#38bdf8',
    fontWeight: '800',
  },
});
