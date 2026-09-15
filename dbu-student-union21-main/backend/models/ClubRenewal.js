const mongoose = require('mongoose');

const clubRenewalSchema = new mongoose.Schema({
  club: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Club',
    required: true
  },
  academicYear: {
    type: String,
    required: true,
    trim: true
  },
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['DRAFT', 'SUBMITTED', 'APPROVED', 'RETURNED'],
    default: 'DRAFT'
  },
  operatingIntent: {
    type: Boolean,
    default: false
  },
  presidentConfirmation: {
    type: Boolean,
    default: false
  },
  notes: {
    type: String,
    trim: true
  },
  coordinatorFeedback: {
    type: String,
    trim: true
  },
  submittedAt: {
    type: Date
  },
  reviewedAt: {
    type: Date
  }
}, {
  timestamps: true
});

clubRenewalSchema.index({ club: 1, academicYear: 1 }, { unique: true });
clubRenewalSchema.index({ status: 1 });

module.exports = mongoose.model('ClubRenewal', clubRenewalSchema);
