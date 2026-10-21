/** @format */
const mongoose = require('mongoose');
const Election = require('../models/Election');
const User = require('../models/User');

const OFFICIAL_16_CANDIDATE_LIST = [
  { examCode: '16', canonicalCode: '16', examNum: 16, studentId: '1801228', name: 'Candidate Code 16', department: 'Technology & Engineering' },
  { examCode: '23', canonicalCode: '23', examNum: 23, studentId: '1700785', name: 'Candidate Code 23', department: 'Natural & Computational Sciences' },
  { examCode: '02', canonicalCode: '02', examNum: 2,  studentId: '1600840', name: 'Candidate Code 02', department: 'Business & Economics' },
  { examCode: '32', canonicalCode: '32', examNum: 32, studentId: '1700576', name: 'Candidate Code 32', department: 'Health Sciences' },
  { examCode: '37', canonicalCode: '37', examNum: 37, studentId: '1700313', name: 'Candidate Code 37', department: 'Social Sciences & Humanities' },
  { examCode: '38', canonicalCode: '38', examNum: 38, studentId: '1800827', name: 'Candidate Code 38', department: 'Agriculture & Natural Resources' },
  { examCode: '22', canonicalCode: '22', examNum: 22, studentId: '1701151', name: 'Candidate Code 22', department: 'Law & Governance' },
  { examCode: '19', canonicalCode: '19', examNum: 19, studentId: '1601605', name: 'Candidate Code 19', department: 'Computing & Informatics' },
  { examCode: '04', canonicalCode: '04', examNum: 4,  studentId: '1600707', name: 'Candidate Code 04', department: 'Medicine & Health' },
  { examCode: '30', canonicalCode: '30', examNum: 30, studentId: '1401493', name: 'Candidate Code 30', department: 'Technology & Engineering' },
  { examCode: '24', canonicalCode: '24', examNum: 24, studentId: '1601348', name: 'Candidate Code 24', department: 'Education & Behavioral Studies' },
  { examCode: '20', canonicalCode: '20', examNum: 20, studentId: '1802083', name: 'Candidate Code 20', department: 'Computing & Informatics' },
  { examCode: '03', canonicalCode: '03', examNum: 3,  studentId: '1700308', name: 'Candidate Code 03', department: 'Business & Economics' },
  { examCode: '36', canonicalCode: '36', examNum: 36, studentId: '1701435', name: 'Candidate Code 36', department: 'Natural & Computational Sciences' },
  { examCode: '34', canonicalCode: '34', examNum: 34, studentId: '1802151', name: 'Candidate Code 34', department: 'Health Sciences' },
  { examCode: '15', canonicalCode: '15', examNum: 15, studentId: '1500992', name: 'Candidate Code 15', department: 'Social Sciences & Humanities' },
];

/**
 * Retrieve eligible candidates dynamically from authoritative election records.
 * Permanently seeds and serves all 16 official Exam Code + Student ID pairs.
 */
