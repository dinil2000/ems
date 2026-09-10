import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import axios from 'axios';
import { getApiUrlList } from '../config/api';

const MPP_MACHINES = [
  { id: 'ALL', name: 'All Machines' },
  { id: '700', name: 'Winding #700', unit: 'Unit 2', type: 'Winding' },
  { id: '705', name: 'Winding #705', unit: 'Unit 2', type: 'Winding' },
  { id: '701', name: 'Winding #701', unit: 'Unit 2', type: 'Winding' },
  { id: '710', name: 'Testing #710', unit: 'Unit 2', type: 'Testing' },
  { id: '711', name: 'Testing #711', unit: 'Unit 2', type: 'Testing' },
  { id: '765(1)', name: 'Metalizing #765(1)', unit: 'Unit 2', type: 'Metalizing' },
  { id: '765(2)', name: 'Metalizing #765(2)', unit: 'Unit 2', type: 'Metalizing' },
  { id: '766', name: 'Metalizing #766', unit: 'Unit 2', type: 'Metalizing' },
  { id: '0450', name: 'Winding #0450', unit: 'Unit 1', type: 'Winding' },
  { id: '0460', name: 'Winding #0460', unit: 'Unit 1', type: 'Winding' },
  { id: '0470', name: 'Metalizing #0470', unit: 'Unit 1', type: 'Metalizing' },
  { id: '0480', name: 'Testing #0480', unit: 'Unit 1', type: 'Testing' },
];

