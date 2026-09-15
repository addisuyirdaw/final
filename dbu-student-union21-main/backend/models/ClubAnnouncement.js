const mongoose = require('mongoose');

const clubAnnouncementSchema = new mongoose.Schema({
  clubId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Club',
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: [150, 'Title cannot be more than 150 characters']
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: [3000, 'Content cannot exceed 3000 characters']
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['GENERAL', 'ACTION_REQUIRED', 'EVENT_UPDATE', 'PROJECT_UPDATE', 'DEADLINE'],
    default: 'GENERAL'
  },
  audienceType: {
    type: String,
    enum: ['ALL_MEMBERS', 'LEADERSHIP'],
    default: 'ALL_MEMBERS'
  },
  relatedEvent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Club.events'
  },
  relatedProject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  relatedTask: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  },
  requiresAcknowledgement: {
    type: Boolean,
    default: false
  },
  deadline: {
    type: Date
  },
  acknowledgements: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    date: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

// Optimize lookups by clubId and sort by creation date
clubAnnouncementSchema.index({ clubId: 1, createdAt: -1 });

module.exports = mongoose.model('ClubAnnouncement', clubAnnouncementSchema);
