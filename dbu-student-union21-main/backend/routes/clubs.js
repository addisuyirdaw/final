const express = require('express');
const Club = require('../models/Club');
const User = require('../models/User');
const ActivityReport = require('../models/ActivityReport');
const { sendRepresentativeAppointmentEmail, sendMemberApprovalEmail, sendRestrictionEmail, sendUnrestrictionEmail } = require('../utils/emailService');
const { protect, adminOnly, optionalAuth, clubLeader } = require('../middleware/auth');
const { validateClub } = require('../middleware/validation');

const router = express.Router();

// @desc    Get all clubs
// @route   GET /api/clubs
// @access  Public
router.get('/', optionalAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const { category, status, search } = req.query;

    // Build query
    let query = {};

    // Only show active clubs to non-admin users
    if (!req.user || !req.user.isAdmin) {
      query.status = 'active';
    } else if (status) {
      query.status = status;
    }

    if (category) query.category = category;

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const clubs = await Club.find(query)
      .populate('leadership.president', 'name email profileImage')
      .populate('leadership.vicePresident', 'name email profileImage')
      .populate('leadership.secretary', 'name email profileImage')
      .populate('leadership.treasurer', 'name email profileImage')
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit);

    const total = await Club.countDocuments(query);

    // Transform clubs to include member count and event count

    const transformedClubs = clubs.map(club => {
      let userMembershipStatus = null;
      if (req.user && club.members) {
        const userMember = club.members.find(m => m.user && m.user.toString() === req.user._id.toString());
        if (userMember) {
          userMembershipStatus = userMember.status;
        }
      }

      return {
        id: club._id,
        name: club.name,
        description: club.description,
        category: club.category,
        founded: club.founded,
        image: club.image,
        // Only count approved members in the public count
        members: club.members ? club.members.filter(m => m.status === 'approved').length : 0,
        events: club.events ? club.events.length : 0,
        status: club.status,
        contactEmail: club.contactEmail,
        meetingSchedule: club.meetingSchedule,
        leadership: club.leadership,
        socialMedia: club.socialMedia,
        createdAt: club.createdAt,
        userMembershipStatus
      };
    });

    return res.json({
      success: true,
      count: transformedClubs.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      clubs: transformedClubs,
      data: transformedClubs
    });
  } catch (error) {
    console.error('Get clubs error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching clubs',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Public dashboard statistics (for student dashboard)
// @route   GET /api/clubs/public-stats
// @access  Public
router.get('/public-stats', async (req, res) => {
  try {
    const activeClubs = await Club.countDocuments({ status: 'active' });
    const totalClubs = await Club.countDocuments();

    res.json({
      success: true,
      active: activeClubs,
      total: totalClubs
    });
  } catch (error) {
    console.error('Get public club stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching club statistics'
    });
  }
});

// @desc    Get single club
// @route   GET /api/clubs/:id
// @access  Public
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const club = await Club.findById(req.params.id)
      .populate('members.user', 'name username email studentId department year profileImage')
      .populate('leadership.president', 'name email studentId profileImage')
      .populate('leadership.vicePresident', 'name email studentId profileImage')
      .populate('leadership.secretary', 'name email studentId profileImage')
      .populate('leadership.treasurer', 'name email studentId profileImage')
      .populate('events.attendees', 'name email profileImage');

    if (!club) {
      return res.status(404).json({
        success: false,
        message: 'Club not found'
      });
    }

    // Check permissions for non-active clubs
    const isLeader = (club.leadership?.president?._id || club.leadership?.president)?.toString() === req.user?._id?.toString() ||
      (club.leadership?.vicePresident?._id || club.leadership?.vicePresident)?.toString() === req.user?._id?.toString() ||
      (club.leadership?.secretary?._id || club.leadership?.secretary)?.toString() === req.user?._id?.toString() ||
      req.user?.role === 'president' ||
      req.user?.role === 'clubs_coordinator' ||
      req.user?.username === 'dbu10101040' ||

      req.user?.role === 'admin';

    if (club.status !== 'active' && !req.user?.isAdmin && !isLeader) {
      return res.status(404).json({
        success: false,
        message: 'Club not found or access denied'
      });
    }

    res.json({
      success: true,
      club
    });
  } catch (error) {
    console.error('Get club error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching club',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Create new club
// @route   POST /api/clubs
// @access  Private/Admin
router.post('/', protect, adminOnly, validateClub, async (req, res) => {
  try {
    const { name, description, category, founded, image, contactEmail, meetingSchedule, requirements } = req.body;

    console.log('Received club data:', req.body);
    console.log('User creating club:', req.user);
    // Check if club name already exists
    const existingClub = await Club.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') }
    });
    if (existingClub) {
      return res.status(409).json({
        success: false,
        message: 'Club with this name already exists'
      });
    }

    const clubData = {
      name,
      description,
      category,
      founded: founded || new Date().getFullYear().toString(),
      image: image || 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=400',
      contactEmail,
      meetingSchedule,
      requirements,
      status: 'active'
    };

    console.log('Creating club with data:', clubData);
    const club = await Club.create(clubData);

    console.log('Club created successfully:', club);

    res.status(201).json({
      success: true,
      message: 'Club created successfully',
      club
    });
  } catch (error) {
    console.error('Create club error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating club',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Update club
// @route   PUT /api/clubs/:id
// @access  Private/Admin
// @access  Private/Club Leader
router.put('/:id', protect, clubLeader, async (req, res) => {
  try {
    const { name, description, category, image, contactEmail, meetingSchedule, requirements, status } = req.body;

    const club = await Club.findById(req.params.id);
    if (!club) {
      return res.status(404).json({
        success: false,
        message: 'Club not found'
      });
    }

    // Check if new name conflicts with existing club
    if (name && name !== club.name) {
      const existingClub = await Club.findOne({
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        _id: { $ne: req.params.id }
      });
      if (existingClub) {
        return res.status(409).json({
          success: false,
          message: 'Club with this name already exists'
        });
      }
    }

    // Update fields
    if (name) club.name = name;
    if (description) club.description = description;
    if (category) club.category = category;
    if (image) club.image = image;
    if (contactEmail) club.contactEmail = contactEmail;
    if (meetingSchedule) club.meetingSchedule = meetingSchedule;
    if (requirements) club.requirements = requirements;
    if (status) club.status = status;

    await club.save();

    res.json({
      success: true,
      message: 'Club updated successfully',
      club
    });
  } catch (error) {
    console.error('Update club error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating club',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Delete club
// @route   DELETE /api/clubs/:id
// @access  Private/Admin
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const club = await Club.findById(req.params.id);
    if (!club) {
      return res.status(404).json({
        success: false,
        message: 'Club not found'
      });
    }

    // Remove club from users' joinedClubs array
    await User.updateMany(
      { joinedClubs: club._id },
      { $pull: { joinedClubs: club._id } }
    );

    await Club.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Club deleted successfully'
    });
  } catch (error) {
    console.error('Delete club error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting club',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Join club
// @route   POST /api/clubs/:id/join
// @access  Private
router.post('/:id/join', protect, async (req, res) => {
  try {
    const { fullName, department, year, background } = req.body;

    const resolvedFullName = fullName || req.user.name;
    const resolvedDepartment = department || req.user.department;
    const resolvedYear = year || req.user.year;

    if (!resolvedFullName || !resolvedDepartment || !resolvedYear) {
      return res.status(400).json({
        success: false,
        message: 'Full name, department, and academic year are required'
      });
    }

    if (!background || !background.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please specify why you want to join this club'
      });
    }

    const club = await Club.findById(req.params.id);
    if (!club) {
      return res.status(404).json({
        success: false,
        message: 'Club not found'
      });
    }

    if (club.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Cannot join inactive club'
      });
    }

    // Check if user is already a member
    const existingMember = club.members.find(member =>
      member.user.toString() === req.user._id.toString()
    );

    if (existingMember) {
      if (existingMember.status === 'pending') {
        return res.status(400).json({
          success: false,
          message: 'Your join request is already pending approval'
        });
      }
      return res.status(400).json({
        success: false,
        message: 'You are already a member of this club'
      });
    }

    // Add user to club members
    club.members.push({
      user: req.user._id,
      fullName: resolvedFullName,
      department: resolvedDepartment,
      year: resolvedYear,
      background: background.trim(),
      role: 'member',
      status: 'pending',
      joinedAt: new Date()
    });

    await club.save();

    res.json({
      success: true,
      message: 'Join request submitted successfully. Waiting for admin approval.'
    });
  } catch (error) {
    console.error('Join club error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error joining club',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Approve club member
// @route   PATCH /api/clubs/:id/members/:memberId/approve
// @access  Private/Admin
// @access  Private/Club Leader
router.patch('/:id/members/:memberId/approve', protect, clubLeader, async (req, res) => {
  try {
    const club = await Club.findById(req.params.id);
    if (!club) {
      return res.status(404).json({
        success: false,
        message: 'Club not found'
      });
    }

    const isActualClubRep =
      (club.leadership?.president?.toString() === req.user._id.toString()) ||
      (club.leadership?.vicePresident?.toString() === req.user._id.toString()) ||
      (club.leadership?.secretary?.toString() === req.user._id.toString()) ||
      req.user.role === 'clubs_coordinator' ||
      req.user.username === 'dbu10101040' ||
      req.user.isAdmin;

    if (!isActualClubRep) {
      return res.status(403).json({
        success: false,
        message: 'Access Denied: Only Club Representatives can process join requests.'
      });
    }

    const member = club.members.id(req.params.memberId);
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    member.status = 'approved';
    member.approvedAt = new Date();
    await club.save();

    // Add club to user's joinedClubs
    await User.findByIdAndUpdate(member.user, {
      $addToSet: { joinedClubs: club._id }
    });

    // Send confirmation email
    try {
      const student = await User.findById(member.user);
      if (student && student.email) {
        await sendMemberApprovalEmail(student.email, student.name, club.name);
      }
    } catch (err) {
      console.warn('Member approval email failed:', err.message);
    }

    res.json({
      success: true,
      message: 'Member approved successfully'
    });
  } catch (error) {
    console.error('Approve member error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error approving member'
    });
  }
});

// @desc    Reject club member
// @route   PATCH /api/clubs/:id/members/:memberId/reject
// @access  Private/Admin
// @access  Private/Club Leader
router.patch('/:id/members/:memberId/reject', protect, clubLeader, async (req, res) => {
  try {
    const club = await Club.findById(req.params.id);
    if (!club) {
      return res.status(404).json({
        success: false,
        message: 'Club not found'
      });
    }

    const isActualClubRep =
      (club.leadership?.president?.toString() === req.user._id.toString()) ||
      (club.leadership?.vicePresident?.toString() === req.user._id.toString()) ||
      (club.leadership?.secretary?.toString() === req.user._id.toString()) ||
      req.user.role === 'clubs_coordinator' ||
      req.user.username === 'dbu10101040' ||
      req.user.isAdmin;

    if (!isActualClubRep) {
      return res.status(403).json({
        success: false,
        message: 'Access Denied: Only Club Representatives can process join requests.'
      });
    }

    const member = club.members.id(req.params.memberId);
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    member.status = 'rejected';
    await club.save();

    res.json({
      success: true,
      message: 'Member rejected successfully'
    });
  } catch (error) {
    console.error('Reject member error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error rejecting member'
    });
  }
});

// @desc    Restrict/Unrestrict club member
// @route   PATCH /api/clubs/:id/members/:memberId/restrict
// @access  Private/Admin
// @access  Private/Club Leader
router.patch('/:id/members/:memberId/restrict', protect, clubLeader, async (req, res) => {
  try {
    const { status, reason } = req.body; // 'restricted' or 'approved'
    
    if (!['restricted', 'approved'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Use "restricted" or "approved".'
      });
    }

    if (status === 'restricted' && !reason) {
      return res.status(400).json({
        success: false,
        message: 'A written reason is mandatory for restriction.'
      });
    }

    const club = await Club.findById(req.params.id);
    if (!club) {
      return res.status(404).json({
        success: false,
        message: 'Club not found'
      });
    }

    const member = club.members.id(req.params.memberId);
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    // 1. POWER HIERARCHY SECURITY
    const targetUser = await User.findById(member.user);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Target user not found'
      });
    }

    const isCoordinator = req.user.role === 'clubs_coordinator' || req.user.username === 'dbu10101040';
    const isTargetCoordinator = targetUser.role === 'clubs_coordinator' || targetUser.username === 'dbu10101040';
    const isTargetRep = targetUser.role === 'president';

    // Coordinators can restrict anyone. 
    // Reps can ONLY restrict regular members (not themselves, not other reps, not coordinators).
    if (!isCoordinator) {
      if (isTargetCoordinator) {
        return res.status(403).json({
          success: false,
          message: 'Access Denied: Club Representatives cannot restrict the Coordinator.'
        });
      }
      if (isTargetRep) {
         // Even if it's themselves, they shouldn't have the button in UI, but backend must block too
         return res.status(403).json({
          success: false,
          message: 'Access Denied: Club Representatives cannot restrict other Representatives or themselves.'
        });
      }
    }

    // Update member status in club
    member.status = status;
    await club.save();

    // Update global user restriction status and reason
    targetUser.isRestricted = (status === 'restricted');
    if (status === 'restricted') {
      targetUser.restrictionReason = reason;
    } else {
      // Clear reason when unrestricting
      targetUser.restrictionReason = undefined;
    }
    await targetUser.save();

    // Send email notification
    try {
      if (targetUser.email) {
        if (status === 'restricted') {
          await sendRestrictionEmail(targetUser.email, targetUser.name, reason);
        } else {
          await sendUnrestrictionEmail(targetUser.email, targetUser.name);
        }
      }
    } catch (emailErr) {
      console.warn('Restriction status email failed:', emailErr.message);
    }

    res.json({
      success: true,
      message: `Member ${status === 'restricted' ? 'restricted' : 'unrestricted'} successfully`,
      memberStatus: member.status,
      user: targetUser
    });
  } catch (error) {
    console.error('Restrict member error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating member restriction status'
    });
  }
});

