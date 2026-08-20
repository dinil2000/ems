const mongoose = require('mongoose');

const shiftAllocationSchema = new mongoose.Schema({
  machineId: { type: String, required: true },
  machineName: { type: String },
  category: { type: String },
  assignedEmployees: [{
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    tokenNo: { type: String },
    name: { type: String },
  }],
});

const shiftSlotSchema = new mongoose.Schema({
  shiftType: {
    type: String,
    enum: [
      'Shift-1 (07.00AM-03.00PM)',
      'Shift-2 (03.00PM-11.00PM)',
      'Shift-3 (11.00PM-07.00AM)',
      'General Shift (08.30AM-04.30PM)'
    ],
    required: true,
  },
  shiftInCharge: {
    tokenNo: { type: String },
    name: { type: String },
  },
  allocations: [shiftAllocationSchema],
});

const shiftScheduleSchema = new mongoose.Schema({
  noticeRefNo: {
    type: String,
    default: 'PC12/XR/004',
  },
  unit: {
    type: String,
    default: 'MPP Section (Unit 1 & 2)',
  },
  weekStartDate: {
    type: Date,
    required: true,
  },
  weekEndDate: {
    type: Date,
    required: true,
  },
  shifts: [shiftSlotSchema],
  createdBy: {
    type: String,
    default: 'Department Head (HOD)',
  },
  status: {
    type: String,
    enum: ['Draft', 'Published'],
    default: 'Published',
  },
}, { timestamps: true });

module.exports = mongoose.model('ShiftSchedule', shiftScheduleSchema);
