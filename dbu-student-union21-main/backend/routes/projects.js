const express = require('express');
const router = express.Router({ mergeParams: true }); // mergeParams: true to access :clubId from parent
const mongoose = require('mongoose');
const Club = require('../models/Club');
const Project = require('../models/Project');
const { protect, optionalAuth } = require('../middleware/auth');

// ---------------------------------------------------------------------------
// Helper: determine if user is authorized to manage a specific club
// Mirrors checkIsClubAuthorized from clubs.js — kept separate to avoid coupling
// ---------------------------------------------------------------------------
const isClubAuthorized = (club, user) => {
  if (!user || !club) return false;
  const userIdStr = (user._id || user.id || '').toString();
  const getLeaderId = (leader) => {
    if (!leader) return '';
    return (leader._id || leader).toString();
  };

  const isLeader =
    getLeaderId(club.leadership?.president) === userIdStr ||
    getLeaderId(club.leadership?.vicePresident) === userIdStr ||
    getLeaderId(club.leadership?.secretary) === userIdStr ||
    getLeaderId(club.leadership?.treasurer) === userIdStr;

  const privilegedRoles = ['admin', 'president', 'council_president', 'system_admin', 'clubs_coordinator'];
  const executiveNames = ['Giziew', 'Sintayew', 'Sintayehu', 'Genete', 'Kalkidan'];
  const isExecutive = user.name && executiveNames.some((name) => user.name.includes(name));

  const isElevated =
    user.isAdmin === true ||
    privilegedRoles.includes(user.role) ||
    user.username === 'dbu10101040' ||
    user.username === 'dbu10101030' ||
    isExecutive;

  return Boolean(isLeader || isElevated);
};

// ---------------------------------------------------------------------------
// Helper: validate clubId param
// ---------------------------------------------------------------------------
const resolveClub = async (clubId, res) => {
  if (!mongoose.Types.ObjectId.isValid(clubId)) {
    res.status(400).json({ success: false, message: 'Invalid club ID' });
    return null;
  }
  const club = await Club.findById(clubId).select('leadership status name');
  if (!club) {
    res.status(404).json({ success: false, message: 'Club not found' });
    return null;
  }
  return club;
};

