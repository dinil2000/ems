const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const PayrollRecord = require('../models/PayrollRecord');

const calculatePayrollForEmployee = async (employeeId, year, month) => {
  const employee = await Employee.findById(employeeId);
  if (!employee) throw new Error('Employee not found');

  // Determine billing cycle: 26th prev month to 25th current month
  // Month is 1-indexed (e.g. 8 for August)
  const currentYear = parseInt(year);
  const currentMonth = parseInt(month); // e.g., 8

  // Standard billing cycle: 26th of prev month to 25th of current month (in IST UTC+5:30)
  const billingStart = new Date(Date.UTC(currentYear, currentMonth - 2, 25, 18, 30, 0, 0)); // 26th 00:00 IST
  const billingEnd = new Date(Date.UTC(currentYear, currentMonth - 1, 25, 18, 29, 59, 999)); // 25th 23:59 IST
  
  // Last day of current month for payout
  const payoutDate = new Date(currentYear, currentMonth, 0);

  // Fetch attendance records within billing cycle
  const attendances = await Attendance.find({
    employeeId: employee._id,
    date: { $gte: billingStart, $lte: billingEnd },
    status: { $in: ['Present', 'In Progress', 'Pending Late Approval'] }
  }).sort({ punchIn: 1 });

  const basicMonthlySalary = employee.basicSalary;
  const standardWorkDays = 26;
  const standardHoursPerDay = 7.5;

  const dailyRate = employee.dailyRate || (basicMonthlySalary / standardWorkDays);
  const hourlyRate = dailyRate / standardHoursPerDay;

  // ── Group by IST calendar date to ensure 1 calendar day cannot count multiple times ──
  const dayRecordsMap = new Map();

  for (const rec of attendances) {
    const recordDate = rec.punchIn || rec.date;
    if (!recordDate) continue;
    const istTime = new Date(new Date(recordDate).getTime() + (5.5 * 60 * 60 * 1000));
    const dateKey = istTime.toISOString().split('T')[0];

    if (!dayRecordsMap.has(dateKey)) {
      dayRecordsMap.set(dateKey, []);
    }
    dayRecordsMap.get(dateKey).push(rec);
  }

  let totalDaysPresent = 0;
  let totalOvertimeHours = 0;
  let sundayDaysWorked = 0;

  for (const [dateKey, dayRecs] of dayRecordsMap.entries()) {
    // Filter out negligible test punches (< 15 mins) if valid punches exist on same day
    const validRecs = dayRecs.filter(r => (r.totalHours || 0) >= 0.25 || (r.overtimeHours || 0) > 0);
    const activeRecs = validRecs.length > 0 ? validRecs : dayRecs;

    totalDaysPresent += 1;

    let dayOT = 0;
    for (const r of activeRecs) {
      dayOT += (r.overtimeHours || 0);
    }
    dayOT = Math.min(8.0, Math.round(dayOT * 100) / 100);
    totalOvertimeHours += dayOT;

    // Sunday Check based on calendar date in IST
    const [y, m, d] = dateKey.split('-').map(Number);
    const dayOfWeek = new Date(y, m - 1, d).getDay();
    if (dayOfWeek === 0) {
      sundayDaysWorked += 1;
    }
  }

  // Calculate Pay Components
  const regularHoursPay = totalDaysPresent * dailyRate;
  const overtimePay = totalOvertimeHours * (hourlyRate * 2.0); // DOUBLE hourly basic pay
  const sundayPay = sundayDaysWorked * (dailyRate * 2.0);      // DOUBLE normal rate

  const grossSalary = regularHoursPay + overtimePay + sundayPay;

  const monthString = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

  const payrollData = {
    employeeId: employee._id,
    tokenNo: employee.tokenNo,
    employeeName: employee.name,
    billingCycleMonth: monthString,
    billingCycleStart: billingStart,
    billingCycleEnd: billingEnd,
    payoutDate,
    basicMonthlySalary,
    hourlyRate: Math.round(hourlyRate * 100) / 100,
    dailyRate: Math.round(dailyRate * 100) / 100,
    totalDaysPresent,
    regularHoursPay: Math.round(regularHoursPay),
    totalOvertimeHours: Math.round(totalOvertimeHours * 10) / 10,
    overtimePay: Math.round(overtimePay),
    sundayDaysWorked,
    sundayPay: Math.round(sundayPay),
    grossSalary: Math.round(grossSalary),
    status: 'Approved'
  };

  // Upsert payroll record
  const record = await PayrollRecord.findOneAndUpdate(
    { employeeId: employee._id, billingCycleMonth: monthString },
    payrollData,
    { new: true, upsert: true }
  );

  return record;
};

const runBatchPayroll = async (year, month) => {
  const employees = await Employee.find({ status: 'Active' });
  const results = [];
  for (const emp of employees) {
    const record = await calculatePayrollForEmployee(emp._id, year, month);
    results.push(record);
  }
  return results;
};

module.exports = { calculatePayrollForEmployee, runBatchPayroll };
