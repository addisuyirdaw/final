/**
 * Automated Verification Test Suite for Production-Grade Permanent Club Deletion
 * Tests all 12 requirements against an isolated in-memory test database.
 */
const path = require('path');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Models
const Club = require('../models/Club');
const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');
const ClubAnnouncement = require('../models/ClubAnnouncement');
const ActivityReport = require('../models/ActivityReport');
const Transaction = require('../models/Transaction');
const Certificate = require('../models/Certificate');
const Migration = require('../models/Migration');

// Migration Runner
const { runMigrations, getMigrationStatus } = require('../utils/migrationRunner');

// Setup JWT secret for test auth
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_key_1234567890_abcdef';

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '1h' });

// Colors for terminal output
const green = (t) => `\x1b[32m${t}\x1b[0m`;
const red = (t) => `\x1b[31m${t}\x1b[0m`;
const cyan = (t) => `\x1b[36m${t}\x1b[0m`;
const bold = (t) => `\x1b[1m${t}\x1b[0m`;

let mongod;
let adminUser;
let studentUser;
let adminToken;
let studentToken;

async function setup() {
  console.log(cyan('\n--- Setting up Isolated In-Memory Test Database ---'));
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
  console.log('Connected to isolated test DB at:', uri);

  // Create test admin
  adminUser = await User.create({
    name: 'Test Administrator',
    username: 'dbu10101030',
    email: 'testadmin@dbu.edu.et',
    password: 'Password123#',
    role: 'admin',
    isAdmin: true,
    department: 'Software Engineering',
    year: '4th Year',
  });
  adminToken = generateToken(adminUser._id);

  // Create test regular student
  studentUser = await User.create({
    name: 'Test Student',
    username: 'dbu10304058',
    email: 'teststudent@dbu.edu.et',
    password: 'Password123#',
    role: 'student',
    isAdmin: false,
    department: 'Computer Science',
    year: '3rd Year',
  });
  studentToken = generateToken(studentUser._id);

  console.log('Test users initialized.\n');
}

async function teardown() {
  console.log(cyan('\n--- Tearing down Isolated Test Database ---'));
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
  console.log('Cleaned up test DB.\n');
}

// Simulate calling DELETE /api/clubs/:id through express app / supertest or route handler
const express = require('express');
const clubRoutes = require('../routes/clubs');
const app = express();
app.use(express.json());
app.use('/api/clubs', clubRoutes);
const request = require('supertest');

