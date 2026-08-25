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

  const billingStart = new Date(currentYear, currentMonth - 2, 26, 0, 0, 0); // 26th of prev month
  const billingEnd = new Date(currentYear, currentMonth - 1, 25, 23, 59, 59); // 25th of current month
  
  // Last day of current month for payout
  const payoutDate = new Date(currentYear, currentMonth, 0);

  // Fetch attendance records within billing cycle
  const attendances = await Attendance.find({
    employeeId: employee._id,
    date: { $gte: billingStart, $lte: billingEnd }
  });

  const basicMonthlySalary = employee.basicSalary;
  const standardWorkDays = 26;
  const standardHoursPerDay = 7.5;

  const dailyRate = basicMonthlySalary / standardWorkDays;
  const hourlyRate = dailyRate / standardHoursPerDay;

  let totalDaysPresent = 0;
  let totalOvertimeHours = 0;
  let sundayDaysWorked = 0;

  attendances.forEach(record => {
    if (record.status === 'Present') {
      totalDaysPresent += 1;

      // Use the overtimeHours field directly (already calculated correctly at punch-out)
      // totalHours = working hours (capped at 7.5), overtimeHours = extra beyond shift+grace
      totalOvertimeHours += (record.overtimeHours || 0);

      // Sunday Check
      if (record.isSunday || new Date(record.date).getDay() === 0) {
        sundayDaysWorked += 1;
      }
    }
  });

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
