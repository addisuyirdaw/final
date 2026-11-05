const mongoose = require('mongoose');

const clubProposalSchema = new mongoose.Schema(
  {
    referenceId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },
    // Proposer Information
    proposer: {
      fullName: {
        type: String,
        required: [true, 'Full name is required'],
        trim: true
      },
      studentId: {
        type: String,
        required: [true, 'Student ID is required'],
        trim: true,
        index: true
      },
      department: {
        type: String,
        required: [true, 'Department is required'],
        trim: true
      },
      year: {
        type: String,
        required: [true, 'Academic year is required'],
        trim: true
      },
      phone: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true
      },
      email: {
        type: String,
        required: [true, 'Email address is required'],
        trim: true,
        lowercase: true
      },
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
      }
    },
    // Proposed Club Information
    proposedClub: {
      name: {
        type: String,
        required: [true, 'Proposed club name is required'],
        trim: true,
        index: true
      },
      category: {
        type: String,
        required: [true, 'Club category is required'],
        trim: true,
        default: 'Academic'
      },
      shortDescription: {
        type: String,
        required: [true, 'Short description is required'],
        trim: true
      },
      rationale: {
        type: String,
        required: [true, 'Reason for establishing the club is required'],
        trim: true
      },
      objectives: {
        type: String,
        required: [true, 'Main objectives are required'],
        trim: true
      },
      activities: {
        type: String,
        required: [true, 'Proposed activities and programs are required'],
        trim: true
      },
      benefits: {
        type: String,
        required: [true, 'Expected student benefits are required'],
        trim: true
      },
      estimatedFoundingMembers: {
        type: Number,
        required: [true, 'Estimated founding member count is required'],
        min: [1, 'At least 1 founding member is required'],
        default: 10
      }
    },
    // Founding Team
    foundingTeam: {
      foundingMembers: {
        type: String,
        trim: true,
        default: ''
      },
      proposedLeader: {
        type: String,
        required: [true, 'Proposed Club President or Coordinator is required'],
        trim: true
      },
      facultyAdvisor: {
        type: String,
        trim: true,
        default: ''
      }
    },
    // Review Workflow
    status: {
      type: String,
      enum: [
        'Pending Review',
        'Under Review',
        'Additional Information Requested',
        'Approved',
        'Rejected'
      ],
      default: 'Pending Review',
      index: true
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
      trim: true,
      default: ''
    },
    additionalInfoRequest: {
      type: String,
      trim: true,
      default: ''
    },
    adminNotes: [
      {
        note: { type: String, required: true, trim: true },
        author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        authorName: { type: String, default: 'Administrator' },
        createdAt: { type: Date, default: Date.now }
      }
    ],
    // Club Creation Association
    isClubCreated: {
      type: Boolean,
      default: false,
      index: true
    },
    createdClubId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Club',
      default: null
    },
    clubCreatedAt: {
      type: Date,
      default: null
    },
    clubCreatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Helpful indexes
clubProposalSchema.index({ status: 1, createdAt: -1 });
clubProposalSchema.index({ 'proposer.studentId': 1, 'proposedClub.name': 1 });

module.exports = mongoose.model('ClubProposal', clubProposalSchema);

