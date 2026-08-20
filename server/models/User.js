const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  employeeToken: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['SiteAdmin', 'Supervisor', 'Employee'],
    default: 'Employee',
  },
  employeeProfile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
  },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
