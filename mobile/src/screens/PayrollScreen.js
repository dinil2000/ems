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

export default function PayrollScreen({ user, onBack }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPayroll = async () => {
      setLoading(true);
      try {
        const urls = await getApiUrlList();
        for (const url of urls) {
          try {
            const res = await axios.get(`${url}/employees?status=Active`, { timeout: 6000 });
            setEmployees(res.data);
            break;
          } catch (e) {}
        }
      } catch (err) {
        console.error('Payroll fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPayroll();
  }, []);

  return (
    <View style={styles.container}>
      {/* Header Bar with Back Button */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backBtnText}>◀ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payroll (25th - 25th Cycle)</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.bannerCard}>
          <Text style={styles.bannerTitle}>💰 MPP Monthly Payroll Register</Text>
          <Text style={styles.bannerSubtitle}>
            Cycle: 25th Prev Month to 25th Current Month • Standard 7.5 hrs/day
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#38bdf8" style={{ marginTop: 40 }} />
        ) : (
          employees.map((emp) => {
            const baseSalary = emp.basicSalary || (emp.qualification === 'Diploma' ? 32000 : 22500);
            const otEstimate = Math.round(baseSalary * 0.12);
            const totalGross = baseSalary + otEstimate;

            return (
              <View key={emp._id} style={styles.payrollCard}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.empName}>{emp.name}</Text>
                    <Text style={styles.empToken}>Token #{emp.tokenNo} • {emp.qualification}</Text>
                  </View>
                  <View style={styles.typeBadge}>
                    <Text style={styles.typeText}>{emp.employmentType}</Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.salaryRow}>
                  <Text style={styles.salaryLabel}>Basic Monthly Pay:</Text>
                  <Text style={styles.salaryValue}>₹{baseSalary.toLocaleString('en-IN')}</Text>
                </View>

                <View style={styles.salaryRow}>
                  <Text style={styles.salaryLabel}>Overtime Pay (OT @ 2x):</Text>
                  <Text style={[styles.salaryValue, { color: '#38bdf8' }]}>₹{otEstimate.toLocaleString('en-IN')}</Text>
                </View>

                <View style={styles.salaryRow}>
                  <Text style={[styles.salaryLabel, { fontWeight: '700', color: '#f8fafc' }]}>Estimated Gross Pay:</Text>
                  <Text style={[styles.salaryValue, { color: '#34d399', fontWeight: '800', fontSize: 16 }]}>
                    ₹{totalGross.toLocaleString('en-IN')}
                  </Text>
                </View>
              </View>
            );
          })
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
    borderLeftColor: '#10b981',
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
  payrollCard: {
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
  empName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f8fafc',
  },
  empToken: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  typeBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 10,
  },
  salaryRow: {
    flexDirection: 'row',
    justify: 'space-between',
    paddingVertical: 4,
  },
  salaryLabel: {
    fontSize: 13,
    color: '#cbd5e1',
  },
  salaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f8fafc',
  },
});
