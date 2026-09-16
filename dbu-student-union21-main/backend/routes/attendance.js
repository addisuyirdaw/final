/** @format */
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const Attendance = require('../models/Attendance');
const AttendanceSession = require('../models/AttendanceSession');
const Club = require('../models/Club');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// Rate limiting for scan endpoint (60 requests per minute per IP)
const scanLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many attendance check-in attempts. Please wait a moment and try again.',
  },
});

// Rotating QR Challenge configuration: 20-second time-step
const CHALLENGE_STEP_MS = 20 * 1000;

/**
 * Generate a rotating HMAC-SHA256 challenge token for a given session and timestamp
 */
function generateChallengeForSession(challengeSecret, timestamp = Date.now()) {
  if (!challengeSecret) return '';
  const step = Math.floor(timestamp / CHALLENGE_STEP_MS);
  return crypto
    .createHmac('sha256', challengeSecret)
    .update(String(step))
    .digest('hex')
    .substring(0, 16);
}

/**
 * Safely compare two strings in constant time
 */
function safeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Validate a rotating challenge token against the current and previous time step
 * (Provides a 1-step grace window for network transmission delay)
 */
function isChallengeValid(challengeSecret, providedChallenge) {
  if (!challengeSecret || !providedChallenge) return false;
  const now = Date.now();
  const currentStep = Math.floor(now / CHALLENGE_STEP_MS);
  const prevStep = currentStep - 1;

  const validCurrent = crypto
    .createHmac('sha256', challengeSecret)
    .update(String(currentStep))
    .digest('hex')
    .substring(0, 16);

  const validPrev = crypto
    .createHmac('sha256', challengeSecret)
    .update(String(prevStep))
    .digest('hex')
    .substring(0, 16);

  return safeCompare(providedChallenge, validCurrent) || safeCompare(providedChallenge, validPrev);
}

/**
 * Check if a user is authorized to manage attendance for a club
 */
function isUserAuthorizedForClub(user, club) {
  if (!user) return false;
  if (user.isAdmin) return true;
  const specialRoles = ['admin', 'superadmin', 'clubs_coordinator', 'academic_affairs', 'system_admin'];
  if (specialRoles.includes(user.role)) return true;

  if (!club) return false;
  const userIdStr = user._id.toString();

  const isPresident = club.leadership?.president?.toString() === userIdStr;
  const isVP = club.leadership?.vicePresident?.toString() === userIdStr;
  const isSecretary = club.leadership?.secretary?.toString() === userIdStr;
  const isTreasurer = club.leadership?.treasurer?.toString() === userIdStr;
  const isCreator = club.creator?.toString() === userIdStr;

  const isApprovedOfficer = club.members?.some(
    (m) =>
      m.user?.toString() === userIdStr &&
      ['president', 'vice_president', 'officer', 'secretary', 'treasurer', 'representative', 'leader', 'coordinator'].includes(m.role) &&
      m.status === 'approved'
  );

  return isPresident || isVP || isSecretary || isTreasurer || isCreator || isApprovedOfficer;
}

// ─────────────────────────────────────────────────────────────────────────────
// ORGANIZER ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

// @desc    Get attendance-eligible events for a club
// @route   GET /api/attendance/events/:clubId
// @access  Private (Club Leader / Admin / Coordinator)
router.get('/events/:clubId', protect, async (req, res) => {
  try {
    const { clubId } = req.params;
    const club = await Club.findById(clubId);
    if (!club) {
      return res.status(404).json({ success: false, message: 'Club not found' });
    }

    if (!isUserAuthorizedForClub(req.user, club)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not authorized to manage attendance for this club',
      });
    }

    // Filter events that are approved, planned, or ongoing
    const eligibleEvents = (club.events || [])
      .filter((ev) => ['approved', 'planned', 'ongoing'].includes(ev.status))
      .map((ev) => ({
        _id: ev._id,
        title: ev.title,
        description: ev.description,
        date: ev.date,
        location: ev.location,
        startTime: ev.startTime,
        endTime: ev.endTime,
        status: ev.status,
        activeCheckIn: ev.activeCheckIn,
        attendanceCode: ev.attendanceCode,
        attendeesCount: ev.attendees ? ev.attendees.length : 0,
      }));

    res.json({
      success: true,
      clubName: club.name,
      events: eligibleEvents,
    });
  } catch (error) {
    console.error('Fetch club events for attendance error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching events', error: error.message });
  }
});

