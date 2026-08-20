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

  // Fetch past 6 weeks of published shift rosters to calculate rotation & 3rd shift frequency
  const pastRosters = await ShiftSchedule.find({ status: 'Published' }).sort({ weekStartDate: -1 }).limit(6);

  // Map employee ID -> { recentShift3Count, lastShiftType, shiftAssignmentCount }
  const empHistory = {};
  employees.forEach(e => {
    empHistory[e._id.toString()] = {
      tokenNo: e.tokenNo,
      shift3CountMonth: 0,
      lastShiftType: null,
      totalAssignedCount: 0
    };
  });

  // Calculate past shift counts (especially 3rd Shift in last 30 days)
  const thirtyDaysAgo = new Date(weekStart.getTime() - 30 * 24 * 60 * 60 * 1000);
  pastRosters.forEach(roster => {
    const isWithinMonth = new Date(roster.weekStartDate) >= thirtyDaysAgo;

    roster.shifts.forEach(slot => {
      slot.allocations.forEach(alloc => {
        if (alloc.assignedEmployees) {
          alloc.assignedEmployees.forEach(emp => {
            const empIdStr = emp.employeeId ? emp.employeeId.toString() : null;
            if (empIdStr && empHistory[empIdStr]) {
              empHistory[empIdStr].totalAssignedCount += 1;

              if (slot.shiftType.includes('Shift-3') && isWithinMonth) {
                empHistory[empIdStr].shift3CountMonth += 1;
              }

              if (!empHistory[empIdStr].lastShiftType) {
                empHistory[empIdStr].lastShiftType = slot.shiftType;
              }
            }
          });
        }
      });
    });
  });

  // Separate Female employees for General Shift priority rule
  const femaleEmployees = employees.filter(e => e.gender === 'Female');
  const maleEmployees = employees.filter(e => e.gender !== 'Female');

  // Track assigned employees for current week's roster
  const assignedEmpIds = new Set();

  // Helper to select experts matching machine ID or Category with rotational fairness
  const helperGetMultipleExperts = (targetMachine, pool, count, disallowShift3Repeat = false) => {
    const machineId = targetMachine.machineId;
    const category = targetMachine.category;

    // Filter candidate employees
    let candidates = pool.filter(emp => {
      const empId = emp._id.toString();
      if (assignedEmpIds.has(empId)) return false;

      // Match by exact machineId OR category expertise
      const knowMachine = emp.machineExpertise.includes(machineId) || 
                          emp.machineExpertise.some(mId => {
                            const mObj = machines.find(m => m.machineId === mId);
                            return mObj && mObj.category === category;
                          });
      if (!knowMachine) return false;

      // Max 1 Night Shift (Shift 3) in a month rule
      if (disallowShift3Repeat && empHistory[empId].shift3CountMonth >= 1) {
        return false;
      }
      return true;
    });

    // Sort candidates for fair rotation (lowest recent 3rd shift count & lowest total assignments)
    candidates.sort((a, b) => {
      const hA = empHistory[a._id.toString()];
      const hB = empHistory[b._id.toString()];
      if (hA.shift3CountMonth !== hB.shift3CountMonth) {
        return hA.shift3CountMonth - hB.shift3CountMonth;
      }
      return hA.totalAssignedCount - hB.totalAssignedCount;
    });

    // Fallback if strict 3rd shift limit leaves insufficient crew
    if (candidates.length < count && disallowShift3Repeat) {
      const fallback = pool.filter(emp => {
        const empId = emp._id.toString();
        if (assignedEmpIds.has(empId)) return false;
        return emp.machineExpertise.includes(machineId) || 
               emp.machineExpertise.some(mId => {
                 const mObj = machines.find(m => m.machineId === mId);
                 return mObj && mObj.category === category;
               });
      });
      return fallback.slice(0, count);
    }

    return candidates.slice(0, count);
  };

  // 1. Build Shift-3 Allocation (11:00 PM - 07:00 AM) - MINIMAL STAFFING RULE WITH 3RD SHIFT MONTHLY LIMIT
  // Staffing Rule: Winding: 1, Testing: 2, Metalizing: 4 (minimum crew for 1 metalizing machine)
  const shift3Allocations = [];

  // Minimal Winding: Exactly 1 Employee
  const windingMachine = machines.find(m => m.category === 'Winding') || machines[0];
  const windingStaff = helperGetMultipleExperts(windingMachine, maleEmployees, 1, true);
  windingStaff.forEach(e => assignedEmpIds.add(e._id.toString()));
  shift3Allocations.push({
    machineId: windingMachine.machineId,
    machineName: windingMachine.name,
    category: windingMachine.category,
    assignedEmployees: windingStaff.map(e => ({ employeeId: e._id, tokenNo: e.tokenNo, name: e.name })),
  });

  // Minimal Testing: Exactly 2 Employees (Testing crew requirement = 2)
  const testingMachine = machines.find(m => m.category === 'Testing') || machines[1];
  const testingStaff = helperGetMultipleExperts(testingMachine, maleEmployees, 2, true);
  testingStaff.forEach(e => assignedEmpIds.add(e._id.toString()));
  shift3Allocations.push({
    machineId: testingMachine.machineId,
    machineName: testingMachine.name,
    category: testingMachine.category,
    assignedEmployees: testingStaff.map(e => ({ employeeId: e._id, tokenNo: e.tokenNo, name: e.name })),
  });

  // Minimal Metalizing: Exactly 4 Employees (Minimum required metalizing crew)
  const metalizingMachine = machines.find(m => m.category === 'Metalizing') || machines[2];
  const metalizingStaff = helperGetMultipleExperts(metalizingMachine, maleEmployees, 4, true);
  metalizingStaff.forEach(e => assignedEmpIds.add(e._id.toString()));
  shift3Allocations.push({
    machineId: metalizingMachine.machineId,
    machineName: metalizingMachine.name,
    category: metalizingMachine.category,
    assignedEmployees: metalizingStaff.map(e => ({ employeeId: e._id, tokenNo: e.tokenNo, name: e.name })),
  });

  // 2. Build Shift-1 Allocation (07:00 AM - 03:00 PM)
  const shift1Allocations = [];
  machines.forEach(m => {
    const requiredCount = m.category === 'Metalizing' ? (m.minStaffRequired || 4) : 1;
    const assigned = helperGetMultipleExperts(m, maleEmployees, requiredCount);
    
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

  // 3. Build Shift-2 Allocation (03:00 PM - 11:00 PM)
  const shift2Allocations = [];
  machines.forEach(m => {
    const requiredCount = m.category === 'Metalizing' ? (m.minStaffRequired || 4) : 1;
    const assigned = helperGetMultipleExperts(m, maleEmployees, requiredCount);
    
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

  // 4. Build General Shift Allocation (08:30 AM - 04:30 PM)
  // Female employees + remaining unassigned male employees
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
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

module.exports = { generateWeeklyRoster };
