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
    resubmissionAllowed: {
      type: Boolean,
      default: true,
    },
    submittedBy: {
      type: String,
      trim: true,
    },
    submittedByRole: {
      type: String,
      default: 'candidate',
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
      maxTotal: { type: Number, default: 15.0 },
      isDoubleBlind: { type: Boolean, default: true },
      evaluationToken: { type: String, default: '' },
      rubricVersion: { type: String, default: 'Provisional 15-Point Baseline (4-4-4-3)' },
      strategicObjectives: {
        score: { type: Number, default: null },
        maxScore: { type: Number, default: 4 },
        citation: { type: String, default: '' },
        section: { type: String, default: '' },
        strengths: { type: String, default: '' },
        weaknesses: { type: String, default: '' },
        pointDeductions: { type: String, default: '' },
        feedback: { type: String, default: '' },
      },
      actionability: {
        score: { type: Number, default: null },
        maxScore: { type: Number, default: 4 },
        citation: { type: String, default: '' },
        section: { type: String, default: '' },
        strengths: { type: String, default: '' },
        weaknesses: { type: String, default: '' },
        pointDeductions: { type: String, default: '' },
        feedback: { type: String, default: '' },
      },
      timeline: {
        score: { type: Number, default: null },
        maxScore: { type: Number, default: 4 },
        citation: { type: String, default: '' },
        section: { type: String, default: '' },
        strengths: { type: String, default: '' },
        weaknesses: { type: String, default: '' },
        pointDeductions: { type: String, default: '' },
        feedback: { type: String, default: '' },
      },
      budgetingClarity: {
        score: { type: Number, default: null },
        maxScore: { type: Number, default: 3 },
        citation: { type: String, default: '' },
        section: { type: String, default: '' },
        strengths: { type: String, default: '' },
        weaknesses: { type: String, default: '' },
        pointDeductions: { type: String, default: '' },
        feedback: { type: String, default: '' },
      },
      riskAssessment: { type: String, default: '' },
      committeeRecommendation: { type: String, default: '' },
      criteria: {
        strategicObjectives: {
          score: { type: Number, default: null },
          maxScore: { type: Number, default: 4 },
          citation: { type: String, default: '' },
          section: { type: String, default: '' },
          strengths: { type: String, default: '' },
          weaknesses: { type: String, default: '' },
          pointDeductions: { type: String, default: '' },
          feedback: { type: String, default: '' },
        },
        actionability: {
          score: { type: Number, default: null },
          maxScore: { type: Number, default: 4 },
          citation: { type: String, default: '' },
          section: { type: String, default: '' },
          strengths: { type: String, default: '' },
          weaknesses: { type: String, default: '' },
          pointDeductions: { type: String, default: '' },
          feedback: { type: String, default: '' },
        },
        timeline: {
          score: { type: Number, default: null },
          maxScore: { type: Number, default: 4 },
          citation: { type: String, default: '' },
          section: { type: String, default: '' },
          strengths: { type: String, default: '' },
          weaknesses: { type: String, default: '' },
          pointDeductions: { type: String, default: '' },
          feedback: { type: String, default: '' },
        },
        timelinePlanning: {
          score: { type: Number, default: null },
          maxScore: { type: Number, default: 4 },
          citation: { type: String, default: '' },
          section: { type: String, default: '' },
          strengths: { type: String, default: '' },
          weaknesses: { type: String, default: '' },
          pointDeductions: { type: String, default: '' },
          feedback: { type: String, default: '' },
        },
        budgetingClarity: {
          score: { type: Number, default: null },
          maxScore: { type: Number, default: 3 },
          citation: { type: String, default: '' },
          section: { type: String, default: '' },
          strengths: { type: String, default: '' },
          weaknesses: { type: String, default: '' },
          pointDeductions: { type: String, default: '' },
          feedback: { type: String, default: '' },
        },
        clarityBudgeting: {
          score: { type: Number, default: null },
          maxScore: { type: Number, default: 3 },
          citation: { type: String, default: '' },
          section: { type: String, default: '' },
          strengths: { type: String, default: '' },
          weaknesses: { type: String, default: '' },
          pointDeductions: { type: String, default: '' },
          feedback: { type: String, default: '' },
        },
      },
      summary: { type: String, default: '' },
      summaryFeedback: { type: String, default: '' },
      messageAm: { type: String, default: '' },
      isReadFailed: { type: Boolean, default: false },
      isAiUnavailable: { type: Boolean, default: false },
      aiDraft: { type: mongoose.Schema.Types.Mixed },
      history: [
        {
          changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          changedByUsername: String,
          changedByRole: String,
          changedAt: { type: Date, default: Date.now },
          action: String,
          previousScore: Number,
          newScore: Number,
          previousCriteria: mongoose.Schema.Types.Mixed,
          newCriteria: mongoose.Schema.Types.Mixed,
          reason: String,
        },
      ],
      status: {
        type: String,
        enum: ['PENDING', 'AI_EVALUATED', 'APPROVED', 'READ_FAILED', 'AI_UNAVAILABLE', 'NEEDS_HUMAN_REVIEW'],
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
