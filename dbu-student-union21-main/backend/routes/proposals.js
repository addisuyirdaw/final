/** @format */
const express = require('express');
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

// ── Official Authorized 16 Candidate Codes (from stamped notice) ──────────────
const OFFICIAL_16_EXAM_CODES = [
  '16', '23', '02', '32', '37', '38', '22', '19', '04', '30', '24', '20', '03', '36', '34', '15'
];

/**
 * Normalizes input exam codes:
 * - Strips leading/trailing whitespace and common prefixes (DBU-, 2019-, EXAM-, etc.)
 * - Extracts digits and strips letters or suffixes (e.g. "016R" -> 16, "DBU-02" -> 2, "02" -> 2)
 * - Checks whether code matches one of the 16 authorized candidates
 * - Returns canonical format matching official whitelist (e.g. "02", "03", "04", "16", etc.)
 */
function normalizeCandidateExamCode(rawInput) {
  if (rawInput === undefined || rawInput === null) return null;
  let clean = String(rawInput).trim();
  if (!clean) return null;

  // Strip prefixes like DBU-, 2019-, EXAM-, TOP16-
  clean = clean.replace(/^(?:DBU[-_/\s]*)?(?:2019[-_/\s]*)?(?:EXAM[-_/\s]*)?(?:TOP16[-_/\s]*)?(?:CAND[-_/\s]*)?/i, '');
  // Extract numeric digits, ignoring suffix letters like 'R' or spaces (e.g. "016R" -> 16, "02" -> 2)
  const match = clean.match(/(\d+)/);
  if (!match) return null;
  const num = parseInt(match[1], 10);

  // Find matching code in official 16 list
  const canonical = OFFICIAL_16_EXAM_CODES.find((code) => parseInt(code, 10) === num);
  if (!canonical) {
    return {
      isValid: false,
      rawNumber: num,
      canonicalCode: String(num),
    };
  }

  return {
    isValid: true,
    rawNumber: num,
    canonicalCode: canonical,
  };
}

