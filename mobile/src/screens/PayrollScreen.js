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

export default function PayrollScreen({ user, onBack }) {
  const [activeTab, setActiveTab] = useState('slip'); // 'slip' or 'deductions'
  const [slip, setSlip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Deduction Form State
  const [canteenDeduction, setCanteenDeduction] = useState('0');
  const [festivalAdvance, setFestivalAdvance] = useState('0');
  const [providentFund, setProvidentFund] = useState('0');
  const [professionalTax, setProfessionalTax] = useState('0');
  const [medicalInsurance, setMedicalInsurance] = useState('0');

  // Use current month dynamically
  const getCurrentMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  const getCurrentMonthLabel = () => {
    const now = new Date();
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    return `${months[now.getMonth()]} ${now.getFullYear()}`;
  };

  const isAdmin = user?.role === 'SiteAdmin' || user?.role === 'Supervisor';

  const fetchPayslip = async () => {
    setLoading(true);
    try {
      const urls = await getApiUrlList();
      const currentMonth = getCurrentMonth();
      for (const url of urls) {
        try {
          // Only fetch the logged-in employee's own slip
          const res = await axios.get(`${url}/payroll/slip/${user.employeeToken}?month=${currentMonth}`, { timeout: 6000 });
          if (res.data) {
            setSlip(res.data);
            if (res.data.deductionsRaw) {
              const d = res.data.deductionsRaw;
              setCanteenDeduction(String(d.canteenDeduction || 0));
              setFestivalAdvance(String(d.festivalAdvance || 0));
              setProvidentFund(String(d.providentFund || 0));
              setProfessionalTax(String(d.professionalTax || 0));
              setMedicalInsurance(String(d.medicalInsurance || 0));
            }
          }
          break;
        } catch (e) {}
      }
    } catch (err) {
      console.error('Payslip fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayslip();
  }, []);

  const handleSaveDeductions = async () => {
    setSaving(true);
    try {
      const urls = await getApiUrlList();
      const currentMonth = getCurrentMonth();
      let res = null;
      for (const url of urls) {
        try {
          res = await axios.post(`${url}/payroll/deductions`, {
            tokenNo: user.employeeToken,
            yearMonth: currentMonth,
            canteenDeduction: Number(canteenDeduction),
            festivalAdvance: Number(festivalAdvance),
            providentFund: Number(providentFund),
            professionalTax: Number(professionalTax),
            medicalInsurance: Number(medicalInsurance),
          }, { timeout: 6000 });
          if (res) break;
        } catch (e) {}
      }

      if (res) {
        Alert.alert('Success', 'Monthly deductions saved successfully.');
        await fetchPayslip();
        setActiveTab('slip');
      } else {
        Alert.alert('Error', 'Unable to connect to server.');
      }
    } catch (err) {
      Alert.alert('Save Failed', err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header Bar with Back Button */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backBtnText}>◀ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Salary Slip</Text>
      </View>

      {/* Sub-Tab Navigation Toggle — only show "Edit Deductions" for Admin/Supervisor */}
      {isAdmin && (
        <View style={styles.toggleBar}>
          <TouchableOpacity
            style={[styles.toggleItem, activeTab === 'slip' && styles.toggleItemActive]}
            onPress={() => setActiveTab('slip')}
          >
            <Text style={[styles.toggleText, activeTab === 'slip' && styles.toggleTextActive]}>
              📄 My Salary Slip
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleItem, activeTab === 'deductions' && styles.toggleItemActive]}
            onPress={() => setActiveTab('deductions')}
          >
            <Text style={[styles.toggleText, activeTab === 'deductions' && styles.toggleTextActive]}>
              ⚙️ Edit Deductions
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color="#38bdf8" style={{ marginTop: 40 }} />
        ) : activeTab === 'slip' && slip ? (
          /* Official Thermal Payslip Ticket — ONLY the logged-in employee's data */
          <View style={styles.ticketCard}>
            {/* Header */}
            <Text style={styles.tCompany}>{slip.companyName}</Text>
            <Text style={styles.tLocation}>{slip.location}</Text>
            <Text style={styles.tSection}>{slip.section}</Text>
            <Text style={styles.tMonth}>{slip.month}</Text>

            <View style={styles.dashedLine} />

            {/* Employee Line */}
            <View style={styles.tRowSpace}>
              <Text style={styles.tBold}>{slip.tokenNo} {slip.employeeName}</Text>
              <Text style={styles.tBold}>Rate: {slip.dailyRate}</Text>
            </View>

            {/* Shift Counters Line */}
            <Text style={[styles.tBold, { marginVertical: 6 }]}>
              Days.G:{slip.daysGeneral}  SH-I:{slip.shift1Days}  SH-II:{slip.shift2Days}  SH-III:{slip.shift3Days}  OT:{slip.otHours}hrs
            </Text>

            <View style={styles.dashedLine} />

            {/* Earnings & Deductions Columns */}
            <View style={styles.twoColRow}>
              {/* Earnings Column */}
              <View style={{ flex: 1, paddingRight: 6 }}>
                <Text style={styles.colHeader}>EARN (₹)</Text>
                <View style={styles.tRowSpace}><Text style={styles.tLabel}>Rate Earn:</Text><Text style={styles.tVal}>{slip.basicEarned}</Text></View>
                <View style={styles.tRowSpace}><Text style={styles.tLabel}>OHT_ERN:</Text><Text style={styles.tVal}>{slip.overtimeEarned}</Text></View>
                <View style={styles.tRowSpace}><Text style={styles.tLabel}>SPL PAY:</Text><Text style={styles.tVal}>{slip.specialPay}</Text></View>
                <View style={styles.tRowSpace}><Text style={styles.tLabel}>CONV:</Text><Text style={styles.tVal}>{slip.conveyance}</Text></View>
                <View style={styles.tRowSpace}><Text style={styles.tLabelBold}>SHIFT ALLW:</Text><Text style={styles.tValBold}>{slip.shiftAllowance}</Text></View>
                <View style={styles.tRowSpace}><Text style={styles.tLabel}>COIN-E:</Text><Text style={styles.tVal}>{slip.coinE}</Text></View>
              </View>

              {/* Deductions Column */}
              <View style={{ flex: 1, paddingLeft: 6, borderLeftWidth: 1, borderLeftColor: '#cbd5e1' }}>
                <Text style={styles.colHeader}>DED (₹)</Text>
                <View style={styles.tRowSpace}><Text style={styles.tLabel}>CANT:</Text><Text style={styles.tVal}>{slip.canteenDeduction}</Text></View>
                <View style={styles.tRowSpace}><Text style={styles.tLabel}>FEST.ADV:</Text><Text style={styles.tVal}>{slip.festivalAdvance}</Text></View>
                <View style={styles.tRowSpace}><Text style={styles.tLabelBold}>PF:</Text><Text style={styles.tValBold}>{slip.providentFund}</Text></View>
                <View style={styles.tRowSpace}><Text style={styles.tLabel}>ESI:</Text><Text style={styles.tVal}>{slip.esi}</Text></View>
                <View style={styles.tRowSpace}><Text style={styles.tLabel}>PROF_TAX:</Text><Text style={styles.tVal}>{slip.professionalTax}</Text></View>
                <View style={styles.tRowSpace}><Text style={styles.tLabel}>MEDI_INS:</Text><Text style={styles.tVal}>{slip.medicalInsurance}</Text></View>
              </View>
            </View>

            <View style={styles.dashedLine} />

            {/* Totals */}
            <View style={styles.tRowSpace}>
              <Text style={styles.tLabelBold}>Gross pay :</Text>
              <Text style={styles.tValBold}>₹{slip.grossPay}</Text>
            </View>

            <View style={styles.tRowSpace}>
              <Text style={styles.tLabelBold}>TOTAL DED :</Text>
              <Text style={styles.tValBold}>₹{slip.totalDeductions}</Text>
            </View>

            <View style={[styles.tRowSpace, { marginTop: 8, paddingTop: 6, borderTopWidth: 2, borderTopColor: '#000' }]}>
              <Text style={[styles.tBold, { fontSize: 16 }]}>Net pay :</Text>
              <Text style={[styles.tBold, { fontSize: 18, color: '#000' }]}>₹{slip.netPay}</Text>
            </View>
          </View>
        ) : activeTab === 'slip' ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No salary slip data available for {getCurrentMonthLabel()}.</Text>
            <Text style={styles.emptySubText}>Salary slip is generated from your attendance punching records.</Text>
          </View>
        ) : (
          /* Deductions Editor Form — Admin/Supervisor only */
          <View style={styles.editorCard}>
            <Text style={styles.edTitle}>⚙️ Monthly Deductions Management</Text>
            <Text style={styles.edSub}>Set Canteen Coupons, Festival Advance & PF for {getCurrentMonthLabel()}</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Canteen Coupon Deduction (CANT ₹):</Text>
              <Text style={styles.inputHelp}>Varies monthly based on coupons bought (enter 0 if no coupons bought)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={canteenDeduction}
                onChangeText={setCanteenDeduction}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Festival Advance (FEST.ADV ₹):</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={festivalAdvance}
                onChangeText={setFestivalAdvance}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Provident Fund (PF ₹):</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={providentFund}
                onChangeText={setProvidentFund}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Professional Tax (PROF_TAX ₹):</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={professionalTax}
                onChangeText={setProfessionalTax}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Medical Insurance (MEDI_INS ₹):</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={medicalInsurance}
                onChangeText={setMedicalInsurance}
              />
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveDeductions} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>💾 Save Monthly Deductions</Text>}
            </TouchableOpacity>
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
  toggleBar: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    padding: 6,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
  },
  toggleItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  toggleItemActive: {
    backgroundColor: '#0284c7',
  },
  toggleText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
  },
  toggleTextActive: {
    color: '#ffffff',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  ticketCard: {
    backgroundColor: '#fafafa',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  tCompany: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
  },
  tLocation: {
    fontSize: 11,
    color: '#000',
    textAlign: 'center',
  },
  tSection: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
  },
  tMonth: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginTop: 2,
  },
  dashedLine: {
    height: 1,
    borderWidth: 1,
    borderColor: '#000',
    borderStyle: 'dashed',
    marginVertical: 8,
  },
  tRowSpace: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  tBold: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000',
  },
  twoColRow: {
    flexDirection: 'row',
  },
  colHeader: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#000',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    paddingBottom: 2,
    marginBottom: 4,
  },
  tLabel: {
    fontSize: 11,
    color: '#000',
  },
  tVal: {
    fontSize: 11,
    color: '#000',
  },
  tLabelBold: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#000',
  },
  tValBold: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#000',
  },
  emptyCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  emptyText: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubText: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
  },
  editorCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  edTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#f8fafc',
  },
  edSub: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
    marginBottom: 14,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#cbd5e1',
  },
  inputHelp: {
    fontSize: 10,
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
    paddingVertical: 8,
    fontSize: 14,
  },
  saveBtn: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
});