// @desc    Start an official event-linked attendance session
// @route   POST /api/attendance/events/:clubId/:eventId/start
// @access  Private (Club Leader / Admin / Coordinator)
router.post('/events/:clubId/:eventId/start', protect, async (req, res) => {
  try {
    const { clubId, eventId } = req.params;
    const { validMinutes = 30 } = req.body;

    const club = await Club.findById(clubId);
    if (!club) {
      return res.status(404).json({ success: false, message: 'Club not found' });
    }

    if (!isUserAuthorizedForClub(req.user, club)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only authorized club leaders or administrators can start attendance',
      });
    }

    const event = club.events.id(eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found in the specified club' });
    }

    if (!['approved', 'planned', 'ongoing'].includes(event.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot start attendance for event with status "${event.status}". Event must be approved or planned.`,
      });
    }

    // Derive hours credit strictly from event duration or default to 1.0
    let derivedHours = 1;
    if (event.startTime && event.endTime) {
      const diffMs = new Date(event.endTime).getTime() - new Date(event.startTime).getTime();
      if (diffMs > 0) {
        const rawHours = diffMs / (1000 * 60 * 60);
        derivedHours = Math.min(8, Math.max(0.5, Math.round(rawHours * 2) / 2));
      }
    }

    // Idempotency: Check if an active, unexpired session already exists for this exact event
    let session = await AttendanceSession.findOne({
      clubId: club._id,
      eventId: event._id,
      isActive: true,
      expiresAt: { $gt: new Date() },
    });

    if (!session) {
      // Create fresh session with secure cryptographic challenge material
      const sessionToken = crypto.randomUUID();
      const shortCode = crypto.randomBytes(3).toString('hex').toUpperCase(); // 6 secure hex chars
      const challengeSecret = crypto.randomBytes(16).toString('hex');
      const durationMinutes = Math.min(240, Math.max(5, parseInt(validMinutes, 10) || 30));
      const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

      session = await AttendanceSession.create({
        sessionToken,
        shortCode,
        clubId: club._id,
        eventId: event._id,
        eventTitle: event.title,
        clubName: club.name,
        hoursCredit: derivedHours,
        expiresAt,
        startedAt: new Date(),
        createdBy: req.user._id,
        isActive: true,
        challengeSecret,
      });

      // Synchronize with embedded club event
      event.activeCheckIn = true;
      event.attendanceCode = shortCode;
      event.status = 'ongoing';
      await club.save();
    } else if (!session.challengeSecret) {
      // Upgrade existing legacy session if secret was missing
      session.challengeSecret = crypto.randomBytes(16).toString('hex');
      await session.save();
    }

    const currentChallenge = generateChallengeForSession(session.challengeSecret);
    const challengeExpiresIn = Math.ceil((CHALLENGE_STEP_MS - (Date.now() % CHALLENGE_STEP_MS)) / 1000);

    res.json({
      success: true,
      message: `Attendance session active for "${session.eventTitle}"`,
      session: {
        sessionToken: session.sessionToken,
        shortCode: session.shortCode,
        eventTitle: session.eventTitle,
        clubName: session.clubName,
        hoursCredit: session.hoursCredit,
        expiresAt: session.expiresAt.toISOString(),
        isActive: session.isActive,
        currentChallenge,
        challengeExpiresIn,
      },
    });
  } catch (error) {
    console.error('Start event attendance error:', error);
    res.status(500).json({ success: false, message: 'Server error starting attendance', error: error.message });
  }
});

// @desc    Generate/Start generic QR session (with strict authorization guard)
// @route   POST /api/attendance/generate-qr
// @access  Private (Club Leader / Admin / Coordinator)
router.post('/generate-qr', protect, async (req, res) => {
  try {
    const { clubId, eventId, eventTitle, validMinutes = 30, hoursCredit = 1 } = req.body;

    const isSpecialRole =
      req.user.isAdmin ||
      ['admin', 'superadmin', 'clubs_coordinator', 'academic_affairs', 'system_admin'].includes(req.user.role);

    let clubName = 'DBU Student Activity';
    let targetClub = null;

    if (clubId) {
      targetClub = await Club.findById(clubId);
      if (!targetClub) {
        return res.status(404).json({ success: false, message: 'Club not found' });
      }
      if (!isSpecialRole && !isUserAuthorizedForClub(req.user, targetClub)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Only club leaders or administrators can generate attendance QR codes',
        });
      }
      clubName = targetClub.name;
    } else {
      // Security Guard: Prevent arbitrary unprivileged students from creating institutional sessions
      let hasLeaderPrivileges = isSpecialRole;
      if (!hasLeaderPrivileges) {
        // Check if they are a leader for ANY club (via members array OR direct leadership fields)
        const userClubs = await Club.find({
          $or: [
            { 'members.user': req.user._id, 'members.status': 'approved' },
            { 'leadership.president': req.user._id },
            { 'leadership.vicePresident': req.user._id },
            { 'leadership.secretary': req.user._id },
            { 'leadership.treasurer': req.user._id },
            { 'creator': req.user._id }
          ]
        });
        hasLeaderPrivileges = userClubs.some(club => isUserAuthorizedForClub(req.user, club));
      }

      if (!hasLeaderPrivileges) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Institutional attendance sessions require administrator or club leader privileges',
        });
      }
    }

    let resolvedTitle = eventTitle?.trim();
    let finalEventId = null;

    if (targetClub && eventId) {
      const ev = targetClub.events.id(eventId);
      if (ev) {
        resolvedTitle = ev.title;
        finalEventId = ev._id;
      }
    }

    const sessionToken = crypto.randomUUID();
    const shortCode = crypto.randomBytes(3).toString('hex').toUpperCase();
    const challengeSecret = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + Math.max(5, parseInt(validMinutes, 10) || 30) * 60 * 1000);
    const finalTitle = resolvedTitle || (targetClub ? `${targetClub.name} Activity Session` : 'DBU Campus Event');

    const session = await AttendanceSession.create({
      sessionToken,
      shortCode,
      clubId: clubId || null,
      eventId: finalEventId,
      eventTitle: finalTitle,
      clubName,
      hoursCredit: parseFloat(hoursCredit) || 1,
      expiresAt,
      startedAt: new Date(),
      createdBy: req.user._id,
      isActive: true,
      challengeSecret,
    });

    if (targetClub && finalEventId) {
      try {
        const ev = targetClub.events.id(finalEventId);
        if (ev) {
          ev.activeCheckIn = true;
          ev.attendanceCode = shortCode;
          ev.status = 'ongoing';
          await targetClub.save();
        }
      } catch (err) {
        console.warn('Could not link event subdoc:', err.message);
      }
    }

    const currentChallenge = generateChallengeForSession(challengeSecret);
    const challengeExpiresIn = Math.ceil((CHALLENGE_STEP_MS - (Date.now() % CHALLENGE_STEP_MS)) / 1000);

    res.json({
      success: true,
      message: 'Attendance QR session launched successfully',
      session: {
        sessionToken,
        shortCode,
        eventTitle: finalTitle,
        clubName,
        hoursCredit: session.hoursCredit,
        expiresAt: expiresAt.toISOString(),
        isActive: true,
        currentChallenge,
        challengeExpiresIn,
      },
    });
  } catch (error) {
    console.error('Generate QR error:', error);
    res.status(500).json({ success: false, message: 'Server error generating attendance session', error: error.message });
  }
});

// @desc    End/Close an attendance session early
// @route   POST /api/attendance/sessions/:sessionToken/close
// @access  Private (Session Creator / Club Leader / Admin)
router.post('/sessions/:sessionToken/close', protect, async (req, res) => {
  try {
    const { sessionToken } = req.params;
    const session = await AttendanceSession.findOne({ sessionToken });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Attendance session not found' });
    }

    let targetClub = null;
    if (session.clubId) {
      targetClub = await Club.findById(session.clubId);
    }

    const isCreator = session.createdBy?.toString() === req.user._id.toString();
    const isAuthorized = isCreator || isUserAuthorizedForClub(req.user, targetClub);

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not authorized to close this attendance session',
      });
    }

    session.isActive = false;
    session.closedAt = new Date();
    session.closedBy = req.user._id;
    await session.save();

    // Deactivate check-in on the club event and process absentees
    if (targetClub && session.eventId) {
      try {
        const ev = targetClub.events.id(session.eventId);
        if (ev) {
          ev.activeCheckIn = false;
        }

        // Process absentees and ghosting rules
        const attendees = await Attendance.find({ sessionToken }).select('studentId').lean();
        const attendedUserIds = new Set(attendees.map(a => a.studentId.toString()));
        let ghostedCount = 0;
        let absentRecordsToCreate = [];

        targetClub.members.forEach((member) => {
          if (['approved', 'restricted', 'Inactive_Ghost'].includes(member.status)) {
            const memberIdStr = member.user.toString();
            const isPresent = attendedUserIds.has(memberIdStr);
            
            if (!isPresent) {
              member.absentStreak = (member.absentStreak || 0) + 1;
              if (member.absentStreak >= 3) {
                member.status = 'Inactive_Ghost';
                ghostedCount++;
              }
              
              // Prepare ABSENT record
              absentRecordsToCreate.push({
                studentId: member.user,
                clubId: session.clubId,
                eventId: session.eventId,
                eventModel: 'ClubEvent',
                sessionToken: session.sessionToken,
                shortCode: session.shortCode,
                eventTitle: session.eventTitle,
                clubName: session.clubName,
                hoursCredit: 0,
                status: 'ABSENT',
                scannedAt: new Date(),
                verificationMethod: 'SYSTEM_GENERATED',
              });
            } else {
              member.absentStreak = 0;
            }
          }
        });

        await targetClub.save();

        if (absentRecordsToCreate.length > 0) {
          await Attendance.insertMany(absentRecordsToCreate, { ordered: false }).catch(err => {
            console.warn('Batch insert ABSENT records note:', err.message);
          });
        }
      } catch (err) {
        console.warn('Club event check-in close sync note:', err.message);
      }
    }

    res.json({
      success: true,
      message: 'Attendance session has been closed successfully. No further check-ins will be accepted.',
      sessionToken: session.sessionToken,
      closedAt: session.closedAt,
    });
  } catch (error) {
    console.error('Close attendance session error:', error);
    res.status(500).json({ success: false, message: 'Server error closing attendance session', error: error.message });
  }
});

// @desc    Lightweight polling endpoint for organizer UI (counts, rotating challenge, recent check-ins)
// @route   GET /api/attendance/sessions/:sessionToken/summary
// @access  Private (Session Creator / Club Leader / Admin)
router.get('/sessions/:sessionToken/summary', protect, async (req, res) => {
  try {
    const { sessionToken } = req.params;
    const session = await AttendanceSession.findOne({ sessionToken }).lean();
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    let targetClub = null;
    if (session.clubId) {
      targetClub = await Club.findById(session.clubId).lean();
    }

    const isCreator = session.createdBy?.toString() === req.user._id.toString();
    const isAuthorized = isCreator || isUserAuthorizedForClub(req.user, targetClub);

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not authorized to view this session summary',
      });
    }

    const isExpired = Date.now() > new Date(session.expiresAt).getTime();
    const isCurrentlyActive = session.isActive && !isExpired;

    const presentCount = await Attendance.countDocuments({ sessionToken });

    // Last 5 check-ins for the live feed
    const recentCheckins = await Attendance.find({ sessionToken })
      .sort({ scannedAt: -1 })
      .limit(5)
      .populate('studentId', 'name username profileImage')
      .lean();

    const currentChallenge = session.challengeSecret
      ? generateChallengeForSession(session.challengeSecret)
      : '';
    const challengeExpiresIn = Math.ceil((CHALLENGE_STEP_MS - (Date.now() % CHALLENGE_STEP_MS)) / 1000);

    res.json({
      success: true,
      sessionToken: session.sessionToken,
      eventTitle: session.eventTitle,
      clubName: session.clubName,
      hoursCredit: session.hoursCredit,
      isActive: isCurrentlyActive,
      expiresAt: session.expiresAt,
      presentCount,
      currentChallenge,
      challengeExpiresIn,
      recentCheckins: recentCheckins.map((rc) => ({
        id: rc._id,
        name: rc.studentId?.name || 'Student',
        studentId: rc.studentId?.username || '',
        scannedAt: rc.scannedAt,
        hours: rc.hoursCredit,
      })),
    });
  } catch (error) {
    console.error('Fetch session summary error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching session summary', error: error.message });
  }
});

// @desc    Full Attendee Roster (Present and Not-Yet members)
// @route   GET /api/attendance/sessions/:sessionToken/roster
// @access  Private (Session Creator / Club Leader / Admin Only — Privacy Protected)
router.get('/sessions/:sessionToken/roster', protect, async (req, res) => {
  try {
    const { sessionToken } = req.params;
    const session = await AttendanceSession.findOne({ sessionToken }).lean();
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    let targetClub = null;
    if (session.clubId) {
      targetClub = await Club.findById(session.clubId).lean();
    }

    const isCreator = session.createdBy?.toString() === req.user._id.toString();
    const isAuthorized = isCreator || isUserAuthorizedForClub(req.user, targetClub);

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not authorized to view the attendee roster',
      });
    }

    const allAttendees = await Attendance.find({ sessionToken })
      .populate('studentId', 'name username department year email profileImage')
      .sort({ scannedAt: -1 })
      .lean();

    const attendees = allAttendees.filter(a => a.status === 'PRESENT');
    const absentees = allAttendees.filter(a => a.status === 'ABSENT');

    // Compute "Not Yet" roster from club membership
    let notYet = [];
    if (session.isActive && targetClub && targetClub.members) {
      const attendedUserIds = new Set(
        attendees.map((a) => a.studentId?._id?.toString() || a.studentId?.toString())
      );

      notYet = targetClub.members
        .filter(
          (m) =>
            m.user &&
            !attendedUserIds.has(m.user.toString()) &&
            ['approved', 'restricted', 'Inactive_Ghost'].includes(m.status)
        )
        .map((m) => ({
          userId: m.user,
          fullName: m.fullName || 'Member',
          department: m.department || '',
          year: m.year || '',
          status: 'NOT_YET',
        }));
    }

    res.json({
      success: true,
      sessionToken,
      eventTitle: session.eventTitle,
      presentCount: attendees.length,
      absentCount: absentees.length,
      notYetCount: notYet.length,
      attendees,
      absentees,
      notYet,
    });
  } catch (error) {
    console.error('Fetch roster error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching roster', error: error.message });
  }
});

// Legacy backward-compatibility route for roster
router.get('/roster/:sessionToken', protect, async (req, res) => {
  req.url = `/sessions/${req.params.sessionToken}/roster`;
  return router.handle(req, res);
});

// ─────────────────────────────────────────────────────────────────────────────
// STUDENT CHECK-IN ENDPOINT
// ─────────────────────────────────────────────────────────────────────────────

// @desc    Scan and record attendance using rotating QR challenge or backup shortCode
// @route   POST /api/attendance/scan
// @access  Private (Any active authenticated student)
router.post('/scan', protect, scanLimiter, async (req, res) => {
  try {
    const { qrPayload, sessionToken, challengeToken, code } = req.body;
    const studentId = req.user._id;

    let targetToken = sessionToken;
    let targetChallenge = challengeToken;
    let targetCode = code ? String(code).trim().toUpperCase() : null;

    // Parse URL or payload parameters if qrPayload provided
    if (qrPayload) {
      const str = String(qrPayload).trim();
      if (str.includes('token=') || str.includes('c=') || str.includes('code=') || str.includes('?')) {
        try {
          const parsedUrl = new URL(
            str.startsWith('http') ? str : `http://localhost${str.startsWith('/') ? '' : '/'}${str}`
          );
          if (parsedUrl.searchParams.get('token')) targetToken = parsedUrl.searchParams.get('token');
          if (parsedUrl.searchParams.get('c')) targetChallenge = parsedUrl.searchParams.get('c');
          if (parsedUrl.searchParams.get('code')) targetCode = parsedUrl.searchParams.get('code').toUpperCase();
        } catch (_) {
          const matchToken = str.match(/token=([a-zA-Z0-9-]+)/i);
          const matchChallenge = str.match(/c=([a-zA-Z0-9]+)/i);
          const matchCode = str.match(/code=([a-zA-Z0-9]+)/i);
          if (matchToken) targetToken = matchToken[1];
          if (matchChallenge) targetChallenge = matchChallenge[1];
          if (matchCode) targetCode = matchCode[1].toUpperCase();
        }
      } else if (str.startsWith('{')) {
        try {
          const json = JSON.parse(str);
          if (json.token) targetToken = json.token;
          if (json.c) targetChallenge = json.c;
          if (json.code) targetCode = json.code.toUpperCase();
        } catch (_) {}
      } else if (str.length === 36 && str.includes('-')) {
        targetToken = str;
      } else if (str.length <= 8) {
        targetCode = str.toUpperCase();
      }
    }

    if (!targetToken && !targetCode) {
      return res.status(400).json({
        success: false,
        message: 'Please scan the live QR code or enter the event check-in code.',
      });
    }

    // Lookup session in MongoDB
    let session = null;
    if (targetToken) {
      session = await AttendanceSession.findOne({ sessionToken: targetToken });
    }
    if (!session && targetCode) {
      session = await AttendanceSession.findOne({ shortCode: targetCode });
    }

    // STRICT ARCHITECTURE RULE: No Tier-4 on-the-fly session generation!
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Attendance session not found. Please verify with your event coordinator.',
      });
    }

    // 1. Check Session State (isActive)
    if (session.isActive === false) {
      return res.status(400).json({
        success: false,
        message: 'Attendance has ended for this event.',
      });
    }

    // 2. Check Expiration
    const expiryTime = session.expiresAt ? new Date(session.expiresAt).getTime() : 0;
    if (expiryTime && Date.now() > expiryTime) {
      return res.status(400).json({
        success: false,
        message: 'This attendance session has expired. Please ask the organizer for an active session.',
      });
    }

    // 3. Check Rotating QR Challenge or Fallback Code
    let verificationMethod = 'QR_SCAN';

    if (targetChallenge && session.challengeSecret) {
      const isValid = isChallengeValid(session.challengeSecret, targetChallenge);
      if (!isValid) {
        return res.status(400).json({
          success: false,
          message: 'This QR code is no longer valid or has refreshed. Please scan the current code on screen.',
        });
      }
      verificationMethod = 'QR_SCAN';
    } else if (targetCode && session.shortCode) {
      if (targetCode !== session.shortCode) {
        return res.status(400).json({
          success: false,
          message: 'Invalid check-in code. Please verify the code displayed on screen.',
        });
      }
      verificationMethod = 'MANUAL_CODE';
    } else if (!session.challengeSecret && targetToken) {
      // Graceful support for pre-existing legacy sessions without challenge secrets
      verificationMethod = 'QR_SCAN';
    } else {
      return res.status(400).json({
        success: false,
        message: 'Valid QR challenge or check-in code required.',
      });
    }

    // 4. Duplicate Check (Idempotent success)
    const existing = await Attendance.findOne({
      studentId,
      sessionToken: session.sessionToken,
    });

    if (existing) {
      return res.status(200).json({
        success: true,
        alreadyRecorded: true,
        message: `You are already marked Present for "${session.eventTitle}".`,
        attendance: existing,
      });
    }

    // 5. Create Standalone Verified Attendance Record
    const newAttendance = await Attendance.create({
      studentId,
      clubId: session.clubId || null,
      eventId: session.eventId || null,
      eventModel: 'ClubEvent',
      sessionToken: session.sessionToken,
      shortCode: session.shortCode,
      eventTitle: session.eventTitle,
      clubName: session.clubName,
      hoursCredit: session.hoursCredit || 1,
      status: 'PRESENT',
      scannedAt: new Date(),
      verificationMethod,
    });

    // 6. Concurrency-Safe Atomic Club Counters Update (No whole-document version collisions)
    if (session.clubId) {
      try {
        // Increment attendanceCount and reset absentStreak atomically
        await Club.updateOne(
          { _id: session.clubId, 'members.user': studentId },
          {
            $inc: { 'members.$.attendanceCount': 1 },
            $set: { 'members.$.absentStreak': 0 },
          }
        );

        // Restore ghost status if applicable
        await Club.updateOne(
          { _id: session.clubId, 'members.user': studentId, 'members.status': 'Inactive_Ghost' },
          { $set: { 'members.$.status': 'approved' } }
        );

        // Add to event attendees list atomically
        if (session.eventId) {
          await Club.updateOne(
            { _id: session.clubId, 'events._id': session.eventId },
            { $addToSet: { 'events.$.attendees': studentId } }
          );
        }
      } catch (syncErr) {
        console.warn('Atomic club update sync note:', syncErr.message);
      }
    }

    res.status(201).json({
      success: true,
      message: `✓ Attendance recorded — Present for "${session.eventTitle}"!`,
      hoursEarned: session.hoursCredit || 1,
      attendance: newAttendance,
    });
  } catch (error) {
    console.error('Scan attendance error:', error);
    if (error.code === 11000) {
      return res.status(200).json({
        success: true,
        alreadyRecorded: true,
        message: 'You are already marked Present for this session.',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error processing attendance scan',
      error: error.message,
    });
  }
});

