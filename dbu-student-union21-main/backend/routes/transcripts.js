/** @format */
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const User = require('../models/User');
const Club = require('../models/Club');
const Attendance = require('../models/Attendance');
const Certificate = require('../models/Certificate');
const TranscriptRecord = require('../models/TranscriptRecord');
const { protect } = require('../middleware/auth');

/**
 * Helper: compile full co-curricular transcript data for a student
 */
async function compileStudentTranscript(studentId) {
  const student = await User.findById(studentId).select('-password');
  if (!student) return null;

  // 1. Gather all clubs and leadership roles
  const clubs = await Club.find({
    'members.user': student._id,
    'members.status': { $in: ['approved', 'restricted'] },
  }).lean();

  const leadershipPositions = [];
  const clubMemberships = [];

  clubs.forEach((club) => {
    const memberRecord = club.members.find(
      (m) => m.user?.toString() === student._id.toString()
    );

    const isPresident = club.leadership?.president?.toString() === student._id.toString();
    const isVP = club.leadership?.vicePresident?.toString() === student._id.toString();

    let displayRole = memberRecord ? memberRecord.role : 'member';
    if (isPresident) displayRole = 'president';
    else if (isVP) displayRole = 'vice_president';

    if (['president', 'vice_president', 'officer', 'secretary', 'treasurer'].includes(displayRole)) {
      leadershipPositions.push({
        clubName: club.name,
        role: displayRole.replace('_', ' ').toUpperCase(),
        category: club.category,
        academicYear: '2025/2026',
        joinedAt: memberRecord?.joinedAt || club.createdAt,
        status: 'Active',
      });
    }

    clubMemberships.push({
      clubId: club._id,
      clubName: club.name,
      category: club.category,
      role: displayRole.replace('_', ' ').toUpperCase(),
      joinedAt: memberRecord?.joinedAt || club.createdAt,
      attendanceCount: memberRecord?.attendanceCount || 0,
      image: club.image || null,
    });
  });

  // 2. Gather verified attendance records
  const attendances = await Attendance.find({ studentId: student._id })
    .sort({ scannedAt: -1 })
    .lean();

  const verifiedEvents = attendances.map((att) => ({
    id: att._id,
    title: att.eventTitle || 'Campus Leadership Session',
    organization: att.clubName || 'Student Union',
    date: att.scannedAt,
    hours: att.hoursCredit || 1,
    status: att.status,
    verificationMethod: att.verificationMethod,
    isOfficialEvent: Boolean(att.eventId),
    type: att.eventId ? 'OFFICIAL_EVENT' : 'LEGACY_ACTIVITY',
  }));

  // 3. Gather certificates if any
  let certificates = [];
  try {
    certificates = await Certificate.find({
      $or: [
        { student: student._id },
        { studentId: student.username },
        { recipientStudentId: student.username },
      ],
    }).lean();
  } catch (err) {
    console.warn('Certificate lookup note:', err.message);
  }

  // 4. Gather manual/supplementary transcript records if any
  const savedRecord = await TranscriptRecord.findOne({ studentId: student._id }).lean();
  const additionalActivities = savedRecord?.activities || [];
  const additionalAwards = savedRecord?.honorsAndAwards || [];

  // Calculate totals
  const attendanceHours = attendances.reduce((acc, curr) => acc + (curr.hoursCredit || 1), 0);
  const extraHours = additionalActivities.reduce((acc, curr) => acc + (curr.hoursContributed || 0), 0);
  const totalHours = attendanceHours + extraHours;

  // Grade/Honor distinction formula based on co-curricular hours & leadership
  let distinction = 'Developing Contributor';
  if (totalHours >= 60 || leadershipPositions.length >= 2) {
    distinction = 'Distinguished Campus Leader (Highest Honors)';
  } else if (totalHours >= 30 || leadershipPositions.length >= 1) {
    distinction = 'Exemplary Co-Curricular Fellow (Honors)';
  } else if (totalHours >= 15) {
    distinction = 'Active Co-Curricular Scholar';
  }

  // Digital verification fingerprint
  const rawPayload = `${student._id}_${student.username}_${totalHours}_${attendances.length}_DBU_OFFICIAL`;
  const digitalSignature = crypto.createHash('sha256').update(rawPayload).digest('hex').substring(0, 24).toUpperCase();

  return {
    transcriptId: `DBU-CCT-${student.username?.toUpperCase() || student._id.toString().substring(0, 8)}`,
    verificationHash: digitalSignature,
    issuedAt: new Date().toISOString(),
    academicInstitution: {
      name: 'Debre Berhan University',
      nativeName: 'ደብረ ብርሃን ዩኒቨርሲቲ',
      office: 'Office of the Vice President for Academic Affairs & Student Union',
      location: 'Debre Berhan, Amhara, Ethiopia',
      established: 2007,
    },
    student: {
      id: student._id,
      name: student.name,
      username: student.username?.toUpperCase(),
      email: student.email,
      department: student.department,
      year: student.year,
      role: student.role,
      profileImage: student.profileImage || null,
    },
    summary: {
      totalVerifiedHours: totalHours,
      totalEventsAttended: attendances.length,
      activeClubsCount: clubMemberships.length,
      leadershipRolesCount: leadershipPositions.length,
      certificatesCount: certificates.length,
      coCurricularStanding: distinction,
      academicYear: '2025/2026',
    },
    sections: {
      leadershipPositions,
      clubMemberships,
      verifiedEvents,
      certificates: certificates.map((c) => ({
        id: c._id,
        title: c.title || c.certificateName || 'Certificate of Achievement',
        issueDate: c.issueDate || c.createdAt,
        issuer: c.issuedBy || 'Debre Berhan University',
        certificateNumber: c.certificateNumber || c._id,
      })),
      supplementaryActivities: additionalActivities,
      honorsAndAwards: additionalAwards,
    },
    signatories: [
      {
        title: 'Dean of Students Affairs',
        name: 'Office of Student Services',
        status: 'Digitally Verified',
      },
      {
        title: 'President, DBU Student Union',
        name: 'Executive Committee',
        status: 'Digitally Verified',
      },
    ],
  };
}

