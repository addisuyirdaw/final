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
  },
  {
    timestamps: true,
  }
);

proposalSchema.index({ candidateUsername: 1 });
proposalSchema.index({ latestSubmittedAt: -1 });

module.exports = mongoose.model('Proposal', proposalSchema);
