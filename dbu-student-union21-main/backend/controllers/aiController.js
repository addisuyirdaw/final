const User = require('../models/User');
const Club = require('../models/Club');
const { GoogleGenerativeAI } = require('@google/generative-ai');

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
      return res.status(200).json({
        success: true,
        answer: 'I am your assistance what can I help you?'
      });
    }

    if (['thank you', 'thanks', 'ok', 'okay', 'great', 'cool', 'awesome', 'bye', 'goodbye', 'thx'].includes(cleanMsg)) {
      return res.status(200).json({
        success: true,
        answer: 'You\'re very welcome! Let me know if there\'s anything else I can do for you. Hope to see you around campus!'
      });
    }

    // 1. Fetch live data for RAG context
    const rawClubs = await Club.find({}).select('name category description status members leadership founded').populate('leadership.president', 'name').lean();
    const clubs = rawClubs.map(c => {
      let rep = null;
      if (c.members) {
        rep = c.members.find(m => m.role === 'president' || m.role === 'REPRESENTATIVE');
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
    const bookingClub = clubs.find(c => c.name.toLowerCase().includes('booking'));
    const currentLeader = bookingClub && bookingClub.representative ? bookingClub.representative.name : 'Unknown';

    const dbData = { clubs, faculty_and_coordinators: admins };

    const systemPromptText = `You are a Data Analyst AI for the DBU Student Union Portal. You are NOT a general chatbot. You are a precise Information System that reads a live JSON database and reports facts.
Fixed Facts: DBU has 30,000+ students and is located in Debre Berhan, Ethiopia.

=== LIVE DATABASE (JSON) ===
\${JSON.stringify(dbData, null, 2)}

=== INJECTED SUMMARY ===
- Total Clubs: \${clubCount}
- All Club Names: \${clubNames}
- Booking Club Representative: \${currentLeader}

=== MANDATORY RULES ===

1. DATABASE SCAN PROTOCOL: Before answering ANYTHING, scan the JSON above. Every numerical value (totalMembers) and every role (representative) is a HARD FACT. Do not guess. Do not hallucinate.

2. MANDATORY DATA MAPPING:
   - Member Counts: If asked 'How many' or 'Club size', state the EXACT number from totalMembers. Bold it. Start the sentence with the number. Example: '**8** members are currently in the Booking Club.'
   - Leadership: The words 'Leader', 'Head', 'Admin', 'Rep', 'President', 'Boss', and 'Who leads' ALL map to the 'representative' field in the JSON. Provide their Name, Department, and Year. Format: '**[Name]** is the Representative of the **[Club Name]**. They are a **[Year]** **[Department]** student.'
   - Sorting/Ranking: If asked 'Top clubs' or 'Highest members', sort the clubs array by totalMembers descending and list the top 3 in a numbered list with their bold member counts.
   - Founded/Year: Pull from the 'founded' field directly.
   - Status: Pull from the 'status' field directly.

3. RESPONSE STRUCTURE:
   - FORBIDDEN PHRASES: Never say 'I'd be happy to help', 'Check the portal', 'Why not take a look', or 'I don't have a good response'.
   - START WITH THE DATA: Your first word or number must be the answer. No fluff introductions.
   - BOLD ALL LIVE DATA: Every name, number, year, or department pulled from the database must be **bolded**.

4. TYPO & FUZZY MATCHING: Use fuzzy logic for club names. 'bookin' = Booking Club. 'mech' = Mechanical Club. 'civil' = Civil Engineering Club. Match partial names intelligently.

5. NULL FALLBACK: If a specific field is null, undefined, or missing, say EXACTLY: 'The Union database is currently refreshing this specific record.' Do NOT hallucinate a value.

6. PRIVACY GUARD: Never share student passwords, private IDs, or personal phone numbers. Direct users to the Official Contact button.

7. UNKNOWN QUESTIONS LOOP: For any question not covered above, follow: (1) Identify the entity in the question. (2) Locate that entity in the JSON. (3) Extract the relevant field. (4) Format and bold the output.`;

    // 2. Try Gemini AI (v0.24+ compatible format)
    if (process.env.GEMINI_API_KEY) {
      try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

        // Combine system prompt + user message
        const fullPrompt = `${systemPromptText}\n\nUser question: ${message}`;
        const result = await model.generateContent(fullPrompt);
        const responseText = result.response.text();

        return res.status(200).json({ success: true, answer: responseText });

      } catch (geminiError) {
        console.error('Gemini API Error:', geminiError.message);
        // Fall through to smart keyword fallback
      }
    }

    // 3. Smart keyword fallback (when Gemini is unavailable)
    const fallbackAnswer = buildFallbackAnswer(message, clubs, admins);
    return res.status(200).json({ success: true, answer: fallbackAnswer });

  } catch (error) {
    console.error('AI Controller Error:', error.message);
    return res.status(200).json({
      success: true,
      answer: 'Hey there! I seem to be having a little trouble processing that right now. Could you try asking again? If it keeps happening, you can reach out to our support team at support@dbu.edu.et. Let me know if there\'s anything else I can do for you!'
    });
  }
};

