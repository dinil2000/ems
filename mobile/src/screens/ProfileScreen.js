import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiUrlList } from '../config/api';

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

export default function ProfileScreen({ user, onBack, onUserUpdate }) {
  const profile = user?.employeeProfile || {};
  const [activeTab, setActiveTab] = useState('profile');

  // Profile Form State
  const [name, setName] = useState(profile.name || user.employeeToken);
  const [qualification, setQualification] = useState(profile.qualification || 'ITI');
  const [experienceYears, setExperienceYears] = useState(String(profile.experienceYears || 0));
  const [dailyRate, setDailyRate] = useState(String(profile.dailyRate || 825.94));
  const [gender, setGender] = useState(profile.gender || 'Male');
  const [machineExpertise, setMachineExpertise] = useState(profile.machineExpertise || ['700', '705']);
  const [loading, setLoading] = useState(false);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleToggleMachine = (mId) => {
    if (machineExpertise.includes(mId)) {
      setMachineExpertise(machineExpertise.filter(id => id !== mId));
    } else {
      setMachineExpertise([...machineExpertise, mId]);
    }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      const urls = await getApiUrlList();
      let res = null;
      for (const url of urls) {
        try {
          res = await axios.put(`${url}/employees/${user.employeeProfile?._id || user.employeeToken}`, {
            name,
            qualification,
            experienceYears: parseInt(experienceYears) || 0,
            dailyRate: parseFloat(dailyRate) || 825.94,
            gender,
            machineExpertise,
          }, { timeout: 6000 });
          if (res) break;
        } catch (e) {}
      }

      if (res) {
        const updatedUser = {
          ...user,
          employeeProfile: {
            ...user.employeeProfile,
            name,
            qualification,
            experienceYears: parseInt(experienceYears) || 0,
            dailyRate: parseFloat(dailyRate) || 825.94,
            gender,
            machineExpertise,
          },
        };
        await AsyncStorage.setItem('ems_user', JSON.stringify(updatedUser));
        onUserUpdate(updatedUser);
        Alert.alert('Profile Saved', 'Your profile details & basic rate have been saved successfully.');
      } else {
        Alert.alert('Network Error', 'Unable to connect to server.');
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      Alert.alert('Missing Fields', 'Please enter your current and new password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Password Mismatch', 'New password and confirmation do not match.');
      return;
    }

    setLoading(true);
    try {
      const urls = await getApiUrlList();
      let res = null;
      for (const url of urls) {
        try {
          res = await axios.post(`${url}/auth/change-password`, {
            tokenNo: user.employeeToken,
            currentPassword,
            newPassword,
          }, { timeout: 6000 });
          if (res) break;
        } catch (e) {}
      }

      if (res) {
        Alert.alert('Success', res.data.message);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        Alert.alert('Network Error', 'Unable to connect to server.');
      }
    } catch (err) {
      Alert.alert('Change Password Failed', err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backBtnText}>◀ Back</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>My Profile & Security Settings</Text>
      </View>

      {/* Sub Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'profile' && styles.tabBtnActive]}
          onPress={() => setActiveTab('profile')}
        >
          <Text style={[styles.tabText, activeTab === 'profile' && styles.tabTextActive]}>
            👤 Edit Profile
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'password' && styles.tabBtnActive]}
          onPress={() => setActiveTab('password')}
        >
          <Text style={[styles.tabText, activeTab === 'password' && styles.tabTextActive]}>
            🔒 Change Password
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {activeTab === 'profile' ? (
          <View style={styles.card}>
            <Text style={styles.label}>Punching Token Number</Text>
            <TextInput style={[styles.input, styles.disabledInput]} value={user.employeeToken} editable={false} />

            <Text style={styles.label}>Full Name *</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Enter full name" placeholderTextColor="#64748b" />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Qualification *</Text>
                <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
                  <TouchableOpacity
                    style={[styles.smallToggle, qualification === 'ITI' && styles.smallToggleActive]}
                    onPress={() => setQualification('ITI')}
                  >
                    <Text style={qualification === 'ITI' ? styles.smallToggleTextActive : styles.smallToggleText}>ITI</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.smallToggle, qualification === 'Diploma' && styles.smallToggleActive]}
                    onPress={() => setQualification('Diploma')}
                  >
                    <Text style={qualification === 'Diploma' ? styles.smallToggleTextActive : styles.smallToggleText}>Diploma</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Exp (Years)</Text>
                <TextInput
                  style={styles.input}
                  value={experienceYears}
                  onChangeText={setExperienceYears}
                  keyboardType="numeric"
                  placeholder="Years"
                  placeholderTextColor="#64748b"
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Daily Basic Rate (₹/day) *</Text>
                <TextInput
                  style={styles.input}
                  value={dailyRate}
                  onChangeText={setDailyRate}
                  keyboardType="numeric"
                  placeholder="825.94"
                  placeholderTextColor="#64748b"
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Gender</Text>
                <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
                  <TouchableOpacity
                    style={[styles.smallToggle, gender === 'Male' && styles.smallToggleActive]}
                    onPress={() => setGender('Male')}
                  >
                    <Text style={gender === 'Male' ? styles.smallToggleTextActive : styles.smallToggleText}>Male</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.smallToggle, gender === 'Female' && styles.smallToggleActive]}
                    onPress={() => setGender('Female')}
                  >
                    <Text style={gender === 'Female' ? styles.smallToggleTextActive : styles.smallToggleText}>Female</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <Text style={[styles.label, { color: '#38bdf8', marginTop: 4 }]}>
              Machine Expertise (Which machines do you operate?) *
            </Text>
            <View style={styles.machineGrid}>
              {MPP_MACHINES.map((m) => {
                const isSelected = machineExpertise.includes(m.id);
                return (
                  <TouchableOpacity
                    key={m.id}
                    style={[styles.machineChip, isSelected && styles.machineChipActive]}
                    onPress={() => handleToggleMachine(m.id)}
                  >
                    <Text style={isSelected ? styles.chipTextActive : styles.chipText}>
                      {isSelected ? '☑' : '☐'} #{m.id} ({m.cat})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfile} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>💾 Save Profile Changes</Text>}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.label}>Current Password (Default: admin)</Text>
            <TextInput style={styles.input} secureTextEntry value={currentPassword} onChangeText={setCurrentPassword} placeholder="Enter current password" placeholderTextColor="#64748b" />

            <Text style={styles.label}>New Password</Text>
            <TextInput style={styles.input} secureTextEntry value={newPassword} onChangeText={setNewPassword} placeholder="Enter new password" placeholderTextColor="#64748b" />

            <Text style={styles.label}>Confirm New Password</Text>
            <TextInput style={styles.input} secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Re-enter new password" placeholderTextColor="#64748b" />

            <TouchableOpacity style={styles.saveBtn} onPress={handleChangePassword} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>🔑 Update Password</Text>}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 45,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    backgroundColor: '#1e293b',
  },
  backBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 12,
  },
  backBtnText: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '700',
  },
  topBarTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#f8fafc',
  },
  tabRow: {
    flexDirection: 'row',
    padding: 8,
    gap: 8,
    backgroundColor: '#1e293b',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#0f172a',
  },
  tabBtnActive: {
    backgroundColor: '#0284c7',
  },
  tabText: {
    color: '#94a3b8',
    fontWeight: '600',
    fontSize: 12,
  },
  tabTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
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
  disabledInput: {
    opacity: 0.6,
    backgroundColor: '#090d16',
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
  saveBtn: {
    backgroundColor: '#0284c7',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  btnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
