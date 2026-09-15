const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Resource name is required'],
    trim: true,
    maxlength: [100, 'Resource name cannot exceed 100 characters']
  },
  type: {
    type: String,
    enum: ['ROOM', 'AUDITORIUM', 'EQUIPMENT'],
    required: [true, 'Resource type is required']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  capacity: {
    type: Number,
    min: [1, 'Capacity must be at least 1']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes for active resources and searches
resourceSchema.index({ isActive: 1 });
resourceSchema.index({ type: 1, isActive: 1 });
resourceSchema.index({ name: 'text' });

module.exports = mongoose.model('Resource', resourceSchema);
