/** @format */
const mongoose = require('mongoose');

const candidatePairSchema = new mongoose.Schema(
  {
    examNum: Number,
    examCode: String,
    canonicalCode: String,
    studentId: String,
    name: String,
    candidateName: String,
    department: String,
    year: String,
    academicYear: String,
    position: { type: String, default: 'Sira Asfetsami' },
    isActive: { type: Boolean, default: true },
    allowResubmit: { type: Boolean, default: true },
  },
  { _id: false }
);

const proposalConfigSchema = new mongoose.Schema(
  {
    _key: {
      type: String,
      default: 'proposal_settings',
      unique: true,
    },
    key: {
      type: String,
      default: 'candidate_whitelist',
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
    allowAllResubmit: {
      type: Boolean,
      default: true,
    },
    candidate20Reset: {
      type: Boolean,
      default: false,
    },
    // Allowed Candidate Exam Codes for 2019 Batch 16 Top Performers
    allowedExamCodes: {
      type: [String],
      default: [
        '16', '23', '02', '32', '37', '38', '22', '19',
        '04', '30', '24', '20', '03', '36', '34', '15',
      ],
    },
    disabledExamCodes: {
      type: [String],
      default: [],
    },
    candidates: [candidatePairSchema],
    candidatePairs: [candidatePairSchema],
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
    strict: false,
  }
);

module.exports = mongoose.model('ProposalConfig', proposalConfigSchema);