async function runAllTests() {
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ${green('✔ PASS:')} ${message}`);
      passed++;
    } else {
      console.error(`  ${red('✖ FAIL:')} ${message}`);
      failed++;
    }
  }

  try {
    await setup();
    await runMigrations({ silent: true });

    console.log(bold(cyan('TEST 1: Admin successfully deletes a club with full operational cleanup')));
    {
      const clubToDelete = await Club.create({
        name: 'Robotics Innovators Club',
        category: 'Technology',
        description: 'Building competitive battlebots and drones.',
        founded: '2024',
        status: 'active',
      });

      const res = await request(app)
        .delete(`/api/clubs/${clubToDelete._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      assert(res.status === 200, `Expected status 200, got ${res.status}`);
      assert(res.body.success === true, 'Response body has success: true');
      assert(res.body.deletedId === clubToDelete._id.toString(), 'Response body contains deletedId');

      const inDb = await Club.findById(clubToDelete._id);
      assert(inDb === null, 'Club document was completely removed from database');
    }

    console.log(bold(cyan('\nTEST 2: Unauthorized user cannot delete a club (no token / student role)')));
    {
      const protectedClub = await Club.create({
        name: 'Protected Aerospace Club',
        category: 'Technology',
        description: 'Flight simulation and aerodynamics.',
        founded: '2024',
        status: 'active',
      });

      // No token
      const resNoAuth = await request(app).delete(`/api/clubs/${protectedClub._id}`);
      assert(resNoAuth.status === 401, `No token returns 401 (got ${resNoAuth.status})`);

      // Student token
      const resStudent = await request(app)
        .delete(`/api/clubs/${protectedClub._id}`)
        .set('Authorization', `Bearer ${studentToken}`);
      assert(resStudent.status === 401 || resStudent.status === 403, `Student role returns 401/403 (got ${resStudent.status})`);

      const stillExists = await Club.findById(protectedClub._id);
      assert(stillExists !== null, 'Club was not deleted by unauthorized requests');
    }

    console.log(bold(cyan('\nTEST 3: Invalid club ID format is rejected with status 400')));
    {
      const res = await request(app)
        .delete('/api/clubs/invalid-id-format-123')
        .set('Authorization', `Bearer ${adminToken}`);

      assert(res.status === 400, `Invalid ID format returned 400 (got ${res.status})`);
      assert(res.body.success === false, 'Response has success: false');
      assert(res.body.message.includes('Invalid club ID'), 'Response message explains invalid ID format');
    }

    console.log(bold(cyan('\nTEST 4: Nonexistent club ID returns status 404')));
    {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .delete(`/api/clubs/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      assert(res.status === 404, `Nonexistent ID returned 404 (got ${res.status})`);
      assert(res.body.success === false, 'Response has success: false');
      assert(res.body.message === 'Club not found', 'Response message is "Club not found"');
    }

    console.log(bold(cyan('\nTEST 5: User membership references are cleaned up from joinedClubs')));
    {
      const targetClub = await Club.create({
        name: 'Hiking and Outdoor Club',
        category: 'Sports',
        description: 'Mountaineering and nature excursions.',
        founded: '2024',
        status: 'active',
      });
      const otherClub = await Club.create({
        name: 'Chess Grandmasters',
        category: 'Sports',
        description: 'Strategic chess competitions.',
        founded: '2024',
        status: 'active',
      });

      // Assign student to both clubs
      await User.findByIdAndUpdate(studentUser._id, {
        joinedClubs: [targetClub._id, otherClub._id],
      });

      // Delete targetClub
      const res = await request(app)
        .delete(`/api/clubs/${targetClub._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      assert(res.status === 200, 'Delete request succeeded');

      const updatedStudent = await User.findById(studentUser._id);
      const joinedIds = updatedStudent.joinedClubs.map((id) => id.toString());

      assert(!joinedIds.includes(targetClub._id.toString()), 'Deleted club removed from joinedClubs array');
      assert(joinedIds.includes(otherClub._id.toString()), 'Unrelated club remains in joinedClubs array');
    }

    console.log(bold(cyan('\nTEST 6: Club leader references (clubId) are cleaned up from User model')));
    {
      const leadershipClub = await Club.create({
        name: 'Photography Society',
        category: 'Arts',
        description: 'Visual arts and campus photojournalism.',
        founded: '2024',
        status: 'active',
      });

      const leaderUser = await User.create({
        name: 'Photo Leader',
        username: 'dbu10304099',
        email: 'photoleader@dbu.edu.et',
        password: 'Password123#',
        role: 'club_leader',
        clubId: leadershipClub._id,
      });

      assert(leaderUser.clubId.toString() === leadershipClub._id.toString(), 'Leader initially references clubId');

      const res = await request(app)
        .delete(`/api/clubs/${leadershipClub._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      assert(res.status === 200, 'Club deleted');

      const updatedLeader = await User.findById(leaderUser._id);
      assert(!updatedLeader.clubId, 'Leader clubId reference was cleanly unset');
    }

    console.log(bold(cyan('\nTEST 7: Other relevant models (Projects, Tasks, Announcements vs Ledger) handled correctly')));
    {
      const complexClub = await Club.create({
        name: 'Biomedical Club',
        category: 'Academic',
        description: 'Biotech and healthcare solutions.',
        founded: '2024',
        status: 'active',
      });
      const cId = complexClub._id;

      // Create operational records
      const project = await Project.create({
        title: 'Prosthetic Hand Project',
        description: '3D printing robotic prosthetics',
        clubId: cId,
        status: 'active',
        startDate: new Date(),
        createdBy: adminUser._id,
      });
      const task = await Task.create({
        title: 'Calibrate Servos',
        description: 'Configure motor pins',
        projectId: project._id,
        clubId: cId,
        assignedTo: studentUser._id,
        status: 'todo',
        createdBy: adminUser._id,
      });
      const announcement = await ClubAnnouncement.create({
        clubId: cId,
        title: 'Lab access hours',
        content: 'Open this Saturday',
        author: adminUser._id,
      });
      const report = await ActivityReport.create({
        club: cId,
        title: 'Monthly Progress Report',
        description: 'Finished motor test and prototype validation',
        date: new Date(),
        submittedBy: adminUser._id,
        academicYear: '2024',
        semester: 'Semester 1',
      });

      // Create historical audit records
      const transaction = await Transaction.create({
        title: 'Lab Component Purchase',
        amount: 5000,
        category: 'EXPENSE',
        referenceNumber: 'REF-BIO-9999',
        date: new Date(),
        clubId: cId,
        status: 'CONFIRMED',
      });
      const certificate = await Certificate.create({
        certificateNumber: 'DBU-SS-2026-999999',
        verificationCode: 'ABCD-EFGH-IJKL',
        studentId: studentUser._id.toString(),
        studentName: studentUser.name,
        clubId: cId.toString(),
        clubName: 'Biomedical Club',
        role: 'Active Member',
        issueDate: new Date(),
        verificationHash: 'dummy-verification-hash-12345',
      });

      // Delete the club
      const res = await request(app)
        .delete(`/api/clubs/${cId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      assert(res.status === 200, 'Complex club deleted successfully');

      // Verify operational records are removed
      const projectInDb = await Project.findById(project._id);
      const taskInDb = await Task.findById(task._id);
      const announcementInDb = await ClubAnnouncement.findById(announcement._id);
      const reportInDb = await ActivityReport.findById(report._id);

      assert(projectInDb === null, 'Associated Project was deleted');
      assert(taskInDb === null, 'Associated Task was deleted');
      assert(announcementInDb === null, 'Associated Announcement was deleted');
      assert(reportInDb === null, 'Associated ActivityReport was deleted');

      // Verify historical audit records are preserved
      const transInDb = await Transaction.findById(transaction._id);
      const certInDb = await Certificate.findById(certificate._id);

      assert(transInDb !== null, 'Financial Transaction record was preserved');
      assert(transInDb.clubId === null, 'Transaction clubId was decoupled');
      assert(certInDb !== null, 'Student Certificate was preserved');
      assert(certInDb.clubName === 'Biomedical Club', 'Certificate retained club name snapshot');
    }

    console.log(bold(cyan('\nTEST 8: Deleted clubs do not reappear after backend restart / migrations')));
    {
      // Run migrations initially to seed standard clubs
      await runMigrations({ silent: true });

      // Confirm 'Debate Society' exists
      const debateClub = await Club.findOne({ name: 'Debate Society' });
      assert(debateClub !== null, 'Debate Society was seeded by migration 002');

      // Admin deletes Debate Society
      const res = await request(app)
        .delete(`/api/clubs/${debateClub._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      assert(res.status === 200, 'Debate Society deleted by admin');
      const checkDeleted = await Club.findOne({ name: 'Debate Society' });
      assert(checkDeleted === null, 'Debate Society no longer exists in DB');

      // Simulate backend server reboot: run migrations again (as done on server startup)
      await runMigrations({ silent: true });

      // Verify Debate Society was NOT recreated!
      const afterReboot = await Club.findOne({ name: 'Debate Society' });
      assert(afterReboot === null, 'Debate Society did NOT reappear after server restart simulation');
    }

    console.log(bold(cyan('\nTEST 9: Deleted clubs do not reappear after multiple nodemon reload simulations')));
    {
      // Simulate 3 successive server reloads
      for (let i = 1; i <= 3; i++) {
        await runMigrations({ silent: true });
      }

      const debateAfterReloads = await Club.findOne({ name: 'Debate Society' });
      assert(debateAfterReloads === null, 'Deleted club remains permanently deleted across repeated reloads');
    }

    console.log(bold(cyan('\nTEST 10: Deleted clubs do not appear in GET /api/clubs endpoint')));
    {
      const res = await request(app).get('/api/clubs');
      assert(res.status === 200, 'GET /api/clubs returns 200');

      const clubsList = res.body.clubs || [];
      const foundDebate = clubsList.find((c) => c.name === 'Debate Society');
      assert(!foundDebate, 'Deleted club is not present in public clubs API listing');

      // Verify returned objects have both id and _id
      if (clubsList.length > 0) {
        assert(clubsList[0].id !== undefined, 'Club object has id property');
        assert(clubsList[0]._id !== undefined, 'Club object has _id property');
      }
    }

    console.log(bold(cyan('\nTEST 11: Running migration command again does not recreate deleted clubs or duplicate entries')));
    {
      const statusBefore = await getMigrationStatus();
      const allAppliedBefore = statusBefore.every((m) => m.applied);
      assert(allAppliedBefore, 'All registered migrations are marked as applied in registry');

      const clubsCountBefore = await Club.countDocuments();
      const newlyApplied = await runMigrations({ silent: true });

      assert(newlyApplied.length === 0, 'Migration runner applied 0 new migrations (idempotent)');

      const clubsCountAfter = await Club.countDocuments();
      assert(clubsCountBefore === clubsCountAfter, 'Club count unchanged after re-running migrations');
    }

    console.log(bold(cyan('\nTEST 12: Existing clubs and unrelated data remain completely intact')));
    {
      // Core clubs that weren't deleted should still exist
      const bookingClub = await Club.findOne({ name: 'Booking Club' });
      const ideaHub = await Club.findOne({ name: 'Idea Hub' });

      assert(bookingClub !== null, 'Booking Club remains intact');
      assert(ideaHub !== null, 'Idea Hub remains intact');

      // Users still exist
      const adminInDb = await User.findOne({ username: 'dbu10101030' });
      const studentInDb = await User.findOne({ username: 'dbu10304058' });

      assert(adminInDb !== null, 'Admin user remains intact');
      assert(studentInDb !== null, 'Student user remains intact');
    }

    console.log('\n------------------------------------------------------------');
    console.log(`TOTAL TESTS: ${passed + failed} | ${green(`PASSED: ${passed}`)} | ${failed > 0 ? red(`FAILED: ${failed}`) : 'FAILED: 0'}`);
    console.log('------------------------------------------------------------\n');

    await teardown();

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Fatal test error:', err);
    await teardown();
    process.exit(1);
  }
}

runAllTests();
