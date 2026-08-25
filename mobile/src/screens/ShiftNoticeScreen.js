import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import axios from 'axios';
import { getApiUrlList } from '../config/api';

export default function ShiftNoticeScreen({ user, onBack }) {
  const [selectedUnit, setSelectedUnit] = useState('Unit 2');
  const [rosterList, setRosterList] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchRosters = async () => {
    setLoading(true);
    try {
      const urls = await getApiUrlList();
      for (const url of urls) {
        try {
          const res = await axios.get(`${url}/shifts/all`, { timeout: 6000 });
          if (res.data && res.data.length > 0) {
            setRosterList(res.data);
            setCurrentIndex(0);
          }
          break;
        } catch (e) {}
      }
    } catch (err) {
      console.error('Error fetching rosters:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRosters();
  }, []);

  const handleGenerateRoster = async () => {
    Alert.alert(
      'Generate Next Week Shift Notice',
      'Generate automated shift schedule (Monday to Saturday)? All 1st Shift workers will rotate to 2nd Shift, and 2nd Shift workers to 1st Shift with Friday Issue Date!',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate Now',
          onPress: async () => {
            setGenerating(true);
            try {
              const urls = await getApiUrlList();
              let res = null;
              for (const url of urls) {
                try {
                  res = await axios.post(`${url}/shifts/auto-generate`, {
                    requesterRole: user?.role,
                  }, { timeout: 8000 });
                  if (res) break;
                } catch (e) {}
              }

              if (res) {
                Alert.alert('Success', res.data.message);
                await fetchRosters();
              } else {
                Alert.alert('Error', 'Unable to trigger shift generation.');
              }
            } catch (err) {
              Alert.alert('Generation Failed', err.response?.data?.message || err.message);
            } finally {
              setGenerating(false);
            }
          }
        }
      ]
    );
  };

  const currentRoster = rosterList[currentIndex] || null;

  const formatDateSlash = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };

  const formatDateDot = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
  };

  const issueDateStr = currentRoster?.noticeIssueDate
    ? formatDateDot(currentRoster.noticeIssueDate)
    : (currentRoster?.weekStartDate
        ? formatDateDot(new Date(new Date(currentRoster.weekStartDate).getTime() - 3 * 24 * 60 * 60 * 1000))
        : '14.08.2026');

  const startDateStr = currentRoster?.weekStartDate ? formatDateSlash(currentRoster.weekStartDate) : '17/08/2026';
  const endDateStr = currentRoster?.weekEndDate ? formatDateSlash(currentRoster.weekEndDate) : '22/08/2026';
  const noticeRefNo = currentRoster?.noticeRefNo || 'PC12/XR/004';

  const canGenerate = user && (user.role === 'Supervisor' || user.role === 'SiteAdmin');

  // Extract shift slots dynamically from current active roster
  const getShiftAllocations = (shiftTypeKeyword) => {
    if (!currentRoster || !currentRoster.shifts) return null;
    const slot = currentRoster.shifts.find(s => s.shiftType && s.shiftType.includes(shiftTypeKeyword));
    if (!slot || !slot.allocations || slot.allocations.length === 0) return null;

    let count = 1;
    const items = [];
    slot.allocations.forEach(alloc => {
      if (alloc.assignedEmployees && alloc.assignedEmployees.length > 0) {
        alloc.assignedEmployees.forEach(emp => {
          items.push({
            num: count++,
            tokenNo: emp.tokenNo,
            name: emp.name,
            machine: alloc.machineId && alloc.machineId !== 'GENERAL_MPP' ? alloc.machineId : ''
          });
        });
      }
    });
    return items.length > 0 ? items : null;
  };

  // Fallback data matching official physical notice sheet
  const fallbackUnit2Shift1 = [
    { num: 1, tokenNo: '8709', name: 'ഹമൽ പി വി', machine: '700,705' },
    { num: 2, tokenNo: '1563', name: 'റചിൻ ലാൽ', machine: '' },
    { num: 3, tokenNo: '8662', name: 'ഷാഹിൽ അലി പി കെ', machine: '701' },
    { num: 4, tokenNo: '1573', name: 'മനോജ് / 205 പ്രത്യുഷ്', machine: '710' },
    { num: 5, tokenNo: '1558', name: 'പ്രേമരാജൻ', machine: '711' },
    { num: 6, tokenNo: '1473', name: 'ടി. യു മിഥുൻ', machine: '765(1)' },
    { num: 7, tokenNo: '8590', name: 'അജിൻ ഫ്രാൻസിസ്', machine: '' },
    { num: 8, tokenNo: '482', name: 'അനുരാജ്', machine: '' },
    { num: 9, tokenNo: '8769', name: 'രാഹുൽ', machine: '' },
    { num: 10, tokenNo: '8391', name: 'പ്രദീഷ് കെ', machine: '765(2)' },
    { num: 11, tokenNo: '200', name: 'അഭിനന്ദ് രാജു', machine: '' },
    { num: 12, tokenNo: '8652', name: 'അമൽനാഥ്', machine: '' },
    { num: 13, tokenNo: '8705', name: 'ഹൃദ്യുൽ', machine: '' },
    { num: 14, tokenNo: '1484', name: 'ജിമാഷ്', machine: '766' },
    { num: 15, tokenNo: '8660', name: 'അശ്വന്ത് എ', machine: '' },
  ];

  const fallbackUnit2Shift2 = [
    { num: 1, tokenNo: '8271', name: 'സുഗേഷ് കെ', machine: '700,705' },
    { num: 2, tokenNo: '8787', name: 'അർജുൻ', machine: '701' },
    { num: 3, tokenNo: '1497', name: 'ദിലീപ് എസ് കെ', machine: '710' },
    { num: 4, tokenNo: '1572', name: 'റെജിൻ', machine: '711' },
    { num: 5, tokenNo: '8563', name: 'ജിബിൻ വർഗീസ്', machine: '765(1)' },
    { num: 6, tokenNo: '8512', name: 'ജിതിൻ ജനാർദ്ദനൻ', machine: '' },
    { num: 7, tokenNo: '8710', name: 'പ്രഡിജിത്ത്', machine: '' },
    { num: 8, tokenNo: '494', name: 'സിനാൻ', machine: '' },
    { num: 9, tokenNo: '231', name: 'ഷമൽ', machine: '765(2)' },
    { num: 10, tokenNo: '8712', name: 'മൃദുൽ എ കെ.', machine: '' },
    { num: 11, tokenNo: '8711', name: 'ദൃശ്യന്ത് എ', machine: '' },
    { num: 12, tokenNo: '160', name: 'അനൂപ്', machine: '' },
    { num: 13, tokenNo: '8645', name: 'അഭീജിത്ത്', machine: '766' },
    { num: 14, tokenNo: '8344', name: 'നിതിൻ സി', machine: '' },
    { num: 15, tokenNo: '8357', name: 'ശരത്ത് എ', machine: '' },
    { num: 16, tokenNo: '8623', name: 'മുബീൻ', machine: '' },
    { num: 17, tokenNo: '8747', name: 'റിഷഭ്', machine: '' },
  ];

  const fallbackUnit2Shift3 = [
    { num: 18, tokenNo: '8713', name: 'യദുകൃഷ്ണ.എം.', machine: '700,705' },
    { num: 19, tokenNo: '8771', name: 'അഭിനവ്', machine: '710' },
    { num: 20, tokenNo: '8770', name: 'അജിത് ഗോപി', machine: '766' },
    { num: 21, tokenNo: '8794', name: 'അഭയരാജ്', machine: '' },
    { num: 22, tokenNo: '8793', name: 'അമൽ രാജ്', machine: '' },
    { num: 23, tokenNo: '8788', name: 'ദീക്ഷിത്', machine: '' },
  ];

  const parsedShift1 = getShiftAllocations('Shift-1');
  const parsedShift2 = getShiftAllocations('Shift-2');
  const parsedShift3 = getShiftAllocations('Shift-3');

  const displayShift1 = parsedShift1 || fallbackUnit2Shift1;
  const displayShift2 = parsedShift2 || fallbackUnit2Shift2;
  const displayShift3 = parsedShift3 || fallbackUnit2Shift3;

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header Bar with Back Button */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backBtnText}>◀ Back to Home</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Weekly Shift Notice</Text>
      </View>

      {/* Week Navigation Controls */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={[styles.navBtn, currentIndex >= rosterList.length - 1 && styles.navBtnDisabled]}
          disabled={currentIndex >= rosterList.length - 1}
          onPress={() => setCurrentIndex(prev => Math.min(prev + 1, rosterList.length - 1))}
        >
          <Text style={styles.navBtnText}>◀ Prev Week</Text>
        </TouchableOpacity>

        <Text style={styles.weekLabel}>
          Week {rosterList.length - currentIndex} of {rosterList.length || 1}
        </Text>

        <TouchableOpacity
          style={[styles.navBtn, currentIndex <= 0 && styles.navBtnDisabled]}
          disabled={currentIndex <= 0}
          onPress={() => setCurrentIndex(prev => Math.max(prev - 1, 0))}
        >
          <Text style={styles.navBtnText}>Next Week ▶</Text>
        </TouchableOpacity>
      </View>

      {canGenerate && (
        <TouchableOpacity
          style={styles.genBtn}
          onPress={handleGenerateRoster}
          disabled={generating}
        >
          {generating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.genBtnText}>⚡ Auto-Generate Next Week Shift</Text>
          )}
        </TouchableOpacity>
      )}

      {/* Unit Selector Toggle */}
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, selectedUnit === 'Unit 2' && styles.toggleBtnActive]}
          onPress={() => setSelectedUnit('Unit 2')}
        >
          <Text style={[styles.toggleText, selectedUnit === 'Unit 2' && styles.toggleTextActive]}>
            Unit 2 Sheet (MPP)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toggleBtn, selectedUnit === 'Unit 1' && styles.toggleBtnActive]}
          onPress={() => setSelectedUnit('Unit 1')}
        >
          <Text style={[styles.toggleText, selectedUnit === 'Unit 1' && styles.toggleTextActive]}>
            Unit 1 Sheet
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color="#38bdf8" style={{ marginTop: 40 }} />
        ) : (
          /* Official Printed Sheet Layout matching physical notice */
          <View style={styles.paperSheet}>
            <Text style={styles.sheetHeader}>കെൽട്രോൺ കോംപണന്റ് കോംപ്ലക്സ് ലിമിറ്റഡ്</Text>
            <Text style={styles.sheetSubHeader}>കുറിപ്പ്</Text>

            <View style={styles.metaRow}>
              <Text style={styles.metaText}>പ്രേഷകർ: ഉല്പാദനയൂണിറ്റ് {selectedUnit === 'Unit 2' ? '2' : '1'} (MPP)</Text>
              <Text style={styles.metaText}>സൂചന: {noticeRefNo}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>സ്വീക: ഭരണനിർവഹണവകുപ്പ് / സുരക്ഷാവിഭാഗം</Text>
              <Text style={styles.metaText}>തീയതി: {issueDateStr}</Text>
            </View>

            <Text style={styles.noticeBody}>
              ഉല്പാദനയൂണിറ്റ് {selectedUnit === 'Unit 2' ? '2' : '1'} ലെ തൊഴിലാളികൾ {startDateStr} മുതൽ {endDateStr} വരെ തന്നിരിക്കുന്ന ഷിഫ്റ്റ് പ്രകാരം ജോലി ചെയ്യേണ്ടതാണെന്ന് അറിയിച്ചുകൊള്ളുന്നു.
            </Text>

            {/* Shift 1 */}
            <View style={styles.shiftBlock}>
              <View style={styles.shiftHeaderRow}>
                <Text style={styles.shiftTitle}>ഷിഫ്റ്റ്-1 (07.00AM-03.00PM)</Text>
                <Text style={styles.inCharge}>In Charge: 3085 ബിപിൻ</Text>
              </View>
              {displayShift1.map((item) => (
                <View key={item.num} style={styles.empRow}>
                  <Text style={styles.empInfo}>
                    {item.num}. {item.tokenNo} {item.name}
                  </Text>
                  <Text style={styles.machineNo}>{item.machine}</Text>
                </View>
              ))}
            </View>

            {/* Shift 2 */}
            <View style={styles.shiftBlock}>
              <View style={styles.shiftHeaderRow}>
                <Text style={styles.shiftTitle}>ഷിഫ്റ്റ്-2 (03.00PM-11.00PM)</Text>
                <Text style={styles.inCharge}>In Charge: 851 രാഹുൽ</Text>
              </View>
              {displayShift2.map((item) => (
                <View key={item.num} style={styles.empRow}>
                  <Text style={styles.empInfo}>
                    {item.num}. {item.tokenNo} {item.name}
                  </Text>
                  <Text style={styles.machineNo}>{item.machine}</Text>
                </View>
              ))}
            </View>

            {/* Shift 3 */}
            {selectedUnit === 'Unit 2' && (
              <View style={styles.shiftBlock}>
                <View style={styles.shiftHeaderRow}>
                  <Text style={styles.shiftTitle}>ഷിഫ്റ്റ്-3 (11.00PM-07.00AM)</Text>
                </View>
                {displayShift3.map((item) => (
                  <View key={item.num} style={styles.empRow}>
                    <Text style={styles.empInfo}>
                      {item.num}. {item.tokenNo} {item.name}
                    </Text>
                    <Text style={styles.machineNo}>{item.machine}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Footer */}
            <View style={{ marginTop: 16, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#000', borderStyle: 'dashed' }}>
              <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#000' }}>
                NB: മറ്റുമുള്ള ജീവനക്കാർ ജനറൽ ഷിഫ്റ്റിൽ ജോലി ചെയ്യേണ്ടതാണെന്ന് അറിയിച്ചു കൊള്ളുന്നു.
              </Text>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 24 }}>
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#000' }}>എസ്. എ. സി.</Text>
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#000' }}>വകുപ്പ്മേധാവി</Text>
              </View>
            </View>
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
    fontSize: 16,
    fontWeight: '800',
    color: '#f8fafc',
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  navBtn: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  navBtnDisabled: {
    opacity: 0.4,
  },
  navBtnText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700',
  },
  weekLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  genBtn: {
    backgroundColor: '#6366f1',
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  genBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  toggleRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    backgroundColor: '#1e293b',
    marginTop: 8,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
    backgroundColor: '#0f172a',
  },
  toggleBtnActive: {
    backgroundColor: '#0284c7',
  },
  toggleText: {
    color: '#94a3b8',
    fontWeight: '600',
    fontSize: 12,
  },
  toggleTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  paperSheet: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  sheetHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
  },
  sheetSubHeader: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
    marginVertical: 2,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  metaText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000000',
  },
  noticeBody: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#000000',
    marginVertical: 10,
    lineHeight: 15,
  },
  shiftBlock: {
    marginBottom: 14,
  },
  shiftHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    paddingBottom: 3,
    marginBottom: 4,
  },
  shiftTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000000',
  },
  inCharge: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#000000',
  },
  empRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  empInfo: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#000000',
    flex: 1,
  },
  machineNo: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#000000',
    width: 65,
    textAlign: 'right',
  },
});
