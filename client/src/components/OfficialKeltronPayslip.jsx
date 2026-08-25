import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { Printer, Download, DollarSign, Edit3, ShieldAlert } from 'lucide-react';

const OfficialKeltronPayslip = ({ tokenNoInput, onManageDeductions }) => {
  const { user, API_BASE } = useContext(AuthContext);
  const [slip, setSlip] = useState(null);
  const [loading, setLoading] = useState(true);

  const targetToken = tokenNoInput || user?.employeeToken || '8356';

  const fetchSlip = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/payroll/slip/${targetToken}?month=2026-05`);
      setSlip(res.data);
    } catch (err) {
      console.error('Payslip fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlip();
  }, [targetToken]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      {/* Action Header */}
      <div style={{
        display: 'flex',
        justify: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem',
        backgroundColor: '#1e293b',
        padding: '1rem 1.5rem',
        borderRadius: '12px',
        border: '1px solid #334155'
      }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
            Official Keltron Monthly Payslip Ticket
          </h3>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0.2rem 0 0 0' }}>
            Authentic Thermal Pay Ticket • Production Centre - I
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem' }}>
          {(user?.role === 'SiteAdmin' || user?.role === 'Supervisor') && onManageDeductions && (
            <button className="btn btn-secondary" onClick={onManageDeductions}>
              <Edit3 size={15} /> Edit Monthly Deductions
            </button>
          )}

          <button className="btn btn-primary" onClick={handlePrint}>
            <Printer size={15} /> Print Payslip
          </button>
        </div>
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', color: '#94a3b8', padding: '3rem' }}>Generating official Keltron payslip...</p>
      ) : slip ? (
        /* Authentic Thermal Ticket Container matching exact physical ticket */
        <div style={{
          backgroundColor: '#fafafa',
          color: '#000000',
          fontFamily: "'Courier New', Courier, monospace",
          padding: '2rem',
          borderRadius: '6px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
          border: '1px dashed #cbd5e1',
          lineHeight: '1.4',
          fontSize: '0.88rem'
        }}>
          {/* Company Header */}
          <div style={{ textAlign: 'center', marginBottom: '1.2rem' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 'bold', margin: 0, letterSpacing: '0.5px' }}>
              {slip.companyName}
            </h2>
            <p style={{ margin: '0.2rem 0', fontSize: '0.85rem' }}>{slip.location}</p>
            <p style={{ margin: '0.2rem 0', fontWeight: 'bold' }}>{slip.section}</p>
            <p style={{ margin: '0.3rem 0', fontWeight: 'bold', fontSize: '0.92rem' }}>{slip.month}</p>
          </div>

          <div style={{ borderBottom: '1px dashed #000', margin: '0.8rem 0' }} />

          {/* Employee Line & Daily Rate */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '0.95rem' }}>
            <span>{slip.tokenNo} {slip.employeeName}</span>
            <span>Rate: {slip.dailyRate}</span>
          </div>

          {/* Shift Counters Line */}
          <div style={{ margin: '0.6rem 0', fontWeight: 'bold', letterSpacing: '-0.3px' }}>
            Days.G:{slip.daysGeneral} &nbsp; SH-I:{slip.shift1Days} &nbsp; SH-II:{slip.shift2Days} &nbsp; SH-III:{slip.shift3Days} &nbsp; OT.HRS:{slip.otHours}
          </div>

          <div style={{ borderBottom: '1px dashed #000', margin: '0.8rem 0' }} />

          {/* Earnings & Deductions Grid Layout */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {/* Left Column: Earnings */}
            <div>
              <div style={{ fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '0.2rem', marginBottom: '0.4rem' }}>
                EARNINGS (₹)
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Basic Rate Earned:</span>
                <span>{slip.basicEarned}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>OHT_ERN (OT):</span>
                <span>{slip.overtimeEarned}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>SPL PAY:</span>
                <span>{slip.specialPay}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>CONV:</span>
                <span>{slip.conveyance}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                <span>SHIFT ALLW:</span>
                <span>{slip.shiftAllowance}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>COIN-E:</span>
                <span>{slip.coinE}</span>
              </div>
            </div>

            {/* Right Column: Deductions */}
            <div>
              <div style={{ fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '0.2rem', marginBottom: '0.4rem' }}>
                DEDUCTIONS (₹)
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>CANT (Canteen):</span>
                <span>{slip.canteenDeduction}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>FEST.ADV:</span>
                <span>{slip.festivalAdvance}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                <span>PF:</span>
                <span>{slip.providentFund}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>ESI:</span>
                <span>{slip.esi}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>PROF_TAX:</span>
                <span>{slip.professionalTax}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>MEDI_INS:</span>
                <span>{slip.medicalInsurance}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>COP_DED:</span>
                <span>{slip.cooperativeDeduction}</span>
              </div>
            </div>
          </div>

          <div style={{ borderBottom: '1px dashed #000', margin: '1rem 0' }} />

          {/* Gross Pay, Total Ded, Net Pay Footer */}
          <div style={{ fontSize: '0.95rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
              <span>Gross pay :</span>
              <span>₹{slip.grossPay}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', margin: '0.3rem 0' }}>
              <span>TOTAL DED :</span>
              <span>₹{slip.totalDeductions}</span>
            </div>

            <div style={{
              display: 'flex',
              justify: 'space-between',
              fontWeight: '900',
              fontSize: '1.2rem',
              marginTop: '0.8rem',
              borderTop: '2px solid #000',
              paddingTop: '0.6rem'
            }}>
              <span>Net pay :</span>
              <span>₹{slip.netPay}</span>
            </div>
          </div>
        </div>
      ) : (
        <p style={{ textAlign: 'center', color: '#94a3b8' }}>Unable to load payslip data.</p>
      )}
    </div>
  );
};

export default OfficialKeltronPayslip;
