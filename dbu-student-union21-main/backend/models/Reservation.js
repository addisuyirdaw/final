const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resource',
    required: true
  },
  clubId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Club',
    required: true
  },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true,
    validate: {
      validator: function(v) {
        return this.startTime < v;
      },
      message: 'End time must be after start time'
    }
  },
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED'],
    default: 'PENDING'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes to support fast conflict detection and lookups
reservationSchema.index({ resourceId: 1, startTime: 1, endTime: 1 });
reservationSchema.index({ resourceId: 1, status: 1 });
reservationSchema.index({ clubId: 1, eventId: 1 });
reservationSchema.index({ startTime: 1 });

module.exports = mongoose.model('Reservation', reservationSchema);
