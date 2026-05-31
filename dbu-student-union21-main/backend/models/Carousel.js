const mongoose = require('mongoose');

const carouselSchema = new mongoose.Schema({
  imageUrl: {
    type: String,
    required: [true, 'Image URL is required'],
    trim: true
  },
  // Persistent base64 backup of the uploaded image — used for self-healing on ephemeral filesystems
  fileData: { type: String, select: false }, // base64 encoded image content
  fileName: { type: String },
  fileMimeType: { type: String },
  caption: {
    type: String,
    trim: true,
    maxlength: [200, 'Caption cannot exceed 200 characters'],
    default: ''
  },
  order: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

carouselSchema.index({ order: 1 });
carouselSchema.index({ isActive: 1 });

module.exports = mongoose.model('Carousel', carouselSchema);
