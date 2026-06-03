const mongoose = require('mongoose');

const activityReportSchema = new mongoose.Schema({
  club: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Club',
    required: true
  },
  title: {
    type: String,
    required: [true, 'Please provide a title for the activity report'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Please provide a description of the activity'],
    trim: true,
    maxlength: [2000, 'Description cannot be more than 2000 characters']
  },
  date: {
    type: Date,
    required: [true, 'Please provide the date of the activity']
  },
  photos: [{
    type: String
  }],
  documentUrl: {
    type: String
  },
  fileUrl: {
    type: String
  },
  fileData: {
    type: String,
    select: false
  },
  fileName: {
    type: String
  },
  fileMimeType: {
    type: String
  },
  status: {
    type: String,
    enum: ['PENDING_MANAGER', 'PENDING_REVIEW', 'RETURNED', 'PUBLISHED', 'APPROVED'],
    default: 'PENDING_REVIEW'
  },
  feedback: {
    type: String,
    trim: true
  },
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reportType: {
    type: String,
    enum: ['ACTIVITY', 'ANNUAL_REPORT', 'DOCUMENT', 'ADMIN_REQUEST'],
    default: 'ACTIVITY'
  }
}, {
  timestamps: true
});

// Index for better query performance
activityReportSchema.index({ club: 1, status: 1 });
activityReportSchema.index({ status: 1 });
activityReportSchema.index({ submittedBy: 1 });

module.exports = mongoose.model('ActivityReport', activityReportSchema);
