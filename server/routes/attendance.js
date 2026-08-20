const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');

// Punch In (Requires Active Status approved by Supervisor)
router.post('/punch-in', async (req, res) => {
  try {
    const { tokenNo } = req.body;
    if (!tokenNo) return res.status(400).json({ message: 'Punching Token number is required.' });

    const employee = await Employee.findOne({ tokenNo });
    if (!employee) return res.status(404).json({ message: 'Employee profile not found for this token number.' });

    // Strict Supervisor Approval Check
    if (employee.status === 'Pending Approval') {
      return res.status(403).json({
        message: `Account Pending Supervisor Approval! Punching Token #${tokenNo} must be approved & activated by a Supervisor before punching in.`
      });
    }

    if (employee.status === 'Inactive') {
      return res.status(403).json({
        message: `Account Inactive! Punching Token #${tokenNo} is deactivated. Contact Supervisor.`
      });
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    let record = await Attendance.findOne({
      employeeId: employee._id,
      date: { $gte: todayStart, $lte: todayEnd }
    });

    if (record && record.punchIn && !record.punchOut) {
      return res.status(400).json({ message: 'Already punched in for today.', attendance: record });
    }

    const isSunday = now.getDay() === 0;

    record = await Attendance.create({
      employeeId: employee._id,
      tokenNo: employee.tokenNo,
      date: now,
      punchIn: now,
      isSunday,
      status: 'In Progress',
    });

    res.status(201).json({ message: 'Punched In successfully!', attendance: record });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Punch Out
router.post('/punch-out', async (req, res) => {
  try {
    const { tokenNo, hoursOverride } = req.body;
    if (!tokenNo) return res.status(400).json({ message: 'Punching Token number is required.' });

    const employee = await Employee.findOne({ tokenNo });
    if (!employee) return res.status(404).json({ message: 'Employee profile not found.' });

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    let record = await Attendance.findOne({
      employeeId: employee._id,
      date: { $gte: todayStart, $lte: todayEnd },
      punchOut: { $exists: false }
    });

    if (!record) {
      record = await Attendance.findOne({
        employeeId: employee._id,
        status: 'In Progress'
      }).sort({ createdAt: -1 });
    }

    if (!record) {
      return res.status(400).json({ message: 'No active punch-in record found to punch out.' });
    }

    const punchOutTime = now;
    const diffMs = punchOutTime - new Date(record.punchIn);
    let totalHrs = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
    
    if (totalHrs < 1) totalHrs = hoursOverride ? parseFloat(hoursOverride) : 7.5;

    const overtimeHrs = totalHrs > 7.5 ? parseFloat((totalHrs - 7.5).toFixed(2)) : 0;

    record.punchOut = punchOutTime;
    record.totalHours = totalHrs;
    record.overtimeHours = overtimeHrs;
    record.status = 'Present';
    await record.save();

    res.json({ message: 'Punched Out successfully!', attendance: record });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get attendance for specific employee
router.get('/employee/:tokenNo', async (req, res) => {
  try {
    const records = await Attendance.find({ tokenNo: req.params.tokenNo })
      .sort({ date: -1 })
      .limit(30);
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Supervisor List Today Attendance
router.get('/today', async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const list = await Attendance.find({
      date: { $gte: todayStart, $lte: todayEnd }
    }).populate('employeeId');

    res.json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
