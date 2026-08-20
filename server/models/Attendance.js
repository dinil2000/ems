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
  status: {
    type: String,
    enum: ['Present', 'Absent', 'On Leave', 'In Progress'],
    default: 'In Progress',
  },
  supervisorApproved: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
