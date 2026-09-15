const express = require('express');
const router = express.Router();
const ClubRenewal = require('../models/ClubRenewal');
const Club = require('../models/Club');
const { protect } = require('../middleware/auth');

// Helper to check if user is an admin or coordinator
const isSystemAdmin = (user) => {
  return user.isAdmin || user.role === 'clubs_coordinator' || user.username === 'dbu10101040';
};

// Helper to check if user is the active president
const isPresident = (club, userId) => {
  if (!club || !club.leadership || !club.leadership.president) return false;
  return club.leadership.president.toString() === userId.toString();
};

// @route   GET /api/renewals
// @desc    Get all renewals (Coordinator/Admin only)
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    if (!isSystemAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'Not authorized to view all renewals' });
    }

    const renewals = await ClubRenewal.find()
      .populate('club', 'name category')
      .populate('submittedBy', 'name email profileImage')
      .populate('reviewedBy', 'name email profileImage')
      .sort({ createdAt: -1 });

    res.json({ success: true, renewals });
  } catch (error) {
    console.error('Fetch all renewals error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/renewals/club/:clubId
// @desc    Get renewals for a club
// @access  Private (Active President or Admin)
router.get('/club/:clubId', protect, async (req, res) => {
  try {
    const club = await Club.findById(req.params.clubId);
    if (!club) return res.status(404).json({ success: false, message: 'Club not found' });

    const isSysAdmin = isSystemAdmin(req.user);
    const isPres = isPresident(club, req.user._id);

    if (!isSysAdmin && !isPres) {
      return res.status(403).json({ success: false, message: 'Not authorized to view these renewals' });
    }

    const renewals = await ClubRenewal.find({ club: req.params.clubId })
      .populate('submittedBy', 'name email profileImage')
      .populate('reviewedBy', 'name email profileImage')
      .sort({ createdAt: -1 });

    res.json({ success: true, renewals });
  } catch (error) {
    console.error('Fetch club renewals error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/renewals/:id
// @desc    Get a specific renewal
// @access  Private (Active President or Admin)
router.get('/:id', protect, async (req, res) => {
  try {
    const renewal = await ClubRenewal.findById(req.params.id)
      .populate('club')
      .populate('submittedBy', 'name email profileImage')
      .populate('reviewedBy', 'name email profileImage');

    if (!renewal) return res.status(404).json({ success: false, message: 'Renewal not found' });

    const club = renewal.club;
    const isSysAdmin = isSystemAdmin(req.user);
    const isPres = isPresident(club, req.user._id);

    if (!isSysAdmin && !isPres) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this renewal' });
    }

    res.json({ success: true, renewal });
  } catch (error) {
    console.error('Fetch renewal error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/renewals/club/:clubId
// @desc    Create a new renewal draft
// @access  Private (Active President only)
router.post('/club/:clubId', protect, async (req, res) => {
  try {
    const club = await Club.findById(req.params.clubId);
    if (!club) return res.status(404).json({ success: false, message: 'Club not found' });

    if (!isPresident(club, req.user._id)) {
      return res.status(403).json({ success: false, message: 'Only the active club president can create a renewal' });
    }

    const { academicYear, operatingIntent, presidentConfirmation, notes } = req.body;

    if (!academicYear) {
      return res.status(400).json({ success: false, message: 'Academic year is required' });
    }

    // Check for duplicates
    const existingRenewal = await ClubRenewal.findOne({ club: club._id, academicYear });
    if (existingRenewal) {
      return res.status(400).json({ success: false, message: `A renewal record for ${academicYear} already exists` });
    }

    const renewal = await ClubRenewal.create({
      club: club._id,
      academicYear,
      status: 'DRAFT',
      operatingIntent: !!operatingIntent,
      presidentConfirmation: !!presidentConfirmation,
      notes,
      submittedBy: req.user._id
    });

    res.status(201).json({ success: true, message: 'Renewal draft created successfully', renewal });
  } catch (error) {
    console.error('Create renewal error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'A renewal record for this academic year already exists.' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PATCH /api/renewals/:id
// @desc    Update a DRAFT or RETURNED renewal
// @access  Private (Active President only)
router.patch('/:id', protect, async (req, res) => {
  try {
    const renewal = await ClubRenewal.findById(req.params.id).populate('club');
    if (!renewal) return res.status(404).json({ success: false, message: 'Renewal not found' });

    if (!isPresident(renewal.club, req.user._id)) {
      return res.status(403).json({ success: false, message: 'Only the active club president can edit this renewal' });
    }

    if (renewal.status !== 'DRAFT' && renewal.status !== 'RETURNED') {
      return res.status(400).json({ success: false, message: 'Only DRAFT or RETURNED renewals can be edited' });
    }

    const { operatingIntent, presidentConfirmation, notes } = req.body;

    if (operatingIntent !== undefined) renewal.operatingIntent = !!operatingIntent;
    if (presidentConfirmation !== undefined) renewal.presidentConfirmation = !!presidentConfirmation;
    if (notes !== undefined) renewal.notes = notes;

    await renewal.save();
    res.json({ success: true, message: 'Renewal updated successfully', renewal });
  } catch (error) {
    console.error('Update renewal error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PATCH /api/renewals/:id/submit
// @desc    Submit a renewal
// @access  Private (Active President only)
router.patch('/:id/submit', protect, async (req, res) => {
  try {
    const renewal = await ClubRenewal.findById(req.params.id).populate('club');
    if (!renewal) return res.status(404).json({ success: false, message: 'Renewal not found' });

    if (!isPresident(renewal.club, req.user._id)) {
      return res.status(403).json({ success: false, message: 'Only the active club president can submit this renewal' });
    }

    if (renewal.status !== 'DRAFT' && renewal.status !== 'RETURNED') {
      return res.status(400).json({ success: false, message: 'Only DRAFT or RETURNED renewals can be submitted' });
    }

    renewal.status = 'SUBMITTED';
    renewal.submittedAt = new Date();
    renewal.submittedBy = req.user._id;

    await renewal.save();
    res.json({ success: true, message: 'Renewal submitted successfully', renewal });
  } catch (error) {
    console.error('Submit renewal error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PATCH /api/renewals/:id/approve
// @desc    Approve a SUBMITTED renewal
// @access  Private (Coordinator/Admin only)
router.patch('/:id/approve', protect, async (req, res) => {
  try {
    if (!isSystemAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'Only coordinators or admins can approve renewals' });
    }

    const renewal = await ClubRenewal.findById(req.params.id).populate('club');
    if (!renewal) return res.status(404).json({ success: false, message: 'Renewal not found' });

    if (isPresident(renewal.club, req.user._id)) {
      return res.status(403).json({ success: false, message: 'Presidents cannot approve their own renewals, even if they have admin privileges' });
    }

    if (renewal.status !== 'SUBMITTED') {
      return res.status(400).json({ success: false, message: 'Only SUBMITTED renewals can be approved' });
    }

    renewal.status = 'APPROVED';
    renewal.reviewedAt = new Date();
    renewal.reviewedBy = req.user._id;

    await renewal.save();
    res.json({ success: true, message: 'Renewal approved successfully', renewal });
  } catch (error) {
    console.error('Approve renewal error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PATCH /api/renewals/:id/return
// @desc    Return a SUBMITTED renewal
// @access  Private (Coordinator/Admin only)
router.patch('/:id/return', protect, async (req, res) => {
  try {
    if (!isSystemAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'Only coordinators or admins can return renewals' });
    }

    const renewal = await ClubRenewal.findById(req.params.id).populate('club');
    if (!renewal) return res.status(404).json({ success: false, message: 'Renewal not found' });

    if (isPresident(renewal.club, req.user._id)) {
      return res.status(403).json({ success: false, message: 'Presidents cannot return their own renewals' });
    }

    if (renewal.status !== 'SUBMITTED') {
      return res.status(400).json({ success: false, message: 'Only SUBMITTED renewals can be returned' });
    }

    const { coordinatorFeedback } = req.body;

    renewal.status = 'RETURNED';
    renewal.coordinatorFeedback = coordinatorFeedback;
    renewal.reviewedAt = new Date();
    renewal.reviewedBy = req.user._id;

    await renewal.save();
    res.json({ success: true, message: 'Renewal returned successfully', renewal });
  } catch (error) {
    console.error('Return renewal error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
