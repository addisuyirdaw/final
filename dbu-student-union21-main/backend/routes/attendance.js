/** @format */
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Attendance = require('../models/Attendance');
const Club = require('../models/Club');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// In-memory store for active QR attendance sessions
// Structure: sessionToken -> { sessionToken, shortCode, clubId, eventId, eventTitle, clubName, hoursCredit, expiresAt, createdBy }
const activeQRSessions = new Map();

// Helper: purge expired sessions periodically
setInterval(() => {
  const now = Date.now();
  for (const [token, session] of activeQRSessions.entries()) {
    if (session.expiresAt && now > session.expiresAt + 60 * 60 * 1000) {
      activeQRSessions.delete(token);
    }
  }
}, 5 * 60 * 1000);

// @desc    Generate dynamic QR code session for club event / meeting
// @route   POST /api/attendance/generate-qr
// @access  Private (Club Leader, Admin, Coordinator, Officer)
router.post('/generate-qr', protect, async (req, res) => {
  try {
    const { clubId, eventId, eventTitle, validMinutes = 30, hoursCredit = 1 } = req.body;

    // Validate authorized roles
    const isSpecialRole =
      req.user.isAdmin ||
      ['admin', 'superadmin', 'clubs_coordinator', 'academic_affairs'].includes(req.user.role);

    let clubName = 'DBU Student Activity';
    let targetClub = null;

    if (clubId) {
      targetClub = await Club.findById(clubId);
      if (targetClub) {
        clubName = targetClub.name;
        // Check if user is a leader in this club
        if (!isSpecialRole) {
          const isPresident = targetClub.leadership?.president?.toString() === req.user._id.toString();
          const isVP = targetClub.leadership?.vicePresident?.toString() === req.user._id.toString();
          const isOfficer = targetClub.members?.some(
            (m) =>
              m.user?.toString() === req.user._id.toString() &&
              ['president', 'vice_president', 'officer', 'secretary'].includes(m.role) &&
              m.status === 'approved'
          );
          if (!isPresident && !isVP && !isOfficer) {
            return res.status(403).json({
              success: false,
              message: 'Access denied: Only club leaders or administrators can generate attendance QR codes',
            });
          }
        }
      }
    }

    const sessionToken = crypto.randomUUID();
    const shortCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const expiresAt = Date.now() + Math.max(5, parseInt(validMinutes, 10)) * 60 * 1000;
    const finalTitle = eventTitle?.trim() || (targetClub ? `${targetClub.name} General Meeting` : 'Campus Leadership Event');

    const sessionData = {
      sessionToken,
      shortCode,
      clubId: clubId || null,
      eventId: eventId || null,
      eventTitle: finalTitle,
      clubName,
      hoursCredit: parseFloat(hoursCredit) || 1,
      expiresAt,
      createdBy: req.user._id,
      createdAt: Date.now(),
    };

    activeQRSessions.set(sessionToken, sessionData);

    // If club and event are present, link with event's active check-in
    if (targetClub && eventId) {
      try {
        const ev = targetClub.events?.id(eventId);
        if (ev) {
          ev.activeCheckIn = true;
          ev.attendanceCode = shortCode;
          ev.status = 'ongoing';
          await targetClub.save();
        }
      } catch (err) {
        console.warn('Could not link to club event subdoc:', err.message);
      }
    }

    // Dynamic QR payload formatted as JSON for instant parsing by scanner
    const qrPayload = JSON.stringify({
      protocol: 'DBU_ATTENDANCE_V1',
      token: sessionToken,
      code: shortCode,
      title: finalTitle,
      club: clubName,
      hours: sessionData.hoursCredit,
      exp: expiresAt,
    });

    res.json({
      success: true,
      message: 'Dynamic QR attendance session generated successfully',
      session: {
        sessionToken,
        shortCode,
        qrPayload,
        eventTitle: finalTitle,
        clubName,
        hoursCredit: sessionData.hoursCredit,
        validMinutes: parseInt(validMinutes, 10),
        expiresAt: new Date(expiresAt).toISOString(),
      },
    });
  } catch (error) {
    console.error('Generate QR error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error generating attendance QR code',
      error: error.message,
    });
  }
});

