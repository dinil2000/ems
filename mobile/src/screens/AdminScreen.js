import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import axios from 'axios';
import { getApiUrlList } from '../config/api';

export default function AdminScreen({ user, onBack }) {
  const [usersList, setUsersList] = useState([]);
  const [pendingEmps, setPendingEmps] = useState([]);
  const [supTokenNo, setSupTokenNo] = useState('');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const urls = await getApiUrlList();
      for (const url of urls) {
        try {
          const [uRes, pRes] = await Promise.all([
            axios.get(`${url}/auth/users`),
            axios.get(`${url}/employees/pending`),
          ]);
          setUsersList(uRes.data);
          setPendingEmps(pRes.data);
          break;
        } catch (e) {}
      }
    } catch (err) {
      console.error('Admin data fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePromoteSupervisor = async (tokenNo) => {
    try {
      const urls = await getApiUrlList();
      for (const url of urls) {
        try {
          const res = await axios.post(`${url}/auth/create-supervisor`, { tokenNo });
          Alert.alert('Role Promoted', res.data.message);
          loadData();
          break;
        } catch (e) {}
      }
    } catch (err) {
      Alert.alert('Promotion Failed', err.message);
    }
  };

  const handleDemoteSupervisor = async (tokenNo) => {
    try {
      const urls = await getApiUrlList();
      for (const url of urls) {
        try {
          const res = await axios.post(`${url}/auth/demote-supervisor`, { tokenNo });
          Alert.alert('Role Demoted', res.data.message);
          loadData();
          break;
        } catch (e) {}
      }
    } catch (err) {
      Alert.alert('Demotion Failed', err.message);
    }
  };

  const handleApprovePending = async (empId) => {
    try {
      const urls = await getApiUrlList();
      for (const url of urls) {
        try {
          const res = await axios.post(`${url}/employees/approve/${empId}`, { approvedBy: 'SiteAdmin' });
          Alert.alert('Account Activated', res.data.message);
          loadData();
          break;
        } catch (e) {}
      }
    } catch (err) {
      Alert.alert('Approval Failed', err.message);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header Bar with Back Button */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backBtnText}>◀ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Root Site Admin Portal (/admin)</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Banner Card */}
        <View style={styles.bannerCard}>
          <Text style={styles.bannerTitle}>🛡️ Site Admin Checkpoint Control</Text>
          <Text style={styles.bannerSubtitle}>
            Promote/Demote Supervisors • Approve Accounts • Full System Override
          </Text>
        </View>

        {/* Promote Supervisor by Token Card */}
        <View style={styles.actionCard}>
          <Text style={styles.cardTitle}>Promote Employee to Supervisor</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter Punch Token (e.g. 8709, 3085)"
            placeholderTextColor="#64748b"
            value={supTokenNo}
            onChangeText={setSupTokenNo}
          />
          <TouchableOpacity
            style={styles.promoteBtn}
            onPress={() => {
              if (supTokenNo) {
                handlePromoteSupervisor(supTokenNo);
                setSupTokenNo('');
              } else {
                Alert.alert('Missing Token', 'Please enter an Employee Token Number.');
              }
            }}
          >
            <Text style={styles.promoteBtnText}>⚡ Promote to Supervisor</Text>
          </TouchableOpacity>
        </View>

        {/* Pending Employee Approvals Section */}
        {pendingEmps.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Awaiting Activation ({pendingEmps.length})</Text>
            {pendingEmps.map((emp) => (
              <View key={emp._id} style={styles.pendingRow}>
                <View>
                  <Text style={styles.empName}>{emp.name}</Text>
                  <Text style={styles.empToken}>Token #{emp.tokenNo} • {emp.employmentType}</Text>
                </View>
                <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprovePending(emp._id)}>
                  <Text style={styles.approveBtnText}>Approve</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Staff Role Position Roster */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Registered Staff & Role Positions</Text>
          {loading ? (
            <ActivityIndicator size="large" color="#38bdf8" style={{ marginVertical: 20 }} />
          ) : (
            usersList.map((usr) => (
              <View key={usr._id} style={styles.userRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.empName}>{usr.employeeProfile?.name || 'Site Admin'}</Text>
                  <Text style={styles.empToken}>Token #{usr.employeeToken} • {usr.role}</Text>
                </View>

                {usr.role === 'Supervisor' ? (
                  <TouchableOpacity style={styles.demoteBtn} onPress={() => handleDemoteSupervisor(usr.employeeToken)}>
                    <Text style={styles.demoteBtnText}>Demote to Emp</Text>
                  </TouchableOpacity>
                ) : usr.role === 'Employee' ? (
                  <TouchableOpacity style={styles.smallPromoteBtn} onPress={() => handlePromoteSupervisor(usr.employeeToken)}>
                    <Text style={styles.smallPromoteText}>Promote to Sup</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.rootBadge}>Master Root</Text>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingTop: 50,
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  backBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 12,
  },
  backBtnText: {
    color: '#38bdf8',
    fontSize: 14,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#f8fafc',
  },
  content: {
    padding: 16,
  },
  bannerCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#6366f1',
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#f8fafc',
  },
  bannerSubtitle: {
    fontSize: 12,
    color: '#818cf8',
    marginTop: 4,
  },
  actionCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 10,
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
    marginBottom: 10,
  },
  promoteBtn: {
    backgroundColor: '#0284c7',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  promoteBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  sectionCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 12,
  },
  pendingRow: {
    flexDirection: 'row',
    justify: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  userRow: {
    flexDirection: 'row',
    justify: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  empName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f8fafc',
  },
  empToken: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  approveBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  approveBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  demoteBtn: {
    backgroundColor: '#f43f5e',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  demoteBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  smallPromoteBtn: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  smallPromoteText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  rootBadge: {
    color: '#818cf8',
    fontSize: 12,
    fontWeight: '800',
  },
});
