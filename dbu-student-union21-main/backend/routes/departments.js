const express = require('express');
const router = express.Router();
const Department = require('../models/Department');
const Staff = require('../models/Staff');
const { protect, adminOnly } = require('../middleware/auth');

// @route  GET /api/departments
// @desc   List all departments (public)
router.get('/', async (req, res) => {
  try {
    let depts = await Department.find().sort({ name: 1 });
    
    // Self-healing check: if no departments exist in DB, automatically seed them
    // from the unique department values found in existing Staff records!
    if (depts.length === 0) {
      const uniqueDepts = await Staff.distinct('department');
      if (uniqueDepts.length > 0) {
        const docs = uniqueDepts.filter(Boolean).map(name => ({ name }));
        await Department.insertMany(docs, { ordered: false }).catch(() => {});
        depts = await Department.find().sort({ name: 1 });
      }
    }
    
    res.json({ success: true, departments: depts });
  } catch (err) {
    console.error('Error fetching departments:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route  GET /api/departments/:id
// @desc   Get a specific department by ID
router.get('/:id', async (req, res) => {
  try {
    const dept = await Department.findById(req.params.id);
    if (!dept) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }
    res.json({ success: true, department: dept });
  } catch (err) {
    console.error('Error fetching department details:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route  POST /api/departments
// @desc   Create a new department (admin only)
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Department name is required' });
    }
    
    // Check if duplicate
    const existing = await Department.findOne({ name: name.trim() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Department already exists' });
    }
    
    const newDept = await Department.create({ name: name.trim() });
    res.status(201).json({ success: true, department: newDept });
  } catch (err) {
    console.error('Error creating department:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route  DELETE /api/departments/:id
// @desc   Delete a department (admin only)
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const dept = await Department.findById(req.params.id);
    if (!dept) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }
    
    await dept.deleteOne();
    res.json({ success: true, message: 'Department deleted successfully' });
  } catch (err) {
    console.error('Error deleting department:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
