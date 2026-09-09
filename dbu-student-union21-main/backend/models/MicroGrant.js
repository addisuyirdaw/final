/** @format */
const mongoose = require('mongoose');

const GRANT_STATUSES = ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'DISBURSED'];

const microGrantSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Micro-grant title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    applicantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Applicant user ID is required'],
      index: true,
    },
    clubId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Club',
      default: null,
      index: true,
    },
    universityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'University',
      required: [true, 'University ID is required'],
      index: true,
    },
    amountRequested: {
      type: Number,
      required: [true, 'Requested amount is required'],
      min: [50, 'Minimum grant request is 50 ETB'],
    },
    amountApproved: {
      type: Number,
      default: 0,
      min: 0,
    },
    purpose: {
      type: String,
      required: [true, 'Project purpose and budget justification is required'],
      trim: true,
      maxlength: [3000, 'Purpose description cannot exceed 3000 characters'],
    },
    status: {
      type: String,
      enum: {
        values: GRANT_STATUSES,
        message: '{VALUE} is not a valid micro-grant status',
      },
      default: 'PENDING',
      uppercase: true,
      index: true,
    },
    category: {
      type: String,
      enum: ['TECHNOLOGY_INNOVATION', 'COMMUNITY_OUTREACH', 'RESEARCH_ACADEMIC', 'CULTURAL_ARTS', 'ENVIRONMENTAL', 'OTHER'],
      default: 'TECHNOLOGY_INNOVATION',
    },
    timelineMonths: {
      type: Number,
      default: 3,
      min: 1,
      max: 12,
    },
    reviewNotes: {
      type: String,
      trim: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
    disbursedTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
      default: null,
    },
    disbursedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

microGrantSchema.index({ createdAt: -1 });

module.exports = mongoose.model('MicroGrant', microGrantSchema);
