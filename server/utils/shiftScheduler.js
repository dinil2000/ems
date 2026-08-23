const Employee = require('../models/Employee');
const Machine = require('../models/Machine');
const ShiftSchedule = require('../models/ShiftSchedule');

const generateWeeklyRoster = async (weekStartDateInput) => {
  // Fetch most recent published roster to determine next week & previous shift assignments
  const lastRoster = await ShiftSchedule.findOne({ status: 'Published' }).sort({ weekStartDate: -1 });

  let weekStart;
  if (weekStartDateInput) {
    weekStart = getMonday(new Date(weekStartDateInput));
  } else if (lastRoster && lastRoster.weekStartDate) {
    // Next week's Monday (Add 7 days to last roster's Monday)
    weekStart = new Date(new Date(lastRoster.weekStartDate).getTime() + 7 * 24 * 60 * 60 * 1000);
  } else {
    weekStart = getNextMonday(new Date());
  }

  // Monday to Saturday work period
  const weekEnd = new Date(weekStart.getTime() + 5 * 24 * 60 * 60 * 1000);
  // Notice issue date is Friday preceding the work week (Monday - 3 days)
  const noticeIssueDate = new Date(weekStart.getTime() - 3 * 24 * 60 * 60 * 1000);

  // Map employee Token -> last shift type worked (for exact Shift 1 <-> Shift 2 rotation)
  const lastShiftMap = {};
  if (lastRoster && lastRoster.shifts) {
    lastRoster.shifts.forEach(slot => {
      slot.allocations.forEach(alloc => {
        if (alloc.assignedEmployees) {
          alloc.assignedEmployees.forEach(e => {
            lastShiftMap[e.tokenNo] = slot.shiftType;
          });
        }
      });
    });
  }

  // Fetch active employees & machines
  const employees = await Employee.find({ status: 'Active' });
  const machines = await Machine.find({});

  if (!employees.length || !machines.length) {
    throw new Error('Insufficient active employees or machines in database to generate roster.');
  }

  // Count total rosters to track 4-week cycle (Week 5 is 3rd Shift Night Shift rotation)
  const totalRostersCount = await ShiftSchedule.countDocuments({ status: 'Published' });
  const isNightShiftWeek = (totalRostersCount + 1) % 5 === 0;

  // Separate female & male employees
  const femaleEmployees = employees.filter(e => e.gender === 'Female');
  const maleEmployees = employees.filter(e => e.gender !== 'Female');

  // Track assigned employee IDs for current week's roster
  const assignedEmpIds = new Set();

  /**
   * Helper: Select qualified employees for a machine based on EXACT machine expertise match.
   */
  const getQualifiedStaff = (targetMachine, candidatePool, countToTake) => {
    const mId = targetMachine.machineId;

    const qualified = candidatePool.filter(emp => {
      const empIdStr = emp._id.toString();
      if (assignedEmpIds.has(empIdStr)) return false;

      const knowsMachine = Array.isArray(emp.machineExpertise) && (
        emp.machineExpertise.includes(mId) ||
        emp.machineExpertise.some(exp => exp.trim() === mId.trim())
      );
      return knowsMachine;
    });

    const selected = qualified.slice(0, countToTake);
    selected.forEach(e => assignedEmpIds.add(e._id.toString()));
    return selected;
  };

  // ==========================================
  // SHIFT 3 (11.00 PM - 07.00 AM) - NIGHT SHIFT (6 Employees Only)
  // RULE:
  // - 1 employee in (700,705 - Winding)
  // - 1 employee in (710 - Testing)
  // - 4 employees in (766 - Metalizing)
  // ==========================================
  const shift3Allocations = [];

  const machineWinding700 = machines.find(m => m.machineId === '700,705' || m.category === 'Winding') || { machineId: '700,705', name: 'Winding 700/705', category: 'Winding' };
  const windingStaffShift3 = getQualifiedStaff(machineWinding700, maleEmployees, 1);
  shift3Allocations.push({
    machineId: machineWinding700.machineId,
    machineName: machineWinding700.name,
    category: machineWinding700.category,
    assignedEmployees: windingStaffShift3.map(e => ({ employeeId: e._id, tokenNo: e.tokenNo, name: e.name })),
  });

  const machineTesting710 = machines.find(m => m.machineId === '710' || m.category === 'Testing') || { machineId: '710', name: 'Testing 710', category: 'Testing' };
  const testingStaffShift3 = getQualifiedStaff(machineTesting710, maleEmployees, 1);
  shift3Allocations.push({
    machineId: machineTesting710.machineId,
    machineName: machineTesting710.name,
    category: machineTesting710.category,
    assignedEmployees: testingStaffShift3.map(e => ({ employeeId: e._id, tokenNo: e.tokenNo, name: e.name })),
  });

  const machineMetalizing766 = machines.find(m => m.machineId === '766' || m.category === 'Metalizing') || { machineId: '766', name: 'Metalizing 766', category: 'Metalizing' };
  const metalizingStaffShift3 = getQualifiedStaff(machineMetalizing766, maleEmployees, 4);
  shift3Allocations.push({
    machineId: machineMetalizing766.machineId,
    machineName: machineMetalizing766.name,
    category: machineMetalizing766.category,
    assignedEmployees: metalizingStaffShift3.map(e => ({ employeeId: e._id, tokenNo: e.tokenNo, name: e.name })),
  });

  // ==========================================
  // EXACT SHIFT 1 <-> SHIFT 2 ROTATION ENGINE
  // Rule: All employees who worked Shift 1 last week MUST move to Shift 2!
  // All employees who worked Shift 2 last week MUST move to Shift 1!
  // ==========================================
  const prevShift1Pool = maleEmployees.filter(e => {
    const prev = lastShiftMap[e.tokenNo];
    return prev && prev.includes('Shift-1');
  });

  const prevShift2Pool = maleEmployees.filter(e => {
    const prev = lastShiftMap[e.tokenNo];
    return !prev || prev.includes('Shift-2') || prev.includes('Shift-3');
  });

  // Remaining male employees fallback pool
  const remainingMalePool = maleEmployees.filter(e => !prevShift1Pool.includes(e) && !prevShift2Pool.includes(e));

  // Build candidate pools for current week:
  // Candidate pool for Shift 2: Previous Shift 1 workers FIRST, then remaining
  const shift2CandidatePool = [...prevShift1Pool, ...remainingMalePool, ...prevShift2Pool];
  // Candidate pool for Shift 1: Previous Shift 2 workers FIRST, then remaining
  const shift1CandidatePool = [...prevShift2Pool, ...remainingMalePool, ...prevShift1Pool];

  const shift1Allocations = [];
  const shift2Allocations = [];

  machines.forEach(m => {
    const reqCount = m.category === 'Metalizing' ? (m.minStaffRequired || 4) : 1;

    // Allocate Shift 2 FIRST using previous Shift 1 workers!
    const staffShift2 = getQualifiedStaff(m, shift2CandidatePool, reqCount);
    shift2Allocations.push({
      machineId: m.machineId,
      machineName: m.name,
      category: m.category,
      assignedEmployees: staffShift2.map(e => ({ employeeId: e._id, tokenNo: e.tokenNo, name: e.name })),
    });

    // Allocate Shift 1 using previous Shift 2 workers!
    const staffShift1 = getQualifiedStaff(m, shift1CandidatePool, reqCount);
    shift1Allocations.push({
      machineId: m.machineId,
      machineName: m.name,
      category: m.category,
      assignedEmployees: staffShift1.map(e => ({ employeeId: e._id, tokenNo: e.tokenNo, name: e.name })),
    });
  });

  // ==========================================
  // GENERAL SHIFT (08.30 AM - 04.30 PM)
  // Female employees + remaining unassigned workers
  // ==========================================
  const unassignedMale = maleEmployees.filter(e => !assignedEmpIds.has(e._id.toString()));
  const generalShiftCrew = [...femaleEmployees, ...unassignedMale];

  const generalShiftAllocations = [{
    machineId: 'GENERAL_MPP',
    machineName: 'General Section Operations & Quality Maintenance',
    category: 'General',
    assignedEmployees: generalShiftCrew.map(e => ({ employeeId: e._id, tokenNo: e.tokenNo, name: e.name })),
  }];

  const noticeRef = `PC12/XR/${String(totalRostersCount + 5).padStart(3, '0')}`;

  const shiftScheduleData = {
    noticeRefNo: noticeRef,
    unit: 'ഉല്പാദന യൂണിറ്റ് 1 & 2 (MPP Section)',
    noticeIssueDate,
    weekStartDate: weekStart,
    weekEndDate: weekEnd,
    status: 'Published',
    shifts: [
      {
        shiftType: 'Shift-1 (07.00AM-03.00PM)',
        shiftInCharge: { tokenNo: '3085', name: 'Bipin E P' },
        allocations: shift1Allocations,
      },
      {
        shiftType: 'Shift-2 (03.00PM-11.00PM)',
        shiftInCharge: { tokenNo: '851', name: 'Rahul' },
        allocations: shift2Allocations,
      },
      {
        shiftType: 'Shift-3 (11.00PM-07.00AM)',
        shiftInCharge: { tokenNo: '3085', name: 'Bipin E P' },
        allocations: shift3Allocations,
      },
      {
        shiftType: 'General Shift (08.30AM-04.30PM)',
        shiftInCharge: { tokenNo: '851', name: 'Rahul' },
        allocations: generalShiftAllocations,
      }
    ]
  };

  const savedRoster = await ShiftSchedule.create(shiftScheduleData);
  return savedRoster;
};

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

function getNextMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? 1 : 8 - day);
  return new Date(d.setDate(diff));
}

module.exports = { generateWeeklyRoster };
