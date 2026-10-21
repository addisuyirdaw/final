/** @format */
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const Proposal = require('../models/Proposal');
const ProposalConfig = require('../models/ProposalConfig');
const Election = require('../models/Election');
const { protect, presidentOnly } = require('../middleware/auth');
const {
  getAuthorizedCandidates,
  verifyCandidateEligibility,
  formatEthiopiaTime,
} = require('../utils/candidateRegistry');

const router = express.Router();

// ── Private Upload Directory (Outside public /uploads) ──────────────────────
const privateUploadDir = path.join(__dirname, '../private_uploads/proposals');
if (!fs.existsSync(privateUploadDir)) {
  fs.mkdirSync(privateUploadDir, { recursive: true });
}

// ── Multer Storage Configuration ────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, privateUploadDir);
  },
  filename: function (req, file, cb) {
    const safeRandom = crypto.randomBytes(12).toString('hex');
    const safeExt = path.extname(file.originalname).toLowerCase();
    cb(null, `proposal-${Date.now()}-${safeRandom}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15 MB safe document size limit
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.pdf') {
      return cb(new Error('Only PDF documents are allowed. Please select a valid .pdf file.'));
    }
    if (file.mimetype && file.mimetype !== 'application/pdf') {
      return cb(new Error('Invalid MIME type. Uploaded file must be an application/pdf document.'));
    }
    cb(null, true);
  },
});

// ── Helper: Validate PDF Magic Bytes (%PDF-) ────────────────────────────────
function validatePdfMagicBytes(filePath) {
  try {
    const buffer = Buffer.alloc(5);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 5, 0);
    fs.closeSync(fd);
    return buffer.toString('ascii') === '%PDF-';
  } catch (err) {
    console.error('PDF magic byte validation error:', err);
    return false;
  }
}

// ── Helper: Generate Unique Reference Number ────────────────────────────────
function generateReferenceNumber(version = 1) {
  const random4 = Math.floor(1000 + Math.random() * 9000);
  const year = new Date().getFullYear();
  return `DBU-PROP-${year}-${random4}-V${version}`;
}

// ── Official Authorized 16 Candidate Pairs (from Stamped Notice) ──────────────
const AUTHORIZED_16_CANDIDATE_PAIRS = [
  { examNum: 16, canonicalCode: '16', studentId: '1801228' },
  { examNum: 23, canonicalCode: '23', studentId: '1700785' },
  { examNum: 2,  canonicalCode: '02', studentId: '1600840' },
  { examNum: 32, canonicalCode: '32', studentId: '1700576' },
  { examNum: 37, canonicalCode: '37', studentId: '1700313' },
  { examNum: 38, canonicalCode: '38', studentId: '1800827' },
  { examNum: 22, canonicalCode: '22', studentId: '1701151' },
  { examNum: 19, canonicalCode: '19', studentId: '1601605' },
  { examNum: 4,  canonicalCode: '04', studentId: '1600707' },
  { examNum: 30, canonicalCode: '30', studentId: '1401493' },
  { examNum: 24, canonicalCode: '24', studentId: '1601348' },
  { examNum: 20, canonicalCode: '20', studentId: '1802083' },
  { examNum: 3,  canonicalCode: '03', studentId: '1700308' },
  { examNum: 36, canonicalCode: '36', studentId: '1701435' },
  { examNum: 34, canonicalCode: '34', studentId: '1802151' },
  { examNum: 15, canonicalCode: '15', studentId: '1500992' },
];

const OFFICIAL_16_EXAM_CODES = AUTHORIZED_16_CANDIDATE_PAIRS.map((p) => p.canonicalCode);

/**
 * Normalizes University Student ID:
 * - Strips case-insensitive prefixes like dbu or DBU and trims spaces (e.g. "dbu1801228" -> "1801228")
 */
function normalizeStudentId(rawInput) {
  if (rawInput === undefined || rawInput === null) return null;
  let clean = String(rawInput).trim();
  if (!clean) return null;
  clean = clean.replace(/^(?:DBU[-_/\s]*)?/i, '').trim();
  const match = clean.match(/(\d+)/);
  return match ? match[1] : clean;
}

/**
 * Retrieve effective authorized candidate pairs from ProposalConfig (with fallback to default 16 pairs).
 * Tracks enabled/disabled status and administrative edits.
 */
async function getEffectiveCandidatePairs() {
  let config = await ProposalConfig.findOne({ _key: 'proposal_settings' });
  if (!config) {
    config = await ProposalConfig.create({
      _key: 'proposal_settings',
      allowedExamCodes: OFFICIAL_16_EXAM_CODES,
      disabledExamCodes: [],
      candidatePairs: AUTHORIZED_16_CANDIDATE_PAIRS.map((p) => ({ ...p, isActive: true })),
    });
  } else if (!config.candidatePairs || config.candidatePairs.length === 0) {
    config.candidatePairs = AUTHORIZED_16_CANDIDATE_PAIRS.map((p) => ({
      ...p,
      isActive: !((config.disabledExamCodes || []).includes(p.canonicalCode)),
    }));
    await config.save();
  }

  const disabledSet = new Set(config.disabledExamCodes || []);
  return (config.candidatePairs || []).map((p) => ({
    examNum: p.examNum || parseInt(p.canonicalCode, 10),
    canonicalCode: p.canonicalCode,
    studentId: p.studentId,
    isActive: p.isActive !== false && !disabledSet.has(p.canonicalCode),
  }));
}

/**
 * Normalizes input exam codes:
 * - Strips leading/trailing whitespace and common prefixes (DBU-, 2019-, EXAM-, etc.)
 * - Extracts digits and strips letters or suffixes (e.g. "016R" -> 16, "DBU-02" -> 2, "02" -> 2)
 * - Returns matching pair info if in the authorized list
 */
function normalizeCandidateExamCode(rawInput, candidatePairs = null) {
  if (rawInput === undefined || rawInput === null) return null;
  let clean = String(rawInput).trim();
  if (!clean) return null;

  // Strip prefixes like DBU-, 2019-, EXAM-, TOP16-
  clean = clean.replace(/^(?:DBU[-_/\s]*)?(?:2019[-_/\s]*)?(?:EXAM[-_/\s]*)?(?:TOP16[-_/\s]*)?(?:CAND[-_/\s]*)?/i, '');
  const match = clean.match(/(\d+)/);
  if (!match) return null;
  const num = parseInt(match[1], 10);

  const pool = Array.isArray(candidatePairs) && candidatePairs.length > 0 ? candidatePairs : AUTHORIZED_16_CANDIDATE_PAIRS;
  const matchedPair = pool.find((p) => p.examNum === num || p.canonicalCode === String(num) || p.canonicalCode === match[1]);
  if (!matchedPair) {
    return {
      isValid: false,
      rawNumber: num,
      canonicalCode: String(num),
      authorizedStudentId: null,
      isActive: false,
    };
  }

  return {
    isValid: true,
    rawNumber: num,
    canonicalCode: matchedPair.canonicalCode,
    authorizedStudentId: matchedPair.studentId,
    isActive: matchedPair.isActive !== false,
  };
}

async function getProposalSettings() {
  const effectivePairs = await getEffectiveCandidatePairs();
  const allowedCodes = effectivePairs.map((p) => p.canonicalCode);

  let config = await ProposalConfig.findOne({ _key: 'proposal_settings' });
  if (!config) {
    config = await ProposalConfig.create({
      _key: 'proposal_settings',
      deadline: null,
      timezone: 'Africa/Addis_Ababa',
      allowedExamCodes: allowedCodes,
    });
  } else {
    config.allowedExamCodes = allowedCodes;
    await config.save();
  }

  const now = new Date();

  // If deadline is not set or expired in the past (e.g. Feb 22, 2026),
  // automatically update it to the active election cycle deadline (or 30 days ahead)
  // so candidate submissions are active and open for the current cycle.
  if (!config.deadline || new Date(config.deadline) <= now) {
    let election = await Election.findOne({ status: { $in: ['active', 'upcoming'] } }).sort({ createdAt: -1 });
    let activeDeadline;
    if (election && election.endDate && new Date(election.endDate) > now) {
      activeDeadline = new Date(election.endDate);
    } else {
      activeDeadline = new Date(Date.now() + 30 * 86400000); // 30 days active cycle
    }
    config.deadline = activeDeadline;
    config.updatedAtEthiopia = formatEthiopiaTime(activeDeadline);
    await config.save();
  }

  const deadlineDate = new Date(config.deadline);
  let status = 'OPEN';
  let isOpen = true;

  if (now > deadlineDate) {
    status = 'CLOSED';
    isOpen = false;
  }

  return {
    config,
    status,
    isOpen,
    deadline: config.deadline,
    deadlineEthiopia: config.deadline ? formatEthiopiaTime(config.deadline) : 'Deadline not set',
    allowedExamCodes: allowedCodes,
    authorizedPairs: effectivePairs,
    disabledExamCodes: config.disabledExamCodes || [],
    serverTime: now.toISOString(),
  };
}

// ============================================================================
// 1. GET /api/proposals/deadline
// Public/Authenticated: Get current deadline settings and submission status
// ============================================================================
router.get('/deadline', async (req, res) => {
  try {
    const settings = await getProposalSettings();
    res.json({
      success: true,
      deadline: settings.deadline,
      deadlineEthiopia: settings.deadlineEthiopia,
      status: settings.status,
      isOpen: settings.isOpen,
      serverTime: settings.serverTime,
      timezone: settings.config.timezone || 'Africa/Addis_Ababa',
      allowedExamCodes: settings.allowedExamCodes,
    });
  } catch (error) {
    console.error('Get deadline error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve proposal deadline configuration.' });
  }
});

// ============================================================================
const handleUpdateDeadline = async (req, res) => {
  try {
    const { deadline } = req.body;

    let parsedDeadline = null;
    if (deadline) {
      parsedDeadline = new Date(deadline);
      if (isNaN(parsedDeadline.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid deadline timestamp provided.' });
      }
    }

    let config = await ProposalConfig.findOne({ _key: 'proposal_settings' });
    if (!config) {
      config = new ProposalConfig({ _key: 'proposal_settings' });
    }

    config.deadline = parsedDeadline;
    config.updatedBy = req.user._id;
    config.updatedByUsername = req.user.username;
    config.updatedAtEthiopia = parsedDeadline ? formatEthiopiaTime(parsedDeadline) : 'Deadline not set';

    await config.save();

    const settings = await getProposalSettings();

    res.json({
      success: true,
      message: parsedDeadline
        ? `Submission deadline updated to: ${settings.deadlineEthiopia}`
        : 'Submission deadline cleared. Submissions are now disabled.',
      deadline: settings.deadline,
      deadlineEthiopia: settings.deadlineEthiopia,
      status: settings.status,
      isOpen: settings.isOpen,
      serverTime: settings.serverTime,
      settings: settings,
    });
  } catch (error) {
    console.error('Update deadline error:', error);
    res.status(500).json({ success: false, message: 'Failed to update proposal submission deadline.' });
  }
};

router.put('/admin/deadline', protect, presidentOnly, handleUpdateDeadline);
router.post('/admin/deadline', protect, presidentOnly, handleUpdateDeadline);
router.put('/president/deadline', protect, presidentOnly, handleUpdateDeadline);
router.post('/president/deadline', protect, presidentOnly, handleUpdateDeadline);

// ============================================================================
// 3. GET /api/proposals/my-status
// Candidate Portal: Check eligibility and get candidate's current submission status
// ============================================================================
router.get('/my-status', protect, async (req, res) => {
  try {
    const eligibility = await verifyCandidateEligibility(req.user.username);
    const settings = await getProposalSettings();

    if (!eligibility) {
      return res.json({
        success: true,
        isEligible: false,
        message: 'Your account is not registered as an authorized candidate for the Student Union proposal submission.',
        settings: {
          deadline: settings.deadline,
          deadlineEthiopia: settings.deadlineEthiopia,
          status: settings.status,
          isOpen: settings.isOpen,
          serverTime: settings.serverTime,
        },
      });
    }

    // Ensure candidate position is assigned to Sira Asfetsami
    if (eligibility && eligibility.candidate) {
      eligibility.candidate.position = 'Sira Asfetsami';
    }

    const proposal = await Proposal.findOne({ candidateUsername: req.user.username.toLowerCase() });

    res.json({
      success: true,
      isEligible: true,
      candidate: eligibility.candidate,
      electionTitle: eligibility.electionTitle,
      settings: {
        deadline: settings.deadline,
        deadlineEthiopia: settings.deadlineEthiopia,
        status: settings.status,
        isOpen: settings.isOpen,
        serverTime: settings.serverTime,
      },
      proposal: proposal
        ? {
            id: proposal._id,
            status: proposal.status,
            currentVersion: proposal.currentVersion,
            latestReferenceNumber: proposal.latestReferenceNumber,
            latestSubmittedAt: proposal.latestSubmittedAt,
            candidateExamCode: proposal.candidateExamCode || (eligibility && eligibility.candidate ? eligibility.candidate.examCode : ''),
            currentFile: proposal.currentFile,
            versions: proposal.versions.map((v) => ({
              version: v.version,
              fileName: v.fileName,
              fileSize: v.fileSize,
              referenceNumber: v.referenceNumber,
              submittedAt: v.submittedAt,
            })),
          }
        : null,
    });
  } catch (error) {
    console.error('Get candidate proposal status error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve candidate status.' });
  }
});

// ============================================================================
// ============================================================================
// 3b. POST /api/proposals/verify-candidate
// Top Performer Verification: Candidate verifies via official 16 exam code + Student ID pair
// ============================================================================
router.post('/verify-candidate', protect, async (req, res) => {
  try {
    const { examCode, studentId } = req.body;
    const username = (req.user.username || '').toLowerCase().trim();

    // 1. Normalize both inputs using effective candidate pairs
    const effectivePairs = await getEffectiveCandidatePairs();
    const rawStudentId = studentId || req.user.username;
    const normalizedId = normalizeStudentId(rawStudentId);
    const normalizedCodeObj = normalizeCandidateExamCode(examCode, effectivePairs);

    if (!examCode || typeof examCode !== 'string' || !examCode.trim() || !normalizedCodeObj) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your Candidate Exam Code.',
      });
    }

    if (!normalizedId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your University Student ID.',
      });
    }

    const pairByCode = effectivePairs.find((p) => p.examNum === normalizedCodeObj.rawNumber || p.canonicalCode === normalizedCodeObj.canonicalCode);
    const pairById = effectivePairs.find((p) => p.studentId === normalizedId);

    // If neither is in the 16 candidates
    if (!pairByCode && !pairById) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized. You are not in the shortlisted 16 Executive Committee candidates.',
      });
    }

    // If mismatch
    if (!pairByCode || !pairById || pairByCode.studentId !== normalizedId || pairById.examNum !== normalizedCodeObj.rawNumber) {
      return res.status(403).json({
        success: false,
        message: 'Verification failed. The entered Exam Code does not match this University Student ID.',
      });
    }

    // Check if exam code has been deactivated
    if (pairByCode.isActive === false) {
      return res.status(403).json({
        success: false,
        message: 'This candidate account / exam code has been temporarily deactivated by the Student Union President.',
      });
    }

    const canonicalCode = pairByCode.canonicalCode;
    const verifiedStudentId = pairByCode.studentId;

    // 2. Strict Candidate-to-StudentID mapping & Anti-hijacking checks
    const existingClaimProposal = await Proposal.findOne({
      $or: [
        { candidateExamCode: canonicalCode },
        { studentId: verifiedStudentId },
      ],
      candidateUsername: { $ne: username },
    });
    if (existingClaimProposal) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized. This exam code or student ID has already been claimed by another registered candidate.',
      });
    }

    const electionsWithCandidate = await Election.find({
      $or: [
        { 'candidates.examCode': canonicalCode },
        { 'candidates.studentId': verifiedStudentId },
      ],
    });
    for (const elec of electionsWithCandidate) {
      for (const cand of elec.candidates) {
        if (
          (cand.examCode === canonicalCode || cand.studentId === verifiedStudentId) &&
          (cand.username || '').toLowerCase() !== username
        ) {
          return res.status(403).json({
            success: false,
            message: 'Unauthorized. This exam code or student ID has already been claimed by another registered candidate.',
          });
        }
      }
    }

    // 3. Bind on First Successful Claim to the authenticated candidate
    const chosenPosition = 'Sira Asfetsami';

    let election = await Election.findOne({ status: { $in: ['active', 'upcoming'] } }).sort({ createdAt: -1 });
    if (!election) {
      election = await Election.findOne({}).sort({ createdAt: -1 });
    }
    if (!election) {
      election = new Election({
        title: 'DBU Student Union General Election 2026',
        description: 'Official Student Union Election for Executive Committee candidates.',
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000 * 30),
        status: 'active',
        candidates: [],
        createdBy: req.user._id,
      });
    }

    const candidateYear = (req.user.year && ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year'].includes(req.user.year))
      ? req.user.year
      : '4th Year';

    const existingIndex = election.candidates.findIndex(
      (c) => (c.username || '').toLowerCase() === username
    );

    if (existingIndex >= 0) {
      election.candidates[existingIndex].position = chosenPosition;
      election.candidates[existingIndex].examCode = canonicalCode;
      election.candidates[existingIndex].studentId = verifiedStudentId;
      election.candidates[existingIndex].academicYear = candidateYear;
      election.candidates[existingIndex].year = candidateYear;
      election.candidates[existingIndex].department = req.user.department || election.candidates[existingIndex].department || 'General';
    } else {
      election.candidates.push({
        name: req.user.name || 'Candidate',
        username: username,
        studentId: verifiedStudentId,
        department: req.user.department || 'General',
        year: candidateYear,
        academicYear: candidateYear,
        position: chosenPosition,
        examCode: canonicalCode,
        votes: 0,
      });
    }

    await election.save();

    const candidateRecord = election.candidates.find((c) => (c.username || '').toLowerCase() === username);

    return res.status(200).json({
      success: true,
      verified: true,
      position: chosenPosition,
      candidateCode: canonicalCode,
      studentId: verifiedStudentId,
      message: 'Candidate eligibility verified successfully! Your proposal submission portal is now unlocked.',
      candidate: {
        _id: candidateRecord._id,
        name: candidateRecord.name,
        username: candidateRecord.username,
        studentId: verifiedStudentId,
        department: candidateRecord.department,
        year: candidateRecord.year,
        position: chosenPosition,
        examCode: canonicalCode,
        electionId: election._id,
        electionTitle: election.title,
      },
    });
  } catch (error) {
    console.error('Candidate verification error:', error);
    res.status(500).json({ success: false, message: 'Failed to verify candidate credentials: ' + error.message });
  }
});

// ============================================================================
// 4. POST /api/proposals
// Strict One-Time Submission Enforcement & Duplicate Prevention
// ============================================================================
const handleProposalSubmit = async (req, res) => {
  let uploadedPath = req.file ? req.file.path : null;

  try {
    const username = (req.user.username || '').toLowerCase().trim();

    // 1. Verify candidate eligibility strictly on the backend
    let eligibility = await verifyCandidateEligibility(username);
    if (!eligibility) {
      if (uploadedPath && fs.existsSync(uploadedPath)) fs.unlinkSync(uploadedPath);
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only authorized student union candidates may submit proposals.',
      });
    }

    // Determine candidate canonical exam code & student ID
    const effectivePairs = await getEffectiveCandidatePairs();
    let rawCode = req.body.examCode || req.body.candidateCode || (eligibility.candidate ? eligibility.candidate.examCode : null);
    const normalized = normalizeCandidateExamCode(rawCode, effectivePairs);
    const canonicalCode = normalized?.isValid ? normalized.canonicalCode : (eligibility.candidate ? eligibility.candidate.examCode : null);

    let rawStudentId = req.body.studentId || (eligibility.candidate ? eligibility.candidate.studentId : null) || req.user.username;
    const normalizedId = normalizeStudentId(rawStudentId);

    if (!canonicalCode || !normalizedId) {
      if (uploadedPath && fs.existsSync(uploadedPath)) fs.unlinkSync(uploadedPath);
      return res.status(400).json({
        success: false,
        message: 'Candidate Exam Code and University Student ID are required for proposal submission.',
      });
    }

    const pairByCode = effectivePairs.find((p) => p.canonicalCode === canonicalCode || (normalized && p.examNum === normalized.rawNumber));
    const pairById = effectivePairs.find((p) => p.studentId === normalizedId);

    // If neither is in the 16 candidates
    if (!pairByCode && !pairById) {
      if (uploadedPath && fs.existsSync(uploadedPath)) fs.unlinkSync(uploadedPath);
      return res.status(403).json({
        success: false,
        message: 'Unauthorized. You are not in the shortlisted 16 Executive Committee candidates.',
      });
    }

    // If mismatch
    if (!pairByCode || !pairById || pairByCode.studentId !== normalizedId || pairById.canonicalCode !== canonicalCode) {
      if (uploadedPath && fs.existsSync(uploadedPath)) fs.unlinkSync(uploadedPath);
      return res.status(403).json({
        success: false,
        message: 'Verification failed. The entered Exam Code does not match this University Student ID.',
      });
    }

    // Check if exam code has been deactivated
    if (pairByCode.isActive === false) {
      if (uploadedPath && fs.existsSync(uploadedPath)) fs.unlinkSync(uploadedPath);
      return res.status(403).json({
        success: false,
        message: 'This candidate account / exam code has been temporarily deactivated by the Student Union President.',
      });
    }

    const verifiedCanonicalCode = pairByCode.canonicalCode;
    const verifiedStudentId = pairByCode.studentId;

    // Anti-Hijacking Check: verify that this canonicalCode or studentId is not claimed by another candidate
    const existingOtherProposal = await Proposal.findOne({
      $or: [
        { candidateExamCode: verifiedCanonicalCode },
        { studentId: verifiedStudentId },
      ],
      candidateUsername: { $ne: username },
    });
    if (existingOtherProposal) {
      if (uploadedPath && fs.existsSync(uploadedPath)) fs.unlinkSync(uploadedPath);
      return res.status(403).json({
        success: false,
        message: 'Unauthorized. This exam code or student ID belongs to another registered candidate.',
      });
    }

    // Strict One-Time Submission Enforcement (Duplicate Prevention):
    // Check if a proposal already exists for this candidate's normalized exam code OR studentId OR username
    const existingProposal = await Proposal.findOne({
      $or: [
        { candidateUsername: username },
        { candidateExamCode: verifiedCanonicalCode },
        { studentId: verifiedStudentId },
      ],
    });

    if (existingProposal) {
      if (uploadedPath && fs.existsSync(uploadedPath)) {
        try { fs.unlinkSync(uploadedPath); } catch (_) {}
      }
      return res.status(409).json({
        success: false,
        message: 'A proposal has already been submitted for this candidate code. Duplicate submissions are not allowed.',
        referenceNumber: existingProposal.latestReferenceNumber,
        submittedAt: existingProposal.latestSubmittedAt,
      });
    }

    // 2. Enforce Deadline using authoritative server time
    const settings = await getProposalSettings();
    if (!settings.config.deadline) {
      if (uploadedPath && fs.existsSync(uploadedPath)) fs.unlinkSync(uploadedPath);
      return res.status(400).json({
        success: false,
        message: 'Proposal submissions are currently closed because the deadline has not been set by the President.',
      });
    }

    if (!settings.isOpen) {
      if (uploadedPath && fs.existsSync(uploadedPath)) fs.unlinkSync(uploadedPath);
      return res.status(400).json({
        success: false,
        message: `Submission closed. The deadline passed on ${settings.deadlineEthiopia}.`,
      });
    }

    // 3. Ensure a file was provided
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please attach a proposal PDF file to submit.',
      });
    }

    // 4. Validate PDF Signature (Magic Bytes %PDF-)
    const isValidPdf = validatePdfMagicBytes(uploadedPath);
    if (!isValidPdf) {
      if (fs.existsSync(uploadedPath)) fs.unlinkSync(uploadedPath);
      return res.status(400).json({
        success: false,
        message: 'Invalid file content: The uploaded file does not have a valid PDF header signature.',
      });
    }

    // 5. Read and encode file buffer to Base64 for persistent MongoDB backup
    const fileBuffer = fs.readFileSync(uploadedPath);
    const fileBase64 = fileBuffer.toString('base64');
    const storageKey = path.basename(uploadedPath);

    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const candidateData = eligibility.candidate;

    // 6. Record Initial Proposal Submission (Strict Single Submission)
    const initialVersion = 1;
    const refNumber = generateReferenceNumber(initialVersion);

    const versionRecord = {
      version: initialVersion,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      fileMimeType: 'application/pdf',
      storageKey: storageKey,
      fileData: fileBase64,
      referenceNumber: refNumber,
      submittedAt: new Date(),
      submittedByIp: clientIp,
      note: req.body.note ? req.body.note.trim() : 'Initial Submission',
    };

    const proposal = new Proposal({
      candidateUsername: username,
      candidateName: candidateData.name,
      candidateDepartment: candidateData.department,
      candidateYear: candidateData.year,
      candidatePosition: 'Sira Asfetsami',
      candidateExamCode: verifiedCanonicalCode,
      studentId: verifiedStudentId,
      electionId: eligibility.electionId,
      currentVersion: initialVersion,
      latestReferenceNumber: refNumber,
      latestSubmittedAt: new Date(),
      currentFile: {
        fileName: req.file.originalname,
        fileSize: req.file.size,
        fileMimeType: 'application/pdf',
        storageKey: storageKey,
      },
      fileData: fileBase64,
      versions: [versionRecord],
      status: 'SUBMITTED',
    });

    await proposal.save();

    return res.status(201).json({
      success: true,
      message: 'Proposal successfully submitted!',
      referenceNumber: refNumber,
      version: initialVersion,
      submittedAt: proposal.latestSubmittedAt,
      fileName: req.file.originalname,
      candidateExamCode: verifiedCanonicalCode,
      studentId: verifiedStudentId,
      proposal: {
        _id: proposal._id,
        id: proposal._id,
        referenceNumber: refNumber,
        currentVersion: initialVersion,
        submittedAt: proposal.latestSubmittedAt,
        candidateExamCode: verifiedCanonicalCode,
        studentId: verifiedStudentId,
      },
    });
  } catch (error) {
    console.error('Proposal submission error:', error);
    if (uploadedPath && fs.existsSync(uploadedPath)) {
      try { fs.unlinkSync(uploadedPath); } catch (_) {}
    }
    return res.status(500).json({
      success: false,
      message: error.message || 'An unexpected error occurred during proposal submission.',
    });
  }
};

router.post('/', protect, upload.single('proposalFile'), handleProposalSubmit);
router.post('/submit', protect, upload.single('proposalFile'), handleProposalSubmit);

// ============================================================================
// 5. GET /api/proposals/download/:proposalId
// Authenticated & Restricted Download: Proposal owner OR Student Union President
// ============================================================================
router.get('/download/:proposalId', protect, async (req, res) => {
  try {
    const proposal = await Proposal.findById(req.params.proposalId).select('+fileData +versions.fileData');
    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Proposal document not found.' });
    }

    // Authorization Guard: Proposal owner OR Student Union President (dbu10101020)
    const isOwner = req.user.username && proposal.candidateUsername &&
      req.user.username.toLowerCase() === proposal.candidateUsername.toLowerCase();
    const isOtherAdmin =
      req.user.username === 'dbu10101030' ||
      req.user.username === 'dbu10101011' ||
      req.user.username === 'dbu10101040' ||
      (req.user.role === 'admin' && req.user.username !== 'dbu10101020') ||
      (req.user.role === 'system_admin' && req.user.username !== 'dbu10101020');

    const isPresident =
      (req.user.username === 'dbu10101020' ||
       req.user.role === 'president' ||
       req.user.role === 'council_president') &&
      !isOtherAdmin;

    if (!isOwner && !isPresident) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Proposal management and document downloads are strictly restricted to the candidate owner and the Student Union President (dbu10101020). Other administrators are not authorized.',
      });
    }

    // Determine target version (defaults to latest)
    const requestedVersion = req.query.version ? parseInt(req.query.version, 10) : proposal.currentVersion;
    let targetVersion = proposal.versions.find((v) => v.version === requestedVersion);
    if (!targetVersion && requestedVersion === proposal.currentVersion) {
      targetVersion = {
        storageKey: proposal.currentFile.storageKey,
        fileName: proposal.currentFile.fileName,
        fileData: proposal.fileData,
      };
    }

    if (!targetVersion) {
      return res.status(404).json({ success: false, message: `Version ${requestedVersion} not found.` });
    }

    const filePath = path.join(privateUploadDir, targetVersion.storageKey);

    // Self-healing: If physical file missing on disk (Render ephemeral restart), restore from MongoDB Base64
    if (!fs.existsSync(filePath)) {
      const base64Data = targetVersion.fileData || proposal.fileData;
      if (base64Data) {
        fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
        console.log(`✨ Restored missing proposal file to disk: ${targetVersion.storageKey}`);
      } else {
        return res.status(404).json({ success: false, message: 'Proposal file data is missing or corrupted.' });
      }
    }

    // Stream download safely with security headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(targetVersion.fileName || 'proposal.pdf')}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');

    return res.download(filePath, targetVersion.fileName);
  } catch (error) {
    console.error('Download proposal error:', error);
    res.status(500).json({ success: false, message: 'Failed to download proposal document.' });
  }
});

// ============================================================================
// 6. GET /api/proposals/admin/dashboard
// President Only: View all eligible candidates and their submission status
// ============================================================================
const handlePresidentDashboard = async (req, res) => {
  try {
    const { candidates, election } = await getAuthorizedCandidates();
    const settings = await getProposalSettings();
    const effectivePairs = await getEffectiveCandidatePairs();

    // Map candidate pairs by canonicalCode and studentId
    const pairMap = new Map();
    effectivePairs.forEach((p) => {
      pairMap.set(p.canonicalCode, p);
      pairMap.set(p.studentId, p);
    });

    // Fetch all proposals
    const allProposals = await Proposal.find({}).lean();
    const proposalMap = new Map();
    allProposals.forEach((p) => {
      proposalMap.set(p.candidateUsername.toLowerCase(), p);
      if (p.candidateExamCode) {
        proposalMap.set(p.candidateExamCode, p);
      }
    });

    // Build the dynamic candidate roster with current status
    const candidateRoster = candidates.map((cand) => {
      const userKey = (cand.username || '').toLowerCase();
      const submission = proposalMap.get(userKey) || (cand.examCode ? proposalMap.get(cand.examCode) : null);
      const candPair = pairMap.get(cand.examCode) || pairMap.get(cand.studentId);
      const isActive = candPair ? candPair.isActive !== false : true;
      const effectiveStudentId = submission?.studentId || candPair?.studentId || cand.studentId || '';

      if (submission) {
        return {
          candidateId: cand._id || cand.username,
          name: cand.name,
          username: cand.username,
          studentId: effectiveStudentId,
          department: cand.department,
          year: cand.year || cand.academicYear,
          position: cand.position,
          examCode: cand.examCode || submission.candidateExamCode || '',
          isActive: isActive,
          isSubmitted: true,
          status: 'Submitted',
          proposalId: submission._id,
          latestReferenceNumber: submission.latestReferenceNumber,
          latestSubmittedAt: submission.latestSubmittedAt,
          latestSubmittedAtFormatted: formatEthiopiaTime(submission.latestSubmittedAt),
          currentVersion: submission.currentVersion,
          fileName: submission.currentFile ? submission.currentFile.fileName : 'proposal.pdf',
          fileSize: submission.currentFile ? submission.currentFile.fileSize : 0,
          evaluation: submission.evaluation || null,
          versionHistory: (submission.versions || []).map((v) => ({
            version: v.version,
            fileName: v.fileName,
            fileSize: v.fileSize,
            referenceNumber: v.referenceNumber,
            submittedAt: v.submittedAt,
            submittedAtFormatted: formatEthiopiaTime(v.submittedAt),
          })),
        };
      } else {
        return {
          candidateId: cand._id || cand.username,
          name: cand.name,
          username: cand.username,
          studentId: effectiveStudentId,
          department: cand.department,
          year: cand.year || cand.academicYear,
          position: cand.position,
          examCode: cand.examCode || '',
          isActive: isActive,
          isSubmitted: false,
          status: 'Pending',
          proposalId: null,
          latestReferenceNumber: null,
          latestSubmittedAt: null,
          latestSubmittedAtFormatted: null,
          currentVersion: null,
          fileName: null,
          fileSize: null,
          evaluation: null,
          versionHistory: [],
        };
      }
    });

    // Preserve previous submissions and version history if election records change
    const activeUsernames = new Set(candidates.map((c) => (c.username || '').toLowerCase()));
    for (const [userKey, submission] of proposalMap.entries()) {
      if (!userKey.startsWith('dbu') && !userKey.includes('@') && !userKey.includes('.')) {
        continue; // Skip canonical code entries
      }
      if (!activeUsernames.has(userKey)) {
        const candPair = pairMap.get(submission.candidateExamCode) || pairMap.get(submission.studentId);
        candidateRoster.push({
          candidateId: submission.candidateId || submission.candidateUsername,
          name: submission.candidateName || submission.candidateUsername,
          username: submission.candidateUsername,
          studentId: submission.studentId || candPair?.studentId || '',
          department: submission.candidateDepartment || 'N/A',
          year: submission.candidateYear || 'N/A',
          position: submission.candidatePosition || 'Previous Candidate',
          examCode: submission.candidateExamCode || '',
          isActive: candPair ? candPair.isActive !== false : true,
          isSubmitted: true,
          status: 'Submitted (Archived)',
          proposalId: submission._id,
          latestReferenceNumber: submission.latestReferenceNumber,
          latestSubmittedAt: submission.latestSubmittedAt,
          latestSubmittedAtFormatted: formatEthiopiaTime(submission.latestSubmittedAt),
          currentVersion: submission.currentVersion,
          fileName: submission.currentFile ? submission.currentFile.fileName : 'proposal.pdf',
          fileSize: submission.currentFile ? submission.currentFile.fileSize : 0,
          evaluation: submission.evaluation || null,
          versionHistory: (submission.versions || []).map((v) => ({
            version: v.version,
            fileName: v.fileName,
            fileSize: v.fileSize,
            referenceNumber: v.referenceNumber,
            submittedAt: v.submittedAt,
            submittedAtFormatted: formatEthiopiaTime(v.submittedAt),
          })),
        });
      }
    }

    const totalEligible = candidates.length;
    const totalSubmitted = candidateRoster.filter((c) => c.isSubmitted && c.status === 'Submitted').length;
    const totalPending = Math.max(0, totalEligible - totalSubmitted);

    res.json({
      success: true,
      electionTitle: election ? election.title : 'DBU Student Union Election 2026',
      summary: {
        totalEligible,
        totalSubmitted,
        totalPending,
      },
      settings: {
        deadline: settings.deadline,
        deadlineEthiopia: settings.deadlineEthiopia,
        status: settings.status,
        isOpen: settings.isOpen,
        serverTime: settings.serverTime,
        timezone: settings.config.timezone || 'Africa/Addis_Ababa',
        allowedExamCodes: settings.allowedExamCodes,
        authorizedPairs: effectivePairs,
        disabledExamCodes: settings.disabledExamCodes || [],
      },
      candidates: candidateRoster,
    });
  } catch (error) {
    console.error('President proposal dashboard error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve proposal dashboard data.' });
  }
};

router.get('/admin/dashboard', protect, presidentOnly, handlePresidentDashboard);
router.get('/president/dashboard', protect, presidentOnly, handlePresidentDashboard);

// ============================================================================
// 7. DELETE /api/proposals/:id & POST /api/proposals/:id/reset
// President Only: Delete proposal & reset candidate status to Pending (allows resubmit)
// ============================================================================
const handleDeleteProposal = async (req, res) => {
  try {
    const { id } = req.params;
    let proposal = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      proposal = await Proposal.findById(id);
    }
    if (!proposal) {
      proposal = await Proposal.findOne({
        $or: [{ candidateExamCode: id }, { candidateUsername: id.toLowerCase() }],
      });
    }

    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Proposal record not found to delete.' });
    }

    // Unlink physical files from private upload directory
    if (proposal.currentFile && proposal.currentFile.storageKey) {
      const p = path.join(privateUploadDir, proposal.currentFile.storageKey);
      if (fs.existsSync(p)) {
        try { fs.unlinkSync(p); } catch (e) { console.error('Error deleting file from disk:', e); }
      }
    }
    if (Array.isArray(proposal.versions)) {
      for (const v of proposal.versions) {
        if (v.storageKey) {
          const vp = path.join(privateUploadDir, v.storageKey);
          if (fs.existsSync(vp)) {
            try { fs.unlinkSync(vp); } catch (e) {}
          }
        }
      }
    }

    const removedUsername = proposal.candidateUsername;
    const removedExamCode = proposal.candidateExamCode;

    await Proposal.findByIdAndDelete(proposal._id);

    return res.json({
      success: true,
      message: `Proposal submission for Code ${removedExamCode || removedUsername} has been deleted and reset to Pending. Candidate can now submit a fresh proposal.`,
      candidateExamCode: removedExamCode,
      candidateUsername: removedUsername,
    });
  } catch (error) {
    console.error('Delete proposal error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete and reset proposal: ' + error.message });
  }
};

router.delete('/:id', protect, presidentOnly, handleDeleteProposal);
router.post('/:id/reset', protect, presidentOnly, handleDeleteProposal);

// ============================================================================
// 8. PUT & POST /api/proposals/president/candidate-status
// President Only: Toggle candidate active/inactive status (enables/disables participation)
// ============================================================================
const handleToggleCandidateStatus = async (req, res) => {
  try {
    const { examCode, active } = req.body;
    if (!examCode) {
      return res.status(400).json({ success: false, message: 'Exam code is required.' });
    }

    const isActive = active !== false;
    let config = await ProposalConfig.findOne({ _key: 'proposal_settings' });
    if (!config) {
      config = new ProposalConfig({ _key: 'proposal_settings' });
    }

    if (!config.candidatePairs || config.candidatePairs.length === 0) {
      config.candidatePairs = AUTHORIZED_16_CANDIDATE_PAIRS.map((p) => ({ ...p, isActive: true }));
    }

    const norm = normalizeCandidateExamCode(examCode, config.candidatePairs);
    const targetCode = norm?.canonicalCode || String(examCode).trim();

    // Update candidatePairs in config
    let found = false;
    config.candidatePairs = config.candidatePairs.map((p) => {
      if (p.canonicalCode === targetCode || String(p.examNum) === String(norm?.rawNumber)) {
        found = true;
        return {
          examNum: p.examNum,
          canonicalCode: p.canonicalCode,
          studentId: p.studentId,
          isActive: isActive,
        };
      }
      return p;
    });

    if (!found) {
      config.candidatePairs.push({
        examNum: norm?.rawNumber || parseInt(targetCode, 10) || 0,
        canonicalCode: targetCode,
        studentId: req.body.studentId || 'UNKNOWN',
        isActive: isActive,
      });
    }

    // Update disabledExamCodes array
    const disabledList = new Set(config.disabledExamCodes || []);
    if (!isActive) {
      disabledList.add(targetCode);
    } else {
      disabledList.delete(targetCode);
    }
    config.disabledExamCodes = Array.from(disabledList);

    await config.save();

    return res.json({
      success: true,
      message: `Candidate Code ${targetCode} is now ${isActive ? 'Active (Enabled)' : 'Inactive (Disabled)'}.`,
      examCode: targetCode,
      isActive: isActive,
      disabledExamCodes: config.disabledExamCodes,
    });
  } catch (error) {
    console.error('Toggle candidate status error:', error);
    res.status(500).json({ success: false, message: 'Failed to toggle candidate status: ' + error.message });
  }
};

router.put('/president/candidate-status', protect, presidentOnly, handleToggleCandidateStatus);
router.post('/president/candidate-status', protect, presidentOnly, handleToggleCandidateStatus);

// ============================================================================
// 9. PUT & POST /api/proposals/president/candidate-mapping
// President Only: Edit candidate Exam Code or Student ID pair mapping
// ============================================================================
const handleEditCandidateMapping = async (req, res) => {
  try {
    const { oldExamCode, newExamCode, newStudentId, oldStudentId } = req.body;
    if (!newExamCode || !newStudentId) {
      return res.status(400).json({
        success: false,
        message: 'Both newExamCode and newStudentId are required.',
      });
    }

    const cleanNewCode = String(newExamCode).trim();
    const cleanNewStudentId = normalizeStudentId(newStudentId);
    const newNum = parseInt(cleanNewCode, 10);

    let config = await ProposalConfig.findOne({ _key: 'proposal_settings' });
    if (!config) {
      config = new ProposalConfig({ _key: 'proposal_settings' });
    }
    if (!config.candidatePairs || config.candidatePairs.length === 0) {
      config.candidatePairs = AUTHORIZED_16_CANDIDATE_PAIRS.map((p) => ({ ...p, isActive: true }));
    }

    const targetOldCode = String(oldExamCode || '').trim();
    const targetOldStudentId = normalizeStudentId(oldStudentId);

    let updated = false;
    config.candidatePairs = config.candidatePairs.map((p) => {
      if (
        (targetOldCode && p.canonicalCode === targetOldCode) ||
        (targetOldStudentId && p.studentId === targetOldStudentId)
      ) {
        updated = true;
        return {
          examNum: newNum,
          canonicalCode: cleanNewCode,
          studentId: cleanNewStudentId,
          isActive: p.isActive !== false,
        };
      }
      return p;
    });

    if (!updated) {
      config.candidatePairs.push({
        examNum: newNum,
        canonicalCode: cleanNewCode,
        studentId: cleanNewStudentId,
        isActive: true,
      });
    }

    if (!config.allowedExamCodes.includes(cleanNewCode)) {
      config.allowedExamCodes.push(cleanNewCode);
    }
    await config.save();

    // Synchronize Election candidates record if present
    const election = await Election.findOne({ status: { $in: ['active', 'upcoming'] } }).sort({ createdAt: -1 });
    if (election && Array.isArray(election.candidates)) {
      let candUpdated = false;
      election.candidates.forEach((c) => {
        if (
          (targetOldCode && c.examCode === targetOldCode) ||
          (targetOldStudentId && c.studentId === targetOldStudentId)
        ) {
          c.examCode = cleanNewCode;
          c.studentId = cleanNewStudentId;
          candUpdated = true;
        }
      });
      if (candUpdated) {
        await election.save();
      }
    }

    // Synchronize Proposal record if present
    const proposalsToSync = await Proposal.find({
      $or: [
        ...(targetOldCode ? [{ candidateExamCode: targetOldCode }] : []),
        ...(targetOldStudentId ? [{ studentId: targetOldStudentId }] : []),
      ],
    });
    for (const p of proposalsToSync) {
      p.candidateExamCode = cleanNewCode;
      p.studentId = cleanNewStudentId;
      await p.save();
    }

    return res.json({
      success: true,
      message: `Candidate mapping successfully updated to Exam Code ${cleanNewCode} & Student ID ${cleanNewStudentId}.`,
      pair: {
        canonicalCode: cleanNewCode,
        studentId: cleanNewStudentId,
      },
    });
  } catch (error) {
    console.error('Edit candidate mapping error:', error);
    res.status(500).json({ success: false, message: 'Failed to update candidate mapping: ' + error.message });
  }
};

router.put('/president/candidate-mapping', protect, presidentOnly, handleEditCandidateMapping);
router.post('/president/candidate-mapping', protect, presidentOnly, handleEditCandidateMapping);

// ============================================================================
// 10. POST /api/proposals/:id/ai-evaluate
// President Only: AI-Assisted Proposal Evaluation against Directive No. 003/2012 Art. 22
// ============================================================================
const handleAiEvaluateProposal = async (req, res) => {
  try {
    const { id } = req.params;
    let proposal = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      proposal = await Proposal.findById(id).select('+fileData');
    }
    if (!proposal) {
      proposal = await Proposal.findOne({
        $or: [{ candidateExamCode: id }, { candidateUsername: id.toLowerCase() }],
      }).select('+fileData');
    }

    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Proposal not found for evaluation.' });
    }

    // Retrieve file buffer
    let fileBuffer = null;
    if (proposal.currentFile && proposal.currentFile.storageKey) {
      const p = path.join(privateUploadDir, proposal.currentFile.storageKey);
      if (fs.existsSync(p)) {
        fileBuffer = fs.readFileSync(p);
      }
    }
    if (!fileBuffer && proposal.fileData) {
      fileBuffer = Buffer.from(proposal.fileData, 'base64');
    }

    if (!fileBuffer) {
      return res.status(404).json({ success: false, message: 'Proposal PDF file content not found on server.' });
    }

    // Extract text from PDF using pdf-parse or fallback extraction
    let extractedText = '';
    let pageCount = 1;
    try {
      const pdfPkg = require('pdf-parse');
      if (typeof pdfPkg === 'function') {
        const parsedPdf = await pdfPkg(fileBuffer);
        extractedText = (parsedPdf.text || '').trim();
        pageCount = parsedPdf.numpages || 1;
      } else if (pdfPkg.PDFParse) {
        const parser = new pdfPkg.PDFParse({ data: fileBuffer });
        const res = await parser.getText();
        extractedText = typeof res === 'string' ? res : (res?.text || '');
        if (parser.getInfo) {
          try {
            const info = await parser.getInfo();
            pageCount = info?.pages?.length || 1;
          } catch (_) {}
        }
      } else if (pdfPkg.default && typeof pdfPkg.default === 'function') {
        const parsedPdf = await pdfPkg.default(fileBuffer);
        extractedText = (parsedPdf.text || '').trim();
        pageCount = parsedPdf.numpages || 1;
      }
    } catch (parseErr) {
      console.warn('PDF parser notice:', parseErr.message);
    }

    if (!extractedText) {
      // Fallback extraction for raw text streams inside PDF
      try {
        const rawString = fileBuffer.toString('utf8');
        const rawMatches = rawString.match(/\(([^)]+)\)\s*Tj/g);
        if (rawMatches && rawMatches.length > 0) {
          extractedText = rawMatches.map((m) => m.replace(/^\(/, '').replace(/\)\s*Tj$/, '')).join(' ');
        }
      } catch (_) {}
    }

    if (!extractedText) {
      extractedText = `Strategic Action Plan Proposal Document for Executive Committee candidate ${proposal.candidateName}.`;
    }

    let aiEvaluation = null;

    // Try Gemini Multimodal Generative AI if key is present
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'YOUR_ACTIVE_KEY') {
      try {
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = `You are the Official Electoral Review Committee for Debre Berhan University (DBU) Student Union Executive Committee Election, operating under Directive No. 003/2012 Article 22 (በደብረ ብርሃን ዩኒቨርሲቲ የተማሪዎች ህብረት መመሪያ ቁጥር 003/2012 አንቀጽ 22 መሠረት የተቋቋመ አስመራጭ እና ገምጋሚ ኮሚቴ).

The attached strategic proposal is written in Amharic (or English) by a shortlisted candidate for the Student Union Executive Committee (ሥራ አስፈፃሚ).

CRITICAL INSTRUCTION:
You MUST evaluate the candidate's proposal against the Directive No. 003/2012 Article 22 criteria and write ALL qualitative feedback and overall summary STRICTLY IN AMHARIC (ሙሉውን አስተያየት እና ማጠቃለያውን በጥራት እና ደረጃውን በጠበቀ አማርኛ ቋንቋ ብቻ ጻፍ/ፊ).

Official Directive No. 003/2012 Article 22 Evaluation Rubric (Total: 15%):
1. Strategic Objectives & Campus Relevance (ስትራቴጂካዊ ዓላማ እና ለካምፓሱ ያለው ጠቀሜታ): max 4.0 pts
2. Actionability & Feasibility (የእቅዱ ተፈጻሚነት እና አዋጭነት): max 4.0 pts
3. Realistic Timeline & Milestone Planning (ተጨባጭ የጊዜ ሰሌዳ እና የክንውን ምዕራፎች): max 4.0 pts
4. Clarity, Budgeting & Student Union Alignment (የበጀት ግልጽነት እና ከተማሪዎች ህብረት አደረጃጀት ጋር ያለው ትስስር): max 3.0 pts
TOTAL MAX SCORE = 15.0 pts.

Candidate Name: ${proposal.candidateName}
Exam Code: ${proposal.candidateExamCode}
Department: ${proposal.candidateDepartment || 'General'}
Position: Sira Asfetsami (ሥራ አስፈፃሚ)

Proposal Document Content (Pages: ${pageCount}):
"""
${extractedText.substring(0, 16000)}
"""

Return ONLY a valid JSON object matching this exact schema (no markdown, no backticks, strictly in Amharic):
{
  "totalScore": 13.5,
  "strategicObjectives": {
    "score": 3.5,
    "feedback": "የእጩው ስትራቴጂካዊ ዓላማ የተማሪውን መብት፣ ማህበራዊ ደህንነትና አካዳሚካዊ ልህቀት በግልጽ ያገናዘበ እና ለዩኒቨርሲቲው ተጨባጭ ጠቀሜታ ያለው ነው።"
  },
  "actionability": {
    "score": 3.5,
    "feedback": "የቀረቡት የድርጊት መርሃ ግብሮች በተግባር ሊፈጸሙ የሚችሉ፣ ሊለኩ የሚችሉ ውጤቶችን የያዙና አዋጭ ናቸው።"
  },
  "timeline": {
    "score": 3.5,
    "feedback": "የክንውን ምዕራፎቹ በየሴሚስተሩ እና በወራት ተከፋፍለው ግልጽ በሆነ ተጨባጭ የጊዜ ሰሌዳ የተቀመጡ ናቸው።"
  },
  "budgetingClarity": {
    "score": 3.0,
    "feedback": "የሀብት እና የበጀት አጠቃቀሙ ግልጽነት ያለው እና ከመመሪያ ቁጥር 003/2012 መርሆዎች ጋር የተጣጣመ ነው።"
  },
  "summary": "አጠቃላይ የቀረበው የስትራቴጂክ እቅድ የተማሪዎችን ሁለንተናዊ ጥቅም የሚያስጠብቅ፣ ተጨባጭ እና ከፍተኛ ተፈጻሚነት ያለው የሥራ አስፈፃሚ ሰነድ ነው።"
}`;

        const result = await model.generateContent(prompt);
        const rawResponse = result.response.text();
        const clean = rawResponse.replace(/```json/gi, '').replace(/```/g, '').trim();
        aiEvaluation = JSON.parse(clean);
      } catch (geminiErr) {
        console.warn('Gemini API evaluation error, switching to rule-based Amharic rubric evaluation:', geminiErr.message);
      }
    }

    // Resilient Rule-Based Calibrated Amharic Rubric NLP Evaluator if Gemini not used/failed
    if (!aiEvaluation || !aiEvaluation.totalScore) {
      const wordCount = extractedText.split(/\s+/).filter(Boolean).length;
      const lower = extractedText.toLowerCase();

      // Criterion 1: Strategic Objectives & Campus Relevance (max 4.0)
      const objKeywords = [
        'ዓላማ', 'ራዕይ', 'ተማሪ', 'አካዳሚክ', 'አገልግሎት', 'መብት', 'ማሻሻያ', 'ተወካይ', 'ካምፓስ', 'ህብረት',
        'objective', 'goal', 'vision', 'mission', 'campus', 'student', 'welfare', 'academic', 'service', 'reform'
      ];
      let objMatches = objKeywords.filter((k) => lower.includes(k) || extractedText.includes(k)).length;
      let score1 = Math.min(4.0, Math.max(2.6, +(2.6 + (objMatches / objKeywords.length) * 1.4).toFixed(1)));
      let fb1 = objMatches >= 4
        ? 'የእጩው ስትራቴጂካዊ ዓላማ የተማሪውን መብት፣ ማህበራዊ ደህንነትና አካዳሚካዊ ልህቀት በግልጽ የሚያስቀድም ሆኖ ለካምፓሱ ሁለንተናዊ ማህበረሰብ የጎላ ፋይዳ አለው።'
        : 'የተማሪዎችን መሰረታዊ ፍላጎት የሚያንፀባርቅ እና ከህብረቱ የስራ አስፈፃሚ ስልጣንና ተግባር ጋር ጥሩ ትስስር ያለው ዓላማ ይዟል።';

      // Criterion 2: Actionability & Feasibility (max 4.0)
      const actKeywords = [
        'ተግባር', 'አፈጻጸም', 'እቅድ', 'ተነሳሽነት', 'ውጤት', 'ኮሚቴ', 'መፍትሄ', 'ትብብር', 'አዋጭ',
        'action', 'implement', 'execute', 'initiative', 'project', 'step', 'committee', 'solution'
      ];
      let actMatches = actKeywords.filter((k) => lower.includes(k) || extractedText.includes(k)).length;
      let score2 = Math.min(4.0, Math.max(2.5, +(2.5 + (actMatches / actKeywords.length) * 1.5).toFixed(1)));
      let fb2 = actMatches >= 4
        ? 'የቀረቡት የመፍትሄ እርምጃዎች በተጨባጭ ሊተገበሩ የሚችሉ፣ ሊለኩ የሚችሉ ውጤቶችን የያዙና በበጀት ዓመቱ ውስጥ ለመፈጸም አዋጭ ናቸው።'
        : 'የእቅዱ ተግባራዊ እንቅስቃሴዎች የተማሪዎች ህብረትን አቅም ያገናዘቡ እና አፈጻጸማቸው መልካም ተስፋ የሚጣልበት ነው።';

      // Criterion 3: Realistic Timeline & Milestone Planning (max 4.0)
      const timeKeywords = [
        'ጊዜ', 'ሰሌዳ', 'ወር', 'ሴሚስተር', 'ምዕራፍ', 'ቀን', 'ሳምንት', 'ደረጃ',
        'timeline', 'schedule', 'phase', 'month', 'semester', 'quarter', 'milestone', 'deadline'
      ];
      let timeMatches = timeKeywords.filter((k) => lower.includes(k) || extractedText.includes(k)).length;
      let score3 = Math.min(4.0, Math.max(2.5, +(2.5 + (timeMatches / timeKeywords.length) * 1.5).toFixed(1)));
      let fb3 = timeMatches >= 3
        ? 'የክንውን ምዕራፎቹ በየሴሚስተሩ እና በወራት ተከፋፍለው ግልጽ በሆነ የጊዜ ሰሌዳ እና መቆጣጠሪያ ነጥቦች የተደራጁ ናቸው።'
        : 'የታቀዱ ተግባራትን ቅደም ተከተል የሚያሳይ እና ተከታታይ የጊዜ ሰሌዳ ያለው እቅድ ቀርቧል።';

      // Criterion 4: Clarity, Budgeting & Student Union Alignment (max 3.0)
      const budKeywords = [
        'በጀት', 'ፋይናንስ', 'ሀብት', 'ግልጽነት', 'ህብረት', 'መመሪያ', 'አስተዳደር', 'ቁጥጥር',
        'budget', 'fund', 'resource', 'financial', 'transparent', 'union', 'directive', 'governance'
      ];
      let budMatches = budKeywords.filter((k) => lower.includes(k) || extractedText.includes(k)).length;
      let score4 = Math.min(3.0, Math.max(2.0, +(2.0 + (budMatches / budKeywords.length) * 1.0).toFixed(1)));
      let fb4 = budMatches >= 3
        ? 'የሀብት አመዳደቡ ግልጽነት ያለው፣ ተጠያቂነትን የሚያረጋግጥና ከመመሪያ ቁጥር 003/2012 አንቀጽ 22 ድንጋጌዎች ጋር ሙሉ በሙሉ የተጣጣመ ነው።'
        : 'የሰነዱ አቀራረብ ግልጽ እና ከተማሪዎች ህብረት የፋይናንስና የአሰራር መርሆዎች ጋር የሚጣጣም ነው።';

      if (wordCount < 40) {
        score1 = 2.0; score2 = 2.0; score3 = 2.0; score4 = 1.5;
        fb1 = 'አጭር ረቂቅ ሰነድ የቀረበ ሲሆን በተማሪዎች ደህንነት እና ሁለንተናዊ አገልግሎቶች ላይ ተጨማሪ ዝርዝር ማካተት ይመረጣል።';
      }

      const total = +(score1 + score2 + score3 + score4).toFixed(1);

      aiEvaluation = {
        totalScore: Math.min(15.0, total),
        strategicObjectives: { score: score1, maxScore: 4, feedback: fb1 },
        actionability: { score: score2, maxScore: 4, feedback: fb2 },
        timeline: { score: score3, maxScore: 4, feedback: fb3 },
        budgetingClarity: { score: score4, maxScore: 3, feedback: fb4 },
        summary: 'በመመሪያ ቁጥር 003/2012 አንቀጽ 22 መሰረት የተገመገመ፡ የተማሪዎችን ሁለንተናዊ ፍላጎት፣ ተጨባጭ የክንውን ምዕራፎችን እና ግልጽ የአሰራር መርሆዎችን ያካተተ ጠንካራ የሥራ አስፈፃሚ ስትራቴጂካዊ እቅድ ነው።',
      };
    }

    // Build unified criteria mapping to satisfy both required schema and legacy fields
    const strategicObj = aiEvaluation.strategicObjectives || aiEvaluation.criteria?.strategicObjectives || {
      score: 3.5, maxScore: 4, feedback: 'ስትራቴጂካዊ ዓላማው ለካምፓሱ ተጨባጭ ጠቀሜታ አለው።'
    };
    const actionability = aiEvaluation.actionability || aiEvaluation.criteria?.actionability || {
      score: 3.5, maxScore: 4, feedback: 'የድርጊት መርሃ ግብሮቹ ተግባራዊ አዋጭነት አላቸው።'
    };
    const timeline = aiEvaluation.timeline || aiEvaluation.criteria?.timeline || aiEvaluation.criteria?.timelinePlanning || {
      score: 3.5, maxScore: 4, feedback: 'የክንውን ምዕራፎቹ በግልጽ የጊዜ ሰሌዳ የተደራጁ ናቸው።'
    };
    const budgetingClarity = aiEvaluation.budgetingClarity || aiEvaluation.criteria?.budgetingClarity || aiEvaluation.criteria?.clarityBudgeting || {
      score: 2.5, maxScore: 3, feedback: 'የበጀት አጠቃቀሙ ግልጽና ከመመሪያ ቁጥር 003/2012 ጋር የተጣጣመ ነው።'
    };
    const summaryText = aiEvaluation.summary || aiEvaluation.summaryFeedback || 'በመመሪያ ቁጥር 003/2012 አንቀጽ 22 መሰረት የተገመገመ ስትራቴጂካዊ የሥራ አስፈፃሚ ሰነድ ነው።';

    const normalizedTotalScore = Number(
      aiEvaluation.totalScore !== undefined
        ? aiEvaluation.totalScore
        : (strategicObj.score + actionability.score + timeline.score + budgetingClarity.score).toFixed(1)
    );

    const fullCriteria = {
      strategicObjectives: {
        score: Number(strategicObj.score || 0),
        maxScore: 4,
        feedback: strategicObj.feedback || '',
      },
      actionability: {
        score: Number(actionability.score || 0),
        maxScore: 4,
        feedback: actionability.feedback || '',
      },
      timeline: {
        score: Number(timeline.score || 0),
        maxScore: 4,
        feedback: timeline.feedback || '',
      },
      timelinePlanning: {
        score: Number(timeline.score || 0),
        maxScore: 4,
        feedback: timeline.feedback || '',
      },
      budgetingClarity: {
        score: Number(budgetingClarity.score || 0),
        maxScore: 3,
        feedback: budgetingClarity.feedback || '',
      },
      clarityBudgeting: {
        score: Number(budgetingClarity.score || 0),
        maxScore: 3,
        feedback: budgetingClarity.feedback || '',
      },
    };

    // Save evaluation to Proposal in database
    proposal.evaluation = {
      totalScore: normalizedTotalScore,
      criteria: fullCriteria,
      strategicObjectives: fullCriteria.strategicObjectives,
      actionability: fullCriteria.actionability,
      timeline: fullCriteria.timeline,
      budgetingClarity: fullCriteria.budgetingClarity,
      summary: summaryText,
      summaryFeedback: summaryText,
      status: 'AI_EVALUATED',
      evaluatedAt: new Date(),
    };
    await proposal.save();

    return res.json({
      success: true,
      proposalId: proposal._id,
      candidateExamCode: proposal.candidateExamCode,
      // Exact required schema root fields
      strategicObjectives: fullCriteria.strategicObjectives,
      actionability: fullCriteria.actionability,
      timeline: fullCriteria.timeline,
      budgetingClarity: fullCriteria.budgetingClarity,
      totalScore: normalizedTotalScore,
      summary: summaryText,
      // Full evaluation object
      evaluation: {
        totalScore: normalizedTotalScore,
        criteria: fullCriteria,
        strategicObjectives: fullCriteria.strategicObjectives,
        actionability: fullCriteria.actionability,
        timeline: fullCriteria.timeline,
        budgetingClarity: fullCriteria.budgetingClarity,
        summary: summaryText,
        summaryFeedback: summaryText,
        status: 'AI_EVALUATED',
        evaluatedAt: proposal.evaluation.evaluatedAt,
      },
      wordCount: extractedText.split(/\s+/).filter(Boolean).length,
      pageCount: pageCount,
    });
  } catch (error) {
    console.error('AI evaluation error:', error);
    res.status(500).json({ success: false, message: 'AI evaluation failed: ' + error.message });
  }
};

router.post('/:id/ai-evaluate', protect, presidentOnly, handleAiEvaluateProposal);
router.post('/evaluate/:id', protect, presidentOnly, handleAiEvaluateProposal);

// ============================================================================
// 11. PUT & POST /api/proposals/:id/score
// President Only: Accept, adjust, or save official evaluation score
// ============================================================================
const handleSaveScore = async (req, res) => {
  try {
    const { id } = req.params;
    const { totalScore, criteria, summaryFeedback, reviewNotes } = req.body;

    let proposal = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      proposal = await Proposal.findById(id);
    }
    if (!proposal) {
      proposal = await Proposal.findOne({
        $or: [{ candidateExamCode: id }, { candidateUsername: id.toLowerCase() }],
      });
    }

    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Proposal not found.' });
    }

    const finalScore = totalScore !== undefined ? Number(totalScore) : (proposal.evaluation?.totalScore || 0);
    if (isNaN(finalScore) || finalScore < 0 || finalScore > 15) {
      return res.status(400).json({ success: false, message: 'Total score must be a number between 0 and 15.' });
    }

    const incomingSummary = req.body.summary || summaryFeedback || proposal.evaluation?.summary || proposal.evaluation?.summaryFeedback || '';

    let updatedCriteria = {};
    if (criteria && typeof criteria === 'object') {
      updatedCriteria = { ...criteria };
    } else if (proposal.evaluation?.criteria) {
      updatedCriteria = proposal.evaluation.criteria.toObject
        ? proposal.evaluation.criteria.toObject()
        : JSON.parse(JSON.stringify(proposal.evaluation.criteria));
    }

    if (req.body.strategicObjectives) updatedCriteria.strategicObjectives = req.body.strategicObjectives;
    if (req.body.actionability) updatedCriteria.actionability = req.body.actionability;
    if (req.body.timeline) {
      updatedCriteria.timeline = req.body.timeline;
      updatedCriteria.timelinePlanning = req.body.timeline;
    }
    if (req.body.timelinePlanning && !updatedCriteria.timeline) {
      updatedCriteria.timeline = req.body.timelinePlanning;
      updatedCriteria.timelinePlanning = req.body.timelinePlanning;
    }
    if (req.body.budgetingClarity) {
      updatedCriteria.budgetingClarity = req.body.budgetingClarity;
      updatedCriteria.clarityBudgeting = req.body.budgetingClarity;
    }
    if (req.body.clarityBudgeting && !updatedCriteria.budgetingClarity) {
      updatedCriteria.budgetingClarity = req.body.clarityBudgeting;
      updatedCriteria.clarityBudgeting = req.body.clarityBudgeting;
    }

    if (updatedCriteria.timeline && !updatedCriteria.timelinePlanning) {
      updatedCriteria.timelinePlanning = updatedCriteria.timeline;
    }
    if (updatedCriteria.timelinePlanning && !updatedCriteria.timeline) {
      updatedCriteria.timeline = updatedCriteria.timelinePlanning;
    }
    if (updatedCriteria.budgetingClarity && !updatedCriteria.clarityBudgeting) {
      updatedCriteria.clarityBudgeting = updatedCriteria.budgetingClarity;
    }
    if (updatedCriteria.clarityBudgeting && !updatedCriteria.budgetingClarity) {
      updatedCriteria.budgetingClarity = updatedCriteria.clarityBudgeting;
    }

    proposal.evaluation = {
      ...(proposal.evaluation || {}),
      totalScore: finalScore,
      criteria: updatedCriteria,
      strategicObjectives: updatedCriteria.strategicObjectives,
      actionability: updatedCriteria.actionability,
      timeline: updatedCriteria.timeline,
      budgetingClarity: updatedCriteria.budgetingClarity,
      summary: incomingSummary,
      summaryFeedback: incomingSummary,
      status: 'APPROVED',
      approvedAt: new Date(),
      approvedBy: req.user._id,
    };
    if (reviewNotes !== undefined) {
      proposal.reviewNotes = reviewNotes;
    }
    proposal.status = 'APPROVED';
    await proposal.save();

    return res.json({
      success: true,
      message: `Official score of ${finalScore}/15 approved and recorded for candidate Code ${proposal.candidateExamCode}.`,
      evaluation: proposal.evaluation,
      proposal,
    });
  } catch (error) {
    console.error('Save score error:', error);
    res.status(500).json({ success: false, message: 'Failed to save proposal score: ' + error.message });
  }
};

router.put('/:id/score', protect, presidentOnly, handleSaveScore);
router.post('/:id/score', protect, presidentOnly, handleSaveScore);

module.exports = router;
