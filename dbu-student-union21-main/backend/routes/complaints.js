const express = require('express');
const Complaint = require('../models/Complaint');
const User = require('../models/User');
const { protect, adminOnly, authorize, optionalAuth } = require('../middleware/auth');
const { validateComplaint } = require('../middleware/validation');

const router = express.Router();

// @desc    Get all complaints
// @route   GET /api/complaints
// @access  Public (Optional Auth)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { status, category, priority, search } = req.query;

    // Build query
    let query = {};

    // All users can see all complaints
    if (status) query.status = status;
    if (category) query.category = category;
    if (priority) query.priority = priority;

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { caseId: { $regex: search, $options: 'i' } }
      ];
    }

    const complaints = await Complaint.find(query)
      .populate('submittedBy', 'name email studentId')
      .populate('assignedTo', 'name email role')
      .populate('responses.authorId', 'name role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Complaint.countDocuments(query);

    res.json({
      success: true,
      count: complaints.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      complaints,
      data: complaints // Add data field for compatibility
    });
  } catch (error) {
    console.error('Get complaints error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching complaints'
    });
  }
});

// @desc    Public dashboard statistics (for student dashboard)
// @route   GET /api/complaints/public-stats
// @access  Public
router.get('/public-stats', async (req, res) => {
  try {
    // Count pending complaints (newest first based on submission)
    const pendingComplaints = await Complaint.countDocuments({
      status: { $in: ['submitted', 'under_review'] }
    });

    // Get the most recent pending complaint date
    const recentComplaint = await Complaint.findOne({
      status: { $in: ['submitted', 'under_review'] }
    })
      .sort({ createdAt: -1 })
      .select('createdAt');

    const totalComplaints = await Complaint.countDocuments();

    res.json({
      success: true,
      pending: pendingComplaints,
      total: totalComplaints,
      lastSubmitted: recentComplaint?.createdAt || null
    });
  } catch (error) {
    console.error('Get public complaint stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching complaint statistics'
    });
  }
});

// @desc    Get all branches/categories
// @route   GET /api/complaints/branches
// @access  Public
router.get('/branches', async (req, res) => {
  try {
    const branches = Complaint.schema.path('branch').enumValues;
    res.json({
      success: true,
      count: branches.length,
      branches
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Get single complaint
// @route   GET /api/complaints/:id
// @access  Public (Optional Auth)
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('submittedBy', 'name email studentId')
      .populate('assignedTo', 'name email role')
      .populate('responses.authorId', 'name role');

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }

    // All users can access complaint details
    res.json({
      success: true,
      complaint
    });
  } catch (error) {
    console.error('Get complaint error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching complaint'
    });
  }
});

// @desc    Create new complaint
// @route   POST /api/complaints
// @access  Private
router.post('/', protect, validateComplaint, async (req, res) => {
  console.log('Received complaint submission:', req.body);
  try {
    const { title, description, category, priority, branch } = req.body;

    const complaint = await Complaint.create({
      title,
      description,
      category,
      priority: priority || 'medium',
      branch: branch || category,
      submittedBy: req.user._id || req.user.id
    });

    await complaint.populate('submittedBy', 'name email studentId');

    return res.status(201).json({
      success: true,
      message: 'Complaint submitted successfully',
      complaint
    });
  } catch (error) {
    console.error('Create complaint error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error creating complaint'
    });
  }
});

// @desc    Update complaint status
// @route   PATCH /api/complaints/:id/status
// @access  Private/Admin
router.patch('/:id/status', protect, adminOnly, async (req, res) => {
  try {
    const { status } = req.body;

    if (!['submitted', 'under_review', 'resolved', 'closed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    // Restricted Admin Check
    const isClubAdmin = req.user.username === 'dbu10101040' || req.user.role === 'club_admin';
    const isAcademicAdmin = req.user.role === 'academic_affairs';

    if (isClubAdmin && complaint.category !== 'club_related' && complaint.branch !== 'club_related') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only manage club-related complaints.'
      });
    }

    if (isAcademicAdmin && complaint.category !== 'academic' && complaint.branch !== 'academic') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only manage academic-related complaints.'
      });
    }

    complaint.status = status;
    if (status === 'under_review' && !complaint.assignedTo) {
      complaint.assignedTo = req.user.id;
    }

    await complaint.save();
    await complaint.populate('submittedBy', 'name email');
    await complaint.populate('assignedTo', 'name email role');

    res.json({
      success: true,
      message: 'Complaint status updated successfully',
      complaint
    });
  } catch (error) {
    console.error('Update complaint status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating complaint status'
    });
  }
});