// @desc    Get co-curricular transcript for student by ID
// @route   GET /api/students/:id/transcript or /api/transcripts/student/:id
// @access  Public / Authenticated
router.get('/:id/transcript', async (req, res) => {
  try {
    const { id } = req.params;

    // Resolve by Mongo ObjectId or by DBU username (e.g., dbu10304058)
    let student = null;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      student = await User.findById(id);
    } else {
      student = await User.findOne({ username: id.toLowerCase() });
    }

    if (!student) {
      return res.status(404).json({
        success: false,
        message: `Student with ID or Code "${id}" not found.`,
      });
    }

    const transcript = await compileStudentTranscript(student._id);
    if (!transcript) {
      return res.status(404).json({
        success: false,
        message: 'Could not compile transcript records.',
      });
    }

    res.json({
      success: true,
      transcript,
    });
  } catch (error) {
    console.error('Fetch transcript error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error generating co-curricular transcript',
      error: error.message,
    });
  }
});

// @desc    Get currently logged in student's own transcript
// @route   GET /api/transcripts/me
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const transcript = await compileStudentTranscript(req.user._id);
    if (!transcript) {
      return res.status(404).json({
        success: false,
        message: 'Transcript records not found.',
      });
    }

    res.json({
      success: true,
      transcript,
    });
  } catch (error) {
    console.error('Fetch my transcript error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error generating your transcript',
      error: error.message,
    });
  }
});

// @desc    Append manual co-curricular activity (Admin / Coordinator)
// @route   POST /api/transcripts/record
// @access  Private (Admin / Coordinator)
router.post('/record', protect, async (req, res) => {
  try {
    const isAuthorized =
      req.user.isAdmin ||
      ['admin', 'superadmin', 'clubs_coordinator', 'academic_affairs'].includes(req.user.role);

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only academic coordinators or admins can add manual transcript records',
      });
    }

    const { studentId, title, organization, category, role, hoursContributed, startDate } = req.body;

    if (!studentId || !title || !organization) {
      return res.status(400).json({
        success: false,
        message: 'studentId, title, and organization are required fields.',
      });
    }

    let record = await TranscriptRecord.findOne({ studentId });
    if (!record) {
      record = new TranscriptRecord({
        studentId,
        activities: [],
        leadershipRoles: [],
        totalHours: 0,
      });
    }

    record.activities.push({
      title,
      organization,
      category: category || 'Leadership',
      role: role || 'Participant',
      hoursContributed: parseFloat(hoursContributed) || 1,
      startDate: startDate || new Date(),
      verifiedBy: req.user.name || 'DBU Coordinator',
      status: 'VERIFIED',
    });

    record.totalHours = (record.totalHours || 0) + (parseFloat(hoursContributed) || 1);
    await record.save();

    res.status(201).json({
      success: true,
      message: 'Co-curricular activity appended to transcript successfully',
      record,
    });
  } catch (error) {
    console.error('Create transcript activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating transcript activity',
      error: error.message,
    });
  }
});

module.exports = router;
