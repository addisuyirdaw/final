const mongoose = require("mongoose");
require("dotenv").config();
const Staff = require("./models/Staff");

const staffMembers = [
  // University Executives
  {
    name: "Asmare Malese Trunhe (PhD)",
    title: "University President",
    pageGroup: "university_exec",
    department: "President's Office",
    background: "Distinguished academician and senior research scholar who has published numerous international works in institutional leadership and educational reform. Appointed as the President of Debre Berhan University to steer its academic excellence and strategic growth.",
    responsibility: "Serves as the chief executive officer of the university. Formulates strategic visions, oversees all academic departments, represents the university in international assemblies, and directs major institutional development programs.",
    imageUrl: "/image.png/dr  asmare.png",
    order: 1,
    isActive: true
  },
  // Student Services
  {
    name: "Ato Gizew Fetene",
    title: "Dean of Student Affairs",
    pageGroup: "student_services",
    department: "Office of the Dean",
    background: "DBU graduate and long-serving student affairs leader with a strong focus on student wellbeing, inclusion, and campus service quality.",
    responsibility: "Oversees student welfare, guidance coordination, club development, complaint response systems, and branch-level service performance across the university.",
    imageUrl: "/image.png/gizeww.jpg",
    order: 1,
    isActive: true
  },
  {
    name: "Asst. Prof. Sintayehu Ambachew Worku",
    title: "Assistant Professor in Educational Psychology",
    pageGroup: "student_services",
    department: "Psychology & Guidance Department",
    background: "Senior guidance professional focused on student mental wellness, academic psychology, and counseling. Provides confidential advisory services from the 3rd Floor Bureau.",
    responsibility: "Provides counseling, crisis intervention, student advisory services, stress management, academic pressure relief, and conflict mediation.",
    imageUrl: "/image.png/pr sintayew.jpg",
    order: 2,
    isActive: true
  },
  {
    name: "Mrs. Kalkidan Desta",
    title: "Vice Dean for Character and Ethics Development",
    pageGroup: "student_services",
    department: "Psychology & Guidance Department",
    background: "Distinguished administrator dedicated to character building, ethical leadership, and student integration across the campus.",
    responsibility: "Manages student ethical development, leadership training programs, character-building workshops, and administrative support for the Guidance department.",
    imageUrl: "/image.png/kalkidan.jpg",
    order: 3,
    isActive: true
  },
  // Student Union
  {
    name: "Kirkos Ashebir",
    title: "Student Union President",
    pageGroup: "student_union",
    department: "Executive Committee",
    background: "Elected student leader advocating for academic excellence and campus inclusion. Committed to representing every student's voice across all university bodies.",
    responsibility: "Represents the student body in senate meetings, leads union assemblies, and coordinates activities across all student union committees.",
    imageUrl: "/uploads/leadership/placeholder.png",
    order: 1,
    isActive: true
  },
  {
    name: "Kalkidan Tsegaye",
    title: "Secretary",
    pageGroup: "student_union",
    department: "Executive Committee",
    background: "Dedicated community organizer focused on student services and support systems. Manages all formal union documentation and communications.",
    responsibility: "Manages union documentation, takes assembly minutes, handles external communications, and maintains the student union calendar.",
    imageUrl: "/uploads/leadership/placeholder.png",
    order: 2,
    isActive: true
  },
  {
    name: "Addisu Yirdaw",
    title: "Clubs & Associations Coordinator",
    pageGroup: "student_union",
    department: "Clubs & Associations Committee",
    background: "Detail-oriented student administrator managing all club coordination, inter-club communication, and student association activities on campus.",
    responsibility: "Coordinates all registered student clubs and associations, facilitates inter-club events, and liaises between clubs and the student union executive.",
    imageUrl: "/uploads/leadership/placeholder.png",
    order: 3,
    isActive: true
  },
  {
    name: "Eyasu",
    title: "Student Union Vice President",
    pageGroup: "student_union",
    department: "Executive Committee",
    background: "Elected student leader working in coordination with the President to support student affairs and academic inclusion.",
    responsibility: "Supports the President in running student union operations, oversees project implementation, and represents students in university committees.",
    imageUrl: "/uploads/leadership/placeholder.png",
    order: 4,
    isActive: true
  },
  // Dormitory
  {
    name: "Genete Fetene",
    title: "Head of Dormitory Services",
    pageGroup: "dormitory",
    department: "Housing & Accommodation Services",
    background: "Experienced administrator with a track record of handling massive student populations and residential logistics.",
    responsibility: "Directs all housing registration, room allocations, student housing administration, and leads the dormitory staff team.",
    imageUrl: "/images/genete.png",
    order: 1,
    isActive: true
  }
];

const seedStaff = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is not defined in environment variables");
    }

    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB for seeding...");

    // Delete any existing staff to prevent duplicates
    await Staff.deleteMany({});
    console.log("Cleared existing staff profiles.");

    // Insert staff members
    const result = await Staff.insertMany(staffMembers);
    console.log(`Successfully seeded ${result.length} staff profiles.`);

    process.exit(0);
  } catch (error) {
    console.error("Error seeding staff:", error);
    process.exit(1);
  }
};

seedStaff();
