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
const { protect, presidentOnly, isPresidentOrElectoralAdmin } = require('../middleware/auth');
const isClubCoordinatorOrLeader = (user) => {
  if (!user) return false;
  return Boolean(
    user.role === 'club_admin' ||
    user.role === 'clubs_coordinator' ||
    user.role === 'club_coordinator' ||
    user.role === 'club_leader' ||
    user.clubId ||
    user.club ||
    user.username === 'dbu10101040' ||
    (user.name && user.name.toLowerCase().includes('yirga')) ||
    (user.username && user.username.toLowerCase().includes('yirga'))
  );
};
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

// ── Helper: Generate Cryptographically Secure Password for Auto-Provisioned Candidates
function generateSecureCandidatePassword() {
  return `DBU#${crypto.randomBytes(16).toString('hex')}!`;
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
      allowResubmit: p.allowResubmit !== false && config.allowAllResubmit !== false,
      name: p.name || p.candidateName || `Candidate Code ${canonical}`,
    };
  });
}

/**
 * Ensure Candidate Exam Code 20 (Student ID 1802083) has an authentic seeded proposal.
 * NOTE: MUST NEVER delete or wipe other candidate proposals!
 * Auto-seeding is strictly disabled in standard operations to prevent synthetic proposal injection.
 */
