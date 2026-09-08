const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const jwt = require('jsonwebtoken');

dotenv.config({ path: path.join(__dirname, '.env') });

const Club = require('./models/Club');
const User = require('./models/User');

async function runTests() {
  console.log('--- Starting Club Join Approval Toggle & Member Approval Test ---');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  try {
    // 1. Find or create a test club
    let testClub = await Club.findOne({ status: 'active' });
    if (!testClub) {
      console.log('Creating a test club...');
      testClub = await Club.create({
        name: 'Automated Test Club ' + Date.now(),
        description: 'A test club for automated verification of approval toggle',
        category: 'Technology',
        founded: '2026',
        status: 'active',
        requireApproval: true
      });
    }

    console.log(`Using Club: "${testClub.name}" (_id: ${testClub._id})`);
    console.log(`Initial requireApproval value: ${testClub.requireApproval}`);

    // Find an admin user for token generation
    const adminUser = await User.findOne({
      $or: [
        { role: 'admin' },
        { role: 'system_admin' },
        { isAdmin: true },
        { username: 'dbu10101040' }
      ]
    });

    if (!adminUser) {
      throw new Error('No admin user found to test authorization');
    }
    console.log(`Using Admin User: ${adminUser.username} (${adminUser.role})`);

    const adminToken = jwt.sign({ id: adminUser._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Find or create a student user for joining
    let studentUser = await User.findOne({ role: 'student', username: { $regex: /^dbu\d{8}$/i } });
    if (!studentUser) {
      studentUser = await User.findOne({ _id: { $ne: adminUser._id } });
    }
    console.log(`Using Student User: ${studentUser.username} (${studentUser.name})`);

    const studentToken = jwt.sign({ id: studentUser._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    const baseUrl = 'http://localhost:5000/api/clubs';

    // TEST 1: Toggle approval to FALSE (Auto-Approval mode)
    console.log('\n--- TEST 1: Toggle requireApproval to FALSE ---');
    const toggleRes1 = await fetch(`${baseUrl}/${testClub._id}/toggle-approval`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ requireApproval: false })
    });
    const toggleData1 = await toggleRes1.json();
    console.log('Toggle response:', toggleData1);
    if (!toggleData1.success || toggleData1.requireApproval !== false) {
      throw new Error('Failed to set requireApproval to false');
    }
    console.log('✅ Successfully toggled requireApproval to FALSE');

    // Remove student from club members if already exists to ensure fresh test
    await Club.findByIdAndUpdate(testClub._id, {
      $pull: { members: { user: studentUser._id } }
    });
    await User.findByIdAndUpdate(studentUser._id, {
      $pull: { joinedClubs: testClub._id }
    });

    // TEST 2: Join with requireApproval = false (Auto-Approval)
    console.log('\n--- TEST 2: Student Joins Club with Auto-Approval ---');
    const joinRes1 = await fetch(`${baseUrl}/${testClub._id}/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`
      },
      body: JSON.stringify({
        fullName: studentUser.name,
        department: studentUser.department || 'Computer Science',
        year: studentUser.year || '3rd Year',
        background: 'Interested in technology workshops'
      })
    });
    const joinData1 = await joinRes1.json();
    console.log('Join response (Auto-approve expected):', joinData1);
    if (!joinData1.success || !joinData1.autoApproved) {
      throw new Error('Join should have auto-approved when requireApproval is false');
    }

    // Verify member is approved in database
    const clubAfterJoin1 = await Club.findById(testClub._id);
    const member1 = clubAfterJoin1.members.find(m => m.user.toString() === studentUser._id.toString());
    if (!member1 || member1.status !== 'approved') {
      throw new Error('Member was not saved with approved status in DB');
    }
    console.log(`✅ Member status in DB: ${member1.status} (joinedAt: ${member1.joinedAt})`);

    // TEST 3: Toggle approval back to TRUE (Manual Review mode)
    console.log('\n--- TEST 3: Toggle requireApproval back to TRUE ---');
    const toggleRes2 = await fetch(`${baseUrl}/${testClub._id}/toggle-approval`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ requireApproval: true })
    });
    const toggleData2 = await toggleRes2.json();
    console.log('Toggle response:', toggleData2);
    if (!toggleData2.success || toggleData2.requireApproval !== true) {
      throw new Error('Failed to set requireApproval to true');
    }
    console.log('✅ Successfully toggled requireApproval to TRUE');

    // Clean student from club for next test
    await Club.findByIdAndUpdate(testClub._id, {
      $pull: { members: { user: studentUser._id } }
    });
    await User.findByIdAndUpdate(studentUser._id, {
      $pull: { joinedClubs: testClub._id }
    });

    // TEST 4: Join with requireApproval = true (Pending Review)
    console.log('\n--- TEST 4: Student Joins Club with Manual Approval Required ---');
    const joinRes2 = await fetch(`${baseUrl}/${testClub._id}/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`
      },
      body: JSON.stringify({
        fullName: studentUser.name,
        department: studentUser.department || 'Computer Science',
        year: studentUser.year || '3rd Year',
        background: 'Applying for membership'
      })
    });
    const joinData2 = await joinRes2.json();
    console.log('Join response (Pending expected):', joinData2);
    if (!joinData2.success || joinData2.autoApproved !== false) {
      throw new Error('Join should have stayed pending when requireApproval is true');
    }

    const clubAfterJoin2 = await Club.findById(testClub._id);
    const member2 = clubAfterJoin2.members.find(m => m.user.toString() === studentUser._id.toString());
    if (!member2 || member2.status !== 'pending') {
      throw new Error('Member was not saved with pending status in DB');
    }
    console.log(`✅ Member status in DB: ${member2.status} (memberId: ${member2._id})`);

    // TEST 5: Approve the pending member
    console.log('\n--- TEST 5: Admin Approves Pending Member ---');
    const approveRes = await fetch(`${baseUrl}/${testClub._id}/members/${member2._id}/approve`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      }
    });
    const approveData = await approveRes.json();
    console.log('Approve response:', approveData);
    if (!approveData.success) {
      throw new Error('Failed to approve member: ' + JSON.stringify(approveData));
    }
    console.log('✅ Member approved successfully via API!');

    // Verify DB
    const clubAfterApprove = await Club.findById(testClub._id);
    const approvedMember = clubAfterApprove.members.find(m => m.user.toString() === studentUser._id.toString());
    if (!approvedMember || approvedMember.status !== 'approved') {
      throw new Error('Member status in DB is not approved after approval API call');
    }
    console.log(`✅ Member status in DB: ${approvedMember.status} (approvedAt: ${approvedMember.approvedAt})`);

    // TEST 6: Exact Error-Handling Verification - Approve non-existent member
    console.log('\n--- TEST 6: Exact Error-Handling - Approve Non-Existent Member ---');
    const fakeId = new mongoose.Types.ObjectId();
    const errorRes = await fetch(`${baseUrl}/${testClub._id}/members/${fakeId}/approve`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      }
    });
    const errorData = await errorRes.json();
    console.log(`Error status: ${errorRes.status}, response:`, errorData);
    if (errorRes.status !== 404 || !errorData.message.includes('Member request not found')) {
      throw new Error('Expected 404 with exact member not found error message');
    }
    console.log('✅ Exact error handling returned expected 404 response!');

    // Clean up test member
    await Club.findByIdAndUpdate(testClub._id, {
      $pull: { members: { user: studentUser._id } }
    });
    await User.findByIdAndUpdate(studentUser._id, {
      $pull: { joinedClubs: testClub._id }
    });
    console.log('\n✅ All automated verification tests passed perfectly!');
  } finally {
    await mongoose.disconnect();
  }
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
