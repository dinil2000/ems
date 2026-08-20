const express = require('express');
const router = express.Router();
const ShiftSchedule = require('../models/ShiftSchedule');
const { generateWeeklyRoster } = require('../utils/shiftScheduler');

// Get latest published roster
router.get('/latest', async (req, res) => {
  try {
    const roster = await ShiftSchedule.findOne({ status: 'Published' }).sort({ createdAt: -1 });
    if (!roster) {
      return res.status(404).json({ message: 'No published roster available. Generate one.' });
    }
    res.json(roster);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Auto-generate roster
router.post('/auto-generate', async (req, res) => {
  try {
    const { weekStartDate } = req.body;
    const roster = await generateWeeklyRoster(weekStartDate);
    res.status(201).json(roster);
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
