/** @format */
const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'eventModel',
      default: null,
      index: true,
    },
    eventModel: {
      type: String,
      enum: ['JointEvent', 'ClubEvent', 'Event'],
      default: 'ClubEvent',
    },
    clubId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Club',
      default: null,
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student ID is required'],
      index: true,
    },
    scannedAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['PRESENT', 'EXCUSED', 'ABSENT'],
      default: 'PRESENT',
    },
    sessionToken: {
      type: String,
      trim: true,
      index: true,
    },
    shortCode: {
      type: String,
      trim: true,
    },
    eventTitle: {
      type: String,
      trim: true,
      default: 'Club Activity Session',
    },
    clubName: {
      type: String,
      trim: true,
      default: 'General Session',
    },
    hoursCredit: {
      type: Number,
      default: 1,
      min: 0.5,
      max: 24,
    },
    academicYear: {
      type: String,
      default: '2025/2026',
    },
    verificationMethod: {
      type: String,
      enum: ['QR_SCAN', 'MANUAL_CODE', 'ADMIN_OVERRIDE'],
      default: 'QR_SCAN',
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate attendance for the same student on the same session
attendanceSchema.index({ studentId: 1, sessionToken: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
