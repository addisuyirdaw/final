const express = require('express');
const router = express.Router({ mergeParams: true });
const mongoose = require('mongoose');
const Club = require('../models/Club');
const ClubAnnouncement = require('../models/ClubAnnouncement');
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
    const announcements = await ClubAnnouncement.find(query)
      .populate('author', 'name username profileImage')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

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

    const { title, content } = req.body;
    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Title and content are required' });
    }

    const announcement = await ClubAnnouncement.create({
      clubId: req.params.clubId,
      author: req.user._id,
      title: title.trim(),
      content: content.trim()
    });

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

    const { title, content } = req.body;
    
    // Explicit whitelist of allowed fields
    if (title !== undefined) announcement.title = title.trim();
    if (content !== undefined) announcement.content = content.trim();

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

module.exports = router;
