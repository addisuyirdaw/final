/** @format */
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Transaction = require('../models/Transaction');
const University = require('../models/University');
const Club = require('../models/Club');
const { protect } = require('../middleware/auth');

// @desc    Get public financial transparency ledger and budget balance summary
// @route   GET /api/budget/ledger
// @access  Public
router.get('/ledger', async (req, res) => {
  try {
    const { category, universityId, search, page = 1, limit = 20 } = req.query;

    const query = {};

    if (category && category !== 'ALL') {
      query.category = category.toUpperCase();
    }

    if (universityId) {
      query.universityId = universityId;
    }

    if (search && search.trim()) {
      const s = search.trim();
      query.$or = [
        { title: { $regex: s, $options: 'i' } },
        { referenceNumber: { $regex: s, $options: 'i' } },
        { description: { $regex: s, $options: 'i' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    // Fetch transactions
    const [transactions, totalCount] = await Promise.all([
      Transaction.find(query)
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('universityId', 'name code logoColor')
        .populate('clubId', 'name category image')
        .populate('recordedBy', 'name username role')
        .lean(),
      Transaction.countDocuments(query),
    ]);

    // Financial calculations across all transactions in database
    const allTransactions = await Transaction.find({}).lean();

    let totalAllocated = 0;
    let totalDonations = 0;
    let totalExpenses = 0;
    let totalGrantsDisbursed = 0;

    const categoryBreakdown = {
      ALLOCATION: 0,
      DONATION: 0,
      EXPENSE: 0,
      GRANT_DISBURSEMENT: 0,
    };

    allTransactions.forEach((t) => {
      const amt = t.amount || 0;
      if (t.category === 'ALLOCATION') {
        totalAllocated += amt;
        categoryBreakdown.ALLOCATION += amt;
      } else if (t.category === 'DONATION') {
        totalDonations += amt;
        categoryBreakdown.DONATION += amt;
      } else if (t.category === 'EXPENSE') {
        totalExpenses += amt;
        categoryBreakdown.EXPENSE += amt;
      } else if (t.category === 'GRANT_DISBURSEMENT') {
        totalGrantsDisbursed += amt;
        categoryBreakdown.GRANT_DISBURSEMENT += amt;
      }
    });

    const totalIncome = totalAllocated + totalDonations;
    const totalOutflow = totalExpenses + totalGrantsDisbursed;
    const currentBalance = totalIncome - totalOutflow;

    res.json({
      success: true,
      summary: {
        currentBalance,
        totalIncome,
        totalOutflow,
        totalAllocated,
        totalDonations,
        totalExpenses,
        totalGrantsDisbursed,
        totalTransactionsCount: allTransactions.length,
        categoryBreakdown,
      },
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalCount / limitNum),
        totalItems: totalCount,
      },
      transactions,
    });
  } catch (error) {
    console.error('Fetch budget ledger error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving financial ledger',
      error: error.message,
    });
  }
});

// @desc    Record new financial ledger transaction (Admin / Treasurer / Auditor)
// @route   POST /api/budget/transactions
// @access  Private (Admin or privileged role)
router.post('/transactions', protect, async (req, res) => {
  try {
    const isPrivileged =
      req.user.isAdmin ||
      ['admin', 'superadmin', 'audit_finance', 'clubs_coordinator', 'academic_affairs', 'president'].includes(
        req.user.role
      );

    if (!isPrivileged) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only university administrators or audit officers can record transactions',
      });
    }

    const {
      title,
      category,
      amount,
      universityId,
      clubId,
      referenceNumber,
      description,
      date,
      receiptUrl,
    } = req.body;

    if (!title || !category || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Title, category, and amount are required fields',
      });
    }

    const cleanAmount = parseFloat(amount);
    if (isNaN(cleanAmount) || cleanAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be a positive number',
      });
    }

    // Auto-generate reference number if not provided
    const cleanRef =
      referenceNumber?.trim().toUpperCase() ||
      `TXN-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    // Verify reference uniqueness
    const existingRef = await Transaction.findOne({ referenceNumber: cleanRef });
    if (existingRef) {
      return res.status(400).json({
        success: false,
        message: `Transaction with reference code "${cleanRef}" already exists`,
      });
    }

    const transaction = await Transaction.create({
      title: title.trim(),
      category: category.toUpperCase(),
      amount: cleanAmount,
      universityId: universityId || null,
      clubId: clubId || null,
      referenceNumber: cleanRef,
      description: description?.trim() || '',
      date: date ? new Date(date) : new Date(),
      recordedBy: req.user._id,
      receiptUrl: receiptUrl?.trim() || null,
      status: 'CONFIRMED',
    });

    const populatedTx = await Transaction.findById(transaction._id)
      .populate('universityId', 'name code')
      .populate('clubId', 'name category')
      .populate('recordedBy', 'name username');

    res.status(201).json({
      success: true,
      message: 'Financial transaction recorded to public ledger successfully',
      transaction: populatedTx,
    });
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error recording transaction',
      error: error.message,
    });
  }
});

// @desc    Get quick budget statistics for charts and widgets
// @route   GET /api/budget/stats
// @access  Public
router.get('/stats', async (req, res) => {
  try {
    const transactions = await Transaction.find({}).lean();
    let totalAllocated = 0;
    let totalDonations = 0;
    let totalExpenses = 0;
    let totalGrantsDisbursed = 0;

    transactions.forEach((t) => {
      const a = t.amount || 0;
      if (t.category === 'ALLOCATION') totalAllocated += a;
      else if (t.category === 'DONATION') totalDonations += a;
      else if (t.category === 'EXPENSE') totalExpenses += a;
      else if (t.category === 'GRANT_DISBURSEMENT') totalGrantsDisbursed += a;
    });

    res.json({
      success: true,
      stats: {
        totalAllocated,
        totalDonations,
        totalExpenses,
        totalGrantsDisbursed,
        balance: totalAllocated + totalDonations - (totalExpenses + totalGrantsDisbursed),
        count: transactions.length,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error retrieving stats' });
  }
});

module.exports = router;
