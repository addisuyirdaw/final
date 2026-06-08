const mongoose = require('mongoose');

const systemConfigSchema = new mongoose.Schema({
  // Singleton key — there is always exactly one document
  _key: {
    type: String,
    default: 'global',
    unique: true
  },
  // Master switch: when false, all Election Portal UI disappears for every user
  electionVisible: {
    type: Boolean,
    default: true
  },
  // Master switch: when false, Union & Leadership dropdown disappears
  leadershipVisible: {
    type: Boolean,
    default: true
  },
  // Master switch: when false, Clubs module/navigation disappears
  clubsVisible: {
    type: Boolean,
    default: true
  },
  // Master switch: when false, Services module/navigation disappears
  servicesVisible: {
    type: Boolean,
    default: true
  },
  // Master switch: when false, Complaints module/navigation disappears
  complaintsVisible: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('SystemConfig', systemConfigSchema);
