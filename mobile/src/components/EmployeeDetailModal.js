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

export default function EmployeeDetailModal({ visible, onClose, employee, currentUser, onUpdated }) {
  const [activeTab, setActiveTab] = useState('profile'); // 'profile', 'slip', 'deductions', 'attendance'
  const [empProfile, setEmpProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Month options (current + 5 previous months)
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);

  const monthOptions = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
    monthOptions.push({ value: val, label });
  }

  // Payslip State
  const [slip, setSlip] = useState(null);
  const [loadingSlip, setLoadingSlip] = useState(false);

  // Deduction Form State
  const [canteenDeduction, setCanteenDeduction] = useState('0');
  const [festivalAdvance, setFestivalAdvance] = useState('0');
  const [providentFund, setProvidentFund] = useState('0');
  const [professionalTax, setProfessionalTax] = useState('0');
  const [medicalInsurance, setMedicalInsurance] = useState('0');
  const [cooperativeDeduction, setCooperativeDeduction] = useState('0');
  const [savingDeductions, setSavingDeductions] = useState(false);

  // Attendance Logs State
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  // Edit Mode State for SiteAdmin
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editQual, setEditQual] = useState('ITI');
  const [editExp, setEditExp] = useState('0');
  const [editDailyRate, setEditDailyRate] = useState('825.94');
  const [editBasicSalary, setEditBasicSalary] = useState('0');
  const [editGender, setEditGender] = useState('Male');
  const [editUnit, setEditUnit] = useState('Unit 2');
  const [editMachines, setEditMachines] = useState([]);
  const [savingEdit, setSavingEdit] = useState(false);

  const targetToken = employee?.tokenNo || employee?.employeeToken || '';
  const isSiteAdmin = currentUser?.role === 'SiteAdmin';

  // Load complete profile
  const fetchProfile = async () => {
    if (!targetToken) return;
    setLoadingProfile(true);
    try {
      const urls = await getApiUrlList();
      for (const url of urls) {
        try {
          const res = await axios.get(`${url}/employees/${targetToken}`, { timeout: 6000 });
          if (res.data) {
            setEmpProfile(res.data);
            initEditState(res.data);
            break;
          }
        } catch (e) {}
      }
    } catch (err) {
      console.error('Profile fetch error:', err);
    } finally {
      setLoadingProfile(false);
    }
  };

  const initEditState = (data) => {
    setEditName(data.name || '');
    setEditQual(data.qualification || 'ITI');
    setEditExp(String(data.experienceYears || 0));
    setEditDailyRate(String(data.dailyRate || 825.94));
    setEditBasicSalary(String(data.basicSalary || 0));
    setEditGender(data.gender || 'Male');
    setEditUnit(data.unit || 'Unit 2');
    setEditMachines(data.machineExpertise || []);
  };

  // Fetch Payslip for selected month
  const fetchPayslip = async () => {
    if (!targetToken) return;
    setLoadingSlip(true);
    try {
      const urls = await getApiUrlList();
      for (const url of urls) {
        try {
          const res = await axios.get(`${url}/payroll/slip/${targetToken}?month=${selectedMonth}`, { timeout: 6000 });
          if (res.data) {
            setSlip(res.data);
            if (res.data.deductionsRaw) {
              const d = res.data.deductionsRaw;
              setCanteenDeduction(String(d.canteenDeduction || 0));
              setFestivalAdvance(String(d.festivalAdvance || 0));
              setProvidentFund(String(d.providentFund || 0));
              setProfessionalTax(String(d.professionalTax || 0));
              setMedicalInsurance(String(d.medicalInsurance || 0));
              setCooperativeDeduction(String(d.cooperativeDeduction || 0));
            }
            break;
          }
        } catch (e) {}
      }
    } catch (err) {
      console.error('Payslip fetch error:', err);
    } finally {
      setLoadingSlip(false);
    }
  };

  // Fetch Attendance Logs
  const fetchAttendance = async () => {
    if (!targetToken) return;
    setLoadingAttendance(true);
    try {
      const urls = await getApiUrlList();
      for (const url of urls) {
        try {
          const res = await axios.get(`${url}/attendance/employee/${targetToken}?limit=30`, { timeout: 6000 });
          if (res.data) {
            setAttendanceLogs(res.data);
            break;
          }
        } catch (e) {}
      }
    } catch (err) {
      console.error('Attendance fetch error:', err);
    } finally {
      setLoadingAttendance(false);
    }
  };

  useEffect(() => {
    if (visible && targetToken) {
      setIsEditing(false);
      fetchProfile();
      fetchPayslip();
    }
  }, [visible, targetToken, selectedMonth]);

  useEffect(() => {
    if (visible && activeTab === 'attendance') {
      fetchAttendance();
    }
  }, [visible, activeTab]);

  const handleToggleMachine = (mId) => {
    if (editMachines.includes(mId)) {
      setEditMachines(editMachines.filter((id) => id !== mId));
    } else {
      setEditMachines([...editMachines, mId]);
    }
  };

  const handleSaveProfileEdits = async () => {
    if (!targetToken) return;
    setSavingEdit(true);
    try {
      const urls = await getApiUrlList();
      let res = null;
      for (const url of urls) {
        try {
          res = await axios.put(`${url}/employees/${empProfile?._id || targetToken}`, {
            name: editName,
            qualification: editQual,
            experienceYears: parseInt(editExp) || 0,
            dailyRate: parseFloat(editDailyRate) || 825.94,
            basicSalary: parseFloat(editBasicSalary) || 0,
            gender: editGender,
            unit: editUnit,
            machineExpertise: editMachines,
          }, { timeout: 6000 });
          if (res) break;
        } catch (e) {}
      }

      if (res) {
        Alert.alert('Profile Saved', `Updated details for ${editName} (Token #${targetToken}).`);
        setIsEditing(false);
        fetchProfile();
        if (onUpdated) onUpdated();
      } else {
        Alert.alert('Save Failed', 'Unable to connect to server.');
      }
    } catch (err) {
      Alert.alert('Save Failed', err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleSaveDeductions = async () => {
    setSavingDeductions(true);
    try {
      const urls = await getApiUrlList();
      let res = null;
      for (const url of urls) {
        try {
          res = await axios.post(`${url}/payroll/deductions`, {
            tokenNo: targetToken,
            yearMonth: selectedMonth,
            canteenDeduction: Number(canteenDeduction),
            festivalAdvance: Number(festivalAdvance),
            providentFund: Number(providentFund),
            professionalTax: Number(professionalTax),
            medicalInsurance: Number(medicalInsurance),
            cooperativeDeduction: Number(cooperativeDeduction),
          }, { timeout: 6000 });
          if (res) break;
        } catch (e) {}
      }

      if (res) {
        Alert.alert('Saved', `Deductions updated for Token #${targetToken} (${selectedMonth}).`);
        fetchPayslip();
        setActiveTab('slip');
      } else {
        Alert.alert('Error', 'Unable to save deductions.');
      }
    } catch (err) {
      Alert.alert('Save Failed', err.message);
    } finally {
      setSavingDeductions(false);
    }
  };

  const displayName = empProfile?.name || employee?.name || employee?.employeeProfile?.name || `Employee #${targetToken}`;
  const displayRole = employee?.role || empProfile?.role || 'Employee';

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        {/* Header Bar */}
        <View style={styles.headerBar}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.tokenBadge}>#{targetToken}</Text>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {displayName}
              </Text>
            </View>
            <Text style={styles.headerSub}>
              Role: {displayRole} • MPP Section • Keltron Plant
            </Text>
          </View>

          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕ Close</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Selector Bar */}
        <View style={styles.toggleBar}>
          <TouchableOpacity
            style={[styles.toggleItem, activeTab === 'profile' && styles.toggleItemActive]}
            onPress={() => setActiveTab('profile')}
          >
            <Text style={[styles.toggleText, activeTab === 'profile' && styles.toggleTextActive]}>
              👤 Profile
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleItem, activeTab === 'slip' && styles.toggleItemActive]}
            onPress={() => setActiveTab('slip')}
          >
            <Text style={[styles.toggleText, activeTab === 'slip' && styles.toggleTextActive]}>
              📄 Payslip
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleItem, activeTab === 'deductions' && styles.toggleItemActive]}
            onPress={() => setActiveTab('deductions')}
          >
            <Text style={[styles.toggleText, activeTab === 'deductions' && styles.toggleTextActive]}>
              ✏️ Deduct
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleItem, activeTab === 'attendance' && styles.toggleItemActive]}
            onPress={() => setActiveTab('attendance')}
          >
            <Text style={[styles.toggleText, activeTab === 'attendance' && styles.toggleTextActive]}>
              📊 Logs
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* 👤 TAB 1: EMPLOYEE PROFILE DOSSIER */}
          {activeTab === 'profile' && (
            <View>
              {loadingProfile && !empProfile ? (
                <ActivityIndicator size="large" color="#38bdf8" style={{ marginTop: 30 }} />
              ) : isEditing ? (
                /* Edit Profile Form */
                <View style={styles.card}>
                  <Text style={styles.sectionHeading}>✏️ Edit Staff Details</Text>

                  <Text style={styles.label}>Full Name *</Text>
                  <TextInput style={styles.input} value={editName} onChangeText={setEditName} />

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Qualification *</Text>
                      <View style={{ flexDirection: 'row', gap: 4, marginBottom: 8 }}>
                        {['ITI', 'Diploma', 'BE/B.Tech'].map(q => (
                          <TouchableOpacity
                            key={q}
                            style={[styles.smallToggle, editQual === q && styles.smallToggleActive]}
                            onPress={() => setEditQual(q)}
                          >
                            <Text style={editQual === q ? styles.smallToggleTextActive : styles.smallToggleText}>{q}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Exp (Years)</Text>
                      <TextInput style={styles.input} value={editExp} onChangeText={setEditExp} keyboardType="numeric" />
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Daily Rate (₹/day)</Text>
                      <TextInput style={styles.input} value={editDailyRate} onChangeText={setEditDailyRate} keyboardType="numeric" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Monthly Base (₹)</Text>
                      <TextInput style={styles.input} value={editBasicSalary} onChangeText={setEditBasicSalary} keyboardType="numeric" />
                    </View>
                  </View>

                  <Text style={[styles.label, { marginTop: 6 }]}>⚙️ Machine Expertise:</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                    {MPP_MACHINES.map((m) => {
                      const isSel = editMachines.includes(m.id);
                      return (
                        <TouchableOpacity
                          key={m.id}
                          style={[styles.machChip, isSel && styles.machChipActive]}
                          onPress={() => handleToggleMachine(m.id)}
                        >
                          <Text style={isSel ? styles.machChipTextActive : styles.machChipText}>
                            #{m.id} ({m.name.split(' ')[0]})
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity style={[styles.btnSecondary, { flex: 1 }]} onPress={() => setIsEditing(false)}>
                      <Text style={styles.btnSecondaryText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.btnPrimary, { flex: 1 }]}
                      onPress={handleSaveProfileEdits}
                      disabled={savingEdit}
                    >
                      {savingEdit ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnPrimaryText}>💾 Save Edits</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                /* Profile Dossier View */
                <View>
                  {isSiteAdmin && (
                    <TouchableOpacity style={styles.editBannerBtn} onPress={() => setIsEditing(true)}>
                      <Text style={styles.editBannerText}>✏️ Edit Profile Details & Wages</Text>
                    </TouchableOpacity>
                  )}

                  {/* Summary Grid */}
                  <View style={styles.gridRow}>
                    <View style={styles.statCard}>
                      <Text style={styles.statLabel}>DAILY RATE</Text>
                      <Text style={[styles.statVal, { color: '#34d399' }]}>
                        ₹{empProfile?.dailyRate ? parseFloat(empProfile.dailyRate).toFixed(2) : '825.94'}
                      </Text>
                      <Text style={styles.statSub}>Keltron Base</Text>
                    </View>

                    <View style={styles.statCard}>
                      <Text style={styles.statLabel}>QUALIFICATION</Text>
                      <Text style={styles.statVal}>{empProfile?.qualification || 'ITI'}</Text>
                      <Text style={styles.statSub}>{empProfile?.experienceYears || 0} Yrs Experience</Text>
                    </View>
                  </View>

                  <View style={styles.gridRow}>
                    <View style={styles.statCard}>
                      <Text style={styles.statLabel}>MONTHLY BASE</Text>
                      <Text style={[styles.statVal, { color: '#38bdf8' }]}>
                        ₹{empProfile?.basicSalary ? Number(empProfile.basicSalary).toLocaleString('en-IN') : '0'}
                      </Text>
                      <Text style={styles.statSub}>Fixed Monthly</Text>
                    </View>

                    <View style={styles.statCard}>
                      <Text style={styles.statLabel}>PLANT & SECTION</Text>
                      <Text style={styles.statVal}>{empProfile?.unit || 'Unit 2'}</Text>
                      <Text style={styles.statSub}>MPP Section</Text>
                    </View>
                  </View>

                  {/* Machine Expertise Card */}
                  <View style={styles.card}>
                    <Text style={styles.cardHeading}>⚙️ Certified Machine Expertise</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                      {empProfile?.machineExpertise && empProfile.machineExpertise.length > 0 ? (
                        empProfile.machineExpertise.map((m, idx) => (
                          <View key={idx} style={styles.activeMachineBadge}>
                            <Text style={styles.activeMachineText}>Machine #{m}</Text>
                          </View>
                        ))
                      ) : (
                        <Text style={{ color: '#94a3b8', fontSize: 12 }}>No machine certifications assigned.</Text>
                      )}
                    </View>
                  </View>

                  {/* Meta Details */}
                  <View style={styles.card}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Employment Type:</Text>
                      <Text style={styles.detailValue}>{empProfile?.employmentType || 'Permanent Staff'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Gender:</Text>
                      <Text style={styles.detailValue}>{empProfile?.gender || 'Male'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Account Status:</Text>
                      <Text style={[styles.detailValue, { color: '#34d399', fontWeight: 'bold' }]}>
                        {empProfile?.status || 'Active'}
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* 📄 TAB 2: AUTHENTIC THERMAL PAYSLIP */}
          {activeTab === 'slip' && (
            <View>
              {/* Month Selector Horizontal Pills */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthPillRow}>
                {monthOptions.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.monthPill, selectedMonth === opt.value && styles.monthPillActive]}
                    onPress={() => setSelectedMonth(opt.value)}
                  >
                    <Text style={selectedMonth === opt.value ? styles.monthPillTextActive : styles.monthPillText}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {loadingSlip ? (
                <ActivityIndicator size="large" color="#38bdf8" style={{ marginTop: 30 }} />
              ) : slip ? (
                /* Authentic Keltron Thermal Ticket Card */
                <View style={styles.ticketCard}>
                  <Text style={styles.tCompany}>{slip.companyName}</Text>
                  <Text style={styles.tLocation}>{slip.location}</Text>
                  <Text style={styles.tSection}>{slip.section}</Text>
                  <Text style={styles.tMonth}>{slip.month}</Text>
                  {slip.billingCycle ? (
                    <Text style={{ textAlign: 'center', fontSize: 10, color: '#475569', fontWeight: 'bold', marginTop: 2 }}>
                      [ Billing Cycle: {slip.billingCycle} (26th to 25th) ]
                    </Text>
                  ) : null}

                  <View style={styles.dashedLine} />

                  <View style={styles.tRowSpace}>
                    <Text style={styles.tBold}>
                      #{slip.tokenNo} {slip.employeeName}
                    </Text>
                    <Text style={styles.tBold}>Rate: {slip.dailyRate}</Text>
                  </View>

                  {/* Shift Breakdown */}
                  <Text style={[styles.tBold, { marginVertical: 4, fontSize: 11 }]}>
                    Days.G:{slip.daysGeneral}  SH-I:{slip.shift1Days}  SH-II:{slip.shift2Days}  SH-III:{slip.shift3Days}  OT:{slip.otHours}h
                  </Text>

                  <View style={styles.dashedLine} />

                  {/* Earnings & Deductions Columns */}
                  <View style={styles.twoColRow}>
                    <View style={{ flex: 1, paddingRight: 6 }}>
                      <Text style={styles.colHeader}>EARN (₹)</Text>
                      <View style={styles.tRowSpace}><Text style={styles.tLabel}>Rate Earn:</Text><Text style={styles.tVal}>{slip.basicEarned}</Text></View>
                      <View style={styles.tRowSpace}><Text style={styles.tLabel}>OHT_ERN:</Text><Text style={styles.tVal}>{slip.overtimeEarned}</Text></View>
                      <View style={styles.tRowSpace}><Text style={styles.tLabel}>SPL PAY:</Text><Text style={styles.tVal}>{slip.specialPay}</Text></View>
                      <View style={styles.tRowSpace}><Text style={styles.tLabel}>CONV:</Text><Text style={styles.tVal}>{slip.conveyance}</Text></View>
                      <View style={styles.tRowSpace}><Text style={styles.tLabelBold}>SHIFT ALLW:</Text><Text style={styles.tValBold}>{slip.shiftAllowance}</Text></View>
                      <View style={styles.tRowSpace}><Text style={styles.tLabel}>COIN-E:</Text><Text style={styles.tVal}>{slip.coinE}</Text></View>
                    </View>

                    <View style={{ flex: 1, paddingLeft: 6, borderLeftWidth: 1, borderLeftColor: '#cbd5e1' }}>
                      <Text style={styles.colHeader}>DED (₹)</Text>
                      <View style={styles.tRowSpace}><Text style={styles.tLabel}>CANT:</Text><Text style={styles.tVal}>{slip.canteenDeduction}</Text></View>
                      <View style={styles.tRowSpace}><Text style={styles.tLabel}>FEST.ADV:</Text><Text style={styles.tVal}>{slip.festivalAdvance}</Text></View>
                      <View style={styles.tRowSpace}><Text style={styles.tLabelBold}>PF:</Text><Text style={styles.tValBold}>{slip.providentFund}</Text></View>
                      <View style={styles.tRowSpace}><Text style={styles.tLabel}>ESI:</Text><Text style={styles.tVal}>{slip.esi}</Text></View>
                      <View style={styles.tRowSpace}><Text style={styles.tLabel}>PROF_TAX:</Text><Text style={styles.tVal}>{slip.professionalTax}</Text></View>
                      <View style={styles.tRowSpace}><Text style={styles.tLabel}>MEDI_INS:</Text><Text style={styles.tVal}>{slip.medicalInsurance}</Text></View>
                      <View style={styles.tRowSpace}><Text style={styles.tLabel}>COP_DED:</Text><Text style={styles.tVal}>{slip.cooperativeDeduction}</Text></View>
                    </View>
                  </View>

                  <View style={styles.dashedLine} />

                  <View style={styles.tRowSpace}>
                    <Text style={styles.tLabelBold}>Gross pay :</Text>
                    <Text style={styles.tValBold}>₹{slip.grossPay}</Text>
                  </View>
                  <View style={styles.tRowSpace}>
                    <Text style={styles.tLabelBold}>TOTAL DED :</Text>
                    <Text style={styles.tValBold}>₹{slip.totalDeductions}</Text>
                  </View>

                  <View style={[styles.tRowSpace, { marginTop: 6, paddingTop: 6, borderTopWidth: 2, borderTopColor: '#000' }]}>
                    <Text style={[styles.tBold, { fontSize: 15 }]}>Net pay :</Text>
                    <Text style={[styles.tBold, { fontSize: 17 }]}>₹{slip.netPay}</Text>
                  </View>
                </View>
              ) : (
                <Text style={{ textAlign: 'center', color: '#94a3b8', marginTop: 30 }}>No payslip record found.</Text>
              )}
            </View>
          )}

          {/* ✏️ TAB 3: DEDUCTIONS MANAGER */}
          {activeTab === 'deductions' && (
            <View style={styles.card}>
              <Text style={styles.sectionHeading}>✏️ Manage Monthly Deductions</Text>
              <Text style={styles.sectionSub}>Editing Token #{targetToken} for {selectedMonth}</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Canteen Deduction (CANT ₹):</Text>
                <TextInput style={styles.input} keyboardType="numeric" value={canteenDeduction} onChangeText={setCanteenDeduction} />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Festival Advance (FEST.ADV ₹):</Text>
                <TextInput style={styles.input} keyboardType="numeric" value={festivalAdvance} onChangeText={setFestivalAdvance} />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Provident Fund (PF ₹):</Text>
                <TextInput style={styles.input} keyboardType="numeric" value={providentFund} onChangeText={setProvidentFund} />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Professional Tax (PROF_TAX ₹):</Text>
                <TextInput style={styles.input} keyboardType="numeric" value={professionalTax} onChangeText={setProfessionalTax} />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Medical Insurance (MEDI_INS ₹):</Text>
                <TextInput style={styles.input} keyboardType="numeric" value={medicalInsurance} onChangeText={setMedicalInsurance} />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Cooperative Deduction (COP_DED ₹):</Text>
                <TextInput style={styles.input} keyboardType="numeric" value={cooperativeDeduction} onChangeText={setCooperativeDeduction} />
              </View>

              <View style={styles.totalBox}>
                <Text style={styles.totalLabel}>TOTAL DEDUCTIONS:</Text>
                <Text style={styles.totalVal}>
                  ₹{(
                    Number(canteenDeduction || 0) +
                    Number(festivalAdvance || 0) +
                    Number(providentFund || 0) +
                    Number(professionalTax || 0) +
                    Number(medicalInsurance || 0) +
                    Number(cooperativeDeduction || 0)
                  ).toFixed(2)}
                </Text>
              </View>

              <TouchableOpacity style={styles.btnPrimary} onPress={handleSaveDeductions} disabled={savingDeductions}>
                {savingDeductions ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnPrimaryText}>💾 Save Deductions</Text>}
              </TouchableOpacity>
            </View>
          )}

          {/* 📊 TAB 4: ATTENDANCE LOGS */}
          {activeTab === 'attendance' && (
            <View>
              <Text style={styles.sectionHeading}>📅 Recent Punch Logs ({attendanceLogs.length})</Text>
              {loadingAttendance ? (
                <ActivityIndicator size="large" color="#38bdf8" style={{ marginTop: 30 }} />
              ) : attendanceLogs.length > 0 ? (
                attendanceLogs.map((att) => {
                  const dateStr = att.date
                    ? new Date(att.date).toLocaleDateString('en-IN', {
                        weekday: 'short',
                        day: '2-digit',
                        month: 'short',
                      })
                    : 'N/A';
                  const inTime = att.punchIn
                    ? new Date(att.punchIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '—';
                  const outTime = att.punchOut
                    ? new Date(att.punchOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : 'On Shift';

                  return (
                    <View key={att._id} style={styles.attCard}>
                      <View style={styles.attRow}>
                        <Text style={styles.attDate}>{dateStr}</Text>
                        <View style={styles.shiftBadge}>
                          <Text style={styles.shiftText}>{att.shiftStartTime ? `Shift (${att.shiftStartTime})` : 'Shift'}</Text>
                        </View>
                      </View>

                      <View style={styles.attRow}>
                        <Text style={styles.attMeta}>In: {inTime}</Text>
                        <Text style={styles.attMeta}>Out: {outTime}</Text>
                        <Text style={[styles.attMeta, { color: '#38bdf8', fontWeight: 'bold' }]}>
                          {att.totalHours || 0} hrs
                        </Text>
                        <Text style={[styles.attMeta, { color: att.overtimeHours > 0 ? '#fbbf24' : '#94a3b8', fontWeight: 'bold' }]}>
                          OT: {att.overtimeHours || 0}h
                        </Text>
                      </View>
                    </View>
                  );
                })
              ) : (
                <Text style={{ textAlign: 'center', color: '#94a3b8', marginTop: 30 }}>No attendance records found.</Text>
              )}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
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
    paddingTop: 16,
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  tokenBadge: {
    backgroundColor: '#0284c7',
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#f8fafc',
    flex: 1,
  },
  headerSub: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  closeBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  closeBtnText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: 'bold',
  },
  toggleBar: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    padding: 4,
    marginHorizontal: 14,
    marginTop: 10,
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
    fontSize: 11,
    fontWeight: '700',
  },
  toggleTextActive: {
    color: '#ffffff',
  },
  content: {
    padding: 14,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 2,
  },
  sectionSub: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 12,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
  },
  statVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#f8fafc',
    marginVertical: 2,
  },
  statSub: {
    fontSize: 10,
    color: '#64748b',
  },
  cardHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38bdf8',
  },
  activeMachineBadge: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
  },
  activeMachineText: {
    color: '#22d3ee',
    fontSize: 11,
    fontWeight: '600',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  detailLabel: {
    fontSize: 12,
    color: '#94a3b8',
  },
  detailValue: {
    fontSize: 12,
    color: '#f8fafc',
    fontWeight: '600',
  },
  editBannerBtn: {
    backgroundColor: '#0284c7',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 10,
  },
  editBannerText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  label: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '700',
    marginBottom: 4,
    marginTop: 6,
  },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 6,
    color: '#f8fafc',
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
  },
  smallToggle: {
    backgroundColor: '#0f172a',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#334155',
  },
  smallToggleActive: {
    backgroundColor: '#0284c7',
    borderColor: '#0284c7',
  },
  smallToggleText: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
  },
  smallToggleTextActive: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  machChip: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#334155',
  },
  machChipActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    borderColor: '#38bdf8',
  },
  machChipText: {
    color: '#94a3b8',
    fontSize: 10,
  },
  machChipTextActive: {
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: 'bold',
  },
  btnPrimary: {
    backgroundColor: '#0284c7',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 10,
  },
  btnPrimaryText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  btnSecondary: {
    backgroundColor: '#334155',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 10,
  },
  btnSecondaryText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '700',
  },
  monthPillRow: {
    marginBottom: 12,
  },
  monthPill: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  monthPillActive: {
    backgroundColor: '#0284c7',
    borderColor: '#0284c7',
  },
  monthPillText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
  },
  monthPillTextActive: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  ticketCard: {
    backgroundColor: '#fafafa',
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  tCompany: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
  },
  tLocation: {
    fontSize: 10,
    color: '#000',
    textAlign: 'center',
  },
  tSection: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
  },
  tMonth: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
  },
  dashedLine: {
    height: 1,
    borderWidth: 1,
    borderColor: '#000',
    borderStyle: 'dashed',
    marginVertical: 4,
  },
  tRowSpace: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  tBold: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#000',
  },
  twoColRow: {
    flexDirection: 'row',
  },
  colHeader: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    paddingBottom: 2,
    marginBottom: 4,
  },
  tLabel: {
    fontSize: 9.5,
    color: '#000',
  },
  tVal: {
    fontSize: 9.5,
    color: '#000',
  },
  tLabelBold: {
    fontSize: 9.5,
    fontWeight: 'bold',
    color: '#000',
  },
  tValBold: {
    fontSize: 9.5,
    fontWeight: 'bold',
    color: '#000',
  },
  inputGroup: {
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 4,
  },
  totalBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    backgroundColor: '#0f172a',
    borderRadius: 6,
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  totalVal: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#f43f5e',
  },
  attCard: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  attRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 2,
  },
  attDate: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  shiftBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  shiftText: {
    color: '#818cf8',
    fontSize: 10,
    fontWeight: '700',
  },
  attMeta: {
    fontSize: 11,
    color: '#94a3b8',
  },
});
