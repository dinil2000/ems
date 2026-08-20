const express = require('express');
const router = express.Router();
const PayrollRecord = require('../models/PayrollRecord');
const { calculatePayrollForEmployee, runBatchPayroll } = require('../utils/payrollEngine');

// Calculate / Refresh payroll batch for a month (25th prev month to 25th current month)
router.post('/calculate', async (req, res) => {
  try {
    const now = new Date();
    const year = req.body.year || now.getFullYear();
    const month = req.body.month || (now.getMonth() + 1);

    const records = await runBatchPayroll(year, month);
    res.json({
      message: `Payroll calculated successfully for ${records.length} employees (Billing Cycle: 25th to 25th).`,
      count: records.length,
      records
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all payroll records for current/specified month
router.get('/month', async (req, res) => {
  try {
    const now = new Date();
    const year = req.query.year || now.getFullYear();
    const month = req.query.month || (now.getMonth() + 1);
    const monthString = `${year}-${String(month).padStart(2, '0')}`;

    let records = await PayrollRecord.find({ billingCycleMonth: monthString }).populate('employeeId');

    // Auto calculate if empty
    if (!records.length) {
      records = await runBatchPayroll(year, month);
    }

    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get payroll record for single employee
router.get('/employee/:tokenNo', async (req, res) => {
  try {
    const records = await PayrollRecord.find({ tokenNo: req.params.tokenNo }).sort({ billingCycleMonth: -1 });
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
