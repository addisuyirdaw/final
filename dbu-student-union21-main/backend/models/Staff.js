const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
  name: { type: String, required: true },
  title: { type: String, required: true },
  pageGroup: {
    type: String,
    required: true,
    enum: ['university_exec', 'student_union', 'student_services', 'dormitory']
  },
  department: { type: String, required: true }, // Subcategories inside pages (e.g., Office of the Dean)
  background: { type: String, required: true }, // History/Credentials
  responsibility: { type: String, required: true }, // Specific job duties / Functions
  imageUrl: { type: String, required: true },
  // Persistent base64 backup of the uploaded image — used for self-healing on ephemeral filesystems
  fileData: { type: String, select: false }, // base64 encoded image content
  fileName: { type: String },
  fileMimeType: { type: String },
  // priority: lower number = higher rank (1 = top executive, 10 = default)
  // EXECUTIVES:    University President=1, Vice Academic=2, Others=3
  // SERVICES:      Dean of Student Affairs=1, Dept Heads=2, Advisors=3
  // STUDENT UNION: President=1, Vice President=2, Secretary=3, Coordinators=4
  priority: { type: Number, default: 10 },
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Index: sort by priority ascending (1=highest rank) then newest first
staffSchema.index({ priority: 1, createdAt: -1 });
staffSchema.index({ pageGroup: 1, priority: 1, createdAt: -1 });

module.exports = mongoose.model('Staff', staffSchema);
