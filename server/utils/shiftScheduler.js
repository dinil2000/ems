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
    throw new Error('Insufficient employees or machines in database to generate roster.');
  }

  // Separate Female employees for General Shift preference
  const femaleEmployees = employees.filter(e => e.gender === 'Female');
  const maleEmployees = employees.filter(e => e.gender !== 'Female');

  // Track assigned employees for this roster to avoid double booking across standard shifts
  const assignedEmpIds = new Set();

  const helperGetExpert = (machineId, pool) => {
    return pool.find(emp => 
      !assignedEmpIds.has(emp._id.toString()) && 
      emp.machineExpertise.includes(machineId)
    );
  };

  const helperGetMultipleExperts = (machineId, pool, count) => {
    const experts = pool.filter(emp => 
      !assignedEmpIds.has(emp._id.toString()) && 
      emp.machineExpertise.includes(machineId)
    );
    return experts.slice(0, count);
  };

  // Build Shift 1 Allocation (07:00 AM - 03:00 PM)
  const shift1Allocations = [];
  machines.forEach(m => {
    const requiredCount = m.category === 'Metalizing' ? (m.minStaffRequired || 4) : 1;
    const assigned = helperGetMultipleExperts(m.machineId, maleEmployees, requiredCount);
    
    assigned.forEach(e => assignedEmpIds.add(e._id.toString()));

    shift1Allocations.push({
      machineId: m.machineId,
      machineName: m.name,
      category: m.category,
      assignedEmployees: assigned.map(e => ({
        employeeId: e._id,
        tokenNo: e.tokenNo,
        name: e.name,
      })),
    });
  });

  // Build Shift 2 Allocation (03:00 PM - 11:00 PM)
  const shift2Allocations = [];
  machines.forEach(m => {
    const requiredCount = m.category === 'Metalizing' ? (m.minStaffRequired || 4) : 1;
    const assigned = helperGetMultipleExperts(m.machineId, maleEmployees, requiredCount);
    
    assigned.forEach(e => assignedEmpIds.add(e._id.toString()));

    shift2Allocations.push({
      machineId: m.machineId,
      machineName: m.name,
      category: m.category,
      assignedEmployees: assigned.map(e => ({
        employeeId: e._id,
        tokenNo: e.tokenNo,
        name: e.name,
      })),
    });
  });

  // Build Shift 3 Allocation (11:00 PM - 07:00 AM) - MINIMAL STAFFING RULE
  // Minimal: Winding: 1, Testing: 1, Metalizing: 4 (minimum crew for 1 metalizing machine)
  const shift3Allocations = [];

  // Minimal Winding (e.g. 700/705)
  const windingMachine = machines.find(m => m.category === 'Winding') || machines[0];
  const windingStaff = helperGetMultipleExperts(windingMachine.machineId, maleEmployees, 1);
  windingStaff.forEach(e => assignedEmpIds.add(e._id.toString()));
  shift3Allocations.push({
    machineId: windingMachine.machineId,
    machineName: windingMachine.name,
    category: windingMachine.category,
    assignedEmployees: windingStaff.map(e => ({ employeeId: e._id, tokenNo: e.tokenNo, name: e.name })),
  });

  // Minimal Testing (e.g. 710)
  const testingMachine = machines.find(m => m.category === 'Testing') || machines[1];
  const testingStaff = helperGetMultipleExperts(testingMachine.machineId, maleEmployees, 1);
  testingStaff.forEach(e => assignedEmpIds.add(e._id.toString()));
  shift3Allocations.push({
    machineId: testingMachine.machineId,
    machineName: testingMachine.name,
    category: testingMachine.category,
    assignedEmployees: testingStaff.map(e => ({ employeeId: e._id, tokenNo: e.tokenNo, name: e.name })),
  });

  // Minimal Metalizing (e.g. 766 or 0470 - strictly 3-4 crew)
  const metalizingMachine = machines.find(m => m.category === 'Metalizing') || machines[2];
  const metalizingStaff = helperGetMultipleExperts(metalizingMachine.machineId, maleEmployees, 4);
  metalizingStaff.forEach(e => assignedEmpIds.add(e._id.toString()));
  shift3Allocations.push({
    machineId: metalizingMachine.machineId,
    machineName: metalizingMachine.name,
    category: metalizingMachine.category,
    assignedEmployees: metalizingStaff.map(e => ({ employeeId: e._id, tokenNo: e.tokenNo, name: e.name })),
  });

  // Build General Shift Allocation (08:30 AM - 04:30 PM)
  // Contains all female employees + unassigned male employees
  const generalShiftEmployees = [
    ...femaleEmployees,
    ...maleEmployees.filter(e => !assignedEmpIds.has(e._id.toString()))
  ];

  const generalShiftAllocations = [{
    machineId: 'GENERAL_MPP',
    machineName: 'General Section Assembly & Quality Check',
    category: 'General',
    assignedEmployees: generalShiftEmployees.map(e => ({
      employeeId: e._id,
      tokenNo: e.tokenNo,
      name: e.name,
    })),
  }];

  // Construct Shift Schedule document
  const shiftScheduleData = {
    noticeRefNo: 'PC12/XR/004',
    unit: 'MPP Section (Unit 1 & Unit 2)',
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
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  return new Date(d.setDate(diff));
}

module.exports = { generateWeeklyRoster };