// @desc    Permanently delete club member (User Account)
// @route   DELETE /api/clubs/:id/members/:memberId
// @access  Private/Admin
// @access  Private/Club Leader
router.delete('/:id/members/:memberId', protect, clubLeader, async (req, res) => {
  try {
    const club = await Club.findById(req.params.id);
    if (!club) {
      return res.status(404).json({
        success: false,
        message: 'Club not found'
      });
    }

    const member = club.members.id(req.params.memberId);
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    const userId = member.user;
    const targetUser = await User.findById(userId);
    if (!targetUser) {
       // If user is already gone but member exists, still try to cleanup
       club.members.pull({ _id: req.params.memberId });
       await club.save();
       return res.json({ success: true, message: 'Cleaned up orphaned member entry' });
    }

    // 1. POWER HIERARCHY SECURITY
    const isCoordinator = req.user.role === 'clubs_coordinator' || req.user.username === 'dbu10101040';
    const isTargetCoordinator = targetUser.role === 'clubs_coordinator' || targetUser.username === 'dbu10101040';
    const isTargetRep = targetUser.role === 'president';

    if (!isCoordinator) {
      if (isTargetCoordinator) {
        return res.status(403).json({
          success: false,
          message: 'Access Denied: Club Representatives cannot delete the Coordinator.'
        });
      }
      if (isTargetRep) {
        return res.status(403).json({
          success: false,
          message: 'Access Denied: Club Representatives cannot delete other Representatives or themselves.'
        });
      }
    }

    // 2. If the user was the Representative, nullify leadership in this club
    if (club.leadership.president && club.leadership.president.toString() === userId.toString()) {
      club.leadership.president = null;
    }
    if (club.leadership.vicePresident && club.leadership.vicePresident.toString() === userId.toString()) {
      club.leadership.vicePresident = null;
    }
    if (club.leadership.secretary && club.leadership.secretary.toString() === userId.toString()) {
      club.leadership.secretary = null;
    }
    if (club.leadership.treasurer && club.leadership.treasurer.toString() === userId.toString()) {
      club.leadership.treasurer = null;
    }

    // 3. Remove from THIS club's members array
    club.members.pull({ _id: req.params.memberId });
    await club.save();

    // 4. Remove from ALL OTHER clubs' members arrays
    await Club.updateMany(
      { 'members.user': userId },
      { $pull: { members: { user: userId } } }
    );

    // 5. Finally, delete the user account from the User collection
    await User.findByIdAndDelete(userId);

    res.json({
      success: true,
      message: 'User account and all club associations permanently deleted'
    });
  } catch (error) {
    console.error('Delete member account error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting user account'
    });
  }
});

