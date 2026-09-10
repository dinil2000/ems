const express = require('express');
const router = express.Router();
const MachineLog = require('../models/MachineLog');
const Machine = require('../models/Machine');
const Employee = require('../models/Employee');

// GET all machine logs (filterable by machineId, status, operatorToken, month, date)
router.get('/', async (req, res) => {
  try {
    const { machineId, status, operatorToken, month, date, limit } = req.query;
    const filter = {};

    if (machineId) filter.machineId = machineId;
    if (status) filter.status = status;
    if (operatorToken) filter.operatorToken = String(operatorToken).trim();

    if (date) {
      const d = new Date(date);
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
      const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
      filter.date = { $gte: start, $lte: end };
    } else if (month) {
      const [year, m] = month.split('-').map(Number);
      const start = new Date(year, m - 1, 1, 0, 0, 0);
      const end = new Date(year, m, 0, 23, 59, 59);
      filter.date = { $gte: start, $lte: end };
    }

    const maxLimit = Math.min(300, Math.max(1, parseInt(limit) || 100));

    const logs = await MachineLog.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .limit(maxLimit)
      .lean();

    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET pending verification requests for Supervisor / SiteAdmin
router.get('/pending', async (req, res) => {
  try {
    const pendingLogs = await MachineLog.find({ status: 'Pending Approval' })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      count: pendingLogs.length,
      logs: pendingLogs,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET specific employee's submitted logs (shows supervisor feedback notes clearly)
router.get('/my-logs/:tokenNo', async (req, res) => {
  try {
    const operatorToken = String(req.params.tokenNo).trim();
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));

    const logs = await MachineLog.find({ operatorToken })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET summary per machine (total entries & pending verification count)
router.get('/summary', async (req, res) => {
  try {
    const summary = await MachineLog.aggregate([
      {
        $group: {
          _id: '$machineId',
          totalEntries: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          pendingCount: {
            $sum: { $cond: [{ $eq: ['$status', 'Pending Approval'] }, 1, 0] }
          },
          lastEntryDate: { $max: '$date' }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    res.json(summary);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST create a new machine log entry (Submitted by Employee / Operator)
router.post('/', async (req, res) => {
  try {
    const {
      machineId,
      machineName,
      unit,
      operatorToken,
      operatorName,
      date,
      shift,
      partNo,
      rating,
      workOrderNo,
      routeCardNo,
      quantity,
      remarks,
    } = req.body;

    if (!machineId || !operatorToken || !shift || !partNo || !rating || !workOrderNo || !routeCardNo || quantity === undefined) {
      return res.status(400).json({
        message: 'Missing required logbook fields: machineId, operatorToken, shift, partNo, rating, workOrderNo, routeCardNo, and quantity are required.'
      });
    }

    // Lookup Operator name if not provided
    let finalOperatorName = operatorName;
    if (!finalOperatorName) {
      const emp = await Employee.findOne({ tokenNo: operatorToken }).lean();
      finalOperatorName = emp ? emp.name : `Token #${operatorToken}`;
    }

    // Lookup Machine name if not provided
    let finalMachineName = machineName;
    let finalUnit = unit || 'Unit 2';
    if (!finalMachineName) {
      const mach = await Machine.findOne({ machineId }).lean();
      if (mach) {
        finalMachineName = mach.name;
        finalUnit = mach.unit || finalUnit;
      } else {
        finalMachineName = `Machine #${machineId}`;
      }
    }

    const newLog = new MachineLog({
      machineId: String(machineId).trim(),
      machineName: finalMachineName,
      unit: finalUnit,
      operatorToken: String(operatorToken).trim(),
      operatorName: finalOperatorName,
      date: date ? new Date(date) : new Date(),
      shift,
      partNo: String(partNo).trim(),
      rating: String(rating).trim(),
      workOrderNo: String(workOrderNo).trim(),
      routeCardNo: String(routeCardNo).trim(),
      quantity: Number(quantity) || 0,
      remarks: remarks ? String(remarks).trim() : '',
      status: 'Pending Approval',
    });

    await newLog.save();

    res.status(201).json({
      message: `✅ Log entry added for Machine #${machineId} (${shift})! Awaiting Supervisor verification.`,
      log: newLog,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT supervisor verify log entry (Approve / Reject with feedback note)
router.put('/:id/verify', async (req, res) => {
  try {
    const { action, supervisorNotes, supervisorToken, supervisorName } = req.body;

    // Action must be 'Approved', 'Rejected', or 'Needs Correction'
    const allowedActions = ['Approved', 'Rejected', 'Needs Correction'];
    const finalAction = allowedActions.includes(action) ? action : 'Approved';

    const log = await MachineLog.findById(req.params.id);
    if (!log) {
      return res.status(404).json({ message: 'Machine log entry not found.' });
    }

    log.status = finalAction;
    log.supervisorNotes = supervisorNotes ? String(supervisorNotes).trim() : '';
    log.verifiedBy = {
      tokenNo: supervisorToken || 'Supervisor',
      name: supervisorName || 'Supervisor',
      verifiedAt: new Date(),
    };

    await log.save();

    const statusIcon = finalAction === 'Approved' ? '✅' : '⚠️';
    const noteNotice = log.supervisorNotes ? ` Note passed: "${log.supervisorNotes}"` : '';

    res.json({
      message: `${statusIcon} Log entry for Machine #${log.machineId} marked ${finalAction}!${noteNotice}`,
      log,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT employee edit / resubmit rejected or pending log entry
router.put('/:id', async (req, res) => {
  try {
    const {
      shift,
      partNo,
      rating,
      workOrderNo,
      routeCardNo,
      quantity,
      remarks,
      date,
    } = req.body;

    const log = await MachineLog.findById(req.params.id);
    if (!log) {
      return res.status(404).json({ message: 'Machine log entry not found.' });
    }

    if (shift) log.shift = shift;
    if (partNo) log.partNo = String(partNo).trim();
    if (rating) log.rating = String(rating).trim();
    if (workOrderNo) log.workOrderNo = String(workOrderNo).trim();
    if (routeCardNo) log.routeCardNo = String(routeCardNo).trim();
    if (quantity !== undefined) log.quantity = Number(quantity);
    if (remarks !== undefined) log.remarks = String(remarks).trim();
    if (date) log.date = new Date(date);

    // Resubmitting resets status back to 'Pending Approval'
    log.status = 'Pending Approval';

    await log.save();

    res.json({
      message: `✅ Log entry updated and resubmitted for Supervisor verification!`,
      log,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE log entry (Supervisor / SiteAdmin or creator)
router.delete('/:id', async (req, res) => {
  try {
    const log = await MachineLog.findByIdAndDelete(req.params.id);
    if (!log) {
      return res.status(404).json({ message: 'Machine log entry not found.' });
    }
    res.json({ message: 'Log entry deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
