const mongoose = require('mongoose');

const maintenanceAlertSchema = new mongoose.Schema({
  machineId: {
    type: String,
    required: true,
  },
  machineCategory: {
    type: String,
    enum: ['Winding', 'Testing', 'Metalizing'],
    required: true,
  },
  alertType: {
    type: String,
    enum: ['Central Cleaning - Metalizing (Every 2 Weeks)', 'General Machine Cleaning (Every 1 Month)'],
    required: true,
  },
  frequencyDays: {
    type: Number,
    required: true,
  },
  lastCleanedDate: {
    type: Date,
    required: true,
  },
  nextDueDate: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ['Pending', 'Pending Approval', 'Overdue', 'Completed', 'Rejected'],
    default: 'Pending',
  },
  requestedBy: {
    tokenNo: { type: String },
    name: { type: String },
  },
  requestedAt: {
    type: Date,
  },
  approvedBy: {
    tokenNo: { type: String },
    name: { type: String },
  },
  approvedAt: {
    type: Date,
  },
  notes: {
    type: String,
  },
}, { timestamps: true });

module.exports = mongoose.model('MaintenanceAlert', maintenanceAlertSchema);