function buildFallbackAnswer(message, clubs, admins) {
  const lower = message.toLowerCase();

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
        return `**${c.representative.name}** is the REPRESENTATIVE of the **${c.name}**. They are a **${c.representative.year}** **${c.representative.department}** student.`;
      } else {
        return `The Union is currently in the process of appointing a Representative for the **${c.name}** club.`;
      }
    }

    // Member count
    if (lower.includes('how many') || lower.includes('members') || lower.includes('size') || lower.includes('count')) {
      return `**${c.totalMembers}** approved members are currently in the **${c.name}**.`;
    }

    // Founded / Year
    if (lower.includes('founded') || lower.includes('when') || (lower.includes('year') && !lower.includes('study'))) {
      return `The **${c.name}** was founded in **${c.founded}**.`;
    }

    // Status / Active
    if (lower.includes('status') || lower.includes('active') || lower.includes('currently')) {
      return `The **${c.name}** is currently **${c.status}**.`;
    }

    // Category
    if (lower.includes('category') || lower.includes('type') || lower.includes('kind')) {
      return `The **${c.name}** falls under the **${c.category}** category.`;
    }

    // Generic club info
    return `The **${c.name}** is an active **${c.category}** community at DBU. It has **${c.totalMembers}** approved members and was founded in **${c.founded}**. Status: **${c.status}**.`;
  }

  // ──────────────────────────────────────────────────────────────
  // STEP 3: Ranking / Top clubs (no specific club mentioned)
  // ──────────────────────────────────────────────────────────────
  if (lower.includes('top') || lower.includes('highest') || lower.includes('most members') || lower.includes('ranking')) {
    const sorted = [...clubs].sort((a, b) => b.totalMembers - a.totalMembers).slice(0, 3);
    const list = sorted.map((c, i) => `${i + 1}. **${c.name}** — **${c.totalMembers}** members`).join('\n');
    return `Top 3 clubs by approved member count:\n${list}`;
  }

  // ──────────────────────────────────────────────────────────────
  // STEP 4: Club listing & counting (generic, no specific club)
  // ──────────────────────────────────────────────────────────────
  if (lower.includes('how many') || lower.includes('available') || lower.includes('list') ||
      lower.includes('all club') || lower.includes('are there')) {
    const activeClubs = clubs.filter(c => c.status === 'active');
    if (activeClubs.length === 0) return 'There are no active clubs registered at the moment. Please check back shortly.';
    const names = activeClubs.map(c => `**${c.name}**`).join(', ');
    return `**${activeClubs.length}** active clubs are currently registered: ${names}.`;
  }

  // ──────────────────────────────────────────────────────────────
  // STEP 5: Contacts / Staff
  // ──────────────────────────────────────────────────────────────
  const staffKeywords = ['coordinator', 'cordinator', 'coordinater', 'coord', 'staff', 'contact', 'academic affairs'];
  if (staffKeywords.some(kw => lower.includes(kw))) {
    if (admins.length > 0) {
      const names = admins.map(a => `**${a.name}** (${a.role.replace('_', ' ')})`).join(' and ');
      return `You can contact ${names}. Their full details are in the Contact section of the portal.`;
    }
    return 'The Union database is currently refreshing this specific record.';
  }

  // ──────────────────────────────────────────────────────────────
  // STEP 6: Other specific handlers
  // ──────────────────────────────────────────────────────────────
  if (lower.includes('complaint') || lower.includes('report') || lower.includes('problem') || lower.includes('issue')) {
    return 'File a formal complaint by navigating to the **Complaints** section in the portal. Our team will review it promptly.';
  }

  if (lower.includes('election') || lower.includes('vote') || lower.includes('voting') || lower.includes('candidate')) {
    return 'Student elections are managed from the **Elections** tab in the portal. View active candidates and cast your vote there.';
  }

  if (lower.includes('join') || lower.includes('apply') || lower.includes('membership')) {
    return 'To join a club, go to the **Clubs** section, find your community, and click **"Join"**. The club representative will review your application.';
  }

  if (lower.includes('password') || lower.includes('login') || lower.includes('forgot') || lower.includes('sign in')) {
    return 'Use the **"Forgot Password"** link on the login page. Your username must start with **"dbu"** followed by 8 digits.';
  }

  if (lower.includes('restricted') || lower.includes('blocked') || lower.includes('hold')) {
    return 'There is a temporary hold on your account. Contact your **Club Coordinator** directly to resolve it.';
  }

  // ──────────────────────────────────────────────────────────────
  // STEP 7: Final fallback
  // ──────────────────────────────────────────────────────────────
  return 'The Union database is currently refreshing this specific record. Please check back in a moment!';
}
