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
        'DBU-2019-EXAM',
        'DBU2019-TOP16',
        'DBU-2019-01', 'DBU-2019-02', 'DBU-2019-03', 'DBU-2019-04',
        'DBU-2019-05', 'DBU-2019-06', 'DBU-2019-07', 'DBU-2019-08',
        'DBU-2019-09', 'DBU-2019-10', 'DBU-2019-11', 'DBU-2019-12',
        'DBU-2019-13', 'DBU-2019-14', 'DBU-2019-15', 'DBU-2019-16',
      ],
    },
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
