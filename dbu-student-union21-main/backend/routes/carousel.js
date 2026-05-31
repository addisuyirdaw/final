const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Carousel = require('../models/Carousel');
const { protect, adminOnly } = require('../middleware/auth');

// --- Multer Storage Config ---
const uploadsDir = path.join(__dirname, '../uploads/carousel');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `carousel-${unique}${path.extname(file.originalname)}`);
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

// @route  GET /api/carousel/get
// @desc   Fetch all active carousel slides (public) — newest uploads first
router.get('/get', async (req, res) => {
  try {
    const slides = await Carousel.find({ isActive: true })
      .sort({ createdAt: -1 })
      .select('imageUrl caption order createdAt');

    res.json({ success: true, slides });
  } catch (err) {
    console.error('Carousel GET error:', err);
    res.status(500).json({ success: false, message: 'Server error fetching carousel' });
  }
});

// @route  GET /api/carousel/all
// @desc   Fetch ALL slides including inactive (admin only)
router.get('/all', protect, adminOnly, async (req, res) => {
  try {
    const slides = await Carousel.find()
      .sort({ order: 1, createdAt: -1 })
      .populate('uploadedBy', 'name email');

    res.json({ success: true, slides });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route  POST /api/carousel/upload
// @desc   Upload a new carousel image (admin only)
router.post('/upload', protect, adminOnly, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file provided' });
    }

    const { caption = '' } = req.body;

    // Build public URL served via /uploads static route
    const imageUrl = `/uploads/carousel/${req.file.filename}`;

    // Read and store base64 backup in MongoDB for self-healing
    let fileData, fileName, fileMimeType;
    try {
      const buf = fs.readFileSync(req.file.path);
      fileData = buf.toString('base64');
      fileName = req.file.originalname;
      fileMimeType = req.file.mimetype;
    } catch (e) { console.error('Carousel upload: fileData read error', e.message); }

    // order = 0 ensures this new slide sorts to the top (newest-first by createdAt)
    const slide = await Carousel.create({
      imageUrl,
      fileData,
      fileName,
      fileMimeType,
      caption: caption.trim(),
      order: 0,
      uploadedBy: req.user._id
    });

    res.status(201).json({ success: true, message: 'Image uploaded successfully', slide });
  } catch (err) {
    console.error('Carousel upload error:', err);
    res.status(500).json({ success: false, message: err.message || 'Upload failed' });
  }
});

// @route  PATCH /api/carousel/:id
// @desc   Update caption / order / isActive (admin only)
router.patch('/:id', protect, adminOnly, async (req, res) => {
  try {
    const { caption, order, isActive } = req.body;
    const update = {};
    if (caption !== undefined) update.caption = caption;
    if (order !== undefined) update.order = parseInt(order);
    if (isActive !== undefined) update.isActive = isActive;

    const slide = await Carousel.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!slide) return res.status(404).json({ success: false, message: 'Slide not found' });

    res.json({ success: true, slide });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route  DELETE /api/carousel/:id
// @desc   Delete a carousel slide (admin only)
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const slide = await Carousel.findById(req.params.id);
    if (!slide) return res.status(404).json({ success: false, message: 'Slide not found' });

    // Remove physical file
    const filePath = path.join(__dirname, '..', slide.imageUrl);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await slide.deleteOne();

    res.json({ success: true, message: 'Slide deleted' });
  } catch (err) {
    console.error('Carousel delete error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
