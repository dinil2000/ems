const mongoose = require('mongoose');

const machineLogSchema = new mongoose.Schema({
  machineId: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  machineName: {
    type: String,
    required: true,
    trim: true,
  },
  unit: {
    type: String,
    enum: ['Unit 1', 'Unit 2'],
    default: 'Unit 2',
  },
  operatorToken: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  operatorName: {
    type: String,
    required: true,
    trim: true,
  },
  date: {
    type: Date,
    default: Date.now,
    index: true,
  },
  shift: {
    type: String,
    enum: ['Shift 1', 'Shift 2', 'Shift 3', 'General Shift'],
    required: true,
  },
  partNo: {
    type: String,
    required: true,
    trim: true, // P.No.
  },
  rating: {
    type: String,
    required: true,
    trim: true, // Rating (e.g. 10uF 400V)
  },
  workOrderNo: {
    type: String,
    required: true,
    trim: true, // W.O. No.
  },
  routeCardNo: {
    type: String,
    required: true,
    trim: true, // R.C. No.
  },
  quantity: {
    type: Number,
    required: true,
    min: 0, // Qty.
  },
  remarks: {
    type: String,
    default: '',
    trim: true, // Remarks
  },
  status: {
    type: String,
    enum: ['Pending Approval', 'Approved', 'Rejected', 'Needs Correction'],
    default: 'Pending Approval',
    index: true,
  },
  verifiedBy: {
    tokenNo: { type: String, default: null },
    name: { type: String, default: null },
    verifiedAt: { type: Date, default: null },
  },
  supervisorNotes: {
    type: String,
    default: '',
    trim: true, // Message / notes passed from supervisor to employee
  },
}, { timestamps: true });

// Compound indexes for fast machine-specific and operator-specific log querying
machineLogSchema.index({ machineId: 1, date: -1 });
machineLogSchema.index({ operatorToken: 1, createdAt: -1 });
machineLogSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('MachineLog', machineLogSchema);
