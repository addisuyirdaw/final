/** @format */

const mongoose = require("mongoose");
require("dotenv").config();
const User = require("./models/User");

const users = [
	{
		name: "System Admin",
		username: "dbu10101030",
		password: "Admin123#",
		role: "system_admin",
		department: "Computer Science",
		year: "4th Year",
		isAdmin: true,
	},
	{
		name: "President Admin",
		username: "dbu10101020",
		password: "Admin123#",
		role: "president",
		department: "Software Engineering",
		year: "4th Year",
		isAdmin: true,
	},
	{
		name: "Club Admin",
		username: "dbu10101040",
		password: "Admin123#",
		role: "clubs_coordinator",
		department: "Information Technology",
		year: "3rd Year",
		isAdmin: true,
	},
	{
		name: "Default Student",
		username: "dbu10178849",
		password: "Student123#",
		role: "student",
		department: "Computer Science",
		year: "2nd Year",
		isAdmin: false,
	},
];

const seedUsers = async () => {
	try {
		await mongoose.connect(process.env.MONGODB_URI, {
			useNewUrlParser: true,
			useUnifiedTopology: true,
		});
		console.log("Connected to MongoDB...");

		for (const userData of users) {
			const userExists = await User.findOne({ username: userData.username });
			if (userExists) {
				console.log(`User ${userData.username} already exists, updating...`);
				userExists.password = userData.password;
				userExists.role = userData.role;
				userExists.name = userData.name;
				userExists.department = userData.department;
				userExists.year = userData.year;
				userExists.isAdmin = userData.isAdmin;
				await userExists.save();
			} else {
				console.log(`Creating user ${userData.username}...`);
				await User.create(userData);
			}
		}

		console.log("Seeding completed successfully!");
		process.exit(0);
	} catch (error) {
		console.error("Error seeding users:", error);
		process.exit(1);
	}
};

seedUsers();
