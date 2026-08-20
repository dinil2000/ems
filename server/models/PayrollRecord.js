const mongoose = require('mongoose');

const payrollRecordSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
  },
  tokenNo: {
    type: String,
    required: true,
  },
  employeeName: {
    type: String,
    required: true,
  },
  billingCycleMonth: {
    type: String, // e.g. "2026-08"
    required: true,
  },
  billingCycleStart: {
    type: Date, // 25th of prev month
    required: true,
  },
  billingCycleEnd: {
    type: Date, // 25th of current month
    required: true,
  },
  payoutDate: {
    type: Date, // Last day of current month
    required: true,
  },
  basicMonthlySalary: {
    type: Number,
    required: true,
  },
  hourlyRate: {
    type: Number,
    required: true,
  },
  dailyRate: {
    type: Number,
    required: true,
  },
  totalDaysPresent: {
    type: Number,
    default: 0,
  },
  regularHoursPay: {
    type: Number,
    default: 0,
  },
  totalOvertimeHours: {
    type: Number,
    default: 0,
  },
  overtimePay: {
    type: Number, // DOUBLE hourly basic pay
    default: 0,
  },
  sundayDaysWorked: {
    type: Number,
    default: 0,
  },
  sundayPay: {
    type: Number, // DOUBLE normal rate
    default: 0,
  },
  grossSalary: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ['Draft', 'Approved', 'Paid'],
    default: 'Approved',
  },
}, { timestamps: true });

module.exports = mongoose.model('PayrollRecord', payrollRecordSchema);
