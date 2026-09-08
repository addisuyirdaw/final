/** @format */

const User = require("../models/User");
const bcrypt = require("bcryptjs");

const createDefaultAdmin = async () => {
  try {
    const additionalAdmins = [
      {
        name: "System Administrator",
        username: "dbu10101030",
        email: "admin@dbu.edu.et",
        password: "Admin123#",
        role: "admin",
        isAdmin: true,
        department: "Administration",
        year: "1st Year",
      },
      {
        name: "President Admin",
        username: "dbu10101020",
        email: "president@dbu.edu.et",
        password: "Admin123#",
        role: "president",
        isAdmin: true,
        department: "Student Affairs",
        year: "1st Year",
      },
      {
        name: "Demo Admin",
        username: "dbu10101011",
        email: "demoadmin@dbu.edu.et",
        password: "Admin123#",
        role: "admin",
        isAdmin: true,
        department: "Administration",
        year: "1st Year",
      },
      {
        name: "Clubs Admin",
        username: "dbu10101040",
        email: "clubs@dbu.edu.et",
        password: "Admin123#",
        role: "admin",
        isAdmin: true,
        department: "Student Activities",
        year: "1st Year",
      },
    ];

    for (const adminData of additionalAdmins) {
      const existingAdmin = await User.findOne({ username: adminData.username });

      if (!existingAdmin) {
        // Brand-new record — set the default password
        const hashedPassword = await bcrypt.hash(adminData.password, 12);
        await User.create({ ...adminData, password: hashedPassword });
        console.log(`✅ Admin created: ${adminData.username}`);
      } else {
        // Existing record — update privilege/profile fields ONLY.
        // ⚠️  Password is intentionally excluded so user-set passwords
        //     survive server restarts (password field has select:false so
        //     checking existingAdmin.password is always undefined — never
        //     use that pattern for password guards).
        await User.findOneAndUpdate(
          { username: adminData.username },
          {
            isAdmin: true,
            role: adminData.role,
            isActive: true,
            name: adminData.name,
            email: adminData.email,
            department: adminData.department,
            year: adminData.year,
          }
        );
        console.log(`✅ Admin verified: ${adminData.username} (password preserved)`);
      }
    }

    const sampleStudents = [
      {
        name: "John Doe",
        username: "dbu10304058",
        email: "john.doe@dbu.edu.et",
        password: "Student123#",
        role: "student",
        isAdmin: false,
        department: "Computer Science",
        year: "4th Year",
      },
      {
        name: "Jane Smith",
        username: "dbu10304059",
        email: "jane.smith@dbu.edu.et",
        password: "Student123#",
        role: "student",
        isAdmin: false,
        department: "Engineering",
        year: "3rd Year",
      },
    ];

    for (const studentData of sampleStudents) {
      const existingStudent = await User.findOne({ username: studentData.username });

      if (!existingStudent) {
        const hashedPassword = await bcrypt.hash(studentData.password, 12);
        await User.create({ ...studentData, password: hashedPassword });
        console.log(`✅ Sample student created: ${studentData.username}`);
      } else {
        // ⚠️  Password intentionally excluded — same reason as admins above
        await User.findOneAndUpdate(
          { username: studentData.username },
          { isActive: true, role: "student", isAdmin: false }
        );
        console.log(`✅ Student verified: ${studentData.username} (password preserved)`);
      }
    }
  } catch (error) {
    console.error("❌ Error creating default users:", error.message);
  }
};

module.exports = { createDefaultAdmin };