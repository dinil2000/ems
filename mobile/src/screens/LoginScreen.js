import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { VERCEL_CLOUD_API, getApiUrlList } from '../config/api';

export default function LoginScreen({ onLoginSuccess }) {
  const [tokenOrEmail, setTokenOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Server IP Settings State - Default to production Vercel Cloud API
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [serverIp, setServerIp] = useState(VERCEL_CLOUD_API);

  useEffect(() => {
    const loadCustomIp = async () => {
      const savedIp = await AsyncStorage.getItem('ems_custom_api_url');
      if (savedIp) {
        setServerIp(savedIp);
      } else {
        setServerIp(VERCEL_CLOUD_API);
      }
    };
    loadCustomIp();
  }, []);

  const handleSaveServerIp = async () => {
    let formattedIp = serverIp.trim();
    if (!formattedIp.startsWith('http')) {
      formattedIp = `https://${formattedIp}`;
    }
    if (!formattedIp.endsWith('/api')) {
      formattedIp = `${formattedIp.replace(/\/$/, '')}/api`;
    }

    setServerIp(formattedIp);
    await AsyncStorage.setItem('ems_custom_api_url', formattedIp);
    setShowServerConfig(false);
    Alert.alert('Cloud Server URL Saved', `Backend target set to:\n${formattedIp}`);
  };

  const handleLogin = async () => {
    if (!tokenOrEmail || !password) {
      Alert.alert('Missing Fields', 'Please enter your Token Number or Email and Password.');
      return;
    }

    setLoading(true);
    let success = false;
    let errMessage = '';

    const urlList = await getApiUrlList();
    const targetUrls = [serverIp, ...urlList.filter(u => u !== serverIp)];

    for (const url of targetUrls) {
      try {
        const res = await axios.post(`${url}/auth/login`, {
          tokenOrEmail,
          password,
        }, { timeout: 10000 });

        const { token, user } = res.data;
        await AsyncStorage.setItem('ems_token', token);
        await AsyncStorage.setItem('ems_user', JSON.stringify(user));
        await AsyncStorage.setItem('ems_active_api_url', url);
        
        success = true;
        setLoading(false);
        onLoginSuccess(user);
        break;
      } catch (err) {
        errMessage = err.response?.data?.message || err.message;
      }
    }

    if (!success) {
      setLoading(false);
      Alert.alert(
        'Login Connection Error',
        `Unable to connect to cloud server at:\n${serverIp}\n\nError: ${errMessage}\n\nMake sure your phone has mobile data/Wi-Fi connected!`
      );
    }
  };

  const handleQuickFill = (tok, pass) => {
    setTokenOrEmail(tok);
    setPassword(pass);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>⚡</Text>
          </View>
          <Text style={styles.title}>KELTRON MPP EMS</Text>
          <Text style={styles.subtitle}>Mobile Manufacturing Operations Portal</Text>
        </View>

        {/* Login Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sign In to Account</Text>

          <Text style={styles.label}>Employee Token # or Email</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 8709, 3085, or ADMIN01"
            placeholderTextColor="#64748b"
            value={tokenOrEmail}
            onChangeText={setTokenOrEmail}
            autoCapitalize="none"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter password (default: admin)"
            placeholderTextColor="#64748b"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign In to Cloud App</Text>
            )}
          </TouchableOpacity>

          {/* Quick Credentials Assistant */}
          <View style={styles.quickFillContainer}>
            <Text style={styles.quickFillHeader}>🔑 1-Tap Quick Credentials Test:</Text>
            
            <TouchableOpacity
              style={styles.quickChip}
              onPress={() => handleQuickFill('ADMIN01', 'admin')}
            >
              <Text style={styles.quickChipText}>👑 Root Admin: ADMIN01 (pass: admin)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickChip}
              onPress={() => handleQuickFill('3085', 'admin')}
            >
              <Text style={styles.quickChipText}>🛡️ Supervisor: Token 3085 (pass: admin)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickChip}
              onPress={() => handleQuickFill('8709', 'admin')}
            >
              <Text style={styles.quickChipText}>👷 Worker: Token 8709 (pass: admin)</Text>
            </TouchableOpacity>
          </View>

          {/* Server IP Configurator Trigger */}
          <TouchableOpacity
            style={styles.configToggle}
            onPress={() => setShowServerConfig(!showServerConfig)}
          >
            <Text style={styles.configToggleText}>
              🌐 Cloud Backend: {serverIp}
            </Text>
          </TouchableOpacity>

          {showServerConfig && (
            <View style={styles.configBox}>
              <Text style={styles.configTitle}>Backend Server Address</Text>
              <Text style={styles.configDesc}>
                Production Vercel Cloud Server URL:
              </Text>
              <TextInput
                style={styles.input}
                value={serverIp}
                onChangeText={setServerIp}
                placeholder="https://mppems.vercel.app/api"
                placeholderTextColor="#64748b"
                autoCapitalize="none"
              />
              <TouchableOpacity style={styles.saveIpBtn} onPress={handleSaveServerIp}>
                <Text style={styles.saveIpText}>Save Server Address</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <Text style={styles.footerNote}>
          Keltron Component Complex Limited • Production Unit (MPP Section)
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollContent: {
    padding: 20,
    justifyContent: 'center',
    minHeight: '100%',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: '#0284c7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoText: {
    fontSize: 28,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#f8fafc',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#06b6d4',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#f8fafc',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 14,
  },
  button: {
    backgroundColor: '#0284c7',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  quickFillContainer: {
    marginTop: 18,
    backgroundColor: '#090d16',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  quickFillHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38bdf8',
    marginBottom: 8,
  },
  quickChip: {
    backgroundColor: '#1e293b',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 6,
  },
  quickChipText: {
    fontSize: 12,
    color: '#e2e8f0',
    fontWeight: '600',
  },
  configToggle: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 8,
  },
  configToggleText: {
    fontSize: 11,
    color: '#38bdf8',
    fontWeight: '600',
  },
  configBox: {
    marginTop: 10,
    backgroundColor: '#090d16',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#38bdf8',
  },
  configTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 4,
  },
  configDesc: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 10,
  },
  saveIpBtn: {
    backgroundColor: '#10b981',
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: 'center',
  },
  saveIpText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  footerNote: {
    textAlign: 'center',
    fontSize: 11,
    color: '#64748b',
    marginTop: 24,
  },
});