// @desc    Get club join requests
// @route   GET /api/clubs/:id/join-requests
// @access  Private/Admin
// @access  Private/Club Leader
router.get('/:id/join-requests', protect, clubLeader, async (req, res) => {
  try {
    const club = await Club.findById(req.params.id)
      .populate('members.user', 'name username email profileImage');

    if (!club) {
      return res.status(404).json({
        success: false,
        message: 'Club not found'
      });
    }

    const isActualClubRep =
      (club.leadership?.president?.toString() === req.user._id.toString()) ||
      (club.leadership?.vicePresident?.toString() === req.user._id.toString()) ||
      (club.leadership?.secretary?.toString() === req.user._id.toString()) ||
      req.user.role === 'clubs_coordinator' ||
      req.user.username === 'dbu10101040' ||
      req.user.isAdmin;

    if (!isActualClubRep) {
      return res.status(403).json({
        success: false,
        message: 'Access Denied: Only Club Representatives can view join requests.'
      });
    }

    const pendingRequests = club.members.filter(member => member.status === 'pending');

    res.json({
      success: true,
      count: pendingRequests.length,
      requests: pendingRequests
    });
  } catch (error) {
    console.error('Get join requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching join requests'
    });
  }
});

// @desc    Leave club
// @route   POST /api/clubs/:id/leave
// @access  Private
router.post('/:id/leave', protect, async (req, res) => {
  try {
    const club = await Club.findById(req.params.id);
    if (!club) {
      return res.status(404).json({
        success: false,
        message: 'Club not found'
      });
    }

    // Check if user is a member
    const memberIndex = club.members.findIndex(member =>
      member.user.toString() === req.user._id.toString()
    );

    if (memberIndex === -1) {
      return res.status(400).json({
        success: false,
        message: 'You are not a member of this club'
      });
    }

    // Remove user from club members
    club.members.splice(memberIndex, 1);
    await club.save();

    // Remove club from user's joinedClubs
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { joinedClubs: club._id }
    });

    res.json({
      success: true,
      message: 'Successfully left the club'
    });
  } catch (error) {
    console.error('Leave club error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error leaving club'
    });
  }
});

