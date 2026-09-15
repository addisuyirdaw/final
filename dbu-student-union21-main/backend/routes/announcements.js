const express = require('express');
const router = express.Router({ mergeParams: true });
const mongoose = require('mongoose');
const Club = require('../models/Club');
const ClubAnnouncement = require('../models/ClubAnnouncement');
const Project = require('../models/Project');
const Task = require('../models/Task');
const { protect } = require('../middleware/auth');

// ---------------------------------------------------------------------------
// Helper: Check if user is an approved member of the club
// ---------------------------------------------------------------------------
const isApprovedMember = (club, userId) => {
  if (!club.members || !Array.isArray(club.members)) return false;
  const userIdStr = userId.toString();
  return club.members.some(
    (m) => m.user && m.user.toString() === userIdStr && m.status === 'approved'
  );
};

// ---------------------------------------------------------------------------
// Helper: Check if user is authorized to manage the club (leader or admin)
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
// Helper: Validate clubId and resolve Club
// ---------------------------------------------------------------------------
const resolveClub = async (clubId, res) => {
  if (!mongoose.Types.ObjectId.isValid(clubId)) {
    res.status(400).json({ success: false, message: 'Invalid club ID' });
    return null;
  }
  const club = await Club.findById(clubId).select('leadership status name members');
  if (!club) {
    res.status(404).json({ success: false, message: 'Club not found' });
    return null;
  }
  return club;
};

// ---------------------------------------------------------------------------
// @desc    Get all club announcements
// @route   GET /api/clubs/:clubId/announcements
// @access  Authenticated (Approved members or authorized leaders)
// ---------------------------------------------------------------------------
router.get('/', protect, async (req, res) => {
  try {
    const club = await resolveClub(req.params.clubId, res);
    if (!club) return;

    const isAuthorizedLeader = isClubAuthorized(club, req.user);
    const isMember = isApprovedMember(club, req.user._id);

    if (!isAuthorizedLeader && !isMember) {
      return res.status(403).json({ success: false, message: 'Not authorized to access announcements for this club' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const query = { clubId: req.params.clubId };
    
    // If not a leader, hide LEADERSHIP announcements
    if (!isAuthorizedLeader) {
      query.audienceType = 'ALL_MEMBERS';
    }

    const announcementsRaw = await ClubAnnouncement.find(query)
      .populate('author', 'name username profileImage')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const announcements = announcementsRaw.map(ann => {
      const hasAcknowledged = ann.acknowledgements?.some(
        ack => ack.user.toString() === req.user._id.toString()
      );
      const payload = {
        ...ann,
        hasAcknowledged
      };
      
      if (isAuthorizedLeader) {
        payload.acknowledgementCount = ann.acknowledgements?.length || 0;
      }
      
      // Remove raw acknowledgements array to prevent leaking all IDs
      delete payload.acknowledgements;
      
      return payload;
    });

    const total = await ClubAnnouncement.countDocuments(query);

    return res.json({
      success: true,
      count: announcements.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      announcements
    });
  } catch (error) {
    console.error('Get announcements error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching announcements' });
  }
});

// ---------------------------------------------------------------------------
// @desc    Create a club announcement
// @route   POST /api/clubs/:clubId/announcements
// @access  Club leader / Admin
// ---------------------------------------------------------------------------
router.post('/', protect, async (req, res) => {
  try {
    const club = await resolveClub(req.params.clubId, res);
    if (!club) return;

    if (!isClubAuthorized(club, req.user)) {
      return res.status(403).json({ success: false, message: 'Not authorized to create announcements for this club' });
    }

    const { 
      title, content, type, audienceType, 
      relatedEvent, relatedProject, relatedTask, 
      requiresAcknowledgement, deadline 
    } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Title and content are required' });
    }

    // Validate related entities if provided
    if (relatedEvent) {
      // Need full club to check events array
      const fullClub = await Club.findById(req.params.clubId).select('events');
      if (!fullClub.events || !fullClub.events.some(e => e._id.toString() === relatedEvent.toString())) {
        return res.status(400).json({ success: false, message: 'Related event does not belong to this club' });
      }
    }

    if (relatedProject) {
      const projectExists = await Project.exists({ _id: relatedProject, clubId: req.params.clubId });
      if (!projectExists) {
        return res.status(400).json({ success: false, message: 'Related project does not belong to this club' });
      }
    }

    if (relatedTask) {
      const taskExists = await Task.exists({ _id: relatedTask, clubId: req.params.clubId });
      if (!taskExists) {
        return res.status(400).json({ success: false, message: 'Related task does not belong to this club' });
      }
    }

    const payload = {
      clubId: req.params.clubId,
      author: req.user._id,
      title: title.trim(),
      content: content.trim()
    };

    if (type) payload.type = type;
    if (audienceType) payload.audienceType = audienceType;
    if (relatedEvent) payload.relatedEvent = relatedEvent;
    if (relatedProject) payload.relatedProject = relatedProject;
    if (relatedTask) payload.relatedTask = relatedTask;
    if (requiresAcknowledgement !== undefined) payload.requiresAcknowledgement = !!requiresAcknowledgement;
    if (deadline) payload.deadline = deadline;

    const announcement = await ClubAnnouncement.create(payload);

    // Populate author before returning
    await announcement.populate('author', 'name username profileImage');

    return res.status(201).json({ success: true, announcement });
  } catch (error) {
    console.error('Create announcement error:', error);
    return res.status(500).json({ success: false, message: 'Server error creating announcement' });
  }
});

// ---------------------------------------------------------------------------
// @desc    Update a club announcement
// @route   PATCH /api/clubs/:clubId/announcements/:announcementId
// @access  Club leader / Admin
// ---------------------------------------------------------------------------
router.patch('/:announcementId', protect, async (req, res) => {
  try {
    const club = await resolveClub(req.params.clubId, res);
    if (!club) return;

    if (!isClubAuthorized(club, req.user)) {
      return res.status(403).json({ success: false, message: 'Not authorized to edit announcements in this club' });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.announcementId)) {
      return res.status(400).json({ success: false, message: 'Invalid announcement ID' });
    }

    const announcement = await ClubAnnouncement.findOne({ _id: req.params.announcementId, clubId: req.params.clubId });
    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }

    const { 
      title, content, type, audienceType, 
      relatedEvent, relatedProject, relatedTask, 
      requiresAcknowledgement, deadline 
    } = req.body;
    
    // Explicit whitelist of allowed fields
    if (title !== undefined) announcement.title = title.trim();
    if (content !== undefined) announcement.content = content.trim();
    if (type !== undefined) announcement.type = type;
    if (audienceType !== undefined) announcement.audienceType = audienceType;
    
    if (relatedEvent !== undefined) {
      if (relatedEvent) {
        const fullClub = await Club.findById(req.params.clubId).select('events');
        if (!fullClub.events || !fullClub.events.some(e => e._id.toString() === relatedEvent.toString())) {
          return res.status(400).json({ success: false, message: 'Related event does not belong to this club' });
        }
      }
      announcement.relatedEvent = relatedEvent || undefined;
    }

    if (relatedProject !== undefined) {
      if (relatedProject) {
        const projectExists = await Project.exists({ _id: relatedProject, clubId: req.params.clubId });
        if (!projectExists) return res.status(400).json({ success: false, message: 'Related project does not belong to this club' });
      }
      announcement.relatedProject = relatedProject || undefined;
    }

    if (relatedTask !== undefined) {
      if (relatedTask) {
        const taskExists = await Task.exists({ _id: relatedTask, clubId: req.params.clubId });
        if (!taskExists) return res.status(400).json({ success: false, message: 'Related task does not belong to this club' });
      }
      announcement.relatedTask = relatedTask || undefined;
    }

    if (requiresAcknowledgement !== undefined) announcement.requiresAcknowledgement = !!requiresAcknowledgement;
    if (deadline !== undefined) announcement.deadline = deadline;

    await announcement.save();
    await announcement.populate('author', 'name username profileImage');

    return res.json({ success: true, announcement });
  } catch (error) {
    console.error('Update announcement error:', error);
    return res.status(500).json({ success: false, message: 'Server error updating announcement' });
  }
});

