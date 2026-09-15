const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  date: {
    type: Date,
    required: true
  },
  location: {
    type: String,
    trim: true
  },
  startTime: {
    type: Date
  },
  endTime: {
    type: Date,
    validate: {
      validator: function(v) {
        if (!this.startTime || !v) return true;
        return this.startTime < v;
      },
      message: 'End time must be after start time'
    }
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resource',
    default: null
  },
  attendees: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  expectedAttendance: {
    type: Number,
    default: 0,
    min: [0, 'Expected attendance cannot be negative']
  },
  hasExternalGuests: {
    type: Boolean,
    default: false
  },
  isOffCampus: {
    type: Boolean,
    default: false
  },
  riskFlags: [{
    code: String,
    generatedAt: Date
  }],
  status: {
    type: String,
    enum: ['draft', 'pending_approval', 'approved', 'rejected', 'planned', 'ongoing', 'completed', 'cancelled'],
    default: 'draft'
  },
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  submittedAt: {
    type: Date,
    default: null
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reviewedAt: {
    type: Date,
    default: null
  },
  rejectionReason: {
    type: String,
    default: null
  },
  attendanceCode: {
    type: String,
    trim: true
  },
  activeCheckIn: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

const clubSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a club name'],
    trim: true,
    unique: true,
    maxlength: [100, 'Club name cannot be more than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Please provide a club description'],
    trim: true,
    maxlength: [1000, 'Description cannot be more than 1000 characters']
  },
  category: {
    type: String,
    required: [true, 'Please select a category'],
    enum: ['Academic', 'Sports', 'Cultural', 'Technology', 'Service', 'Arts', 'Religious', 'Professional', 'Social', 'Other']
  },
  founded: {
    type: String,
    required: true
  },
  image: {
    type: String
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    fullName: {
      type: String,
      required: true
    },
    department: {
      type: String,
      required: true
    },
    year: {
      type: String,
      required: true
    },
    background: {
      type: String,
      trim: true
    },
    role: {
      type: String,
      enum: ['member', 'officer', 'president', 'vice_president', 'secretary', 'treasurer'],
      default: 'member'
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'restricted', 'Inactive_Ghost'],
      default: 'pending'
    },
    attendanceCount: {
      type: Number,
      default: 0
    },
    absentStreak: {
      type: Number,
      default: 0
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  leadership: {
    president: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    vicePresident: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    secretary: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    treasurer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  events: [eventSchema],
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending_approval', 'suspended'],
    default: 'pending_approval'
  },
  contactEmail: {
    type: String,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email'
    ]
  },
  officeLocation: {
    type: String,
    trim: true
  },
  contactPhone: {
    type: String,
    trim: true
  },
  website: {
    type: String,
    trim: true
  },
  meetingSchedule: {
    type: String,
    trim: true
  },
  requirements: {
    type: String,
    trim: true
  },
  achievements: [{
    title: String,
    description: String,
    date: Date
  }],
  socialMedia: {
    facebook: String,
    instagram: String,
    twitter: String,
    telegram: String
  },
  budget: {
    allocated: {
      type: Number,
      default: 0
    },
    spent: {
      type: Number,
      default: 0
    },
    remaining: {
      type: Number,
      default: 0
    }
  },
  minAttendanceForCertificate: {
    type: Number,
    default: 75
  },
  totalEventsHeld: {
    type: Number,
    default: 0
  },
  certificateDownloadEnabled: {
    type: Boolean,
    default: true
  },
  requireApproval: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for better query performance
clubSchema.index({ name: 1 });
clubSchema.index({ category: 1 });
clubSchema.index({ status: 1 });
clubSchema.index({ 'members.user': 1 });

// Virtual for member count
clubSchema.virtual('memberCount').get(function () {
  return this.members.filter(member => member.status === 'approved').length;
});

// Virtual for event count
clubSchema.virtual('eventCount').get(function () {
  return this.events.length;
});

// Update budget remaining when spent changes
clubSchema.pre('save', function (next) {
  if (this.isModified('budget.spent') || this.isModified('budget.allocated')) {
    this.budget.remaining = this.budget.allocated - this.budget.spent;
  }
  next();
});

module.exports = mongoose.model('Club', clubSchema);