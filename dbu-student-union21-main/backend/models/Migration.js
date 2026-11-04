const mongoose = require('mongoose');

const migrationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    batch: {
      type: Number,
      required: true,
      default: 1,
    },
    status: {
      type: String,
      enum: ['pending', 'applied', 'failed'],
      default: 'applied',
    },
    appliedAt: {
      type: Date,
      default: Date.now,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Migration', migrationSchema);

