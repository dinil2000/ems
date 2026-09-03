const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const User = require('../models/User');
const ShiftSchedule = require('../models/ShiftSchedule');

// ── Intelligent Multi-Shift Arrival Window & Start Time Auto-Detector ─────
// Rules:
// 1. Shift 1 (1st Shift: 07:00 AM – 03:00 PM): Punch-in window 06:00 AM – 07:30 AM -> Shift Start 07:00
// 2. General Shift (08:30 AM – 04:30 PM): Punch-in window 08:00 AM – 09:00 AM -> Shift Start 08:30
// 3. Shift 2 (2nd Shift: 03:00 PM – 11:00 PM): Punch-in window 02:00 PM – 03:30 PM -> Shift Start 15:00
// 4. Shift 3 (Night Shift: 11:00 PM – 07:00 AM): Punch-in window 10:00 PM – 11:30 PM -> Shift Start 23:00
// 5. Fallback: Matches to closest logical shift start time
const detectShiftDetails = (date = new Date()) => {
  const currentMinutes = date.getHours() * 60 + date.getMinutes();

  let startHour, startMin, shiftLabel, shiftName;

  // Exact shift rules with 1 hr early arrival and 30m punch window:
  // - Shift 1: 07:00 AM – 03:00 PM (Start 07:00, 1 hr early 06:00 AM, window up to 07:30 AM / 07:45 AM)
  // - General Shift: 08:30 AM – 04:30 PM (Start 08:30, 1 hr early 07:30 AM, window up to 09:00 AM / 01:45 PM)
  // - Shift 2: 03:00 PM – 11:00 PM (Start 15:00, 1 hr early 02:00 PM, window up to 03:30 PM / 08:30 PM)
  // - Shift 3: 11:00 PM – 07:00 AM (Start 23:00, 1 hr early 10:00 PM, window up to 11:30 PM / 06:00 AM)

  if (currentMinutes >= 360 && currentMinutes < 465) {
    // 06:00 AM to 07:45 AM -> 1st Shift (07:00 AM - 03:00 PM)
    startHour = 7;
    startMin = 0;
    shiftLabel = '07:00';
    shiftName = 'Shift 1 (07:00 AM - 03:00 PM)';
  } else if (currentMinutes >= 465 && currentMinutes < 825) {
    // 07:45 AM to 01:45 PM -> General Shift (08:30 AM - 04:30 PM)
    startHour = 8;
    startMin = 30;
    shiftLabel = '08:30';
    shiftName = 'General Shift (08:30 AM - 04:30 PM)';
  } else if (currentMinutes >= 825 && currentMinutes < 1230) {
    // 01:45 PM to 08:30 PM (14:00/2 PM early arrival, 2:45 PM punch, up to 15:30/3:30 PM) -> 2nd Shift (03:00 PM - 11:00 PM)
    startHour = 15;
    startMin = 0;
    shiftLabel = '15:00';
    shiftName = 'Shift 2 (03:00 PM - 11:00 PM)';
  } else {
    // 08:30 PM to 06:00 AM (22:00/10 PM early arrival, 11:00 PM start, up to 23:30/11:30 PM) -> 3rd Shift (11:00 PM - 07:00 AM)
    startHour = 23;
    startMin = 0;
    shiftLabel = '23:00';
    shiftName = 'Shift 3 (11:00 PM - 07:00 AM)';
  }

  // Shift start date anchor
  let shiftStartDate;
  if (startHour === 23 && date.getHours() < 12) {
    shiftStartDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1, 23, 0, 0);
  } else {
    shiftStartDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), startHour, startMin, 0);
  }

  // 10-minute grace cutoff threshold (e.g. 07:10 AM, 08:40 AM, 03:10 PM, 11:10 PM)
  const graceCutoffDate = new Date(shiftStartDate.getTime() + 10 * 60 * 1000);

  return {
    startHour,
    startMin,
    shiftStartDate,
    graceCutoffDate,
    shiftLabel,
    shiftName,
  };
};

const getAssignedShiftStart = async (tokenNo, now) => {
  return detectShiftDetails(now);
};

