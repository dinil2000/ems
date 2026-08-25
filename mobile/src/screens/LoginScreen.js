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
  Modal,
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { VERCEL_CLOUD_API, getApiUrlList } from '../config/api';

const MPP_MACHINES = [
  { id: '700', name: 'Winding #700', cat: 'Winding' },
  { id: '705', name: 'Winding #705', cat: 'Winding' },
  { id: '701', name: 'Winding #701', cat: 'Winding' },
  { id: '0450', name: 'Winding #0450', cat: 'Winding' },
  { id: '0460', name: 'Winding #0460', cat: 'Winding' },
  { id: '0480', name: 'Testing #0480', cat: 'Testing' },
  { id: '710', name: 'Testing #710', cat: 'Testing' },
  { id: '711', name: 'Testing #711', cat: 'Testing' },
  { id: '0470', name: 'Metalizing #0470', cat: 'Metalizing' },
  { id: '765(1)', name: 'Metalizing #765(1)', cat: 'Metalizing' },
  { id: '765(2)', name: 'Metalizing #765(2)', cat: 'Metalizing' },
  { id: '766', name: 'Metalizing #766', cat: 'Metalizing' },
];

export default function LoginScreen({ onLoginSuccess }) {
  const [tokenOrEmail, setTokenOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Registration Modal State
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [regTokenNo, setRegTokenNo] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('mpp12345');
  const [regType, setRegType] = useState('Permanent');
  const [regQual, setRegQual] = useState('ITI');
  const [regExp, setRegExp] = useState('2');
  const [regGender, setRegGender] = useState('Male');
  const [regDailyRate, setRegDailyRate] = useState('825.94');
  const [regMachines, setRegMachines] = useState(['700', '705']);
  const [regLoading, setRegLoading] = useState(false);

  // Server IP Settings State
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
      Alert.alert('Missing Fields', 'Please enter your Punch Token Number or Email and Password.');
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
        'Login Error',
        `Unable to connect to cloud server:\n${errMessage}`
      );
    }
  };

  const handleToggleRegMachine = (mId) => {
    if (regMachines.includes(mId)) {
      setRegMachines(regMachines.filter(id => id !== mId));
    } else {
      setRegMachines([...regMachines, mId]);
    }
  };

  const handleRegister = async () => {
    if (!regTokenNo || !regName || !regEmail || !regPassword) {
      Alert.alert('Missing Fields', 'Please fill in Token Number, Name, Email, and Password.');
      return;
    }
    if (regMachines.length === 0) {
      Alert.alert('Select Machine', 'Select at least one machine from the MPP list.');
      return;
    }

    setRegLoading(true);
    try {
      const calculatedSalary = regQual === 'Diploma'
        ? 24000 + (parseInt(regExp) || 0) * 2000
        : 18000 + (parseInt(regExp) || 0) * 1500;

      const rate = regDailyRate ? parseFloat(regDailyRate) : Math.round((calculatedSalary / 26) * 100) / 100;

      const payload = {
        tokenNo: regTokenNo,
        name: regName,
        email: regEmail,
        password: regPassword,
        employmentType: regType,
        qualification: regQual,
        experienceYears: parseInt(regExp) || 0,
        gender: regGender,
        dailyRate: rate,
        basicSalary: calculatedSalary,
        unit: 'Unit 2',
        machineExpertise: regMachines,
        role: 'Employee'
      };

      const urls = await getApiUrlList();
      let res = null;
      for (const url of urls) {
        try {
          res = await axios.post(`${url}/auth/register`, payload, { timeout: 8000 });
          if (res) break;
        } catch (e) {}
      }

      if (res) {
        Alert.alert(
          'Registration Successful!',
          `Account for Token #${regTokenNo} (${regName}) created. Pending activation by Supervisor/Admin.`
        );
        setIsRegisterOpen(false);
        setTokenOrEmail(regTokenNo);
        setPassword(regPassword);
      } else {
        Alert.alert('Registration Failed', 'Unable to connect to server.');
      }
    } catch (err) {
      Alert.alert('Registration Error', err.response?.data?.message || err.message);
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header with Keltron Emblem Logo */}
        <View style={styles.headerContainer}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>KELTRON</Text>
            <Text style={styles.logoSubText}>കെൽട്രോൺ</Text>
          </View>
          <Text style={styles.title}>KELTRON MPP EMS</Text>
          <Text style={styles.subtitle}>Production Centre - I • Kannur Campus</Text>
        </View>

        {/* Login Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sign In to EMS Account</Text>

          <Text style={styles.label}>Employee Punch Token # or Username</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter Token (e.g. 8709, 3085) or admin"
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
              <Text style={styles.buttonText}>Sign In to App</Text>
            )}
          </TouchableOpacity>

          {/* Register New Employee Button */}
          <TouchableOpacity
            style={styles.registerBtn}
            onPress={() => setIsRegisterOpen(true)}
          >
            <Text style={styles.registerBtnText}>➕ Register New Employee Profile</Text>
          </TouchableOpacity>

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

      {/* Registration Modal */}
      <Modal visible={isRegisterOpen} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Register New MPP Employee</Text>
            <TouchableOpacity onPress={() => setIsRegisterOpen(false)} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕ Close</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            <View style={styles.noticeBanner}>
              <Text style={styles.noticeBannerText}>
                🛡️ Note: Registered profiles are assigned Employee role and activated upon supervisor verification.
              </Text>
            </View>

            <Text style={styles.label}>Employee Token / ID # *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 9903"
              placeholderTextColor="#64748b"
              value={regTokenNo}
              onChangeText={setRegTokenNo}
            />

            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Rajesh Nair"
              placeholderTextColor="#64748b"
              value={regName}
              onChangeText={setRegName}
            />

            <Text style={styles.label}>Email Address *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. rajesh@keltron.co.in"
              placeholderTextColor="#64748b"
              value={regEmail}
              onChangeText={setRegEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.label}>Account Password *</Text>
            <TextInput
              style={styles.input}
              value={regPassword}
              onChangeText={setRegPassword}
              secureTextEntry
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Qualification *</Text>
                <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
                  <TouchableOpacity
                    style={[styles.smallToggle, regQual === 'ITI' && styles.smallToggleActive]}
                    onPress={() => setRegQual('ITI')}
                  >
                    <Text style={regQual === 'ITI' ? styles.smallToggleTextActive : styles.smallToggleText}>ITI</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.smallToggle, regQual === 'Diploma' && styles.smallToggleActive]}
                    onPress={() => setRegQual('Diploma')}
                  >
                    <Text style={regQual === 'Diploma' ? styles.smallToggleTextActive : styles.smallToggleText}>Diploma</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Exp (Years)</Text>
                <TextInput
                  style={styles.input}
                  value={regExp}
                  onChangeText={setRegExp}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Daily Basic Rate (₹/day) *</Text>
                <TextInput
                  style={styles.input}
                  value={regDailyRate}
                  onChangeText={setRegDailyRate}
                  keyboardType="numeric"
                  placeholder="825.94"
                  placeholderTextColor="#64748b"
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Gender</Text>
                <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
                  <TouchableOpacity
                    style={[styles.smallToggle, regGender === 'Male' && styles.smallToggleActive]}
                    onPress={() => setRegGender('Male')}
                  >
                    <Text style={regGender === 'Male' ? styles.smallToggleTextActive : styles.smallToggleText}>Male</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.smallToggle, regGender === 'Female' && styles.smallToggleActive]}
                    onPress={() => setRegGender('Female')}
                  >
                    <Text style={regGender === 'Female' ? styles.smallToggleTextActive : styles.smallToggleText}>Female</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <Text style={[styles.label, { color: '#38bdf8', marginTop: 6 }]}>
              Machine Expertise (Select machines you can operate) *
            </Text>
            <View style={styles.machineGrid}>
              {MPP_MACHINES.map((m) => {
                const isSelected = regMachines.includes(m.id);
                return (
                  <TouchableOpacity
                    key={m.id}
                    style={[styles.machineChip, isSelected && styles.machineChipActive]}
                    onPress={() => handleToggleRegMachine(m.id)}
                  >
                    <Text style={isSelected ? styles.chipTextActive : styles.chipText}>
                      {isSelected ? '☑' : '☐'} #{m.id} ({m.cat})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={styles.submitRegBtn} onPress={handleRegister} disabled={regLoading}>
              {regLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitRegText}>Submit Registration Profile</Text>}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
    marginBottom: 20,
  },
  logoBadge: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#38bdf8',
  },
  logoText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 1,
  },
  logoSubText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#e0f2fe',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#f8fafc',
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#06b6d4',
    marginTop: 2,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#0284c7',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  registerBtn: {
    backgroundColor: '#334155',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#06b6d4',
  },
  registerBtnText: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '700',
  },
  configToggle: {
    marginTop: 14,
    alignItems: 'center',
  },
  configToggleText: {
    fontSize: 11,
    color: '#38bdf8',
  },
  configBox: {
    marginTop: 10,
    backgroundColor: '#090d16',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#38bdf8',
  },
  configTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 4,
  },
  saveIpBtn: {
    backgroundColor: '#10b981',
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
  },
  saveIpText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  footerNote: {
    textAlign: 'center',
    fontSize: 11,
    color: '#64748b',
    marginTop: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    backgroundColor: '#1e293b',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#f8fafc',
  },
  closeBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  closeBtnText: {
    color: '#f87171',
    fontWeight: '700',
    fontSize: 12,
  },
  modalContent: {
    padding: 16,
  },
  noticeBanner: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: '#f59e0b',
    padding: 10,
    borderRadius: 8,
    marginBottom: 14,
  },
  noticeBannerText: {
    color: '#fbbf24',
    fontSize: 12,
    lineHeight: 16,
  },
  smallToggle: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  smallToggleActive: {
    backgroundColor: '#0284c7',
    borderColor: '#38bdf8',
  },
  smallToggleText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  smallToggleTextActive: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  machineGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    backgroundColor: '#090d16',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  machineChip: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  machineChipActive: {
    backgroundColor: 'rgba(6, 182, 212, 0.2)',
    borderColor: '#06b6d4',
  },
  chipText: {
    color: '#94a3b8',
    fontSize: 11,
  },
  chipTextActive: {
    color: '#22d3ee',
    fontSize: 11,
    fontWeight: '700',
  },
  submitRegBtn: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 30,
  },
  submitRegText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
});
