require('dotenv').config();
const mongoose = require('mongoose');
const Club = require('./models/Club');
const User = require('./models/User');
const clubService = require('./services/clubService');

async function testJoinService() {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected.\n");

    const TEST_CLUB_ID = '000000000000000000000099'; // Mock ID for testing
    const TEST_USER_ID = '000000000000000000000098'; // Mock user

    // 1. Setup mock data
    await Club.deleteOne({ _id: TEST_CLUB_ID });
    await User.deleteOne({ username: 'dbu87654321' });

    const authUser = await User.create({
        _id: TEST_USER_ID,
        username: 'dbu87654321',
        password: 'Password123!',
        name: 'Test Joiner',
        department: 'Computer Science',
        year: '2nd Year',
        role: 'student',
        email: 'test@dbu.edu'
    });

    const club = await Club.create({
        _id: TEST_CLUB_ID,
        name: 'Test AI Club',
        description: 'A club for testing AI joins',
        category: 'Academic',
        founded: '2025',
        status: 'active',
        requireApproval: true,
        members: []
    });

    const runJoin = async (background) => {
        return await clubService.joinClub(club._id, authUser, { background });
    };

    console.log(`--- Test 1: Missing reason/background ---`);
    let result = await runJoin("");
    console.log(`Expected 400. Got: ${result.statusCode} - ${result.message}`);

    console.log(`\n--- Test 2: Valid join (Pending) ---`);
    result = await runJoin("I love AI and want to test this.");
    console.log(`Expected 200. Got: ${result.statusCode} - ${result.message}`);
    
    console.log(`\n--- Test 3: Already pending ---`);
    result = await runJoin("I really want to join.");
    console.log(`Expected 400. Got: ${result.statusCode} - ${result.message}`);

    console.log(`\n--- Test 4: Authenticated user identity checks ---`);
    // Check if the user who joined is the authUser
    const updatedClub = await Club.findById(club._id);
    const member = updatedClub.members[0];
    console.log(`Member ID matches Auth User ID: ${member.user.toString() === authUser._id.toString()}`);
    console.log(`Member Name matches Auth User Name: ${member.fullName === authUser.name}`);
    console.log(`Member Status: ${member.status}`);

    console.log(`\n--- Test 5: Inactive club ---`);
    club.status = 'inactive';
    await club.save();
    result = await runJoin("Please let me in.");
    console.log(`Expected 400. Got: ${result.statusCode} - ${result.message}`);

    console.log(`\n--- Test 6: Nonexistent club ---`);
    result = await clubService.joinClub("000000000000000000000000", authUser, { background: "Test" });
    console.log(`Expected 404. Got: ${result.statusCode} - ${result.message}`);

    // Clean up
    await Club.deleteOne({ _id: TEST_CLUB_ID });
    await User.deleteOne({ username: 'dbu87654321' });

    console.log("\nTests complete.");
    process.exit(0);
}

testJoinService().catch(err => {
    console.error(err);
    process.exit(1);
});
