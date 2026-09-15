const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    clubId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Club',
      required: [true, 'Project must belong to a club'],
    },
    title: {
      type: String,
      required: [true, 'Please provide a project title'],
      trim: true,
      maxlength: [150, 'Title cannot be more than 150 characters'],
    },
    description: {
      type: String,
      required: [true, 'Please provide a project description'],
      trim: true,
      maxlength: [2000, 'Description cannot be more than 2000 characters'],
    },
    status: {
      type: String,
      enum: ['planning', 'active', 'completed', 'cancelled'],
      default: 'planning',
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for query performance — following existing project convention
projectSchema.index({ clubId: 1 });
projectSchema.index({ clubId: 1, status: 1 });
projectSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Project', projectSchema);
