import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import {
  BookOpen,
  PlusCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Printer,
  RefreshCw,
  Search,
  Filter,
  MessageSquare,
  Edit3,
  Trash2,
  X,
  Save,
  Check,
  Cpu
} from 'lucide-react';

const MACHINES_LIST = [
  { id: '700', name: 'Winding Machine #700', unit: 'Unit 2', cat: 'Winding' },
  { id: '705', name: 'Winding Machine #705', unit: 'Unit 2', cat: 'Winding' },
  { id: '701', name: 'Winding Machine #701', unit: 'Unit 2', cat: 'Winding' },
  { id: '710', name: 'Testing Machine #710', unit: 'Unit 2', cat: 'Testing' },
  { id: '711', name: 'Testing Machine #711', unit: 'Unit 2', cat: 'Testing' },
  { id: '765(1)', name: 'Metalizing Machine #765(1)', unit: 'Unit 2', cat: 'Metalizing' },
  { id: '765(2)', name: 'Metalizing Machine #765(2)', unit: 'Unit 2', cat: 'Metalizing' },
  { id: '766', name: 'Metalizing Machine #766', unit: 'Unit 2', cat: 'Metalizing' },
  { id: '0450', name: 'Winding Machine #0450', unit: 'Unit 1', cat: 'Winding' },
  { id: '0460', name: 'Winding Machine #0460', unit: 'Unit 1', cat: 'Winding' },
  { id: '0470', name: 'Metalizing Machine #0470', unit: 'Unit 1', cat: 'Metalizing' },
  { id: '0480', name: 'Testing Machine #0480', unit: 'Unit 1', cat: 'Testing' },
];

