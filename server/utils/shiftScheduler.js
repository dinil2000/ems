const Employee = require('../models/Employee');
const Machine = require('../models/Machine');
const ShiftSchedule = require('../models/ShiftSchedule');

const generateWeeklyRoster = async (weekStartDateInput) => {
  const weekStart = weekStartDateInput ? new Date(weekStartDateInput) : getNextMonday(new Date());
  const weekEnd = new Date(weekStart.getTime() + 5 * 24 * 60 * 60 * 1000); // Mon to Sat

  // Fetch active employees & machines
  const employees = await Employee.find({ status: 'Active' });
  const machines = await Machine.find({});

  if (!employees.length || !machines.length) {
    throw new Error('Insufficient active employees or machines in database to generate roster.');
  }

  // Count past published rosters to determine 4-week cycle rotation & Shift 3 frequency
  const pastRostersCount = await ShiftSchedule.countDocuments({ status: 'Published' });
  const cycleWeekNumber = (pastRostersCount % 5) + 1; // Weeks 1 to 5 (Week 5 is 3rd Shift cycle)

  // Separate Female employees for General Shift (08.30 AM - 04.30 PM)
  const femaleEmployees = employees.filter(e => e.gender === 'Female');
  const maleEmployees = employees.filter(e => e.gender !== 'Female');

  // Track assigned employee IDs for current week's roster
  const assignedEmpIds = new Set();

  /**
   * Helper: Select qualified employees for a machine based on EXACT machine expertise match.
   * STRICT RULE: If an employee does not know a particular machine, DO NOT assign them!
   */
  const getQualifiedStaff = (targetMachine, pool, countToTake) => {
    const mId = targetMachine.machineId;

    // Filter candidate pool strictly by machine expertise
    const qualifiedCandidates = pool.filter(emp => {
      const empIdStr = emp._id.toString();
      if (assignedEmpIds.has(empIdStr)) return false;

      // Strict expertise match: machineId must be present in emp.machineExpertise
      const knowsMachine = Array.isArray(emp.machineExpertise) && (
        emp.machineExpertise.includes(mId) ||
        emp.machineExpertise.some(exp => exp.trim() === mId.trim())
      );

      return knowsMachine;
    });

    // Take required count
    const selected = qualifiedCandidates.slice(0, countToTake);
    selected.forEach(e => assignedEmpIds.add(e._id.toString()));
    return selected;
  };

  // ==========================================
  // SHIFT 3 (11.00 PM - 07.00 AM) - NIGHT SHIFT (5 to 6 Employees Only)
  // RULE:
  // - 1 employee in (700,705 - Winding)
  // - 1 employee in (710 - Testing)
  // - 4 employees in (766 - Metalizing)
  // ==========================================
  const shift3Allocations = [];

  // 1. Winding (700,705): 1 Employee
  const machineWinding700 = machines.find(m => m.machineId === '700,705' || m.category === 'Winding') || { machineId: '700,705', name: 'Winding 700/705', category: 'Winding' };
  const windingStaffShift3 = getQualifiedStaff(machineWinding700, maleEmployees, 1);
  shift3Allocations.push({
    machineId: machineWinding700.machineId,
    machineName: machineWinding700.name,
    category: machineWinding700.category,
    assignedEmployees: windingStaffShift3.map(e => ({ employeeId: e._id, tokenNo: e.tokenNo, name: e.name })),
  });

  // 2. Testing (710): 1 Employee
  const machineTesting710 = machines.find(m => m.machineId === '710' || m.category === 'Testing') || { machineId: '710', name: 'Testing 710', category: 'Testing' };
  const testingStaffShift3 = getQualifiedStaff(machineTesting710, maleEmployees, 1);
  shift3Allocations.push({
    machineId: machineTesting710.machineId,
    machineName: machineTesting710.name,
    category: machineTesting710.category,
    assignedEmployees: testingStaffShift3.map(e => ({ employeeId: e._id, tokenNo: e.tokenNo, name: e.name })),
  });

  // 3. Metalizing (766): 4 Employees
  const machineMetalizing766 = machines.find(m => m.machineId === '766' || m.category === 'Metalizing') || { machineId: '766', name: 'Metalizing 766', category: 'Metalizing' };
  const metalizingStaffShift3 = getQualifiedStaff(machineMetalizing766, maleEmployees, 4);
  shift3Allocations.push({
    machineId: machineMetalizing766.machineId,
    machineName: machineMetalizing766.name,
    category: machineMetalizing766.category,
    assignedEmployees: metalizingStaffShift3.map(e => ({ employeeId: e._id, tokenNo: e.tokenNo, name: e.name })),
  });

  // ==========================================
  // SHIFT 1 (07.00 AM - 03.00 PM) & SHIFT 2 (03.00 PM - 11.00 PM)
  // Monthly rotation rule: 4 weeks Shift 1 <-> Shift 2 rotation
  // ==========================================
  const shift1Allocations = [];
  const shift2Allocations = [];

  machines.forEach(m => {
    const reqCount = m.category === 'Metalizing' ? (m.minStaffRequired || 4) : 1;

    // Allocate for Shift 1
    const staffShift1 = getQualifiedStaff(m, maleEmployees, reqCount);
    shift1Allocations.push({
      machineId: m.machineId,
      machineName: m.name,
      category: m.category,
      assignedEmployees: staffShift1.map(e => ({ employeeId: e._id, tokenNo: e.tokenNo, name: e.name })),
    });

    // Allocate for Shift 2
    const staffShift2 = getQualifiedStaff(m, maleEmployees, reqCount);
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

  // Construct official notice format
  const noticeRef = `PC12/XR/${String(pastRostersCount + 4).padStart(3, '0')}`;

  const shiftScheduleData = {
    noticeRefNo: noticeRef,
    unit: 'ഉല്പാദന യൂണിറ്റ് 1 & 2 (MPP Section)',
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

function getNextMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

module.exports = { generateWeeklyRoster };
