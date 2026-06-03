/** @format */
const mongoose = require('mongoose');

const templateSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a template title'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      default: '',
    },
    category: {
      type: String,
      enum: [
        'Annual Report',
        'Budget Request',
        'Event Proposal',
        'Membership Form',
        'Activity Plan',
        'Financial Statement',
        'Other',
      ],
      default: 'Other',
    },
    pdfUrl: {
      type: String,
      required: true,
    },
    // Base64 backup so the file survives ephemeral Render filesystem resets
    fileData: {
      type: String,
      select: false, // only fetched when explicitly requested
    },
    fileName: {
      type: String,
    },
    fileSize: {
      type: Number, // bytes
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    uploadedByName: {
      type: String,
      default: 'Admin',
    },
    downloadCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Index for fast fetching
templateSchema.index({ createdAt: -1 });
templateSchema.index({ category: 1 });

module.exports = mongoose.model('Template', templateSchema);
