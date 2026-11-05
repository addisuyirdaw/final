const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const ClubProposal = require('../models/ClubProposal');
const Club = require('../models/Club');
const User = require('../models/User');
const { protect, adminOnly, optionalAuth } = require('../middleware/auth');

/**
 * Generate a unique, human-readable proposal reference ID
 * Example: PROP-7A9B2F
 */
async function generateUniqueReferenceId() {
  let referenceId = '';
  let exists = true;
  let attempts = 0;

  while (exists && attempts < 10) {
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    referenceId = `PROP-${randomHex}`;
    const found = await ClubProposal.findOne({ referenceId });
    if (!found) {
      exists = false;
    }
    attempts++;
  }

  if (exists) {
    referenceId = `PROP-${Date.now().toString().slice(-6)}`;
  }
  return referenceId;
}

// @desc    Submit a new student club proposal
// @route   POST /api/club-proposals
// @access  Public (optionalAuth attaches logged-in user if token present)
router.post('/', optionalAuth, async (req, res) => {
  try {
    const { proposer, proposedClub, foundingTeam } = req.body;

    // Validate Proposer Information
    if (!proposer) {
      return res.status(400).json({ success: false, message: 'Proposer information is required' });
    }

    const fullName = (proposer.fullName || '').trim();
    const studentId = (proposer.studentId || '').trim();
    const department = (proposer.department || '').trim();
    const year = (proposer.year || '').trim();
    const phone = (proposer.phone || '').trim();
    const email = (proposer.email || '').trim().toLowerCase();

    if (!fullName || !studentId || !department || !year || !phone || !email) {
      return res.status(400).json({
        success: false,
        message: 'All proposer details (Full Name, Student ID, Department, Year, Phone, and Email) are required'
      });
    }

    // Validate Proposed Club Information
    if (!proposedClub) {
      return res.status(400).json({ success: false, message: 'Proposed club details are required' });
    }

    const clubName = (proposedClub.name || '').trim();
    const category = (proposedClub.category || 'Academic').trim();
    const shortDescription = (proposedClub.shortDescription || '').trim();
    const rationale = (proposedClub.rationale || '').trim();
    const objectives = (proposedClub.objectives || '').trim();
    const activities = (proposedClub.activities || '').trim();
    const benefits = (proposedClub.benefits || '').trim();
    const estimatedFoundingMembers = Number(proposedClub.estimatedFoundingMembers) || 1;

    if (!clubName || !category || !shortDescription || !rationale || !objectives || !activities || !benefits) {
      return res.status(400).json({
        success: false,
        message: 'All club proposal fields (Name, Category, Description, Rationale, Objectives, Activities, and Benefits) are required'
      });
    }

    // Validate Founding Team Information
    const proposedLeader = (foundingTeam?.proposedLeader || fullName).trim();
    if (!proposedLeader) {
      return res.status(400).json({
        success: false,
        message: 'Proposed Club President or Coordinator name is required'
      });
    }

    // 1. Check if an active club with this name already exists
    const existingActiveClub = await Club.findOne({
      name: { $regex: new RegExp(`^${clubName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    });
    if (existingActiveClub) {
      return res.status(400).json({
        success: false,
        message: `An officially recognized student club named "${clubName}" already exists at Debre Berhan University.`
      });
    }

    // 2. Prevent duplicate pending proposals with the same name or from the same student
    const existingPendingProposal = await ClubProposal.findOne({
      $or: [
        {
          'proposedClub.name': { $regex: new RegExp(`^${clubName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
          status: { $in: ['Pending Review', 'Under Review', 'Additional Information Requested'] }
        },
        {
          'proposer.studentId': { $regex: new RegExp(`^${studentId}$`, 'i') },
          'proposedClub.name': { $regex: new RegExp(`^${clubName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
        }
      ]
    });

    if (existingPendingProposal) {
      return res.status(400).json({
        success: false,
        message: `A new club proposal for "${clubName}" is already under review (Reference ID: ${existingPendingProposal.referenceId}).`
      });
    }

    // Link user if authenticated or lookup by studentId
    let linkedUserId = req.user ? req.user._id : null;
    if (!linkedUserId && studentId) {
      try {
        const matchedUser = await User.findOne({ username: new RegExp(`^${studentId}$`, 'i') });
        if (matchedUser) {
          linkedUserId = matchedUser._id;
        }
      } catch (uErr) {
        // Non-blocking
      }
    }

    // Generate reference ID
    const referenceId = await generateUniqueReferenceId();

    const proposal = new ClubProposal({
      referenceId,
      proposer: {
        fullName,
        studentId,
        department,
        year,
        phone,
        email,
        user: linkedUserId
      },
      proposedClub: {
        name: clubName,
        category,
        shortDescription,
        rationale,
        objectives,
        activities,
        benefits,
        estimatedFoundingMembers
      },
      foundingTeam: {
        foundingMembers: (foundingTeam?.foundingMembers || '').trim(),
        proposedLeader,
        facultyAdvisor: (foundingTeam?.facultyAdvisor || '').trim()
      },
      status: 'Pending Review'
    });

    await proposal.save();

    return res.status(201).json({
      success: true,
      message:
        'Your new club proposal has been submitted successfully!\n\nThank you for contributing to the DBU student community. Your proposal will be reviewed by the Student Union administration. You will be informed when its status changes.',
      referenceId: proposal.referenceId,
      proposal: {
        _id: proposal._id,
        referenceId: proposal.referenceId,
        status: proposal.status,
        proposedClubName: proposal.proposedClub.name,
        category: proposal.proposedClub.category,
        createdAt: proposal.createdAt
      }
    });
  } catch (error) {
    console.error('Error submitting club proposal:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit club proposal: ' + error.message
    });
  }
});

// @desc    Public lookup of proposal status via Reference ID
// @route   GET /api/club-proposals/status/:referenceId
// @access  Public
router.get('/status/:referenceId', async (req, res) => {
  try {
    const ref = (req.params.referenceId || '').trim().toUpperCase();
    if (!ref) {
      return res.status(400).json({ success: false, message: 'Reference ID is required' });
    }

    const proposal = await ClubProposal.findOne({ referenceId: ref });
    if (!proposal) {
      return res.status(404).json({
        success: false,
        message: `No club proposal found matching reference ID "${ref}". Please check the ID and try again.`
      });
    }

    // Expose only non-sensitive public status information
    return res.json({
      success: true,
      proposal: {
        referenceId: proposal.referenceId,
        proposedClubName: proposal.proposedClub.name,
        category: proposal.proposedClub.category,
        shortDescription: proposal.proposedClub.shortDescription,
        status: proposal.status,
        submittedAt: proposal.createdAt,
        reviewedAt: proposal.reviewedAt,
        additionalInfoRequest: proposal.additionalInfoRequest || null,
        rejectionReason: proposal.rejectionReason || null,
        isClubCreated: proposal.isClubCreated,
        createdClubId: proposal.createdClubId,
        proposerName: proposal.proposer.fullName,
        proposerDepartment: proposal.proposer.department
      }
    });
  } catch (error) {
    console.error('Error fetching proposal status:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while checking proposal status'
    });
  }
});

// @desc    Get all club proposals with search & filter
// @route   GET /api/club-proposals
// @access  Private / Admin & Coordinators
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const { status, category, search, page = 1, limit = 50 } = req.query;

    const query = {};

    if (status && status !== 'All') {
      query.status = status;
    }

    if (category && category !== 'All') {
      query['proposedClub.category'] = category;
    }

    if (search && search.trim()) {
      const term = search.trim();
      query.$or = [
        { referenceId: new RegExp(term, 'i') },
        { 'proposedClub.name': new RegExp(term, 'i') },
        { 'proposer.fullName': new RegExp(term, 'i') },
        { 'proposer.studentId': new RegExp(term, 'i') },
        { 'proposer.department': new RegExp(term, 'i') }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await ClubProposal.countDocuments(query);
    const proposals = await ClubProposal.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('reviewedBy', 'name username role')
      .populate('clubCreatedBy', 'name username role')
      .populate('createdClubId', 'name category image memberCount');

    // Counts by status for tabs/badges
    const counts = {
      all: await ClubProposal.countDocuments(),
      pending: await ClubProposal.countDocuments({ status: 'Pending Review' }),
      underReview: await ClubProposal.countDocuments({ status: 'Under Review' }),
      needsInfo: await ClubProposal.countDocuments({ status: 'Additional Information Requested' }),
      approved: await ClubProposal.countDocuments({ status: 'Approved' }),
      rejected: await ClubProposal.countDocuments({ status: 'Rejected' })
    };

    return res.json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      counts,
      proposals
    });
  } catch (error) {
    console.error('Error fetching club proposals:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch club proposals'
    });
  }
});

// @desc    Get single proposal details
// @route   GET /api/club-proposals/:id
// @access  Private / Admin & Coordinators
router.get('/:id', protect, adminOnly, async (req, res) => {
  try {
    const proposal = await ClubProposal.findById(req.params.id)
      .populate('reviewedBy', 'name username role email')
      .populate('clubCreatedBy', 'name username role email')
      .populate('createdClubId', 'name category image memberCount');

    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Club proposal not found' });
    }

    return res.json({ success: true, proposal });
  } catch (error) {
    console.error('Error fetching single proposal:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching proposal' });
  }
});

// @desc    Update proposal review status
// @route   PATCH /api/club-proposals/:id/status
// @access  Private / Admin & Coordinators
router.patch('/:id/status', protect, adminOnly, async (req, res) => {
  try {
    const { status, rejectionReason, additionalInfoRequest, note } = req.body;

    const validStatuses = [
      'Pending Review',
      'Under Review',
      'Additional Information Requested',
      'Approved',
      'Rejected'
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const proposal = await ClubProposal.findById(req.params.id);
    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Club proposal not found' });
    }

    // Business rule: Once a club is created from an approved proposal, the proposal status cannot be demoted
    if (proposal.isClubCreated && status !== 'Approved') {
      return res.status(400).json({
        success: false,
        message: 'Cannot change status of a proposal that has already been converted into an official club'
      });
    }

    if (status === 'Rejected' && !rejectionReason?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'A rejection reason is required when rejecting a proposal'
      });
    }

    if (status === 'Additional Information Requested' && !additionalInfoRequest?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Details of the requested information are required'
      });
    }

    proposal.status = status;
    proposal.reviewedBy = req.user._id;
    proposal.reviewedAt = new Date();

    if (status === 'Rejected') {
      proposal.rejectionReason = (rejectionReason || '').trim();
    } else if (status === 'Additional Information Requested') {
      proposal.additionalInfoRequest = (additionalInfoRequest || '').trim();
    }

    // Add administrative note if provided
    if (note && note.trim()) {
      proposal.adminNotes.push({
        note: note.trim(),
        author: req.user._id,
        authorName: req.user.name || req.user.username || 'Administrator',
        createdAt: new Date()
      });
    }

    await proposal.save();

    return res.json({
      success: true,
      message: `Proposal status updated to "${status}"`,
      proposal
    });
  } catch (error) {
    console.error('Error updating proposal status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update proposal status: ' + error.message
    });
  }
});

// @desc    Add administrative comment/note to proposal
// @route   POST /api/club-proposals/:id/notes
// @access  Private / Admin & Coordinators
router.post('/:id/notes', protect, adminOnly, async (req, res) => {
  try {
    const { note } = req.body;
    if (!note || !note.trim()) {
      return res.status(400).json({ success: false, message: 'Note text cannot be empty' });
    }

    const proposal = await ClubProposal.findById(req.params.id);
    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Club proposal not found' });
    }

    proposal.adminNotes.push({
      note: note.trim(),
      author: req.user._id,
      authorName: req.user.name || req.user.username || 'Administrator',
      createdAt: new Date()
    });

    await proposal.save();

    return res.json({
      success: true,
      message: 'Administrative comment recorded successfully',
      adminNotes: proposal.adminNotes
    });
  } catch (error) {
    console.error('Error adding admin note:', error);
    return res.status(500).json({ success: false, message: 'Server error recording note' });
  }
});

// @desc    Convert an Approved proposal into an official Club
// @route   POST /api/club-proposals/:id/create-club
// @access  Private / Admin & Coordinators ONLY
router.post('/:id/create-club', protect, adminOnly, async (req, res) => {
  try {
    const proposal = await ClubProposal.findById(req.params.id);
    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Club proposal not found' });
    }

    // Critical Business Rules:
    // 1. Only Approved proposals can be converted
    if (proposal.status !== 'Approved') {
      return res.status(400).json({
        success: false,
        message: `Proposal must have status "Approved" before creating an official club. Current status is "${proposal.status}".`
      });
    }

    // 2. Prevent duplicate club creation from the same proposal
    if (proposal.isClubCreated) {
      return res.status(400).json({
        success: false,
        message: 'An official club has already been created from this proposal.',
        createdClubId: proposal.createdClubId
      });
    }

    const clubName = (req.body.name || proposal.proposedClub.name).trim();
    const category = (req.body.category || proposal.proposedClub.category).trim();
    const description = (req.body.description || proposal.proposedClub.shortDescription).trim();

    // Check if a club with this name already exists in active clubs
    const existingClub = await Club.findOne({
      name: { $regex: new RegExp(`^${clubName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    });
    if (existingClub) {
      return res.status(409).json({
        success: false,
        message: `A club named "${clubName}" already exists in the system.`
      });
    }

    // Build the initial club document
    const newClubData = {
      name: clubName,
      category,
      description,
      founded: req.body.founded || new Date().getFullYear().toString(),
      image: req.body.image || '',
      contactEmail: req.body.contactEmail || proposal.proposer.email,
      contactPhone: req.body.contactPhone || proposal.proposer.phone,
      meetingSchedule: req.body.meetingSchedule || 'To be announced',
      requirements:
        req.body.requirements ||
        `Objectives:\n${proposal.proposedClub.objectives}\n\nKey Activities:\n${proposal.proposedClub.activities}\n\nBenefits:\n${proposal.proposedClub.benefits}`,
      status: 'active',
      requireApproval: req.body.requireApproval !== false,
      members: [
        {
          user: proposal.proposer.user || null,
          studentId: proposal.proposer.studentId,
          fullName: proposal.proposer.fullName,
          department: proposal.proposer.department,
          year: proposal.proposer.year,
          contact: proposal.proposer.phone || proposal.proposer.email,
          phone: proposal.proposer.phone,
          email: proposal.proposer.email,
          role: 'president',
          status: 'approved',
          joinedAt: new Date()
        }
      ]
    };

    const newClub = new Club(newClubData);
    await newClub.save();

    // Atomically link proposal to created club
    proposal.isClubCreated = true;
    proposal.createdClubId = newClub._id;
    proposal.clubCreatedAt = new Date();
    proposal.clubCreatedBy = req.user._id;
    proposal.adminNotes.push({
      note: `Official club "${newClub.name}" created from this approved proposal by ${req.user.name || req.user.username}.`,
      author: req.user._id,
      authorName: req.user.name || req.user.username || 'Administrator',
      createdAt: new Date()
    });

    await proposal.save();

    return res.status(201).json({
      success: true,
      message: `Official club "${newClub.name}" has been successfully established from this approved proposal!`,
      club: newClub,
      proposal
    });
  } catch (error) {
    console.error('Error creating club from proposal:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create official club: ' + error.message
    });
  }
});

module.exports = router;