/*
 * WORKING HOURS & OVERTIME CALCULATION RULES:
 * ============================================
 * - Shift duration = 8 hours (including 30 min lunch break)
 * - Recorded working hours = 7 hrs 30 min (7.5 hrs) — always for a full day
 * - Lunch break = 30 min deducted from total presence
 * - 30-minute grace period AFTER shift ends (e.g. 3:00 PM to 3:30 PM for 1st shift)
 *   → If employee leaves within this 30 min, NO overtime is counted
 * - Overtime starts ONLY when total raw hours > 8.5 (shift + grace)
 * - OT formula: (totalRawHours - 0.5 lunch) - 7.5 working = totalRawHours - 8.0
 *
 * Example: Punch In 7:00 AM, Punch Out 6:45 PM
 *   totalRaw = 11.75 hrs → working = 7.5 hrs, OT = 11.75 - 8.0 = 3.75 hrs (3h 45m)
 *
 * Salary billing cycle: 26th of previous month to 25th of current month
 */

// Punch In (Supports Automated Geofenced GPS Entry Punch)
router.post('/punch-in', async (req, res) => {
  try {
    const { tokenNo, punchInTimeOverride, latitude, longitude, isGeofencedAutoPunch, locationName } = req.body;
    if (!tokenNo) return res.status(400).json({ message: 'Punching Token number is required.' });

    const trimmedToken = String(tokenNo).trim();
    let employee = await Employee.findOne({ tokenNo: trimmedToken });
    if (!employee) {
      employee = await Employee.findOne({ tokenNo: { $regex: new RegExp(`^${trimmedToken}$`, 'i') } });
    }
    if (!employee) return res.status(404).json({ message: `Employee profile not found for Token #${trimmedToken}.` });

    if (employee.status === 'Inactive') {
      return res.status(403).json({ message: `Account Inactive! Punching Token #${trimmedToken} is deactivated.` });
    }

    const now = punchInTimeOverride ? new Date(punchInTimeOverride) : new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    // Check if there is an active unclosed punch-in session in progress (including across midnight)
    let activeRecord = await Attendance.findOne({
      employeeId: employee._id,
      punchIn: { $exists: true, $ne: null },
      $or: [{ punchOut: { $exists: false } }, { punchOut: null }]
    }).sort({ createdAt: -1 });

    if (activeRecord) {
      return res.status(400).json({
        message: 'Already punched in. Please punch out or cancel your active punch session before punching in again.',
        attendance: activeRecord
      });
    }

    const { shiftStartDate, graceCutoffDate, shiftLabel, shiftName } = await getAssignedShiftStart(trimmedToken, now);

    const isLate = now > graceCutoffDate;
    let lateMinutes = 0;
    if (isLate) {
      lateMinutes = Math.max(0, Math.round((now - shiftStartDate) / (1000 * 60)));
    }

    const isSunday = now.getDay() === 0;
    const supervisorApproved = !isLate;
    const status = isLate ? 'Pending Late Approval' : 'In Progress';

    const record = await Attendance.create({
      employeeId: employee._id,
      tokenNo: employee.tokenNo,
      date: now,
      punchIn: now,
      punchInLocation: {
        latitude: latitude || 11.983878,
        longitude: longitude || 75.374253,
        locationName: locationName || 'Keltron Kannur Plant (Inside 300m Geofence)',
        isGeofencedAutoPunch: !!isGeofencedAutoPunch
      },
      isSunday,
      isLate,
      lateMinutes,
      shiftStartTime: shiftLabel,
      supervisorApproved,
      status,
    });

    const geoNotice = isGeofencedAutoPunch ? ' (📍 Automated 300m Geofenced GPS Auto-Punch)' : '';

    if (isLate) {
      return res.status(201).json({
        message: `Punched In at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}${geoNotice} [${shiftName}] (LATE by ${lateMinutes} mins). Recorded! Pending Late Approval.`,
        attendance: record,
        isLate: true
      });
    }

    res.status(201).json({
      message: `Punched In successfully on time (${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}) [${shiftName}]${geoNotice}!`,
      attendance: record,
      isLate: false
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Punch Out (Supports Automated Geofenced GPS Exit Punch)
// Working Hours: 7.5 hrs (30 min lunch deducted from 8 hr shift)
// OT: only if raw presence > 8.5 hrs (30 min post-shift grace), OT = rawHours - 8.0
router.post('/punch-out', async (req, res) => {
  try {
    const { tokenNo, punchOutTimeOverride, latitude, longitude, isGeofencedAutoPunch, locationName } = req.body;
    if (!tokenNo) return res.status(400).json({ message: 'Punching Token number is required.' });

    const trimmedToken = String(tokenNo).trim();
    let employee = await Employee.findOne({ tokenNo: trimmedToken });
    if (!employee) {
      employee = await Employee.findOne({ tokenNo: { $regex: new RegExp(`^${trimmedToken}$`, 'i') } });
    }
    if (!employee) return res.status(404).json({ message: `Employee profile not found for Token #${trimmedToken}.` });

    const now = new Date();

    // Find the latest active punch-in that has not been punched out yet
    let record = await Attendance.findOne({
      employeeId: employee._id,
      punchIn: { $exists: true },
      $or: [{ punchOut: { $exists: false } }, { punchOut: null }]
    }).sort({ createdAt: -1 });

    if (!record) {
      record = await Attendance.findOne({
        employeeId: employee._id,
        status: { $in: ['In Progress', 'Pending Late Approval'] }
      }).sort({ createdAt: -1 });
    }

    if (!record) {
      return res.status(400).json({ message: 'No active punch-in record found to punch out.' });
    }

    const punchOutTime = punchOutTimeOverride ? new Date(punchOutTimeOverride) : now;
    const punchInTime = new Date(record.punchIn);

    const diffMs = Math.max(0, punchOutTime - punchInTime);
    const totalRawHrs = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));

    // ── Working Hours Calculation ──
    // Shift = 8 hrs, Lunch = 30 min deducted, Standard working = 7.5 hrs
    const LUNCH_DEDUCTION = 0.5;        // 30 minutes lunch break
    const STANDARD_WORKING = 7.5;       // 7 hrs 30 min
    const SHIFT_DURATION = 8.0;         // 8 hrs total shift (including lunch)
    const POST_SHIFT_GRACE = 0.5;       // 30 min grace after shift ends
    const OT_THRESHOLD = SHIFT_DURATION + POST_SHIFT_GRACE; // 8.5 hrs

    let workingHours;
    let overtimeHrs;

    if (totalRawHrs >= SHIFT_DURATION) {
      // Full shift completed → working = 7.5 hrs (always)
      workingHours = STANDARD_WORKING;
    } else if (totalRawHrs > LUNCH_DEDUCTION) {
      // Partial day → deduct lunch from raw hours
      workingHours = parseFloat((totalRawHrs - LUNCH_DEDUCTION).toFixed(2));
    } else {
      // Very short presence (< 30 min)
      workingHours = parseFloat(totalRawHrs.toFixed(2));
    }

    if (totalRawHrs > OT_THRESHOLD) {
      // OT = (raw - lunch) - working = raw - 8.0
      // The 30 min grace (3:00 - 3:30 for 1st shift) is NOT counted as OT
      overtimeHrs = parseFloat((totalRawHrs - SHIFT_DURATION).toFixed(2));
    } else {
      // Within shift + 30 min grace → no overtime
      overtimeHrs = 0;
    }

    // Display formatting
    const workingMins = Math.round(workingHours * 60);
    const wHrs = Math.floor(workingMins / 60);
    const wMins = workingMins % 60;
    const otMins = Math.round(overtimeHrs * 60);
    const oHrs = Math.floor(otMins / 60);
    const oMins = otMins % 60;

    record.punchOut = punchOutTime;
    record.punchOutLocation = {
      latitude: latitude || 11.983878,
      longitude: longitude || 75.374253,
      locationName: locationName || 'Keltron Kannur Plant (Inside 300m Geofence)',
      isGeofencedAutoPunch: !!isGeofencedAutoPunch
    };
    record.totalHours = workingHours;
    record.overtimeHours = overtimeHrs;
    record.status = (record.isLate && !record.supervisorApproved) ? 'Pending Late Approval' : 'Present';
    await record.save();

    const geoNotice = isGeofencedAutoPunch ? ' (📍 Automated 300m Geofenced GPS Exit Punch)' : '';

    res.json({
      message: `Punched Out successfully at ${punchOutTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}${geoNotice}! Worked: ${wHrs}h ${wMins}m | OT: ${oHrs}h ${oMins}m`,
      attendance: record
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Approve late punch-in (RESTRICTED: Supervisor late punch can ONLY be approved by Site Admin)
router.post('/approve-late/:id', async (req, res) => {
  try {
    const { supervisorToken, supervisorName, requesterRole } = req.body;
    const record = await Attendance.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Attendance record not found' });

    const punchUser = await User.findOne({ employeeToken: record.tokenNo });
    const isPunchedUserSupervisor = punchUser && (punchUser.role === 'Supervisor' || punchUser.role === 'SiteAdmin');

    if (isPunchedUserSupervisor && requesterRole !== 'SiteAdmin') {
      return res.status(403).json({
        message: `Permission Denied: Token #${record.tokenNo} belongs to a Supervisor. Late punches for Supervisors can ONLY be approved by Site Admin!`
      });
    }

    record.supervisorApproved = true;
    if (record.status === 'Pending Late Approval') {
      record.status = record.punchOut ? 'Present' : 'In Progress';
    }
    record.approvedBy = {
      tokenNo: supervisorToken || 'Supervisor',
      name: supervisorName || 'Supervisor'
    };
    await record.save();

    res.json({
      message: `Late punch-in for Token #${record.tokenNo} successfully approved!`,
      attendance: record
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Supervisor / Admin fetch list of late punches pending approval
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

// Get attendance for specific employee (sorted by latest createdAt & date)
router.get('/employee/:tokenNo', async (req, res) => {
  try {
    const tokenNo = String(req.params.tokenNo).trim();
    const records = await Attendance.find({
      $or: [
        { tokenNo: tokenNo },
        { tokenNo: { $regex: new RegExp(`^${tokenNo}$`, 'i') } }
      ]
    })
      .sort({ createdAt: -1, date: -1 })
      .limit(60);
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
    }).sort({ createdAt: -1 }).populate('employeeId');

    res.json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Recalculate Past Attendance Records to Correct Shift Start Times, Hours & Clear False LATE Flags
router.post('/recalculate-shifts', async (req, res) => {
  try {
    const records = await Attendance.find({ punchIn: { $exists: true, $ne: null } });
    let updatedCount = 0;

    for (const record of records) {
      const punchInDate = new Date(record.punchIn);
      const { shiftStartDate, graceCutoffDate, shiftLabel } = await getAssignedShiftStart(record.tokenNo, punchInDate);

      const isLate = punchInDate > graceCutoffDate;
      const lateMinutes = isLate ? Math.max(0, Math.round((punchInDate - shiftStartDate) / (1000 * 60))) : 0;

      record.shiftStartTime = shiftLabel;
      record.isLate = isLate;
      record.lateMinutes = lateMinutes;

      // Recalculate true working hours & overtime hours
      if (record.punchIn && record.punchOut) {
        const pIn = new Date(record.punchIn);
        const pOut = new Date(record.punchOut);
        const diffMs = Math.max(0, pOut - pIn);
        const totalRawHrs = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));

        const LUNCH_DEDUCTION = 0.5;
        const STANDARD_WORKING = 7.5;
        const SHIFT_DURATION = 8.0;
        const OT_THRESHOLD = 8.5;

        let workingHours;
        let overtimeHrs;

        if (totalRawHrs >= SHIFT_DURATION) {
          workingHours = STANDARD_WORKING;
        } else if (totalRawHrs > LUNCH_DEDUCTION) {
          workingHours = parseFloat((totalRawHrs - LUNCH_DEDUCTION).toFixed(2));
        } else {
          workingHours = parseFloat(totalRawHrs.toFixed(2));
        }

        if (totalRawHrs > OT_THRESHOLD) {
          overtimeHrs = parseFloat((totalRawHrs - SHIFT_DURATION).toFixed(2));
        } else {
          overtimeHrs = 0;
        }

        record.totalHours = workingHours;
        record.overtimeHours = overtimeHrs;
        record.status = (!isLate || record.supervisorApproved) ? 'Present' : 'Pending Late Approval';
      } else {
        record.status = isLate ? 'Pending Late Approval' : 'In Progress';
      }

      if (!isLate) {
        record.supervisorApproved = true;
      }

      await record.save();
      updatedCount++;
    }

    res.json({
      success: true,
      message: `Successfully recalculated ${updatedCount} attendance records with true shift start times, working hours, and cleared false late penalties!`,
      updatedCount,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete / Remove an Attendance Record (e.g. accidental or unwanted punch)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Attendance.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: 'Attendance record not found.' });
    }
    res.json({ success: true, message: 'Attendance record deleted successfully.', deletedRecord: deleted });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.getAssignedShiftStart = getAssignedShiftStart;
module.exports = router;