// @desc    Scan and record attendance using QR payload or shortCode
// @route   POST /api/attendance/scan
// @access  Private (Any authenticated student)
router.post('/scan', protect, async (req, res) => {
  try {
    const { qrPayload, sessionToken, code } = req.body;
    const studentId = req.user._id;

    let targetToken = sessionToken;
    let targetCode = code?.trim().toUpperCase();

    // Parse JSON QR payload, URL, or raw string
    if (qrPayload) {
      // 1. Check if qrPayload is a URL (e.g. https://.../attendance?token=...&code=...)
      if (typeof qrPayload === 'string' && (qrPayload.includes('token=') || qrPayload.includes('code='))) {
        try {
          const parsedUrl = new URL(qrPayload.startsWith('http') ? qrPayload : `http://localhost${qrPayload.startsWith('/') ? '' : '/'}${qrPayload}`);
          const urlToken = parsedUrl.searchParams.get('token');
          const urlCode = parsedUrl.searchParams.get('code');
          if (urlToken) targetToken = urlToken;
          if (urlCode) targetCode = urlCode.toUpperCase();
        } catch (_) {
          // Regex fallback if URL parsing fails
          const matchToken = qrPayload.match(/token=([a-zA-Z0-9-]+)/);
          const matchCode = qrPayload.match(/code=([a-zA-Z0-9]+)/);
          if (matchToken && matchToken[1]) targetToken = matchToken[1];
          if (matchCode && matchCode[1]) targetCode = matchCode[1].toUpperCase();
        }
      }

      if (!targetToken && !targetCode) {
        try {
          const parsed = typeof qrPayload === 'string' ? JSON.parse(qrPayload) : qrPayload;
          if (parsed.token) targetToken = parsed.token;
          if (parsed.code) targetCode = parsed.code.toUpperCase();
        } catch (_) {
          // Raw string might just be the token or code directly
          if (qrPayload.length > 20) {
            targetToken = qrPayload.trim();
          } else {
            targetCode = qrPayload.trim().toUpperCase();
          }
        }
      }
    }

    if (!targetToken && !targetCode) {
      return res.status(400).json({
        success: false,
        message: 'Please provide either a valid QR scan or a 6-character check-in code',
      });
    }

    // Lookup session in activeQRSessions
    let session = null;
    if (targetToken && activeQRSessions.has(targetToken)) {
      session = activeQRSessions.get(targetToken);
    } else if (targetCode) {
      for (const s of activeQRSessions.values()) {
        if (s.shortCode === targetCode) {
          session = s;
          break;
        }
      }
    }

    // Fallback: check if an ongoing club event matches the code
    if (!session && targetCode) {
      const clubWithEvent = await Club.findOne({
        'events.attendanceCode': targetCode,
        'events.activeCheckIn': true,
      });

      if (clubWithEvent) {
        const ev = clubWithEvent.events.find(
          (e) => e.activeCheckIn === true && e.attendanceCode === targetCode
        );
        if (ev) {
          session = {
            sessionToken: `legacy-${clubWithEvent._id}-${ev._id}-${targetCode}`,
            shortCode: targetCode,
            clubId: clubWithEvent._id,
            eventId: ev._id,
            eventTitle: ev.title,
            clubName: clubWithEvent.name,
            hoursCredit: 1,
            expiresAt: Date.now() + 2 * 60 * 60 * 1000,
          };
        }
      }
    }

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Invalid attendance session or code. Please check with your club coordinator.',
      });
    }

    // Check expiration
    if (session.expiresAt && Date.now() > session.expiresAt) {
      return res.status(400).json({
        success: false,
        message: 'This attendance session has expired. Please ask the organizer for a refreshed code.',
      });
    }

    // Check duplicate attendance
    const existing = await Attendance.findOne({
      studentId,
      sessionToken: session.sessionToken,
    });

    if (existing) {
      return res.status(200).json({
        success: true,
        alreadyRecorded: true,
        message: `You have already confirmed your attendance for "${session.eventTitle}".`,
        attendance: existing,
      });
    }

    // Record attendance
    const newAttendance = await Attendance.create({
      studentId,
      clubId: session.clubId || null,
      eventId: session.eventId || null,
      sessionToken: session.sessionToken,
      shortCode: session.shortCode,
      eventTitle: session.eventTitle,
      clubName: session.clubName,
      hoursCredit: session.hoursCredit || 1,
      status: 'PRESENT',
      scannedAt: new Date(),
      verificationMethod: qrPayload ? 'QR_SCAN' : 'MANUAL_CODE',
    });

    // Update club member attendance count and reset inactive streak
    if (session.clubId) {
      try {
        const club = await Club.findById(session.clubId);
        if (club) {
          const member = club.members.find((m) => m.user.toString() === studentId.toString());
          if (member) {
            member.attendanceCount = (member.attendanceCount || 0) + 1;
            member.absentStreak = 0;
            if (member.status === 'Inactive_Ghost') {
              member.status = 'approved';
            }
            await club.save();
          }

          if (session.eventId) {
            const ev = club.events?.id(session.eventId);
            if (ev && !ev.attendees.includes(studentId)) {
              ev.attendees.push(studentId);
              await club.save();
            }
          }
        }
      } catch (clubErr) {
        console.warn('Attendance club update sync warning:', clubErr.message);
      }
    }

    res.status(201).json({
      success: true,
      message: `✅ Attendance recorded successfully for "${session.eventTitle}"!`,
      hoursEarned: session.hoursCredit || 1,
      attendance: newAttendance,
    });
  } catch (error) {
    console.error('Scan attendance error:', error);
    // Catch unique index violation gracefully
    if (error.code === 11000) {
      return res.status(200).json({
        success: true,
        alreadyRecorded: true,
        message: 'Attendance was already confirmed for this session.',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error processing attendance scan',
      error: error.message,
    });
  }
});

// @desc    Get current student's attendance records
// @route   GET /api/attendance/my-attendance
// @access  Private
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

// @desc    Get live attendee roster for a session (Organizer / Admin view)
// @route   GET /api/attendance/roster/:sessionToken
// @access  Private
router.get('/roster/:sessionToken', protect, async (req, res) => {
  try {
    const { sessionToken } = req.params;

    const attendees = await Attendance.find({ sessionToken })
      .populate('studentId', 'name username department year email profileImage')
      .sort({ scannedAt: -1 })
      .lean();

    res.json({
      success: true,
      count: attendees.length,
      attendees,
    });
  } catch (error) {
    console.error('Fetch session roster error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance roster',
      error: error.message,
    });
  }
});

module.exports = router;
