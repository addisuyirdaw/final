/** @format */
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const MicroGrant = require('../models/MicroGrant');
const Transaction = require('../models/Transaction');
const University = require('../models/University');
const Club = require('../models/Club');
const { protect, optionalAuth } = require('../middleware/auth');

// @desc    Fetch micro-grants list (with filtering by status, university, club)
// @route   GET /api/grants
// @access  Public / Authenticated
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { status, universityId, clubId, category, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status && status !== 'ALL') {
      query.status = status.toUpperCase();
    }
    if (universityId) {
      query.universityId = universityId;
    }
    if (clubId) {
      query.clubId = clubId;
    }
    if (category) {
      query.category = category;
    }

    // --- SENSITIVE DATA PROTECTION ---
    const isReviewer = req.user && (
      req.user.isAdmin ||
      ['admin', 'superadmin', 'audit_finance', 'clubs_coordinator', 'academic_affairs', 'president', 'system_admin'].includes(req.user.role)
    );

    if (!isReviewer) {
      const publicStatuses = ['APPROVED', 'DISBURSED'];
      if (req.user) {
        // Normal user (including club reps): can only see public grants + their own requests
        query.$or = [
          { status: { $in: publicStatuses } },
          { applicantId: req.user._id }
        ];
      } else {
        // Unauthenticated: only see public grants
        query.status = { $in: publicStatuses };
      }
    }
    // ---------------------------------

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [grants, totalCount] = await Promise.all([
      MicroGrant.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('applicantId', 'name username email profileImage department')
        .populate('universityId', 'name code logoColor')
        .populate('clubId', 'name category image')
        .lean(),
      MicroGrant.countDocuments(query),
    ]);

    // Aggregate statistics
    const allGrants = await MicroGrant.find({}).lean();
    let totalFundingRequested = 0;
    let totalFundingDisbursed = 0;
    const statusCounts = {
      PENDING: 0,
      UNDER_REVIEW: 0,
      APPROVED: 0,
      REJECTED: 0,
      DISBURSED: 0,
    };

    allGrants.forEach((g) => {
      totalFundingRequested += g.amountRequested || 0;
      if (g.status === 'DISBURSED') {
        totalFundingDisbursed += g.amountApproved || g.amountRequested || 0;
      }
      if (statusCounts[g.status] !== undefined) {
        statusCounts[g.status] += 1;
      }
    });

    res.json({
      success: true,
      stats: {
        totalApplications: allGrants.length,
        totalFundingRequested,
        totalFundingDisbursed,
        statusCounts,
      },
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalCount / limitNum),
        totalItems: totalCount,
      },
      grants,
    });
  } catch (error) {
    console.error('Fetch grants error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving micro-grants',
      error: error.message,
    });
  }
});

// @desc    Get current user's submitted micro-grant applications
// @route   GET /api/grants/my-grants
// @access  Private
router.get('/my-grants', protect, async (req, res) => {
  try {
    const grants = await MicroGrant.find({ applicantId: req.user._id })
      .sort({ createdAt: -1 })
      .populate('universityId', 'name code')
      .populate('clubId', 'name category')
      .lean();

    res.json({
      success: true,
      count: grants.length,
      grants,
    });
  } catch (error) {
    console.error('Fetch my grants error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving your applications',
      error: error.message,
    });
  }
});

// @desc    Submit a new micro-grant application
// @route   POST /api/grants/apply
// @access  Private (Authenticated student / club member)
router.post('/apply', protect, async (req, res) => {
  try {
    const {
      title,
      clubId,
      universityId,
      amountRequested,
      purpose,
      category = 'TECHNOLOGY_INNOVATION',
      timelineMonths = 3,
    } = req.body;

    if (!title || !amountRequested || !purpose) {
      return res.status(400).json({
        success: false,
        message: 'Title, requested amount, and project purpose are required',
      });
    }

    const cleanAmount = parseFloat(amountRequested);
    if (isNaN(cleanAmount) || cleanAmount < 50) {
      return res.status(400).json({
        success: false,
        message: 'Requested amount must be at least 50 ETB',
      });
    }

    // Resolve universityId: default to DBU if not supplied
    let targetUnivId = universityId;
    if (!targetUnivId) {
      const defaultUniv = await University.findOne({ code: 'DBU' });
      targetUnivId = defaultUniv?._id || null;
    }

    if (!targetUnivId) {
      return res.status(400).json({
        success: false,
        message: 'A valid university ID is required for the application',
      });
    }

    const microGrant = await MicroGrant.create({
      title: title.trim(),
      applicantId: req.user._id,
      clubId: clubId || null,
      universityId: targetUnivId,
      amountRequested: cleanAmount,
      amountApproved: 0,
      purpose: purpose.trim(),
      category,
      timelineMonths: Math.min(12, Math.max(1, parseInt(timelineMonths, 10))),
      status: 'PENDING',
    });

    const populatedGrant = await MicroGrant.findById(microGrant._id)
      .populate('applicantId', 'name username department')
      .populate('universityId', 'name code')
      .populate('clubId', 'name category');

    res.status(201).json({
      success: true,
      message: 'Micro-grant proposal submitted successfully for review!',
      grant: populatedGrant,
    });
  } catch (error) {
    console.error('Apply for micro-grant error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error submitting micro-grant application',
      error: error.message,
    });
  }
});

