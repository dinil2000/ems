import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';

export default function ShiftNoticeScreen({ onBack }) {
  const [selectedUnit, setSelectedUnit] = useState('Unit 2');

  const unit2Shift1 = [
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

  const unit2Shift2 = [
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

  const unit2Shift3 = [
    { num: 18, tokenNo: '8713', name: 'യദുകൃഷ്ണ.എം.', machine: '700,705' },
    { num: 19, tokenNo: '8771', name: 'അഭിനവ്', machine: '710' },
    { num: 20, tokenNo: '8770', name: 'അജിത് ഗോപി', machine: '766' },
    { num: 21, tokenNo: '8794', name: 'അഭയരാജ്', machine: '' },
    { num: 22, tokenNo: '8793', name: 'അമൽ രാജ്', machine: '' },
    { num: 23, tokenNo: '8788', name: 'ദീക്ഷിത്', machine: '' },
  ];

  const unit1Shift1 = [
    { num: 1, tokenNo: '2202', name: 'അജയൻ', machine: '' },
    { num: 2, tokenNo: '158', name: 'അഗസ്റ്റിൻബൈജു', machine: '450' },
    { num: 3, tokenNo: '1496', name: 'വിജീഷ് എം', machine: '460' },
    { num: 4, tokenNo: '8392', name: 'രഞ്ജിത്ത് വി', machine: '480' },
    { num: 5, tokenNo: '8661', name: 'ഷഹദാൻ വി', machine: '470' },
    { num: 6, tokenNo: '8356', name: 'ദിനിൽ ദാസ്', machine: '' },
    { num: 7, tokenNo: '8706', name: 'ശരത്ത് എം.വി.', machine: '' },
    { num: 8, tokenNo: '211', name: 'അനുവിൻ', machine: '' },
  ];

  const unit1Shift2 = [
    { num: 1, tokenNo: '2187', name: 'ശ്രീജിൽ', machine: '' },
    { num: 2, tokenNo: '561', name: 'മുഹാദ്', machine: '450' },
    { num: 3, tokenNo: '1576', name: 'അഖിൽ വി പി', machine: '460' },
    { num: 4, tokenNo: '8239', name: 'പ്രജൂൽ എം പി', machine: '480' },
    { num: 5, tokenNo: '8591', name: 'നിവേദ് രവീന്ദ്രൻ', machine: '470' },
    { num: 6, tokenNo: '8707', name: 'പ്രഷിൻ കെ', machine: '' },
    { num: 7, tokenNo: '8752', name: 'ഹൃദ്യുൽ. കെ', machine: '' },
    { num: 8, tokenNo: '491', name: 'അശ്വന്ത്', machine: '' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Weekly Shift Notice</Text>
      </View>

      {/* Unit Selector Toggle */}
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, selectedUnit === 'Unit 2' && styles.toggleBtnActive]}
          onPress={() => setSelectedUnit('Unit 2')}
        >
          <Text style={[styles.toggleText, selectedUnit === 'Unit 2' && styles.toggleTextActive]}>
            Unit 2 Sheet
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
        {/* Notice Sheet Component */}
        <View style={styles.paperSheet}>
          <Text style={styles.sheetHeader}>കെൽട്രോൺ കോംപണന്റ് കോംപ്ലക്സ് ലിമിറ്റഡ്</Text>
          <Text style={styles.sheetSubHeader}>കുറിപ്പ്</Text>

          <View style={styles.metaRow}>
            <Text style={styles.metaText}>പ്രേഷകർ: ഉല്പാദനയൂണിറ്റ് {selectedUnit === 'Unit 2' ? '2' : '1'} (MPP)</Text>
            <Text style={styles.metaText}>സൂചന: പിസി12/XR/004</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>സ്വീക: ഭരണനിർവഹണവകുപ്പ് / സുരക്ഷാവിഭാഗം</Text>
            <Text style={styles.metaText}>തീയതി: 14.08.2026</Text>
          </View>

          <Text style={styles.noticeBody}>
            ഉല്പാദനയൂണിറ്റ് {selectedUnit === 'Unit 2' ? '2' : '1'} ലെ തൊഴിലാളികൾ 17/08/2026 മുതൽ 22/08/2026 വരെ തന്നിരിക്കുന്ന ഷിഫ്റ്റ് പ്രകാരം ജോലി ചെയ്യേണ്ടതാണെന്ന് അറിയിച്ചുകൊള്ളുന്നു.
          </Text>

          {/* Shift 1 */}
          <View style={styles.shiftBlock}>
            <View style={styles.shiftHeaderRow}>
              <Text style={styles.shiftTitle}>ഷിഫ്റ്റ്-1 (07.00AM-03.00PM)</Text>
              <Text style={styles.inCharge}>In Charge: 3085 ബിപിൻ</Text>
            </View>
            {(selectedUnit === 'Unit 2' ? unit2Shift1 : unit1Shift1).map((item) => (
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
            {(selectedUnit === 'Unit 2' ? unit2Shift2 : unit1Shift2).map((item) => (
              <View key={item.num} style={styles.empRow}>
                <Text style={styles.empInfo}>
                  {item.num}. {item.tokenNo} {item.name}
                </Text>
                <Text style={styles.machineNo}>{item.machine}</Text>
              </View>
            ))}
          </View>

          {/* Shift 3 (Only Unit 2 has Shift 3 minimal night crew) */}
          {selectedUnit === 'Unit 2' && (
            <View style={styles.shiftBlock}>
              <View style={styles.shiftHeaderRow}>
                <Text style={styles.shiftTitle}>ഷിഫ്റ്റ്-3 (11.00PM-07.00AM)</Text>
              </View>
              {unit2Shift3.map((item) => (
                <View key={item.num} style={styles.empRow}>
                  <Text style={styles.empInfo}>
                    {item.num}. {item.tokenNo} {item.name}
                  </Text>
                  <Text style={styles.machineNo}>{item.machine}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
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
  toggleRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 10,
    backgroundColor: '#1e293b',
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#0f172a',
  },
  toggleBtnActive: {
    backgroundColor: '#0284c7',
  },
  toggleText: {
    color: '#94a3b8',
    fontWeight: '600',
    fontSize: 13,
  },
  toggleTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  content: {
    padding: 16,
  },
  paperSheet: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 20,
  },
  sheetHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
  },
  sheetSubHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
    marginVertical: 4,
  },
  metaRow: {
    flexDirection: 'row',
    justify: 'space-between',
    marginVertical: 2,
  },
  metaText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#000000',
  },
  noticeBody: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000000',
    marginVertical: 12,
    lineHeight: 16,
  },
  shiftBlock: {
    marginBottom: 16,
  },
  shiftHeaderRow: {
    flexDirection: 'row',
    justify: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    paddingBottom: 4,
    marginBottom: 6,
  },
  shiftTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#000000',
  },
  inCharge: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000000',
  },
  empRow: {
    flexDirection: 'row',
    justify: 'space-between',
    paddingVertical: 3,
  },
  empInfo: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000000',
    flex: 1,
  },
  machineNo: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000000',
    width: 60,
    textAlign: 'right',
  },
});