// ---------------------------------------------------------------------------
// @desc    Get all projects for a club
// @route   GET /api/clubs/:clubId/projects
// @access  Authenticated (any logged-in user)
// ---------------------------------------------------------------------------
router.get('/', protect, async (req, res) => {
  try {
    const club = await resolveClub(req.params.clubId, res);
    if (!club) return;

    const projects = await Project.find({ clubId: req.params.clubId })
      .populate('owner', 'name username profileImage')
      .populate('createdBy', 'name username')
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      count: projects.length,
      projects,
    });
  } catch (error) {
    console.error('Get projects error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching projects',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// ---------------------------------------------------------------------------
// @desc    Get a single project
// @route   GET /api/clubs/:clubId/projects/:projectId
// @access  Authenticated
// ---------------------------------------------------------------------------
router.get('/:projectId', protect, async (req, res) => {
  try {
    const club = await resolveClub(req.params.clubId, res);
    if (!club) return;

    if (!mongoose.Types.ObjectId.isValid(req.params.projectId)) {
      return res.status(400).json({ success: false, message: 'Invalid project ID' });
    }

    const project = await Project.findOne({
      _id: req.params.projectId,
      clubId: req.params.clubId, // enforces club scoping — prevents cross-club access
    })
      .populate('owner', 'name username profileImage department')
      .populate('members', 'name username profileImage department')
      .populate('createdBy', 'name username');

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found in this club',
      });
    }

    return res.json({ success: true, project });
  } catch (error) {
    console.error('Get project error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching project',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// ---------------------------------------------------------------------------
// @desc    Create a new project
// @route   POST /api/clubs/:clubId/projects
// @access  Club leader / Coordinator / Admin only
// ---------------------------------------------------------------------------
router.post('/', protect, async (req, res) => {
  try {
    const club = await resolveClub(req.params.clubId, res);
    if (!club) return;

    // Authorization: only club leadership or elevated roles
    if (!isClubAuthorized(club, req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Club leadership privileges required to create projects.',
      });
    }

    const { title, description, status, startDate, endDate, owner } = req.body;

    // Required field validation
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Project title is required' });
    }
    if (!description || !description.trim()) {
      return res.status(400).json({ success: false, message: 'Project description is required' });
    }

    // Status enum validation
    const validStatuses = ['planning', 'active', 'completed', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    // Date consistency validation
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      return res.status(400).json({
        success: false,
        message: 'End date cannot be before start date',
      });
    }

    const project = await Project.create({
      clubId: req.params.clubId,
      title: title.trim(),
      description: description.trim(),
      status: status || 'planning',
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      owner: owner || req.user._id,
      members: [],
      createdBy: req.user._id,
    });

    const populated = await project.populate([
      { path: 'owner', select: 'name username profileImage' },
      { path: 'createdBy', select: 'name username' },
    ]);

    return res.status(201).json({ success: true, project: populated });
  } catch (error) {
    console.error('Create project error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join('. ') });
    }
    return res.status(500).json({
      success: false,
      message: 'Server error creating project',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// ---------------------------------------------------------------------------
// @desc    Update a project
// @route   PATCH /api/clubs/:clubId/projects/:projectId
// @access  Club leader / Coordinator / Admin only
// ---------------------------------------------------------------------------
router.patch('/:projectId', protect, async (req, res) => {
  try {
    const club = await resolveClub(req.params.clubId, res);
    if (!club) return;

    if (!isClubAuthorized(club, req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Club leadership privileges required to update projects.',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.projectId)) {
      return res.status(400).json({ success: false, message: 'Invalid project ID' });
    }

    // Find project scoped to this specific club — prevents cross-club manipulation
    const project = await Project.findOne({
      _id: req.params.projectId,
      clubId: req.params.clubId,
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found in this club',
      });
    }

    const { title, description, status, startDate, endDate, owner } = req.body;

    // Status validation
    const validStatuses = ['planning', 'active', 'completed', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    // Date consistency validation
    const resolvedStart = startDate !== undefined ? startDate : project.startDate;
    const resolvedEnd = endDate !== undefined ? endDate : project.endDate;
    if (resolvedStart && resolvedEnd && new Date(resolvedEnd) < new Date(resolvedStart)) {
      return res.status(400).json({
        success: false,
        message: 'End date cannot be before start date',
      });
    }

    // Apply allowed updates — never allow clubId to be changed
    if (title !== undefined) project.title = title.trim();
    if (description !== undefined) project.description = description.trim();
    if (status !== undefined) project.status = status;
    if (startDate !== undefined) project.startDate = startDate || undefined;
    if (endDate !== undefined) project.endDate = endDate || undefined;
    if (owner !== undefined) project.owner = owner;

    await project.save();

    const populated = await project.populate([
      { path: 'owner', select: 'name username profileImage' },
      { path: 'createdBy', select: 'name username' },
    ]);

    return res.json({ success: true, project: populated });
  } catch (error) {
    console.error('Update project error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join('. ') });
    }
    return res.status(500).json({
      success: false,
      message: 'Server error updating project',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// ---------------------------------------------------------------------------
// @desc    Delete a project
// @route   DELETE /api/clubs/:clubId/projects/:projectId
// @access  Club leader / Coordinator / Admin only
// ---------------------------------------------------------------------------
router.delete('/:projectId', protect, async (req, res) => {
  try {
    const club = await resolveClub(req.params.clubId, res);
    if (!club) return;

    if (!isClubAuthorized(club, req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Club leadership privileges required to delete projects.',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.projectId)) {
      return res.status(400).json({ success: false, message: 'Invalid project ID' });
    }

    // Scoped delete — project must belong to this specific club
    const project = await Project.findOneAndDelete({
      _id: req.params.projectId,
      clubId: req.params.clubId,
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found in this club',
      });
    }

    return res.json({ success: true, message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Delete project error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error deleting project',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

module.exports = router;
