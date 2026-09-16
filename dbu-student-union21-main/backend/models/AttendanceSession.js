/** @format */
const mongoose = require('mongoose');

const attendanceSessionSchema = new mongoose.Schema(
  {
    sessionToken: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    shortCode: {
      type: String,
      required: true,
      index: true,
      uppercase: true,
      trim: true,
    },
    clubId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Club',
      default: null,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    eventTitle: {
      type: String,
      required: true,
      default: 'General Club Session',
      trim: true,
    },
    clubName: {
      type: String,
      default: 'DBU Student Activity',
      trim: true,
    },
    hoursCredit: {
      type: Number,
      default: 1,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    closedAt: {
      type: Date,
      default: null,
    },
    closedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    challengeSecret: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Auto-expire sessions after 24 hours
attendanceSessionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

module.exports = mongoose.model('AttendanceSession', attendanceSessionSchema);
