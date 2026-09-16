require('dotenv').config();
const mongoose = require('mongoose');
const AttendanceSession = require('./models/AttendanceSession');

async function testAttendanceClose() {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected.");

    // Create a dummy session
    const session = await AttendanceSession.create({
        sessionToken: 'test-double-close-token',
        shortCode: 'TEST01',
        eventTitle: 'Test Event',
        clubName: 'Test Club',
        hoursCredit: 1,
        expiresAt: new Date(Date.now() + 100000),
        startedAt: new Date(),
        createdBy: new mongoose.Types.ObjectId(),
        isActive: true,
        challengeSecret: 'secret'
    });

    console.log(`Created active session: ${session.sessionToken}`);

    console.log("\n--- Simulating Request 1 ---");
    const updated1 = await AttendanceSession.findOneAndUpdate(
        { _id: session._id, isActive: true },
        { $set: { isActive: false, closedAt: new Date() } },
        { new: true }
    );
    if (updated1) {
        console.log("Request 1 SUCCESS: Session closed.");
    } else {
        console.log("Request 1 FAILED: Session not active.");
    }

    console.log("\n--- Simulating Request 2 (Duplicate Close) ---");
    const updated2 = await AttendanceSession.findOneAndUpdate(
        { _id: session._id, isActive: true },
        { $set: { isActive: false, closedAt: new Date() } },
        { new: true }
    );
    if (updated2) {
        console.log("Request 2 SUCCESS: Session closed.");
    } else {
        console.log("Request 2 REJECTED: Session was already closed. (EXPECTED BEHAVIOR)");
    }

    // Cleanup
    await AttendanceSession.deleteOne({ _id: session._id });
    console.log("\nCleanup done. Test complete.");
    process.exit(0);
}

testAttendanceClose().catch(err => {
    console.error(err);
    process.exit(1);
});
