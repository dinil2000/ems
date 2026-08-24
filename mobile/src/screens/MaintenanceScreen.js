import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import axios from 'axios';
import { getApiUrlList } from '../config/api';

export default function MaintenanceScreen({ user, onBack }) {
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMachines = async () => {
      setLoading(true);
      try {
        const urls = await getApiUrlList();
        for (const url of urls) {
          try {
            const res = await axios.get(`${url}/machines`, { timeout: 6000 });
            setMachines(res.data);
            break;
          } catch (e) {}
        }
      } catch (err) {
        console.error('Machines fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMachines();
  }, []);

  return (
    <View style={styles.container}>
      {/* Header Bar with Back Button */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backBtnText}>◀ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Machine Cleaning & Maintenance</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.bannerCard}>
          <Text style={styles.bannerTitle}>🔧 Unit 1 & Unit 2 Machines Status</Text>
          <Text style={styles.bannerSubtitle}>
            Winding (5), Testing (3), Metalizing (4) • Keltron MPP Section
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#38bdf8" style={{ marginTop: 40 }} />
        ) : (
          machines.map((m) => (
            <View key={m._id} style={styles.machineCard}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.mName}>{m.name}</Text>
                  <Text style={styles.mId}>Machine ID: #{m.machineId} • {m.unit}</Text>
                </View>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>{m.status || 'Optimal'}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Section Category:</Text>
                <Text style={styles.infoValue}>{m.category}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Required Shift Staffing:</Text>
                <Text style={[styles.infoValue, { color: '#38bdf8' }]}>{m.minStaffRequired || 1} Operator(s)</Text>
              </View>
            </View>
          ))
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
    borderLeftColor: '#06b6d4',
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#f8fafc',
  },
  bannerSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  machineCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    justify: 'space-between',
    alignItems: 'center',
  },
  mName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f8fafc',
  },
  mId: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  statusText: {
    color: '#34d399',
    fontSize: 11,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justify: 'space-between',
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: 13,
    color: '#cbd5e1',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#f8fafc',
  },
});
