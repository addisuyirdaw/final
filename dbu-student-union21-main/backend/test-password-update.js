/**
 * Test Password Update & Authentication Hash Flow
 *
 * @format
 */

require("dotenv").config();
const http = require("http");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const port = process.env.PORT || 5000;

function httpRequest(options, postData = null) {
	return new Promise((resolve, reject) => {
		const req = http.request(options, (res) => {
			let data = "";
			res.on("data", (chunk) => (data += chunk));
			res.on("end", () => {
				resolve({
					statusCode: res.statusCode,
					headers: res.headers,
					body: data,
				});
			});
		});
		req.on("error", reject);
		if (postData) req.write(postData);
		req.end();
	});
}

async function login(username, password) {
	const payload = JSON.stringify({ username, password });
	const res = await httpRequest(
		{
			hostname: "localhost",
			port: port,
			path: "/api/auth/login",
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"Content-Length": Buffer.byteLength(payload),
			},
		},
		payload
	);
	return {
		statusCode: res.statusCode,
		data: JSON.parse(res.body),
	};
}

async function changePasswordAuth(token, currentPassword, newPassword) {
	const payload = JSON.stringify({ currentPassword, newPassword });
	const res = await httpRequest(
		{
			hostname: "localhost",
			port: port,
			path: "/api/auth/change-password",
			method: "PUT",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
				"Content-Length": Buffer.byteLength(payload),
			},
		},
		payload
	);
	return {
		statusCode: res.statusCode,
		data: JSON.parse(res.body),
	};
}

async function updatePasswordUsers(token, currentPassword, newPassword) {
	const payload = JSON.stringify({ currentPassword, newPassword });
	const res = await httpRequest(
		{
			hostname: "localhost",
			port: port,
			path: "/api/users/update-password",
			method: "PUT",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
				"Content-Length": Buffer.byteLength(payload),
			},
		},
		payload
	);
	return {
		statusCode: res.statusCode,
		data: JSON.parse(res.body),
	};
}

async function runTest() {
	console.log("==================================================");
	console.log("🧪 TESTING PASSWORD UPDATE & HASHING VERIFICATION");
	console.log("==================================================");

	const testUser = "dbu10304058";
	const initialPassword = "Student123#";
	const newPassword1 = "NewSecretPass456#";
	const newPassword2 = "Student123#"; // reset back

	try {
		// Connect DB to directly verify the hash stored in MongoDB
		await mongoose.connect(process.env.MONGODB_URI);
		const User = require("./models/User");

		// Ensure user has clean state with initial password
		let userDoc = await User.findOne({ username: testUser }).select("+password");
		if (!userDoc) {
			console.log(`Creating test user ${testUser}...`);
			userDoc = await User.create({
				name: "Test Student",
				username: testUser,
				email: "test_student_dbu@gmail.com",
				password: initialPassword,
				department: "Computer Science",
				year: "3rd Year",
				role: "student",
				isActive: true,
			});
		} else {
			userDoc.password = initialPassword;
			userDoc.isLocked = false;
			userDoc.loginAttempts = 0;
			await userDoc.save();
		}

		console.log("\n1️⃣ Step 1: Login with initial password...");
		const login1 = await login(testUser, initialPassword);
		console.log(`   Status code: ${login1.statusCode}`);
		if (login1.statusCode !== 200 || !login1.data.token) {
			throw new Error("Initial login failed: " + JSON.stringify(login1.data));
		}
		console.log("   ✅ Initial login succeeded!");
		const token1 = login1.data.token;

		console.log("\n2️⃣ Step 2: Change password via PUT /api/auth/change-password...");
		console.log(`   Current: ${initialPassword} -> New: ${newPassword1}`);
		const changeRes = await changePasswordAuth(token1, initialPassword, newPassword1);
		console.log(`   Status code: ${changeRes.statusCode}`);
		console.log(`   Response:`, changeRes.data);
		if (changeRes.statusCode !== 200 || !changeRes.data.success) {
			throw new Error("Password change failed: " + JSON.stringify(changeRes.data));
		}
		console.log("   ✅ Password change request succeeded!");

		console.log("\n3️⃣ Step 3: Inspect database document hash...");
		const updatedUser = await User.findOne({ username: testUser }).select("+password");
		console.log(`   Stored hash prefix: ${updatedUser.password.substring(0, 10)}... (length: ${updatedUser.password.length})`);
		const isValidBcrypt = /^\$2[abyx]?\$\d{1,2}\$[./A-Za-z0-9]{53}$/.test(updatedUser.password);
		console.log(`   Is valid bcrypt hash: ${isValidBcrypt}`);
		const directMatch = await bcrypt.compare(newPassword1, updatedUser.password);
		console.log(`   Direct bcrypt.compare with new password: ${directMatch}`);
		if (!directMatch) {
			throw new Error("CRITICAL: Password hash does not match new password (possible double-hashing)");
		}
		console.log("   ✅ Database hash verified! No double-hashing detected.");

		console.log("\n4️⃣ Step 4: Verify OLD password login fails (401)...");
		const oldLogin = await login(testUser, initialPassword);
		console.log(`   Status code with OLD password: ${oldLogin.statusCode} (Expected: 401)`);
		console.log(`   Message: ${oldLogin.data.message}`);
		if (oldLogin.statusCode !== 401) {
			throw new Error(`Expected 401 but got ${oldLogin.statusCode}`);
		}
		console.log("   ✅ Old password was properly rejected!");

		console.log("\n5️⃣ Step 5: Verify NEW password login succeeds (200)...");
		const newLogin = await login(testUser, newPassword1);
		console.log(`   Status code with NEW password: ${newLogin.statusCode} (Expected: 200)`);
		if (newLogin.statusCode !== 200 || !newLogin.data.token) {
			throw new Error("Login with new password failed: " + JSON.stringify(newLogin.data));
		}
		console.log("   ✅ New password login succeeded with 200 OK!");
		console.log(`   User: ${newLogin.data.user.username} (${newLogin.data.user.name})`);

		console.log("\n6️⃣ Step 6: Test PUT /api/users/update-password endpoint...");
		const updateRes = await updatePasswordUsers(newLogin.data.token, newPassword1, newPassword2);
		console.log(`   Status code: ${updateRes.statusCode}`);
		console.log(`   Response:`, updateRes.data);
		if (updateRes.statusCode !== 200) {
			throw new Error("Update password via users route failed: " + JSON.stringify(updateRes.data));
		}
		console.log("   ✅ Password successfully updated back via /api/users/update-password!");

		console.log("\n7️⃣ Step 7: Verify login with restored password (Student123#)...");
		const finalLogin = await login(testUser, newPassword2);
		console.log(`   Status code: ${finalLogin.statusCode}`);
		if (finalLogin.statusCode !== 200) {
			throw new Error("Final login failed: " + JSON.stringify(finalLogin.data));
		}
		console.log("   ✅ Login with restored password verified!");

		console.log("\n==================================================");
		console.log("🎉 ALL PASSWORD HASH & AUTH TESTS PASSED!");
		console.log("==================================================");
		process.exit(0);
	} catch (err) {
		console.error("\n❌ TEST FAILED:", err);
		process.exit(1);
	}
}

runTest();
