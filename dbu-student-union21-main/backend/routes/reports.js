const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ActivityReport = require('../models/ActivityReport');
const Club = require('../models/Club');
const { protect, adminOnly, clubLeader } = require('../middleware/auth');

const router = express.Router();

const uploadDir = path.join(__dirname, '../uploads/reports');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// @desc    Force download of attached report files bypassing browser HTML render
// @route   GET /api/reports/download/:filename
// @access  Public
router.get('/download/:filename', async (req, res) => {
  try {
    const filePath = path.join(__dirname, '../uploads/reports', req.params.filename);
    if (fs.existsSync(filePath)) {
      return res.download(filePath);
    }

    // Try database fallback if file is not found on disk (ephemeral filesystem self-healing)
    const report = await ActivityReport.findOne({ fileUrl: { $regex: req.params.filename } });

    if (report && report.fileData) {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const fileBuffer = Buffer.from(report.fileData, 'base64');
      fs.writeFileSync(filePath, fileBuffer);
      console.log(`✨ Self-healed missing file during download: ${req.params.filename}`);
      return res.download(filePath);
    }

    return res.status(404).send('File not found.');
  } catch (error) {
    console.error('Download error:', error);
    return res.status(500).send('Server error retrieving file.');
  }
});

// @desc    Submit new activity report (Club Rep or Member)
// @route   POST /api/reports/club/:clubId
// @access  Private/Club Leader or Member
router.post('/club/:clubId', protect, upload.single('file'), async (req, res) => {
  try {
    console.log('Keys received:', Object.keys(req.body));
    console.log('FILE RECEIVED:', req.file);
    const data = req.file ? req.body : req.body;
    if (!req.body.title) { console.log('BODY IS EMPTY - MULTIPLE PARSING FAIL'); }
    
    const { title, description, date, photos, documentUrl, reportType } = data;
    // We intentionally map to /uploads/ instead of req.file.path to maintain valid browser URL static routing
    const fileUrl = req.file ? `/uploads/reports/${req.file.filename}` : undefined;

    // Read and encode file data directly to base64 for persistent cloud storage in MongoDB Atlas
    let fileData, fileName, fileMimeType;
    if (req.file) {
      try {
        const fileBuffer = fs.readFileSync(req.file.path);
        fileData = fileBuffer.toString('base64');
        fileName = req.file.originalname;
        fileMimeType = req.file.mimetype;
      } catch (err) {
        console.error('Error reading uploaded file for DB storage:', err);
      }
    }

    // Check if user is member or leader
    const club = await Club.findById(req.params.clubId);
    if (!club) return res.status(404).json({ success: false, message: 'Club not found' });

    const isLeader = (club.leadership?.president?.toString() === req.user._id?.toString()) ||
      (club.leadership?.vicePresident?.toString() === req.user._id?.toString()) ||
      req.user.role === 'president' || req.user.role === 'clubs_coordinator' || req.user.isAdmin;

    const isMember = club.members?.find(m => m.user?.toString() === req.user._id?.toString() && m.status === 'approved');

    if (!isLeader && !isMember) {
      return res.status(403).json({ success: false, message: 'You must be a member or leader of this club to submit a report' });
    }

    // Only leaders can submit structured administrative documents
    if (!isLeader && reportType && ['ANNUAL_REPORT', 'DOCUMENT', 'ADMIN_REQUEST'].includes(reportType)) {
      return res.status(403).json({ success: false, message: 'Only Club Representatives can submit structured administrative documents.' });
    }

    // Create report
    const report = await ActivityReport.create({
      club: req.params.clubId,
      title,
      description: description || 'Attached file report',
      date: date || new Date(),
      photos: photos || [],
      documentUrl,
      fileUrl,
      fileData,
      fileName,
      fileMimeType,
      reportType: reportType || 'ACTIVITY',
      status: isLeader ? 'PENDING_REVIEW' : 'PENDING_MANAGER', // Leader -> Coordinator. Member -> Manager.
      submittedBy: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'Report submitted successfully',
      report
    });
  } catch (error) {
    console.error('Submit report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error submitting report',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Get pending reports from members (Club Rep)
// @route   GET /api/reports/club/:clubId/pending-manager
// @access  Private/Club Leader
router.get('/club/:clubId/pending-manager', protect, async (req, res) => {
  try {
    // Only leader can see
    const club = await Club.findById(req.params.clubId);
    if (!club) return res.status(404).json({ success: false, message: 'Club not found' });

    const isLeader = (club.leadership?.president?.toString() === req.user._id.toString()) || 
                     req.user.isAdmin || 
                     req.user.role === 'clubs_coordinator' || 
                     req.user.role === 'president';
    if (!isLeader) return res.status(403).json({ success: false, message: 'Not authorized' });

    const reports = await ActivityReport.find({ club: req.params.clubId, status: 'PENDING_MANAGER' })
      .populate('submittedBy', 'name email profileImage')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: reports.length, reports });
  } catch (error) {
    console.error('Get pending manager reports error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Get reports for a specific club
// @route   GET /api/reports/club/:clubId
// @access  Private
// Allows Club Reps to see all reports, students to see only PUBLISHED
router.get('/club/:clubId', protect, async (req, res) => {
  try {
    const club = await Club.findById(req.params.clubId);
    if (!club) return res.status(404).json({ success: false, message: 'Club not found' });

    // Check if user is leader or admin/coordinator
    const isLeader = (club.leadership?.president?.toString() === req.user._id.toString()) ||
      (club.leadership?.vicePresident?.toString() === req.user._id.toString()) ||
      req.user.role === 'president' ||
      req.user.role === 'clubs_coordinator' ||
      req.user.isAdmin;

    let query = { club: req.params.clubId };

    // If not a leader/coordinator, they can only see PUBLISHED reports
    if (!isLeader) {
      // Must be a member to see even published reports (or optionally they can be public?)
      // We will assume published reports are public/member-accessible
      query.status = 'PUBLISHED';
    }

    const reports = await ActivityReport.find(query)
      .populate('submittedBy', 'name email profileImage')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: reports.length,
      reports
    });
  } catch (error) {
    console.error('Get club reports error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving reports' });
  }
});

// @desc    Get all reports (Main Coordinator / Admin)
// @route   GET /api/reports/pending
// @access  Private/Coordinator
router.get('/pending', protect, async (req, res) => {
  try {
    // Only admins or clubs coordinators
    if (!req.user.isAdmin && req.user.role !== 'clubs_coordinator') {
      return res.status(403).json({ success: false, message: 'Not authorized to view reports' });
    }

    const reports = await ActivityReport.find({})
      .populate('club', 'name category image')
      .populate('submittedBy', 'name email profileImage')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: reports.length,
      reports
    });
  } catch (error) {
    console.error('Get pending reports error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving pending reports' });
  }
});

