/** @format */
const mongoose = require('mongoose');

const EVENT_TYPES = ['HACKATHON', 'DEBATE', 'WORKSHOP', 'CULTURAL', 'SPORTS', 'CONFERENCE', 'COMPETITION'];
const EVENT_STATUSES = ['proposed', 'approved', 'ongoing', 'completed', 'cancelled'];

const jointEventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Event title is required'],
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    eventType: {
      type: String,
      required: [true, 'Event type is required'],
      enum: EVENT_TYPES,
      uppercase: true,
    },
    status: {
      type: String,
      enum: EVENT_STATUSES,
      default: 'proposed',
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    location: {
      type: String,
      trim: true,
    },
    // University code that is organising/leading this event (e.g. "DBU")
    leadUniversityCode: {
      type: String,
      required: [true, 'Lead university code is required'],
      uppercase: true,
    },
    // Array of participating university codes (e.g. ["DBU","AAU","BDU"])
    participatingUniversities: {
      type: [String],
      default: [],
    },
    // The DBU user who proposed the event
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Users who registered/expressed interest
    registeredUsers: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        registeredAt: { type: Date, default: Date.now },
        universityCode: { type: String, uppercase: true },
      },
    ],
    maxParticipants: {
      type: Number,
      default: 0, // 0 = unlimited
    },
    prizes: {
      type: String,
      trim: true,
    },
    requirements: {
      type: String,
      trim: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    bannerImage: {
      type: String,
    },
    adminApproved: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

jointEventSchema.index({ status: 1 });
jointEventSchema.index({ eventType: 1 });
jointEventSchema.index({ leadUniversityCode: 1 });
jointEventSchema.index({ startDate: 1 });

// Virtual: count of registered participants
jointEventSchema.virtual('participantCount').get(function () {
  return this.registeredUsers.length;
});

module.exports = mongoose.model('JointEvent', jointEventSchema);
