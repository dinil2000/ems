const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  tokenNo: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  employmentType: {
    type: String,
    enum: ['Permanent', 'Casual'],
    required: true,
  },
  qualification: {
    type: String,
    enum: ['ITI', 'Diploma'],
    required: true,
  },
  experienceYears: {
    type: Number,
    required: true,
    min: 0,
  },
  basicSalary: {
    type: Number,
    required: true,
  },
  machineExpertise: [{
    type: String,
    required: true,
  }],
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other'],
    required: true,
  },
  isShiftInCharge: {
    type: Boolean,
    default: false,
  },
  unit: {
    type: String,
    enum: ['Unit 1', 'Unit 2'],
    default: 'Unit 2',
  },
  status: {
    type: String,
    enum: ['Pending Approval', 'Active', 'On Leave', 'Inactive'],
    default: 'Pending Approval',
  },
  approvedBy: {
    type: String,
  },
  approvedAt: {
    type: Date,
  },
}, { timestamps: true });

// Auto-calculate basic salary before saving if not explicitly set
employeeSchema.pre('save', function (next) {
  if (!this.basicSalary) {
    const base = this.qualification === 'Diploma' ? 24000 : 18000;
    const expBonus = (this.experienceYears || 0) * (this.qualification === 'Diploma' ? 2000 : 1500);
    this.basicSalary = base + expBonus;
  }
  next();
});

module.exports = mongoose.model('Employee', employeeSchema);
