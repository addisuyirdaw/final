const { GoogleGenerativeAI } = require('@google/generative-ai');
const Club = require('../models/Club');
const Template = require('../models/Template');
const Staff = require('../models/Staff');
const Leadership = require('../models/Leadership');
const Conversation = require('../models/Conversation');
const aiRetrievalService = require('../services/aiRetrievalService');
const clubService = require('../services/clubService');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'YOUR_ACTIVE_KEY');

exports.handleChat = async (req, res) => {
    const { message, conversationId } = req.body;
    if (!message || typeof message !== 'string' || !message.trim()) {
        return res.status(400).json({ 
            error: "Valid message is required",
            response: "Valid message is required",
            answer: "Valid message is required"
        });
    }
    
    if (conversationId && !require('mongoose').Types.ObjectId.isValid(conversationId)) {
        return res.status(400).json({ error: "Invalid conversationId" });
    }

    let rawData = null;
    let contextString = "";
    let intent = "general";
    let conversation;
    let activeConversationId = conversationId;

    try {
        // Authenticated Student Context
        const studentContext = {
            name: req.user.name,
            role: req.user.role,
            studentId: req.user.username
        };

        if (conversationId) {
            conversation = await Conversation.findById(conversationId);
            if (!conversation) {
                return res.status(404).json({ error: "Conversation not found" });
            }
            if (conversation.userId.toString() !== req.user._id.toString()) {
                return res.status(403).json({ error: "Unauthorized access to conversation" });
            }
        } else {
            conversation = await Conversation.create({ userId: req.user._id });
            activeConversationId = conversation._id;
        }

        // 1. Intelligent Database Retrieval
        const retrieval = await aiRetrievalService.retrieveContext(message);
        contextString = retrieval.contextString;
        rawData = retrieval.rawData;
        intent = retrieval.intent;

        // 2. Initialize the generative model (gemini-1.5-flash)
        const tools = [{
            functionDeclarations: [
                {
                    name: "join_club",
                    description: "Submit a student's request to join a specific student club using the student's own stated reason. Use only when the student has clearly expressed an intention to join and has provided their actual reason.",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            clubId: {
                                type: "STRING",
                                description: "The MongoDB ID of the specific club the authenticated student wants to join."
                            },
                            background: {
                                type: "STRING",
                                description: "The student's actual stated reason for wanting to join the club. Never invent this value."
                            }
                        },
                        required: ["clubId", "background"]
                    }
                }
            ]
        }];

        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            tools: tools,
            systemInstruction: `You are the official Debre Birhan University (DBU) Student Union Generative Assistant. 
            You are speaking to an authenticated user:
            - Name: ${studentContext.name}
            - Student ID: ${studentContext.studentId}
            - Role: ${studentContext.role}

            You have direct reading access to our system database. Based on the student's current query, the database retrieved the following LIVE CURRENT context:
            
            ${contextString}
            
            RULES:
            1. Use your conversational, human-like generative abilities to answer the student organically.
            2. If the LIVE CURRENT context explicitly says a club was not found, you MUST state that the club is not found in the DBU database.
            3. If the user asks general questions, guide them back creatively to what our student union system offers.
            4. Never hallucinate or mention information outside our university database domain.
            5. If the user asks about their identity or name, use the authenticated user details provided above. However, do not unnecessarily mention their identity if they ask an unrelated question.
            6. PREVIOUS CONVERSATION HISTORY is provided strictly for contextual references (like pronouns or subject continuity). The LIVE CURRENT context and AUTHENTICATED USER details ALWAYS override anything said in the previous conversation history.
            7. If the user asks to join a club, but hasn't provided their reason, you MUST ask them for their reason before calling join_club. Never invent a reason.`
        });

        // 3. Build history context (Limit to last 10 messages)
        const historyContext = conversation.messages.slice(-10).map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
        }));

        historyContext.push({
            role: 'user',
            parts: [{ text: message }]
        });

        // 4. Generate the response text from the live model
        let result = await model.generateContent({ contents: historyContext });
        
        let responseText = "";
        const functionCalls = result.response.functionCalls();

        if (functionCalls && functionCalls.length > 0) {
            const call = functionCalls[0];
            let functionResult;

            if (call.name === 'join_club') {
                const { clubId, background } = call.args;

                if (!clubId || !require('mongoose').Types.ObjectId.isValid(clubId) || !background || !background.trim()) {
                    // Case D: syntactically invalid ObjectId or missing reason — block before service.
                    functionResult = { success: false, message: "Action blocked: Invalid club ID or missing reason." };
                } else if (intent === 'ambiguous_club') {
                    // Case B: ambiguous retrieval — never auto-select.
                    functionResult = { success: false, message: "Action blocked: Ambiguous club name. Ask the student to clarify which club they mean." };
                } else if (intent === 'specific_club' && rawData.clubs.length === 1) {
                    // Case A: exactly one authoritative club in current retrieval context.
                    // Gemini's clubId MUST match the backend-verified club. Reject if stale/wrong.
                    const authorizedClubId = rawData.clubs[0]._id.toString();
                    if (clubId !== authorizedClubId) {
                        functionResult = { success: false, message: "Action blocked: Requested club does not match the currently verified club context." };
                    } else {
                        // IDs match — proceed to the single source of truth.
                        functionResult = await clubService.joinClub(clubId, req.user, { background });
                    }
                } else {
                    // Case C/E: No specific club was resolved in the CURRENT retrieval turn.
                    // This covers follow-up messages like "yes, join it" where the student did not
                    // name a club, so Gemini may be reusing a stale ID from conversation history.
                    // We CANNOT verify the intended target — block to prevent wrong-club mutation.
                    functionResult = { success: false, message: "Action blocked: No specific club was identified in your current message. Please mention the club name you want to join so I can verify it." };
                }
            } else {
                functionResult = { success: false, message: "Tool not recognized." };
            }

            // Append assistant's function call intent
            historyContext.push({
                role: 'model',
                parts: [{ functionCall: call }]
            });

            // Append the backend's function response
            historyContext.push({
                role: 'user',
                parts: [{
                    functionResponse: {
                        name: call.name,
                        response: { name: call.name, content: functionResult }
                    }
                }]
            });

            // Retrieve final text explaining the action result
            result = await model.generateContent({ contents: historyContext });
            responseText = result.response.text();
        } else {
            responseText = result.response.text();
        }

        // 5. Save the interaction
        conversation.messages.push({ role: 'user', content: message });
        conversation.messages.push({ role: 'assistant', content: responseText });
        await conversation.save();

        return res.json({ 
            success: true,
            response: responseText,
            answer: responseText,
            conversationId: conversation._id
        });

    } catch (error) {
        console.warn("Generative AI API Call Failed. Executing Local Fallback Controller.", error.message);
        // Fetch snapshot metrics for local fallback using the already retrieved rawData
        try {
            const fallbackAnswer = buildFallbackAnswer(message, rawData, intent);
            
            if (conversation) {
                conversation.messages.push({ role: 'user', content: message });
                conversation.messages.push({ role: 'assistant', content: fallbackAnswer });
                await conversation.save();
            }

            return res.json({ 
                success: true,
                response: fallbackAnswer,
                answer: fallbackAnswer,
                conversationId: activeConversationId
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

function buildFallbackAnswer(message, rawData, intent) {
    const q = message.toLowerCase().replace(/[^\w\s]/g, ' ').trim();
    const { clubs, staff, leadership } = rawData;

    // 1. Greetings
    const greetWords = ['hi', 'hello', 'hey', 'hey there', 'good morning', 'good afternoon', 'good evening'];
    if (greetWords.some(w => q === w || q.startsWith(w + ' '))) {
        return 'Hello! I am the DBU Student Union Assistant. I can tell you about our clubs, leadership contacts, templates, attendance progress, elections, and complaints. What would you like to know?';
    }

    // 2. Who is leader of a specific club
    if (q.includes('leader of') || q.includes('president of') || q.includes('rep of') || q.includes('representative of') || q.includes('who leads')) {
        if (intent === 'ambiguous_club') {
            const clubNames = clubs.map(c => c.name).join(", ");
            return `Your query matched multiple clubs: ${clubNames}. Please clarify which one you are asking about.`;
        }
        if (clubs.length > 0) {
            const club = clubs[0]; // best match
            const leaderName = club.leadership && club.leadership.president ? club.leadership.president.name : null;
            if (leaderName) {
                return `${leaderName} is the representative of ${club.name}.`;
            }
            return `The representative of ${club.name} is not registered yet. You can find more details under the Clubs tab of the portal.`;
        }
        return `I couldn't find a club matching that name in the current DBU Student Union records.`;
    }

    // 3. Who is the leader / president / staff generally
    if (q.includes('who is the leader') || q.includes('who is the president') || q.includes('leadership team') || q.includes('contact leader') || q.includes('who is in charge') || q.includes('dean')) {
        const unionPres = leadership.length > 0 ? leadership[0].name : 'Kirkos Ashebir';
        const deanName = staff.length > 0 ? staff.find(s => s.title?.toLowerCase().includes('dean'))?.name : 'Ato Giziew Fetene';
        return `DBU Student Affairs leadership includes: ${unionPres} (Student Union President) and ${deanName || 'Ato Giziew Fetene'} (Dean of Student Affairs). Visit the Leadership Gallery page for full details and photos.`;
    }

    // 4. Specific club details
    if (q.includes('club') || q.includes('membership') || q.includes('join')) {
        if (intent === 'list_clubs' && clubs.length > 0) {
            return `There are currently several active clubs, such as ${clubs.slice(0, 3).map(c => c.name).join(', ')}. You can browse all of them and join directly in the Clubs tab of the portal.`;
        }
        if (intent === 'ambiguous_club') {
            const clubNames = clubs.map(c => c.name).join(", ");
            return `Your query matched multiple clubs: ${clubNames}. Please clarify which one you are asking about.`;
        }
        if (clubs.length > 0) {
            const club = clubs[0];
            const count = club.members ? club.members.filter(m => m.status === 'approved').length : 0;
            return `${club.name} is an active ${club.category} club at DBU. It currently has ${count} approved members. To join, go to the Clubs section, select ${club.name}, and click Join.`;
        }
        if (intent === 'specific_club' || q.includes('club')) {
            return `I couldn't find a club matching that name in the current DBU Student Union records.`;
        }
        return `You can browse, view details, and join clubs directly in the Clubs tab of the portal.`;
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
