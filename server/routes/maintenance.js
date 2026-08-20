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

// Mark maintenance alert as completed
router.post('/complete/:id', async (req, res) => {
  try {
    const alert = await MaintenanceAlert.findById(req.params.id);
    if (!alert) return res.status(404).json({ message: 'Alert not found' });

    const now = new Date();
    alert.status = 'Completed';
    alert.notes = (alert.notes || '') + ` [Completed by Supervisor on ${now.toLocaleDateString()}]`;
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

    res.json({ message: `Maintenance task for machine #${alert.machineId} marked as completed!`, alert });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Manual trigger check
router.post('/check', async (req, res) => {
  try {
    await checkMaintenanceAlerts();
    res.json({ message: 'Maintenance alerts check triggered successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