const MachineLogBookPage = () => {
  const { user, API_BASE } = useContext(AuthContext);
  const isSupervisorOrAdmin = user?.role === 'Supervisor' || user?.role === 'SiteAdmin';

  const [selectedMachineId, setSelectedMachineId] = useState('700');
  const [activeFilterTab, setActiveFilterTab] = useState('all'); // 'all', 'pending', 'approved', 'my'
  const [searchQuery, setSearchQuery] = useState('');
  const [logs, setLogs] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  // Add Log Entry Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [addForm, setAddForm] = useState({
    machineId: '700',
    date: new Date().toISOString().split('T')[0],
    shift: 'Shift 1',
    partNo: '',
    rating: '',
    workOrderNo: '',
    routeCardNo: '',
    quantity: '',
    remarks: '',
  });

  // Supervisor Verification Modal State
  const [verifyingLog, setVerifyingLog] = useState(null);
  const [supervisorNotes, setSupervisorNotes] = useState('');
  const [verifying, setVerifying] = useState(false);

  // Employee Edit / Resubmit Modal State
  const [editingLog, setEditingLog] = useState(null);
  const [editForm, setEditForm] = useState({
    shift: 'Shift 1',
    partNo: '',
    rating: '',
    workOrderNo: '',
    routeCardNo: '',
    quantity: '',
    remarks: '',
    date: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Fetch machine logs
  const fetchLogs = async () => {
    setLoading(true);
    try {
      let endpoint = `${API_BASE}/machine-logs?machineId=${selectedMachineId}`;
      if (activeFilterTab === 'pending') {
        endpoint = `${API_BASE}/machine-logs?machineId=${selectedMachineId}&status=Pending%20Approval`;
      } else if (activeFilterTab === 'approved') {
        endpoint = `${API_BASE}/machine-logs?machineId=${selectedMachineId}&status=Approved`;
      } else if (activeFilterTab === 'my') {
        endpoint = `${API_BASE}/machine-logs?operatorToken=${user?.employeeToken}`;
      }

      const [logRes, pendingRes] = await Promise.all([
        axios.get(endpoint),
        axios.get(`${API_BASE}/machine-logs/pending`)
      ]);

      setLogs(logRes.data || []);
      setPendingCount(pendingRes.data?.count || 0);
    } catch (err) {
      console.error('Failed to fetch machine logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [selectedMachineId, activeFilterTab]);

  // Open Add Modal
  const handleOpenAddModal = () => {
    setAddForm({
      machineId: selectedMachineId,
      date: new Date().toISOString().split('T')[0],
      shift: 'Shift 1',
      partNo: '',
      rating: '',
      workOrderNo: '',
      routeCardNo: '',
      quantity: '',
      remarks: '',
    });
    setMessage('');
    setIsAddModalOpen(true);
  };

  // Submit Add Form
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!addForm.partNo || !addForm.rating || !addForm.workOrderNo || !addForm.routeCardNo || !addForm.quantity) {
      setMessage('❌ Please fill in all required fields (P.No, Rating, W.O. No, R.C. No, Qty).');
      return;
    }

    setSubmitting(true);
    setMessage('');
    try {
      const selectedMach = MACHINES_LIST.find(m => m.id === addForm.machineId);
      const res = await axios.post(`${API_BASE}/machine-logs`, {
        ...addForm,
        machineName: selectedMach ? selectedMach.name : `Machine #${addForm.machineId}`,
        unit: selectedMach ? selectedMach.unit : 'Unit 2',
        operatorToken: user?.employeeToken,
        operatorName: user?.employeeProfile?.name || `Token #${user?.employeeToken}`,
      });

      setMessage(res.data.message);
      setIsAddModalOpen(false);
      fetchLogs();
    } catch (err) {
      setMessage(`❌ Failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Open Supervisor Verify Modal
  const handleOpenVerifyModal = (log) => {
    setVerifyingLog(log);
    setSupervisorNotes(log.supervisorNotes || '');
    setMessage('');
  };

  // Submit Supervisor Verification (Approve or Reject with feedback note)
  const handleVerifyAction = async (action) => {
    if (!verifyingLog) return;
    setVerifying(true);
    setMessage('');
    try {
      const res = await axios.put(`${API_BASE}/machine-logs/${verifyingLog._id}/verify`, {
        action,
        supervisorNotes,
        supervisorToken: user?.employeeToken,
        supervisorName: user?.employeeProfile?.name || 'Supervisor',
      });

      setMessage(res.data.message);
      setVerifyingLog(null);
      fetchLogs();
    } catch (err) {
      setMessage(`❌ Verification failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setVerifying(false);
    }
  };

  // Open Edit Modal for Employee
  const handleOpenEditModal = (log) => {
    setEditingLog(log);
    setEditForm({
      shift: log.shift,
      partNo: log.partNo,
      rating: log.rating,
      workOrderNo: log.workOrderNo,
      routeCardNo: log.routeCardNo,
      quantity: String(log.quantity),
      remarks: log.remarks || '',
      date: log.date ? new Date(log.date).toISOString().split('T')[0] : '',
    });
    setMessage('');
  };

  // Submit Edit / Resubmit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingLog) return;
    setSavingEdit(true);
    setMessage('');
    try {
      const res = await axios.put(`${API_BASE}/machine-logs/${editingLog._id}`, editForm);
      setMessage(res.data.message);
      setEditingLog(null);
      fetchLogs();
    } catch (err) {
      setMessage(`❌ Update failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setSavingEdit(false);
    }
  };

  // Delete Log
  const handleDeleteLog = async (id) => {
    if (!window.confirm('Are you sure you want to delete this log book entry?')) return;
    try {
      await axios.delete(`${API_BASE}/machine-logs/${id}`);
      setMessage('✅ Log entry removed.');
      fetchLogs();
    } catch (err) {
      setMessage(`❌ Failed: ${err.response?.data?.message || err.message}`);
    }
  };

  const selectedMachObj = MACHINES_LIST.find(m => m.id === selectedMachineId);

  // Filter logs by search query
  const filteredLogs = logs.filter(l => {
    const q = searchQuery.toLowerCase();
    return (
      l.partNo?.toLowerCase().includes(q) ||
      l.workOrderNo?.toLowerCase().includes(q) ||
      l.routeCardNo?.toLowerCase().includes(q) ||
      l.operatorName?.toLowerCase().includes(q) ||
      l.operatorToken?.includes(q) ||
      l.rating?.toLowerCase().includes(q)
    );
  });

  // Calculate totals
  const totalProducedQty = filteredLogs.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);
  const approvedQty = filteredLogs
    .filter(l => l.status === 'Approved')
    .reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '1.5rem 1rem' }}>
      {/* Top Banner Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.25rem',
        backgroundColor: '#0f172a',
        padding: '1.25rem 1.5rem',
        borderRadius: '12px',
        border: '2px solid #0284c7',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '10px',
            backgroundColor: '#1e293b',
            border: '2px solid #38bdf8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#38bdf8'
          }}>
            <BookOpen size={26} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h1 style={{ fontSize: '1.35rem', fontWeight: 900, margin: 0, color: '#f8fafc', letterSpacing: '0.5px' }}>
                KCCL MACHINE LOG BOOK
              </h1>
              <span className="badge badge-indigo" style={{ fontSize: '0.72rem' }}>
                Form 1620135 Rev.0
              </span>
            </div>
            <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '0.25rem 0 0 0' }}>
              Keltron Component Complex Limited • Official Plant Production & Quantity Verification System
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {isSupervisorOrAdmin && pendingCount > 0 && (
            <button
              onClick={() => setActiveFilterTab('pending')}
              className="badge badge-amber"
              style={{ padding: '0.5rem 0.8rem', fontSize: '0.8rem', cursor: 'pointer', border: '1px solid #f59e0b' }}
            >
              🔔 {pendingCount} Pending Verification
            </button>
          )}

          <button onClick={handleOpenAddModal} className="btn btn-primary" style={{ padding: '0.55rem 1rem' }}>
            <PlusCircle size={16} /> ➕ Add Log Entry
          </button>

          <button onClick={() => window.print()} className="btn btn-secondary" style={{ padding: '0.55rem 0.85rem' }}>
            <Printer size={16} /> Print Sheet
          </button>
        </div>
      </div>

      {message && (
        <div style={{
          backgroundColor: message.includes('✅') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
          color: message.includes('✅') ? '#34d399' : '#f87171',
          border: message.includes('✅') ? '1px solid #10b981' : '1px solid #f43f5e',
          padding: '0.75rem 1rem',
          borderRadius: '8px',
          marginBottom: '1.25rem',
          fontSize: '0.9rem'
        }}>
          {message}
        </div>
      )}

      {/* Machine Selector & Filter Bar */}
      <div className="card" style={{ marginBottom: '1.25rem', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          {/* Machine Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Cpu style={{ color: '#06b6d4' }} size={20} />
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8' }}>Select Machine:</label>
            <select
              value={selectedMachineId}
              onChange={(e) => setSelectedMachineId(e.target.value)}
              className="form-select"
              style={{
                width: 'auto',
                minWidth: '240px',
                fontWeight: 700,
                color: '#38bdf8',
                backgroundColor: '#0f172a',
                border: '1px solid #0284c7'
              }}
            >
              {MACHINES_LIST.map(m => (
                <option key={m.id} value={m.id}>
                  #{m.id} - {m.name} ({m.unit})
                </option>
              ))}
            </select>
          </div>

          {/* Search Query Input */}
          <div style={{ position: 'relative', width: '220px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input
              type="text"
              placeholder="Search P.No, W.O, R.C..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '2rem', fontSize: '0.82rem', padding: '0.4rem 0.5rem 0.4rem 2rem' }}
            />
          </div>

          {/* Status Tabs */}
          <div style={{ display: 'flex', gap: '0.35rem', backgroundColor: '#0f172a', padding: '0.25rem', borderRadius: '8px' }}>
            <button
              className={`btn ${activeFilterTab === 'all' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveFilterTab('all')}
              style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
            >
              All Logs
            </button>
            <button
              className={`btn ${activeFilterTab === 'pending' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveFilterTab('pending')}
              style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
            >
              Pending Verification
            </button>
            <button
              className={`btn ${activeFilterTab === 'approved' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveFilterTab('approved')}
              style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
            >
              Approved
            </button>
            <button
              className={`btn ${activeFilterTab === 'my' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveFilterTab('my')}
              style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
            >
              My Submissions
            </button>
          </div>
        </div>
      </div>

      {/* Production Metrics Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '1.25rem'
      }}>
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700 }}>SELECTED MACHINE</div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#38bdf8', marginTop: '0.2rem' }}>
            #{selectedMachineId} ({selectedMachObj?.cat})
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{selectedMachObj?.unit}</div>
        </div>

        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700 }}>LOG ENTRIES RECORDED</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f8fafc', marginTop: '0.2rem' }}>
            {filteredLogs.length} Records
          </div>
          <div style={{ fontSize: '0.75rem', color: '#34d399' }}>Matching active filters</div>
        </div>

        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700 }}>TOTAL LOGGED QUANTITY</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fbbf24', marginTop: '0.2rem' }}>
            {totalProducedQty.toLocaleString('en-IN')} pcs
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Batch total</div>
        </div>

        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700 }}>SUPERVISOR VERIFIED</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#34d399', marginTop: '0.2rem' }}>
            {approvedQty.toLocaleString('en-IN')} pcs
          </div>
          <div style={{ fontSize: '0.75rem', color: '#34d399' }}>Verified & Approved</div>
        </div>
      </div>

      {/* Official Physical Book Layout Table Container */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
          borderBottom: '2px solid #334155',
          paddingBottom: '0.75rem'
        }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
              Machine #{selectedMachineId} — Daily Production Log Records
            </h3>
            <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '0.15rem 0 0 0' }}>
              Official Production Quantity Tracking Sheet • Keltron Component Complex Limited
            </p>
          </div>

          <button onClick={fetchLogs} className="btn btn-secondary" style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}>
            <RefreshCw size={14} /> Refresh Logs
          </button>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: '#94a3b8', padding: '3rem' }}>Loading log book entries...</p>
        ) : filteredLogs.length > 0 ? (
          <div className="table-container" style={{ overflowX: 'auto' }}>
            <table style={{ minWidth: '1000px' }}>
              <thead>
                <tr>
                  <th style={{ width: '105px' }}>Date</th>
                  <th style={{ width: '85px' }}>Shift</th>
                  <th>P.No.</th>
                  <th>Rating</th>
                  <th>W.O. No.</th>
                  <th>R.C. No.</th>
                  <th>Qty.</th>
                  <th>Operator</th>
                  <th>Status</th>
                  <th style={{ minWidth: '180px' }}>Remarks / Supervisor Feedback</th>
                  <th style={{ textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map(log => {
                  const dateStr = log.date ? new Date(log.date).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  }) : 'N/A';

                  const isCreator = user?.employeeToken === log.operatorToken;
                  const canVerify = isSupervisorOrAdmin && log.status === 'Pending Approval';
                  const needsCorrection = log.status === 'Needs Correction' || log.status === 'Rejected';

                  return (
                    <tr
                      key={log._id}
                      style={{
                        backgroundColor: needsCorrection ? 'rgba(244, 63, 94, 0.06)' : 'transparent'
                      }}
                    >
                      <td><strong>{dateStr}</strong></td>
                      <td>
                        <span className="badge badge-indigo" style={{ fontSize: '0.68rem' }}>
                          {log.shift}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, color: '#38bdf8' }}>{log.partNo}</td>
                      <td>{log.rating}</td>
                      <td><strong>{log.workOrderNo}</strong></td>
                      <td>{log.routeCardNo}</td>
                      <td style={{ fontSize: '1rem', fontWeight: 800, color: '#34d399' }}>
                        {log.quantity?.toLocaleString('en-IN')}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{log.operatorName}</div>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Token #{log.operatorToken}</div>
                      </td>
                      <td>
                        <span className={`badge ${
                          log.status === 'Approved'
                            ? 'badge-emerald'
                            : (log.status === 'Needs Correction' || log.status === 'Rejected')
                            ? 'badge-rose'
                            : 'badge-amber'
                        }`}>
                          {log.status === 'Approved' ? '✅ Approved' : (log.status === 'Needs Correction' || log.status === 'Rejected') ? '⚠️ Rejected' : '🟡 Pending'}
                        </span>
                        {log.verifiedBy?.name && (
                          <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                            by {log.verifiedBy.name}
                          </div>
                        )}
                      </td>
                      <td>
                        {/* Operator Remarks */}
                        {log.remarks && (
                          <div style={{ fontSize: '0.78rem', color: '#cbd5e1', marginBottom: '0.25rem' }}>
                            <em>"{log.remarks}"</em>
                          </div>
                        )}

                        {/* Supervisor Feedback Note */}
                        {log.supervisorNotes ? (
                          <div style={{
                            backgroundColor: needsCorrection ? 'rgba(244, 63, 94, 0.15)' : 'rgba(56, 189, 248, 0.12)',
                            border: needsCorrection ? '1px solid #f43f5e' : '1px solid #38bdf8',
                            borderRadius: '6px',
                            padding: '0.35rem 0.6rem',
                            fontSize: '0.75rem',
                            color: needsCorrection ? '#f87171' : '#38bdf8',
                            marginTop: '0.2rem'
                          }}>
                            <strong>💬 Supervisor Note:</strong> {log.supervisorNotes}
                          </div>
                        ) : null}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                          {/* Supervisor Verify Button */}
                          {isSupervisorOrAdmin && (
                            <button
                              onClick={() => handleOpenVerifyModal(log)}
                              className="btn btn-primary"
                              style={{
                                padding: '0.25rem 0.55rem',
                                fontSize: '0.72rem',
                                backgroundColor: log.status === 'Pending Approval' ? '#0284c7' : '#334155'
                              }}
                              title="Verify, Approve or Pass Message"
                            >
                              <CheckCircle2 size={13} /> {log.status === 'Pending Approval' ? 'Verify' : 'Review'}
                            </button>
                          )}

                          {/* Employee Resubmit Button if rejected or needs correction */}
                          {(isCreator || isSupervisorOrAdmin) && needsCorrection && (
                            <button
                              onClick={() => handleOpenEditModal(log)}
                              className="btn btn-success"
                              style={{ padding: '0.25rem 0.55rem', fontSize: '0.72rem' }}
                              title="Edit Quantity & Resubmit to Supervisor"
                            >
                              <Edit3 size={13} /> Resubmit
                            </button>
                          )}

                          {/* Delete Button */}
                          {(isSupervisorOrAdmin || (isCreator && log.status === 'Pending Approval')) && (
                            <button
                              onClick={() => handleDeleteLog(log._id)}
                              className="btn btn-danger"
                              style={{ padding: '0.25rem 0.45rem', fontSize: '0.72rem' }}
                              title="Delete log"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
            <p style={{ fontSize: '1rem', fontWeight: 600 }}>No log entries found for Machine #{selectedMachineId}.</p>
            <p style={{ fontSize: '0.82rem', marginTop: '0.4rem' }}>
              Operators can click <strong>"➕ Add Log Entry"</strong> above to record production quantities.
            </p>
          </div>
        )}
      </div>

      {/* ➕ ADD LOG ENTRY MODAL */}
      {isAddModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content animate-fade-in" style={{ maxWidth: '620px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.25rem',
              borderBottom: '1px solid #334155',
              paddingBottom: '0.75rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <PlusCircle style={{ color: '#06b6d4' }} size={24} />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
                  KCCL Machine Log Book Entry
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit}>
              {/* Machine Selection & Shift Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Operating Machine *</label>
                  <select
                    className="form-select"
                    value={addForm.machineId}
                    onChange={(e) => setAddForm({ ...addForm, machineId: e.target.value })}
                  >
                    {MACHINES_LIST.map(m => (
                      <option key={m.id} value={m.id}>
                        #{m.id} - {m.name} ({m.unit})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Shift *</label>
                  <select
                    className="form-select"
                    value={addForm.shift}
                    onChange={(e) => setAddForm({ ...addForm, shift: e.target.value })}
                  >
                    <option value="Shift 1">Shift 1 (07:00 AM - 03:00 PM)</option>
                    <option value="General Shift">General Shift (08:30 AM - 04:30 PM)</option>
                    <option value="Shift 2">Shift 2 (03:00 PM - 11:00 PM)</option>
                    <option value="Shift 3">Shift 3 (11:00 PM - 07:00 AM)</option>
                  </select>
                </div>
              </div>

              {/* Date & P.No */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Date *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={addForm.date}
                    onChange={(e) => setAddForm({ ...addForm, date: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Part No. (P.No.) *</label>
                  <input
                    type="text"
                    placeholder="e.g. P-1045 or MP-02"
                    className="form-input"
                    value={addForm.partNo}
                    onChange={(e) => setAddForm({ ...addForm, partNo: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Rating & Work Order No */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Rating *</label>
                  <input
                    type="text"
                    placeholder="e.g. 10uF 440V, 2.5uF 400V"
                    className="form-input"
                    value={addForm.rating}
                    onChange={(e) => setAddForm({ ...addForm, rating: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Work Order No. (W.O. No.) *</label>
                  <input
                    type="text"
                    placeholder="e.g. WO-8842"
                    className="form-input"
                    value={addForm.workOrderNo}
                    onChange={(e) => setAddForm({ ...addForm, workOrderNo: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Route Card No & Quantity */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Route Card No. (R.C. No.) *</label>
                  <input
                    type="text"
                    placeholder="e.g. RC-4412"
                    className="form-input"
                    value={addForm.routeCardNo}
                    onChange={(e) => setAddForm({ ...addForm, routeCardNo: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Quantity Produced (Qty.) *</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 1200"
                    className="form-input"
                    style={{ fontSize: '1.05rem', fontWeight: 800, color: '#34d399' }}
                    value={addForm.quantity}
                    onChange={(e) => setAddForm({ ...addForm, quantity: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Remarks */}
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Remarks (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. First batch, blade changed at 11 AM, smooth run"
                  className="form-input"
                  value={addForm.remarks}
                  onChange={(e) => setAddForm({ ...addForm, remarks: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary" style={{ padding: '0.65rem 1.25rem' }}>
                  <Save size={16} /> {submitting ? 'Submitting...' : 'Submit to Supervisor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🔍 SUPERVISOR VERIFICATION & FEEDBACK MODAL */}
      {verifyingLog && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content animate-fade-in" style={{ maxWidth: '580px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
              borderBottom: '1px solid #334155',
              paddingBottom: '0.75rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <CheckCircle2 style={{ color: '#34d399' }} size={24} />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
                  Verify Log Entry: Machine #{verifyingLog.machineId}
                </h3>
              </div>
              <button
                onClick={() => setVerifyingLog(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Verification Summary Card */}
            <div className="card" style={{ backgroundColor: '#0f172a', marginBottom: '1.25rem', padding: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.85rem' }}>
                <div>
                  <span style={{ color: '#94a3b8' }}>Operator: </span>
                  <strong>{verifyingLog.operatorName} (#{verifyingLog.operatorToken})</strong>
                </div>
                <div>
                  <span style={{ color: '#94a3b8' }}>Shift: </span>
                  <strong>{verifyingLog.shift}</strong>
                </div>
                <div>
                  <span style={{ color: '#94a3b8' }}>Part No (P.No): </span>
                  <strong style={{ color: '#38bdf8' }}>{verifyingLog.partNo}</strong>
                </div>
                <div>
                  <span style={{ color: '#94a3b8' }}>Rating: </span>
                  <strong>{verifyingLog.rating}</strong>
                </div>
                <div>
                  <span style={{ color: '#94a3b8' }}>Work Order: </span>
                  <strong>{verifyingLog.workOrderNo}</strong>
                </div>
                <div>
                  <span style={{ color: '#94a3b8' }}>Route Card: </span>
                  <strong>{verifyingLog.routeCardNo}</strong>
                </div>
              </div>

              <div style={{ marginTop: '0.85rem', paddingTop: '0.75rem', borderTop: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#94a3b8', fontWeight: 700 }}>Logged Quantity (Qty.):</span>
                <span style={{ fontSize: '1.35rem', fontWeight: 900, color: '#34d399' }}>
                  {verifyingLog.quantity?.toLocaleString('en-IN')} pcs
                </span>
              </div>
            </div>

            {/* Supervisor Message Input */}
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" style={{ color: '#38bdf8', fontWeight: 700 }}>
                💬 Supervisor Feedback Note / Message to Operator:
              </label>
              <textarea
                rows={3}
                className="form-textarea"
                placeholder="Pass a note to employee (e.g. 'Verified and recorded', or 'Quantity mismatch with Route Card, physical count is 480')..."
                value={supervisorNotes}
                onChange={(e) => setSupervisorNotes(e.target.value)}
              />
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                This message will be directly visible to {verifyingLog.operatorName} in their log book.
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => handleVerifyAction('Rejected')}
                disabled={verifying}
                className="btn btn-danger"
                style={{ flex: 1 }}
              >
                <XCircle size={16} /> Reject / Request Correction
              </button>

              <button
                type="button"
                onClick={() => handleVerifyAction('Approved')}
                disabled={verifying}
                className="btn btn-success"
                style={{ flex: 1 }}
              >
                <Check size={16} /> Approve Quantity
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✏️ EMPLOYEE EDIT & RESUBMIT MODAL */}
      {editingLog && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content animate-fade-in" style={{ maxWidth: '600px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.25rem',
              borderBottom: '1px solid #334155',
              paddingBottom: '0.75rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Edit3 style={{ color: '#fbbf24' }} size={22} />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
                  Edit & Resubmit Log: Machine #{editingLog.machineId}
                </h3>
              </div>
              <button
                onClick={() => setEditingLog(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Supervisor note alert box */}
            {editingLog.supervisorNotes && (
              <div style={{
                backgroundColor: 'rgba(244, 63, 94, 0.15)',
                border: '1px solid #f43f5e',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                marginBottom: '1.25rem',
                fontSize: '0.85rem',
                color: '#f87171'
              }}>
                <strong>⚠️ Supervisor Note:</strong> "{editingLog.supervisorNotes}"
              </div>
            )}

            <form onSubmit={handleEditSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Part No. (P.No.) *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editForm.partNo}
                    onChange={(e) => setEditForm({ ...editForm, partNo: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Rating *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editForm.rating}
                    onChange={(e) => setEditForm({ ...editForm, rating: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">W.O. No. *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editForm.workOrderNo}
                    onChange={(e) => setEditForm({ ...editForm, workOrderNo: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">R.C. No. *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editForm.routeCardNo}
                    onChange={(e) => setEditForm({ ...editForm, routeCardNo: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Quantity Produced (Qty.) *</label>
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    style={{ fontSize: '1.1rem', fontWeight: 800, color: '#34d399' }}
                    value={editForm.quantity}
                    onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Shift *</label>
                  <select
                    className="form-select"
                    value={editForm.shift}
                    onChange={(e) => setEditForm({ ...editForm, shift: e.target.value })}
                  >
                    <option value="Shift 1">Shift 1 (07:00 AM - 03:00 PM)</option>
                    <option value="General Shift">General Shift (08:30 AM - 04:30 PM)</option>
                    <option value="Shift 2">Shift 2 (03:00 PM - 11:00 PM)</option>
                    <option value="Shift 3">Shift 3 (11:00 PM - 07:00 AM)</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Remarks / Correction Note</label>
                <input
                  type="text"
                  placeholder="e.g. Corrected count to 480 as instructed"
                  className="form-input"
                  value={editForm.remarks}
                  onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setEditingLog(null)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={savingEdit} className="btn btn-success">
                  <Save size={16} /> {savingEdit ? 'Saving...' : 'Resubmit for Approval'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MachineLogBookPage;
