const mongoose = require('mongoose');

const payrollDeductionSchema = new mongoose.Schema({
  tokenNo: {
    type: String,
    required: true,
    index: true,
  },
  yearMonth: {
    type: String, // Format: 'YYYY-MM', e.g. '2026-05'
    required: true,
  },
  canteenDeduction: {
    type: Number,
    default: 262.50, // Variable canteen coupon deduction per month
  },
  festivalAdvance: {
    type: Number,
    default: 1500.00, // Festival advance deduction
  },
  providentFund: {
    type: Number,
    default: 1800.00, // Monthly PF deduction
  },
  professionalTax: {
    type: Number,
    default: 250.00, // Monthly Professional Tax deduction
  },
  medicalInsurance: {
    type: Number,
    default: 532.00, // ESI / Medical insurance deduction
  },
  cooperativeDeduction: {
    type: Number,
    default: 0.00,
  },
  otherDeduction1: {
    type: Number,
    default: 0.00,
  },
  otherDeduction2: {
    type: Number,
    default: 0.00,
  },
  specialPay: {
    type: Number,
    default: 0.00,
  },
  conveyanceAllowance: {
    type: Number,
    default: 0.00,
  },
  shift1Rate: {
    type: Number,
    default: 30.00, // Shift 1 per-day allowance rate (e.g. ₹30/day)
  },
  shift2Rate: {
    type: Number,
    default: 50.00, // Shift 2 per-day allowance rate (e.g. ₹50/day)
  },
  shift3Rate: {
    type: Number,
    default: 78.00, // Shift 3 per-day allowance rate (e.g. ₹78/day)
  },
  updatedBy: {
    type: String,
    default: 'SiteAdmin',
  },
}, { timestamps: true });

payrollDeductionSchema.index({ tokenNo: 1, yearMonth: 1 }, { unique: true });

module.exports = mongoose.model('PayrollDeduction', payrollDeductionSchema);
