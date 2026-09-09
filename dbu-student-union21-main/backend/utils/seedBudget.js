/** @format */
const Transaction = require('../models/Transaction');
const MicroGrant = require('../models/MicroGrant');
const University = require('../models/University');
const Club = require('../models/Club');
const User = require('../models/User');

const seedBudget = async () => {
  try {
    const existingCount = await Transaction.countDocuments();
    if (existingCount > 0) {
      return; // Idempotent — skip if transactions already exist
    }

    // Lookups
    const dbu = await University.findOne({ code: 'DBU' });
    const aau = await University.findOne({ code: 'AAU' });
    const bdu = await University.findOne({ code: 'BDU' });
    const studentUser = await User.findOne({ role: 'student' });
    const sampleClub = await Club.findOne();

    const dbuId = dbu?._id || null;
    const aauId = aau?._id || null;
    const bduId = bdu?._id || null;
    const clubId = sampleClub?._id || null;
    const applicantId = studentUser?._id || null;

    console.log('🌱 Seeding initial financial transparency ledger & micro-grants...');

    const sampleTransactions = [
      {
        title: 'Federal Inter-University Student Innovation Grant Allocation',
        category: 'ALLOCATION',
        amount: 500000,
        universityId: dbuId,
        referenceNumber: 'REF-FED-2026-001',
        description: 'Federal Ministry of Education fund earmarked for Ethiopian student union technology and innovation projects.',
        date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        status: 'CONFIRMED',
      },
      {
        title: 'DBU Student Union Annual Co-Curricular Operating Budget',
        category: 'ALLOCATION',
        amount: 250000,
        universityId: dbuId,
        referenceNumber: 'REF-DBU-2026-002',
        description: 'Approved annual university institutional allocation for recognized student clubs and campus events.',
        date: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
        status: 'CONFIRMED',
      },
      {
        title: 'Alumni Tech Endowment for Inter-University STEM Clubs',
        category: 'DONATION',
        amount: 85000,
        universityId: dbuId,
        referenceNumber: 'REF-ALM-2026-003',
        description: 'Direct philanthropic endowment contributed by DBU diaspora engineering alumni.',
        date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
        status: 'CONFIRMED',
      },
      {
        title: 'Auditorium & Sound Equipment Rental for Multi-Campus Symposium',
        category: 'EXPENSE',
        amount: 28500,
        universityId: dbuId,
        clubId: clubId,
        referenceNumber: 'REF-EXP-2026-004',
        description: 'Main hall acoustic stage setup and technician fees for the inter-campus leadership summit.',
        date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        status: 'CONFIRMED',
      },
      {
        title: 'Micro-Grant Disbursement: Solar-Powered IoT Weather Station Prototype',
        category: 'GRANT_DISBURSEMENT',
        amount: 16500,
        universityId: dbuId,
        clubId: clubId,
        referenceNumber: 'REF-GRT-2026-005',
        description: 'Direct grant payout to student engineering research team for solar sensors and micro-controllers.',
        date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        status: 'CONFIRMED',
      },
      {
        title: 'Inter-University Hackathon Transport & Delegate Lodging',
        category: 'EXPENSE',
        amount: 45000,
        universityId: aauId || dbuId,
        referenceNumber: 'REF-EXP-2026-006',
        description: 'Chartered bus transit and university guest house accommodations for 40 student delegates.',
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        status: 'CONFIRMED',
      },
    ];

    for (const t of sampleTransactions) {
      await Transaction.create(t);
    }
    console.log(`✅ [Seed] ${sampleTransactions.length} budget ledger transactions created.`);

    // Seed Micro-Grants if applicant exists
    if (applicantId && dbuId) {
      const sampleGrants = [
        {
          title: 'Low-Cost Braille Tablet Display for Visually Impaired Students',
          applicantId,
          clubId,
          universityId: dbuId,
          amountRequested: 25000,
          amountApproved: 25000,
          purpose: 'Constructing an affordable 3D-printed refreshable braille reading device using solenoid actuators for accessibility on campus.',
          status: 'DISBURSED',
          category: 'TECHNOLOGY_INNOVATION',
          reviewNotes: 'Fully approved by DBU Student Union Technology Committee. Excellent social impact.',
          timelineMonths: 3,
        },
        {
          title: 'Campus Organic Waste Biogas Digester Installation',
          applicantId,
          clubId,
          universityId: dbuId,
          amountRequested: 18500,
          amountApproved: 18500,
          purpose: 'Transforming cafeteria organic food waste into clean renewable cooking fuel for university student kitchens.',
          status: 'UNDER_REVIEW',
          category: 'ENVIRONMENTAL',
          reviewNotes: 'Environmental safety evaluation in progress with faculty advisor.',
          timelineMonths: 4,
        },
        {
          title: 'Automated Campus Library Inventory Drone Scanner',
          applicantId,
          clubId,
          universityId: aauId || dbuId,
          amountRequested: 32000,
          amountApproved: 0,
          purpose: 'Developing an indoor micro-drone that reads RFID tags on book spines after hours to automate missing book cataloging.',
          status: 'PENDING',
          category: 'TECHNOLOGY_INNOVATION',
          timelineMonths: 5,
        },
        {
          title: 'Multi-Campus Student Mental Health Awareness & Peer Counseling Tour',
          applicantId,
          clubId,
          universityId: bduId || dbuId,
          amountRequested: 12000,
          amountApproved: 12000,
          purpose: 'Conducting peer counseling circles, stress management workshops, and free anonymous guidance booklets for freshman students.',
          status: 'APPROVED',
          category: 'COMMUNITY_OUTREACH',
          reviewNotes: 'Approved for upcoming midterm stress-relief week.',
          timelineMonths: 2,
        },
      ];

      for (const g of sampleGrants) {
        await MicroGrant.create(g);
      }
      console.log(`✅ [Seed] ${sampleGrants.length} micro-grant applications created.`);
    }
  } catch (err) {
    console.error('❌ [Seed] Budget seed error:', err.message);
  }
};

module.exports = { seedBudget };
