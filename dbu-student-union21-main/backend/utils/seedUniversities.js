/** @format */
const University = require('../models/University');
const CrossCampusClub = require('../models/CrossCampusClub');

const ETHIOPIAN_UNIVERSITIES = [
  {
    name: 'Debre Berhan University',
    code: 'DBU',
    location: 'Debre Berhan, Amhara',
    region: 'Amhara',
    website: 'https://www.dbu.edu.et',
    logoColor: '#0284c7',
    studentCount: 35000,
    established: 2007,
    description: 'One of the rapidly growing universities in the Amhara region of Ethiopia, known for engineering and natural sciences.',
  },
  {
    name: 'Addis Ababa University',
    code: 'AAU',
    location: 'Addis Ababa',
    region: 'Addis Ababa',
    website: 'https://www.aau.edu.et',
    logoColor: '#7c3aed',
    studentCount: 60000,
    established: 1950,
    description: 'The oldest and largest university in Ethiopia, a premier research and teaching institution.',
  },
  {
    name: 'Bahir Dar University',
    code: 'BDU',
    location: 'Bahir Dar, Amhara',
    region: 'Amhara',
    website: 'https://www.bdu.edu.et',
    logoColor: '#059669',
    studentCount: 45000,
    established: 1963,
    description: 'Located on the shore of Lake Tana, known for its polytechnic and teacher education programs.',
  },
  {
    name: 'Jimma University',
    code: 'JU',
    location: 'Jimma, Oromia',
    region: 'Oromia',
    website: 'https://www.ju.edu.et',
    logoColor: '#d97706',
    studentCount: 40000,
    established: 1999,
    description: 'A comprehensive university known for its health sciences, agriculture, and natural resources programs.',
  },
  {
    name: 'Hawassa University',
    code: 'HU',
    location: 'Hawassa, SNNPR',
    region: 'SNNPR',
    website: 'https://www.hu.edu.et',
    logoColor: '#dc2626',
    studentCount: 38000,
    established: 1999,
    description: 'Known for agriculture, natural resources, and health sciences faculties.',
  },
  {
    name: 'Mekelle University',
    code: 'MU',
    location: 'Mekelle, Tigray',
    region: 'Tigray',
    website: 'https://www.mu.edu.et',
    logoColor: '#0891b2',
    studentCount: 36000,
    established: 1991,
    description: 'The major university in Tigray region, offering programs in engineering, medicine, and natural sciences.',
  },
  {
    name: 'Wolkite University',
    code: 'WU',
    location: 'Wolkite, SNNPR',
    region: 'SNNPR',
    website: 'https://www.wku.edu.et',
    logoColor: '#be185d',
    studentCount: 18000,
    established: 2011,
    description: 'A growing university in southern Ethiopia focusing on applied sciences and engineering.',
  },
  {
    name: 'Adama Science and Technology University',
    code: 'ASTU',
    location: 'Adama, Oromia',
    region: 'Oromia',
    website: 'https://www.adama.edu.et',
    logoColor: '#4f46e5',
    studentCount: 30000,
    established: 1993,
    description: 'Specialising in science and technology, one of Ethiopia\'s leading technical universities.',
  },
];

const SAMPLE_CROSS_CAMPUS_CLUBS = [
  { name: 'AAU Robotics Club', category: 'Technology', universityCode: 'AAU', memberCount: 120, description: 'Building autonomous robots and AI systems. Winners of the 2023 East African Robotics Championship.', founded: '2015', isVerified: true },
  { name: 'AAU Debate Society', category: 'Academic', universityCode: 'AAU', memberCount: 85, description: 'Competing in national and international debate tournaments representing Ethiopia.', founded: '2010', isVerified: true },
  { name: 'BDU Environmental Club', category: 'Service', universityCode: 'BDU', memberCount: 200, description: 'Protecting Lake Tana\'s ecosystem through community-led conservation efforts.', founded: '2012', isVerified: true },
  { name: 'JU Medical Students Association', category: 'Professional', universityCode: 'JU', memberCount: 340, description: 'Connecting future healthcare professionals across Ethiopia for research collaboration.', founded: '2005', isVerified: true },
  { name: 'HU Agricultural Innovation Club', category: 'Academic', universityCode: 'HU', memberCount: 95, description: 'Developing sustainable farming technologies for Ethiopian smallholders.', founded: '2018', isVerified: false },
  { name: 'MU Cultural Arts Ensemble', category: 'Cultural', universityCode: 'MU', memberCount: 60, description: 'Preserving and performing Tigrinya traditional music and dance.', founded: '2014', isVerified: true },
  { name: 'ASTU Tech Innovators', category: 'Technology', universityCode: 'ASTU', memberCount: 150, description: 'Hackathons, startup incubation, and tech community building across Ethiopian universities.', founded: '2016', isVerified: true },
  { name: 'WU Entrepreneurship Club', category: 'Professional', universityCode: 'WU', memberCount: 75, description: 'Supporting student entrepreneurs with mentorship, pitch events, and networking.', founded: '2019', isVerified: false },
];

const seedUniversities = async () => {
  try {
    for (const uniData of ETHIOPIAN_UNIVERSITIES) {
      const existing = await University.findOne({ code: uniData.code });
      if (!existing) {
        await University.create(uniData);
        console.log(`✅ [Seed] University created: ${uniData.code} — ${uniData.name}`);
      }
    }

    for (const clubData of SAMPLE_CROSS_CAMPUS_CLUBS) {
      const existing = await CrossCampusClub.findOne({
        name: clubData.name,
        universityCode: clubData.universityCode,
      });
      if (!existing) {
        await CrossCampusClub.create(clubData);
        console.log(`✅ [Seed] CrossCampusClub created: ${clubData.name} (${clubData.universityCode})`);
      }
    }
  } catch (err) {
    console.error('❌ [Seed] University/CrossCampusClub seed error:', err.message);
  }
};

module.exports = { seedUniversities };
