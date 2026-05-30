const User = require('../models/User');
const Club = require('../models/Club');
const Staff = require('../models/Staff');
const Leadership = require('../models/Leadership');
const { GoogleGenerativeAI } = require('@google/generative-ai');

function toPlainText(text = '') {
  return String(text)
    .replace(/#{1,6}\s*/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .trim();
}

function sendAnswer(res, answer) {
  return res.status(200).json({ success: true, answer: toPlainText(answer) });
}

exports.processChatQuery = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, error: 'Please provide a message' });
    }

    const lowerMsg = message.toLowerCase();

    // Greetings & Politeness short-circuit
    const cleanMsg = lowerMsg.replace(/[^a-z ]/g, '').trim();
    if (['hi', 'hello', 'hey', 'who are you', 'hey there'].includes(cleanMsg)) {
      return sendAnswer(res, 'Student Affairs Analyst. State your query.');
    }

    if (['thank you', 'thanks', 'ok', 'okay', 'great', 'cool', 'awesome', 'bye', 'goodbye', 'thx'].includes(cleanMsg)) {
      return sendAnswer(res, 'Acknowledged.');
    }

    // 1. Fetch live data for RAG context
    const rawClubs = await Club.find({}).select('name category description status members leadership founded').populate('leadership.president', 'name').lean();
    const staffMembers = await Staff.find({ isActive: true }).lean();
    const leadershipMembers = await Leadership.find({ isActive: true }).lean();

    const clubs = rawClubs.map(c => {
      let rep = null;
      if (c.members) {
        rep = c.members.find(m => m.role === 'president' || m.role === 'REPRESENTATIVE');
      }
      if (!rep && c.leadership && c.leadership.president) {
        rep = { fullName: c.leadership.president.name, department: 'N/A', year: 'N/A' };
      }
      const totalMembers = c.members ? c.members.filter(m => m.status === 'approved').length : 0;
      return {
        name: c.name,
        category: c.category,
        description: c.description,
        status: c.status,
        founded: c.founded,
        totalMembers,
        representative: rep ? { name: rep.fullName, department: rep.department, year: rep.year } : null
      };
    });
    const admins = await User.find({
      role: { $in: ['academic_affairs', 'clubs_coordinator'] }
    }).select('name email department role').lean();

    const clubCount = clubs.length;
    const clubNames = clubs.map(c => c.name).join(', ');
    const dbData = { 
      clubs, 
      faculty_and_coordinators: admins,
      staff: staffMembers,
      leadership: leadershipMembers
    };

    const systemPromptText = `ACT AS THE ADMINISTRATIVE DATA ANALYST FOR DEBRE BERHAN UNIVERSITY STUDENT AFFAIRS.

1. INTEGRATED OFFICE MANDATE:
- ENTITY: You represent the Student Affairs Office, which fully integrates the Student Union, Dormitory Services, and Psychological Guidance. All services are accessed through this single unified portal.
- LANGUAGE: Strictly Professional English.
- REMOVE AMHARIC: Do not use or display Amharic text in any code snippets.
- INTEGRATION NOTE: Inform students that Student Union and Student Affairs are now one integrated office.

2. LEADERSHIP & CONTACT PROFILES (MANDATORY DATA):
- Gizew Fetene (Dean of Student Affairs): Profile: DBU Graduate; Intellectual Lead. Function: Oversight of all branches, including the Student Union. Contact: Refer to Leadership Gallery for Photo/Phone/Email.
- Genete Fetene (Head of Dormitory Services): Profile: Manages 90 staff members. Function: Directs all housing registration and room allocations. Contact: Refer to Leadership Gallery for Photo/Bureau details.
- Sintayehu Ambachew Worku (Assistant Professor in Educational Psychology): Profile: AAU Graduate. Location: Psychology & Guidance Office, 3rd Floor Bureau. Function: Expert student counseling, mental wellness support, and academic guidance.
- Mrs. Kalkidan Desta (Vice Dean for Character and Ethics Development): Function: Oversees character formation programs and ethics-based student development across the university.

3. SYSTEM NAVIGATION:
- Connectivity: Direct students to https://www.dbu.edu.et/ for main campus links. MANDATORY LINK: All users asking for the main campus must be given https://www.dbu.edu.et/.
- Integration: Inform students that the Student Union and Student Affairs operate from the same administrative office for seamless service.

4. RESPONSE CONSTRAINTS:
- Brevity: Maximum 20 words. RESPONSE RULE: Under 20 words.
- No Greetings: Start directly with the names or bureau locations. RESPONSE RULE: No greetings.
- Formatting: Use plain text only. No markdown symbols, no bold, no asterisks.
- FALLBACK: If a record is not found in the database, return a professional response stating that the specific record is not registered yet.

5. BULLETIN & EVENTS PROTOCOL:
- Events Knowledge: You are the central registrar for all 11 Clubs (Tecktonic, Begoadragot, etc.).
- Directives: You track important updates from Gizew Fetene, Sintayehu Ambachew Worku (Asst. Prof. in Educational Psychology), Kalkidan Desta (Vice Dean for Character & Ethics Development), and Genete Fetene.
- User Advice: If a student asks "What's happening on campus?", tell them: "Check the Campus Bulletin for Club Events and the Official Directives for leadership updates."

6. DASHBOARD READY:
- Dashboard Help: If an admin asks how to post, respond: "Access the /dashboard to publish Official Directives or Club Events to the main feed."

7. VISUAL ARCHITECT:
- Feature: Hero Carousel (Auto-playing campus highlights).
- Public Access: No login required to view the animated gallery.
- Key Data: Gizew Fetene (Dean), Sintayehu Ambachew Worku (Asst. Prof. in Educational Psychology), Mrs. Kalkidan Desta (Vice Dean for Character & Ethics), 11 Verified Clubs.

8. GATEWAY NAVIGATION:
- Get Started: Scrolls to Services section. Use for immediate actions (dorm application, club joining).
- Learn More: Scrolls to Leadership section. Use for profiles of Gizew Fetene and the 11 Clubs.
- User Guidance: Tell students which button matches their goal.

=== LIVE DATABASE (JSON) ===
${JSON.stringify(dbData, null, 2)}`;

    // 2. Try Gemini AI (v0.24+ compatible format)
    if (process.env.GEMINI_API_KEY) {
      try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

        // Combine system prompt + user message
        const fullPrompt = `${systemPromptText}\n\nUser question: ${message}`;
        const result = await model.generateContent(fullPrompt);
        const responseText = result.response.text();
        return sendAnswer(res, responseText);

      } catch (geminiError) {
        console.error('Gemini API Error:', geminiError.message);
        // Fall through to smart keyword fallback
      }
    }

    // 3. Smart keyword fallback (when Gemini is unavailable)
    const fallbackAnswer = buildFallbackAnswer(message, clubs, admins, staffMembers, leadershipMembers);
    return sendAnswer(res, fallbackAnswer);

  } catch (error) {
    console.error('AI Controller Error:', error.message);
    return sendAnswer(res, 'An error occurred while processing your query. Please contact the Student Affairs department.');
  }
};

