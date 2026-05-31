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
  // priority: lower number = higher rank in the directory
  // EXECUTIVES:    University President=1, Vice Academic=2, Others=3
  // SERVICES:      Dean of Student Affairs=1, Dept Heads=2, Advisors=3
  // STUDENT UNION: President=1, Vice President=2, Secretary=3, Coordinators=4
  priority: {
    type: Number,
    default: 10
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

// Sort by priority ascending (lower number = higher rank), then newest first
leadershipSchema.index({ priority: 1, createdAt: -1 });

module.exports = mongoose.model('Leadership', leadershipSchema);
