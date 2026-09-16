require('dotenv').config();
const mongoose = require('mongoose');
require('./models/User');
const { handleChat } = require('./controllers/aiController');

async function testAuthAI() {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected.");

    const testCases = [
        "What is my name?",
        "What clubs are available?",
        "Who is the president of Booking Club?",
        "Who is the president of Art Club?"
    ];

    const mockUser = {
        name: "Test Student",
        role: "student",
        username: "dbu12345678"
    };

    for (const message of testCases) {
        console.log(`\n\n======================================`);
        console.log(`TEST: "${message}"`);
        console.log(`======================================`);

        const req = {
            body: { message },
            user: mockUser
        };

        const res = {
            status: function(code) {
                this.statusCode = code;
                return this;
            },
            json: function(data) {
                console.log(`[STATUS]: ${this.statusCode || 200}`);
                console.log(`[RESPONSE SUCCESS]: ${data.success}`);
                if (data.answer) {
                    console.log(`[AI ANSWER]:\n${data.answer}`);
                }
                if (data.error) {
                    console.log(`[ERROR]: ${data.error}`);
                }
            }
        };

        await handleChat(req, res);
    }

    console.log("\nTests complete.");
    process.exit(0);
}

testAuthAI().catch(err => {
    console.error(err);
    process.exit(1);
});
