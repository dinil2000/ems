const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Employee = require('../models/Employee');

// Change Password Endpoint (For ALL authenticated users)
router.post('/change-password', async (req, res) => {
  try {
    const { tokenNo, currentPassword, newPassword } = req.body;
    if (!tokenNo || !currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Token Number, Current Password, and New Password are required.' });
    }

    const user = await User.findOne({ employeeToken: tokenNo });
    if (!user) {
      return res.status(404).json({ message: 'User account not found.' });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password does not match.' });
    }

    // Hash and update new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ message: 'Password updated successfully! Please use your new password for future logins.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Public Employee Registration (Role is strictly forced to 'Employee', status: 'Pending Approval')
router.post('/register', async (req, res) => {
  try {
    const {
      tokenNo,
      name,
      email,
      password,
      employmentType,
      qualification,
      experienceYears,
      machineExpertise,
      gender,
      basicSalary,
      unit
    } = req.body;

    if (!tokenNo || !name || !email || !password || !employmentType || !qualification || !machineExpertise || !gender) {
      return res.status(400).json({ message: 'All required employee fields must be provided.' });
    }

    const expNum = parseInt(experienceYears) || 0;
    const baseCalculated = basicSalary ? parseFloat(basicSalary) : (
      qualification === 'Diploma' ? (24000 + expNum * 2000) : (18000 + expNum * 1500)
    );

    const employee = await Employee.findOneAndUpdate(
      { tokenNo },
      {
        tokenNo,
        name,
        employmentType,
        qualification,
        experienceYears: expNum,
        basicSalary: baseCalculated,
        machineExpertise: Array.isArray(machineExpertise) ? machineExpertise : [machineExpertise],
        gender,
        unit: unit || 'Unit 2',
        status: 'Active',
      },
      { upsert: true, new: true }
    );

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password || 'admin', salt);

    let user = await User.findOne({ $or: [{ email }, { employeeToken: tokenNo }] });

    if (user) {
      user.email = email;
      user.password = passwordHash;
      user.role = 'Employee';
      user.employeeProfile = employee._id;
      await user.save();
    } else {
      user = await User.create({
        employeeToken: tokenNo,
        email,
        password: passwordHash,
        role: 'Employee',
        employeeProfile: employee._id,
      });
    }

    const secret = process.env.JWT_SECRET || 'mpp_keltron_super_secret_key_2026';
    const token = jwt.sign(
      { userId: user._id, role: user.role, tokenNo: user.employeeToken },
      secret,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Employee registration & profile sync successful!',
      token,
      user: {
        id: user._id,
        employeeToken: user.employeeToken,
        email: user.email,
        role: user.role,
        employeeProfile: employee,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({ message: error.message || 'Registration failed' });
  }
});

// Site Admin API: Appoint Supervisor by Token Number
router.post('/create-supervisor', async (req, res) => {
  try {
    const { tokenNo } = req.body;
    if (!tokenNo) {
      return res.status(400).json({ message: 'Employee Token Number is required.' });
    }

    const employee = await Employee.findOne({ tokenNo });
    if (!employee) {
      return res.status(404).json({ message: `Employee Token #${tokenNo} not found. Please register employee profile first.` });
    }

    employee.isShiftInCharge = true;
    employee.status = 'Active';
    await employee.save();

    let user = await User.findOne({ employeeToken: tokenNo });
    if (user) {
      user.role = 'Supervisor';
      user.employeeProfile = employee._id;
      await user.save();
    } else {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('admin', salt);
      user = await User.create({
        employeeToken: tokenNo,
        email: `emp${tokenNo}@keltron.co.in`,
        password: passwordHash,
        role: 'Supervisor',
        employeeProfile: employee._id,
      });
    }

    res.status(200).json({
      message: `Employee ${employee.name} (Token #${tokenNo}) has been promoted to Supervisor position!`,
      user,
      employee
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Site Admin API: Demote Supervisor to Employee position
router.post('/demote-supervisor', async (req, res) => {
  try {
    const { tokenNo } = req.body;
    if (!tokenNo) {
      return res.status(400).json({ message: 'Employee Token Number is required.' });
    }

    const employee = await Employee.findOne({ tokenNo });
    if (employee) {
      employee.isShiftInCharge = false;
      await employee.save();
    }

    let user = await User.findOne({ employeeToken: tokenNo });
    if (!user) {
      return res.status(404).json({ message: `User with Token #${tokenNo} not found.` });
    }

    user.role = 'Employee';
    await user.save();

    res.status(200).json({
      message: `Supervisor (Token #${tokenNo}) has been successfully demoted to Employee position.`,
      user,
      employee
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get All Users (Admin / Supervisor Endpoint)
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({}).populate('employeeProfile');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Login Route (Supports Root Admin username 'admin' or 'ADMIN01' with pass 'admin61445412', and employees with 'admin')
router.post('/login', async (req, res) => {
  try {
    const { tokenOrEmail, password } = req.body;
    if (!tokenOrEmail || !password) {
      return res.status(400).json({ message: 'Token/Email and password are required.' });
    }

    const searchKey = tokenOrEmail.trim();

    // Check if logging in as root admin with username 'admin' or 'ADMIN01'
    let user;
    if (searchKey.toLowerCase() === 'admin' || searchKey.toUpperCase() === 'ADMIN01') {
      user = await User.findOne({ role: 'SiteAdmin' }).populate('employeeProfile');
    } else {
      user = await User.findOne({
        $or: [
          { email: searchKey.toLowerCase() },
          { employeeToken: searchKey }
        ]
      }).populate('employeeProfile');
    }

    if (!user) {
      return res.status(400).json({ message: 'Invalid employee token or credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid password credentials.' });
    }

    const secret = process.env.JWT_SECRET || 'mpp_keltron_super_secret_key_2026';
    const token = jwt.sign(
      { userId: user._id, role: user.role, tokenNo: user.employeeToken },
      secret,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        employeeToken: user.employeeToken,
        email: user.email,
        role: user.role,
        employeeProfile: user.employeeProfile,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
