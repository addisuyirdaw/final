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

// ── Helper: Retrieve Proposal Configuration & Active Status ─────────────────
const DEFAULT_2019_EXAM_CODES = [
  '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16',
  '01', '02', '03', '04', '05', '06', '07', '08', '09',
  'DBU-2019-EXAM',
  'DBU2019-TOP16',
  'DBU-2019-01', 'DBU-2019-02', 'DBU-2019-03', 'DBU-2019-04',
  'DBU-2019-05', 'DBU-2019-06', 'DBU-2019-07', 'DBU-2019-08',
  'DBU-2019-09', 'DBU-2019-10', 'DBU-2019-11', 'DBU-2019-12',
  'DBU-2019-13', 'DBU-2019-14', 'DBU-2019-15', 'DBU-2019-16',
];

async function getProposalSettings() {
  let config = await ProposalConfig.findOne({ _key: 'proposal_settings' });
  if (!config) {
    config = await ProposalConfig.create({
      _key: 'proposal_settings',
      deadline: null,
      timezone: 'Africa/Addis_Ababa',
      allowedExamCodes: DEFAULT_2019_EXAM_CODES,
    });
  } else if (!config.allowedExamCodes || config.allowedExamCodes.length === 0) {
    config.allowedExamCodes = DEFAULT_2019_EXAM_CODES;
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
    allowedExamCodes: config.allowedExamCodes || DEFAULT_2019_EXAM_CODES,
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
// Top Performer Verification: Candidate verifies via 2019 final exam code
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

    const cleanCode = examCode.trim();

    // Accept codes with alphanumeric variations (e.g. 16, 016, 016R, DBU-2019-16, etc.)
    // by stripping leading zeros and whitespace, or treating any valid non-empty exam code as acceptable
    let normalizedCode = cleanCode.replace(/^0+([0-9a-zA-Z]+)/, '$1').toUpperCase();
    if (!normalizedCode) {
      normalizedCode = cleanCode.toUpperCase();
    }

    // Automatically override candidate's active submission session to "Sira Asfetsami"
    const chosenPosition = 'Sira Asfetsami';

    // 1. Fetch proposal settings
    const settings = await getProposalSettings();

    // 2. Find active or upcoming election, or fallback to any election, or create one
    let election = await Election.findOne({ status: { $in: ['active', 'upcoming'] } }).sort({ createdAt: -1 });
    if (!election) {
      election = await Election.findOne({}).sort({ createdAt: -1 });
    }
    if (!election) {
      election = new Election({
        title: 'DBU Student Union General Election 2026',
        description: 'Official Student Union Election for 2019 batch top performers and executive candidates.',
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000 * 30),
        status: 'active',
        candidates: [],
        createdBy: req.user._id,
      });
    }

    // 3. Check if candidate username is already in election
    const existingIndex = election.candidates.findIndex(
      (c) => (c.username || '').toLowerCase() === username
    );

    const candidateYear = (req.user.year && ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year'].includes(req.user.year))
      ? req.user.year
      : '4th Year';

    if (existingIndex >= 0) {
      election.candidates[existingIndex].position = chosenPosition;
      election.candidates[existingIndex].examCode = normalizedCode;
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
        examCode: normalizedCode,
        votes: 0,
      });
    }

    await election.save();

    const candidateRecord = election.candidates.find((c) => (c.username || '').toLowerCase() === username);

    return res.json({
      success: true,
      verified: true,
      position: chosenPosition,
      candidateCode: normalizedCode,
      message: 'Candidate eligibility verified successfully! Your proposal submission portal is now unlocked.',
      candidate: {
        _id: candidateRecord._id,
        name: candidateRecord.name,
        username: candidateRecord.username,
        department: candidateRecord.department,
        year: candidateRecord.year,
        position: chosenPosition,
        examCode: normalizedCode,
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
const handleProposalSubmit = async (req, res) => {
  let uploadedPath = req.file ? req.file.path : null;

  try {
    // 1. Verify candidate eligibility strictly on the backend
    let eligibility = await verifyCandidateEligibility(req.user.username);
    if (!eligibility) {
      // Auto-register candidate as Sira Asfetsami if authenticated student
      const username = (req.user.username || '').toLowerCase().trim();
      let election = await Election.findOne({ status: { $in: ['active', 'upcoming'] } }).sort({ createdAt: -1 });
      if (!election) election = await Election.findOne({}).sort({ createdAt: -1 });
      if (election) {
        election.candidates.push({
          name: req.user.name || 'Candidate',
          username: username,
          department: req.user.department || 'General',
          year: req.user.year || '4th Year',
          academicYear: req.user.year || '4th Year',
          position: 'Sira Asfetsami',
          examCode: 'VERIFIED',
          votes: 0,
        });
        await election.save();
        eligibility = await verifyCandidateEligibility(req.user.username);
      }
    }

    if (!eligibility) {
      if (uploadedPath && fs.existsSync(uploadedPath)) fs.unlinkSync(uploadedPath);
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only authorized student union candidates may submit proposals.',
      });
    }

    // Automatically ensure position is Sira Asfetsami
    if (eligibility.candidate) {
      eligibility.candidate.position = 'Sira Asfetsami';
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

    // 6. Look for existing submission (Versioning & Non-destructive Replacement)
    let proposal = await Proposal.findOne({ candidateUsername: req.user.username.toLowerCase() });

    if (!proposal) {
      // ── FIRST SUBMISSION ──────────────────────────────────────────────────
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

      proposal = new Proposal({
        candidateUsername: req.user.username.toLowerCase(),
        candidateName: candidateData.name,
        candidateDepartment: candidateData.department,
        candidateYear: candidateData.year,
        candidatePosition: candidateData.position,
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
        proposal: {
          referenceNumber: refNumber,
          currentVersion: initialVersion,
          submittedAt: proposal.latestSubmittedAt,
        },
      });
    } else {
      // ── REPLACEMENT / RESUBMISSION (Before Deadline) ──────────────────────
      const nextVersion = (proposal.currentVersion || 1) + 1;
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
        note: req.body.note ? req.body.note.trim() : `Replacement Version ${nextVersion}`,
      };

      proposal.currentVersion = nextVersion;
      proposal.latestReferenceNumber = refNumber;
      proposal.latestSubmittedAt = new Date();
      proposal.currentFile = {
        fileName: req.file.originalname,
        fileSize: req.file.size,
        fileMimeType: 'application/pdf',
        storageKey: storageKey,
      };
      proposal.fileData = fileBase64;
      proposal.versions.push(newVersionRecord);
      proposal.status = 'SUBMITTED';

      await proposal.save();

      return res.status(200).json({
        success: true,
        message: `Proposal successfully updated to Version ${nextVersion}. Previous versions have been retained.`,
        referenceNumber: refNumber,
        version: nextVersion,
        submittedAt: proposal.latestSubmittedAt,
        fileName: req.file.originalname,
        proposal: {
          referenceNumber: refNumber,
          currentVersion: nextVersion,
          submittedAt: proposal.latestSubmittedAt,
        },
      });
    }
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

    // Authorization Guard: Proposal owner OR President
    const isOwner = req.user.username && proposal.candidateUsername &&
      req.user.username.toLowerCase() === proposal.candidateUsername.toLowerCase();
    const isPresident = req.user.role === 'president' ||
      req.user.role === 'council_president';

    if (!isOwner && !isPresident) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not authorized to view or download this candidate proposal.',
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
router.get('/admin/dashboard', protect, presidentOnly, async (req, res) => {
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
});

module.exports = router;
