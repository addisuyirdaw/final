/** @format */
const Election = require('../models/Election');

/**
 * Retrieve eligible candidates dynamically from authoritative election records.
 * Supports any number of candidates (fewer, 16, or more) without hardcoding.
 * Prevents duplicate candidate entries by unique candidate username.
 */
async function getAuthorizedCandidates() {
  // Query active or upcoming elections first; fallback to elections with candidates
  let elections = await Election.find({ status: { $in: ['active', 'upcoming'] } }).sort({ createdAt: -1 });
  if (!elections || elections.length === 0) {
    elections = await Election.find({ 'candidates.0': { $exists: true } }).sort({ createdAt: -1 });
  }

  const seenUsernames = new Set();
  const dynamicCandidates = [];
  const primaryElection = elections && elections.length > 0 ? elections[0] : null;

  for (const election of elections) {
    if (Array.isArray(election.candidates)) {
      for (const c of election.candidates) {
        const username = (c.username || '').toLowerCase().trim();
        if (username && !seenUsernames.has(username)) {
          seenUsernames.add(username);
          dynamicCandidates.push({
            _id: c._id,
            name: c.name,
            username: username,
            department: c.department || '',
            year: c.year || c.academicYear || '',
            academicYear: c.academicYear || c.year || '',
            position: c.position || 'Candidate',
            profileImage: c.profileImage || '',
            examCode: c.examCode || '',
            studentId: c.studentId || '',
            electionId: election._id,
            electionTitle: election.title,
          });
        }
      }
    }
  }

  return {
    election: primaryElection,
    candidates: dynamicCandidates,
  };
}

/**
 * Verify if an authenticated user's username matches an eligible candidate in the authoritative records.
 */
async function verifyCandidateEligibility(username) {
  if (!username) return null;
  const cleanUsername = username.toLowerCase().trim();
  const { election, candidates } = await getAuthorizedCandidates();

  const matched = candidates.find((c) => c.username === cleanUsername);
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