// @desc    Get current student's personal attendance history
// @route   GET /api/attendance/my-attendance
// @access  Private (Logged-in student)
router.get('/my-attendance', protect, async (req, res) => {
  try {
    const records = await Attendance.find({ studentId: req.user._id })
      .sort({ scannedAt: -1 })
      .populate('clubId', 'name category image')
      .lean();

    const totalHours = records.reduce((sum, r) => sum + (r.hoursCredit || 1), 0);

    res.json({
      success: true,
      count: records.length,
      totalHours,
      records,
    });
  } catch (error) {
    console.error('Fetch my attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance history',
      error: error.message,
    });
  }
});

// @desc    Get attendance sessions hosted by the current user
// @route   GET /api/attendance/hosted-sessions
// @access  Private (Club Leader / Admin)
router.get('/hosted-sessions', protect, async (req, res) => {
  try {
    const isSpecialRole =
      req.user.isAdmin ||
      ['admin', 'superadmin', 'clubs_coordinator', 'academic_affairs', 'system_admin'].includes(req.user.role);

    // Let them see sessions they created
    const sessions = await AttendanceSession.find({ createdBy: req.user._id })
      .sort({ startedAt: -1 })
      .lean();

    // Attach detailed attendance rosters to each session
    const sessionsWithRosters = await Promise.all(
      sessions.map(async (session) => {
        const records = await Attendance.find({ sessionToken: session.sessionToken })
          .populate('studentId', 'name username department')
          .sort({ status: -1, scannedAt: -1 }) // PRESENT first, then ABSENT
          .lean();
        return {
          ...session,
          roster: records.map(r => ({
            id: r._id,
            name: r.studentId?.name || 'Unknown',
            username: r.studentId?.username || '',
            status: r.status,
            scannedAt: r.scannedAt
          }))
        };
      })
    );

    res.json({
      success: true,
      count: sessionsWithRosters.length,
      sessions: sessionsWithRosters,
    });
  } catch (error) {
    console.error('Fetch hosted sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch hosted sessions',
      error: error.message,
    });
  }
});

