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
  Modal,
  SafeAreaView,
} from 'react-native';
import axios from 'axios';
import { getApiUrlList } from '../config/api';

const MPP_MACHINES = [
  { id: '700,705', name: 'Winding 700/705', unit: 'Unit 2' },
  { id: '701', name: 'Winding 701', unit: 'Unit 2' },
  { id: '710', name: 'Testing 710', unit: 'Unit 2' },
  { id: '711', name: 'Testing 711', unit: 'Unit 2' },
  { id: '765(1)', name: 'Metalizing 765(1)', unit: 'Unit 2' },
  { id: '765(2)', name: 'Metalizing 765(2)', unit: 'Unit 2' },
  { id: '766', name: 'Metalizing 766', unit: 'Unit 2' },
  { id: '0450', name: 'Winding 0450', unit: 'Unit 1' },
  { id: '0460', name: 'Winding 0460', unit: 'Unit 1' },
  { id: '0480', name: 'Testing 0480', unit: 'Unit 1' },
  { id: '0470', name: 'Metalizing 0470', unit: 'Unit 1' },
];

export default function AdminScreen({ user, onBack }) {
  const [usersList, setUsersList] = useState([]);
  const [pendingEmps, setPendingEmps] = useState([]);
  const [supTokenNo, setSupTokenNo] = useState('');
  const [loading, setLoading] = useState(true);

  // Edit Employee Details Modal State
  const [editingEmp, setEditingEmp] = useState(null);
  const [editName, setEditName] = useState('');
  const [editQual, setEditQual] = useState('ITI');
  const [editExp, setEditExp] = useState('0');
  const [editDailyRate, setEditDailyRate] = useState('825.94');
  const [editBasicSalary, setEditBasicSalary] = useState('0');
  const [editGender, setEditGender] = useState('Male');
  const [editUnit, setEditUnit] = useState('Unit 2');
  const [editMachines, setEditMachines] = useState([]);
  const [savingEdit, setSavingEdit] = useState(false);

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
      let res = null;
      let lastErr = null;
      for (const url of urls) {
        try {
          res = await axios.post(`${url}/auth/create-supervisor`, { tokenNo }, { timeout: 6000 });
          if (res) break;
        } catch (e) {
          lastErr = e.response?.data?.message || e.message;
        }
      }
      if (res) {
        Alert.alert('Role Promoted', res.data.message);
        loadData();
      } else {
        Alert.alert('Promotion Failed', lastErr || 'Unable to connect to server.');
      }
    } catch (err) {
      Alert.alert('Promotion Failed', err.message);
    }
  };

  const handleDemoteSupervisor = async (tokenNo) => {
    Alert.alert(
      'Demote Supervisor',
      `Demote Supervisor Token #${tokenNo} to Employee role?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Demote',
          style: 'destructive',
          onPress: async () => {
            try {
              const urls = await getApiUrlList();
              let res = null;
              let lastErr = null;
              for (const url of urls) {
                try {
                  res = await axios.post(`${url}/auth/demote-supervisor`, { tokenNo }, { timeout: 6000 });
                  if (res) break;
                } catch (e) {
                  lastErr = e.response?.data?.message || e.message;
                }
              }
              if (res) {
                Alert.alert('Role Demoted', res.data.message);
                loadData();
              } else {
                Alert.alert('Demotion Failed', lastErr || 'Unable to connect to server.');
              }
            } catch (err) {
              Alert.alert('Demotion Failed', err.message);
            }
          }
        }
      ]
    );
  };

  const handleApprovePending = async (empId) => {
    try {
      const urls = await getApiUrlList();
      let res = null;
      let lastErr = null;
      for (const url of urls) {
        try {
          res = await axios.post(`${url}/employees/approve/${empId}`, { approvedBy: 'SiteAdmin' }, { timeout: 6000 });
          if (res) break;
        } catch (e) {
          lastErr = e.response?.data?.message || e.message;
        }
      }
      if (res) {
        Alert.alert('Account Activated', res.data.message);
        loadData();
      } else {
        Alert.alert('Approval Failed', lastErr || 'Unable to connect to server.');
      }
    } catch (err) {
      Alert.alert('Approval Failed', err.message);
    }
  };

  const openEditModal = (emp) => {
    setEditingEmp(emp);
    setEditName(emp.name || '');
    setEditQual(emp.qualification || 'ITI');
    setEditExp(String(emp.experienceYears || 0));
    setEditDailyRate(String(emp.dailyRate || 825.94));
    setEditBasicSalary(String(emp.basicSalary || 0));
    setEditGender(emp.gender || 'Male');
    setEditUnit(emp.unit || 'Unit 2');
    setEditMachines(emp.machineExpertise || []);
  };

  const handleToggleEditMachine = (mId) => {
    if (editMachines.includes(mId)) {
      setEditMachines(editMachines.filter(id => id !== mId));
    } else {
      setEditMachines([...editMachines, mId]);
    }
  };

  const handleSaveEmployeeEdits = async () => {
    if (!editingEmp) return;
    setSavingEdit(true);
    try {
      const payload = {
        name: editName,
        qualification: editQual,
        experienceYears: parseInt(editExp) || 0,
        dailyRate: parseFloat(editDailyRate) || 825.94,
        basicSalary: parseFloat(editBasicSalary) || 0,
        gender: editGender,
        unit: editUnit,
        machineExpertise: editMachines,
      };

      const urls = await getApiUrlList();
      let res = null;
      for (const url of urls) {
        try {
          res = await axios.put(`${url}/employees/${editingEmp._id}`, payload, { timeout: 6000 });
          if (res) break;
        } catch (e) {}
      }

      if (res) {
        Alert.alert('Details Saved', `Updated details for ${editName} (Token #${editingEmp.tokenNo}).`);
        setEditingEmp(null);
        loadData();
      } else {
        Alert.alert('Error', 'Unable to connect to server.');
      }
    } catch (err) {
      Alert.alert('Save Failed', err.response?.data?.message || err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Banner Card */}
        <View style={styles.bannerCard}>
          <Text style={styles.bannerTitle}>🛡️ Site Admin Checkpoint Control</Text>
          <Text style={styles.bannerSubtitle}>
            Promote/Demote Roles • Edit Staff Basic Rate & Machine Expertise • Activate Registrations
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
            keyboardType="numeric"
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
                <View style={{ flex: 1 }}>
                  <Text style={styles.empName}>{emp.name}</Text>
                  <Text style={styles.empToken}>Token #{emp.tokenNo} • {emp.employmentType} ({emp.qualification})</Text>
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
          <Text style={styles.sectionTitle}>Staff Roster & Details Control</Text>
          {loading ? (
            <ActivityIndicator size="large" color="#38bdf8" style={{ marginVertical: 20 }} />
          ) : (
            usersList.map((usr) => (
              <View key={usr._id} style={styles.userRow}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.empName}>{usr.employeeProfile?.name || 'Site Admin'}</Text>
                  <Text style={styles.empToken}>
                    Token #{usr.employeeToken} • {usr.role} • Rate: ₹{usr.employeeProfile?.dailyRate || 825.94}/day
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {usr.employeeProfile && (
                    <TouchableOpacity style={styles.editBtn} onPress={() => openEditModal(usr.employeeProfile)}>
                      <Text style={styles.editBtnText}>✏️ Edit</Text>
                    </TouchableOpacity>
                  )}

                  {usr.role === 'Supervisor' ? (
                    <TouchableOpacity style={styles.demoteBtn} onPress={() => handleDemoteSupervisor(usr.employeeToken)}>
                      <Text style={styles.demoteBtnText}>Demote</Text>
                    </TouchableOpacity>
                  ) : usr.role === 'Employee' ? (
                    <TouchableOpacity style={styles.smallPromoteBtn} onPress={() => handlePromoteSupervisor(usr.employeeToken)}>
                      <Text style={styles.smallPromoteText}>Promote</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Edit Employee Details Modal */}
      <Modal visible={!!editingEmp} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Edit: #{editingEmp?.tokenNo} ({editingEmp?.name})
            </Text>
            <TouchableOpacity onPress={() => setEditingEmp(null)} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕ Close</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput style={styles.input} value={editName} onChangeText={setEditName} />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Qualification *</Text>
                <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
                  <TouchableOpacity
                    style={[styles.smallToggle, editQual === 'ITI' && styles.smallToggleActive]}
                    onPress={() => setEditQual('ITI')}
                  >
                    <Text style={editQual === 'ITI' ? styles.smallToggleTextActive : styles.smallToggleText}>ITI</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.smallToggle, editQual === 'Diploma' && styles.smallToggleActive]}
                    onPress={() => setEditQual('Diploma')}
                  >
                    <Text style={editQual === 'Diploma' ? styles.smallToggleTextActive : styles.smallToggleText}>Diploma</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Exp (Years)</Text>
                <TextInput style={styles.input} value={editExp} onChangeText={setEditExp} keyboardType="numeric" />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Daily Basic Rate (₹/day) *</Text>
                <TextInput style={styles.input} value={editDailyRate} onChangeText={setEditDailyRate} keyboardType="numeric" />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Monthly Base (₹)</Text>
                <TextInput style={styles.input} value={editBasicSalary} onChangeText={setEditBasicSalary} keyboardType="numeric" />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Gender</Text>
                <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
                  <TouchableOpacity
                    style={[styles.smallToggle, editGender === 'Male' && styles.smallToggleActive]}
                    onPress={() => setEditGender('Male')}
                  >
                    <Text style={editGender === 'Male' ? styles.smallToggleTextActive : styles.smallToggleText}>Male</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.smallToggle, editGender === 'Female' && styles.smallToggleActive]}
                    onPress={() => setEditGender('Female')}
                  >
                    <Text style={editGender === 'Female' ? styles.smallToggleTextActive : styles.smallToggleText}>Female</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Unit Section</Text>
                <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
                  <TouchableOpacity
                    style={[styles.smallToggle, editUnit === 'Unit 2' && styles.smallToggleActive]}
                    onPress={() => setEditUnit('Unit 2')}
                  >
                    <Text style={editUnit === 'Unit 2' ? styles.smallToggleTextActive : styles.smallToggleText}>Unit 2</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.smallToggle, editUnit === 'Unit 1' && styles.smallToggleActive]}
                    onPress={() => setEditUnit('Unit 1')}
                  >
                    <Text style={editUnit === 'Unit 1' ? styles.smallToggleTextActive : styles.smallToggleText}>Unit 1</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <Text style={[styles.label, { color: '#38bdf8', marginTop: 6 }]}>
              Machine Expertise (Auto-Shift Assignment) *
            </Text>
            <View style={styles.machineGrid}>
              {MPP_MACHINES.map((m) => {
                const isSelected = editMachines.includes(m.id);
                return (
                  <TouchableOpacity
                    key={m.id}
                    style={[styles.machineChip, isSelected && styles.machineChipActive]}
                    onPress={() => handleToggleEditMachine(m.id)}
                  >
                    <Text style={isSelected ? styles.chipTextActive : styles.chipText}>
                      {isSelected ? '☑' : '☐'} #{m.id} ({m.name})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={styles.saveEditBtn} onPress={handleSaveEmployeeEdits} disabled={savingEdit}>
              {savingEdit ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveEditText}>💾 Save Employee Details</Text>}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#f8fafc',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  bannerCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#6366f1',
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#f8fafc',
  },
  bannerSubtitle: {
    fontSize: 12,
    color: '#818cf8',
    marginTop: 2,
  },
  actionCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    marginBottom: 10,
  },
  promoteBtn: {
    backgroundColor: '#0284c7',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  promoteBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  sectionCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 10,
  },
  pendingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  userRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
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
  editBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#38bdf8',
  },
  editBtnText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '700',
  },
  approveBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  approveBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  demoteBtn: {
    backgroundColor: '#f43f5e',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  demoteBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  smallPromoteBtn: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  smallPromoteText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
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
    fontSize: 15,
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
    paddingBottom: 40,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 4,
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
  saveEditBtn: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  saveEditText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
});
