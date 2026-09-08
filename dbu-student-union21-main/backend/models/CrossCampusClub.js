/** @format */
const mongoose = require('mongoose');

/**
 * CrossCampusClub — represents clubs from universities OTHER than DBU.
 * Kept separate from the existing Club model to avoid any schema collision.
 */
const crossCampusClubSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Club name is required'],
      trim: true,
      maxlength: [120, 'Name cannot exceed 120 characters'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: ['Academic', 'Sports', 'Cultural', 'Technology', 'Service', 'Arts', 'Religious', 'Professional', 'Social', 'Other'],
    },
    universityCode: {
      type: String,
      required: [true, 'University code is required'],
      uppercase: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    memberCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    website: {
      type: String,
      trim: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    founded: {
      type: String,
      trim: true,
    },
    achievements: {
      type: [String],
      default: [],
    },
    tags: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

crossCampusClubSchema.index({ universityCode: 1 });
crossCampusClubSchema.index({ category: 1 });
crossCampusClubSchema.index({ isActive: 1 });

module.exports = mongoose.model('CrossCampusClub', crossCampusClubSchema);
