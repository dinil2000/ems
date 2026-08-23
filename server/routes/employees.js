const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const User = require('../models/User');

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

// Full Admin Employee Details Edit Endpoint (Updates profile & machine expertise)
router.put('/:id', async (req, res) => {
  try {
    const {
      name,
      employmentType,
      qualification,
      experienceYears,
      basicSalary,
      machineExpertise,
      gender,
      unit,
      status
    } = req.body;

    const updateFields = {};
    if (name !== undefined) updateFields.name = name;
    if (employmentType !== undefined) updateFields.employmentType = employmentType;
    if (qualification !== undefined) updateFields.qualification = qualification;
    if (experienceYears !== undefined) updateFields.experienceYears = parseInt(experienceYears) || 0;
    if (basicSalary !== undefined) updateFields.basicSalary = parseFloat(basicSalary) || 0;
    if (machineExpertise !== undefined) {
      updateFields.machineExpertise = Array.isArray(machineExpertise) ? machineExpertise : [machineExpertise];
    }
    if (gender !== undefined) updateFields.gender = gender;
    if (unit !== undefined) updateFields.unit = unit;
    if (status !== undefined) updateFields.status = status;

    const updatedEmp = await Employee.findByIdAndUpdate(req.params.id, updateFields, { new: true });
    if (!updatedEmp) {
      return res.status(404).json({ message: 'Employee not found.' });
    }

    res.json({
      message: `Employee ${updatedEmp.name} (Token #${updatedEmp.tokenNo}) details updated successfully!`,
      employee: updatedEmp
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