// @desc    Add response to complaint
// @route   POST /api/complaints/:id/responses
// @access  Private/Admin
router.post('/:id/responses', protect, adminOnly, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Response message is required'
      });
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    // Restricted Admin Check
    const isClubAdmin = req.user.username === 'dbu10101040' || req.user.role === 'club_admin';
    const isAcademicAdmin = req.user.role === 'academic_affairs';

    if (isClubAdmin && complaint.category !== 'club_related' && complaint.branch !== 'club_related') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only respond to club-related complaints.'
      });
    }

    if (isAcademicAdmin && complaint.category !== 'academic' && complaint.branch !== 'academic') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only respond to academic-related complaints.'
      });
    }

    const response = {
      author: req.user.name,
      authorId: req.user.id,
      message: typeof message === 'string' ? message.trim() : message.message?.trim() || '',
      isOfficial: true
    };

    complaint.responses.push(response);

    // Update status to under_review if it's still submitted
    if (complaint.status === 'submitted') {
      complaint.status = 'under_review';
      complaint.assignedTo = req.user.id;
    }

    await complaint.save();
    await complaint.populate('responses.authorId', 'name role');

    res.json({
      success: true,
      message: 'Response added successfully',
      response: complaint.responses[complaint.responses.length - 1]
    });
  } catch (error) {
    console.error('Add response error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error adding response'
    });
  }
});

// @desc    Assign complaint to admin
// @route   PATCH /api/complaints/:id/assign
// @access  Private/Admin
router.patch('/:id/assign', protect, adminOnly, async (req, res) => {
  try {
    const { assignedTo } = req.body;

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    // Restricted Admin Check
    const isClubAdmin = req.user.username === 'dbu10101040' || req.user.role === 'club_admin';
    const isAcademicAdmin = req.user.role === 'academic_affairs';

    if (isClubAdmin && complaint.category !== 'club_related' && complaint.branch !== 'club_related') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only assign club-related complaints.'
      });
    }

    if (isAcademicAdmin && complaint.category !== 'academic' && complaint.branch !== 'academic') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only assign academic-related complaints.'
      });
    }

    // Verify assigned user exists and is admin
    const assignedUser = await User.findById(assignedTo);
    if (!assignedUser || !assignedUser.isAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user assignment'
      });
    }

    complaint.assignedTo = assignedTo;
    if (complaint.status === 'submitted') {
      complaint.status = 'under_review';
    }

    await complaint.save();
    await complaint.populate('assignedTo', 'name email role');

    return res.json({
      success: true,
      message: 'Complaint assigned successfully',
      complaint
    });
  } catch (error) {
    console.error('Assign complaint error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error assigning complaint'
    });
  }
});

// @desc    Get complaint statistics
// @route   GET /api/complaints/stats/overview
// @access  Private/Admin
router.get('/stats/overview', protect, adminOnly, async (req, res) => {
  try {
    const totalComplaints = await Complaint.countDocuments();
    const pendingComplaints = await Complaint.countDocuments({ status: 'submitted' });
    const underReviewComplaints = await Complaint.countDocuments({ status: 'under_review' });
    const resolvedComplaints = await Complaint.countDocuments({ status: 'resolved' });

    // Complaints by category
    const complaintsByCategory = await Complaint.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Complaints by priority
    const complaintsByPriority = await Complaint.aggregate([
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);

    // Recent complaints (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentComplaints = await Complaint.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });

    // Average resolution time
    const resolvedComplaintsWithTime = await Complaint.find({
      status: 'resolved',
      resolvedAt: { $exists: true }
    }).select('createdAt resolvedAt');

    let avgResolutionTime = 0;
    if (resolvedComplaintsWithTime.length > 0) {
      const totalTime = resolvedComplaintsWithTime.reduce((sum, complaint) => {
        return sum + (complaint.resolvedAt - complaint.createdAt);
      }, 0);
      avgResolutionTime = Math.round(totalTime / resolvedComplaintsWithTime.length / (1000 * 60 * 60 * 24)); // in days
    }

    return res.json({
      success: true,
      stats: {
        totalComplaints,
        pendingComplaints,
        underReviewComplaints,
        resolvedComplaints,
        recentComplaints,
        avgResolutionTime,
        complaintsByCategory,
        complaintsByPriority
      }
    });
  } catch (error) {
    console.error('Get complaint stats error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching complaint statistics'
    });
  }
});

// @desc    Delete complaint (Admin only)
// @route   DELETE /api/complaints/:id
// @access  Private/Admin
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    // Restricted Admin Check
    const isClubAdmin = req.user.username === 'dbu10101040' || req.user.role === 'club_admin';
    const isAcademicAdmin = req.user.role === 'academic_affairs';

    if (isClubAdmin && complaint.category !== 'club_related' && complaint.branch !== 'club_related') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only delete club-related complaints.'
      });
    }

    if (isAcademicAdmin && complaint.category !== 'academic' && complaint.branch !== 'academic') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only delete academic-related complaints.'
      });
    }

    await Complaint.findByIdAndDelete(req.params.id);

    return res.json({
      success: true,
      message: 'Complaint deleted successfully'
    });
  } catch (error) {
    console.error('Delete complaint error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error deleting complaint'
    });
  }
});


module.exports = router;