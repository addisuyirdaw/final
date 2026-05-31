const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Staff = require('../models/Staff');
const { protect, systemAdminOnly } = require('../middleware/auth');
const User = require('../models/User');

// Multer Storage Config
const uploadsDir = path.join(__dirname, '../uploads/leadership');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `leadership-${unique}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime = allowed.test(file.mimetype);
  if (ext && mime) return cb(null, true);
  cb(new Error('Only image files (jpg, png, gif, webp) are allowed'));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// @route  GET /api/staff
// @desc   Fetch staff profiles (public), optionally filtered by pageGroup query
router.get('/', async (req, res) => {
  try {
    const filter = { isActive: true };
    if (req.query.pageGroup) {
      filter.pageGroup = req.query.pageGroup;
    }
    const profiles = await Staff.find(filter)
      .sort({ priority: 1, createdAt: -1 });
    res.json({ success: true, profiles });
  } catch (err) {
    console.error('Staff GET error:', err);
    res.status(500).json({ success: false, message: 'Server error fetching staff members' });
  }
});

// @route  GET /api/staff/admin/all
// @desc   Fetch all staff profiles including inactive (admin), optionally filtered by pageGroup
router.get('/admin/all', protect, systemAdminOnly, async (req, res) => {
  try {
    const filter = {};
    if (req.query.pageGroup) {
      filter.pageGroup = req.query.pageGroup;
    }
    const profiles = await Staff.find(filter)
      .sort({ priority: 1, createdAt: -1 });
    res.json({ success: true, profiles });
  } catch (err) {
    console.error('Staff admin GET error:', err);
    res.status(500).json({ success: false, message: 'Server error fetching staff' });
  }
});

// @route  GET /api/staff/:id
// @desc   Fetch a specific staff profile by ID (public)
router.get('/:id', async (req, res) => {
  try {
    const profile = await Staff.findById(req.params.id);
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }
    res.json({ success: true, profile });
  } catch (err) {
    console.error('Staff profile GET error:', err);
    res.status(500).json({ success: false, message: 'Server error fetching profile' });
  }
});

// @route  POST /api/staff
// @desc   Create a new staff profile (admin only)
router.post('/', protect, systemAdminOnly, upload.single('image'), async (req, res) => {
  try {
    const { name, title, pageGroup, department, background, responsibility, order, isActive } = req.body;

    if (!name || !title || !pageGroup || !department || !background || !responsibility) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    let imageUrl = '';
    if (req.file) {
      // Copy to the root uploads folder for static routing compatibility
      const parentDir = path.join(__dirname, '../uploads');
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }
      const destPath = path.join(parentDir, req.file.filename);
      fs.copyFileSync(req.file.path, destPath);
      imageUrl = `/uploads/${req.file.filename}`;
    } else if (req.body.imageUrl) {
      imageUrl = req.body.imageUrl;
    } else {
      return res.status(400).json({ success: false, message: 'Image file or URL is required' });
    }

    const profile = await Staff.create({
      name,
      title,
      pageGroup,
      department,
      background,
      responsibility,
      imageUrl,
      priority: parseInt(req.body.priority) || 10,
      order: parseInt(order) || 0,
      isActive: isActive !== undefined ? (isActive === 'true' || isActive === true) : true
    });

    res.status(201).json({ success: true, message: 'Staff profile created successfully', profile });
  } catch (err) {
    console.error('Staff profile create error:', err);
    res.status(500).json({ success: false, message: err.message || 'Creation failed' });
  }
});

// @route  PUT /api/staff/:id
// @desc   Update a staff profile by ID (admin only)
router.put('/:id', protect, systemAdminOnly, upload.single('image'), async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (req.file) {
      // Copy to the root uploads folder for static routing compatibility
      const parentDir = path.join(__dirname, '../uploads');
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }
      const destPath = path.join(parentDir, req.file.filename);
      fs.copyFileSync(req.file.path, destPath);
      updateData.imageUrl = `/uploads/${req.file.filename}`;
    }

    if (updateData.priority !== undefined) updateData.priority = parseInt(updateData.priority) || 10;
    if (updateData.order !== undefined) updateData.order = parseInt(updateData.order) || 0;
    if (updateData.isActive !== undefined) updateData.isActive = updateData.isActive === 'true' || updateData.isActive === true;

    const updatedStaff = await Staff.findByIdAndUpdate(req.params.id, updateData, { new: true });
    
    if (!updatedStaff) return res.status(404).json({ success: false, error: 'Profile not found' });
    
    // Sync isActive status to matching User accounts
    if (updateData.isActive !== undefined) {
      try {
        const titleWords = ['asst', 'prof', 'mrs', 'mr', 'dr', 'phd', 'admin', 'administrator', 'system', 'president', 'office', 'dean', 'vice', 'ato'];
        const staffNameWords = updatedStaff.name
          .toLowerCase()
          .replace(/[^a-z0-9 ]/g, '')
          .split(' ')
          .filter(w => w.length > 2 && !titleWords.includes(w));

        const users = await User.find({});
        const matchingUsers = users.filter(u => {
          const userNameLower = u.name.toLowerCase();
          return staffNameWords.some(word => userNameLower.includes(word)) ||
                 userNameLower.split(' ').some(word => word.length > 2 && !titleWords.includes(word) && updatedStaff.name.toLowerCase().includes(word));
        });

        if (matchingUsers.length > 0) {
          const ids = matchingUsers.map(u => u._id);
          await User.updateMany({ _id: { $in: ids } }, { isActive: updatedStaff.isActive });
          console.log(`[Sync] Updated isActive to ${updatedStaff.isActive} for ${matchingUsers.length} user accounts matching '${updatedStaff.name}'`);
        }
      } catch (err) {
        console.error('[Sync] Error syncing user active status:', err);
      }
    }
    
    // Return backward-compatible response object
    const responseObj = updatedStaff.toObject();
    responseObj.success = true;
    responseObj.profile = updatedStaff;

    res.status(200).json(responseObj);
  } catch (error) {
    console.error('Staff profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile data matrix' });
  }
});

// Also support PATCH /api/staff/:id for flexibility
router.patch('/:id', protect, systemAdminOnly, upload.single('image'), async (req, res) => {
  try {
    const { name, title, pageGroup, department, background, responsibility, order, isActive, priority } = req.body;
    
    let updateData = {};
    if (name !== undefined) updateData.name = name;
    if (title !== undefined) updateData.title = title;
    if (pageGroup !== undefined) updateData.pageGroup = pageGroup;
    if (department !== undefined) updateData.department = department;
    if (background !== undefined) updateData.background = background;
    if (responsibility !== undefined) updateData.responsibility = responsibility;
    if (order !== undefined) updateData.order = parseInt(order) || 0;
    if (isActive !== undefined) updateData.isActive = isActive === 'true' || isActive === true;
    if (priority !== undefined) updateData.priority = parseInt(priority) || 10;
    
    if (req.file) {
      updateData.imageUrl = `/uploads/leadership/${req.file.filename}`;
    }

    const profile = await Staff.findByIdAndUpdate(req.params.id, updateData, { new: true });
    
    if (!profile) return res.status(404).json({ success: false, message: 'Profile not found' });

    // Sync isActive status to matching User accounts
    if (isActive !== undefined) {
      try {
        const titleWords = ['asst', 'prof', 'mrs', 'mr', 'dr', 'phd', 'admin', 'administrator', 'system', 'president', 'office', 'dean', 'vice', 'ato'];
        const staffNameWords = profile.name
          .toLowerCase()
          .replace(/[^a-z0-9 ]/g, '')
          .split(' ')
          .filter(w => w.length > 2 && !titleWords.includes(w));

        const users = await User.find({});
        const matchingUsers = users.filter(u => {
          const userNameLower = u.name.toLowerCase();
          return staffNameWords.some(word => userNameLower.includes(word)) ||
                 userNameLower.split(' ').some(word => word.length > 2 && !titleWords.includes(word) && profile.name.toLowerCase().includes(word));
        });

        if (matchingUsers.length > 0) {
          const ids = matchingUsers.map(u => u._id);
          await User.updateMany({ _id: { $in: ids } }, { isActive: profile.isActive });
          console.log(`[Sync] Updated isActive to ${profile.isActive} for ${matchingUsers.length} user accounts matching '${profile.name}'`);
        }
      } catch (err) {
        console.error('[Sync] Error syncing user active status:', err);
      }
    }
    
    res.json({ success: true, message: 'Profile updated successfully', profile });
  } catch (err) {
    console.error('Staff profile patch error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route  DELETE /api/staff/:id
// @desc   Delete a staff profile (admin only)
router.delete('/:id', protect, systemAdminOnly, async (req, res) => {
  try {
    const profile = await Staff.findById(req.params.id);
    if (!profile) return res.status(404).json({ success: false, message: 'Profile not found' });

    // Remove physical file if it exists and is local
    if (profile.imageUrl && profile.imageUrl.startsWith('/uploads')) {
        const filePath = path.join(__dirname, '..', profile.imageUrl);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await profile.deleteOne();

    res.json({ success: true, message: 'Profile deleted successfully' });
  } catch (err) {
    console.error('Staff profile delete error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
