/** @format */
const mongoose = require('mongoose');
const crypto = require('crypto');

// ─────────────────────────────────────────────
// Counter sub-document for auto-incrementing cert number
// ─────────────────────────────────────────────
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});
const Counter = mongoose.model('CertCounter', counterSchema);

// ─────────────────────────────────────────────
// Certificate Schema
// ─────────────────────────────────────────────
const certificateSchema = new mongoose.Schema(
  {
    // Human-readable unique ID: DBU-SS-YYYY-NNNNNN
    certificateNumber: {
      type: String,
      unique: true,
      index: true,
      required: true,
    },

    // Random 12-char code for secondary verification: XXXX-XXXX-XXXX
    verificationCode: {
      type: String,
      required: true,
      index: true,
    },

    // Student info (denormalised so the record is self-contained even if User is deleted)
    studentId: { type: String, required: true, index: true },   // User._id
    studentName: { type: String, required: true, trim: true },
    studentUsername: { type: String, trim: true },              // dbu + 8 digits
    studentDepartment: { type: String, trim: true },
    studentYear: { type: String, trim: true },
    profileImage: { type: String },                              // URL shown on verify page

    // Club info (denormalised)
    clubId: { type: String, required: true, index: true },      // Club._id
    clubName: { type: String, required: true, trim: true },

    // Role displayed on certificate
    role: { type: String, required: true, trim: true },

    // Bilingual display strings stored for consistent re-render
    roleAm: { type: String, trim: true },
    clubNameAm: { type: String, trim: true },

    // Service period
    issueDate: { type: Date, required: true, default: Date.now },
    joinedAt: { type: Date },
    startDateGC: { type: String },
    endDateGC: { type: String },
    startDateEC: { type: String },
    endDateEC: { type: String },

    // Admin who issued this certificate
    issuedBy: { type: String },          // User._id of the admin
    issuedByName: { type: String },      // Name, for display

    // Status lifecycle
    status: {
      type: String,
      enum: ['VALID', 'REVOKED', 'CANCELLED', 'PENDING'],
      default: 'VALID',
      index: true,
    },

    // Reason stored when revoked
    revokeReason: { type: String, trim: true },
    revokedAt: { type: Date },
    revokedBy: { type: String },

    // HMAC-SHA256 of: certificateNumber|studentId|clubId|role|issueDate
    // Generated on the backend using CERTIFICATE_HMAC_SECRET — never exposed
    verificationHash: { type: String, required: true },
  },
  { timestamps: true }
);

// ─────────────────────────────────────────────
// Static helpers
// ─────────────────────────────────────────────

/**
 * Atomically get the next sequential certificate number for this year.
 * e.g. DBU-SS-2026-000001
 */
certificateSchema.statics.generateCertificateNumber = async function () {
  const year = new Date().getFullYear();
  const counterId = `cert_${year}`;
  const counter = await Counter.findByIdAndUpdate(
    counterId,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  const seq = String(counter.seq).padStart(6, '0');
  return `DBU-SS-${year}-${seq}`;
};

/**
 * Generate a random verification code in XXXX-XXXX-XXXX format.
 */
certificateSchema.statics.generateVerificationCode = function () {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0,O,1,I to avoid confusion
  const rand = (n) =>
    Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${rand(4)}-${rand(4)}-${rand(4)}`;
};

/**
 * Compute HMAC-SHA256 of the certificate's key fields.
 * Uses CERTIFICATE_HMAC_SECRET from env — never sent to the client.
 */
certificateSchema.statics.computeHash = function (certNumber, studentId, clubId, role, issueDate) {
  const secret = process.env.CERTIFICATE_HMAC_SECRET;
  if (!secret) throw new Error('CERTIFICATE_HMAC_SECRET is not set in environment');
  const payload = [certNumber, studentId, clubId, role, new Date(issueDate).toISOString()].join('|');
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
};

/**
 * Verify the stored hash against the live fields.
 * Returns true if the certificate has not been tampered with.
 */
certificateSchema.methods.verifyIntegrity = function () {
  try {
    const expected = mongoose.model('Certificate').computeHash(
      this.certificateNumber,
      this.studentId,
      this.clubId,
      this.role,
      this.issueDate
    );
    return expected === this.verificationHash;
  } catch {
    return false;
  }
};

module.exports = mongoose.model('Certificate', certificateSchema);
