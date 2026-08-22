import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import ShiftNoticeScreen from './src/screens/ShiftNoticeScreen';
import ProfileScreen from './src/screens/ProfileScreen';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentScreen, setCurrentScreen] = useState('home'); // 'home', 'notice', 'profile'

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

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {currentScreen === 'home' && (
        <HomeScreen
          user={user}
          onLogout={handleLogout}
          onNavigate={(screen) => setCurrentScreen(screen)}
        />
      )}

      {currentScreen === 'notice' && (
        <ShiftNoticeScreen onBack={() => setCurrentScreen('home')} />
      )}

      {currentScreen === 'profile' && (
        <ProfileScreen
          user={user}
          onBack={() => setCurrentScreen('home')}
          onUserUpdate={(updatedUser) => setUser(updatedUser)}
        />
      )}
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
});
