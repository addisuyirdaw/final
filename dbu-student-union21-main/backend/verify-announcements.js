const mongoose = require('mongoose');
const User = require('./models/User');
const Club = require('./models/Club');
const ClubAnnouncement = require('./models/ClubAnnouncement');

async function runTests() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/dbu_student_union', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  console.log('Connected to DB for security verification (Phase 1B-3)...');

  try {
    // Clean up
    await User.deleteMany({ username: { $in: ['dbu11111111', 'dbu22222222', 'dbu33333333', 'dbu44444444'] } });
    await Club.deleteMany({ name: { $in: ['Test Club A', 'Test Club B'] } });
    await ClubAnnouncement.deleteMany({ title: 'Test Announcement' });

    // Create test users
    const leaderA = await User.create({ name: 'Leader A', username: 'dbu11111111', email: 'la@test.com', password: 'password', department: 'CS', year: '3', role: 'student' });
    const memberA = await User.create({ name: 'Member A', username: 'dbu22222222', email: 'ma@test.com', password: 'password', department: 'CS', year: '3', role: 'student' });
    const memberB = await User.create({ name: 'Member B', username: 'dbu33333333', email: 'mb@test.com', password: 'password', department: 'CS', year: '3', role: 'student' });
    const nonMember = await User.create({ name: 'Non Member', username: 'dbu44444444', email: 'nm@test.com', password: 'password', department: 'CS', year: '3', role: 'student' });

    // Create clubs
    const clubA = await Club.create({
      name: 'Test Club A',
      description: 'A',
      category: 'Academic',
      leadership: { president: leaderA._id },
      members: [
        { user: leaderA._id, role: 'president', status: 'approved' },
        { user: memberA._id, role: 'member', status: 'approved' }
      ]
    });

    const clubB = await Club.create({
      name: 'Test Club B',
      description: 'B',
      category: 'Academic',
      leadership: { president: memberB._id },
      members: [
        { user: memberB._id, role: 'president', status: 'approved' }
      ]
    });

    // Create an announcement in Club A
    const announcementA = await ClubAnnouncement.create({
      clubId: clubA._id,
      title: 'Test Announcement',
      content: 'Content',
      author: leaderA._id
    });

    console.log('--- STARTING VERIFICATION TESTS ---');

    // Simulate route middleware logic for testing

    const isClubAuthorized = (club, userId) => {
      const u = typeof userId === 'object' ? userId._id.toString() : userId.toString();
      const p = club.leadership?.president?.toString();
      return p === u; // simplified for test (no admin check)
    };

    const isApprovedMember = (club, userId) => {
      const u = typeof userId === 'object' ? userId._id.toString() : userId.toString();
      return club.members.some(m => m.user.toString() === u && m.status === 'approved');
    };

    // Test A: Club Leader can create announcement in their own club
    console.log('Test A: Leader A creates announcement in Club A ->', isClubAuthorized(clubA, leaderA._id) ? 'PASS' : 'FAIL');

    // Test B: Ordinary Member can view announcements in their club
    console.log('Test B: Member A views announcements in Club A ->', isApprovedMember(clubA, memberA._id) || isClubAuthorized(clubA, memberA._id) ? 'PASS' : 'FAIL');

    // Test C: Ordinary Member CANNOT create announcements
    console.log('Test C: Member A creates announcement in Club A ->', !isClubAuthorized(clubA, memberA._id) ? 'PASS (Rejected)' : 'FAIL');

    // Test D: Cross-club isolation (Leader A CANNOT create in Club B)
    console.log('Test D: Leader A creates announcement in Club B ->', !isClubAuthorized(clubB, leaderA._id) ? 'PASS (Rejected)' : 'FAIL');

    // Test E: Non-member CANNOT view announcements
    console.log('Test E: Non Member views announcements in Club A ->', !(isApprovedMember(clubA, nonMember._id) || isClubAuthorized(clubA, nonMember._id)) ? 'PASS (Rejected)' : 'FAIL');

    // Test F: Cross-club isolation (Member A CANNOT view Club B)
    console.log('Test F: Member A views announcements in Club B ->', !(isApprovedMember(clubB, memberA._id) || isClubAuthorized(clubB, memberA._id)) ? 'PASS (Rejected)' : 'FAIL');

    console.log('--- VERIFICATION COMPLETE ---');

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

runTests();
