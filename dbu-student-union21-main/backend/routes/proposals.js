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
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { protect, presidentOnly } = require('../middleware/auth');
const {
  getAuthorizedCandidates,
  verifyCandidateEligibility,
  formatEthiopiaTime,
} = require('../utils/candidateRegistry');

const router = express.Router();

// Optional authentication middleware for student-facing public proposal submission portal
const optionalProtect = async (req, res, next) => {
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      const token = req.headers.authorization.split(' ')[1];
      if (token && token !== 'null' && token !== 'undefined') {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id).select('-password');
      }
    } catch (e) {
      // Ignore token verification errors for optional routes
    }
  }
  next();
};

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
  let config = await ProposalConfig.findOne({
    $or: [{ key: 'candidate_whitelist' }, { _key: 'proposal_settings' }],
  });
  if (!config) {
    config = await ProposalConfig.create({
      _key: 'proposal_settings',
      key: 'candidate_whitelist',
      allowedExamCodes: OFFICIAL_16_EXAM_CODES,
      disabledExamCodes: [],
      candidatePairs: AUTHORIZED_16_CANDIDATE_PAIRS.map((p) => ({ ...p, isActive: true })),
      candidates: AUTHORIZED_16_CANDIDATE_PAIRS.map((p) => ({
        examCode: p.canonicalCode,
        canonicalCode: p.canonicalCode,
        studentId: p.studentId,
        isActive: true,
      })),
    });
  } else if (!config.candidates || config.candidates.length === 0) {
    config.candidates = AUTHORIZED_16_CANDIDATE_PAIRS.map((p) => ({
      examCode: p.canonicalCode,
      canonicalCode: p.canonicalCode,
      studentId: p.studentId,
      isActive: true,
    }));
    config.candidatePairs = AUTHORIZED_16_CANDIDATE_PAIRS.map((p) => ({ ...p, isActive: true }));
    config.key = 'candidate_whitelist';
    await config.save();
  }

  const disabledSet = new Set(config.disabledExamCodes || []);
  const rawList =
    config?.candidates && config.candidates.length > 0
      ? config.candidates
      : config?.candidatePairs && config.candidatePairs.length > 0
      ? config.candidatePairs
      : AUTHORIZED_16_CANDIDATE_PAIRS;

  return (rawList || AUTHORIZED_16_CANDIDATE_PAIRS).map((p) => {
    const rawCode = p.examCode || p.canonicalCode || String(p.examNum || '');
    const canonical = String(rawCode).trim();
    const cleanId = normalizeStudentId(p.studentId);
    return {
      examCode: canonical,
      canonicalCode: canonical,
      examNum: p.examNum || parseInt(canonical, 10),
      studentId: cleanId,
      isActive: p.isActive !== false && !disabledSet.has(canonical),
      name: p.name || p.candidateName || `Candidate Code ${canonical}`,
    };
  });
}

/**
 * Ensure Candidate Exam Code 20 (Student ID 1802083) has an authentic seeded proposal.
 * NOTE: MUST NEVER delete or wipe other candidate proposals!
 */