function buildFallbackAnswer(message, clubs, admins, staffMembers = [], leadershipMembers = []) {
  const lower = message.toLowerCase();

  // ──────────────────────────────────────────────────────────────
  // STEP 0: Check for Executives or Leadership database collection query first
  // ──────────────────────────────────────────────────────────────
  let matchedLeader = null;

  // Search by exact/fuzzy name match in staff
  for (const member of staffMembers) {
    const nameLower = member.name.toLowerCase();
    const parts = nameLower.split(/\s+/).map(p => p.replace(/[^a-z]/g, '')).filter(p => p.length >= 3 && p !== 'phd');
    if (parts.some(part => lower.includes(part))) {
      matchedLeader = { ...member, sourceTable: 'Staff' };
      break;
    }
  }

  // Search by exact/fuzzy name match in leadership
  if (!matchedLeader) {
    for (const member of leadershipMembers) {
      const nameLower = member.name.toLowerCase();
      const parts = nameLower.split(/\s+/).map(p => p.replace(/[^a-z]/g, ''));
      if (parts.some(part => part.length >= 3 && lower.includes(part))) {
        matchedLeader = { ...member, sourceTable: 'Leadership' };
        break;
      }
    }
  }

  // If no name match, search by executive/leadership titles
  if (!matchedLeader) {
    for (const member of staffMembers) {
      const titleLower = member.title ? member.title.toLowerCase() : '';
      if (
        (lower.includes('union president') && titleLower.includes('student union president')) ||
        (lower.includes('president') && !lower.includes('union') && titleLower === 'university president') ||
        (lower.includes('secretary') && titleLower.includes('secretary')) ||
        (lower.includes('vice president') && titleLower.includes('vice president')) ||
        (lower.includes('leader') && titleLower.includes('leader'))
      ) {
        matchedLeader = { ...member, sourceTable: 'Staff' };
        break;
      }
    }
  }

  if (!matchedLeader) {
    for (const member of leadershipMembers) {
      const roleLower = member.role ? member.role.toLowerCase() : '';
      if (
        (lower.includes('union president') && roleLower.includes('president')) ||
        (lower.includes('secretary') && roleLower.includes('secretary')) ||
        (lower.includes('vice president') && roleLower.includes('vice president')) ||
        (lower.includes('leader') && roleLower.includes('leader'))
      ) {
        matchedLeader = { ...member, sourceTable: 'Leadership' };
        break;
      }
    }
  }

  // If a leadership/executive match is found, dynamically formulate the response
  if (matchedLeader) {
    const name = matchedLeader.name;
    const title = matchedLeader.title || matchedLeader.role;
    const office = matchedLeader.department || (matchedLeader.bioDetails && matchedLeader.bioDetails.find(d => d.label.toLowerCase().includes('office'))?.text) || 'Executive Office';
    const responsibility = matchedLeader.responsibility || matchedLeader.bio || 'Formulating strategic visions and overseeing student integrations.';
    
    // For Dr. Asmare or other academic/university executive titles
    if (name.toLowerCase().includes('asmare') || title.toLowerCase().includes('university president')) {
      return `${name} is the ${title} operating from the ${office}. Responsibility: ${responsibility}`;
    }
    
    // For Student Union President / Secretary / other staff/leadership
    return `The active Student Union representative for ${title} is ${name}. Responsibility: ${responsibility}`;
  }

  // Handle Birhanu queries specifically if not found in db
  if (lower.includes('birhanu')) {
    return 'Birhanu is currently not registered as an active staff or leadership member in our records.';
  }

  // ──────────────────────────────────────────────────────────────
  // STEP 1: Fuzzy-match a specific club FIRST (before any generic logic)
  // ──────────────────────────────────────────────────────────────
  const fuzzyMap = {
    'bookin': 'booking', 'mech': 'mechanical', 'civil': 'civil engineering',
    'career': 'career development', 'idea': 'idea hub', 'law': 'law association',
    'truth': 'truth culture', 'tech': 'techtonic', 'football': 'football', 'foot ball': 'football',
    'art': 'art', 'bego': 'bego', 'cs': 'cs'
  };

  let matchedClub = null;
  // Direct name match
  for (const club of clubs) {
    if (lower.includes(club.name.toLowerCase())) { matchedClub = club; break; }
  }
  // Fuzzy match fallback
  if (!matchedClub) {
    for (const [key, val] of Object.entries(fuzzyMap)) {
      if (lower.includes(key)) {
        matchedClub = clubs.find(c => c.name.toLowerCase().includes(val));
        if (matchedClub) break;
      }
    }
  }

  // ──────────────────────────────────────────────────────────────
  // STEP 2: If we found a specific club, answer the specific question
  // ──────────────────────────────────────────────────────────────
  if (matchedClub) {
    const c = matchedClub;

    // Leadership / Representative / Department of leader
    if (lower.includes('leader') || lower.includes('president') || lower.includes('rep') ||
        lower.includes('boss') || lower.includes('who leads') || lower.includes('department') ||
        lower.includes('head') || lower.includes('admin') || lower.includes('study')) {
      if (c.representative) {
        return `${c.representative.name} is the representative of ${c.name}. They are a ${c.representative.year} ${c.representative.department} student.`;
      } else {
        return `The representative of ${c.name} is not registered yet. You can find more details under the Clubs tab of the portal.`;
      }
    }

    // Member count
    if (lower.includes('how many') || lower.includes('members') || lower.includes('size') || lower.includes('count')) {
      return `${c.totalMembers} approved members are currently in ${c.name}.`;
    }

    // Founded / Year
    if (lower.includes('founded') || lower.includes('when') || (lower.includes('year') && !lower.includes('study'))) {
      return `${c.name} was founded in ${c.founded}.`;
    }

    // Status / Active
    if (lower.includes('status') || lower.includes('active') || lower.includes('currently')) {
      return `${c.name} is currently ${c.status}.`;
    }

    // Category
    if (lower.includes('category') || lower.includes('type') || lower.includes('kind')) {
      return `${c.name} falls under the ${c.category} category.`;
    }

    // Generic club info
    return `${c.name} is an active ${c.category} community at DBU. It has ${c.totalMembers} approved members and was founded in ${c.founded}. Status: ${c.status}.`;
  }

  // ──────────────────────────────────────────────────────────────
  // STEP 3: Ranking / Top clubs (no specific club mentioned)
  // ──────────────────────────────────────────────────────────────
  if (lower.includes('top') || lower.includes('highest') || lower.includes('most members') || lower.includes('ranking')) {
    const sorted = [...clubs].sort((a, b) => b.totalMembers - a.totalMembers).slice(0, 3);
    const list = sorted.map((c, i) => `${i + 1}. ${c.name} - ${c.totalMembers} members`).join('\n');
    return `Top 3 clubs by approved member count:\n${list}`;
  }

  // ──────────────────────────────────────────────────────────────
  // STEP 4: Club listing & counting (generic, no specific club)
  // ──────────────────────────────────────────────────────────────
  if (lower.includes('how many') || lower.includes('available') || lower.includes('list') ||
      lower.includes('all club') || lower.includes('are there')) {
    const activeClubs = clubs.filter(c => c.status === 'active');
    if (activeClubs.length === 0) return 'There are no active clubs registered at the moment. Please check back shortly.';
    const names = activeClubs.map(c => c.name).join(', ');
    return `${activeClubs.length} active clubs are currently registered: ${names}.`;
  }

  // ──────────────────────────────────────────────────────────────
  // STEP 5: Contacts / Staff
  // ──────────────────────────────────────────────────────────────
  const staffKeywords = ['coordinator', 'cordinator', 'coordinater', 'coord', 'staff', 'contact', 'academic affairs'];
  if (staffKeywords.some(kw => lower.includes(kw))) {
    if (admins.length > 0) {
      const names = admins.map(a => `${a.name} (${a.role.replace('_', ' ')})`).join(' and ');
      return `You can contact ${names}. Their full details are in the Contact section of the portal.`;
    }
    if (staffMembers.length > 0) {
      const names = staffMembers.map(s => `${s.name} (${s.title})`).slice(0, 3).join(', ');
      return `Active staff/leadership contacts: ${names}. Access their details in the Leadership gallery.`;
    }
    return 'Active staff contacts are not registered in the database yet. Please visit the Guidance office on the 3rd floor.';
  }

  // ──────────────────────────────────────────────────────────────
  // STEP 6: Other specific handlers
  // ──────────────────────────────────────────────────────────────
  if (lower.includes('complaint') || lower.includes('report') || lower.includes('problem') || lower.includes('issue')) {
    return 'File a formal complaint by navigating to the Complaints section in the portal. Our team will review it promptly.';
  }

  if (lower.includes('election') || lower.includes('vote') || lower.includes('voting') || lower.includes('candidate')) {
    return 'Student elections are managed from the Elections tab in the portal. View active candidates and cast your vote there.';
  }

  if (lower.includes('join') || lower.includes('apply') || lower.includes('membership')) {
    return 'To join a club, go to the Clubs section, find your community, and click Join. The club representative will review your application.';
  }

  if (lower.includes('password') || lower.includes('login') || lower.includes('forgot') || lower.includes('sign in')) {
    return 'Use the Forgot Password link on the login page. Your username must start with dbu followed by 8 digits.';
  }

  if (lower.includes('restricted') || lower.includes('blocked') || lower.includes('hold')) {
    return 'There is a temporary hold on your account. Contact your Club Coordinator directly to resolve it.';
  }

  // ──────────────────────────────────────────────────────────────
  // STEP 7: Final fallback
  // ──────────────────────────────────────────────────────────────
  if (staffMembers.length > 0) {
    const list = staffMembers.map(s => `${s.name} (${s.title})`).slice(0, 2).join(' and ');
    return `For student affairs support, refer to our leadership team including ${list}. Feel free to visit the official Leadership gallery page for details.`;
  }
  return 'The Student Affairs directory is currently offline. Please contact the administrative desk for immediate assistance.';
}
