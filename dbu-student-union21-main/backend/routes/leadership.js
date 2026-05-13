const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Leadership = require('../models/Leadership');
const { protect, adminOnly } = require('../middleware/auth');

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

// @route  GET /api/leadership/all
// @desc   Fetch all active leadership profiles (public)
router.get('/all', async (req, res) => {
  try {
    const profiles = await Leadership.find({ isActive: true })
      .sort({ priority: -1, createdAt: 1 });
    res.json({ success: true, profiles });
  } catch (err) {
    console.error('Leadership GET error:', err);
    res.status(500).json({ success: false, message: 'Server error fetching leadership' });
  }
});

// @route  GET /api/leadership/admin/all
// @desc   Fetch all leadership profiles including inactive (admin)
router.get('/admin/all', protect, adminOnly, async (req, res) => {
  try {
    const profiles = await Leadership.find()
      .sort({ priority: -1, createdAt: 1 });
    res.json({ success: true, profiles });
  } catch (err) {
    console.error('Leadership GET error:', err);
    res.status(500).json({ success: false, message: 'Server error fetching leadership' });
  }
});

// @route  GET /api/leadership/role/:roleSlug
// @desc   Fetch a specific leadership profile by roleSlug (public)
router.get('/role/:roleSlug', async (req, res) => {
  try {
    const profile = await Leadership.findOne({ roleSlug: req.params.roleSlug, isActive: true });
    if (!profile) return res.status(404).json({ success: false, message: 'Profile not found' });
    res.json({ success: true, profile });
  } catch (err) {
    console.error('Leadership role GET error:', err);
    res.status(500).json({ success: false, message: 'Server error fetching profile' });
  }
});

// @route  POST /api/leadership/add
// @desc   Upload a new leadership profile (admin only)
router.post('/add', protect, adminOnly, upload.single('image'), async (req, res) => {
  try {
    const { name, role, bio, priority, bioDetails } = req.body;

    let imageUrl = '';
    if (req.file) {
      imageUrl = `/uploads/leadership/${req.file.filename}`;
    } else if (req.body.imageUrl) {
      imageUrl = req.body.imageUrl;
    } else {
      return res.status(400).json({ success: false, message: 'Image file or URL is required' });
    }

    let parsedBioDetails = [];
    if (bioDetails) {
        try {
            parsedBioDetails = JSON.parse(bioDetails);
        } catch(e) {
            console.error("Failed to parse bioDetails");
        }
    }

    const profile = await Leadership.create({
      name,
      role,
      imageUrl,
      bio: bio || '',
      priority: parseInt(priority) || 0,
      bioDetails: parsedBioDetails
    });

    res.status(201).json({ success: true, message: 'Profile created successfully', profile });
  } catch (err) {
    console.error('Leadership upload error:', err);
    res.status(500).json({ success: false, message: err.message || 'Upload failed' });
  }
});

// @route  PATCH /api/leadership/:id
// @desc   Update profile (admin only)
router.patch('/:id', protect, adminOnly, upload.single('image'), async (req, res) => {
  try {
    const { name, role, bio, priority, isActive, bioDetails } = req.body;
    
    let updateData = {};
    if (name) updateData.name = name;
    if (role) updateData.role = role;
    if (bio !== undefined) updateData.bio = bio;
    if (priority !== undefined) updateData.priority = parseInt(priority);
    if (isActive !== undefined) updateData.isActive = isActive === 'true' || isActive === true;
    
    if (bioDetails) {
        try {
            updateData.bioDetails = JSON.parse(bioDetails);
        } catch(e) {
            console.error("Failed to parse bioDetails");
        }
    }

    if (req.file) {
      updateData.imageUrl = `/uploads/leadership/${req.file.filename}`;
    }

    const profile = await Leadership.findByIdAndUpdate(req.params.id, updateData, { new: true });
    
    if (!profile) return res.status(404).json({ success: false, message: 'Profile not found' });
    
    // Generate new roleSlug if role changed
    if (updateData.role) {
       profile.roleSlug = profile.role.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
       await profile.save();
    }

    res.json({ success: true, message: 'Profile updated successfully', profile });
  } catch (err) {
    console.error('Leadership update error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route  DELETE /api/leadership/:id
// @desc   Delete a leadership profile (admin only)
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const profile = await Leadership.findById(req.params.id);
    if (!profile) return res.status(404).json({ success: false, message: 'Profile not found' });

    // Remove physical file if it exists and is local
    if (profile.imageUrl && profile.imageUrl.startsWith('/uploads')) {
        const filePath = path.join(__dirname, '..', profile.imageUrl);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await profile.deleteOne();

    res.json({ success: true, message: 'Profile deleted' });
  } catch (err) {
    console.error('Leadership delete error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
