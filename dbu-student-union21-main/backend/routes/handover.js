const express = require('express');
const router = express.Router();
const LeadershipHandover = require('../models/LeadershipHandover');
const Club = require('../models/Club');
const { protect } = require('../middleware/auth');

// Helper to check if user is an admin or coordinator
const isSystemAdmin = (user) => {
  return user.isAdmin || user.role === 'clubs_coordinator' || user.username === 'dbu10101040';
};

// Helper to check if user is active leadership
const isActiveLeadership = (club, userId) => {
  if (!club || !club.leadership) return false;
  const { president, vicePresident, secretary, treasurer } = club.leadership;
  const uid = userId.toString();
  return (
    (president && president.toString() === uid) ||
    (vicePresident && vicePresident.toString() === uid) ||
    (secretary && secretary.toString() === uid) ||
    (treasurer && treasurer.toString() === uid)
  );
};

// @route   GET /api/handover/club/:clubId
// @desc    Get all handovers for a club
// @access  Private (Active Leadership, Admin, or Outgoing President)
router.get('/club/:clubId', protect, async (req, res) => {
  try {
    const club = await Club.findById(req.params.clubId);
    if (!club) return res.status(404).json({ success: false, message: 'Club not found' });

    const handovers = await LeadershipHandover.find({ club: req.params.clubId })
      .populate('outgoingPresident', 'name email profileImage role')
      .populate('incomingPresident', 'name email profileImage role')
      .sort({ createdAt: -1 });

    // Ensure authorized to view
    const isSysAdmin = isSystemAdmin(req.user);
    const isLeader = isActiveLeadership(club, req.user._id);

    // If not admin and not active leader, check if they are the outgoing president on ANY of these handovers
    // We'll filter the list for them if they only have specific access
    let visibleHandovers = [];
    if (isSysAdmin || isLeader) {
      visibleHandovers = handovers;
    } else {
      visibleHandovers = handovers.filter(h => h.outgoingPresident && h.outgoingPresident._id.toString() === req.user._id.toString());
      if (visibleHandovers.length === 0) {
         return res.status(403).json({ success: false, message: 'Not authorized to view these handovers' });
      }
    }

    res.json({ success: true, handovers: visibleHandovers });
  } catch (error) {
    console.error('Fetch club handovers error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/handover/:id
// @desc    Get a specific handover
// @access  Private (Active Leadership, Admin, or Outgoing President)
router.get('/:id', protect, async (req, res) => {
  try {
    const handover = await LeadershipHandover.findById(req.params.id)
      .populate('outgoingPresident', 'name email profileImage role')
      .populate('incomingPresident', 'name email profileImage role')
      .populate('club');

    if (!handover) return res.status(404).json({ success: false, message: 'Handover not found' });

    const club = handover.club;
    const isSysAdmin = isSystemAdmin(req.user);
    const isLeader = isActiveLeadership(club, req.user._id);
    const isOutgoing = handover.outgoingPresident && handover.outgoingPresident._id.toString() === req.user._id.toString();

    if (!isSysAdmin && !isLeader && !isOutgoing) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this handover' });
    }

    res.json({ success: true, handover });
  } catch (error) {
    console.error('Fetch handover error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/handover/club/:clubId
// @desc    Create a new handover draft
// @access  Private (Active President only)
router.post('/club/:clubId', protect, async (req, res) => {
  try {
    const club = await Club.findById(req.params.clubId);
    if (!club) return res.status(404).json({ success: false, message: 'Club not found' });

    const isPresident = club.leadership && club.leadership.president && club.leadership.president.toString() === req.user._id.toString();
    
    if (!isPresident) {
      return res.status(403).json({ success: false, message: 'Only the active club president can create a handover draft' });
    }

    const { termYear, achievements, challenges, lessonsLearned, recommendations, pendingDeadlines, keyRelationships } = req.body;

    const handover = await LeadershipHandover.create({
      club: club._id,
      termYear,
      outgoingPresident: req.user._id,
      status: 'DRAFT',
      achievements,
      challenges,
      lessonsLearned,
      recommendations,
      pendingDeadlines,
      keyRelationships
    });

    res.status(201).json({ success: true, message: 'Handover draft created successfully', handover });
  } catch (error) {
    console.error('Create handover error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PATCH /api/handover/:id
// @desc    Update a DRAFT handover
// @access  Private (Outgoing President only)
router.patch('/:id', protect, async (req, res) => {
  try {
    const handover = await LeadershipHandover.findById(req.params.id);
    if (!handover) return res.status(404).json({ success: false, message: 'Handover not found' });

    // Strict validation: Only the specific outgoing president can edit their own draft
    if (handover.outgoingPresident.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the outgoing president who created this handover can edit it' });
    }

    if (handover.status !== 'DRAFT') {
      return res.status(400).json({ success: false, message: 'Only DRAFT handovers can be edited' });
    }

    const { termYear, achievements, challenges, lessonsLearned, recommendations, pendingDeadlines, keyRelationships } = req.body;

    // Notice we do NOT extract or update status, club, outgoingPresident, or incomingPresident here
    if (termYear !== undefined) handover.termYear = termYear;
    if (achievements !== undefined) handover.achievements = achievements;
    if (challenges !== undefined) handover.challenges = challenges;
    if (lessonsLearned !== undefined) handover.lessonsLearned = lessonsLearned;
    if (recommendations !== undefined) handover.recommendations = recommendations;
    if (pendingDeadlines !== undefined) handover.pendingDeadlines = pendingDeadlines;
    if (keyRelationships !== undefined) handover.keyRelationships = keyRelationships;

    await handover.save();
    res.json({ success: true, message: 'Handover updated successfully', handover });
  } catch (error) {
    console.error('Update handover error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PATCH /api/handover/:id/submit
// @desc    Submit a DRAFT handover
// @access  Private (Outgoing President only)
router.patch('/:id/submit', protect, async (req, res) => {
  try {
    const handover = await LeadershipHandover.findById(req.params.id);
    if (!handover) return res.status(404).json({ success: false, message: 'Handover not found' });

    if (handover.outgoingPresident.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the outgoing president can submit this handover' });
    }

    if (handover.status !== 'DRAFT') {
      return res.status(400).json({ success: false, message: 'Only DRAFT handovers can be submitted' });
    }

    handover.status = 'SUBMITTED';
    await handover.save();

    res.json({ success: true, message: 'Handover submitted successfully', handover });
  } catch (error) {
    console.error('Submit handover error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PATCH /api/handover/:id/accept
// @desc    Accept a SUBMITTED handover
// @access  Private (Active President or Admin)
router.patch('/:id/accept', protect, async (req, res) => {
  try {
    const handover = await LeadershipHandover.findById(req.params.id).populate('club');
    if (!handover) return res.status(404).json({ success: false, message: 'Handover not found' });

    const club = handover.club;
    const isSysAdmin = isSystemAdmin(req.user);
    const isPresident = club && club.leadership && club.leadership.president && club.leadership.president.toString() === req.user._id.toString();

    if (!isSysAdmin && !isPresident) {
      return res.status(403).json({ success: false, message: 'Only the active club president or admin can accept this handover' });
    }

    if (handover.status !== 'SUBMITTED') {
      return res.status(400).json({ success: false, message: 'Only SUBMITTED handovers can be accepted' });
    }

    handover.status = 'ACCEPTED';
    
    // Automatically set the incoming president based on the current authoritative club structure
    if (club && club.leadership && club.leadership.president) {
      handover.incomingPresident = club.leadership.president;
    }

    await handover.save();

    res.json({ success: true, message: 'Handover accepted successfully', handover });
  } catch (error) {
    console.error('Accept handover error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
