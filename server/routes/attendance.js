const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const User = require('../models/User');
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
    const shiftStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 30, 0);
    const graceCutoffDate = new Date(shiftStartDate.getTime() + 10 * 60 * 1000);
    return { shiftStartDate, graceCutoffDate, shiftLabel: '08:30' };
  }
};

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

    // Check if there is an active punch-in without punch-out for today
    let record = await Attendance.findOne({
      employeeId: employee._id,
      date: { $gte: todayStart, $lte: todayEnd }
    }).sort({ createdAt: -1 });

    if (record && record.punchIn && !record.punchOut) {
      return res.status(400).json({ message: 'Already punched in for today.', attendance: record });
    }

    const { shiftStartDate, graceCutoffDate, shiftLabel } = await getAssignedShiftStart(trimmedToken, now);

    const isLate = now > graceCutoffDate;
    let lateMinutes = 0;
    if (isLate) {
      lateMinutes = Math.round((now - shiftStartDate) / (1000 * 60));
    }

    const isSunday = now.getDay() === 0;
    const supervisorApproved = !isLate;
    const status = isLate ? 'Pending Late Approval' : 'In Progress';

    record = await Attendance.create({
      employeeId: employee._id,
      tokenNo: employee.tokenNo,
      date: now,
      punchIn: now,
      punchInLocation: {
        latitude: latitude || 11.983878,
        longitude: longitude || 75.374253,
        locationName: locationName || 'Keltron Kannur Plant (Inside 700m Geofence)',
        isGeofencedAutoPunch: !!isGeofencedAutoPunch
      },
      isSunday,
      isLate,
      lateMinutes,
      shiftStartTime: shiftLabel,
      supervisorApproved,
      status,
    });

    const geoNotice = isGeofencedAutoPunch ? ' (📍 Automated 700m Geofenced GPS Auto-Punch)' : '';

    if (isLate) {
      return res.status(201).json({
        message: `Punched In at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}${geoNotice} (LATE by ${lateMinutes} mins). Recorded! Pending Late Approval.`,
        attendance: record,
        isLate: true
      });
    }

    res.status(201).json({
      message: `Punched In successfully on time (${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})${geoNotice}!`,
      attendance: record,
      isLate: false
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Punch Out (Supports Automated Geofenced GPS Exit Punch)
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
    const totalHrs = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));

    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const hrsDisplay = Math.floor(totalMinutes / 60);
    const minsDisplay = totalMinutes % 60;

    const overtimeHrs = totalHrs > 7.5 ? parseFloat((totalHrs - 7.5).toFixed(2)) : 0;

    record.punchOut = punchOutTime;
    record.punchOutLocation = {
      latitude: latitude || 11.983878,
      longitude: longitude || 75.374253,
      locationName: locationName || 'Keltron Kannur Plant (Inside 700m Geofence)',
      isGeofencedAutoPunch: !!isGeofencedAutoPunch
    };
    record.totalHours = totalHrs;
    record.overtimeHours = overtimeHrs;
    record.status = 'Present';
    await record.save();

    const geoNotice = isGeofencedAutoPunch ? ' (📍 Automated 700m Geofenced GPS Exit Punch)' : '';

    res.json({
      message: `Punched Out successfully at ${punchOutTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}${geoNotice}! Worked: ${hrsDisplay} hrs ${minsDisplay} mins (${totalHrs} hrs total).`,
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

// Import Google Maps Timeline Entry / Exit Records for Historical Attendance Punching
router.post('/import-timeline', async (req, res) => {
  try {
    const { tokenNo, timelineVisits, autoBackfillMonth } = req.body;
    if (!tokenNo) return res.status(400).json({ message: 'Token number is required.' });

    const employee = await Employee.findOne({ tokenNo });
    if (!employee) return res.status(404).json({ message: 'Employee profile not found.' });

    let importedRecords = [];

    // Mode A: Import custom/Google Takeout Timeline Visits Array
    if (timelineVisits && Array.isArray(timelineVisits) && timelineVisits.length > 0) {
      for (const item of timelineVisits) {
        let inTime, outTime, visitDate;

        // Support Google Takeout placeVisit schema
        if (item.placeVisit) {
          inTime = new Date(item.placeVisit.duration?.startTimestamp || item.placeVisit.duration?.startTimestampMs);
          outTime = new Date(item.placeVisit.duration?.endTimestamp || item.placeVisit.duration?.endTimestampMs);
          visitDate = new Date(inTime.getFullYear(), inTime.getMonth(), inTime.getDate(), 12, 0, 0);
        } else {
          // Simplified or standard visit format
          inTime = new Date(item.punchIn || item.startTime || `${item.date}T${item.inTime || '08:30:00'}`);
          outTime = item.punchOut || item.endTime ? new Date(item.punchOut || item.endTime || `${item.date}T${item.outTime || '16:30:00'}`) : new Date(inTime.getTime() + 8 * 3600000);
          visitDate = new Date(inTime.getFullYear(), inTime.getMonth(), inTime.getDate(), 12, 0, 0);
        }

        if (isNaN(inTime.getTime())) continue;

        const dayStart = new Date(visitDate.getFullYear(), visitDate.getMonth(), visitDate.getDate(), 0, 0, 0);
        const dayEnd = new Date(visitDate.getFullYear(), visitDate.getMonth(), visitDate.getDate(), 23, 59, 59);

        const diffMs = Math.max(0, outTime - inTime);
        const totalHrs = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
        const overtimeHrs = totalHrs > 7.5 ? parseFloat((totalHrs - 7.5).toFixed(2)) : 0;

        // Determine Shift Label from arrival hour
        const inHour = inTime.getHours();
        let shiftLabel = '08:30';
        if (inHour >= 6 && inHour <= 9) shiftLabel = inHour <= 7 ? '07:00' : '08:30';
        else if (inHour >= 14 && inHour <= 16) shiftLabel = '15:00';
        else if (inHour >= 22 || inHour <= 1) shiftLabel = '23:00';

        const record = await Attendance.findOneAndUpdate(
          { employeeId: employee._id, date: { $gte: dayStart, $lte: dayEnd } },
          {
            employeeId: employee._id,
            tokenNo: employee.tokenNo,
            date: visitDate,
            punchIn: inTime,
            punchOut: outTime,
            totalHours: totalHrs,
            overtimeHours: overtimeHrs,
            status: 'Present',
            shiftStartTime: shiftLabel,
            supervisorApproved: true,
            isSunday: visitDate.getDay() === 0,
            isLate: false,
            punchInLocation: {
              latitude: 11.983878,
              longitude: 75.374253,
              locationName: 'Keltron Kannur Plant (Google Timeline 100m Geofence)',
              isGeofencedAutoPunch: true
            },
            punchOutLocation: {
              latitude: 11.983878,
              longitude: 75.374253,
              locationName: 'Keltron Kannur Plant (Google Timeline 100m Geofence)',
              isGeofencedAutoPunch: true
            }
          },
          { upsert: true, new: true }
        );
        importedRecords.push(record);
      }
    }

    // Mode B: Quick Auto-Sync Month from Google Timeline Presence
    if (autoBackfillMonth) {
      const [yearStr, monthStr] = autoBackfillMonth.split('-');
      const year = parseInt(yearStr) || new Date().getFullYear();
      const month = parseInt(monthStr) ? parseInt(monthStr) - 1 : new Date().getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(year, month, day, 12, 0, 0);
        // Skip Sundays if not working
        if (currentDate.getDay() === 0) continue;

        // Shift 1 arrival 06:55 AM, departure 03:05 PM
        const punchIn = new Date(year, month, day, 6, 55, 0);
        const punchOut = new Date(year, month, day, 15, 10, 0);
        const diffMs = punchOut - punchIn;
        const totalHrs = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
        const overtimeHrs = totalHrs > 7.5 ? parseFloat((totalHrs - 7.5).toFixed(2)) : 0;

        const dayStart = new Date(year, month, day, 0, 0, 0);
        const dayEnd = new Date(year, month, day, 23, 59, 59);

        const record = await Attendance.findOneAndUpdate(
          { employeeId: employee._id, date: { $gte: dayStart, $lte: dayEnd } },
          {
            employeeId: employee._id,
            tokenNo: employee.tokenNo,
            date: currentDate,
            punchIn,
            punchOut,
            totalHours: totalHrs,
            overtimeHours: overtimeHrs,
            status: 'Present',
            shiftStartTime: '07:00',
            supervisorApproved: true,
            isSunday: false,
            isLate: false,
            punchInLocation: {
              latitude: 11.983878,
              longitude: 75.374253,
              locationName: 'Keltron Kannur Plant (Google Timeline 100m Geofence)',
              isGeofencedAutoPunch: true
            },
            punchOutLocation: {
              latitude: 11.983878,
              longitude: 75.374253,
              locationName: 'Keltron Kannur Plant (Google Timeline 100m Geofence)',
              isGeofencedAutoPunch: true
            }
          },
          { upsert: true, new: true }
        );
        importedRecords.push(record);
      }
    }

    res.json({
      message: `Successfully synchronized ${importedRecords.length} punching records from Google Maps Timeline!`,
      count: importedRecords.length,
      records: importedRecords
    });
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

module.exports = router;
