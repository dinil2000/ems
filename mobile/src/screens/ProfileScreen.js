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
import { API_BASE, FALLBACK_API_BASE } from '../config/api';

export default function ProfileScreen({ user, onBack, onUserUpdate }) {
  const profile = user?.employeeProfile || {};
  const [activeTab, setActiveTab] = useState('profile');

  // Profile Form
  const [name, setName] = useState(profile.name || user.employeeToken);
  const [qualification, setQualification] = useState(profile.qualification || 'ITI');
  const [experienceYears, setExperienceYears] = useState(String(profile.experienceYears || 0));
  const [loading, setLoading] = useState(false);

  // Password Form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      const urls = [API_BASE, FALLBACK_API_BASE, 'http://localhost:5000/api'];
      let res = null;
      for (const url of urls) {
        try {
          res = await axios.put(`${url}/employees/${user.employeeProfile?._id || user.employeeToken}`, {
            name,
            qualification,
            experienceYears: parseInt(experienceYears) || 0,
          });
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
          },
        };
        await AsyncStorage.setItem('ems_user', JSON.stringify(updatedUser));
        onUserUpdate(updatedUser);
        Alert.alert('Profile Updated', 'Your profile details have been saved successfully.');
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
      const urls = [API_BASE, FALLBACK_API_BASE, 'http://localhost:5000/api'];
      let res = null;
      for (const url of urls) {
        try {
          res = await axios.post(`${url}/auth/change-password`, {
            tokenNo: user.employeeToken,
            currentPassword,
            newPassword,
          });
          if (res) break;
        } catch (e) {}
      }

      if (res) {
        Alert.alert('Success', res.data.message);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
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
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Profile & Security</Text>
      </View>

      {/* Sub Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'profile' && styles.tabBtnActive]}
          onPress={() => setActiveTab('profile')}
        >
          <Text style={[styles.tabText, activeTab === 'profile' && styles.tabTextActive]}>
            Edit Profile
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'password' && styles.tabBtnActive]}
          onPress={() => setActiveTab('password')}
        >
          <Text style={[styles.tabText, activeTab === 'password' && styles.tabTextActive]}>
            Change Password
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {activeTab === 'profile' ? (
          <View style={styles.card}>
            <Text style={styles.label}>Punching Token Number</Text>
            <TextInput style={[styles.input, styles.disabledInput]} value={user.employeeToken} editable={false} />

            <Text style={styles.label}>Full Name</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Enter full name" placeholderTextColor="#64748b" />

            <Text style={styles.label}>Qualification</Text>
            <TextInput style={styles.input} value={qualification} onChangeText={setQualification} placeholder="ITI or Diploma" placeholderTextColor="#64748b" />

            <Text style={styles.label}>Experience Years</Text>
            <TextInput style={styles.input} value={experienceYears} onChangeText={setExperienceYears} keyboardType="numeric" placeholder="Years of experience" placeholderTextColor="#64748b" />

            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfile} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Save Profile Details</Text>}
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
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Update Password</Text>}
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  backBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 14,
  },
  backBtnText: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '600',
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#f8fafc',
  },
  tabRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 10,
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
    fontSize: 13,
  },
  tabTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  content: {
    padding: 16,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
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
  disabledInput: {
    opacity: 0.6,
  },
  saveBtn: {
    backgroundColor: '#0284c7',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  btnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