// ---------------------------------------------------------------------------
// @desc    Delete a club announcement
// @route   DELETE /api/clubs/:clubId/announcements/:announcementId
// @access  Club leader / Admin
// ---------------------------------------------------------------------------
router.delete('/:announcementId', protect, async (req, res) => {
  try {
    const club = await resolveClub(req.params.clubId, res);
    if (!club) return;

    if (!isClubAuthorized(club, req.user)) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete announcements in this club' });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.announcementId)) {
      return res.status(400).json({ success: false, message: 'Invalid announcement ID' });
    }

    const announcement = await ClubAnnouncement.findOneAndDelete({ _id: req.params.announcementId, clubId: req.params.clubId });
    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }

    return res.json({ success: true, message: 'Announcement deleted successfully' });
  } catch (error) {
    console.error('Delete announcement error:', error);
    return res.status(500).json({ success: false, message: 'Server error deleting announcement' });
  }
});

// ---------------------------------------------------------------------------
// @desc    Acknowledge an announcement
// @route   PATCH /api/clubs/:clubId/announcements/:announcementId/acknowledge
// @access  Authenticated (Approved members or authorized leaders)
// ---------------------------------------------------------------------------
router.patch('/:announcementId/acknowledge', protect, async (req, res) => {
  try {
    const club = await resolveClub(req.params.clubId, res);
    if (!club) return;

    const isAuthorizedLeader = isClubAuthorized(club, req.user);
    const isMember = isApprovedMember(club, req.user._id);

    if (!isAuthorizedLeader && !isMember) {
      return res.status(403).json({ success: false, message: 'Not authorized to access announcements for this club' });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.announcementId)) {
      return res.status(400).json({ success: false, message: 'Invalid announcement ID' });
    }

    const announcement = await ClubAnnouncement.findOne({ _id: req.params.announcementId, clubId: req.params.clubId });
    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }

    if (announcement.audienceType === 'LEADERSHIP' && !isAuthorizedLeader) {
      return res.status(403).json({ success: false, message: 'Not authorized to acknowledge this announcement' });
    }

    if (!announcement.requiresAcknowledgement) {
      return res.status(400).json({ success: false, message: 'This announcement does not require acknowledgement' });
    }

    // Check idempotency: If already acknowledged, safely return
    const hasAcknowledged = announcement.acknowledgements?.some(
      ack => ack.user.toString() === req.user._id.toString()
    );

    if (hasAcknowledged) {
      return res.json({ success: true, message: 'Already acknowledged' });
    }

    announcement.acknowledgements.push({ user: req.user._id, date: new Date() });
    await announcement.save();

    return res.json({ success: true, message: 'Announcement acknowledged successfully' });
  } catch (error) {
    console.error('Acknowledge announcement error:', error);
    return res.status(500).json({ success: false, message: 'Server error acknowledging announcement' });
  }
});

module.exports = router;
