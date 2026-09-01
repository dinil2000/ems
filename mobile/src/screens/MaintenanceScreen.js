import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import axios from 'axios';
import { getApiUrlList } from '../config/api';

export default function MaintenanceScreen({ user, onBack }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const isSupervisorOrAdmin = user?.role === 'Supervisor' || user?.role === 'SiteAdmin';

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const urls = await getApiUrlList();
      for (const url of urls) {
        try {
          const res = await axios.get(`${url}/maintenance`, { timeout: 6000 });
          if (res.data) {
            setAlerts(res.data);
          }
          break;
        } catch (e) {}
      }
    } catch (err) {
      console.error('Maintenance alerts fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAlerts();
    setRefreshing(false);
  };

  // Worker submits cleaning request
  const handleWorkerRequestCleaning = async (id, machineId) => {
    setActionLoading(true);
    try {
      const urls = await getApiUrlList();
      let res = null;
      for (const url of urls) {
        try {
          res = await axios.post(`${url}/maintenance/request-completion/${id}`, {
            tokenNo: user.employeeToken,
            name: user.employeeProfile?.name || 'Operator',
          }, { timeout: 6000 });
          if (res) break;
        } catch (e) {}
      }

      if (res) {
        Alert.alert('Request Sent', res.data.message);
        await fetchAlerts();
      } else {
        Alert.alert('Error', 'Unable to connect to server.');
      }
    } catch (err) {
      Alert.alert('Request Failed', err.response?.data?.message || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Supervisor approves cleaning request
  const handleSupervisorApproveCleaning = async (id, machineId) => {
    setActionLoading(true);
    try {
      const urls = await getApiUrlList();
      let res = null;
      for (const url of urls) {
        try {
          res = await axios.post(`${url}/maintenance/approve/${id}`, {
            supervisorToken: user.employeeToken,
            supervisorName: user.employeeProfile?.name || 'Supervisor',
          }, { timeout: 6000 });
          if (res) break;
        } catch (e) {}
      }

      if (res) {
        Alert.alert('Verified & Approved', res.data.message);
        await fetchAlerts();
      } else {
        Alert.alert('Error', 'Unable to connect to server.');
      }
    } catch (err) {
      Alert.alert('Approval Failed', err.response?.data?.message || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Supervisor rejects cleaning request
  const handleSupervisorRejectCleaning = async (id, machineId) => {
    setActionLoading(true);
    try {
      const urls = await getApiUrlList();
      let res = null;
      for (const url of urls) {
        try {
          res = await axios.post(`${url}/maintenance/reject/${id}`, {}, { timeout: 6000 });
          if (res) break;
        } catch (e) {}
      }

      if (res) {
        Alert.alert('Rejected', res.data.message);
        await fetchAlerts();
      } else {
        Alert.alert('Error', 'Unable to connect to server.');
      }
    } catch (err) {
      Alert.alert('Rejection Failed', err.response?.data?.message || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#38bdf8" />}
      >
        <View style={styles.bannerCard}>
          <Text style={styles.bannerTitle}>🔧 Machine Cleaning & Supervisor Approval Portal</Text>
          <Text style={styles.bannerSubtitle}>
            Worker submits cleaning request • Supervisor verifies and approves completion
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#38bdf8" style={{ marginTop: 40 }} />
        ) : alerts.length > 0 ? (
          alerts.map((alert) => {
            const isOverdue = alert.status === 'Overdue';
            const isPendingApproval = alert.status === 'Pending Approval';

            return (
              <View
                key={alert._id}
                style={[
                  styles.machineCard,
                  isPendingApproval ? styles.borderPending : (isOverdue ? styles.borderOverdue : styles.borderNormal)
                ]}
              >
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.mName}>Machine #{alert.machineId}</Text>
                    <Text style={styles.mId}>{alert.machineCategory} Section</Text>
                  </View>
                  <View style={isPendingApproval ? styles.badgePending : (isOverdue ? styles.badgeOverdue : styles.badgeNormal)}>
                    <Text style={isPendingApproval ? styles.textPending : (isOverdue ? styles.textOverdue : styles.textNormal)}>
                      {alert.status}
                    </Text>
                  </View>
                </View>

                <Text style={styles.alertTypeTitle}>{alert.alertType}</Text>

                {alert.requestedBy?.name && (
                  <View style={styles.workerRequestTag}>
                    <Text style={styles.workerRequestText}>
                      Worker Request: Token #{alert.requestedBy.tokenNo} ({alert.requestedBy.name})
                    </Text>
                  </View>
                )}

                <Text style={styles.notesText}>
                  {alert.notes || 'Routine cleaning and maintenance check mandatory.'}
                </Text>

                <View style={styles.metaBox}>
                  <Text style={styles.metaText}>
                    Due: <Text style={{ color: '#f8fafc', fontWeight: 'bold' }}>{new Date(alert.nextDueDate).toLocaleDateString()}</Text>
                  </Text>
                  <Text style={styles.metaText}>
                    Every <Text style={{ color: '#f8fafc', fontWeight: 'bold' }}>{alert.frequencyDays} Days</Text>
                  </Text>
                </View>

                {/* Worker View: Submit Cleaning Request */}
                {!isSupervisorOrAdmin && (
                  <View style={{ marginTop: 10 }}>
                    {isPendingApproval ? (
                      <View style={styles.disabledBtn}>
                        <Text style={styles.disabledBtnText}>⏳ Request Sent (Awaiting Supervisor Approval)</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => handleWorkerRequestCleaning(alert._id, alert.machineId)}
                        disabled={actionLoading}
                      >
                        <Text style={styles.actionBtnText}>📤 Submit Cleaning Done Request</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* Supervisor / Admin View: Approve or Reject Cleaning */}
                {isSupervisorOrAdmin && (
                  <View style={{ marginTop: 10 }}>
                    {isPendingApproval ? (
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity
                          style={[styles.approveBtn, { flex: 1 }]}
                          onPress={() => handleSupervisorApproveCleaning(alert._id, alert.machineId)}
                          disabled={actionLoading}
                        >
                          <Text style={styles.approveBtnText}>✅ Approve & Verify</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.rejectBtn}
                          onPress={() => handleSupervisorRejectCleaning(alert._id, alert.machineId)}
                          disabled={actionLoading}
                        >
                          <Text style={styles.rejectBtnText}>✕ Reject</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.approveBtn}
                        onPress={() => handleSupervisorApproveCleaning(alert._id, alert.machineId)}
                        disabled={actionLoading}
                      >
                        <Text style={styles.approveBtnText}>✅ Mark & Approve Cleaning Done</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            );
          })
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>✅</Text>
            <Text style={styles.emptyTitle}>All MPP Machines Clean & Operational</Text>
            <Text style={styles.emptySubtitle}>No pending Metalizing central cleaning or general cleaning alerts.</Text>
          </View>
        )}
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
    borderLeftColor: '#f59e0b',
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#f8fafc',
  },
  bannerSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  machineCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  borderNormal: {
    borderLeftWidth: 4,
    borderLeftColor: '#06b6d4',
  },
  borderPending: {
    borderLeftWidth: 4,
    borderLeftColor: '#fbbf24',
  },
  borderOverdue: {
    borderLeftWidth: 4,
    borderLeftColor: '#f43f5e',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  mName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#f8fafc',
  },
  mId: {
    fontSize: 12,
    color: '#06b6d4',
    fontWeight: '600',
    marginTop: 1,
  },
  badgeNormal: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#06b6d4',
  },
  textNormal: {
    color: '#22d3ee',
    fontSize: 11,
    fontWeight: '700',
  },
  badgePending: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  textPending: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '700',
  },
  badgeOverdue: {
    backgroundColor: 'rgba(244, 63, 94, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#f43f5e',
  },
  textOverdue: {
    color: '#f87171',
    fontSize: 11,
    fontWeight: '700',
  },
  alertTypeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#38bdf8',
    marginTop: 6,
    marginBottom: 4,
  },
  workerRequestTag: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    padding: 6,
    borderRadius: 6,
    marginVertical: 4,
  },
  workerRequestText: {
    fontSize: 11,
    color: '#fbbf24',
    fontWeight: '700',
  },
  notesText: {
    fontSize: 12,
    color: '#94a3b8',
    marginVertical: 4,
    lineHeight: 16,
  },
  metaBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#0f172a',
    padding: 8,
    borderRadius: 6,
    marginTop: 6,
  },
  metaText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  actionBtn: {
    backgroundColor: '#0284c7',
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  disabledBtn: {
    backgroundColor: '#334155',
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
  },
  disabledBtnText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '600',
  },
  approveBtn: {
    backgroundColor: '#10b981',
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: 'center',
  },
  approveBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  rejectBtn: {
    backgroundColor: '#f43f5e',
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  rejectBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    marginTop: 20,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 4,
  },
});
