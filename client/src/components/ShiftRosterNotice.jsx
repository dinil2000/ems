import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { Printer, RefreshCw, Sparkles, FileText, CheckCircle } from 'lucide-react';

const ShiftRosterNotice = () => {
  const { user, API_BASE } = useContext(AuthContext);
  const [roster, setRoster] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState('');

  const fetchRoster = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/shifts/latest`);
      setRoster(res.data);
    } catch (err) {
      console.warn('No active roster found:', err.message);
      setRoster(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoster();
  }, []);

  const handleAutoGenerate = async () => {
    setGenerating(true);
    setMessage('');
    try {
      const res = await axios.post(`${API_BASE}/shifts/auto-generate`, {
        weekStartDate: new Date().toISOString()
      });
      setRoster(res.data);
      setMessage('✨ Automated Weekly Shift Roster generated successfully based on Machine Expertise & MPP Rules!');
    } catch (err) {
      setMessage(`❌ Generation failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
        <RefreshCw className="animate-spin" size={32} />
        <p style={{ marginTop: '0.75rem' }}>Loading MPP Section Shift Roster...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto' }}>
      {/* Controls Header */}
      <div style={{
        display: 'flex',
        justify: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        backgroundColor: '#1e293b',
        padding: '1rem 1.5rem',
        borderRadius: '10px',
        border: '1px solid #334155'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <FileText style={{ color: '#06b6d4' }} size={24} />
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>Official MPP Weekly Shift Roster</h2>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
              Keltron Component Complex Limited Notice Board
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {user?.role === 'Supervisor' && (
            <button
              onClick={handleAutoGenerate}
              disabled={generating}
              className="btn btn-primary"
            >
              <Sparkles size={16} /> {generating ? 'Generating...' : 'Auto-Generate Shift Notice'}
            </button>
          )}
          <button onClick={handlePrint} className="btn btn-secondary">
            <Printer size={16} /> Print / Save PDF
          </button>
        </div>
      </div>

      {message && (
        <div style={{
          backgroundColor: 'rgba(16, 185, 129, 0.15)',
          color: '#34d399',
          border: '1px solid #10b981',
          padding: '0.75rem 1rem',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          fontSize: '0.9rem'
        }}>
          {message}
        </div>
      )}

      {/* Official Paper Notice Board Format */}
      {roster ? (
        <div className="notice-board animate-fade-in">
          {/* Keltron Header */}
          <div className="notice-header">
            <div className="notice-title">കെൽട്രോൺ കോംപനന്റ് കോംപ്ലക്സ് ലിമിറ്റഡ്</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#222' }}>കുറ്റിപ്പുറം (KUTTIPPURAM)</div>
            <div className="notice-subtitle" style={{ marginTop: '0.3rem' }}>
              ഉല്പാദന യൂണിറ്റ് 2 (MPP Section)
            </div>
            
            <div className="notice-meta">
              <div>പ്രേക്ഷക: ഉല്പാദനയൂണിറ്റ് 2 (MPP)</div>
              <div>സൂചന: {roster.noticeRefNo || 'PC12/XR/004'}</div>
            </div>
            <div className="notice-meta">
              <div>സ്വീക: ഭരണനിർവഹണവകുപ്പ് / സുരക്ഷാവിഭാഗം</div>
              <div>തീയതി: {new Date(roster.createdAt || Date.now()).toLocaleDateString('en-GB')}</div>
            </div>
          </div>

          <div style={{ textAlign: 'center', fontWeight: 600, fontSize: '0.92rem', marginBottom: '1.5rem', color: '#111' }}>
            ഉല്പാദനയൂണിറ്റ് 2 ലെ തൊഴിലാളികൾ <strong>{new Date(roster.weekStartDate).toLocaleDateString('en-GB')}</strong> മുതൽ <strong>{new Date(roster.weekEndDate).toLocaleDateString('en-GB')}</strong> വരെ തന്നിരിക്കുന്ന ഷിഫ്റ്റ്പ്രകാരം ജോലി ചെയ്യേണ്ടതാണെന്ന് അറിയിച്ചുകൊള്ളുന്നു.
          </div>

          {/* Render Shift Slots */}
          {roster.shifts.map((slot, idx) => (
            <div key={idx} className="shift-section">
              <div className="shift-title">
                <span><u>{slot.shiftType}</u></span>
                {slot.shiftInCharge?.name && (
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#333' }}>
                    Shift in Charge: {slot.shiftInCharge.tokenNo} {slot.shiftInCharge.name}
                  </span>
                )}
              </div>

              {slot.allocations.map((alloc, aIdx) => (
                <div key={aIdx} className="alloc-grid">
                  <div className="alloc-machine">
                    Machine {alloc.machineId}
                  </div>
                  <div className="alloc-names">
                    {alloc.assignedEmployees && alloc.assignedEmployees.length > 0 ? (
                      alloc.assignedEmployees.map((emp, eIdx) => (
                        <span key={eIdx} style={{ display: 'inline-block', marginRight: '1rem' }}>
                          {eIdx + 1}. <strong>{emp.tokenNo}</strong> {emp.name}
                        </span>
                      ))
                    ) : (
                      <span style={{ color: '#888', italic: true }}>No Operator Assigned</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}

          {/* General Shift Footnote in Malayalam */}
          <div className="notice-footer">
            <div>
              <strong>NB:</strong> മറ്റുള്ള ജീവനക്കാർ ജനറൽ ഷിഫ്റ്റിൽ ജോലി ചെയ്യേണ്ടതാണെന്ന് അറിയിച്ചുകൊള്ളുന്നു.
            </div>
            <div style={{ textAlign: 'right', marginTop: '1rem' }}>
              <div style={{ fontWeight: 700 }}>എസ്. ഐ. സി / വകുപ്പുമേധാവി</div>
              <div style={{ fontSize: '0.8rem', color: '#555' }}>Keltron MPP Management</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: '#94a3b8', fontSize: '1rem' }}>No published shift roster currently available.</p>
          {user?.role === 'Supervisor' && (
            <button onClick={handleAutoGenerate} className="btn btn-primary" style={{ marginTop: '1rem' }}>
              <Sparkles size={16} /> Generate First Roster Now
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ShiftRosterNotice;
