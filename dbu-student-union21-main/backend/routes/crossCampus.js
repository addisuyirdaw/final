/** @format */
const express = require('express');
const router = express.Router();
const University = require('../models/University');
const JointEvent = require('../models/JointEvent');
const CrossCampusClub = require('../models/CrossCampusClub');
const Club = require('../models/Club');
const { protect } = require('../middleware/auth');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Standard paginator — returns { page, limit, skip } */
const paginate = (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  return { page, limit, skip: (page - 1) * limit };
};

// ─── Universities ─────────────────────────────────────────────────────────────

/**
 * @route   GET /api/cross-campus/universities
 * @desc    List all registered Ethiopian universities
 * @access  Public
 */
router.get('/universities', async (req, res) => {
  try {
    const universities = await University.find({ isActive: true })
      .sort({ established: 1 })
      .lean();

    return res.json({ success: true, count: universities.length, universities });
  } catch (err) {
    console.error('cross-campus/universities GET error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error fetching universities' });
  }
});

// ─── Cross-Campus Clubs ───────────────────────────────────────────────────────

/**
 * @route   GET /api/cross-campus/clubs
 * @desc    Clubs across all campuses (DBU active clubs + CrossCampusClub records)
 * @query   university (code, e.g. AAU), category, search, page, limit
 * @access  Public
 */
router.get('/clubs', async (req, res) => {
  try {
    const { university, category, search } = req.query;
    const { page, limit, skip } = paginate(req.query);
    const results = [];

    // ── Section 1: DBU's own active clubs (always included unless filtered away) ──
    if (!university || university.toUpperCase() === 'DBU') {
      const dbuFilter = { status: 'active' };
      if (category) dbuFilter.category = category;
      if (search) dbuFilter.name = { $regex: search, $options: 'i' };

      const dbuClubs = await Club.find(dbuFilter)
        .select('name category description members image contactEmail founded')
        .lean();

      dbuClubs.forEach((c) => {
        results.push({
          _id: c._id,
          name: c.name,
          category: c.category,
          description: c.description,
          universityCode: 'DBU',
          memberCount: (c.members || []).filter((m) => m.status === 'approved').length,
          image: c.image || null,
          contactEmail: c.contactEmail || null,
          founded: c.founded || null,
          isVerified: true,
          isDBU: true,
        });
      });
    }

    // ── Section 2: Other-university clubs ──
    if (!university || university.toUpperCase() !== 'DBU') {
      const extFilter = { isActive: true };
      if (university) extFilter.universityCode = university.toUpperCase();
      if (category) extFilter.category = category;
      if (search) extFilter.name = { $regex: search, $options: 'i' };

      const extClubs = await CrossCampusClub.find(extFilter).lean();
      extClubs.forEach((c) => {
        results.push({
          _id: c._id,
          name: c.name,
          category: c.category,
          description: c.description,
          universityCode: c.universityCode,
          memberCount: c.memberCount || 0,
          image: null,
          contactEmail: c.contactEmail || null,
          founded: c.founded || null,
          isVerified: c.isVerified,
          isDBU: false,
        });
      });
    }

    // ── Paginate in-memory (simpler than two separate DB counts) ──
    const total = results.length;
    const paged = results.slice(skip, skip + limit);

    return res.json({
      success: true,
      count: paged.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      clubs: paged,
    });
  } catch (err) {
    console.error('cross-campus/clubs GET error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error fetching clubs' });
  }
});

// ─── Joint Events ─────────────────────────────────────────────────────────────

/**
 * @route   GET /api/cross-campus/events
 * @desc    List joint/inter-university events
 * @query   status, eventType, university (code), page, limit
 * @access  Public
 */
router.get('/events', async (req, res) => {
  try {
    const { status, eventType, university } = req.query;
    const { page, limit, skip } = paginate(req.query);

    const filter = {};
    if (status) filter.status = status;
    if (eventType) filter.eventType = eventType.toUpperCase();
    if (university)
      filter.participatingUniversities = { $in: [university.toUpperCase()] };

    const [events, total] = await Promise.all([
      JointEvent.find(filter)
        .sort({ startDate: 1 })
        .skip(skip)
        .limit(limit)
        .populate('createdBy', 'name username')
        .lean(),
      JointEvent.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      count: events.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      events,
    });
  } catch (err) {
    console.error('cross-campus/events GET error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error fetching events' });
  }
});

