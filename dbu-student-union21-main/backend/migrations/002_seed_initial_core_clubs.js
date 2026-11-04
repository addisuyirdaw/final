/**
 * Migration 002: Seed Initial Core Clubs
 * Seeds standard university clubs on initial system setup.
 * Once executed, this migration is recorded and will NEVER recreate clubs
 * that an administrator intentionally deleted.
 */
const Club = require('../models/Club');
const User = require('../models/User');

const INITIAL_CORE_CLUBS = [
  {
    name: "Booking Club",
    category: "Academic",
    description: "Official Booking Club dedicated to campus resources and reservation management.",
    founded: "2023",
    status: "active"
  },
  {
    name: "Mechanical Club",
    category: "Technology",
    description: "Mechanical Engineering student club for hands-on innovation and prototyping.",
    founded: "2022",
    status: "active"
  },
  {
    name: "Civil Engineering Club",
    category: "Technology",
    description: "Civil Engineering student society fostering architectural and structural projects.",
    founded: "2022",
    status: "active"
  },
  {
    name: "Idea Hub",
    category: "Technology",
    description: "DBU Idea Hub fostering startup incubations and technology entrepreneurship.",
    founded: "2021",
    status: "active"
  },
  {
    name: "Career Development Club",
    category: "Professional",
    description: "Empowering students with career counseling, CV preparation, and internship links.",
    founded: "2023",
    status: "active"
  },
  {
    name: "Law Association Club",
    category: "Academic",
    description: "Law students association facilitating legal aid workshops and moot court sessions.",
    founded: "2020",
    status: "active"
  },
  {
    name: "Truth Culture Club",
    category: "Cultural",
    description: "Fostering cultural diversity, arts, music, and campus community dialogue.",
    founded: "2021",
    status: "active"
  },
  {
    name: "Debate Society",
    category: "Academic",
    description: "Developing critical thinking and public speaking skills through competitive debates.",
    founded: "2015",
    status: "active"
  },
  {
    name: "Technology and Innovation Club",
    category: "Technology",
    description: "Software development, robotics, AI, hackathons, and tech innovation projects.",
    founded: "2018",
    status: "active"
  },
  {
    name: "Charity and Community Service Club",
    category: "Service",
    description: "Community outreach, blood donation, tutoring local high-schoolers, and social impact projects.",
    founded: "2019",
    status: "active"
  }
];

module.exports = {
  name: '002_seed_initial_core_clubs',
  description: 'Seeds initial 10 core student union clubs on first-time setup',
  async up() {
    console.log('Running migration: 002_seed_initial_core_clubs...');
    const adminUser = (await User.findOne({ username: 'dbu10101040' })) || (await User.findOne({ isAdmin: true }));

    let createdCount = 0;
    for (const c of INITIAL_CORE_CLUBS) {
      const existing = await Club.findOne({ name: c.name });
      if (!existing) {
        await Club.create({
          ...c,
          contactEmail: `${c.name.toLowerCase().replace(/[^a-z0-9]/g, '')}@dbu.edu.et`,
          meetingSchedule: "Weekly on Fridays at 4:00 PM",
          requirements: "Open to all registered DBU students",
          leadership: {
            president: adminUser?._id,
            vicePresident: adminUser?._id,
            secretary: adminUser?._id,
            treasurer: adminUser?._id
          },
          members: adminUser ? [{
            user: adminUser._id,
            fullName: adminUser.name || "Club Representative",
            department: adminUser.department || "Information Technology",
            year: adminUser.year || "3rd Year",
            role: "president",
            status: "approved",
            joinedAt: new Date()
          }] : []
        });
        createdCount++;
      }
    }

    return { createdCount, totalPlanned: INITIAL_CORE_CLUBS.length };
  },
};