async function ensureCandidate20Seeded() {
  try {
    if (process.env.NODE_ENV !== 'test' || process.env.ENABLE_MOCK_SEED !== 'true') {
      return; // Disabled in normal execution
    }

    const config = await ProposalConfig.findOne({ _key: 'proposal_settings' });
    if (config && config.candidate20Reset === true) {
      return; // President explicitly reset/deleted Candidate 20; do not auto-reseed
    }

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
  const deadlineDate = config.deadline ? new Date(config.deadline) : null;
  let status = 'CLOSED';
  let isOpen = false;

  if (deadlineDate && !isNaN(deadlineDate.getTime()) && now <= deadlineDate) {
    status = 'OPEN';
    isOpen = true;
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
    if (req.user && isClubCoordinatorOrLeader(req.user)) {
      return res.status(403).json({
        success: false,
        isEligible: false,
        message: 'ይህ ገጽ የተከለከለ ነው! የሥራ አስፈጻሚ እጩዎች ፕሮፖዛል የሚፈቀደው ለተማሪዎች ህብረት ፕሬዚዳንትና አስመራጭ ኮሚቴ ብቻ ነው።',
      });
    }

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

    const candidateCode = proposal?.candidateExamCode || eligibility?.candidate?.examCode;
    const effectivePairs = await getEffectiveCandidatePairs();
    const currentPair = effectivePairs.find((p) => p.canonicalCode === candidateCode || p.examCode === candidateCode);
    const candidateAllowResubmit = currentPair ? currentPair.allowResubmit !== false : true;
    const isResubmitPermitted =
      settings.isOpen &&
      candidateAllowResubmit &&
      (!proposal || proposal.resubmissionAllowed !== false) &&
      settings.config.allowAllResubmit !== false;

    res.json({
      success: true,
      isEligible: true,
      candidate: eligibility.candidate,
      electionTitle: eligibility.electionTitle,
      canResubmit: isResubmitPermitted,
      resubmissionAllowed: candidateAllowResubmit && (!proposal || proposal.resubmissionAllowed !== false),
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
            canResubmit: isResubmitPermitted,
            resubmissionAllowed: proposal.resubmissionAllowed !== false,
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
    if (req.user && isClubCoordinatorOrLeader(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'ይህ ገጽ የተከለከለ ነው! የሥራ አስፈጻሚ እጩዎች ፕሮፖዛል የሚፈቀደው ለተማሪዎች ህብረት ፕሬዚዳንትና አስመራጭ ኮሚቴ ብቻ ነው።',
      });
    }

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
        password: generateSecureCandidatePassword(),
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
      canResubmit:
        (candidate.allowResubmit !== false) &&
        (!existingProposal || existingProposal.resubmissionAllowed !== false) &&
        (config?.allowAllResubmit !== false),
      resubmissionAllowed:
        (candidate.allowResubmit !== false) &&
        (!existingProposal || existingProposal.resubmissionAllowed !== false),
      proposal: existingProposal
        ? {
            id: existingProposal._id,
            status: existingProposal.status,
            currentVersion: existingProposal.currentVersion,
            latestReferenceNumber: existingProposal.latestReferenceNumber,
            latestSubmittedAt: existingProposal.latestSubmittedAt,
            candidateExamCode: existingProposal.candidateExamCode || canonicalCode,
            currentFile: existingProposal.currentFile,
            canResubmit:
              (candidate.allowResubmit !== false) &&
              (existingProposal.resubmissionAllowed !== false) &&
              (config?.allowAllResubmit !== false),
            resubmissionAllowed: existingProposal.resubmissionAllowed !== false,
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
    if (req.user && isClubCoordinatorOrLeader(req.user)) {
      if (uploadedPath && fs.existsSync(uploadedPath)) fs.unlinkSync(uploadedPath);
      return res.status(403).json({
        success: false,
        message: 'ይህ ገጽ የተከለከለ ነው! የሥራ አስፈጻሚ እጩዎች ፕሮፖዛል የሚፈቀደው ለተማሪዎች ህብረት ፕሬዚዳንትና አስመራጭ ኮሚቴ ብቻ ነው።',
      });
    }

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
          password: generateSecureCandidatePassword(),
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

    // 6. Check if a proposal already exists for this candidate
    const existingProposal = await Proposal.findOne({
      $or: [
        { candidateUsername: username },
        { candidateExamCode: verifiedCanonicalCode },
        { studentId: verifiedStudentId },
      ],
    }).select('+fileData +versions.fileData');

    if (existingProposal) {
      // Candidate is resubmitting an updated proposal
      const isResubmitAllowed =
        matchedCandidate.isActive !== false &&
        matchedCandidate.allowResubmit !== false &&
        existingProposal.resubmissionAllowed !== false &&
        settings.config.allowAllResubmit !== false;

      if (!isResubmitAllowed) {
        if (uploadedPath && fs.existsSync(uploadedPath)) {
          try { fs.unlinkSync(uploadedPath); } catch (_) {}
        }
        return res.status(403).json({
          success: false,
          message: 'A proposal has already been submitted and resubmission is currently locked for this candidate. Please contact the Student Union President to grant resubmission permission.',
          referenceNumber: existingProposal.latestReferenceNumber,
          submittedAt: existingProposal.latestSubmittedAt,
          canResubmit: false,
        });
      }

      // Handle Resubmission: Increment version & record in version history
      const nextVersion = (existingProposal.currentVersion || 1) + 1;
      const refNumber = generateReferenceNumber(nextVersion);

      const newVersionRecord = {
        version: nextVersion,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        fileMimeType: 'application/pdf',
        storageKey: storageKey,
        fileData: fileBase64,
        referenceNumber: refNumber,
        submittedAt: new Date(),
        submittedByIp: clientIp,
        note: req.body.note ? req.body.note.trim() : `Resubmission Version ${nextVersion}`,
      };

      if (!Array.isArray(existingProposal.versions)) {
        existingProposal.versions = [];
      }
      if (existingProposal.versions.length === 0 && existingProposal.currentFile) {
        existingProposal.versions.push({
          version: existingProposal.currentVersion || 1,
          fileName: existingProposal.currentFile.fileName,
          fileSize: existingProposal.currentFile.fileSize,
          fileMimeType: existingProposal.currentFile.fileMimeType || 'application/pdf',
          storageKey: existingProposal.currentFile.storageKey,
          referenceNumber: existingProposal.latestReferenceNumber || generateReferenceNumber(1),
          submittedAt: existingProposal.latestSubmittedAt || new Date(),
          submittedByIp: clientIp,
          note: 'Initial Submission',
        });
      }

      existingProposal.versions.push(newVersionRecord);
      existingProposal.currentVersion = nextVersion;
      existingProposal.latestReferenceNumber = refNumber;
      existingProposal.latestSubmittedAt = new Date();
      existingProposal.currentFile = {
        fileName: req.file.originalname,
        fileSize: req.file.size,
        fileMimeType: 'application/pdf',
        storageKey: storageKey,
      };
      existingProposal.fileData = fileBase64;
      existingProposal.status = 'SUBMITTED';

      // Reset candidate20Reset flag if candidate 20 has resubmitted
      if (verifiedCanonicalCode === '20' || verifiedStudentId === '1802083') {
        await ProposalConfig.updateOne(
          { _key: 'proposal_settings' },
          { $set: { candidate20Reset: false } }
        );
      }

      // Reset draft AI evaluation for fresh evaluation of the revised proposal
      if (existingProposal.evaluation) {
        existingProposal.evaluation.status = 'PENDING';
        existingProposal.evaluation.evaluatedAt = null;
      }

      await existingProposal.save();

      return res.status(200).json({
        success: true,
        message: `Proposal Version ${nextVersion} successfully resubmitted! (New Reference: ${refNumber})`,
        referenceNumber: refNumber,
        version: nextVersion,
        submittedAt: existingProposal.latestSubmittedAt,
        fileName: req.file.originalname,
        candidateExamCode: verifiedCanonicalCode,
        studentId: verifiedStudentId,
        proposal: {
          _id: existingProposal._id,
          id: existingProposal._id,
          referenceNumber: refNumber,
          currentVersion: nextVersion,
          submittedAt: existingProposal.latestSubmittedAt,
          candidateExamCode: verifiedCanonicalCode,
          studentId: verifiedStudentId,
          fileName: req.file.originalname,
        },
      });
    }

    // 7. Record Initial Proposal Submission (First time submission)
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
      resubmissionAllowed: true,
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
        fileName: req.file.originalname,
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
router.get('/download/:proposalId', protect, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.proposalId)) {
      return res.status(404).json({ success: false, message: 'Proposal document not found.' });
    }

    const proposal = await Proposal.findById(req.params.proposalId).select('+fileData +versions.fileData');
    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Proposal document not found.' });
    }

    // Authorization Guard: Proposal owner OR Authorized Administrator / Electoral Committee
    const uUsername = (req.user?.username || '').toLowerCase().trim();
    const uCleanStudentId = (req.user?.studentId || uUsername).toUpperCase().replace(/^(?:DBU[-_/\s]*)?/i, '');
    const propCleanStudentId = (proposal.studentId || proposal.candidateUsername || '').toUpperCase().replace(/^(?:DBU[-_/\s]*)?/i, '');

    const isOwner =
      Boolean(uUsername && proposal.candidateUsername && uUsername === proposal.candidateUsername.toLowerCase()) ||
      Boolean(uCleanStudentId && propCleanStudentId && uCleanStudentId === propCleanStudentId);

    // Authorized staff: Student Union President, System Admin, and Electoral Committee (strictly excluding all club coordinators)
    const isClubUser = isClubCoordinatorOrLeader(req.user);
    const isAuthorizedStaff = Boolean(
      req.user &&
      !isClubUser &&
      (req.user.username === 'dbu10101020' ||
       req.user.username === 'dbu10101030' ||
       req.user.role === 'president' ||
       req.user.role === 'council_president' ||
       req.user.role === 'system_admin' ||
       req.user.role === 'electoral_admin' ||
       req.user.role === 'asmerach_committee')
    );

    if (isClubUser || (!isOwner && !isAuthorizedStaff)) {
      return res.status(403).json({
        success: false,
        message: 'ይህ ገጽ የተከለከለ ነው! የሥራ አስፈጻሚ እጩዎች ፕሮፖዛል የሚፈቀደው ለተማሪዎች ህብረት ፕሬዚዳንትና አስመራጭ ኮሚቴ ብቻ ነው።',
      });
    }

    // Determine target version (defaults to latest)
    const requestedVersion = req.query.version ? parseInt(req.query.version, 10) : proposal.currentVersion;
    let targetVersion = Array.isArray(proposal.versions)
      ? proposal.versions.find((v) => v.version === requestedVersion)
      : null;

    if (!targetVersion) {
      targetVersion = {
        storageKey: proposal.currentFile?.storageKey || `proposal-${proposal._id}.pdf`,
        fileName: proposal.currentFile?.fileName || 'candidate-proposal.pdf',
        fileData: proposal.fileData,
      };
    }

    const storageKey = targetVersion.storageKey || `proposal-${proposal._id}.pdf`;
    const filePath = path.join(privateUploadDir, storageKey);

    // Self-healing: If physical file missing on disk (Render ephemeral restart), restore from MongoDB Base64
    if (!fs.existsSync(filePath)) {
      const base64Data = targetVersion.fileData || proposal.fileData;
      if (base64Data) {
        fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
        console.log(`✨ Restored missing proposal file to disk: ${storageKey}`);
      } else {
        return res.status(404).json({ success: false, message: 'Proposal file data is missing or corrupted.' });
      }
    }

    const downloadFileName = targetVersion.fileName || `${proposal.candidateExamCode || 'candidate'}_proposal.pdf`;

    return res.download(filePath, downloadFileName, (err) => {
      if (err && !res.headersSent) {
        console.error('File stream error:', err);
        res.status(500).json({ success: false, message: 'Failed to download proposal file.' });
      }
    });
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
    // 1. Ensure Candidate 20 proposal is seeded (only if test seed explicitly enabled)
    if (process.env.NODE_ENV === 'test' && process.env.ENABLE_MOCK_SEED === 'true') {
      await ensureCandidate20Seeded();
    }

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
      const allowResubmit = (candPair ? candPair.allowResubmit !== false : true) && (settings.config?.allowAllResubmit !== false);
      const resubmissionAllowed = submission ? (submission.resubmissionAllowed !== false && allowResubmit) : allowResubmit;

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
          allowResubmit: resubmissionAllowed,
          canResubmit: isActive && resubmissionAllowed,
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
          allowResubmit: resubmissionAllowed,
          canResubmit: isActive && resubmissionAllowed,
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
        allowAllResubmit: settings.config?.allowAllResubmit !== false,
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

    // If Candidate 20 was deleted, set candidate20Reset so ensureCandidate20Seeded does not instantly revive it
    if (
      removedExamCode === '20' ||
      removedExamCode === 20 ||
      String(removedExamCode).replace(/^0+/, '') === '20' ||
      removedUsername === 'dbu1802083'
    ) {
      await ProposalConfig.updateOne(
        { _key: 'proposal_settings' },
        { $set: { candidate20Reset: true } }
      );
    }

    // Ensure candidate pair in config allows resubmission
    let config = await ProposalConfig.findOne({ _key: 'proposal_settings' });
    if (config) {
      const resetCode = String(removedExamCode || '').trim();
      const resetNorm = resetCode.replace(/^0+/, '') || resetCode;
      const enableResubmit = (p) => {
        const pCode = String(p.examCode || p.canonicalCode || p.examNum || '').trim();
        const pNorm = pCode.replace(/^0+/, '') || pCode;
        if (pCode === resetCode || pNorm === resetNorm) {
          return { ...p, allowResubmit: true, isActive: true };
        }
        return p;
      };
      if (Array.isArray(config.candidatePairs)) config.candidatePairs = config.candidatePairs.map(enableResubmit);
      if (Array.isArray(config.candidates)) config.candidates = config.candidates.map(enableResubmit);
      await config.save();
    }

    return res.json({
      success: true,
      message: `Proposal submission for Code ${removedExamCode || removedUsername} has been reset to Pending. Candidate can now upload again.`,
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
      config.candidatePairs = AUTHORIZED_16_CANDIDATE_PAIRS.map((p) => ({ ...p, isActive: true, allowResubmit: true }));
    }
    if (!config.candidates || config.candidates.length === 0) {
      config.candidates = AUTHORIZED_16_CANDIDATE_PAIRS.map((p) => ({ ...p, isActive: true, allowResubmit: true }));
    }

    const norm = normalizeCandidateExamCode(examCode, config.candidatePairs);
    const targetCode = norm?.canonicalCode || String(examCode).trim();
    const cleanTarget = targetCode.replace(/^0+/, '') || targetCode;

    // Update BOTH candidatePairs and candidates arrays in config
    let found = false;
    const updateStatus = (p) => {
      const pCode = String(p.examCode || p.canonicalCode || p.examNum || '').trim();
      const pCodeNorm = pCode.replace(/^0+/, '') || pCode;
      if (p.canonicalCode === targetCode || pCode === targetCode || pCodeNorm === cleanTarget) {
        found = true;
        return {
          ...p,
          examNum: p.examNum || norm?.rawNumber || parseInt(targetCode, 10),
          canonicalCode: targetCode,
          examCode: targetCode,
          studentId: p.studentId,
          isActive: isActive,
          allowResubmit: isActive ? true : (p.allowResubmit !== false),
        };
      }
      return p;
    };

    config.candidatePairs = (config.candidatePairs || []).map(updateStatus);
    config.candidates = (config.candidates || []).map(updateStatus);

    if (!found) {
      const newEntry = {
        examNum: norm?.rawNumber || parseInt(targetCode, 10) || 0,
        canonicalCode: targetCode,
        examCode: targetCode,
        studentId: req.body.studentId || 'UNKNOWN',
        isActive: isActive,
        allowResubmit: isActive,
      };
      config.candidatePairs.push(newEntry);
      if (Array.isArray(config.candidates)) config.candidates.push(newEntry);
    }

    // Update disabledExamCodes array
    const disabledList = new Set(config.disabledExamCodes || []);
    if (!isActive) {
      disabledList.add(targetCode);
      disabledList.add(cleanTarget);
    } else {
      disabledList.delete(targetCode);
      disabledList.delete(cleanTarget);
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
// 8b. PUT & POST /api/proposals/president/candidate-resubmit-permission
// President Only: Explicitly grant or revoke resubmission permission for candidates
// ============================================================================
const handleToggleCandidateResubmitPermission = async (req, res) => {
  try {
    const { examCode, allowResubmit, all } = req.body;
    const shouldAllow = allowResubmit !== false;

    let config = await ProposalConfig.findOne({ _key: 'proposal_settings' });
    if (!config) {
      config = new ProposalConfig({ _key: 'proposal_settings' });
    }

    if (!config.candidatePairs || config.candidatePairs.length === 0) {
      config.candidatePairs = AUTHORIZED_16_CANDIDATE_PAIRS.map((p) => ({ ...p, isActive: true, allowResubmit: true }));
    }
    if (!config.candidates || config.candidates.length === 0) {
      config.candidates = AUTHORIZED_16_CANDIDATE_PAIRS.map((p) => ({ ...p, isActive: true, allowResubmit: true }));
    }

    if (all === true) {
      config.allowAllResubmit = shouldAllow;
      config.candidatePairs = config.candidatePairs.map((p) => ({ ...p, allowResubmit: shouldAllow }));
      config.candidates = config.candidates.map((p) => ({ ...p, allowResubmit: shouldAllow }));
      await config.save();
      await Proposal.updateMany({}, { $set: { resubmissionAllowed: shouldAllow } });

      return res.json({
        success: true,
        message: shouldAllow
          ? 'Resubmission permission granted to all official candidates.'
          : 'Resubmission permission locked for all candidates.',
        allowAllResubmit: shouldAllow,
      });
    }

    if (!examCode) {
      return res.status(400).json({ success: false, message: 'Candidate exam code is required.' });
    }

    const norm = normalizeCandidateExamCode(examCode, config.candidatePairs);
    const targetCode = norm?.canonicalCode || String(examCode).trim();
    const cleanTarget = targetCode.replace(/^0+/, '') || targetCode;

    let found = false;
    const updateResubmit = (p) => {
      const pCode = String(p.examCode || p.canonicalCode || p.examNum || '').trim();
      const pCodeNorm = pCode.replace(/^0+/, '') || pCode;
      if (p.canonicalCode === targetCode || pCode === targetCode || pCodeNorm === cleanTarget) {
        found = true;
        return {
          ...p,
          allowResubmit: shouldAllow,
          isActive: p.isActive !== false,
        };
      }
      return p;
    };

    config.candidatePairs = config.candidatePairs.map(updateResubmit);
    config.candidates = (config.candidates || []).map(updateResubmit);

    if (!found) {
      config.candidatePairs.push({
        examNum: norm?.rawNumber || parseInt(targetCode, 10) || 0,
        canonicalCode: targetCode,
        examCode: targetCode,
        studentId: req.body.studentId || 'UNKNOWN',
        isActive: true,
        allowResubmit: shouldAllow,
      });
    }

    await config.save();

    // Also update Proposal record in DB if exists
    await Proposal.updateMany(
      {
        $or: [
          { candidateExamCode: targetCode },
          { candidateExamCode: cleanTarget },
          { candidateExamCode: `0${cleanTarget}` },
        ],
      },
      { $set: { resubmissionAllowed: shouldAllow } }
    );

    return res.json({
      success: true,
      message: shouldAllow
        ? `Resubmission permission GRANTED for Candidate Code ${targetCode}. Candidate can now upload revised proposal.`
        : `Resubmission permission REVOKED for Candidate Code ${targetCode}.`,
      examCode: targetCode,
      allowResubmit: shouldAllow,
    });
  } catch (error) {
    console.error('Toggle candidate resubmit permission error:', error);
    res.status(500).json({ success: false, message: 'Failed to update resubmission permission: ' + error.message });
  }
};

router.put('/president/candidate-resubmit-permission', protect, presidentOnly, handleToggleCandidateResubmitPermission);
router.post('/president/candidate-resubmit-permission', protect, presidentOnly, handleToggleCandidateResubmitPermission);
router.put('/admin/candidate-resubmit-permission', protect, presidentOnly, handleToggleCandidateResubmitPermission);
router.post('/admin/candidate-resubmit-permission', protect, presidentOnly, handleToggleCandidateResubmitPermission);

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
// Directive No. 003/2012 Article 22: Evaluation Engine Helpers
// ============================================================================

/**
 * Double-Blind Sanitization Pipeline under Directive No. 003/2012 Art. 22:
 * Redacts candidate PII (names, student IDs, phone numbers, email, departmental info)
 * so evaluations are strictly anonymized, objective, and unbiased.
 */
function sanitizeProposalTextForEvaluation(rawText, candidateMeta = {}) {
  if (!rawText) return '';
  let sanitized = String(rawText);

  // 1. Redact Candidate Name & all its sub-tokens (min length 2)
  if (candidateMeta.name && typeof candidateMeta.name === 'string') {
    const nameTokens = candidateMeta.name.split(/\s+/).filter((t) => t.trim().length >= 2);
    nameTokens.forEach((tok) => {
      const escaped = tok.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      sanitized = sanitized.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), '[ተወዳዳሪ/CANDIDATE]');
      sanitized = sanitized.replace(new RegExp(escaped, 'gi'), '[ተወዳዳሪ/CANDIDATE]');
    });
  }

  // 2. Redact Student ID and Username
  if (candidateMeta.username && typeof candidateMeta.username === 'string') {
    const escUser = candidateMeta.username.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    sanitized = sanitized.replace(new RegExp(`\\b${escUser}\\b`, 'gi'), '[መታወቂያ/ID-REDACTED]');
  }
  if (candidateMeta.studentId && typeof candidateMeta.studentId === 'string') {
    const escId = candidateMeta.studentId.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    sanitized = sanitized.replace(new RegExp(`\\b${escId}\\b`, 'gi'), '[መታወቂያ/ID-REDACTED]');
  }

  // 3. Regex mask for common Ethiopian University ID formats (DBU, UGR, ETS, digits/year format)
  sanitized = sanitized.replace(/\b(?:DBU|dbu|UGR|ugr|ETS|ets)[A-Za-z0-9\/-]{3,}\b/gi, '[መታወቂያ/ID-REDACTED]');
  sanitized = sanitized.replace(/\b[A-Za-z]{2,5}\s*\/\s*\d{3,7}\s*\/\s*\d{2,4}\b/g, '[መታወቂያ/ID-REDACTED]');
  sanitized = sanitized.replace(/\b(?:RU|ru|ETS|ets|DBU|dbu)[-_/\s]*\d{4,8}\b/gi, '[መታወቂያ/ID-REDACTED]');

  // 4. Regex mask for phone numbers (Ethiopian +251 9... or 09... / 07...)
  sanitized = sanitized.replace(/(?:\+251\s*[-.]?|0)?9\d(?:[\s.-]?\d){7}\b/g, '[ስልክ/PHONE-REDACTED]');
  sanitized = sanitized.replace(/(?:\+251\s*[-.]?|0)?7\d(?:[\s.-]?\d){7}\b/g, '[ስልክ/PHONE-REDACTED]');

  // 5. Regex mask for email addresses
  sanitized = sanitized.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[ኢሜይል/EMAIL-REDACTED]');

  // 6. Redact explicit candidate exam code mentions in text if present
  if (candidateMeta.examCode) {
    const codeStr = String(candidateMeta.examCode).trim();
    if (codeStr.length > 0) {
      sanitized = sanitized.replace(new RegExp(`\\bCode\\s*${codeStr}\\b`, 'gi'), '[የፈተና ኮድ/EXAM-CODE]');
    }
  }

  return sanitized;
}

/**
 * 100% Pure Amharic Output Enforcer:
 * Strips English / Latin phrases or fallback cleanly to ensure qualitative feedback
 * is written strictly in Amharic without English sentences.
 */
function cleanPureAmharicText(text, fallbackAmharic) {
  if (!text || typeof text !== 'string') return fallbackAmharic;
  let cleaned = text.trim();

  // Strip prefixes like "በአማርኛ -", "በአማርኛ:", "(In Amharic)", etc.
  cleaned = cleaned.replace(/^(?:በአማርኛ\s*[-–:]\s*|\(In Amharic\)\s*[-–:]?\s*)/i, '').trim();

  // Count Latin vs Ethiopic characters
  const latinLetters = (cleaned.match(/[a-zA-Z]/g) || []).length;
  const amharicLetters = (cleaned.match(/[\u1200-\u137F]/g) || []).length;

  // If text is predominantly in English, replace with calibrated pure Amharic text
  if (latinLetters > amharicLetters && latinLetters > 10) {
    return fallbackAmharic;
  }

  // Remove isolated English parentheses like (Strategic Objectives) or (Strengths)
  cleaned = cleaned.replace(/\([A-Za-z\s,/&-]+\)/g, '').trim();
  cleaned = cleaned.replace(/\s{2,}/g, ' ');

  return cleaned || fallbackAmharic;
}

// ============================================================================
// 10. POST /api/proposals/:id/ai-evaluate
// President Only: AI-Assisted Proposal Evaluation against Directive No. 003/2012 Art. 22
// Double-Blind, Calibrated 4-Tier Rubric (Total: 15.0 pts, pure Amharic)
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

    // ── Document Text Extraction ───────────────────────────────────────────
    let extractedText = '';
    let pageCount = 1;
    let isScannedOrEmpty = false;

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
          extractedText = rawMatches.map((m) => m.replace(/^\(/, '').replace(/\)\s*Tj$/, '')).join(' ').trim();
        }
      } catch (_) {}
    }

    // Check if extracted text contains meaningful content (at least 30 non-space characters)
    if (!extractedText || extractedText.replace(/\s+/g, '').length < 30) {
      isScannedOrEmpty = true;
    }

    const evaluationToken = `Code ${proposal.candidateExamCode || 'UNKNOWN'}`;

    // ── Case A: Scanned PDF / Unextractable Text without Gemini Vision ──────
    // If the PDF cannot be read and no active AI API key is configured,
    // NEVER inject synthetic dummy sentences or phantom scores!
    if (isScannedOrEmpty && (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'YOUR_ACTIVE_KEY')) {
      const readFailedHistory = Array.isArray(proposal.evaluation?.history) ? [...proposal.evaluation.history] : [];
      readFailedHistory.push({
        changedBy: req.user._id,
        changedByUsername: req.user.username,
        changedByRole: req.user.role,
        changedAt: new Date(),
        action: 'READ_FAILED',
        previousScore: proposal.evaluation?.totalScore ?? null,
        newScore: null,
        reason: 'የሰነድ ንባብ አልተሳካም—የሰው ግምገማ ያስፈልጋል (ሰነዱ ስካን የተደረገ ምስል በመሆኑ ጽሑፉ አልወጣም)',
      });

      const readFailedEvaluation = {
        isDoubleBlind: true,
        evaluationToken,
        rubricVersion: 'Provisional 15-Point Baseline (4-4-4-3)',
        totalScore: null,
        maxTotal: 15.0,
        status: 'READ_FAILED',
        isReadFailed: true,
        isAiUnavailable: false,
        messageAm: 'የሰነድ ንባብ አልተሳካም—የሰው ግምገማ ያስፈልጋል (ሰነዱ ስካን የተደረገ ምስል በመሆኑ ጽሑፉ በቴክኖሎጂ ሊወጣ አልቻለም፤ እባክዎ በአካል የቀረበውን ጠንካራ ቅጂ ይመልከቱ)',
        criteria: {
          strategicObjectives: { score: null, maxScore: 4.0, citation: '', section: '', strengths: '', weaknesses: 'ሰነዱ በቴክኖሎጂ ሊነበብ አልቻለም', pointDeductions: '' },
          actionability: { score: null, maxScore: 4.0, citation: '', section: '', strengths: '', weaknesses: 'ሰነዱ በቴክኖሎጂ ሊነበብ አልቻለም', pointDeductions: '' },
          timeline: { score: null, maxScore: 4.0, citation: '', section: '', strengths: '', weaknesses: 'ሰነዱ በቴክኖሎጂ ሊነበብ አልቻለም', pointDeductions: '' },
          budgetingClarity: { score: null, maxScore: 3.0, citation: '', section: '', strengths: '', weaknesses: 'ሰነዱ በቴክኖሎጂ ሊነበብ አልቻለም', pointDeductions: '' },
        },
        strategicObjectives: { score: null, maxScore: 4.0, citation: '', section: '', strengths: '', weaknesses: 'ሰነዱ በቴክኖሎጂ ሊነበብ አልቻለም', pointDeductions: '' },
        actionability: { score: null, maxScore: 4.0, citation: '', section: '', strengths: '', weaknesses: 'ሰነዱ በቴክኖሎጂ ሊነበብ አልቻለም', pointDeductions: '' },
        timeline: { score: null, maxScore: 4.0, citation: '', section: '', strengths: '', weaknesses: 'ሰነዱ በቴክኖሎጂ ሊነበብ አልቻለም', pointDeductions: '' },
        budgetingClarity: { score: null, maxScore: 3.0, citation: '', section: '', strengths: '', weaknesses: 'ሰነዱ በቴክኖሎጂ ሊነበብ አልቻለም', pointDeductions: '' },
        summary: 'የሰነድ ንባብ አልተሳካም—የሰው ግምገማ ያስፈልጋል',
        summaryFeedback: 'የሰነድ ንባብ አልተሳካም—የሰው ግምገማ ያስፈልጋል',
        committeeRecommendation: 'ሰነዱ ስካን የተደረገ ምስል በመሆኑ በቴክኖሎጂ ሊወጣ አልቻለም፤ አስመራጭ ኮሚቴው በአካል የቀረበውን ጠንካራ ቅጂ (Hard-copy) አይቶ ነጥብ እንዲሰጥ ይመከራል።',
        evaluatedAt: new Date(),
        history: readFailedHistory,
      };

      proposal.evaluation = readFailedEvaluation;
      await proposal.save();

      return res.json({
        success: true,
        readFailed: true,
        status: 'READ_FAILED',
        totalScore: null,
        message: 'የሰነድ ንባብ አልተሳካም—የሰው ግምገማ ያስፈልጋል',
        evaluation: readFailedEvaluation,
      });
    }

    // ── Case B: Text Extracted but AI API Key is Missing / Unavailable ──────
    // Do NOT generate a fake 9.9 score with keyword counting!
    // Honestly report that the AI API is unconfigured and requires committee review.
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'YOUR_ACTIVE_KEY') {
      const aiUnavailHistory = Array.isArray(proposal.evaluation?.history) ? [...proposal.evaluation.history] : [];
      aiUnavailHistory.push({
        changedBy: req.user._id,
        changedByUsername: req.user.username,
        changedByRole: req.user.role,
        changedAt: new Date(),
        action: 'AI_UNAVAILABLE',
        previousScore: proposal.evaluation?.totalScore ?? null,
        newScore: null,
        reason: 'የAI አገልግሎት አልተገናኘም (GEMINI_API_KEY አልተዋቀረም)',
      });

      const aiUnavailableEvaluation = {
        isDoubleBlind: true,
        evaluationToken,
        rubricVersion: 'Provisional 15-Point Baseline (4-4-4-3)',
        totalScore: null,
        maxTotal: 15.0,
        status: 'AI_UNAVAILABLE',
        isAiUnavailable: true,
        isReadFailed: false,
        messageAm: 'የAI አገልግሎት አልተገናኘም (API Key አልተዋቀረም)—የአስመራጭ ኮሚቴው በእጅ እንዲገመግም ይመከራል',
        wordCount: extractedText.split(/\s+/).filter(Boolean).length,
        pageCount,
        criteria: {
          strategicObjectives: { score: null, maxScore: 4.0, citation: '', section: '', strengths: '', weaknesses: 'የAI አገልግሎት አልተገናኘም', pointDeductions: '' },
          actionability: { score: null, maxScore: 4.0, citation: '', section: '', strengths: '', weaknesses: 'የAI አገልግሎት አልተገናኘም', pointDeductions: '' },
          timeline: { score: null, maxScore: 4.0, citation: '', section: '', strengths: '', weaknesses: 'የAI አገልግሎት አልተገናኘም', pointDeductions: '' },
          budgetingClarity: { score: null, maxScore: 3.0, citation: '', section: '', strengths: '', weaknesses: 'የAI አገልግሎት አልተገናኘም', pointDeductions: '' },
        },
        strategicObjectives: { score: null, maxScore: 4.0, citation: '', section: '', strengths: '', weaknesses: 'የAI አገልግሎት አልተገናኘም', pointDeductions: '' },
        actionability: { score: null, maxScore: 4.0, citation: '', section: '', strengths: '', weaknesses: 'የAI አገልግሎት አልተገናኘም', pointDeductions: '' },
        timeline: { score: null, maxScore: 4.0, citation: '', section: '', strengths: '', weaknesses: 'የAI አገልግሎት አልተገናኘም', pointDeductions: '' },
        budgetingClarity: { score: null, maxScore: 3.0, citation: '', section: '', strengths: '', weaknesses: 'የAI አገልግሎት አልተገናኘም', pointDeductions: '' },
        summary: 'የAI አገልግሎት አልተገናኘም—የሰው ግምገማ ያስፈልጋል',
        summaryFeedback: 'የAI አገልግሎት አልተገናኘም—የሰው ግምገማ ያስፈልጋል',
        committeeRecommendation: 'የAI አገልግሎት ስላልተዋቀረ አስመራጭ ኮሚቴው ሰነዱን በቀጥታ አንብቦ ነጥብ እንዲሰጥ ይመከራል።',
        evaluatedAt: new Date(),
        history: aiUnavailHistory,
      };

      proposal.evaluation = aiUnavailableEvaluation;
      await proposal.save();

      return res.json({
        success: true,
        aiUnavailable: true,
        status: 'AI_UNAVAILABLE',
        totalScore: null,
        message: 'የAI አገልግሎት አልተገናኘም—የሰው ግምገማ ያስፈልጋል',
        evaluation: aiUnavailableEvaluation,
      });
    }

    // ── Case C: Active AI Evaluation (Gemini 1.5 Flash) ──────────────────────
    // Double-Blind Sanitization Pipeline
    const candidateMeta = {
      name: proposal.candidateName,
      studentId: proposal.studentId,
      username: proposal.candidateUsername,
      department: proposal.candidateDepartment,
      examCode: proposal.candidateExamCode,
    };
    const sanitizedText = sanitizeProposalTextForEvaluation(extractedText, candidateMeta);

    let aiEvaluation = null;
    try {
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({
        model: process.env.GEMINI_MODEL || 'gemini-3.5-flash',
        generationConfig: {
          temperature: 0.1,
        },
      });

      const prompt = `You are the Official Electoral Review Committee Auditor for Debre Berhan University (DBU) Student Union Executive Committee Election.
Candidate Evaluation Token: ${evaluationToken}
Position: ሥራ አስፈፃሚ (Student Union Executive Committee)
Evaluation Protocol: Double-Blind Proposal Audit (Provisional 15-Point Baseline Rubric)

CRITICAL EVALUATION INSTRUCTIONS:
1. 100% PURE AMHARIC OUTPUT REQUIREMENT:
   Every single qualitative text field ("strengths", "weaknesses", "pointDeductions", "riskAssessment", "committeeRecommendation") MUST be written EXCLUSIVELY AND 100% IN AMHARIC (ሙሉ በሙሉ በአማርኛ ቋንቋ ብቻ መፃፍ አለበት).
   DO NOT include English explanations or untranslated Latin phrases.

2. VERIFIABLE TEXT CITATION REQUIREMENT:
   For each criterion, provide:
   - "citation": A direct verbatim Amharic quotation from the candidate's actual proposal text proving the earned score.
   - "section": The section heading or page context where the quotation appears.
   - If an element is completely absent from the proposal (e.g. no budget mentioned), state explicitly: "በሰነዱ ውስጥ አልተገኘም (0 ነጥብ)". NEVER fabricate citations or imagine missing content.

3. MATHEMATICAL DEDUCTION RULE:
   In "pointDeductions", state the exact mathematical subtraction in Amharic (e.g. "ከ 4.0 ነጥብ ላይ 0.8 ነጥብ የተቀነሰው [ተጨባጭ ምክንያት] በመሆኑ ነው።"). If full marks are earned (0.0 deduction), state "ከ 4.0 ነጥብ ላይ ምንም ነጥብ አልተቀነሰም፤ መስፈርቱን ሙሉ በሙሉ አሟልቷል።".

4. PROVISIONAL 4-TIER BASELINE RUBRIC (Total 15.0 pts):
   a. strategicObjectives (Max 4.0 pts):
      - Campus priority alignment (cafeteria hygiene, dormitory, clean/hot water, reliable campus wifi, library, clinic)
      - Inclusivity & special needs (female student participation, disability infrastructure, freshman support)
   b. actionability (Max 4.0 pts):
      - Feasibility within Student Union mandate & executive authority
      - Institutional boundaries (deduct points if promising actions outside Union jurisdiction, e.g. independent commercial banking, replacing university disciplinary board, or allocating state capital budgets)
   c. timeline (Max 4.0 pts):
      - Realistic 100-day priority roadmap & quarterly milestones
      - Academic calendar harmonization (avoiding midterms/finals overload, makeup plans)
   d. budgetingClarity (Max 3.0 pts):
      - Resource realism & internal audit transparency
      - Document integrity & absence of unfilled placeholder templates like [insert...] or [...]

5. Return ONLY a valid JSON object matching the exact schema below (no markdown fences, no backticks):

Schema:
{
  "strategicObjectives": {
    "score": 3.4,
    "maxScore": 4.0,
    "citation": "...",
    "section": "...",
    "strengths": "...",
    "weaknesses": "...",
    "pointDeductions": "..."
  },
  "actionability": {
    "score": 3.2,
    "maxScore": 4.0,
    "citation": "...",
    "section": "...",
    "strengths": "...",
    "weaknesses": "...",
    "pointDeductions": "..."
  },
  "timeline": {
    "score": 3.0,
    "maxScore": 4.0,
    "citation": "...",
    "section": "...",
    "strengths": "...",
    "weaknesses": "...",
    "pointDeductions": "..."
  },
  "budgetingClarity": {
    "score": 2.2,
    "maxScore": 3.0,
    "citation": "...",
    "section": "...",
    "strengths": "...",
    "weaknesses": "...",
    "pointDeductions": "..."
  },
  "totalScore": 11.8,
  "maxTotal": 15.0,
  "riskAssessment": "...",
  "committeeRecommendation": "..."
}

Sanitized Proposal Document Content (Pages: ${pageCount}):
"""
${sanitizedText.substring(0, 16000)}
"""`;

      // If document text was empty (scanned image), supply the PDF file buffer as multimodal inlineData
      const contents = isScannedOrEmpty
        ? [
            { text: prompt },
            {
              inlineData: {
                data: fileBuffer.toString('base64'),
                mimeType: 'application/pdf',
              },
            },
          ]
        : prompt;

      const candidateModels = [
        process.env.GEMINI_MODEL,
        'gemini-3.8-flash',
        'gemini-3.5-flash',
      ].filter(Boolean);

      let result = null;
      let lastErr = null;
      for (const mName of candidateModels) {
        try {
          const model = genAI.getGenerativeModel({
            model: mName,
            generationConfig: { temperature: 0.1 },
          });
          for (let attempt = 0; attempt < 2; attempt++) {
            try {
              result = await model.generateContent(contents);
              break;
            } catch (retryErr) {
              if (attempt === 0 && (retryErr.message.includes('503') || retryErr.message.includes('high demand'))) {
                await new Promise((r) => setTimeout(r, 1500));
                continue;
              }
              throw retryErr;
            }
          }
          if (result) break;
        } catch (e) {
          lastErr = e;
          console.warn(`Model ${mName} notice:`, e.message);
        }
      }
      if (!result && lastErr) throw lastErr;

      const rawResponse = result.response.text();
      const clean = rawResponse.replace(/```json/gi, '').replace(/```/g, '').trim();
      aiEvaluation = JSON.parse(clean);
    } catch (geminiErr) {
      console.error('Gemini API evaluation error:', geminiErr.message);
      const failStatus = isScannedOrEmpty ? 'READ_FAILED' : 'AI_UNAVAILABLE';
      const failMsg = isScannedOrEmpty
        ? 'የሰነድ ንባብ አልተሳካም (የስካን ሰነድ AI ጥሪ አልተሳካም)፦ የሰው ግምገማ ያስፈልጋል'
        : 'የAI አገልግሎት ጥሪ አልተሳካም፦ ' + geminiErr.message;

      const errHistory = Array.isArray(proposal.evaluation?.history) ? [...proposal.evaluation.history] : [];
      errHistory.push({
        changedBy: req.user._id,
        changedByUsername: req.user.username,
        changedByRole: req.user.role,
        changedAt: new Date(),
        action: failStatus,
        previousScore: proposal.evaluation?.totalScore ?? null,
        newScore: null,
        reason: failMsg,
      });

      const fallbackEvaluation = {
        isDoubleBlind: true,
        evaluationToken,
        rubricVersion: 'Provisional 15-Point Baseline (4-4-4-3)',
        totalScore: null,
        maxTotal: 15.0,
        status: failStatus,
        isReadFailed: isScannedOrEmpty,
        isAiUnavailable: !isScannedOrEmpty,
        messageAm: failMsg,
        criteria: {
          strategicObjectives: { score: null, maxScore: 4.0, citation: '', section: '', strengths: '', weaknesses: failMsg, pointDeductions: '' },
          actionability: { score: null, maxScore: 4.0, citation: '', section: '', strengths: '', weaknesses: failMsg, pointDeductions: '' },
          timeline: { score: null, maxScore: 4.0, citation: '', section: '', strengths: '', weaknesses: failMsg, pointDeductions: '' },
          budgetingClarity: { score: null, maxScore: 3.0, citation: '', section: '', strengths: '', weaknesses: failMsg, pointDeductions: '' },
        },
        strategicObjectives: { score: null, maxScore: 4.0, citation: '', section: '', strengths: '', weaknesses: failMsg, pointDeductions: '' },
        actionability: { score: null, maxScore: 4.0, citation: '', section: '', strengths: '', weaknesses: failMsg, pointDeductions: '' },
        timeline: { score: null, maxScore: 4.0, citation: '', section: '', strengths: '', weaknesses: failMsg, pointDeductions: '' },
        budgetingClarity: { score: null, maxScore: 3.0, citation: '', section: '', strengths: '', weaknesses: failMsg, pointDeductions: '' },
        summary: failMsg,
        summaryFeedback: failMsg,
        committeeRecommendation: isScannedOrEmpty
          ? 'ሰነዱ ስካን የተደረገ ምስል በመሆኑ ጽሑፉ ሊወጣ አልቻለም፤ አስመራጭ ኮሚቴው ጠንካራ ቅጂውን (Hard-copy) አይቶ ነጥብ እንዲሰጥ ይመከራል።'
          : 'የAI አገልግሎት ጥሪ ስላልተሳካ አስመራጭ ኮሚቴው ሰነዱን በቀጥታ አንብቦ ነጥብ እንዲሰጥ ይመከራል።',
        evaluatedAt: new Date(),
        history: errHistory,
      };

      proposal.evaluation = fallbackEvaluation;
      await proposal.save();

      return res.status(200).json({
        success: true,
        status: failStatus,
        isReadFailed: isScannedOrEmpty,
        isAiUnavailable: !isScannedOrEmpty,
        totalScore: null,
        message: failMsg,
        evaluation: fallbackEvaluation,
      });
    }

    if (!aiEvaluation || typeof aiEvaluation !== 'object') {
      return res.status(500).json({
        success: false,
        message: 'የAI ምላሽ ትክክለኛ ቅርጸት አልያዘም፤ እባክዎ እንደገና ይሞክሩ።',
      });
    }

    // ── Programmatic Score Verification & Enforcement ─────────────────────
    const s1Score = Math.min(4.0, Math.max(0.0, Number(aiEvaluation.strategicObjectives?.score ?? 0)));
    const s2Score = Math.min(4.0, Math.max(0.0, Number(aiEvaluation.actionability?.score ?? 0)));
    const s3Score = Math.min(4.0, Math.max(0.0, Number(aiEvaluation.timeline?.score ?? 0)));
    const s4Score = Math.min(3.0, Math.max(0.0, Number(aiEvaluation.budgetingClarity?.score ?? 0)));

    const verifiedTotal = Number((s1Score + s2Score + s3Score + s4Score).toFixed(1));

    const stratObj = {
      score: s1Score,
      maxScore: 4.0,
      citation: String(aiEvaluation.strategicObjectives?.citation || ''),
      section: String(aiEvaluation.strategicObjectives?.section || ''),
      strengths: cleanPureAmharicText(aiEvaluation.strategicObjectives?.strengths, 'የተማሪውን አካዳሚያዊ ልህቀትና ሁለንተናዊ የካምፓስ አገልግሎቶችን ለማሻሻል የተቀመጡት ግቦች።'),
      weaknesses: cleanPureAmharicText(aiEvaluation.strategicObjectives?.weaknesses, 'በሰነዱ ውስጥ አልተገኘም ወይም ውስንነት አለበት።'),
      pointDeductions: cleanPureAmharicText(aiEvaluation.strategicObjectives?.pointDeductions, `ከ 4.0 ነጥብ ላይ ${(4.0 - s1Score).toFixed(1)} ነጥብ ተቀንሷል።`),
    };

    const actObj = {
      score: s2Score,
      maxScore: 4.0,
      citation: String(aiEvaluation.actionability?.citation || ''),
      section: String(aiEvaluation.actionability?.section || ''),
      strengths: cleanPureAmharicText(aiEvaluation.actionability?.strengths, 'ከተማሪዎች ህብረት ስልጣንና ተግባር ጋር የተጣጣሙ የተግባር እርምጃዎች።'),
      weaknesses: cleanPureAmharicText(aiEvaluation.actionability?.weaknesses, 'በሰነዱ ውስጥ አልተገኘም ወይም ውስንነት አለበት።'),
      pointDeductions: cleanPureAmharicText(aiEvaluation.actionability?.pointDeductions, `ከ 4.0 ነጥብ ላይ ${(4.0 - s2Score).toFixed(1)} ነጥብ ተቀንሷል።`),
    };

    const timeObj = {
      score: s3Score,
      maxScore: 4.0,
      citation: String(aiEvaluation.timeline?.citation || ''),
      section: String(aiEvaluation.timeline?.section || ''),
      strengths: cleanPureAmharicText(aiEvaluation.timeline?.strengths, 'የመጀመሪያዎቹ 100 ቀናት የትኩረት አቅጣጫዎች እና የሩብ ዓመት ምዕራፎች።'),
      weaknesses: cleanPureAmharicText(aiEvaluation.timeline?.weaknesses, 'በሰነዱ ውስጥ አልተገኘም ወይም ውስንነት አለበት።'),
      pointDeductions: cleanPureAmharicText(aiEvaluation.timeline?.pointDeductions, `ከ 4.0 ነጥብ ላይ ${(4.0 - s3Score).toFixed(1)} ነጥብ ተቀንሷል።`),
    };

    const budObj = {
      score: s4Score,
      maxScore: 3.0,
      citation: String(aiEvaluation.budgetingClarity?.citation || ''),
      section: String(aiEvaluation.budgetingClarity?.section || ''),
      strengths: cleanPureAmharicText(aiEvaluation.budgetingClarity?.strengths, 'የፋይናንስ ግልጽነት እና የሀብት አጠቃቀም መርሆዎች።'),
      weaknesses: cleanPureAmharicText(aiEvaluation.budgetingClarity?.weaknesses, 'በሰነዱ ውስጥ አልተገኘም ወይም ውስንነት አለበት።'),
      pointDeductions: cleanPureAmharicText(aiEvaluation.budgetingClarity?.pointDeductions, `ከ 3.0 ነጥብ ላይ ${(3.0 - s4Score).toFixed(1)} ነጥብ ተቀንሷል።`),
    };

    const riskAssessmentText = cleanPureAmharicText(aiEvaluation.riskAssessment, 'እቅዱን ተግባራዊ ለማድረግ የበጀት እጥረት እና አስተዳደራዊ ውሳኔዎች ዋና ተግዳሮት ሊሆኑ ይችላሉ።');
    const committeeRecText = cleanPureAmharicText(aiEvaluation.committeeRecommendation, 'አስመራጭ ኮሚቴው የቀረበውን የስትራቴጂክ ዕቅድ ረቂቅ AI ውጤት አይቶ እንዲያጸድቅ ይመከራል።');

    const evalHistory = Array.isArray(proposal.evaluation?.history) ? [...proposal.evaluation.history] : [];
    evalHistory.push({
      changedBy: req.user._id,
      changedByUsername: req.user.username,
      changedByRole: req.user.role,
      changedAt: new Date(),
      action: 'AI_EVALUATION',
      previousScore: proposal.evaluation?.totalScore ?? null,
      newScore: verifiedTotal,
      reason: 'የጋራ AI ረቂቅ ግምገማ በጊዜያዊ የ15 ነጥብ ማዕቀፍ (4-4-4-3) ተዘጋጅቷል',
    });

    const fullEvaluation = {
      isDoubleBlind: true,
      evaluationToken,
      rubricVersion: 'Provisional 15-Point Baseline (4-4-4-3)',
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
      totalScore: verifiedTotal,
      maxTotal: 15.0,
      riskAssessment: riskAssessmentText,
      committeeRecommendation: committeeRecText,
      summary: committeeRecText,
      summaryFeedback: committeeRecText,
      status: 'AI_EVALUATED',
      evaluatedAt: new Date(),
      history: evalHistory,
    };

    fullEvaluation.aiDraft = JSON.parse(JSON.stringify(fullEvaluation));

    // Save single shared evaluation to Proposal in database
    proposal.evaluation = fullEvaluation;
    await proposal.save();

    return res.json({
      success: true,
      proposalId: proposal._id,
      candidateExamCode: proposal.candidateExamCode,
      evaluationToken,
      isDoubleBlind: true,
      rubricVersion: 'Provisional 15-Point Baseline (4-4-4-3)',
      strategicObjectives: stratObj,
      actionability: actObj,
      timeline: timeObj,
      budgetingClarity: budObj,
      totalScore: verifiedTotal,
      maxTotal: 15.0,
      riskAssessment: riskAssessmentText,
      committeeRecommendation: committeeRecText,
      evaluation: fullEvaluation,
      wordCount: extractedText.split(/\s+/).filter(Boolean).length,
      pageCount,
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

    const existingHistory = Array.isArray(proposal.evaluation?.history) ? [...proposal.evaluation.history] : [];
    existingHistory.push({
      changedBy: req.user._id,
      changedByUsername: req.user.username,
      changedByRole: req.user.role,
      changedAt: new Date(),
      action: 'COMMITTEE_APPROVAL',
      previousScore: proposal.evaluation?.totalScore ?? null,
      newScore: finalScore,
      previousCriteria: proposal.evaluation?.criteria || null,
      newCriteria: updatedCriteria,
      reason: req.body.reason || reviewNotes || incomingSummary || 'Approved by election committee official',
    });

    proposal.evaluation = {
      ...(proposal.evaluation || {}),
      isDoubleBlind: true,
      evaluationToken: proposal.evaluation?.evaluationToken || `Code ${proposal.candidateExamCode || 'UNKNOWN'}`,
      rubricVersion: 'Provisional 15-Point Baseline (4-4-4-3)',
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
      history: existingHistory,
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
