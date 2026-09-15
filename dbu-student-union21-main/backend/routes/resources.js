const express = require('express');
const router = express.Router();
const Resource = require('../models/Resource');
const Reservation = require('../models/Reservation');
const Club = require('../models/Club');
const { protect, adminOnly } = require('../middleware/auth');
const mongoose = require('mongoose');

// @desc    Create a resource
// @route   POST /api/resources
// @access  Admin / Coordinator
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { name, type, description, capacity, isActive } = req.body;
    
    if (!name || !type) {
      return res.status(400).json({ success: false, message: 'Name and type are required' });
    }

    if (!['ROOM', 'AUDITORIUM', 'EQUIPMENT'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid resource type' });
    }

    const resource = await Resource.create({
      name,
      type,
      description,
      capacity: capacity > 0 ? capacity : undefined,
      isActive: isActive !== undefined ? isActive : true,
      createdBy: req.user._id
    });

    res.status(201).json({ success: true, resource });
  } catch (error) {
    console.error('Create resource error:', error);
    res.status(500).json({ success: false, message: 'Server error creating resource' });
  }
});

// @desc    Get all active resources (Admin gets all)
// @route   GET /api/resources
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    let query = { isActive: true };
    // Admins can see inactive resources
    const privilegedRoles = ['admin', 'president', 'council_president', 'council_secretary', 'clubs_coordinator', 'academic_affairs', 'system_admin'];
    if (req.user.isAdmin || privilegedRoles.includes(req.user.role)) {
      query = {};
    }

    const resources = await Resource.find(query).sort({ name: 1 });
    
    // Only return safe fields
    const safeResources = resources.map(r => ({
      _id: r._id,
      name: r.name,
      type: r.type,
      description: r.description,
      capacity: r.capacity,
      isActive: r.isActive
    }));

    res.json({ success: true, resources: safeResources });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching resources' });
  }
});

// @desc    Get single resource
// @route   GET /api/resources/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) return res.status(404).json({ success: false, message: 'Resource not found' });

    res.json({
      success: true,
      resource: {
        _id: resource._id,
        name: resource.name,
        type: resource.type,
        description: resource.description,
        capacity: resource.capacity,
        isActive: resource.isActive
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching resource' });
  }
});

// @desc    Update resource
// @route   PATCH /api/resources/:id
// @access  Admin / Coordinator
router.patch('/:id', protect, adminOnly, async (req, res) => {
  try {
    const { name, type, description, capacity, isActive } = req.body;
    let resource = await Resource.findById(req.params.id);
    
    if (!resource) return res.status(404).json({ success: false, message: 'Resource not found' });

    if (type && !['ROOM', 'AUDITORIUM', 'EQUIPMENT'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid resource type' });
    }

    if (name) resource.name = name;
    if (type) resource.type = type;
    if (description !== undefined) resource.description = description;
    if (capacity !== undefined) resource.capacity = capacity > 0 ? capacity : undefined;
    if (isActive !== undefined) resource.isActive = isActive;

    await resource.save();
    res.json({ success: true, resource });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error updating resource' });
  }
});

// @desc    Check availability
// @route   GET /api/resources/:id/availability
// @access  Private
router.get('/:id/availability', protect, async (req, res) => {
  try {
    const { startTime, endTime } = req.query;
    
    if (!startTime || !endTime) {
      return res.status(400).json({ success: false, message: 'startTime and endTime are required' });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (isNaN(start) || isNaN(end) || start >= end) {
      return res.status(400).json({ success: false, message: 'Invalid time range' });
    }

    const resource = await Resource.findById(req.params.id);
    if (!resource || !resource.isActive) {
      return res.status(404).json({ success: false, message: 'Resource not found or inactive' });
    }

    // Overlap logic: newStart < existingEnd AND newEnd > existingStart
    const conflicts = await Reservation.find({
      resourceId: req.params.id,
      status: { $in: ['PENDING', 'APPROVED'] },
      startTime: { $lt: end },
      endTime: { $gt: start }
    });

    res.json({
      success: true,
      isAvailable: conflicts.length === 0,
      conflicts: conflicts.length // Only return count, not private data of other clubs
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error checking availability' });
  }
});

// @desc    Create a reservation
// @route   POST /api/resources/:id/reservations
// @access  Private (Club Leader)
router.post('/:id/reservations', protect, async (req, res) => {
  // Start a MongoDB session for ACID concurrency (replica set required)
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { clubId, eventId, startTime, endTime } = req.body;
    
    if (!clubId || !eventId || !startTime || !endTime) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (isNaN(start) || isNaN(end) || start >= end) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Invalid time range' });
    }

    // 1. Authorize the user (must be club leader or privileged)
    // Institutional admins should manage resources, not blindly impersonate clubs.
    // We only check if the user is an authorized leader of the requested club.

    const club = await Club.findById(clubId);
    if (!club) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Club not found' });
    }

    const isLeader = club.leadership && (
      (club.leadership.president && club.leadership.president.toString() === req.user._id.toString()) ||
      (club.leadership.vicePresident && club.leadership.vicePresident.toString() === req.user._id.toString()) ||
      (club.leadership.secretary && club.leadership.secretary.toString() === req.user._id.toString())
    );

    if (!isLeader) {
      await session.abortTransaction();
      return res.status(403).json({ success: false, message: 'Not authorized for this club' });
    }

    // 2. Validate the embedded event exists inside this club
    const event = club.events.id(eventId);
    if (!event) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Event not found in this club' });
    }

    // Validate event constraints if it already has explicit times
    if (event.startTime && event.startTime.getTime() !== start.getTime()) {
      await session.abortTransaction();
      return res.status(422).json({ success: false, message: 'Requested startTime does not match event startTime' });
    }
    if (event.endTime && event.endTime.getTime() !== end.getTime()) {
      await session.abortTransaction();
      return res.status(422).json({ success: false, message: 'Requested endTime does not match event endTime' });
    }

    // 3. Serialize on the Resource document to prevent race conditions during availability check
    // We update the resource's updatedAt implicitly or increment __v to secure a write lock in this transaction.
    const resource = await Resource.findOneAndUpdate(
      { _id: req.params.id, isActive: true },
      { $inc: { __v: 1 } },
      { new: true, session }
    );

    if (!resource) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Resource not found or inactive' });
    }

    // 4. Check for overlapping reservations (PENDING or APPROVED)
    const overlapCount = await Reservation.countDocuments({
      resourceId: req.params.id,
      status: { $in: ['PENDING', 'APPROVED'] },
      startTime: { $lt: end },
      endTime: { $gt: start }
    }).session(session);

    if (overlapCount > 0) {
      await session.abortTransaction();
      return res.status(409).json({ success: false, message: 'Resource is already reserved for this time period' });
    }

    // 5. Create reservation safely
    const [reservation] = await Reservation.create([{
      resourceId: req.params.id,
      clubId,
      eventId,
      startTime: start,
      endTime: end,
      status: 'PENDING',
      createdBy: req.user._id
    }], { session });

    await session.commitTransaction();
    res.status(201).json({ success: true, reservation });
  } catch (error) {
    await session.abortTransaction();
    console.error('Create reservation error:', error);
    res.status(500).json({ success: false, message: 'Server error creating reservation' });
  } finally {
    session.endSession();
  }
});

module.exports = router;
