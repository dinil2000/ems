import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { Printer, Calendar, ChevronLeft, ChevronRight, Zap } from 'lucide-react';

const ShiftRosterNotice = () => {
  const { user, API_BASE } = useContext(AuthContext);
  const [rosterList, setRosterList] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genMessage, setGenMessage] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('Unit 2'); // 'Unit 1', 'Unit 2', or 'All'

  const fetchRosters = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/shifts/all`);
      if (res.data && res.data.length > 0) {
        setRosterList(res.data);
      }
    } catch (err) {
      console.error('Error fetching roster notices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRosters();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleGenerateRoster = async () => {
    if (!window.confirm('Generate next week automated shift schedule (Monday to Saturday)? All 1st Shift workers will rotate to 2nd Shift, and 2nd Shift workers will rotate to 1st Shift with Friday Issue Date!')) {
      return;
    }
    setGenerating(true);
    setGenMessage('');
    try {
      const res = await axios.post(`${API_BASE}/shifts/auto-generate`, {
        requesterRole: user?.role
      });
      setGenMessage(`✅ ${res.data.message}`);
      // Re-fetch all rosters and jump to newly created roster (Index 0)
      const listRes = await axios.get(`${API_BASE}/shifts/all`);
      if (listRes.data && listRes.data.length > 0) {
        setRosterList(listRes.data);
        setCurrentIndex(0);
      }
    } catch (err) {
      setGenMessage(`❌ Shift Generation Failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  // Helper to format date in DD.MM.YYYY
  const formatDateDot = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
  };

  // Helper to format date in DD/MM/YYYY
  const formatDateSlash = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };

  const currentRoster = rosterList[currentIndex] || null;

  // Extract shift slots from current active roster
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

  // Fallback data matching official physical notice sheet 1 if DB is empty
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
    { num: 1, tokenNo: '8271', name: 'സുഗേഷ് കെ / 562 അഭിലാഷ് കെ.', machine: '700,705' },
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

  const displayUnit2Shift1 = parsedShift1 || fallbackUnit2Shift1;
  const displayUnit2Shift2 = parsedShift2 || fallbackUnit2Shift2;
  const displayUnit2Shift3 = parsedShift3 || fallbackUnit2Shift3;

  const canGenerateShift = user && (user.role === 'Supervisor' || user.role === 'SiteAdmin');

  // Compute exact Friday Issue Date
  const issueDateFormatted = currentRoster?.noticeIssueDate
    ? formatDateDot(currentRoster.noticeIssueDate)
    : (currentRoster?.weekStartDate
        ? formatDateDot(new Date(new Date(currentRoster.weekStartDate).getTime() - 3 * 24 * 60 * 60 * 1000))
        : '14.08.2026');

  // Compute exact Monday to Saturday work period dates
  const startDateFormatted = currentRoster?.weekStartDate ? formatDateSlash(currentRoster.weekStartDate) : '17/08/2026';
  const endDateFormatted = currentRoster?.weekEndDate ? formatDateSlash(currentRoster.weekEndDate) : '22/08/2026';
  const noticeRefNo = currentRoster?.noticeRefNo || 'PC12/XR/004';

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '1rem' }}>
      {/* Controls & Navigation Header */}
      <div style={{
        display: 'flex',
        justify: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        backgroundColor: '#1e293b',
        padding: '1rem 1.5rem',
        borderRadius: '12px',
        border: '1px solid #334155'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Calendar style={{ color: '#06b6d4' }} size={24} />
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>MPP Section Weekly Shift Notice Board</h2>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
              Ref: <strong>{noticeRefNo}</strong> • Issue Date (Friday): <strong>{issueDateFormatted}</strong> • Work Period: <strong>{startDateFormatted} - {endDateFormatted}</strong>
            </p>
          </div>
        </div>

        {/* Previous / Next Week Roster Navigation Controls */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', backgroundColor: '#0f172a', padding: '0.2rem', borderRadius: '8px', border: '1px solid #334155' }}>
            <button
              onClick={() => setCurrentIndex(prev => Math.min(prev + 1, rosterList.length - 1))}
              disabled={currentIndex >= rosterList.length - 1}
              className="btn btn-secondary"
              style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
              title="View Previous Week Notice"
            >
              <ChevronLeft size={16} /> Previous Week
            </button>
            <span style={{ fontSize: '0.78rem', color: '#38bdf8', padding: '0 0.5rem', fontWeight: 700 }}>
              Week {rosterList.length - currentIndex} of {rosterList.length || 1}
            </span>
            <button
              onClick={() => setCurrentIndex(prev => Math.max(prev - 1, 0))}
              disabled={currentIndex <= 0}
              className="btn btn-secondary"
              style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
              title="View Next Week Notice"
            >
              Next Week <ChevronRight size={16} />
            </button>
          </div>

          {canGenerateShift && (
            <button
              onClick={handleGenerateRoster}
              disabled={generating}
              className="btn btn-primary"
              style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem', backgroundColor: '#6366f1' }}
            >
              <Zap size={16} /> {generating ? 'Generating...' : '⚡ Generate Next Week Shift Notice'}
            </button>
          )}

          <button onClick={handlePrint} className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem' }}>
            <Printer size={16} /> Print
          </button>
        </div>
      </div>

      {genMessage && (
        <div style={{
          backgroundColor: genMessage.includes('✅') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
          color: genMessage.includes('✅') ? '#34d399' : '#f87171',
          border: genMessage.includes('✅') ? '1px solid #10b981' : '1px solid #f43f5e',
          padding: '0.75rem 1rem',
          borderRadius: '8px',
          marginBottom: '1.25rem',
          fontSize: '0.85rem'
        }}>
          {genMessage}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
          Loading official shift notice board...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* 📄 NOTICE SHEET: PRODUCTION UNIT 2 (MPP) */}
          <div className="card notice-sheet" style={{
            backgroundColor: '#ffffff',
            color: '#000000',
            padding: '2.5rem 3rem',
            borderRadius: '4px',
            fontFamily: 'serif, sans-serif',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            border: '1px solid #ccc'
          }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '1.2rem', borderBottom: '2px solid #000', paddingBottom: '0.5rem' }}>
              <h1 style={{ fontSize: '1.7rem', fontWeight: 'bold', margin: 0 }}>
                കെൽട്രോൺ കോംപണന്റ് കോംപ്ലക്സ് ലിമിറ്റഡ്
              </h1>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: '0.2rem 0' }}>കുറിപ്പ്</h3>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginTop: '0.5rem', fontWeight: 'bold' }}>
                <span>പ്രേഷകർ: ഉല്പാദനയൂണിറ്റ് 2 (MPP)</span>
                <span>സൂചന: {noticeRefNo}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 'bold' }}>
                <span>സ്വീക: ഭരണനിർവഹണവകുപ്പ് / സുരക്ഷാവിഭാഗം/പകർപ്പ്</span>
                <span>തീയതി: {issueDateFormatted}</span>
              </div>
            </div>

            {/* Subheading */}
            <p style={{ fontSize: '0.95rem', fontWeight: 'bold', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              ഉല്പാദനയൂണിറ്റ് 2 ലെ തൊഴിലാളികൾ <strong>{startDateFormatted}</strong> മുതൽ <strong>{endDateFormatted}</strong> വരെ തന്നിരിക്കുന്ന ഷിഫ്റ്റ് പ്രകാരം ജോലി ചെയ്യേണ്ടതാണെന്ന് അറിയിച്ചുകൊള്ളുന്നു.
            </p>

            {/* Shift 1 */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #000', paddingBottom: '0.3rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>ഷിഫ്റ്റ്-1 (07.00AM-03.00PM)</span>
                <span style={{ fontSize: '1rem', fontWeight: 'bold' }}>Shift in Charge: 3085 ബിപിൻ ഇ പി</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', paddingLeft: '1rem' }}>
                {displayUnit2Shift1.map(item => (
                  <div key={item.num} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', fontWeight: 'bold' }}>
                    <span style={{ width: '380px' }}>
                      {item.num}. &nbsp; {item.tokenNo} &nbsp; {item.name}
                    </span>
                    <span style={{ textAlign: 'left', width: '120px' }}>{item.machine}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Shift 2 */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #000', paddingBottom: '0.3rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>ഷിഫ്റ്റ്-2 (03.00PM-11.00 PM)</span>
                <span style={{ fontSize: '1rem', fontWeight: 'bold' }}>Shift in Charge: 851 രാഹുൽ.</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', paddingLeft: '1rem' }}>
                {displayUnit2Shift2.map(item => (
                  <div key={item.num} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', fontWeight: 'bold' }}>
                    <span style={{ width: '380px' }}>
                      {item.num}. &nbsp; {item.tokenNo} &nbsp; {item.name}
                    </span>
                    <span style={{ textAlign: 'left', width: '120px' }}>{item.machine}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Shift 3 */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ borderBottom: '1px solid #000', paddingBottom: '0.3rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>ഷിഫ്റ്റ്-3 (11.00 PM-07.00 AM)</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', paddingLeft: '1rem' }}>
                {displayUnit2Shift3.map(item => (
                  <div key={item.num} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', fontWeight: 'bold' }}>
                    <span style={{ width: '380px' }}>
                      {item.num}. &nbsp; {item.tokenNo} &nbsp; {item.name}
                    </span>
                    <span style={{ textAlign: 'left', width: '120px' }}>{item.machine}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Note */}
            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px dashed #000' }}>
              <p style={{ fontSize: '0.9rem', fontWeight: 'bold', margin: 0 }}>
                NB: മറ്റുമുള്ള ജീവനക്കാർ ജനറൽ ഷിഫ്റ്റിൽ ജോലി ചെയ്യേണ്ടതാണെന്ന് അറിയിച്ചു കൊള്ളുന്നു.
              </p>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2.5rem', fontSize: '0.95rem', fontWeight: 'bold' }}>
                <span>എസ്. എ. സി.</span>
                <span>വകുപ്പ്മേധാവി</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShiftRosterNotice;
