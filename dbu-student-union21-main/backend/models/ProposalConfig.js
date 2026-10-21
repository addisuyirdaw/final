/** @format */
const mongoose = require('mongoose');

const proposalConfigSchema = new mongoose.Schema(
  {
    _key: {
      type: String,
      default: 'proposal_settings',
      unique: true,
    },
    // Nullable timestamp: null represents "Deadline not set"
    deadline: {
      type: Date,
      default: null,
    },
    timezone: {
      type: String,
      default: 'Africa/Addis_Ababa',
    },
    // Allowed Candidate Exam Codes for 2019 Batch 16 Top Performers
    allowedExamCodes: {
      type: [String],
      default: [
        '16', '23', '02', '32', '37', '38', '22', '19', '04', '30', '24', '20', '03', '36', '34', '15'
      ],
    },
    // Dynamically disabled / inactive candidate exam codes
    disabledExamCodes: {
      type: [String],
      default: [],
    },
    // Dynamic editable authorized candidate pairs
    candidatePairs: [
      {
        examNum: { type: Number },
        canonicalCode: { type: String, required: true },
        studentId: { type: String, required: true },
        isActive: { type: Boolean, default: true },
      },
    ],
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedByUsername: {
      type: String,
    },
    updatedAtEthiopia: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('ProposalConfig', proposalConfigSchema);
