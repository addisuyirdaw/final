/** @format */
const mongoose = require('mongoose');

const universitySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'University name is required'],
      trim: true,
      unique: true,
    },
    code: {
      type: String,
      required: [true, 'University code is required'],
      trim: true,
      uppercase: true,
      unique: true,
      maxlength: [10, 'Code cannot exceed 10 characters'],
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
    },
    region: {
      type: String,
      trim: true,
    },
    website: {
      type: String,
      trim: true,
    },
    logoColor: {
      type: String,
      default: '#0284c7', // fallback brand colour shown in UI badges
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    studentCount: {
      type: Number,
      default: 0,
    },
    established: {
      type: Number, // year
    },
    description: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

universitySchema.index({ code: 1 });
universitySchema.index({ name: 1 });

module.exports = mongoose.model('University', universitySchema);
