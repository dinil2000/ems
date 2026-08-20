const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');

// Get all active employees
router.get('/', async (req, res) => {
  try {
    const { machine, gender, type, status } = req.query;
    const filter = {};
    if (status) {
      filter.status = status;
    } else {
      filter.status = { $in: ['Active', 'Pending Approval'] };
    }

    if (machine) filter.machineExpertise = machine;
    if (gender) filter.gender = gender;
    if (type) filter.employmentType = type;

    const employees = await Employee.find(filter).sort({ createdAt: -1 });
    res.json(employees);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get pending approval employees list
router.get('/pending', async (req, res) => {
  try {
    const pendingList = await Employee.find({ status: 'Pending Approval' }).sort({ createdAt: -1 });
    res.json(pendingList);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Approve employee account (Supervisor / SiteAdmin action)
router.post('/approve/:id', async (req, res) => {
  try {
    const { approvedBy } = req.body;
    const emp = await Employee.findByIdAndUpdate(
      req.params.id,
      {
        status: 'Active',
        approvedBy: approvedBy || 'Supervisor',
        approvedAt: new Date()
      },
      { new: true }
    );
    if (!emp) return res.status(404).json({ message: 'Employee profile not found.' });

    res.json({ message: `Employee ${emp.name} (Token #${emp.tokenNo}) account approved & activated!`, employee: emp });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Reject / Deactivate employee account
router.post('/reject/:id', async (req, res) => {
  try {
    const emp = await Employee.findByIdAndUpdate(
      req.params.id,
      { status: 'Inactive' },
      { new: true }
    );
    res.json({ message: `Employee account deactivated.`, employee: emp });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single employee by ID or Token
router.get('/:tokenOrId', async (req, res) => {
  try {
    const emp = await Employee.findOne({
      $or: [{ _id: req.params.tokenOrId }, { tokenNo: req.params.tokenOrId }]
    });
    if (!emp) return res.status(404).json({ message: 'Employee not found' });
    res.json(emp);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update employee details
router.put('/:id', async (req, res) => {
  try {
    const updated = await Employee.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