// @desc    Get daily attendance register for a club
// @route   GET /api/attendance/club/:clubId/daily
// @access  Private (Club Leader / Admin / Coordinator)
router.get('/club/:clubId/daily', protect, async (req, res) => {
  try {
    const { clubId } = req.params;
    const { date } = req.query;

    const club = await Club.findById(clubId).populate('members.user', 'name username email avatar');
    if (!club) {
      return res.status(404).json({ success: false, message: 'Club not found' });
    }

    if (!isUserAuthorizedForClub(req.user, club)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only authorized club leaders or administrators can view attendance register',
      });
    }

    // Parse date window
    let targetDate = new Date();
    if (date) {
      targetDate = new Date(date);
    }
    
    // Set to start and end of the day in UTC
    const startOfDay = new Date(targetDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    
    const endOfDay = new Date(targetDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const attendanceRecords = await Attendance.find({
      clubId: club._id,
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    }).lean();

    // Map by student ID
    const attendanceMap = new Map();
    attendanceRecords.forEach(record => {
      attendanceMap.set(record.studentId.toString(), record);
    });

    const register = [];
    let presentCount = 0;
    let absentCount = 0;

    // Filter to approved members only
    const activeMembers = club.members.filter(m => m.status === 'approved' && m.user);

    activeMembers.forEach(member => {
      const studentIdStr = member.user._id.toString();
      const record = attendanceMap.get(studentIdStr);
      
      if (record && record.status === 'PRESENT') {
        presentCount++;
        register.push({
          studentId: member.user.username,
          name: member.user.name || member.fullName,
          status: 'PRESENT',
          checkInTime: record.createdAt || record.scannedAt,
          hours: record.hoursCredit || 0
        });
      } else {
        absentCount++;
        register.push({
          studentId: member.user.username,
          name: member.user.name || member.fullName,
          status: 'ABSENT',
          checkInTime: null,
          hours: 0
        });
      }
    });

    const totalMembers = activeMembers.length;
    const attendanceRate = totalMembers > 0 ? Math.round((presentCount / totalMembers) * 100) + '%' : '0%';

    res.json({
      success: true,
      date: startOfDay.toISOString().split('T')[0],
      clubId: club._id,
      stats: {
        totalMembers,
        presentCount,
        absentCount,
        attendanceRate
      },
      register
    });

  } catch (error) {
    console.error('Fetch daily register error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching daily register', error: error.message });
  }
});

module.exports = router;
