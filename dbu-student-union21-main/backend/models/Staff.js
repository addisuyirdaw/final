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
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Staff', staffSchema);
