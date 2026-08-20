const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Employee = require('../models/Employee');

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
        status: 'Pending Approval',
      },
      { upsert: true, new: true }
    );

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

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
      message: 'Employee registration successful! Your account is pending Supervisor approval before activation.',
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

// Site Admin API: Appoint Supervisor by ONLY providing Token Number!
router.post('/create-supervisor', async (req, res) => {
  try {
    const { tokenNo } = req.body;
    if (!tokenNo) {
      return res.status(400).json({ message: 'Employee Token Number is required.' });
    }

    // Find existing Employee profile by Token No
    const employee = await Employee.findOne({ tokenNo });
    if (!employee) {
      return res.status(404).json({ message: `Employee Token #${tokenNo} not found. Please register employee profile first.` });
    }

    // Promote Employee status to Active & Shift In Charge
    employee.isShiftInCharge = true;
    employee.status = 'Active';
    await employee.save();

    // Promote or Create User account with 'Supervisor' role
    let user = await User.findOne({ employeeToken: tokenNo });
    if (user) {
      user.role = 'Supervisor';
      user.employeeProfile = employee._id;
      await user.save();
    } else {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('mpp12345', salt);
      user = await User.create({
        employeeToken: tokenNo,
        email: `emp${tokenNo}@keltron.co.in`,
        password: passwordHash,
        role: 'Supervisor',
        employeeProfile: employee._id,
      });
    }

    res.status(200).json({
      message: `Employee ${employee.name} (Token #${tokenNo}) has been successfully appointed as Supervisor!`,
      user,
      employee
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Login Route
router.post('/login', async (req, res) => {
  try {
    const { tokenOrEmail, password } = req.body;
    if (!tokenOrEmail || !password) {
      return res.status(400).json({ message: 'Token/Email and password are required.' });
    }

    const user = await User.findOne({
      $or: [
        { email: tokenOrEmail.toLowerCase() },
        { employeeToken: tokenOrEmail }
      ]
    }).populate('employeeProfile');

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
