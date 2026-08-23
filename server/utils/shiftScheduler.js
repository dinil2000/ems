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
    // Increment 7 days from last roster's Monday
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
   * Helper: Select qualified employees for a machine based on EXACT machine expertise match
   * AND ROTATION PREFERENCE (e.g. Workers who worked Shift 1 previous week rotate to Shift 2!).
   */
  const getQualifiedStaffForShift = (targetMachine, pool, countToTake, targetShiftName) => {
    const mId = targetMachine.machineId;

    // Filter candidates strictly by machine expertise
    const qualified = pool.filter(emp => {
      const empIdStr = emp._id.toString();
      if (assignedEmpIds.has(empIdStr)) return false;

      const knowsMachine = Array.isArray(emp.machineExpertise) && (
        emp.machineExpertise.includes(mId) ||
        emp.machineExpertise.some(exp => exp.trim() === mId.trim())
      );
      return knowsMachine;
    });

    // Sort qualified candidates by rotation preference:
    // If targetShift is Shift-2, prioritize workers whose previous shift was Shift-1!
    // If targetShift is Shift-1, prioritize workers whose previous shift was Shift-2 or Shift-3!
    qualified.sort((a, b) => {
      const prevA = lastShiftMap[a.tokenNo] || '';
      const prevB = lastShiftMap[b.tokenNo] || '';

      if (targetShiftName === 'Shift-2') {
        const aWasShift1 = prevA.includes('Shift-1') ? -1 : 1;
        const bWasShift1 = prevB.includes('Shift-1') ? -1 : 1;
        return aWasShift1 - bWasShift1;
      } else if (targetShiftName === 'Shift-1') {
        const aWasShift2 = prevA.includes('Shift-2') || prevA.includes('Shift-3') ? -1 : 1;
        const bWasShift2 = prevB.includes('Shift-2') || prevB.includes('Shift-3') ? -1 : 1;
        return aWasShift2 - bWasShift2;
      }
      return 0;
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
  const windingStaffShift3 = getQualifiedStaffForShift(machineWinding700, maleEmployees, 1, 'Shift-3');
  shift3Allocations.push({
    machineId: machineWinding700.machineId,
    machineName: machineWinding700.name,
    category: machineWinding700.category,
    assignedEmployees: windingStaffShift3.map(e => ({ employeeId: e._id, tokenNo: e.tokenNo, name: e.name })),
  });

  const machineTesting710 = machines.find(m => m.machineId === '710' || m.category === 'Testing') || { machineId: '710', name: 'Testing 710', category: 'Testing' };
  const testingStaffShift3 = getQualifiedStaffForShift(machineTesting710, maleEmployees, 1, 'Shift-3');
  shift3Allocations.push({
    machineId: machineTesting710.machineId,
    machineName: machineTesting710.name,
    category: machineTesting710.category,
    assignedEmployees: testingStaffShift3.map(e => ({ employeeId: e._id, tokenNo: e.tokenNo, name: e.name })),
  });

  const machineMetalizing766 = machines.find(m => m.machineId === '766' || m.category === 'Metalizing') || { machineId: '766', name: 'Metalizing 766', category: 'Metalizing' };
  const metalizingStaffShift3 = getQualifiedStaffForShift(machineMetalizing766, maleEmployees, 4, 'Shift-3');
  shift3Allocations.push({
    machineId: machineMetalizing766.machineId,
    machineName: machineMetalizing766.name,
    category: machineMetalizing766.category,
    assignedEmployees: metalizingStaffShift3.map(e => ({ employeeId: e._id, tokenNo: e.tokenNo, name: e.name })),
  });

  // ==========================================
  // SHIFT 1 (07.00 AM - 03.00 PM) & SHIFT 2 (03.00 PM - 11.00 PM)
  // Exact Shift 1 <-> Shift 2 Rotation Rule
  // ==========================================
  const shift1Allocations = [];
  const shift2Allocations = [];

  machines.forEach(m => {
    const reqCount = m.category === 'Metalizing' ? (m.minStaffRequired || 4) : 1;

    // Shift 1 Allocation (Prioritizes previous Shift 2 / Shift 3 workers)
    const staffShift1 = getQualifiedStaffForShift(m, maleEmployees, reqCount, 'Shift-1');
    shift1Allocations.push({
      machineId: m.machineId,
      machineName: m.name,
      category: m.category,
      assignedEmployees: staffShift1.map(e => ({ employeeId: e._id, tokenNo: e.tokenNo, name: e.name })),
    });

    // Shift 2 Allocation (Prioritizes previous Shift 1 workers - "first undayavar second undavanm")
    const staffShift2 = getQualifiedStaffForShift(m, maleEmployees, reqCount, 'Shift-2');
    shift2Allocations.push({
      machineId: m.machineId,
      machineName: m.name,
      category: m.category,
      assignedEmployees: staffShift2.map(e => ({ employeeId: e._id, tokenNo: e.tokenNo, name: e.name })),
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
