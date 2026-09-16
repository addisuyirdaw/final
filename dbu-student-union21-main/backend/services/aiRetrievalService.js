const Club = require('../models/Club');
const Staff = require('../models/Staff');
const Leadership = require('../models/Leadership');

async function retrieveContext(message) {
    const q = (message || "").toLowerCase();
    const words = q.replace(/[^\w\s]/g, '').split(/\s+/);
    
    // Intents
    let intent = "general";
    const wantsAllClubs = q.includes("what clubs") || q.includes("list clubs") || q.includes("all clubs") || q.includes("show me clubs");
    const wantsLeadership = q.includes("president") || q.includes("leader") || q.includes("dean") || q.includes("staff") || q.includes("who is in charge");
    const mentionsClub = q.includes("club");

    let rawData = {
        clubs: [],
        staff: [],
        leadership: [],
        searchFound: false
    };

    if (wantsAllClubs) {
        intent = "list_clubs";
        rawData.clubs = await Club.find({}, 'name category').limit(20).lean();
        rawData.searchFound = rawData.clubs.length > 0;
    } else {
        // Specific club search using keyword matching
        const stopWords = new Set([
            'who', 'what', 'where', 'when', 'why', 'how', 'is', 'the', 'a', 'an', 'in', 'of', 'for', 'to', 'and', 'or', 
            'tell', 'me', 'about', 'club', 'clubs', 'available', 'list', 'show', 'president', 'leader', 'representative', 
            'members', 'many', 'people', 'are', 'does', 'have', 'can', 'you', 'i', 'get', 'contact', 'runs'
        ]);
        
        const searchTerms = words.filter(w => w.length > 2 && !stopWords.has(w));

        if (searchTerms.length > 0) {
            // Attempt 1: Exact phrase match
            const phrase = searchTerms.join('.*'); // Use .* to allow flexible spacing or words in between if needed, or simply join(' ')
            // Actually, join(' ') is safer for "mechanical engineering"
            const exactPhrase = searchTerms.join(' ');
            const exactRegex = new RegExp(exactPhrase, 'i');
            
            let matchedClubs = await Club.find({ name: exactRegex }, 'name category members leadership')
                .populate('leadership.president', 'name')
                .lean();

            // Attempt 2: Fallback to individual word matches if exact phrase fails
            if (matchedClubs.length === 0 && searchTerms.length > 1) {
                const regexes = searchTerms.map(term => new RegExp(term, 'i'));
                matchedClubs = await Club.find({ name: { $in: regexes } }, 'name category members leadership')
                    .populate('leadership.president', 'name')
                    .limit(5)
                    .lean();
            }

            rawData.clubs = matchedClubs;

            if (rawData.clubs.length === 1) {
                intent = "specific_club";
                rawData.searchFound = true;
            } else if (rawData.clubs.length > 1) {
                intent = "ambiguous_club";
                rawData.searchFound = true;
            }
        }
    }

    if (wantsLeadership) {
        rawData.staff = await Staff.find({ isActive: true }).sort({ priority: 1 }).select('name title department responsibility').lean();
        rawData.leadership = await Leadership.find({ isActive: true }).sort({ priority: 1 }).select('name role bio').lean();
    }

    // Build Context String
    let contextParts = [];

    if (intent === "list_clubs") {
        contextParts.push(`The user asked for a list of clubs. Here is a bounded sample of up to 20 currently active clubs:\n` + rawData.clubs.map(c => `- ${c.name} (${c.category})`).join("\n"));
    } else if (intent === "specific_club") {
        const clubDetails = rawData.clubs.map(c => {
            const count = c.members ? c.members.filter(m => m.status === 'approved').length : 0;
            const leaderName = c.leadership && c.leadership.president ? c.leadership.president.name : 'Not assigned';
            return `- ${c.name} [Category: ${c.category}, Members: ${count}, Leader: ${leaderName}]`;
        }).join("\n");
        contextParts.push(`The user seems to be asking about a specific club. Found the exact match in the database:\n${clubDetails}`);
    } else if (intent === "ambiguous_club") {
        const clubNames = rawData.clubs.map(c => c.name).join(", ");
        contextParts.push(`The user's query matched multiple clubs in the database: ${clubNames}. You MUST explicitly ask the user to clarify which specific club they are asking about. Do not guess or provide detailed statistics until they clarify.`);
    } else if (mentionsClub && !rawData.searchFound && !wantsAllClubs) {
        contextParts.push(`The user mentioned a club, but NO matching club was found in the current DBU database. You MUST explicitly state that the club could not be found in the current DBU records.`);
    }

    if (wantsLeadership) {
        if (rawData.staff.length > 0) {
            contextParts.push(`DBU Union Staff:\n` + rawData.staff.map(s => `- ${s.name} (${s.title})`).join("\n"));
        }
        if (rawData.leadership.length > 0) {
            contextParts.push(`DBU Student Leaders:\n` + rawData.leadership.map(l => `- ${l.name} (${l.role})`).join("\n"));
        }
    }

    if (contextParts.length === 0) {
        contextParts.push(`General inquiry. No specific database records were queried. Student Union President is Kirkos Ashebir. Dean of Student Affairs is Ato Giziew Fetene.`);
    }

    return {
        intent,
        contextString: contextParts.join("\n\n"),
        rawData
    };
}

module.exports = {
    retrieveContext
};
