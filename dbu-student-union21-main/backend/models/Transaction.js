/** @format */
const mongoose = require('mongoose');

const TRANSACTION_CATEGORIES = ['ALLOCATION', 'EXPENSE', 'GRANT_DISBURSEMENT', 'DONATION'];

const transactionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Transaction title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: TRANSACTION_CATEGORIES,
        message: '{VALUE} is not a valid transaction category',
      },
      uppercase: true,
    },
    amount: {
      type: Number,
      required: [true, 'Transaction amount is required'],
      min: [0.01, 'Amount must be greater than 0'],
    },
    universityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'University',
      default: null,
    },
    clubId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Club',
      default: null,
    },
    referenceNumber: {
      type: String,
      unique: true,
      trim: true,
      uppercase: true,
      required: [true, 'Reference/receipt number is required'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    date: {
      type: Date,
      default: Date.now,
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    receiptUrl: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'CONFIRMED', 'RECONCILED', 'CANCELLED'],
      default: 'CONFIRMED',
    },
  },
  {
    timestamps: true,
  }
);

transactionSchema.index({ date: -1 });
transactionSchema.index({ category: 1 });
transactionSchema.index({ referenceNumber: 1 });
transactionSchema.index({ universityId: 1 });
transactionSchema.index({ clubId: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