/**
 * @route   POST /api/cross-campus/events
 * @desc    Propose a new joint inter-university event
 * @access  Private (authenticated users)
 */
router.post('/events', protect, async (req, res) => {
  try {
    const {
      title,
      description,
      eventType,
      startDate,
      endDate,
      location,
      leadUniversityCode,
      participatingUniversities,
      maxParticipants,
      prizes,
      requirements,
      tags,
    } = req.body;

    // Validation
    if (!title || !description || !eventType || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'title, description, eventType, startDate and endDate are required',
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start) || isNaN(end)) {
      return res.status(400).json({ success: false, message: 'Invalid date format' });
    }
    if (end <= start) {
      return res.status(400).json({ success: false, message: 'endDate must be after startDate' });
    }

    const event = await JointEvent.create({
      title: title.trim(),
      description: description.trim(),
      eventType: eventType.toUpperCase(),
      startDate: start,
      endDate: end,
      location: location?.trim() || '',
      leadUniversityCode: (leadUniversityCode || 'DBU').toUpperCase(),
      participatingUniversities: Array.isArray(participatingUniversities)
        ? participatingUniversities.map((u) => u.toUpperCase())
        : ['DBU'],
      createdBy: req.user.id,
      maxParticipants: maxParticipants || 0,
      prizes: prizes?.trim() || '',
      requirements: requirements?.trim() || '',
      tags: Array.isArray(tags) ? tags : [],
      status: 'proposed',
    });

    return res.status(201).json({ success: true, event });
  } catch (err) {
    console.error('cross-campus/events POST error:', err.message);
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e) => e.message).join(', ');
      return res.status(400).json({ success: false, message: messages });
    }
    return res.status(500).json({ success: false, message: 'Server error creating event' });
  }
});

/**
 * @route   POST /api/cross-campus/events/:id/register
 * @desc    Register current user for a joint event
 * @access  Private
 */
router.post('/events/:id/register', protect, async (req, res) => {
  try {
    const event = await JointEvent.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    if (event.status === 'cancelled' || event.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: `Cannot register for a ${event.status} event`,
      });
    }

    // Check if already registered
    const alreadyRegistered = event.registeredUsers.some(
      (r) => r.user.toString() === req.user.id.toString()
    );
    if (alreadyRegistered) {
      return res.status(409).json({ success: false, message: 'You are already registered for this event' });
    }

    // Check capacity
    if (event.maxParticipants > 0 && event.registeredUsers.length >= event.maxParticipants) {
      return res.status(400).json({ success: false, message: 'This event has reached its maximum capacity' });
    }

    event.registeredUsers.push({
      user: req.user.id,
      registeredAt: new Date(),
      universityCode: req.body.universityCode || 'DBU',
    });
    await event.save();

    return res.json({
      success: true,
      message: 'Successfully registered for the event',
      participantCount: event.registeredUsers.length,
    });
  } catch (err) {
    console.error('cross-campus/events/:id/register POST error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error registering for event' });
  }
});

/**
 * @route   DELETE /api/cross-campus/events/:id/register
 * @desc    Cancel registration for a joint event
 * @access  Private
 */
router.delete('/events/:id/register', protect, async (req, res) => {
  try {
    const event = await JointEvent.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const idx = event.registeredUsers.findIndex(
      (r) => r.user.toString() === req.user.id.toString()
    );
    if (idx === -1) {
      return res.status(400).json({ success: false, message: 'You are not registered for this event' });
    }

    event.registeredUsers.splice(idx, 1);
    await event.save();

    return res.json({ success: true, message: 'Registration cancelled successfully' });
  } catch (err) {
    console.error('cross-campus/events/:id/register DELETE error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error cancelling registration' });
  }
});

module.exports = router;
