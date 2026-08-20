const mongoose = require('mongoose');

const machineSchema = new mongoose.Schema({
  machineId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  name: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    enum: ['Winding', 'Testing', 'Metalizing'],
    required: true,
  },
  unit: {
    type: String,
    enum: ['Unit 1', 'Unit 2'],
    default: 'Unit 2',
  },
  minStaffRequired: {
    type: Number,
    default: 1, // Metalizing strictly requires 3-4 staff
  },
  status: {
    type: String,
    enum: ['Operational', 'Maintenance', 'Offline'],
    default: 'Operational',
  },
  lastCentralCleaned: {
    type: Date,
  },
  lastGeneralCleaned: {
    type: Date,
  },
}, { timestamps: true });

module.exports = mongoose.model('Machine', machineSchema);