async function getAuthorizedCandidates() {
  let election = await Election.findOne({ status: { $in: ['active', 'upcoming'] } }).sort({ createdAt: -1 });
  if (!election) {
    election = await Election.findOne({}).sort({ createdAt: -1 });
  }

  let adminUser = await User.findOne({ role: { $in: ['president', 'admin'] } });
  if (!adminUser) {
    adminUser = await User.findOne({});
  }
  const fallbackCreatorId = adminUser ? adminUser._id : new mongoose.Types.ObjectId();

  if (!election) {
    election = new Election({
      title: 'DBU Student Union General Election 2026',
      description: 'Official Student Union Election for Executive Committee candidates.',
      startDate: new Date(),
      endDate: new Date(Date.now() + 86400000 * 30),
      status: 'active',
      candidates: [],
      createdBy: fallbackCreatorId,
    });
  } else if (!election.createdBy) {
    election.createdBy = fallbackCreatorId;
  }

  if (!Array.isArray(election.candidates)) {
    election.candidates = [];
  }

  let updated = false;
  for (const p of OFFICIAL_16_CANDIDATE_LIST) {
    const pCodeNorm = String(p.canonicalCode).trim().replace(/^0+/, '');
    const pIdNorm = String(p.studentId).trim().toUpperCase();

    const existingIdx = election.candidates.findIndex((c) => {
      const cCode = String(c.examCode || '').trim().replace(/^0+/, '');
      const cId = String(c.studentId || '').trim().toUpperCase().replace(/^(?:DBU[-_/\s]*)?/i, '');
      const cUser = String(c.username || '').toLowerCase();
      return (
        (cCode && cCode === pCodeNorm) ||
        (cId && cId === pIdNorm) ||
        cUser === `dbu${pIdNorm.toLowerCase()}`
      );
    });

    if (existingIdx === -1) {
      election.candidates.push({
        name: p.name,
        username: `dbu${p.studentId}`,
        studentId: p.studentId,
        department: p.department,
        year: '4th Year',
        academicYear: '4th Year',
        position: 'Sira Asfetsami',
        examCode: p.canonicalCode,
        votes: 0,
      });
      updated = true;
    } else {
      const c = election.candidates[existingIdx];
      if (c.examCode !== p.canonicalCode) {
        c.examCode = p.canonicalCode;
        updated = true;
      }
      if (c.studentId !== p.studentId) {
        c.studentId = p.studentId;
        updated = true;
      }
      if (c.position !== 'Sira Asfetsami') {
        c.position = 'Sira Asfetsami';
        updated = true;
      }
    }
  }

  if (updated) {
    election.markModified('candidates');
    await election.save();
  }

  // Construct the authoritative 16 candidate roster in exact order
  const dynamicCandidates = OFFICIAL_16_CANDIDATE_LIST.map((p) => {
    const pCodeNorm = String(p.canonicalCode).trim().replace(/^0+/, '');
    const matched = election.candidates.find((c) => {
      const cCode = String(c.examCode || '').trim().replace(/^0+/, '');
      return cCode === pCodeNorm;
    });

    return {
      _id: matched?._id || `cand-${p.canonicalCode}`,
      name: matched?.name || p.name,
      username: matched?.username || `dbu${p.studentId}`,
      department: matched?.department || p.department,
      year: matched?.year || '4th Year',
      academicYear: matched?.academicYear || '4th Year',
      position: 'Sira Asfetsami',
      examCode: p.canonicalCode,
      studentId: p.studentId,
      electionId: election._id,
      electionTitle: election.title,
    };
  });

  return {
    election,
    candidates: dynamicCandidates,
  };
}

/**
 * Verify if an authenticated user's username matches an eligible candidate in the authoritative records.
 */
async function verifyCandidateEligibility(username) {
  if (!username) return null;
  const cleanUsername = username.toLowerCase().trim();
  const cleanId = cleanUsername.replace(/^(?:dbu[-_/\s]*)?/i, '');
  const { election, candidates } = await getAuthorizedCandidates();

  const matched = candidates.find((c) => {
    const cUser = (c.username || '').toLowerCase().trim();
    const cId = (c.studentId || '').trim();
    return cUser === cleanUsername || cId === cleanId || `dbu${cId.toLowerCase()}` === cleanUsername;
  });

  if (!matched) return null;

  return {
    candidate: matched,
    electionId: matched.electionId || (election ? election._id : null),
    electionTitle: matched.electionTitle || (election ? election.title : 'DBU Student Union Election'),
  };
}

/**
 * Format a Date object to East Africa Time (Africa/Addis_Ababa, UTC+3)
 */
function formatEthiopiaTime(date) {
  if (!date) return 'Deadline not set';
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'Africa/Addis_Ababa',
      dateStyle: 'full',
      timeStyle: 'medium',
    }).format(new Date(date)) + ' (EAT)';
  } catch (err) {
    return new Date(date).toUTCString();
  }
}

module.exports = {
  getAuthorizedCandidates,
  verifyCandidateEligibility,
  formatEthiopiaTime,
};