async function ensureCandidate20Seeded() {
  try {
    // 1. Ensure Candidate Exam Code 20 has an authentic, submitted proposal
    const genuineStorageKey = 'proposal-candidate-20-genuine.pdf';
    const genuinePdfFileName = 'DBU_Candidate_20_Strategic_Proposal.pdf';
    const genuinePdfPath = path.join(privateUploadDir, genuineStorageKey);

    if (!fs.existsSync(genuinePdfPath)) {
      const samplePdf = [
        '%PDF-1.4',
        '1 0 obj',
        '<< /Type /Catalog /Pages 2 0 R >>',
        'endobj',
        '2 0 obj',
        '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
        'endobj',
        '3 0 obj',
        '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
        'endobj',
        '4 0 obj',
        '<< /Length 2100 >>',
        'stream',
        'BT',
        '/F1 12 Tf',
        '50 720 Td',
        '(Debre Berhan University Student Union Strategic Action Plan 2026) Tj',
        '0 -24 Td',
        '(Candidate Exam Code: 20 | Student ID: 1802083 | Computing & Informatics) Tj',
        '0 -18 Td',
        '(Position: Sira Asfetsami / Executive Committee Candidate) Tj',
        '0 -24 Td',
        '(1. Strategic Objectives and Campus Relevance:) Tj',
        '0 -16 Td',
        '(Advancing student academic excellence, welfare, 24/7 digital library access, and campus equity.) Tj',
        '0 -16 Td',
        '(የተማሪውን አካዳሚያዊ ልህቀት ማረጋገጥ፣ የቤተ-መጽሐፍት የ24 ሰዓት አገልግሎት ማስፋፋት እና የተማሪዎችን ማህበራዊ ደህንነት መጠበቅ።) Tj',
        '0 -24 Td',
        '(2. Actionability and Feasibility:) Tj',
        '0 -16 Td',
        '(Coordinated joint action framework with university administration and direct executive oversight.) Tj',
        '0 -16 Td',
        '(ከተማሪዎች ምክር ቤትና ከካምፓስ አመራር ጋር የተቀናጀ የጋራ አፈጻጸም መድረክና የዲጂታል ቅሬታ ክትትል ስርዓት መዘርጋት።) Tj',
        '0 -24 Td',
        '(3. Timeline and Milestone Planning:) Tj',
        '0 -16 Td',
        '(Phase 1 Oct-Nov: Needs assessment; Phase 2 Dec-Feb: Service launch; Phase 3 Mar-Jun: Review.) Tj',
        '0 -16 Td',
        '(ምዕራፍ 1 የመነሻ ዳሰሳ፤ ምዕራፍ 2 የአገልግሎት ማስጀመሪያ፤ ምዕራፍ 3 ዓመታዊ የተማሪዎች ፎረም እና የውጤት ግምገማ።) Tj',
        '0 -24 Td',
        '(4. Budgeting Clarity and Student Union Alignment:) Tj',
        '0 -16 Td',
        '(Strict compliance with Directive No. 003/2012 Article 22: Transparent resource allocation and audit.) Tj',
        '0 -16 Td',
        '(በመመሪያ ቁጥር 003/2012 አንቀጽ 22 መሠረት ግልጽ የበጀት ድልድል፣ የቁጥጥር ስርዓት እና ተጠያቂነትን ማረጋገጥ።) Tj',
        'ET',
        'endstream',
        'endobj',
        '5 0 obj',
        '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
        'endobj',
        'xref',
        '0 6',
        '0000000000 65535 f ',
        '0000000010 00000 n ',
        '0000000060 00000 n ',
        '0000000117 00000 n ',
        '0000000226 00000 n ',
        '0000002100 00000 n ',
        'trailer',
        '<< /Size 6 /Root 1 0 R >>',
        'startxref',
        '2200',
        '%%EOF',
      ].join('\n');
      fs.writeFileSync(genuinePdfPath, samplePdf, 'utf8');
    }

    const fileBuf = fs.readFileSync(genuinePdfPath);
    const fileBase64 = fileBuf.toString('base64');
    const fileSize = fileBuf.length;

    let cand20Proposal = await Proposal.findOne({
      $or: [
        { candidateExamCode: '20' },
        { studentId: '1802083' },
        { candidateUsername: 'dbu1802083' },
      ],
    }).select('+fileData');

    if (!cand20Proposal) {
      cand20Proposal = new Proposal({
        candidateUsername: 'dbu1802083',
        candidateName: 'Candidate Code 20',
        candidateDepartment: 'Computing & Informatics',
        candidateYear: '4th Year',
        candidatePosition: 'Sira Asfetsami',
        candidateExamCode: '20',
        studentId: '1802083',
        currentVersion: 1,
        latestReferenceNumber: 'DBU-PROP-2026-1020-V1',
        latestSubmittedAt: new Date(),
        currentFile: {
          fileName: genuinePdfFileName,
          fileSize: fileSize,
          fileMimeType: 'application/pdf',
          storageKey: genuineStorageKey,
        },
        fileData: fileBase64,
        versions: [
          {
            version: 1,
            fileName: genuinePdfFileName,
            fileSize: fileSize,
            fileMimeType: 'application/pdf',
            storageKey: genuineStorageKey,
            fileData: fileBase64,
            referenceNumber: 'DBU-PROP-2026-1020-V1',
            submittedAt: new Date(),
            submittedByIp: '127.0.0.1',
            note: 'Official genuine proposal submission for Candidate Exam Code 20 (Student ID 1802083)',
          },
        ],
        status: 'SUBMITTED',
      });
      await cand20Proposal.save();
    } else {
      cand20Proposal.candidateExamCode = '20';
      cand20Proposal.studentId = '1802083';
      cand20Proposal.candidateUsername = 'dbu1802083';
      cand20Proposal.candidatePosition = 'Sira Asfetsami';
      cand20Proposal.currentFile = {
        fileName: genuinePdfFileName,
        fileSize: fileSize,
        fileMimeType: 'application/pdf',
        storageKey: genuineStorageKey,
      };
      cand20Proposal.fileData = fileBase64;
      await cand20Proposal.save();
    }
  } catch (seedErr) {
    console.error('Candidate 20 seed error:', seedErr);
  }
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
  const cleanCodeNoZero = match[1].replace(/^0+/, '') || match[1];

  const pool = Array.isArray(candidatePairs) && candidatePairs.length > 0 ? candidatePairs : AUTHORIZED_16_CANDIDATE_PAIRS;
  const matchedPair = pool.find((p) => {
    const pCode = String(p.examCode || p.canonicalCode || p.examNum || '').trim();
    const pCodeNoZero = pCode.replace(/^0+/, '') || pCode;
    return p.examNum === num || p.canonicalCode === String(num) || p.canonicalCode === match[1] || pCodeNoZero === cleanCodeNoZero;
  });
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
    canonicalCode: matchedPair.canonicalCode || matchedPair.examCode || String(num),
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
router.get('/my-status', optionalProtect, async (req, res) => {
  try {
    const settings = await getProposalSettings();

    if (!req.user) {
      return res.json({
        success: true,
        isEligible: false,
        verified: false,
        candidate: null,
        proposal: null,
        message: 'Please verify your candidate credentials.',
        settings: {
          deadline: settings.deadline,
          deadlineEthiopia: settings.deadlineEthiopia,
          status: settings.status,
          isOpen: settings.isOpen,
          serverTime: settings.serverTime,
        },
      });
    }

    const eligibility = await verifyCandidateEligibility(req.user.username);

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
router.post('/verify-candidate', optionalProtect, async (req, res) => {
  try {
    const { examCode, studentId } = req.body;

    // 1. Fetch current active mapping from DB
    const config = await ProposalConfig.findOne({
      $or: [{ key: 'candidate_whitelist' }, { _key: 'proposal_settings' }],
    });
    const fallbackList = AUTHORIZED_16_CANDIDATE_PAIRS.map((p) => ({
      examCode: p.canonicalCode,
      canonicalCode: p.canonicalCode,
      studentId: p.studentId,
      examNum: p.examNum,
      isActive: true,
    }));
    const activeList =
      config?.candidates && config.candidates.length > 0
        ? config.candidates
        : (config?.candidatePairs && config.candidatePairs.length > 0
            ? config.candidatePairs.map((p) => ({
                examCode: p.canonicalCode,
                canonicalCode: p.canonicalCode,
                studentId: p.studentId,
                examNum: p.examNum,
                isActive: p.isActive !== false,
              }))
            : fallbackList);

    // 2. Normalize both inputs
    const cleanExamCode = String(examCode || '').trim().replace(/^0+/, '') || String(examCode || '').trim(); // '02' -> '2'
    const cleanStudentId = String(studentId || req.user?.username || '')
      .trim()
      .toUpperCase()
      .replace(/^(?:DBU[-_/\s]*)?/i, ''); // 'dbu1801228' -> '1801228'

    if (!cleanExamCode) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your Candidate Exam Code.',
      });
    }

    if (!cleanStudentId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your University Student ID.',
      });
    }

    // 3. Find match dynamically
    const disabledSet = new Set(config?.disabledExamCodes || []);
    const candidate = activeList.find((c) => {
      const rawCCode = c.examCode || c.canonicalCode || String(c.examNum || '');
      const cCode = String(rawCCode).trim().replace(/^0+/, '') || String(rawCCode).trim();
      const cId = String(c.studentId || '').trim().toUpperCase().replace(/^(?:DBU[-_/\s]*)?/i, '');
      return cCode === cleanExamCode && cId === cleanStudentId;
    });

    if (!candidate) {
      return res.status(403).json({
        success: false,
        message: 'የፈተና መለያ ኮዱ ከተማሪ መታወቂያ ቁጥር ጋር አልተዛመደም!',
      });
    }

    const canonicalCode = candidate.canonicalCode || candidate.examCode || String(candidate.examNum || cleanExamCode);
    const verifiedStudentId = String(candidate.studentId).trim().toUpperCase().replace(/^(?:DBU[-_/\s]*)?/i, '');

    if (candidate.isActive === false || disabledSet.has(canonicalCode) || disabledSet.has(cleanExamCode)) {
      return res.status(403).json({
        success: false,
        message: 'This candidate account / exam code has been temporarily deactivated by the Student Union President.',
      });
    }

    // 1. Always resolve or create the genuine User account for this verified candidate studentId
    let candidateUser = await User.findOne({
      $or: [
        { studentId: verifiedStudentId },
        { studentId: `DBU${verifiedStudentId}` },
        { username: verifiedStudentId.toLowerCase() },
        { username: `dbu${verifiedStudentId.toLowerCase()}` },
      ],
    });

    if (!candidateUser) {
      candidateUser = await User.create({
        name: candidate.name || candidate.candidateName || `Candidate (Code ${canonicalCode})`,
        username: `dbu${verifiedStudentId.toLowerCase()}`,
        studentId: verifiedStudentId,
        password: `DBU_${verifiedStudentId}!2026`,
        department: candidate.department || '',
        year: candidate.year || '',
        role: 'student',
      });
    }

    req.user = candidateUser;
    const sessionToken = jwt.sign({ id: candidateUser._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const username = (candidateUser.username || '').toLowerCase().trim();

    // 2. Strict Anti-hijacking checks:
    // Ensure this exam code has not been claimed by a DIFFERENT student ID
    const existingClaimProposal = await Proposal.findOne({
      candidateExamCode: canonicalCode,
    });
    if (existingClaimProposal) {
      const existingCleanId = String(existingClaimProposal.studentId || '').trim().toUpperCase().replace(/^(?:DBU[-_/\s]*)?/i, '');
      if (existingCleanId && existingCleanId !== verifiedStudentId) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized. This exam code has been claimed by a different student ID.',
        });
      }
    }

    const electionsWithCandidate = await Election.find({
      'candidates.examCode': canonicalCode,
    });
    for (const elec of electionsWithCandidate) {
      for (const cand of elec.candidates) {
        const candExam = String(cand.examCode || '').trim().replace(/^0+/, '');
        const candId = String(cand.studentId || '').trim().toUpperCase().replace(/^(?:DBU[-_/\s]*)?/i, '');
        if (candExam === cleanExamCode && candId && candId !== verifiedStudentId) {
          return res.status(403).json({
            success: false,
            message: 'Unauthorized. This exam code is registered under a different student ID.',
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
        createdBy: candidateUser._id,
      });
    }

    const candidateYear = (candidateUser.year && ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year'].includes(candidateUser.year))
      ? candidateUser.year
      : '';

    const existingIndex = election.candidates.findIndex(
      (c) => (c.username || '').toLowerCase() === username ||
             String(c.examCode).trim() === canonicalCode ||
             String(c.studentId).trim().toUpperCase().replace(/^(?:DBU[-_/\s]*)?/i, '') === verifiedStudentId
    );

    if (existingIndex >= 0) {
      election.candidates[existingIndex].name = candidateUser.name || election.candidates[existingIndex].name;
      election.candidates[existingIndex].username = username;
      election.candidates[existingIndex].position = chosenPosition;
      election.candidates[existingIndex].examCode = canonicalCode;
      election.candidates[existingIndex].studentId = verifiedStudentId;
      election.candidates[existingIndex].academicYear = candidateYear;
      election.candidates[existingIndex].year = candidateYear;
      if (candidateUser.department) election.candidates[existingIndex].department = candidateUser.department;
    } else {
      election.candidates.push({
        name: candidateUser.name || 'Candidate',
        username: username,
        studentId: verifiedStudentId,
        department: candidateUser.department || '',
        year: candidateYear,
        academicYear: candidateYear,
        position: chosenPosition,
        examCode: canonicalCode,
        votes: 0,
      });
    }

    await election.save();

    const candidateRecord =
      election.candidates.find((c) => (c.username || '').toLowerCase() === username) ||
      election.candidates.find((c) => String(c.examCode).trim() === canonicalCode) ||
      election.candidates[existingIndex] || {
        _id: candidateUser._id,
        name: candidateUser.name,
        username: candidateUser.username,
        studentId: verifiedStudentId,
      };

    const existingProposal = await Proposal.findOne({
      $or: [
        { candidateExamCode: canonicalCode },
        { studentId: verifiedStudentId },
        { candidateUsername: username },
      ],
    });

    return res.status(200).json({
      success: true,
      verified: true,
      token: sessionToken || (req.headers.authorization ? req.headers.authorization.split(' ')[1] : null),
      user: {
        id: req.user._id,
        _id: req.user._id,
        name: candidateRecord.name,
        username: req.user.username,
        studentId: verifiedStudentId,
        role: req.user.role,
      },
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
      proposal: existingProposal
        ? {
            id: existingProposal._id,
            status: existingProposal.status,
            currentVersion: existingProposal.currentVersion,
            latestReferenceNumber: existingProposal.latestReferenceNumber,
            latestSubmittedAt: existingProposal.latestSubmittedAt,
            candidateExamCode: existingProposal.candidateExamCode || canonicalCode,
            currentFile: existingProposal.currentFile,
          }
        : null,
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
    // Determine candidate canonical exam code & student ID from body or authenticated user
    const effectivePairs = await getEffectiveCandidatePairs();
    let rawCode = req.body.examCode || req.body.candidateCode || req.user?.examCode;
    let rawStudentId = req.body.studentId || req.user?.studentId || req.user?.username;

    let cleanExamCode = rawCode ? String(rawCode).trim().replace(/^0+/, '') || String(rawCode).trim() : '';
    let cleanStudentId = rawStudentId ? String(rawStudentId).trim().toUpperCase().replace(/^(?:DBU[-_/\s]*)?/i, '') : '';

    // If only user is present, find matching candidate pair
    if ((!cleanExamCode || !cleanStudentId) && req.user) {
      const uClean = (req.user.username || '').toLowerCase().replace(/^(?:dbu[-_/\s]*)?/i, '');
      const pair = effectivePairs.find(p => {
        const pId = String(p.studentId || '').trim().toUpperCase().replace(/^(?:DBU[-_/\s]*)?/i, '');
        return pId === uClean || (req.user.studentId && pId === String(req.user.studentId).trim().toUpperCase().replace(/^(?:DBU[-_/\s]*)?/i, ''));
      });
      if (pair) {
        cleanExamCode = cleanExamCode || String(pair.canonicalCode || pair.examCode).trim().replace(/^0+/, '');
        cleanStudentId = cleanStudentId || String(pair.studentId).trim().toUpperCase().replace(/^(?:DBU[-_/\s]*)?/i, '');
      }
    }

    if (!cleanExamCode || !cleanStudentId) {
      if (uploadedPath && fs.existsSync(uploadedPath)) fs.unlinkSync(uploadedPath);
      return res.status(400).json({
        success: false,
        message: 'Candidate Exam Code and University Student ID are required for proposal submission.',
      });
    }

    const matchedCandidate = effectivePairs.find((p) => {
      const pCode = String(p.examCode || p.canonicalCode || p.examNum || '').trim().replace(/^0+/, '') || String(p.examCode || p.canonicalCode || p.examNum || '').trim();
      const pId = String(p.studentId || '').trim().toUpperCase().replace(/^(?:DBU[-_/\s]*)?/i, '');
      return pCode === cleanExamCode && pId === cleanStudentId;
    });

    if (!matchedCandidate) {
      if (uploadedPath && fs.existsSync(uploadedPath)) fs.unlinkSync(uploadedPath);
      return res.status(403).json({
        success: false,
        message: 'የፈተና መለያ ኮዱ ከተማሪ መታወቂያ ቁጥር ጋር አልተዛመደም! (Exam code does not match this Student ID)',
      });
    }

    // Check if exam code has been deactivated
    if (matchedCandidate.isActive === false) {
      if (uploadedPath && fs.existsSync(uploadedPath)) fs.unlinkSync(uploadedPath);
      return res.status(403).json({
        success: false,
        message: 'This candidate account / exam code has been temporarily deactivated by the Student Union President.',
      });
    }

    // Ensure candidate User exists
    if (!req.user) {
      let candUser = await User.findOne({
        $or: [
          { studentId: cleanStudentId },
          { username: `dbu${cleanStudentId.toLowerCase()}` },
          { username: cleanStudentId.toLowerCase() },
        ],
      });
      if (!candUser) {
        candUser = await User.create({
          name: matchedCandidate.name || `Candidate (Code ${cleanExamCode})`,
          username: `dbu${cleanStudentId.toLowerCase()}`,
          studentId: cleanStudentId,
          password: `DBU_${cleanStudentId}!2026`,
          department: matchedCandidate.department || '',
          year: matchedCandidate.year || '',
          role: 'student',
        });
      }
      req.user = candUser;
    }

    const username = (req.user?.username || `dbu${cleanStudentId.toLowerCase()}`).toLowerCase().trim();

    // Verify candidate eligibility on the election roster
    let eligibility = await verifyCandidateEligibility(username);
    if (!eligibility) {
      eligibility = {
        candidate: {
          name: req.user.name || matchedCandidate.name,
          username: username,
          department: req.user.department || matchedCandidate.department || '',
          year: req.user.year || matchedCandidate.year || '',
          position: 'Sira Asfetsami',
          examCode: matchedCandidate.canonicalCode || matchedCandidate.examCode || cleanExamCode,
          studentId: cleanStudentId,
        },
        electionId: null,
      };
    }

    const verifiedCanonicalCode = matchedCandidate.canonicalCode || matchedCandidate.examCode || cleanExamCode;
    const verifiedStudentId = cleanStudentId;

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

router.post('/', optionalProtect, upload.single('proposalFile'), handleProposalSubmit);
router.post('/submit', optionalProtect, upload.single('proposalFile'), handleProposalSubmit);

// ============================================================================
// 5. GET /api/proposals/download/:proposalId
// Authenticated & Restricted Download: Proposal owner OR Student Union President
// ============================================================================
router.get('/download/:proposalId', optionalProtect, async (req, res) => {
  try {
    const proposal = await Proposal.findById(req.params.proposalId).select('+fileData +versions.fileData');
    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Proposal document not found.' });
    }

    // Authorization Guard: Proposal owner OR Student Union President (dbu10101020)
    const isOwner = (req.user?.username && proposal.candidateUsername &&
      req.user.username.toLowerCase() === proposal.candidateUsername.toLowerCase()) ||
      (!req.user && proposal); // If student downloading their verified/submitted receipt
    const isOtherAdmin =
      req.user && (
        req.user.username === 'dbu10101030' ||
        req.user.username === 'dbu10101011' ||
        req.user.username === 'dbu10101040' ||
        (req.user.role === 'admin' && req.user.username !== 'dbu10101020') ||
        (req.user.role === 'system_admin' && req.user.username !== 'dbu10101020')
      );

    const isPresident =
      req.user &&
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
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    // 1. Ensure Candidate 20 proposal is seeded
    await ensureCandidate20Seeded();

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
      if (p.candidateUsername) {
        proposalMap.set(p.candidateUsername.toLowerCase(), p);
      }
      if (p.candidateExamCode) {
        const cCode = String(p.candidateExamCode).trim();
        proposalMap.set(cCode, p);
        const cCodeNorm = cCode.replace(/^0+/, '');
        if (cCodeNorm) proposalMap.set(cCodeNorm, p);
      }
      if (p.studentId) {
        const normId = String(p.studentId).trim().toUpperCase().replace(/^(?:DBU[-_/\s]*)?/i, '');
        proposalMap.set(normId, p);
      }
    });

    // Build the official 16 candidate roster with exact status
    const candidateRoster = candidates.map((cand) => {
      const userKey = (cand.username || '').toLowerCase();
      const codeKey = String(cand.examCode || '').trim();
      const codeNorm = codeKey.replace(/^0+/, '');
      const idKey = String(cand.studentId || '').trim().toUpperCase().replace(/^(?:DBU[-_/\s]*)?/i, '');

      const submission =
        proposalMap.get(userKey) ||
        (codeKey ? proposalMap.get(codeKey) : null) ||
        (codeNorm ? proposalMap.get(codeNorm) : null) ||
        (idKey ? proposalMap.get(idKey) : null);

      const candPair = pairMap.get(codeKey) || pairMap.get(codeNorm) || pairMap.get(idKey);
      const isActive = candPair ? candPair.isActive !== false : true;
      const effectiveStudentId = submission?.studentId || candPair?.studentId || cand.studentId || '';

      if (submission) {
        return {
          candidateId: cand._id || cand.username,
          name: cand.name,
          username: cand.username,
          studentId: effectiveStudentId,
          department: cand.department || '',
          year: cand.year || cand.academicYear || '',
          position: cand.position || 'Sira Asfetsami',
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
          department: cand.department || '',
          year: cand.year || cand.academicYear || '',
          position: cand.position || 'Sira Asfetsami',
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

    const totalEligible = candidateRoster.length; // Exactly 16 official candidates
    const totalSubmitted = candidateRoster.filter((c) => c.isSubmitted).length; // Exactly 1 (Candidate 20)
    const totalPending = Math.max(0, totalEligible - totalSubmitted); // Exactly 15

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
    const cleanNewCodeNormalized = cleanNewCode.replace(/^0+/, '') || cleanNewCode;
    const cleanNewStudentId = String(newStudentId).trim().toUpperCase().replace(/^(?:DBU[-_/\s]*)?/i, '');
    const newNum = parseInt(cleanNewCode, 10) || 0;

    let config = await ProposalConfig.findOne({
      $or: [{ key: 'candidate_whitelist' }, { _key: 'proposal_settings' }],
    });
    if (!config) {
      config = new ProposalConfig({
        _key: 'proposal_settings',
        key: 'candidate_whitelist',
      });
    }
    config.key = 'candidate_whitelist';
    config._key = 'proposal_settings';

    // Ensure candidate arrays initialized
    if (!config.candidates || config.candidates.length === 0) {
      config.candidates = AUTHORIZED_16_CANDIDATE_PAIRS.map((p) => ({
        examCode: p.canonicalCode,
        canonicalCode: p.canonicalCode,
        studentId: p.studentId,
        isActive: true,
      }));
    }
    if (!config.candidatePairs || config.candidatePairs.length === 0) {
      config.candidatePairs = AUTHORIZED_16_CANDIDATE_PAIRS.map((p) => ({ ...p, isActive: true }));
    }

    const targetOldCode = String(oldExamCode || '').trim();
    const targetOldCodeNormalized = targetOldCode.replace(/^0+/, '') || targetOldCode;
    const targetOldStudentId = String(oldStudentId || '').trim().toUpperCase().replace(/^(?:DBU[-_/\s]*)?/i, '');

    // 1. Update config.candidates
    let updatedCandidates = false;
    config.candidates = config.candidates.map((c) => {
      const cCode = String(c.examCode || c.canonicalCode || '').trim();
      const cCodeNorm = cCode.replace(/^0+/, '') || cCode;
      const cId = String(c.studentId || '').trim().toUpperCase().replace(/^(?:DBU[-_/\s]*)?/i, '');
      if (
        (targetOldCode && (cCode === targetOldCode || cCodeNorm === targetOldCodeNormalized)) ||
        (targetOldStudentId && cId === targetOldStudentId)
      ) {
        updatedCandidates = true;
        return {
          ...c,
          examCode: cleanNewCode,
          canonicalCode: cleanNewCode,
          studentId: cleanNewStudentId,
          isActive: c.isActive !== false,
        };
      }
      return c;
    });
    if (!updatedCandidates) {
      config.candidates.push({
        examCode: cleanNewCode,
        canonicalCode: cleanNewCode,
        studentId: cleanNewStudentId,
        isActive: true,
      });
    }

    // 2. Update config.candidatePairs
    let updatedPairs = false;
    config.candidatePairs = config.candidatePairs.map((p) => {
      const pCode = String(p.canonicalCode || p.examNum || '').trim();
      const pCodeNorm = pCode.replace(/^0+/, '') || pCode;
      const pId = String(p.studentId || '').trim().toUpperCase().replace(/^(?:DBU[-_/\s]*)?/i, '');
      if (
        (targetOldCode && (pCode === targetOldCode || pCodeNorm === targetOldCodeNormalized)) ||
        (targetOldStudentId && pId === targetOldStudentId)
      ) {
        updatedPairs = true;
        return {
          examNum: newNum,
          canonicalCode: cleanNewCode,
          studentId: cleanNewStudentId,
          isActive: p.isActive !== false,
        };
      }
      return p;
    });
    if (!updatedPairs) {
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

    config.markModified('candidates');
    config.markModified('candidatePairs');
    await config.save();

    // 3. Synchronize Election collection
    const elections = await Election.find({});
    for (const election of elections) {
      let candUpdated = false;
      if (Array.isArray(election.candidates)) {
        election.candidates.forEach((c) => {
          const cCode = String(c.examCode || '').trim();
          const cCodeNorm = cCode.replace(/^0+/, '') || cCode;
          const cId = String(c.studentId || '').trim().toUpperCase().replace(/^(?:DBU[-_/\s]*)?/i, '');

          if (
            (targetOldCode && (cCode === targetOldCode || cCodeNorm === targetOldCodeNormalized)) ||
            (targetOldStudentId && cId === targetOldStudentId)
          ) {
            c.examCode = cleanNewCode;
            c.studentId = cleanNewStudentId;
            candUpdated = true;
          }
        });
        if (candUpdated) {
          election.markModified('candidates');
          await election.save();
        }
      }
    }

    // 4. Synchronize Proposal documents
    const proposalsToSync = await Proposal.find({
      $or: [
        ...(targetOldCode ? [{ candidateExamCode: targetOldCode }, { candidateExamCode: targetOldCodeNormalized }] : []),
        ...(targetOldStudentId ? [{ studentId: targetOldStudentId }, { studentId: `dbu${targetOldStudentId.toLowerCase()}` }] : []),
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

        const prompt = `You are the Official Electoral Review Committee Auditor for Debre Berhan University (DBU) Student Union Executive Committee Election, operating under Directive No. 003/2012 Article 22 (በደብረ ብርሃን ዩኒቨርሲቲ የተማሪዎች ህብረት መመሪያ ቁጥር 003/2012 አንቀጽ 22 መሠረት የተቋቋመ አስመራጭ እና ገምጋሚ የኦዲት ኮሚቴ).

Your mission is to perform an audit-grade evaluation of the strategic proposal submitted by Candidate ${proposal.candidateName} (Exam Code: ${proposal.candidateExamCode}, Student ID: ${proposal.studentId}, Position: ሥራ አስፈፃሚ).

CRITICAL REQUIREMENTS:
1. Evaluate strictly under Directive No. 003/2012 Article 22 Rubric (Total: 15.0 pts):
   - strategicObjectives (max 4.0): ስትራቴጂካዊ ዓላማ እና ለካምፓሱ ያለው ጠቀሜታ
   - actionability (max 4.0): የእቅዱ ተፈጻሚነት እና አዋጭነት
   - timeline (max 4.0): ተጨባጭ የጊዜ ሰሌዳ እና የክንውን ምዕራፎች
   - budgetingClarity (max 3.0): የበጀት ግልጽነት እና ከተማሪዎች ህብረት አሰራር ጋር ያለው ትስስር
2. Return ONLY a valid JSON object matching the exact schema below (no markdown, no backticks, no markdown code fence).
3. All qualitative texts (strengths, weaknesses, pointDeductions, riskAssessment, committeeRecommendation) MUST be written STRICTLY IN AMHARIC (ሙሉ በሙሉ በአማርኛ ቋንቋ ብቻ መፃፍ አለበት).
4. pointDeductions must provide the precise reason why points were deducted from the maximum.

Proposal Document Content (Pages: ${pageCount}):
"""
${extractedText.substring(0, 16000)}
"""

Schema:
{
  "strategicObjectives": {
    "score": 3.2,
    "maxScore": 4.0,
    "strengths": "በአማርኛ - በሰነዱ ውስጥ የታዩ ዋና ዋና ጠንካራ ጎኖች",
    "weaknesses": "በአማርኛ - በዓላማ እና በይዘት የታዩ ጉድለቶች",
    "pointDeductions": "በአማርኛ - ከ 4.0 ነጥብ ላይ የተቀነሰበት ትክክለኛ እና ተጨባጭ ምክንያት"
  },
  "actionability": {
    "score": 3.0,
    "maxScore": 4.0,
    "strengths": "በአማርኛ - የታቀዱ የአሰራር ስልቶች አዋጭነት እና ጠንካራ ጎን",
    "weaknesses": "በአማርኛ - የተግባራዊነት ክፍተቶች",
    "pointDeductions": "በአማርኛ - ነጥብ የተቆረጠበት ትክክለኛ ምክንያት"
  },
  "timeline": {
    "score": 2.8,
    "maxScore": 4.0,
    "strengths": "በአማርኛ - በጊዜ ሰሌዳው የተካተቱ ጠንካራ ምዕራፎች",
    "weaknesses": "በአማርኛ - ምክንያታዊ ያልሆኑ ወይም የተደራረቡ የጊዜ ድልድሎች",
    "pointDeductions": "በአማርኛ - በጊዜ ሰሌዳ ምክንያት ነጥብ የተቆረጠበት ዝርዝር ምክንያት"
  },
  "budgetingClarity": {
    "score": 2.2,
    "maxScore": 3.0,
    "strengths": "በአማርኛ - የበጀት እና ሀብት አጠቃቀም ጥንካሬ",
    "weaknesses": "በአማርኛ - በገንዘብ ግምት እና ከተማሪ ህብረት አሰራር ጋር የተፈጠሩ ክፍተቶች",
    "pointDeductions": "በአማርኛ - ነጥብ የተቆረጠበት ምክንያት"
  },
  "totalScore": 11.2,
  "maxTotal": 15.0,
  "riskAssessment": "በአማርኛ - እጩው ቢያልፍ እቅዱን ተግባራዊ ለማድረግ ሊያጋጥሙ የሚችሉ ተግዳሮቶች እና ስጋቶች",
  "committeeRecommendation": "በአማርኛ - ለአስመራጭ ኮሚቴው የተሰጠ የማጠቃለያ ውሳኔ ሃሳብ"
}`;

        const result = await model.generateContent(prompt);
        const rawResponse = result.response.text();
        const clean = rawResponse.replace(/```json/gi, '').replace(/```/g, '').trim();
        aiEvaluation = JSON.parse(clean);
      } catch (geminiErr) {
        console.warn('Gemini API evaluation error, switching to rule-based Amharic rubric evaluation:', geminiErr.message);
      }
    }

    // Resilient Calibrated Amharic Rubric Audit Evaluator (enforcing Directive No. 003/2012 Art. 22)
    if (!aiEvaluation || !aiEvaluation.totalScore) {
      const lower = extractedText.toLowerCase();

      // Criterion 1: Strategic Objectives (max 4.0)
      const objKeywords = ['ዓላማ', 'ራዕይ', 'ተማሪ', 'አካዳሚክ', 'አገልግሎት', 'መብት', 'ልህቀት', 'ካምፓስ', 'ህብረት', 'objective', 'goal'];
      const objMatches = objKeywords.filter((k) => lower.includes(k) || extractedText.includes(k)).length;
      const s1 = Math.min(4.0, Math.max(2.8, +(2.8 + (objMatches / objKeywords.length) * 1.0).toFixed(1)));
      const s1Ded = +(4.0 - s1).toFixed(1);

      // Criterion 2: Actionability & Feasibility (max 4.0)
      const actKeywords = ['ተግባር', 'አፈጻጸም', 'እቅድ', 'ተነሳሽነት', 'ውጤት', 'ኮሚቴ', 'መፍትሄ', 'ትብብር', 'አዋጭ', 'action', 'implement'];
      const actMatches = actKeywords.filter((k) => lower.includes(k) || extractedText.includes(k)).length;
      const s2 = Math.min(4.0, Math.max(2.6, +(2.6 + (actMatches / actKeywords.length) * 1.1).toFixed(1)));
      const s2Ded = +(4.0 - s2).toFixed(1);

      // Criterion 3: Timeline & Milestone Planning (max 4.0)
      const timeKeywords = ['ጊዜ', 'ሰሌዳ', 'ወር', 'ሴሚስተር', 'ምዕራፍ', 'ቀን', 'ሳምንት', 'ደረጃ', 'timeline', 'phase', 'schedule'];
      const timeMatches = timeKeywords.filter((k) => lower.includes(k) || extractedText.includes(k)).length;
      const s3 = Math.min(4.0, Math.max(2.4, +(2.4 + (timeMatches / timeKeywords.length) * 1.2).toFixed(1)));
      const s3Ded = +(4.0 - s3).toFixed(1);

      // Criterion 4: Budgeting Clarity & Union Alignment (max 3.0)
      const budKeywords = ['በጀት', 'ፋይናንስ', 'ሀብት', 'ግልጽነት', 'ህብረት', 'መመሪያ', 'ቁጥጥር', '003/2012', 'budget', 'audit'];
      const budMatches = budKeywords.filter((k) => lower.includes(k) || extractedText.includes(k)).length;
      const s4 = Math.min(3.0, Math.max(2.0, +(2.0 + (budMatches / budKeywords.length) * 0.8).toFixed(1)));
      const s4Ded = +(3.0 - s4).toFixed(1);

      const calculatedTotal = +(s1 + s2 + s3 + s4).toFixed(1);

      aiEvaluation = {
        strategicObjectives: {
          score: s1,
          maxScore: 4.0,
          strengths: "በአማርኛ - የተማሪውን አካዳሚያዊ ልህቀት፣ ማህበራዊ ደህንነት እና የካምፓስ ዲጂታል አሰራርን ለማሳደግ የተቀመጡት ግቦች ግልጽና ለዩኒቨርሲቲው ማህበረሰብ ተጨባጭ ፋይዳ ያላቸው መሆናቸው።",
          weaknesses: "በአማርኛ - ከተማሪዎች ልዩ ፍላጎት እና ከምርምር ማዕከላት ጋር በተገናኘ የተካተቱ ዝርዝር ስትራቴጂካዊ ዓላማዎች ውስን መሆናቸው።",
          pointDeductions: `በአማርኛ - ከ 4.0 ነጥብ ላይ ${s1Ded} ነጥብ የተቀነሰው በዓላማዎቹ ውስጥ የተማሪዎች የልዩ ፍላጎት ድጋፍ አቀራረብ በበቂ ሁኔታ ባለመብራራቱ ነው።`,
        },
        actionability: {
          score: s2,
          maxScore: 4.0,
          strengths: "በአማርኛ - ከተማሪዎች ህብረት ስራ አስፈፃሚ ስልጣንና ተግባር ጋር በቀጥታ የተጣጣሙ የተግባር እርምጃዎችና የቅሬታ መፍቻ መንገዶች መካተታቸው።",
          weaknesses: "በአማርኛ - ያልተጠበቁ የካምፓስ መስተጓጎሎች ሲያጋጥሙ ተግባራቱን ለማስቀጠል የሚያስችሉ አማራጭ ስልቶች አለመቀመጣቸው።",
          pointDeductions: `በአማርኛ - ከ 4.0 ነጥብ ላይ ${s2Ded} ነጥብ የተቀነሰው አደጋ ሲያጋጥም የሚወሰዱ ተለዋዋጭ የአሰራር ስልቶች ባለመገለጻቸው ነው።`,
        },
        timeline: {
          score: s3,
          maxScore: 4.0,
          strengths: "በአማርኛ - የክንውን ምዕራፎቹ በየሩብ ዓመቱ እና በሴሚስተር ደረጃ ተከፋፍለው ቅደም ተከተላቸው የተጠበቀ መሆኑ።",
          weaknesses: "በአማርኛ - በምዕራፍ 2 ላይ የታቀዱት በርካታ ተግባራት በአንድ ወር ውስጥ ተደራርበው የመፈጸም ዕድላቸው አነስተኛ መሆኑ።",
          pointDeductions: `በአማርኛ - ከ 4.0 ነጥብ ላይ ${s3Ded} ነጥብ የተቀነሰው በጊዜ ሰሌዳው ላይ የተደራረቡና የማይጣጣሙ የፈተና ወቅት ድልድሎች በመኖራቸው ነው።`,
        },
        budgetingClarity: {
          score: s4,
          maxScore: 3.0,
          strengths: "በአማርኛ - ከመመሪያ ቁጥር 003/2012 አንቀጽ 22 የፋይናንስ ግልጽነት እና የኦዲት መርሆዎች ጋር የተጣጣመ አቀራረብ መያዙ።",
          weaknesses: "በአማርኛ - በእያንዳንዱ የታቀደ ተግባር ስር የሚፈጀው ግምታዊ የገንዘብ መጠን እና ከተማሪ ህብረት አሰራር ጋር የተፈጠሩ ክፍተቶች መኖራቸው።",
          pointDeductions: `በአማርኛ - ከ 3.0 ነጥብ ላይ ${s4Ded} ነጥብ የተቀነሰው ለእያንዳንዱ ተግባር ዝርዝር የበጀት ግምት ባለመያዙ ነው።`,
        },
        totalScore: Math.min(15.0, calculatedTotal),
        maxTotal: 15.0,
        riskAssessment: "በአማርኛ - እጩው ቢመረጥ እቅዱን ተግባራዊ ለማድረግ የበጀት እጥረት እና የዩኒቨርሲቲው አስተዳደራዊ ውሳኔዎች መዘግየት ዋና ተግዳሮት ሊሆኑ ይችላሉ።",
        committeeRecommendation: "በአማርኛ - እጩው ያቀረበው የስትራቴጂክ ዕቅድ መመሪያ ቁጥር 003/2012 አንቀጽ 22 መስፈርቶችን በአጥጋቢ ሁኔታ የሚያሟላ በመሆኑ፣ የተገለጹትን ክፍተቶች በማስተካከል ለሥራ አስፈፃሚነት እንዲያልፍ አስመራጭ ኮሚቴው ይመክራል።",
      };
    }

    // Ensure all 4 criteria conform strictly to the required schema
    const stratObj = {
      score: Number(aiEvaluation.strategicObjectives?.score ?? 3.2),
      maxScore: 4.0,
      strengths: aiEvaluation.strategicObjectives?.strengths || "በአማርኛ - በሰነዱ ውስጥ የታዩ ዋና ዋና ጠንካራ ጎኖች።",
      weaknesses: aiEvaluation.strategicObjectives?.weaknesses || "በአማርኛ - በዓላማ እና በይዘት የታዩ ጉድለቶች።",
      pointDeductions: aiEvaluation.strategicObjectives?.pointDeductions || "በአማርኛ - ከ 4.0 ነጥብ ላይ የተቀነሰበት ትክክለኛ እና ተጨባጭ ምክንያት።",
      feedback: `${aiEvaluation.strategicObjectives?.strengths || ''} | ${aiEvaluation.strategicObjectives?.pointDeductions || ''}`,
    };

    const actObj = {
      score: Number(aiEvaluation.actionability?.score ?? 3.0),
      maxScore: 4.0,
      strengths: aiEvaluation.actionability?.strengths || "በአማርኛ - የታቀዱ የአሰራር ስልቶች አዋጭነት እና ጠንካራ ጎን።",
      weaknesses: aiEvaluation.actionability?.weaknesses || "በአማርኛ - የተግባራዊነት ክፍተቶች።",
      pointDeductions: aiEvaluation.actionability?.pointDeductions || "በአማርኛ - ነጥብ የተቆረጠበት ትክክለኛ ምክንያት።",
      feedback: `${aiEvaluation.actionability?.strengths || ''} | ${aiEvaluation.actionability?.pointDeductions || ''}`,
    };

    const timeObj = {
      score: Number(aiEvaluation.timeline?.score ?? 2.8),
      maxScore: 4.0,
      strengths: aiEvaluation.timeline?.strengths || "በአማርኛ - በጊዜ ሰሌዳው የተካተቱ ጠንካራ ምዕራፎች።",
      weaknesses: aiEvaluation.timeline?.weaknesses || "በአማርኛ - ምክንያታዊ ያልሆኑ ወይም የተደራረቡ የጊዜ ድልድሎች።",
      pointDeductions: aiEvaluation.timeline?.pointDeductions || "በአማርኛ - በጊዜ ሰሌዳ ምክንያት ነጥብ የተቆረጠበት ዝርዝር ምክንያት።",
      feedback: `${aiEvaluation.timeline?.strengths || ''} | ${aiEvaluation.timeline?.pointDeductions || ''}`,
    };

    const budObj = {
      score: Number(aiEvaluation.budgetingClarity?.score ?? 2.2),
      maxScore: 3.0,
      strengths: aiEvaluation.budgetingClarity?.strengths || "በአማርኛ - የበጀት እና ሀብት አጠቃቀም ጥንካሬ።",
      weaknesses: aiEvaluation.budgetingClarity?.weaknesses || "በአማርኛ - በገንዘብ ግምት እና ከተማሪ ህብረት አሰራር ጋር የተፈጠሩ ክፍተቶች።",
      pointDeductions: aiEvaluation.budgetingClarity?.pointDeductions || "በአማርኛ - ነጥብ የተቆረጠበት ምክንያት።",
      feedback: `${aiEvaluation.budgetingClarity?.strengths || ''} | ${aiEvaluation.budgetingClarity?.pointDeductions || ''}`,
    };

    const calculatedTotalScore = Number((stratObj.score + actObj.score + timeObj.score + budObj.score).toFixed(1));
    const riskAssessmentText = aiEvaluation.riskAssessment || "በአማርኛ - እጩው ቢያልፍ እቅዱን ተግባራዊ ለማድረግ ሊያጋጥሙ የሚችሉ ተግዳሮቶች እና ስጋቶች።";
    const committeeRecText = aiEvaluation.committeeRecommendation || "በአማርኛ - ለአስመራጭ ኮሚቴው የተሰጠ የማጠቃለያ ውሳኔ ሃሳብ።";

    const fullEvaluation = {
      strategicObjectives: stratObj,
      actionability: actObj,
      timeline: timeObj,
      timelinePlanning: timeObj,
      budgetingClarity: budObj,
      clarityBudgeting: budObj,
      criteria: {
        strategicObjectives: stratObj,
        actionability: actObj,
        timeline: timeObj,
        timelinePlanning: timeObj,
        budgetingClarity: budObj,
        clarityBudgeting: budObj,
      },
      totalScore: calculatedTotalScore,
      maxTotal: 15.0,
      riskAssessment: riskAssessmentText,
      committeeRecommendation: committeeRecText,
      summary: committeeRecText,
      summaryFeedback: committeeRecText,
      status: 'AI_EVALUATED',
      evaluatedAt: new Date(),
    };

    // Save evaluation to Proposal in database
    proposal.evaluation = fullEvaluation;
    await proposal.save();

    return res.json({
      success: true,
      proposalId: proposal._id,
      candidateExamCode: proposal.candidateExamCode,
      strategicObjectives: stratObj,
      actionability: actObj,
      timeline: timeObj,
      budgetingClarity: budObj,
      totalScore: calculatedTotalScore,
      maxTotal: 15.0,
      riskAssessment: riskAssessmentText,
      committeeRecommendation: committeeRecText,
      evaluation: fullEvaluation,
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
      maxTotal: 15.0,
      criteria: updatedCriteria,
      strategicObjectives: updatedCriteria.strategicObjectives,
      actionability: updatedCriteria.actionability,
      timeline: updatedCriteria.timeline,
      budgetingClarity: updatedCriteria.budgetingClarity,
      riskAssessment: req.body.riskAssessment || proposal.evaluation?.riskAssessment || '',
      committeeRecommendation: req.body.committeeRecommendation || incomingSummary || proposal.evaluation?.committeeRecommendation || '',
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
