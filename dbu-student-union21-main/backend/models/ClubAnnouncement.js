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
  }
}, { timestamps: true });

// Optimize lookups by clubId and sort by creation date
clubAnnouncementSchema.index({ clubId: 1, createdAt: -1 });

module.exports = mongoose.model('ClubAnnouncement', clubAnnouncementSchema);
