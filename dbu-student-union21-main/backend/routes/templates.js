/** @format */
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Template = require('../models/Template');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// ── Upload directory ──────────────────────────────────────────────────────────
const uploadDir = path.join(__dirname, '../uploads/templates');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ── Multer storage ────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and Office documents are allowed'));
    }
  },
});

// ── Helper: derive the API base URL for building safe download pdfUrls ───────
const getApiBaseUrl = (req) => {
  // Always use the /api/templates/download route so the self-healing mechanism
  // is always triggered, even after Render ephemeral filesystem resets.
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.get('host');
  return `${proto}://${host}/api`;
};

// ── GET /api/templates ────────────────────────────────────────────────────────
// @desc    List all admin templates (publicly accessible to all authenticated users)
// @access  Private (any logged-in user)
router.get('/', protect, async (req, res) => {
  try {
    // No-cache so fresh templates always appear after upload
    res.set('Cache-Control', 'no-store');

    const templates = await Template.find({})
      .populate('uploadedBy', 'name email')
      .select('-fileData') // never send base64 over the list endpoint
      .sort({ createdAt: -1 });

    res.json({ success: true, count: templates.length, templates });
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving templates' });
  }
});

// ── POST /api/templates/upload ────────────────────────────────────────────────
// @desc    Upload a new admin template PDF (Admin / Coordinator only)
// @access  Private/Admin or Clubs Coordinator
router.post('/upload', protect, (req, res, next) => {
  // Allow clubs_coordinator role and the systemic coordinator account
  const isCoordinator = req.user?.role === 'clubs_coordinator' || req.user?.username === 'dbu10101040';
  if (req.user?.isAdmin || isCoordinator) return next();
  return adminOnly(req, res, next);
}, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const { title, description, category } = req.body;
    if (!title || !title.trim()) {
      // Clean up the uploaded file
      try { fs.unlinkSync(req.file.path); } catch (_) {}
      return res.status(400).json({ success: false, message: 'Template title is required' });
    }

    // Store the API download URL so self-healing always triggers on access
    const apiBase = getApiBaseUrl(req);
    const pdfUrl = `${apiBase}/templates/download/${req.file.filename}`;

    // Read file and store as base64 for MongoDB backup (survives ephemeral FS resets)
    let fileData;
    try {
      const buffer = fs.readFileSync(req.file.path);
      fileData = buffer.toString('base64');
    } catch (err) {
      console.error('Error reading file for base64 backup:', err);
    }

    const template = await Template.create({
      title: title.trim(),
      description: (description || '').trim(),
      category: category || 'Other',
      pdfUrl,
      fileData,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      uploadedBy: req.user._id,
      uploadedByName: req.user.name || 'Admin',
    });

    // Return without fileData
    const safe = template.toObject();
    delete safe.fileData;

    res.status(201).json({
      success: true,
      message: 'Template uploaded successfully',
      template: safe,
    });
  } catch (error) {
    console.error('Upload template error:', error);
    // Clean up disk file on error
    if (req.file) { try { fs.unlinkSync(req.file.path); } catch (_) {} }
    res.status(500).json({
      success: false,
      message: error.message || 'Server error uploading template',
    });
  }
});

// ── GET /api/templates/download/:filename ─────────────────────────────────────
// @desc    Force-download a template file (self-heals from MongoDB if missing)
// @access  Private
router.get('/download/:filename', protect, async (req, res) => {
  try {
    const filePath = path.join(uploadDir, req.params.filename);

    if (fs.existsSync(filePath)) {
      // Increment download count in background
      Template.findOneAndUpdate(
        { pdfUrl: { $regex: req.params.filename } },
        { $inc: { downloadCount: 1 } }
      ).catch(() => {});
      return res.download(filePath);
    }

    // Self-heal: pull base64 from MongoDB
    const template = await Template.findOne({
      pdfUrl: { $regex: req.params.filename },
    }).select('+fileData');

    if (template && template.fileData) {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const buffer = Buffer.from(template.fileData, 'base64');
      fs.writeFileSync(filePath, buffer);
      console.log(`✨ Self-healed template file: ${req.params.filename}`);
      template.downloadCount = (template.downloadCount || 0) + 1;
      await template.save();
      return res.download(filePath);
    }

    return res.status(404).json({ success: false, message: 'File not found' });
  } catch (error) {
    console.error('Template download error:', error);
    res.status(500).json({ success: false, message: 'Server error downloading file' });
  }
});

// ── DELETE /api/templates/:id ─────────────────────────────────────────────────
// @desc    Delete a template (Admin only)
// @access  Private/Admin
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const template = await Template.findById(req.params.id).select('+fileData');
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    // Remove physical file from disk if it exists
    if (template.pdfUrl) {
      const filename = template.pdfUrl.split('/').pop();
      const filePath = path.join(uploadDir, filename);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          console.log(`🗑️ Deleted template file: ${filename}`);
        } catch (err) {
          console.error(`Failed to delete template file ${filename}:`, err);
        }
      }
    }

    await Template.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Delete template error:', error);
    res.status(500).json({ success: false, message: 'Server error deleting template' });
  }
});

module.exports = router;
