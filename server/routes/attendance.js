const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const ShiftSchedule = require('../models/ShiftSchedule');

// Helper to get shift start time for today (Default General: 08:30 AM, 1st: 07:00 AM, 2nd: 03:00 PM, 3rd: 11:00 PM)
const getAssignedShiftStart = async (tokenNo, now) => {
  try {
    const latestRoster = await ShiftSchedule.findOne({ status: 'Published' }).sort({ createdAt: -1 });
    let shiftType = 'General Shift (08.30AM-04.30PM)';

    if (latestRoster && latestRoster.shifts) {
      latestRoster.shifts.forEach(slot => {
        slot.allocations.forEach(alloc => {
          if (alloc.assignedEmployees && alloc.assignedEmployees.some(e => e.tokenNo === tokenNo)) {
            shiftType = slot.shiftType;
          }
        });
      });
    }

    // Default start times
    let startHour = 8;
    let startMin = 30; // General Shift default 08:30 AM

    if (shiftType.includes('Shift-1') || shiftType.includes('07.00AM')) {
      startHour = 7;
      startMin = 0; // 1st Shift 07:00 AM
    } else if (shiftType.includes('Shift-2') || shiftType.includes('03.00PM')) {
      startHour = 15;
      startMin = 0; // 2nd Shift 03:00 PM
    } else if (shiftType.includes('Shift-3') || shiftType.includes('11.00PM')) {
      startHour = 23;
      startMin = 0; // 3rd Shift 11:00 PM
    }

    const shiftStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), startHour, startMin, 0);
    // 10-minute grace period threshold
    const graceCutoffDate = new Date(shiftStartDate.getTime() + 10 * 60 * 1000);

    return {
      shiftStartDate,
      graceCutoffDate,
      shiftLabel: `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`
    };
  } catch (err) {
    // Default 08:30 AM fallback
    const shiftStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 30, 0);
    const graceCutoffDate = new Date(shiftStartDate.getTime() + 10 * 60 * 1000);
    return { shiftStartDate, graceCutoffDate, shiftLabel: '08:30' };
  }
};

// Punch In (10-minute Grace Period Rule)
router.post('/punch-in', async (req, res) => {
  try {
    const { tokenNo, punchInTimeOverride } = req.body;
    if (!tokenNo) return res.status(400).json({ message: 'Punching Token number is required.' });

    const employee = await Employee.findOne({ tokenNo });
    if (!employee) return res.status(404).json({ message: 'Employee profile not found for this token number.' });

    // Account status check
    if (employee.status === 'Inactive') {
      return res.status(403).json({ message: `Account Inactive! Punching Token #${tokenNo} is deactivated.` });
    }

    const now = punchInTimeOverride ? new Date(punchInTimeOverride) : new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    let record = await Attendance.findOne({
      employeeId: employee._id,
      date: { $gte: todayStart, $lte: todayEnd }
    });

    if (record && record.punchIn && !record.punchOut) {
      return res.status(400).json({ message: 'Already punched in for today.', attendance: record });
    }

    // Check shift start time & 10-minute grace period
    const { shiftStartDate, graceCutoffDate, shiftLabel } = await getAssignedShiftStart(tokenNo, now);

    const isLate = now > graceCutoffDate;
    let lateMinutes = 0;
    if (isLate) {
      lateMinutes = Math.round((now - shiftStartDate) / (1000 * 60));
    }

    const isSunday = now.getDay() === 0;

    // Rule: Auto-approved if within 10-min grace period; requires Supervisor Late Approval if > 10 mins late
    const supervisorApproved = !isLate;
    const status = isLate ? 'Pending Late Approval' : 'In Progress';

    record = await Attendance.create({
      employeeId: employee._id,
      tokenNo: employee.tokenNo,
      date: now,
      punchIn: now,
      isSunday,
      isLate,
      lateMinutes,
      shiftStartTime: shiftLabel,
      supervisorApproved,
      status,
    });

    if (isLate) {
      return res.status(201).json({
        message: `Punched In at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (LATE by ${lateMinutes} mins - Exceeds 10-min grace period). Recorded! Pending Supervisor Late Approval.`,
        attendance: record,
        isLate: true
      });
    }

    res.status(201).json({
      message: `Punched In successfully on time (${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})!`,
      attendance: record,
      isLate: false
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Punch Out (Allowed freely without waiting for punch-in approval!)
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
        status: { $in: ['In Progress', 'Pending Late Approval'] }
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

    res.json({
      message: `Punched Out successfully at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}! Total worked: ${totalHrs} hrs.`,
      attendance: record
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Supervisor approves late punch-in
router.post('/approve-late/:id', async (req, res) => {
  try {
    const { supervisorToken, supervisorName } = req.body;
    const record = await Attendance.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Attendance record not found' });

    record.supervisorApproved = true;
    record.approvedBy = {
      tokenNo: supervisorToken || 'Supervisor',
      name: supervisorName || 'Supervisor'
    };
    await record.save();

    res.json({
      message: `Supervisor approved late punch-in for Token #${record.tokenNo}!`,
      attendance: record
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Supervisor fetch list of late punches pending approval
router.get('/pending-late', async (req, res) => {
  try {
    const pendingLate = await Attendance.find({
      isLate: true,
      supervisorApproved: false
    }).sort({ date: -1 }).populate('employeeId');

    res.json(pendingLate);
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