// @desc    Get club statistics
// @route   GET /api/clubs/stats/overview
// @access  Private/Admin
router.get('/stats/overview', protect, adminOnly, async (req, res) => {
  try {
    const totalClubs = await Club.countDocuments();
    const activeClubs = await Club.countDocuments({ status: 'active' });
    const pendingClubs = await Club.countDocuments({ status: 'pending' });
    const inactiveClubs = await Club.countDocuments({ status: 'inactive' });

    // Clubs by category
    const clubsByCategory = await Club.aggregate([
      { $match: { category: { $exists: true, $ne: null } } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Total members across all clubs
    const memberStats = await Club.aggregate([
      { $project: { memberCount: { $size: '$members' } } },
      { $group: { _id: null, totalMembers: { $sum: '$memberCount' }, avgMembers: { $avg: '$memberCount' } } }
    ]);

    // Most popular clubs
    const popularClubs = await Club.aggregate([
      { $project: { name: 1, memberCount: { $size: '$members' } } },
      { $sort: { memberCount: -1 } },
      { $limit: 5 }
    ]);

    res.json({
      success: true,
      stats: {
        totalClubs,
        activeClubs,
        pendingClubs,
        inactiveClubs,
        totalMembers: memberStats[0]?.totalMembers || 0,
        avgMembers: Math.round(memberStats[0]?.avgMembers || 0),
        clubsByCategory,
        popularClubs
      }
    });
  } catch (error) {
    console.error('Get club stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching club statistics'
    });
  }
});

// @desc    Assign Club Representative (President)
// @route   PATCH /api/clubs/:id/assign-leader
// @access  Private/Admin (Main Coordinator Only)
router.patch('/:id/assign-leader', protect, async (req, res) => {
  try {
    const { userId } = req.body;

    // Only allow for systemic admin (dbu10101040) or explicit coordinator role
    const isMainCoordinator = req.user.username === 'dbu10101040' ||
      req.user.role === 'clubs_coordinator';

    if (!isMainCoordinator) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only the Main Coordinator can assign representatives.'
      });
    }

    const club = await Club.findById(req.params.id);
    if (!club) {
      return res.status(404).json({
        success: false,
        message: 'Club not found'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Demote old president if exists
    if (club.leadership.president && club.leadership.president.toString() !== userId.toString()) {
      try {
        await User.findByIdAndUpdate(club.leadership.president, { role: 'student' });
        // Also update in members array
        const oldMember = club.members.find(m => m.user.toString() === club.leadership.president.toString());
        if (oldMember) oldMember.role = 'member';
      } catch (err) {
        console.warn('Old president demotion failed:', err.message);
      }
    }

    // Elevate new user role and set club mapping
    user.role = 'president';
    user.clubId = club._id;
    await user.save();

    // Update club leadership
    club.leadership.president = user._id;

    // Add to members if not already there, and ensure approved status
    const existingMember = club.members.find(m => m.user.toString() === userId.toString());
    if (existingMember) {
      existingMember.status = 'approved';
      existingMember.role = 'president';
    } else {
      club.members.push({
        user: user._id,
        fullName: user.name,
        department: user.department || 'N/A',
        year: user.year || 'N/A',
        role: 'president',
        status: 'approved'
      });
    }

    await club.save();

    // Populate leadership before returning
    await club.populate('leadership.president', 'name email studentId profileImage');

    // Send confirmation email
    try {
      if (user.email) {
        await sendRepresentativeAppointmentEmail(user.email, user.name, club.name);
      }
    } catch (err) {
      console.warn('Representative appointment email failed:', err.message);
    }

    res.json({
      success: true,
      message: `Successfully assigned ${user.name} as the Representative for ${club.name}`,
      club
    });
  } catch (error) {
    console.error('Assign rep error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error assigning representative'
    });
  }
});


module.exports = router;