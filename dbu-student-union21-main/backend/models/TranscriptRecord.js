/** @format */
const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    organization: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ['Academic', 'Leadership', 'Technology', 'Service', 'Cultural', 'Sports', 'Cross-Campus', 'Professional', 'Other'],
      default: 'Leadership',
    },
    role: {
      type: String,
      trim: true,
      default: 'Participant',
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      default: null,
    },
    hoursContributed: {
      type: Number,
      default: 1,
      min: 0,
    },
    verifiedBy: {
      type: String,
      trim: true,
      default: 'DBU Student Union Affairs',
    },
    status: {
      type: String,
      enum: ['VERIFIED', 'PENDING', 'REJECTED'],
      default: 'VERIFIED',
    },
  },
  { _id: true }
);

const leadershipRoleSchema = new mongoose.Schema(
  {
    clubName: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      required: true,
      trim: true,
    },
    academicYear: {
      type: String,
      default: '2025/2026',
    },
    period: {
      type: String,
      default: 'Sep 2025 - Jun 2026',
    },
    status: {
      type: String,
      default: 'Active',
    },
  },
  { _id: true }
);

const transcriptRecordSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student ID is required'],
      index: true,
    },
    academicYear: {
      type: String,
      default: '2025/2026',
    },
    activities: [activitySchema],
    leadershipRoles: [leadershipRoleSchema],
    honorsAndAwards: [
      {
        title: String,
        issuer: String,
        date: { type: Date, default: Date.now },
      },
    ],
    totalHours: {
      type: Number,
      default: 0,
    },
    issuedAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['DRAFT', 'OFFICIAL', 'ARCHIVED'],
      default: 'OFFICIAL',
    },
    verificationCode: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    digitalSignature: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('TranscriptRecord', transcriptRecordSchema);
