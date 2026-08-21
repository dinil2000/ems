const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { connectDB } = require('../config/db');
const User = require('../models/User');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const PayrollRecord = require('../models/PayrollRecord');
const ShiftSchedule = require('../models/ShiftSchedule');

const clearAllUserData = async () => {
  try {
    console.log('🧹 Clearing all user & employee data from MongoDB...');
    await connectDB();

    // 1. Delete all Attendance logs
    await Attendance.deleteMany({});
    console.log('✅ Attendance logs cleared.');

    // 2. Delete all Payroll records
    await PayrollRecord.deleteMany({});
    console.log('✅ Payroll records cleared.');

    // 3. Delete all Shift Schedules
    await ShiftSchedule.deleteMany({});
    console.log('✅ Shift schedules cleared.');

    // 4. Delete all Employee profiles
    await Employee.deleteMany({});
    console.log('✅ Employee profiles cleared.');

    // 5. Delete all Users except Root Site Admin
    await User.deleteMany({});
    
    // Re-create Root Site Admin account for system access
    const salt = await bcrypt.genSalt(10);
    const adminPasswordHash = await bcrypt.hash('admin', salt);

    const rootAdmin = await User.create({
      employeeToken: 'ADMIN01',
      email: 'admin@keltron.co.in',
      password: adminPasswordHash,
      role: 'SiteAdmin',
    });

    console.log(`✅ User accounts cleared. Re-created Root Site Admin (${rootAdmin.employeeToken}).`);
    console.log('🎉 Database wipe complete! Database is clean for new registrations.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing user data:', error.message);
    process.exit(1);
  }
};

clearAllUserData();