async function getProposalSettings() {
  let config = await ProposalConfig.findOne({ _key: 'proposal_settings' });
  if (!config) {
    config = await ProposalConfig.create({
      _key: 'proposal_settings',
      deadline: null,
      timezone: 'Africa/Addis_Ababa',
      allowedExamCodes: OFFICIAL_16_EXAM_CODES,
    });
  } else {
    config.allowedExamCodes = OFFICIAL_16_EXAM_CODES;
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
    allowedExamCodes: config.allowedExamCodes || OFFICIAL_16_EXAM_CODES,
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
// 3b. POST /api/proposals/verify-candidate
// Top Performer Verification: Candidate verifies via official 16 exam codes
// ============================================================================
router.post('/verify-candidate', protect, async (req, res) => {
  try {
    const { examCode } = req.body;
    const username = (req.user.username || '').toLowerCase().trim();

    if (!examCode || typeof examCode !== 'string' || !examCode.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide the Candidate Verification Code provided during your final exam evaluation.',
      });
    }

    // 1. Candidate Code Normalization & Whitelist Check
    const normalized = normalizeCandidateExamCode(examCode);
    if (!normalized || !normalized.isValid) {
      return res.status(403).json({
        success: false,
        message: 'Invalid candidate code. Only the 16 shortlisted Executive Committee candidates are authorized to submit proposals.',
      });
    }

    const canonicalCode = normalized.canonicalCode;

    // 2. Strict Candidate-to-StudentID mapping & Anti-hijacking checks
    // A. Check if already claimed in Proposal by another registered candidate
    const existingClaimProposal = await Proposal.findOne({
      candidateExamCode: canonicalCode,
      candidateUsername: { $ne: username },
    });
    if (existingClaimProposal) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized. This exam code belongs to another registered candidate.',
      });
    }

    // B. Check if already claimed in Election candidates by another registered candidate
    const electionsWithCandidate = await Election.find({
      'candidates.examCode': canonicalCode,
    });
    for (const elec of electionsWithCandidate) {
      for (const cand of elec.candidates) {
        if (
          cand.examCode === canonicalCode &&
          (cand.username || '').toLowerCase() !== username
        ) {
          return res.status(403).json({
            success: false,
            message: 'Unauthorized. This exam code belongs to another registered candidate.',
          });
        }
      }
    }

    // 3. Bind on First Successful Claim to the authenticated candidate
    const chosenPosition = 'Sira Asfetsami';

    // Find active or upcoming election, or fallback to any election, or create one
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
      election.candidates[existingIndex].academicYear = candidateYear;
      election.candidates[existingIndex].year = candidateYear;
      election.candidates[existingIndex].department = req.user.department || election.candidates[existingIndex].department || 'General';
    } else {
      election.candidates.push({
        name: req.user.name || 'Candidate',
        username: username,
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
      message: 'Candidate eligibility verified successfully! Your proposal submission portal is now unlocked.',
      candidate: {
        _id: candidateRecord._id,
        name: candidateRecord.name,
        username: candidateRecord.username,
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
    res.status(500).json({ success: false, message: 'Failed to verify candidate code: ' + error.message });
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

    // Determine candidate canonical exam code
    let rawCode = req.body.examCode || req.body.candidateCode || (eligibility.candidate ? eligibility.candidate.examCode : null);
    const normalized = normalizeCandidateExamCode(rawCode);
    const canonicalCode = normalized?.isValid ? normalized.canonicalCode : (eligibility.candidate ? eligibility.candidate.examCode : null);

    if (!canonicalCode || !OFFICIAL_16_EXAM_CODES.includes(canonicalCode)) {
      if (uploadedPath && fs.existsSync(uploadedPath)) fs.unlinkSync(uploadedPath);
      return res.status(403).json({
        success: false,
        message: 'Invalid candidate code. Only the 16 shortlisted Executive Committee candidates are authorized to submit proposals.',
      });
    }

    // Anti-Hijacking Check: verify that this canonicalCode is not claimed by another student
    const existingOtherProposal = await Proposal.findOne({
      candidateExamCode: canonicalCode,
      candidateUsername: { $ne: username },
    });
    if (existingOtherProposal) {
      if (uploadedPath && fs.existsSync(uploadedPath)) fs.unlinkSync(uploadedPath);
      return res.status(403).json({
        success: false,
        message: 'Unauthorized. This exam code belongs to another registered candidate.',
      });
    }

    // Strict One-Time Submission Enforcement (Duplicate Prevention):
    // Check if a proposal already exists for this candidate's normalized exam code OR username
    const existingProposal = await Proposal.findOne({
      $or: [
        { candidateUsername: username },
        { candidateExamCode: canonicalCode },
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
      candidateExamCode: canonicalCode,
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
      candidateExamCode: canonicalCode,
      proposal: {
        referenceNumber: refNumber,
        currentVersion: initialVersion,
        submittedAt: proposal.latestSubmittedAt,
        candidateExamCode: canonicalCode,
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

    // Fetch all proposals
    const allProposals = await Proposal.find({}).lean();
    const proposalMap = new Map();
    allProposals.forEach((p) => {
      proposalMap.set(p.candidateUsername.toLowerCase(), p);
    });

    // Build the dynamic candidate roster with current status
    const candidateRoster = candidates.map((cand) => {
      const userKey = (cand.username || '').toLowerCase();
      const submission = proposalMap.get(userKey);

      if (submission) {
        return {
          candidateId: cand._id || cand.username,
          name: cand.name,
          username: cand.username,
          department: cand.department,
          year: cand.year || cand.academicYear,
          position: cand.position,
          examCode: cand.examCode || '',
          isSubmitted: true,
          status: 'Submitted',
          proposalId: submission._id,
          latestReferenceNumber: submission.latestReferenceNumber,
          latestSubmittedAt: submission.latestSubmittedAt,
          latestSubmittedAtFormatted: formatEthiopiaTime(submission.latestSubmittedAt),
          currentVersion: submission.currentVersion,
          fileName: submission.currentFile ? submission.currentFile.fileName : 'proposal.pdf',
          fileSize: submission.currentFile ? submission.currentFile.fileSize : 0,
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
          department: cand.department,
          year: cand.year || cand.academicYear,
          position: cand.position,
          examCode: cand.examCode || '',
          isSubmitted: false,
          status: 'Pending',
          proposalId: null,
          latestReferenceNumber: null,
          latestSubmittedAt: null,
          latestSubmittedAtFormatted: null,
          currentVersion: null,
          fileName: null,
          fileSize: null,
          versionHistory: [],
        };
      }
    });

    // Preserve previous submissions and version history if election records change
    const activeUsernames = new Set(candidates.map((c) => (c.username || '').toLowerCase()));
    for (const [userKey, submission] of proposalMap.entries()) {
      if (!activeUsernames.has(userKey)) {
        candidateRoster.push({
          candidateId: submission.candidateId || submission.candidateUsername,
          name: submission.candidateName || submission.candidateUsername,
          username: submission.candidateUsername,
          department: submission.candidateDepartment || 'N/A',
          year: submission.candidateYear || 'N/A',
          position: submission.candidatePosition || 'Previous Candidate',
          isSubmitted: true,
          status: 'Submitted (Archived)',
          proposalId: submission._id,
          latestReferenceNumber: submission.latestReferenceNumber,
          latestSubmittedAt: submission.latestSubmittedAt,
          latestSubmittedAtFormatted: formatEthiopiaTime(submission.latestSubmittedAt),
          currentVersion: submission.currentVersion,
          fileName: submission.currentFile ? submission.currentFile.fileName : 'proposal.pdf',
          fileSize: submission.currentFile ? submission.currentFile.fileSize : 0,
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

module.exports = router;
