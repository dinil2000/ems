const express = require('express');
const router = express.Router();
const Machine = require('../models/Machine');

// Get all machines
router.get('/', async (req, res) => {
  try {
    const machines = await Machine.find({}).sort({ category: 1, machineId: 1 });
    res.json(machines);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update machine status or cleaning date
router.put('/:machineId', async (req, res) => {
  try {
    const updated = await Machine.findOneAndUpdate(
      { machineId: req.params.machineId },
      req.body,
      { new: true }
    );
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
