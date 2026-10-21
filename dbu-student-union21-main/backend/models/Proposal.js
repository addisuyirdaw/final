/** @format */
const mongoose = require('mongoose');

const proposalVersionSchema = new mongoose.Schema(
  {
    version: {
      type: Number,
      required: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    fileMimeType: {
      type: String,
      default: 'application/pdf',
    },
    storageKey: {
      type: String,
      required: true,
    },
    fileData: {
      type: String,
      select: false, // Exclude heavy base64 string from standard queries
    },
    referenceNumber: {
      type: String,
      required: true,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    submittedByIp: {
      type: String,
    },
    note: {
      type: String,
      trim: true,
    },
  },
  {
    _id: true,
    timestamps: true,
  }
);

const proposalSchema = new mongoose.Schema(
  {
    candidateUsername: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    candidateName: {
      type: String,
      required: true,
      trim: true,
    },
    candidateDepartment: {
      type: String,
      trim: true,
    },
    candidateYear: {
      type: String,
      trim: true,
    },
    candidatePosition: {
      type: String,
      trim: true,
    },
    candidateExamCode: {
      type: String,
      trim: true,
      index: true,
    },
    studentId: {
      type: String,
      trim: true,
      index: true,
    },
    electionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Election',
    },
    currentVersion: {
      type: Number,
      default: 1,
    },
    latestReferenceNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    latestSubmittedAt: {
      type: Date,
      default: Date.now,
    },
    currentFile: {
      fileName: { type: String, required: true },
      fileSize: { type: Number, required: true },
      fileMimeType: { type: String, default: 'application/pdf' },
      storageKey: { type: String, required: true },
    },
    fileData: {
      type: String,
      select: false, // Exclude heavy base64 string from standard queries
    },
    versions: [proposalVersionSchema],
    status: {
      type: String,
      enum: ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REVISION_REQUESTED'],
      default: 'SUBMITTED',
      index: true,
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
    evaluation: {
      totalScore: { type: Number, min: 0, max: 15 },
      criteria: {
        strategicObjectives: {
          score: { type: Number, default: 0 },
          maxScore: { type: Number, default: 4 },
          feedback: { type: String, default: '' },
        },
        actionability: {
          score: { type: Number, default: 0 },
          maxScore: { type: Number, default: 4 },
          feedback: { type: String, default: '' },
        },
        timelinePlanning: {
          score: { type: Number, default: 0 },
          maxScore: { type: Number, default: 4 },
          feedback: { type: String, default: '' },
        },
        clarityBudgeting: {
          score: { type: Number, default: 0 },
          maxScore: { type: Number, default: 3 },
          feedback: { type: String, default: '' },
        },
      },
      summaryFeedback: { type: String, default: '' },
      status: {
        type: String,
        enum: ['PENDING', 'AI_EVALUATED', 'APPROVED'],
        default: 'PENDING',
      },
      evaluatedAt: { type: Date },
      approvedAt: { type: Date },
      approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    },
  },
  {
    timestamps: true,
  }
);

proposalSchema.index({ candidateUsername: 1 });
proposalSchema.index({ latestSubmittedAt: -1 });

module.exports = mongoose.model('Proposal', proposalSchema);
