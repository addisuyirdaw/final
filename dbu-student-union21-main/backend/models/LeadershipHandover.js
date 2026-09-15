const mongoose = require('mongoose');

const leadershipHandoverSchema = new mongoose.Schema({
  club: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Club',
    required: true
  },
  termYear: {
    type: String,
    trim: true
  },
  outgoingPresident: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  incomingPresident: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  status: {
    type: String,
    enum: ['DRAFT', 'SUBMITTED', 'ACCEPTED'],
    default: 'DRAFT'
  },
  achievements: {
    type: String,
    trim: true,
    default: ''
  },
  challenges: {
    type: String,
    trim: true,
    default: ''
  },
  lessonsLearned: {
    type: String,
    trim: true,
    default: ''
  },
  recommendations: {
    type: String,
    trim: true,
    default: ''
  },
  pendingDeadlines: {
    type: String,
    trim: true,
    default: ''
  },
  keyRelationships: {
    type: String,
    trim: true,
    default: ''
  }
}, {
  timestamps: true
});

leadershipHandoverSchema.index({ club: 1 });
leadershipHandoverSchema.index({ outgoingPresident: 1 });
leadershipHandoverSchema.index({ incomingPresident: 1 });
leadershipHandoverSchema.index({ status: 1 });

module.exports = mongoose.model('LeadershipHandover', leadershipHandoverSchema);