export default function MachineLogScreen({ user, onBack }) {
  const isSupervisorOrAdmin = user?.role === 'Supervisor' || user?.role === 'SiteAdmin';
  const employeeToken = user?.employeeToken || '';
  const employeeName = user?.employeeProfile?.name || `Token #${employeeToken}`;

  const [selectedMachine, setSelectedMachine] = useState('ALL');
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'pending', 'my'
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // New Log Entry Modal
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [editingLogId, setEditingLogId] = useState(null);
  const [prevSupervisorNote, setPrevSupervisorNote] = useState('');

  const [formMachineId, setFormMachineId] = useState('700');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formShift, setFormShift] = useState('1');
  const [formPartNo, setFormPartNo] = useState('');
  const [formRating, setFormRating] = useState('');
  const [formWorkOrderNo, setFormWorkOrderNo] = useState('');
  const [formRouteCardNo, setFormRouteCardNo] = useState('');
  const [formQuantity, setFormQuantity] = useState('');
  const [formRemarks, setFormRemarks] = useState('');

  // Supervisor Verification Modal
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [verifyingLog, setVerifyingLog] = useState(null);
  const [verifyStatus, setVerifyStatus] = useState('Approved');
  const [supervisorNotes, setSupervisorNotes] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const urls = await getApiUrlList();
      let res = null;
      for (const url of urls) {
        try {
          const endpoint = selectedMachine === 'ALL'
            ? `${url}/machine-logs`
            : `${url}/machine-logs?machineId=${encodeURIComponent(selectedMachine)}`;
          res = await axios.get(endpoint, { timeout: 6000 });
          if (res && res.data) break;
        } catch (e) {}
      }

      if (res && res.data) {
        setLogs(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch machine logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [selectedMachine]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchLogs();
    setRefreshing(false);
  };

  const handleOpenNewEntry = () => {
    setEditingLogId(null);
    setPrevSupervisorNote('');
    setFormMachineId(selectedMachine !== 'ALL' ? selectedMachine : '700');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormShift('1');
    setFormPartNo('');
    setFormRating('');
    setFormWorkOrderNo('');
    setFormRouteCardNo('');
    setFormQuantity('');
    setFormRemarks('');
    setIsEntryModalOpen(true);
  };

  const handleOpenEdit = (log) => {
    setEditingLogId(log._id);
    setPrevSupervisorNote(log.supervisorNotes || '');
    setFormMachineId(log.machineId);
    setFormDate(log.date);
    setFormShift(log.shift);
    setFormPartNo(log.partNo || '');
    setFormRating(log.rating || '');
    setFormWorkOrderNo(log.workOrderNo || '');
    setFormRouteCardNo(log.routeCardNo || '');
    setFormQuantity(String(log.quantity));
    setFormRemarks(log.remarks || '');
    setIsEntryModalOpen(true);
  };

  const handleSaveEntry = async () => {
    if (!formQuantity || isNaN(formQuantity) || Number(formQuantity) <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid positive quantity.');
      return;
    }

    setActionLoading(true);
    try {
      const urls = await getApiUrlList();
      let res = null;

      const payload = {
        machineId: formMachineId,
        operatorToken: employeeToken,
        operatorName: employeeName,
        date: formDate,
        shift: formShift,
        partNo: formPartNo,
        rating: formRating,
        workOrderNo: formWorkOrderNo,
        routeCardNo: formRouteCardNo,
        quantity: Number(formQuantity),
        remarks: formRemarks,
      };

      for (const url of urls) {
        try {
          if (editingLogId) {
            res = await axios.put(`${url}/machine-logs/${editingLogId}`, payload, { timeout: 6000 });
          } else {
            res = await axios.post(`${url}/machine-logs`, payload, { timeout: 6000 });
          }
          if (res) break;
        } catch (e) {}
      }

      if (res) {
        Alert.alert(
          editingLogId ? 'Log Resubmitted' : 'Log Created',
          res.data.message || 'Log entry submitted. Supervisor will verify the quantity.'
        );
        setIsEntryModalOpen(false);
        await fetchLogs();
      } else {
        Alert.alert('Error', 'Unable to connect to server. Please check your network.');
      }
    } catch (err) {
      Alert.alert('Submission Failed', err.response?.data?.message || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenVerify = (log) => {
    setVerifyingLog(log);
    setVerifyStatus('Approved');
    setSupervisorNotes(log.supervisorNotes || '');
    setIsVerifyModalOpen(true);
  };

  const handleSubmitVerification = async () => {
    if (!verifyingLog) return;
    if (verifyStatus === 'Rejected' && !supervisorNotes.trim()) {
      Alert.alert('Note Required', 'Please enter feedback/reason for returning this log to the employee.');
      return;
    }

    setActionLoading(true);
    try {
      const urls = await getApiUrlList();
      let res = null;
      for (const url of urls) {
        try {
          res = await axios.put(`${url}/machine-logs/${verifyingLog._id}/verify`, {
            status: verifyStatus,
            supervisorNotes: supervisorNotes.trim(),
            supervisorToken: employeeToken,
            supervisorName: employeeName,
          }, { timeout: 6000 });
          if (res) break;
        } catch (e) {}
      }

      if (res) {
        Alert.alert(
          verifyStatus === 'Approved' ? '✅ Log Approved' : '⚠️ Log Returned to Employee',
          verifyStatus === 'Approved'
            ? 'Production quantity verified and approved into machine log book.'
            : 'Log entry returned to employee with your feedback note.'
        );
        setIsVerifyModalOpen(false);
        await fetchLogs();
      } else {
        Alert.alert('Error', 'Unable to connect to server.');
      }
    } catch (err) {
      Alert.alert('Verification Failed', err.response?.data?.message || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteLog = (logId) => {
    Alert.alert(
      'Delete Log Entry',
      'Are you sure you want to delete this log book entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const urls = await getApiUrlList();
              for (const url of urls) {
                try {
                  await axios.delete(`${url}/machine-logs/${logId}`);
                  break;
                } catch (e) {}
              }
              await fetchLogs();
            } catch (err) {
              Alert.alert('Delete Failed', err.message);
            }
          }
        }
      ]
    );
  };

  // Filter logs for tabs
  const pendingLogs = logs.filter(l => l.status === 'Pending Approval');
  const myLogs = logs.filter(l => l.operatorToken === employeeToken);
  const displayedLogs = activeTab === 'pending'
    ? pendingLogs
    : activeTab === 'my'
    ? myLogs
    : logs;

  const totalQuantity = displayedLogs.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backBtn}>
              <Text style={{ color: '#38bdf8', fontSize: 18, fontWeight: '700' }}>←</Text>
            </TouchableOpacity>
          )}
          <View>
            <Text style={styles.headerTitle}>📖 KCCL Machine Log Book</Text>
            <Text style={styles.headerSubtitle}>Form 1620135 Rev.0 • MPP Production Logs</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.addBtn} onPress={handleOpenNewEntry}>
          <Text style={styles.addBtnText}>➕ Add Log</Text>
        </TouchableOpacity>
      </View>

      {/* Machine Selector Pills */}
      <View style={styles.machineSelectorContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 6 }}>
          {MPP_MACHINES.map(m => (
            <TouchableOpacity
              key={m.id}
              style={[
                styles.machinePill,
                selectedMachine === m.id && styles.machinePillActive,
              ]}
              onPress={() => setSelectedMachine(m.id)}
            >
              <Text
                style={[
                  styles.machinePillText,
                  selectedMachine === m.id && styles.machinePillTextActive,
                ]}
              >
                {m.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Sub Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'all' && styles.tabItemActive]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
            All Logs ({logs.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'pending' && styles.tabItemActive]}
          onPress={() => setActiveTab('pending')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
              Pending
            </Text>
            {pendingLogs.length > 0 && (
              <View style={styles.badgeCount}>
                <Text style={styles.badgeCountText}>{pendingLogs.length}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'my' && styles.tabItemActive]}
          onPress={() => setActiveTab('my')}
        >
          <Text style={[styles.tabText, activeTab === 'my' && styles.tabTextActive]}>
            My Entries ({myLogs.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Overview Stat Strip */}
      <View style={styles.statStrip}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{displayedLogs.length}</Text>
          <Text style={styles.statLabel}>ENTRIES</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: '#34d399' }]}>
            {totalQuantity.toLocaleString()}
          </Text>
          <Text style={styles.statLabel}>TOTAL QUANTITY</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: pendingLogs.length > 0 ? '#fbbf24' : '#94a3b8' }]}>
            {pendingLogs.length}
          </Text>
          <Text style={styles.statLabel}>AWAITING APPROVAL</Text>
        </View>
      </View>

      {/* Main List */}
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#38bdf8" />}
      >
        {loading ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#38bdf8" />
            <Text style={{ color: '#94a3b8', marginTop: 12, fontSize: 13 }}>Loading machine log book...</Text>
          </View>
        ) : displayedLogs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={{ fontSize: 36, marginBottom: 10 }}>📖</Text>
            <Text style={{ color: '#f8fafc', fontSize: 16, fontWeight: '700' }}>No Log Entries Found</Text>
            <Text style={{ color: '#94a3b8', fontSize: 13, marginTop: 4, textAlign: 'center' }}>
              {activeTab === 'pending'
                ? 'Great! All machine logs are verified.'
                : activeTab === 'my'
                ? "You haven't submitted any production logs yet."
                : 'No logs recorded for this machine selection.'}
            </Text>
            <TouchableOpacity style={styles.emptyAddBtn} onPress={handleOpenNewEntry}>
              <Text style={{ color: '#0284c7', fontWeight: '700' }}>➕ Record Production Batch</Text>
            </TouchableOpacity>
          </View>
        ) : (
          displayedLogs.map((log) => {
            const isApproved = log.status === 'Approved';
            const isRejected = log.status === 'Rejected' || log.status === 'Needs Correction';
            const isPending = log.status === 'Pending Approval';
            const isCreator = log.operatorToken === employeeToken;

            return (
              <View
                key={log._id}
                style={[
                  styles.logCard,
                  isRejected && styles.logCardRejected,
                  isApproved && styles.logCardApproved,
                ]}
              >
                {/* Supervisor Feedback Banner if Rejected */}
                {isRejected && (
                  <View style={styles.rejectedBanner}>
                    <Text style={styles.rejectedBannerTitle}>
                      ⚠️ Supervisor Returned this Log:
                    </Text>
                    <Text style={styles.rejectedBannerText}>
                      "{log.supervisorNotes || 'Quantity or details mismatch. Please verify and resubmit.'}"
                    </Text>
                    {isCreator && (
                      <TouchableOpacity
                        style={styles.resubmitMiniBtn}
                        onPress={() => handleOpenEdit(log)}
                      >
                        <Text style={styles.resubmitMiniBtnText}>✏️ Correct & Resubmit</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* Card Header: Machine, Shift, Date & Status */}
                <View style={styles.cardHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={styles.machineTag}>
                      <Text style={styles.machineTagText}>#{log.machineId}</Text>
                    </View>
                    <View style={styles.shiftTag}>
                      <Text style={styles.shiftTagText}>Shift {log.shift}</Text>
                    </View>
                    <Text style={styles.cardDate}>{log.date}</Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      isApproved && styles.statusApproved,
                      isRejected && styles.statusRejected,
                      isPending && styles.statusPending,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        isApproved && { color: '#34d399' },
                        isRejected && { color: '#f87171' },
                        isPending && { color: '#fbbf24' },
                      ]}
                    >
                      {isApproved ? '✅ Verified' : isRejected ? '❌ Rejected' : '⏳ Pending'}
                    </Text>
                  </View>
                </View>

                {/* 8-Column Grid Details */}
                <View style={styles.gridContainer}>
                  <View style={styles.gridItem}>
                    <Text style={styles.gridLabel}>QUANTITY</Text>
                    <Text style={styles.gridValueQuantity}>{log.quantity}</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text style={styles.gridLabel}>P.NO. (PART NO.)</Text>
                    <Text style={styles.gridValue}>{log.partNo || '-'}</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text style={styles.gridLabel}>RATING</Text>
                    <Text style={[styles.gridValue, { color: '#38bdf8' }]}>{log.rating || '-'}</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text style={styles.gridLabel}>W.O. NO.</Text>
                    <Text style={styles.gridValue}>{log.workOrderNo || '-'}</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text style={styles.gridLabel}>R.C. NO.</Text>
                    <Text style={styles.gridValue}>{log.routeCardNo || '-'}</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text style={styles.gridLabel}>OPERATOR</Text>
                    <Text style={styles.gridValue}>
                      {log.operatorName} (#{log.operatorToken})
                    </Text>
                  </View>
                </View>

                {/* Remarks & Verification Info */}
                {log.remarks ? (
                  <View style={styles.remarksBox}>
                    <Text style={styles.remarksLabel}>Remarks:</Text>
                    <Text style={styles.remarksText}>{log.remarks}</Text>
                  </View>
                ) : null}

                {log.verifiedBy?.name && (
                  <View style={styles.verifiedInfo}>
                    <Text style={styles.verifiedInfoText}>
                      Verified by: {log.verifiedBy.name} ({new Date(log.verifiedBy.verifiedAt).toLocaleDateString()})
                    </Text>
                  </View>
                )}

                {/* Actions Footer */}
                <View style={styles.cardFooter}>
                  {/* Supervisor Verification Action */}
                  {isSupervisorOrAdmin && isPending && (
                    <TouchableOpacity
                      style={styles.verifyBtn}
                      onPress={() => handleOpenVerify(log)}
                    >
                      <Text style={styles.verifyBtnText}>🛡️ Verify / Approve Log</Text>
                    </TouchableOpacity>
                  )}

                  {/* Creator Actions: Edit / Delete */}
                  {(isCreator || isSupervisorOrAdmin) && isPending && (
                    <View style={{ flexDirection: 'row', gap: 6, marginLeft: 'auto' }}>
                      <TouchableOpacity
                        style={styles.editBtn}
                        onPress={() => handleOpenEdit(log)}
                      >
                        <Text style={styles.editBtnText}>✏️ Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => handleDeleteLog(log._id)}
                      >
                        <Text style={styles.deleteBtnText}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* ── Add / Edit Log Entry Modal ─────────────────────────────── */}
      <Modal
        visible={isEntryModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsEntryModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {editingLogId ? '✏️ Edit & Resubmit Log' : '➕ Record Machine Production'}
                </Text>
                <Text style={styles.modalSubtitle}>KCCL Machine Log Book • Form 1620135</Text>
              </View>
              <TouchableOpacity onPress={() => setIsEntryModalOpen(false)} style={styles.modalCloseBtn}>
                <Text style={{ color: '#94a3b8', fontSize: 18, fontWeight: '700' }}>✕</Text>
              </TouchableOpacity>
            </View>

            {prevSupervisorNote ? (
              <View style={styles.modalFeedbackAlert}>
                <Text style={styles.modalFeedbackTitle}>⚠️ Supervisor Feedback:</Text>
                <Text style={styles.modalFeedbackBody}>"{prevSupervisorNote}"</Text>
              </View>
            ) : null}

            <ScrollView style={{ maxHeight: 420 }}>
              {/* Machine Picker */}
              <Text style={styles.inputLabel}>Select Machine *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {MPP_MACHINES.filter(m => m.id !== 'ALL').map(m => (
                    <TouchableOpacity
                      key={m.id}
                      style={[
                        styles.formMachinePill,
                        formMachineId === m.id && styles.formMachinePillActive,
                      ]}
                      onPress={() => setFormMachineId(m.id)}
                    >
                      <Text
                        style={[
                          styles.formMachinePillText,
                          formMachineId === m.id && styles.formMachinePillTextActive,
                        ]}
                      >
                        #{m.id} ({m.type})
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Date (YYYY-MM-DD) *</Text>
                  <TextInput
                    style={styles.input}
                    value={formDate}
                    onChangeText={setFormDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#64748b"
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Shift *</Text>
                  <View style={{ flexDirection: 'row', gap: 4 }}>
                    {['1', '2', '3', 'G'].map(sh => (
                      <TouchableOpacity
                        key={sh}
                        style={[
                          styles.shiftBtn,
                          formShift === sh && styles.shiftBtnActive,
                        ]}
                        onPress={() => setFormShift(sh)}
                      >
                        <Text
                          style={[
                            styles.shiftBtnText,
                            formShift === sh && styles.shiftBtnTextActive,
                          ]}
                        >
                          {sh}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              {/* Quantity - Prominent */}
              <Text style={styles.inputLabel}>Quantity (Qty) *</Text>
              <TextInput
                style={[styles.input, { borderColor: '#38bdf8', fontSize: 18, fontWeight: '700', color: '#38bdf8' }]}
                value={formQuantity}
                onChangeText={setFormQuantity}
                keyboardType="numeric"
                placeholder="e.g. 1500"
                placeholderTextColor="#64748b"
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>P.No. (Part Number)</Text>
                  <TextInput
                    style={styles.input}
                    value={formPartNo}
                    onChangeText={setFormPartNo}
                    placeholder="e.g. PN-401"
                    placeholderTextColor="#64748b"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Rating</Text>
                  <TextInput
                    style={styles.input}
                    value={formRating}
                    onChangeText={setFormRating}
                    placeholder="e.g. 2.5uF 440V"
                    placeholderTextColor="#64748b"
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>W.O. No. (Work Order)</Text>
                  <TextInput
                    style={styles.input}
                    value={formWorkOrderNo}
                    onChangeText={setFormWorkOrderNo}
                    placeholder="e.g. WO-9821"
                    placeholderTextColor="#64748b"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>R.C. No. (Route Card)</Text>
                  <TextInput
                    style={styles.input}
                    value={formRouteCardNo}
                    onChangeText={setFormRouteCardNo}
                    placeholder="e.g. RC-441"
                    placeholderTextColor="#64748b"
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Remarks</Text>
              <TextInput
                style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
                value={formRemarks}
                onChangeText={setFormRemarks}
                multiline
                placeholder="Any comments, batch notes, or remarks..."
                placeholderTextColor="#64748b"
              />
            </ScrollView>

            <TouchableOpacity
              style={styles.modalSubmitBtn}
              onPress={handleSaveEntry}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.modalSubmitBtnText}>
                  {editingLogId ? '✅ Resubmit for Supervisor Verification' : '📤 Submit to Log Book'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Supervisor Verification Modal ──────────────────────────── */}
      <Modal
        visible={isVerifyModalOpen}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsVerifyModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>🛡️ Verify Machine Log</Text>
                <Text style={styles.modalSubtitle}>
                  Machine #{verifyingLog?.machineId} • Shift {verifyingLog?.shift} • {verifyingLog?.date}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsVerifyModalOpen(false)} style={styles.modalCloseBtn}>
                <Text style={{ color: '#94a3b8', fontSize: 18, fontWeight: '700' }}>✕</Text>
              </TouchableOpacity>
            </View>

            {verifyingLog && (
              <View style={styles.verifySummaryBox}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ color: '#94a3b8', fontSize: 12 }}>Operator:</Text>
                  <Text style={{ color: '#f8fafc', fontWeight: '700', fontSize: 12 }}>
                    {verifyingLog.operatorName} (#{verifyingLog.operatorToken})
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ color: '#94a3b8', fontSize: 12 }}>Batch Details:</Text>
                  <Text style={{ color: '#38bdf8', fontSize: 12 }}>
                    {verifyingLog.partNo || '-'} | {verifyingLog.rating || '-'}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ color: '#94a3b8', fontSize: 12 }}>W.O. / R.C.:</Text>
                  <Text style={{ color: '#f8fafc', fontSize: 12 }}>
                    WO: {verifyingLog.workOrderNo || '-'} | RC: {verifyingLog.routeCardNo || '-'}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#334155', paddingTop: 6 }}>
                  <Text style={{ color: '#94a3b8', fontSize: 13, fontWeight: '700' }}>Reported Quantity:</Text>
                  <Text style={{ color: '#34d399', fontSize: 16, fontWeight: '800' }}>
                    {verifyingLog.quantity} pcs
                  </Text>
                </View>
              </View>
            )}

            {/* Decision Switch */}
            <Text style={styles.inputLabel}>Verification Decision *</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              <TouchableOpacity
                style={[
                  styles.decisionBtn,
                  verifyStatus === 'Approved' && styles.decisionBtnApproved,
                ]}
                onPress={() => setVerifyStatus('Approved')}
              >
                <Text style={[styles.decisionBtnText, verifyStatus === 'Approved' && { color: '#34d399', fontWeight: '800' }]}>
                  ✅ Approve Quantity
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.decisionBtn,
                  verifyStatus === 'Rejected' && styles.decisionBtnRejected,
                ]}
                onPress={() => setVerifyStatus('Rejected')}
              >
                <Text style={[styles.decisionBtnText, verifyStatus === 'Rejected' && { color: '#f87171', fontWeight: '800' }]}>
                  ❌ Reject / Return Note
                </Text>
              </TouchableOpacity>
            </View>

            {/* Supervisor Feedback Note */}
            <Text style={styles.inputLabel}>
              {verifyStatus === 'Rejected' ? 'Reason / Message to Employee *' : 'Supervisor Notes (Optional)'}
            </Text>
            <TextInput
              style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
              value={supervisorNotes}
              onChangeText={setSupervisorNotes}
              multiline
              placeholder={
                verifyStatus === 'Rejected'
                  ? 'Explain discrepancy to employee (e.g., Count mismatch on route card; please recount)'
                  : 'Any comments for audit record...'
              }
              placeholderTextColor="#64748b"
            />

            <TouchableOpacity
              style={[
                styles.modalSubmitBtn,
                verifyStatus === 'Rejected' && { backgroundColor: '#e11d48' },
              ]}
              onPress={handleSubmitVerification}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.modalSubmitBtnText}>
                  {verifyStatus === 'Approved' ? '✅ Confirm & Approve Log' : '📤 Return with Note to Employee'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  backBtn: {
    paddingRight: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#f8fafc',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 1,
  },
  addBtn: {
    backgroundColor: '#0284c7',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  addBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  machineSelectorContainer: {
    backgroundColor: '#1e293b',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  machinePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
  },
  machinePillActive: {
    backgroundColor: '#0284c7',
    borderColor: '#38bdf8',
  },
  machinePillText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  machinePillTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: '#38bdf8',
  },
  tabText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#38bdf8',
    fontWeight: '700',
  },
  badgeCount: {
    backgroundColor: '#e11d48',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  badgeCountText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  statStrip: {
    flexDirection: 'row',
    backgroundColor: '#141e33',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#334155',
  },
  statValue: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '800',
  },
  statLabel: {
    color: '#94a3b8',
    fontSize: 9,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  contentContainer: {
    padding: 12,
    paddingBottom: 30,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyAddBtn: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(2, 132, 199, 0.15)',
    borderWidth: 1,
    borderColor: '#0284c7',
  },
  logCard: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 12,
    padding: 12,
  },
  logCardRejected: {
    borderColor: '#f43f5e',
    backgroundColor: 'rgba(244, 63, 94, 0.04)',
  },
  logCardApproved: {
    borderColor: 'rgba(52, 211, 153, 0.3)',
  },
  rejectedBanner: {
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    borderWidth: 1,
    borderColor: '#f43f5e',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  rejectedBannerTitle: {
    color: '#f87171',
    fontWeight: '800',
    fontSize: 12,
    marginBottom: 2,
  },
  rejectedBannerText: {
    color: '#fecdd3',
    fontSize: 12,
    lineHeight: 16,
  },
  resubmitMiniBtn: {
    backgroundColor: '#f43f5e',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  resubmitMiniBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  machineTag: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#0284c7',
  },
  machineTagText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '800',
  },
  shiftTag: {
    backgroundColor: '#334155',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  shiftTagText: {
    color: '#cbd5e1',
    fontSize: 10,
    fontWeight: '700',
  },
  cardDate: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusApproved: {
    backgroundColor: 'rgba(52, 211, 153, 0.1)',
    borderColor: '#10b981',
  },
  statusRejected: {
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    borderColor: '#f43f5e',
  },
  statusPending: {
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderColor: '#f59e0b',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 8,
    gap: 8,
  },
  gridItem: {
    width: '47%',
  },
  gridLabel: {
    color: '#64748b',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  gridValue: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 1,
  },
  gridValueQuantity: {
    color: '#34d399',
    fontSize: 15,
    fontWeight: '900',
    marginTop: 1,
  },
  remarksBox: {
    marginTop: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    padding: 8,
    borderRadius: 6,
  },
  remarksLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '700',
  },
  remarksText: {
    color: '#cbd5e1',
    fontSize: 11,
    marginTop: 2,
  },
  verifiedInfo: {
    marginTop: 6,
    paddingHorizontal: 4,
  },
  verifiedInfoText: {
    color: '#64748b',
    fontSize: 10,
    fontStyle: 'italic',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  verifyBtn: {
    backgroundColor: '#0284c7',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  verifyBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  editBtn: {
    backgroundColor: '#334155',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  editBtnText: {
    color: '#f8fafc',
    fontSize: 11,
    fontWeight: '600',
  },
  deleteBtn: {
    backgroundColor: '#334155',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  deleteBtnText: {
    fontSize: 11,
  },
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '800',
  },
  modalSubtitle: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 1,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalFeedbackAlert: {
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    borderColor: '#f43f5e',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  modalFeedbackTitle: {
    color: '#f87171',
    fontWeight: '800',
    fontSize: 11,
  },
  modalFeedbackBody: {
    color: '#fecdd3',
    fontSize: 12,
    marginTop: 2,
  },
  inputLabel: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#f8fafc',
    fontSize: 13,
    marginBottom: 10,
  },
  formMachinePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
  },
  formMachinePillActive: {
    backgroundColor: '#0284c7',
    borderColor: '#38bdf8',
  },
  formMachinePillText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  formMachinePillTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  shiftBtn: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 10,
  },
  shiftBtnActive: {
    backgroundColor: '#0284c7',
    borderColor: '#38bdf8',
  },
  shiftBtnText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
  },
  shiftBtnTextActive: {
    color: '#fff',
  },
  modalSubmitBtn: {
    backgroundColor: '#0284c7',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  modalSubmitBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  verifySummaryBox: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 12,
  },
  decisionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  decisionBtnApproved: {
    backgroundColor: 'rgba(52, 211, 153, 0.1)',
    borderColor: '#10b981',
  },
  decisionBtnRejected: {
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    borderColor: '#f43f5e',
  },
  decisionBtnText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
});
