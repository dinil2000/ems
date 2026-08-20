const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
  },
  tokenNo: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  punchIn: {
    type: Date,
  },
  punchOut: {
    type: Date,
  },
  totalHours: {
    type: Number,
    default: 0,
  },
  overtimeHours: {
    type: Number,
    default: 0,
  },
  isSunday: {
    type: Boolean,
    default: false,
  },
  isLate: {
    type: Boolean,
    default: false,
  },
  lateMinutes: {
    type: Number,
    default: 0,
  },
  shiftStartTime: {
    type: String, // e.g. "07:00 AM"
  },
  supervisorApproved: {
    type: Boolean,
    default: true, // Auto-approved if <= 10 mins late; set to false if > 10 mins late
  },
  approvedBy: {
    tokenNo: { type: String },
    name: { type: String },
  },
  status: {
    type: String,
    enum: ['Present', 'In Progress', 'Pending Late Approval', 'Absent', 'On Leave'],
    default: 'In Progress',
  },
}, { timestamps: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
