const express = require('express');
const router = express.Router();
const ShiftSchedule = require('../models/ShiftSchedule');
const { generateWeeklyRoster } = require('../utils/shiftScheduler');

// Get latest published roster
router.get('/latest', async (req, res) => {
  try {
    const roster = await ShiftSchedule.findOne({ status: 'Published' }).sort({ weekStartDate: -1 });
    if (!roster) {
      return res.status(404).json({ message: 'No published roster available. Generate one.' });
    }
    res.json(roster);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all published rosters sorted by weekStartDate descending (for Previous / Next week navigation)
router.get('/all', async (req, res) => {
  try {
    const rosters = await ShiftSchedule.find({ status: 'Published' }).sort({ weekStartDate: -1 });
    res.json(rosters);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Auto-generate roster (RESTRICTED: Accessible only to Supervisor and Site Admin)
router.post('/auto-generate', async (req, res) => {
  try {
    const { weekStartDate, requesterRole } = req.body;

    // Verify role if provided
    if (requesterRole && requesterRole !== 'Supervisor' && requesterRole !== 'SiteAdmin') {
      return res.status(403).json({ message: 'Permission Denied: Weekly shift generation can only be triggered by Supervisors or Site Admin.' });
    }

    const roster = await generateWeeklyRoster(weekStartDate);
    res.status(201).json({
      message: 'Weekly shift notice successfully generated! Notice Date set to Friday & Shift 1 <-> Shift 2 rotated.',
      roster
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all historical rosters
router.get('/history', async (req, res) => {
  try {
    const history = await ShiftSchedule.find({}).sort({ weekStartDate: -1 }).limit(10);
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
