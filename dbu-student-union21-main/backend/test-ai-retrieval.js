require('dotenv').config();
const mongoose = require('mongoose');
require('./models/User');
const { retrieveContext } = require('./services/aiRetrievalService');

async function testRetrieval() {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected.");

    const testCases = [
        "What clubs are available?",
        "Who is the president of Booking Club?",
        "Who is the president of Truth Culture Club?",
        "Who is the president of Mechanical Engineering Club?",
        "How many members does the Booking Club have?",
        "Who is the president of Art Club?",
        "How many members does the Art Club have?",
        "Who is the president of the NonExistent Club?",
        "Who is the Student Union President?"
    ];

    for (const test of testCases) {
        console.log(`\n\n======================================`);
        console.log(`TEST: "${test}"`);
        console.log(`======================================`);
        
        const { intent, contextString, rawData } = await retrieveContext(test);
        
        console.log(`[INTENT IDENTIFIED]: ${intent}`);
        console.log(`[SEARCH FOUND]: ${rawData.searchFound}`);
        console.log(`[CLUBS RETURNED]: ${rawData.clubs.length}`);
        if (rawData.clubs.length > 0) {
            console.log(`[CLUB NAMES]: ${rawData.clubs.map(c => c.name).join(', ')}`);
        }
        console.log(`\n[CONTEXT STRING FOR GEMINI]:`);
        console.log(contextString);
    }

    console.log("\nTests complete.");
    process.exit(0);
}

testRetrieval().catch(err => {
    console.error(err);
    process.exit(1);
});
