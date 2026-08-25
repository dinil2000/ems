const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const PayrollRecord = require('../models/PayrollRecord');
const PayrollDeduction = require('../models/PayrollDeduction');
const { runBatchPayroll } = require('../utils/payrollEngine');

// Calculate / Refresh payroll batch for a month
router.post('/calculate', async (req, res) => {
  try {
    const now = new Date();
    const year = req.body.year || now.getFullYear();
    const month = req.body.month || (now.getMonth() + 1);

    const records = await runBatchPayroll(year, month);
    res.json({
      message: `Payroll calculated successfully for ${records.length} employees.`,
      count: records.length,
      records
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all payroll records for specified month
router.get('/month', async (req, res) => {
  try {
    const now = new Date();
    const year = req.query.year || now.getFullYear();
    const month = req.query.month || (now.getMonth() + 1);
    const monthString = `${year}-${String(month).padStart(2, '0')}`;

    let records = await PayrollRecord.find({ billingCycleMonth: monthString }).populate('employeeId');
    if (!records.length) {
      records = await runBatchPayroll(year, month);
    }
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Fetch or Save Employee Monthly Deductions & Shift Rates
router.get('/deductions/:tokenNo', async (req, res) => {
  try {
    const now = new Date();
    const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const month = req.query.month || defaultMonth;
    let deduction = await PayrollDeduction.findOne({ tokenNo: req.params.tokenNo, yearMonth: month });
    if (!deduction) {
      deduction = await PayrollDeduction.create({
        tokenNo: req.params.tokenNo,
        yearMonth: month,
        canteenDeduction: 262.50,
        festivalAdvance: 1500.00,
        providentFund: 1800.00,
        professionalTax: 250.00,
        medicalInsurance: 532.00,
        shift1Rate: 30.00,
        shift2Rate: 50.00,
        shift3Rate: 78.00,
      });
    }
    res.json(deduction);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/deductions', async (req, res) => {
  try {
    const nowDate = new Date();
    const defaultYM = `${nowDate.getFullYear()}-${String(nowDate.getMonth() + 1).padStart(2, '0')}`;
    const {
      tokenNo,
      yearMonth = defaultYM,
      canteenDeduction,
      festivalAdvance,
      providentFund,
      professionalTax,
      medicalInsurance,
      cooperativeDeduction,
      otherDeduction1,
      otherDeduction2,
      specialPay,
      conveyanceAllowance,
      shift1Rate,
      shift2Rate,
      shift3Rate,
    } = req.body;

    let deduction = await PayrollDeduction.findOne({ tokenNo, yearMonth });
    if (!deduction) {
      deduction = new PayrollDeduction({ tokenNo, yearMonth });
    }

    if (canteenDeduction !== undefined) deduction.canteenDeduction = Number(canteenDeduction);
    if (festivalAdvance !== undefined) deduction.festivalAdvance = Number(festivalAdvance);
    if (providentFund !== undefined) deduction.providentFund = Number(providentFund);
    if (professionalTax !== undefined) deduction.professionalTax = Number(professionalTax);
    if (medicalInsurance !== undefined) deduction.medicalInsurance = Number(medicalInsurance);
    if (cooperativeDeduction !== undefined) deduction.cooperativeDeduction = Number(cooperativeDeduction);
    if (otherDeduction1 !== undefined) deduction.otherDeduction1 = Number(otherDeduction1);
    if (otherDeduction2 !== undefined) deduction.otherDeduction2 = Number(otherDeduction2);
    if (specialPay !== undefined) deduction.specialPay = Number(specialPay);
    if (conveyanceAllowance !== undefined) deduction.conveyanceAllowance = Number(conveyanceAllowance);
    if (shift1Rate !== undefined) deduction.shift1Rate = Number(shift1Rate);
    if (shift2Rate !== undefined) deduction.shift2Rate = Number(shift2Rate);
    if (shift3Rate !== undefined) deduction.shift3Rate = Number(shift3Rate);

    await deduction.save();
    res.json({ message: 'Monthly deductions & earnings updated successfully.', deduction });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Official Authentic Keltron Salary Slip Generation Endpoint (Matches Ticket Format)
router.get('/slip/:tokenNo', async (req, res) => {
  try {
    const tokenNo = req.params.tokenNo;
    // Default to current month if not specified
    const now = new Date();
    const yearMonth = req.query.month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const emp = await Employee.findOne({ tokenNo });
    if (!emp) {
      return res.status(404).json({ message: `Employee Token #${tokenNo} not found.` });
    }

    let deduction = await PayrollDeduction.findOne({ tokenNo, yearMonth });
    if (!deduction) {
      deduction = await PayrollDeduction.create({
        tokenNo,
        yearMonth,
        canteenDeduction: 0,
        festivalAdvance: 0,
        providentFund: 0,
        professionalTax: 0,
        medicalInsurance: 0,
        shift1Rate: 30.00,
        shift2Rate: 50.00,
        shift3Rate: 78.00,
      });
    }

    // ── Compute actual shift days from Attendance records ──
    const [reqYear, reqMonth] = yearMonth.split('-').map(Number);
    const monthStart = new Date(reqYear, reqMonth - 1, 1);
    const monthEnd = new Date(reqYear, reqMonth, 0, 23, 59, 59, 999);

    const attendanceRecords = await Attendance.find({
      tokenNo,
      date: { $gte: monthStart, $lte: monthEnd },
      status: { $in: ['Present', 'In Progress', 'Pending Late Approval'] }
    });

    let shift1Days = 0;
    let shift2Days = 0;
    let shift3Days = 0;
    let generalDays = 0;
    let totalOTHours = 0;

    for (const rec of attendanceRecords) {
      const st = rec.shiftStartTime || '';
      totalOTHours += rec.overtimeHours || 0;

      if (st === '07:00') {
        shift1Days += 1;
      } else if (st === '15:00') {
        shift2Days += 1;
      } else if (st === '23:00') {
        shift3Days += 1;
      } else {
        generalDays += 1;
      }
    }

    // ── Compute payslip values using latest employee dailyRate from DB ──
    const dailyRate = emp.dailyRate || 825.94;
    const totalDaysWorked = shift1Days + shift2Days + shift3Days + generalDays;
    const basicEarned = Math.round(totalDaysWorked * dailyRate * 100) / 100;

    const shift1Allowance = shift1Days * (deduction.shift1Rate || 30.00);
    const shift2Allowance = shift2Days * (deduction.shift2Rate || 50.00);
    const shift3Allowance = shift3Days * (deduction.shift3Rate || 78.00);
    const totalShiftAllowance = Math.round((shift1Allowance + shift2Allowance + shift3Allowance) * 100) / 100;

    const coinE = totalDaysWorked > 0 ? 3.50 : 0;
    const overtimeEarned = Math.round(totalOTHours * (dailyRate / 7.5) * 2 * 100) / 100;
    const grossPay = Math.round((basicEarned + totalShiftAllowance + coinE + overtimeEarned + (deduction.specialPay || 0) + (deduction.conveyanceAllowance || 0)) * 100) / 100;

    const totalDeductions = Math.round((
      (deduction.canteenDeduction || 0) +
      (deduction.festivalAdvance || 0) +
      (deduction.providentFund || 0) +
      (deduction.professionalTax || 0) +
      (deduction.medicalInsurance || 0) +
      (deduction.cooperativeDeduction || 0) +
      (deduction.otherDeduction1 || 0) +
      (deduction.otherDeduction2 || 0)
    ) * 100) / 100;

    const netPay = Math.round((grossPay - totalDeductions) * 100) / 100;

    // ── Format month label ──
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const monthLabel = `Payment for the Month ${monthNames[reqMonth - 1]} ${reqYear}`;

    res.json({
      companyName: 'KELTRON COMPONENT COMPLEX LTD.',
      location: 'Keltron Nagar, Kalliassery, Kannur',
      section: 'PRODUCTION CENTRE - I',
      month: monthLabel,
      tokenNo: emp.tokenNo,
      employeeName: emp.name,
      dailyRate: dailyRate.toFixed(2),
      daysGeneral: generalDays.toFixed(2),
      shift1Days: shift1Days.toFixed(2),
      shift2Days: shift2Days.toFixed(2),
      shift3Days: shift3Days.toFixed(2),
      otHours: totalOTHours.toFixed(2),
      basicEarned: basicEarned.toFixed(2),
      overtimeEarned: overtimeEarned.toFixed(2),
      specialPay: (deduction.specialPay || 0).toFixed(2),
      conveyance: (deduction.conveyanceAllowance || 0).toFixed(2),
      shiftAllowance: totalShiftAllowance.toFixed(2),
      coinE: coinE.toFixed(2),
      canteenDeduction: (deduction.canteenDeduction || 0).toFixed(2),
      festivalAdvance: (deduction.festivalAdvance || 0).toFixed(2),
      providentFund: (deduction.providentFund || 0).toFixed(2),
      esi: '0.00',
      professionalTax: (deduction.professionalTax || 0).toFixed(2),
      medicalInsurance: (deduction.medicalInsurance || 0).toFixed(2),
      cooperativeDeduction: (deduction.cooperativeDeduction || 0).toFixed(2),
      otherDeduction1: (deduction.otherDeduction1 || 0).toFixed(2),
      otherDeduction2: (deduction.otherDeduction2 || 0).toFixed(2),
      grossPay: grossPay.toFixed(2),
      totalDeductions: totalDeductions.toFixed(2),
      netPay: netPay.toFixed(2),
      deductionsRaw: deduction,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
