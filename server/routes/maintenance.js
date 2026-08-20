const express = require('express');
const router = express.Router();
const MaintenanceAlert = require('../models/MaintenanceAlert');
const Machine = require('../models/Machine');
const { checkMaintenanceAlerts } = require('../utils/cronAlerts');

// Get maintenance alerts
router.get('/', async (req, res) => {
  try {
    await checkMaintenanceAlerts();
    const alerts = await MaintenanceAlert.find({ status: { $ne: 'Completed' } }).sort({ nextDueDate: 1 });
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Worker requests machine cleaning completion
router.post('/request-completion/:id', async (req, res) => {
  try {
    const { tokenNo, name, notes } = req.body;
    const alert = await MaintenanceAlert.findById(req.params.id);
    if (!alert) return res.status(404).json({ message: 'Maintenance alert not found' });

    alert.status = 'Pending Approval';
    alert.requestedBy = { tokenNo: tokenNo || 'Worker', name: name || 'Operator' };
    alert.requestedAt = new Date();
    if (notes) alert.notes = (alert.notes || '') + ` [Worker Note: ${notes}]`;
    await alert.save();

    res.json({
      message: `Machine #${alert.machineId} cleaning request submitted to Supervisor for approval!`,
      alert
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Supervisor approves worker machine cleaning completion request
router.post('/approve/:id', async (req, res) => {
  try {
    const { supervisorToken, supervisorName } = req.body;
    const alert = await MaintenanceAlert.findById(req.params.id);
    if (!alert) return res.status(404).json({ message: 'Maintenance alert not found' });

    const now = new Date();
    alert.status = 'Completed';
    alert.approvedBy = { tokenNo: supervisorToken || 'Supervisor', name: supervisorName || 'Supervisor' };
    alert.approvedAt = now;
    alert.notes = (alert.notes || '') + ` [Approved & Verified by Supervisor on ${now.toLocaleDateString()}]`;
    await alert.save();

    // Update corresponding machine cleaning date
    const machine = await Machine.findOne({ machineId: alert.machineId });
    if (machine) {
      if (alert.alertType.includes('Central Cleaning')) {
        machine.lastCentralCleaned = now;
      } else {
        machine.lastGeneralCleaned = now;
      }
      await machine.save();
    }

    res.json({
      message: `Supervisor approved & verified cleaning for Machine #${alert.machineId}!`,
      alert
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Supervisor rejects worker machine cleaning request
router.post('/reject/:id', async (req, res) => {
  try {
    const alert = await MaintenanceAlert.findById(req.params.id);
    if (!alert) return res.status(404).json({ message: 'Maintenance alert not found' });

    alert.status = 'Pending';
    alert.notes = (alert.notes || '') + ` [Cleaning Request Rejected by Supervisor - Re-cleaning required]`;
    await alert.save();

    res.json({ message: `Machine #${alert.machineId} cleaning request rejected by Supervisor.`, alert });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Direct supervisor completion bypass
router.post('/complete/:id', async (req, res) => {
  try {
    const { supervisorToken, supervisorName } = req.body;
    const alert = await MaintenanceAlert.findById(req.params.id);
    if (!alert) return res.status(404).json({ message: 'Alert not found' });

    const now = new Date();
    alert.status = 'Completed';
    alert.approvedBy = { tokenNo: supervisorToken || 'Supervisor', name: supervisorName || 'Supervisor' };
    alert.approvedAt = now;
    await alert.save();

    const machine = await Machine.findOne({ machineId: alert.machineId });
    if (machine) {
      if (alert.alertType.includes('Central Cleaning')) {
        machine.lastCentralCleaned = now;
      } else {
        machine.lastGeneralCleaned = now;
      }
      await machine.save();
    }

    res.json({ message: `Maintenance task for machine #${alert.machineId} completed & verified!`, alert });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