// @desc    Approve, reject, or disburse grant funds (Admin / Reviewer)
// @route   PATCH /api/grants/:id/status
// @access  Private (Admin, Auditor, Student Union Executive)
router.patch('/:id/status', protect, async (req, res) => {
  try {
    const isPrivileged =
      req.user.isAdmin ||
      ['admin', 'superadmin', 'audit_finance', 'clubs_coordinator', 'academic_affairs', 'president'].includes(
        req.user.role
      );

    if (!isPrivileged) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only student union executives or financial review officers can evaluate grants',
      });
    }

    const { status, amountApproved, reviewNotes } = req.body;
    const cleanStatus = status?.toUpperCase();

    if (!['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'DISBURSED'].includes(cleanStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status "${status}". Allowed: PENDING, UNDER_REVIEW, APPROVED, REJECTED, DISBURSED`,
      });
    }

    const grant = await MicroGrant.findById(req.params.id)
      .populate('universityId', 'name code')
      .populate('clubId', 'name category');

    if (!grant) {
      return res.status(404).json({
        success: false,
        message: 'Micro-grant proposal not found',
      });
    }

    grant.status = cleanStatus;
    if (reviewNotes !== undefined) grant.reviewNotes = reviewNotes.trim();
    grant.reviewedBy = req.user._id;
    grant.reviewedAt = new Date();

    if (amountApproved !== undefined && !isNaN(parseFloat(amountApproved))) {
      grant.amountApproved = Math.max(0, parseFloat(amountApproved));
    } else if (cleanStatus === 'APPROVED' && grant.amountApproved === 0) {
      grant.amountApproved = grant.amountRequested;
    }

    // If DISBURSED: automatically create audit ledger transaction!
    if (cleanStatus === 'DISBURSED' && !grant.disbursedTransactionId) {
      const disbursementAmount = grant.amountApproved || grant.amountRequested;
      const refCode = `REF-GRT-${Date.now()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

      const tx = await Transaction.create({
        title: `Micro-Grant Payout: ${grant.title}`,
        category: 'GRANT_DISBURSEMENT',
        amount: disbursementAmount,
        universityId: grant.universityId?._id || grant.universityId || null,
        clubId: grant.clubId?._id || grant.clubId || null,
        referenceNumber: refCode,
        description: `Official micro-grant disbursement for project approved by ${req.user.name || 'Student Union Committee'}.`,
        date: new Date(),
        recordedBy: req.user._id,
        status: 'CONFIRMED',
      });

      grant.disbursedTransactionId = tx._id;
      grant.disbursedAt = new Date();
    }

    await grant.save();

    const updatedGrant = await MicroGrant.findById(grant._id)
      .populate('applicantId', 'name username email')
      .populate('universityId', 'name code')
      .populate('clubId', 'name category')
      .populate('reviewedBy', 'name username role');

    res.json({
      success: true,
      message: `Micro-grant status updated to ${cleanStatus}`,
      grant: updatedGrant,
    });
  } catch (error) {
    console.error('Update grant status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating micro-grant status',
      error: error.message,
    });
  }
});

// @desc    Get single micro-grant details
// @route   GET /api/grants/:id
// @access  Public / Authenticated
router.get('/:id', async (req, res) => {
  try {
    const grant = await MicroGrant.findById(req.params.id)
      .populate('applicantId', 'name username email department profileImage')
      .populate('universityId', 'name code location')
      .populate('clubId', 'name category image')
      .populate('reviewedBy', 'name username role');

    if (!grant) {
      return res.status(404).json({
        success: false,
        message: 'Micro-grant application not found',
      });
    }

    res.json({
      success: true,
      grant,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching grant details' });
  }
});

module.exports = router;