// @desc    Review and update report status (Main Coordinator / Admin / Club Manager)
// @route   PATCH /api/reports/:id/review
// @access  Private/Coordinator/ClubLeader
router.patch('/:id/review', protect, async (req, res) => {
  try {
    const report = await ActivityReport.findById(req.params.id).populate('club');
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    const club = report.club;
    const isCoordinator = req.user.isAdmin || req.user.role === 'clubs_coordinator';
    const isLeader = club && (
      (club.leadership?.president?.toString() === req.user._id.toString()) ||
      (club.leadership?.vicePresident?.toString() === req.user._id.toString()) ||
      req.user.role === 'president'
    );

    if (!isCoordinator && !isLeader) {
      return res.status(403).json({ success: false, message: 'Not authorized to review this report' });
    }

    const { status, feedback } = req.body;

    if (!['PENDING_REVIEW', 'RETURNED', 'PUBLISHED', 'APPROVED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    report.status = status;
    if (feedback) report.feedback = feedback;
    await report.save();

    res.json({
      success: true,
      message: 'Report reviewed successfully',
      report
    });
  } catch (error) {
    console.error('Review report error:', error);
    res.status(500).json({ success: false, message: 'Server error reviewing report' });
  }
});

// @desc    Coordinator Inbox (All reports)
// @route   GET /api/reports/inbox
// @access  Private/Coordinator
router.get('/inbox', protect, async (req, res) => {
  try {
    if (!req.user.isAdmin && req.user.role !== 'clubs_coordinator') {
      return res.status(403).json({ success: false, message: 'Not authorized for inbox' });
    }
    const reports = await ActivityReport.find()
      .populate('club', 'name')
      .populate('submittedBy', 'name')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: reports.length, reports });
  } catch (error) {
    console.error('Reports inbox error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving reports inbox' });
  }
});

// @desc    Delete an activity report
// @route   DELETE /api/reports/:id
// @access  Private/Club Leader or Coordinator/Admin
router.delete('/:id', protect, async (req, res) => {
  try {
    const report = await ActivityReport.findById(req.params.id).populate('club');
    if (!report) {
      return res.status(200).json({ success: true, message: 'Report already deleted' });
    }

    const club = report.club;
    const isCoordinator = req.user.isAdmin || req.user.role === 'clubs_coordinator';
    const isLeader = club && (
      (club.leadership?.president?.toString() === req.user._id?.toString()) ||
      (club.leadership?.vicePresident?.toString() === req.user._id?.toString()) ||
      req.user.role === 'president'
    );

    if (!isCoordinator && !isLeader) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this report' });
    }

    // Delete the physical file from disk if it exists
    if (report.fileUrl) {
      const filename = report.fileUrl.split('/').pop();
      const filePath = path.join(__dirname, '../uploads/reports', filename);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          console.log(`🗑️ Deleted file from disk: ${filename}`);
        } catch (err) {
          console.error(`Failed to delete physical file ${filename}:`, err);
        }
      }
    }

    await ActivityReport.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Report deleted successfully'
    });
  } catch (error) {
    console.error('Delete report error:', error);
    res.status(500).json({ success: false, message: 'Server error deleting report' });
  }
});

module.exports = router;
