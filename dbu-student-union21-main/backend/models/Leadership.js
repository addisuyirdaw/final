const mongoose = require('mongoose');

const bioDetailSchema = new mongoose.Schema({
  label: { type: String, required: true },
  text: { type: String, required: true }
}, { _id: false });

const leadershipSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  role: {
    type: String,
    required: [true, 'Role is required'],
    trim: true
  },
  roleSlug: {
    type: String,
    unique: true,
    required: true
  },
  imageUrl: {
    type: String,
    required: [true, 'Image URL is required'],
  },
  bio: {
    type: String,
    default: ''
  },
  priority: {
    type: Number,
    default: 0
  },
  bioDetails: [bioDetailSchema],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Pre-save middleware to generate roleSlug if not provided or updated
leadershipSchema.pre('save', function(next) {
  if (this.isModified('role')) {
    this.roleSlug = this.role.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  }
  next();
});

// Sort by priority descending (higher number = higher priority), then by createdAt
leadershipSchema.index({ priority: -1, createdAt: 1 });

module.exports = mongoose.model('Leadership', leadershipSchema);
