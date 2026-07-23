/** @format */
const express = require('express');
const Certificate = require('../models/Certificate');
const User = require('../models/User');
const { protect, adminOnly, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// ────────────────────────────────────────────────────────────────────────────
// POST /api/certificates/issue
// Issue (or retrieve existing) certificate for a student + club + role
// Auth: logged-in (any user can request their own; admin can issue for others)
// ────────────────────────────────────────────────────────────────────────────
router.post('/issue', protect, async (req, res) => {
  try {
    const {
      studentId,
      studentName,
      studentUsername,
      studentDepartment,
      studentYear,
      profileImage,
      clubId,
      clubName,
      clubNameAm,
      role,
      roleAm,
      joinedAt,
      startDateGC,
      endDateGC,
      startDateEC,
      endDateEC,
    } = req.body;

    if (!studentId || !clubId || !role || !studentName || !clubName) {
      return res.status(400).json({ success: false, message: 'studentId, clubId, role, studentName and clubName are required' });
    }

    // ── Idempotency: return existing VALID certificate for same student+club+role ──
    const existing = await Certificate.findOne({
      studentId,
      clubId,
      role,
      status: 'VALID',
    });

    if (existing) {
      return res.status(200).json({
        success: true,
        isExisting: true,
        certificate: {
          certificateNumber: existing.certificateNumber,
          verificationCode: existing.verificationCode,
          status: existing.status,
          issueDate: existing.issueDate,
          studentName: existing.studentName,
          clubName: existing.clubName,
          role: existing.role,
          startDateGC: existing.startDateGC,
          endDateGC: existing.endDateGC,
          startDateEC: existing.startDateEC,
          endDateEC: existing.endDateEC,
        },
      });
    }

    // ── Generate unique identifiers ──
    const certificateNumber = await Certificate.generateCertificateNumber();
    const verificationCode = Certificate.generateVerificationCode();
    const issueDate = new Date();

    // ── Compute server-side HMAC hash (secret never leaves the backend) ──
    const verificationHash = Certificate.computeHash(
      certificateNumber,
      studentId,
      clubId,
      role,
      issueDate
    );

    const cert = await Certificate.create({
      certificateNumber,
      verificationCode,
      studentId,
      studentName,
      studentUsername,
      studentDepartment,
      studentYear,
      profileImage,
      clubId,
      clubName,
      clubNameAm,
      role,
      roleAm,
      issueDate,
      joinedAt: joinedAt ? new Date(joinedAt) : undefined,
      startDateGC,
      endDateGC,
      startDateEC,
      endDateEC,
      issuedBy: req.user._id?.toString() || req.user.id?.toString(),
      issuedByName: req.user.name,
      verificationHash,
    });

    return res.status(201).json({
      success: true,
      isExisting: false,
      certificate: {
        certificateNumber: cert.certificateNumber,
        verificationCode: cert.verificationCode,
        status: cert.status,
        issueDate: cert.issueDate,
        studentName: cert.studentName,
        clubName: cert.clubName,
        role: cert.role,
        startDateGC: cert.startDateGC,
        endDateGC: cert.endDateGC,
        startDateEC: cert.startDateEC,
        endDateEC: cert.endDateEC,
      },
    });
  } catch (err) {
    console.error('Certificate issue error:', err);
    return res.status(500).json({ success: false, message: 'Failed to issue certificate', error: err.message });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// GET /api/certificates/verify/:certNumber
// Public endpoint — scanned via QR or entered manually
// Returns enough info to display the verification page; NO secret fields
// ────────────────────────────────────────────────────────────────────────────
router.get('/verify/:certNumber', async (req, res) => {
  try {
    const { certNumber } = req.params;
    console.log('🔍 Public verification request received for certNumber:', certNumber);

    const cert = await Certificate.findOne({
      certificateNumber: certNumber.trim().toUpperCase(),
    });

    if (!cert) {
      return res.status(404).json({
        success: false,
        found: false,
        message: 'Certificate not found. This certificate number does not exist in the DBU Student Union registry.',
      });
    }

    // Verify HMAC integrity (detect any DB-level tampering)
    const isIntact = cert.verifyIntegrity();

    if (!isIntact) {
      return res.status(200).json({
        success: true,
        found: true,
        tampered: true,
        status: 'INVALID',
        message: 'Certificate data integrity check failed. This record may have been tampered with.',
        certificate: {
          certificateNumber: cert.certificateNumber,
          status: 'INVALID',
        },
      });
    }

    // Fetch fresh profile image from User record if available
    let profileImage = cert.profileImage;
    try {
      const user = await User.findById(cert.studentId).select('profileImage studentId');
      if (user?.profileImage) profileImage = user.profileImage;
    } catch { /* non-fatal */ }

    return res.status(200).json({
      success: true,
      found: true,
      tampered: false,
      status: cert.status,
      certificate: {
        certificateNumber: cert.certificateNumber,
        verificationCode: cert.verificationCode,
        studentName: cert.studentName,
        studentUsername: cert.studentUsername,
        studentDepartment: cert.studentDepartment,
        studentYear: cert.studentYear,
        profileImage,
        clubName: cert.clubName,
        role: cert.role,
        issueDate: cert.issueDate,
        startDateGC: cert.startDateGC,
        endDateGC: cert.endDateGC,
        issuedByName: cert.issuedByName,
        status: cert.status,
        revokeReason: cert.status === 'REVOKED' ? cert.revokeReason : undefined,
        revokedAt: cert.status === 'REVOKED' ? cert.revokedAt : undefined,
        createdAt: cert.createdAt,
      },
    });
  } catch (err) {
    console.error('Certificate verify error:', err);
    return res.status(500).json({ success: false, message: 'Verification failed', error: err.message });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// GET /api/certificates
// Admin: list all certificates, filterable
// ────────────────────────────────────────────────────────────────────────────
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const { search, status, page = 1, limit = 30 } = req.query;
    const query = {};

    if (status) query.status = status;
    if (search) {
      query.$or = [
        { certificateNumber: { $regex: search, $options: 'i' } },
        { studentName: { $regex: search, $options: 'i' } },
        { studentUsername: { $regex: search, $options: 'i' } },
        { clubName: { $regex: search, $options: 'i' } },
        { verificationCode: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [certs, total] = await Promise.all([
      Certificate.find(query)
        .select('-verificationHash')   // never expose the hash
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Certificate.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      certificates: certs,
    });
  } catch (err) {
    console.error('Certificate list error:', err);
    return res.status(500).json({ success: false, message: 'Failed to list certificates' });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// GET /api/certificates/student/:studentId
// Get all certificates for a specific student (auth required, own or admin)
// ────────────────────────────────────────────────────────────────────────────
router.get('/student/:studentId', protect, async (req, res) => {
  try {
    const { studentId } = req.params;
    const requesterId = req.user._id?.toString() || req.user.id?.toString();

    // Only the student themselves or an admin can view
    if (studentId !== requesterId && !req.user.isAdmin) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const certs = await Certificate.find({ studentId })
      .select('-verificationHash')
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, certificates: certs });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch student certificates' });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// POST /api/certificates/revoke
// Admin: revoke a certificate
// ────────────────────────────────────────────────────────────────────────────
router.post('/revoke', protect, adminOnly, async (req, res) => {
  try {
    const { certificateNumber, reason } = req.body;
    if (!certificateNumber) {
      return res.status(400).json({ success: false, message: 'certificateNumber is required' });
    }

    const cert = await Certificate.findOneAndUpdate(
      { certificateNumber },
      {
        status: 'REVOKED',
        revokeReason: reason || 'Revoked by administrator',
        revokedAt: new Date(),
        revokedBy: req.user._id?.toString() || req.user.id?.toString(),
      },
      { new: true }
    );

    if (!cert) {
      return res.status(404).json({ success: false, message: 'Certificate not found' });
    }

    return res.status(200).json({ success: true, message: 'Certificate revoked', certificate: { certificateNumber: cert.certificateNumber, status: cert.status } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to revoke certificate' });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// POST /api/certificates/reactivate
// Admin: reactivate a revoked certificate
// ────────────────────────────────────────────────────────────────────────────
router.post('/reactivate', protect, adminOnly, async (req, res) => {
  try {
    const { certificateNumber } = req.body;
    if (!certificateNumber) {
      return res.status(400).json({ success: false, message: 'certificateNumber is required' });
    }

    const cert = await Certificate.findOneAndUpdate(
      { certificateNumber },
      {
        status: 'VALID',
        $unset: { revokeReason: 1, revokedAt: 1, revokedBy: 1 },
      },
      { new: true }
    );

    if (!cert) {
      return res.status(404).json({ success: false, message: 'Certificate not found' });
    }

    return res.status(200).json({ success: true, message: 'Certificate reactivated', certificate: { certificateNumber: cert.certificateNumber, status: cert.status } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to reactivate certificate' });
  }
});

module.exports = router;
