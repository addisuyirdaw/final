const { GoogleGenerativeAI } = require('@google/generative-ai');
const Club = require('../models/Club');
const Template = require('../models/Template');
const Staff = require('../models/Staff');
const Leadership = require('../models/Leadership');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'YOUR_ACTIVE_KEY');

exports.handleChat = async (req, res) => {
    const { message } = req.body;
    if (!message) {
        return res.status(400).json({ 
            error: "Message is required",
            response: "Message is required",
            answer: "Message is required"
        });
    }

    try {
        // 1. Pull the actual live university data rows in parallel
        const [totalClubs, totalTemplates, activeClubsList, staffList, leadershipList] = await Promise.all([
            Club.countDocuments(),
            Template.countDocuments(),
            Club.find({}, 'name category members leadership').populate('leadership.president', 'name').limit(10).lean(),
            Staff.find({ isActive: true }).sort({ priority: 1 }).select('name title department responsibility').lean(),
            Leadership.find({ isActive: true }).sort({ priority: 1 }).select('name role bio').lean(),
        ]);
        
        const clubContext = activeClubsList.map(c => {
            const count = c.members ? c.members.filter(m => m.status === 'approved').length : 0;
            const leaderName = c.leadership && c.leadership.president ? c.leadership.president.name : 'Not assigned';
            return `- ${c.name} [Category: ${c.category}, Members: ${count}, Leader: ${leaderName}]`;
        }).join("\n");

        const staffContext = staffList.map(s => `- ${s.name} (${s.title})${s.department ? ' in ' + s.department : ''}`).join("\n");
        const leadershipContext = leadershipList.map(l => `- ${l.name} (${l.role})`).join("\n");

        // 2. Initialize the generative model (gemini-1.5-flash)
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            systemInstruction: `You are the official Debre Birhan University (DBU) Student Union Generative Assistant. 
            You have direct reading access to our system database. Here is the current live system context:
            - Total Registered Clubs: ${totalClubs}
            - Total Administrative Templates: ${totalTemplates}
            - Sample Active Clubs currently in database:
${clubContext}
            - Key Union Staff:
${staffContext}
            - Key Union Student Leaders:
${leadershipContext}
            - Key Union Leaders: Student Union President is Kirkos Ashebir. Dean of Student Affairs is Ato Gizew Fetene.
            
            RULES:
            1. Use your conversational, human-like generative abilities to answer the student organically.
            2. Talk specifically about our DBU clubs, attendance metrics, and templates using the context above.
            3. If the user asks general questions, guide them back creatively to what our student union system offers.
            4. Never hallucinate or mention information outside our university database domain.`
        });

        // 3. Generate the response text from the live model
        const result = await model.generateContent(message);
        const responseText = result.response.text();

        return res.json({ 
            success: true,
            response: responseText,
            answer: responseText
        });

    } catch (error) {
        console.warn("Generative AI API Call Failed. Executing Local Fallback Controller.", error.message);
        
        // Fetch snapshot metrics for local fallback
        try {
            const totalClubs = await Club.countDocuments();
            const activeClubsList = await Club.find({}, 'name category members leadership').populate('leadership.president', 'name').lean();
            const staffList = await Staff.find({ isActive: true }).lean();
            const leadershipList = await Leadership.find({ isActive: true }).lean();

            const fallbackAnswer = buildFallbackAnswer(message, activeClubsList, staffList, leadershipList, totalClubs);
            
            return res.json({ 
                success: true,
                response: fallbackAnswer,
                answer: fallbackAnswer
            });
        } catch (fallbackError) {
            console.error("Local Fallback Engine Error:", fallbackError);
            return res.status(500).json({ 
                success: false,
                response: "The student assistant engine is currently offline. Please try again in a moment.",
                answer: "The student assistant engine is currently offline. Please try again in a moment."
            });
        }
    }
};

function buildFallbackAnswer(message, clubs, staff, leadership, totalClubs) {
    const q = message.toLowerCase().replace(/[^\w\s]/g, ' ').trim();

    // 1. Greetings
    const greetWords = ['hi', 'hello', 'hey', 'hey there', 'good morning', 'good afternoon', 'good evening'];
    if (greetWords.some(w => q === w || q.startsWith(w + ' '))) {
        return 'Hello! I am the DBU Student Union Assistant. I can tell you about our clubs, leadership contacts, templates, attendance progress, elections, and complaints. What would you like to know?';
    }

    // 2. Who is leader of a specific club
    if (q.includes('leader of') || q.includes('president of') || q.includes('rep of') || q.includes('representative of') || q.includes('who leads')) {
        for (const club of clubs) {
            if (q.includes(club.name.toLowerCase())) {
                const leaderName = club.leadership && club.leadership.president ? club.leadership.president.name : null;
                if (leaderName) {
                    return `${leaderName} is the representative of ${club.name}.`;
                }
                return `The representative of ${club.name} is not registered yet. You can find more details under the Clubs tab of the portal.`;
            }
        }
    }

    // 3. Who is the leader / president / staff generally
    if (q.includes('who is the leader') || q.includes('who is the president') || q.includes('leadership team') || q.includes('contact leader') || q.includes('who is in charge')) {
        const unionPres = leadership.find(l => l.role?.toLowerCase().includes('president'))?.name || 'Kirkos Ashebir';
        const dean = staff.find(s => s.title?.toLowerCase().includes('dean'))?.name || 'Ato Gizew Fetene';
        return `DBU Student Affairs leadership includes: Kirkos Ashebir (Student Union President) and Ato Gizew Fetene (Dean of Student Affairs). The Student Union and Student Affairs operate as one integrated office. Visit the Leadership Gallery page for full details and photos.`;
    }

    // 4. Specific club details
    if (q.includes('club') || q.includes('membership') || q.includes('join')) {
        for (const club of clubs) {
            if (q.includes(club.name.toLowerCase())) {
                const count = club.members ? club.members.filter(m => m.status === 'approved').length : 0;
                return `${club.name} is an active ${club.category} club at DBU, founded in ${club.founded || '2026'}. It currently has ${count} approved members. To join, go to the Clubs section, select ${club.name}, and click Join.`;
            }
        }
        return `DBU currently has ${totalClubs} registered clubs. You can browse, view details, and join them directly in the Clubs tab of the portal.`;
    }

    // 5. Student Union explanations
    if (q.includes('student union') || q.includes('union') || q.includes('affairs') || q.includes('guidance') || q.includes('dormitory') || q.includes('support')) {
        return `The DBU Student Union Portal integrates the Student Union, Dormitory Services, and Psychological Guidance under one office. The platform allows students to join clubs, track attendance codes, vote in elections, submit complaints, and download digital certificates.`;
    }

    // 6. Generic Fallback
    return 'I am the DBU Student Union Assistant. I can help you with clubs, leadership contacts, complaints, elections, templates, and attendance progress. Please ask a question about one of these topics.';
}

// Backwards compatibility alias
exports.processChatQuery = exports.handleChat;
