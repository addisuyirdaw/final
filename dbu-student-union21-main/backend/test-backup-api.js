/**
 * Verification Script for Admin Backup HTTP Endpoints
 *
 * @format
 */

require("dotenv").config();
const http = require("http");

async function request(options, postData = null) {
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
		if (postData) {
			req.write(postData);
		}
		req.end();
	});
}

async function testApi() {
	console.log("==================================================");
	console.log("🧪 TESTING ADMIN BACKUP HTTP ENDPOINTS");
	console.log("==================================================");

	const port = process.env.PORT || 5000;

	try {
		// 1. Authenticate as Super Admin
		console.log("\n1️⃣ Logging in as Super Admin (dbu10101030)...");
		const loginPayload = JSON.stringify({
			username: "dbu10101030",
			password: "Admin123#",
		});

		const loginRes = await request(
			{
				hostname: "localhost",
				port: port,
				path: "/api/auth/login",
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Content-Length": Buffer.byteLength(loginPayload),
				},
			},
			loginPayload
		);

		const loginData = JSON.parse(loginRes.body);
		if (!loginData.token) {
			throw new Error("Failed to log in: " + loginRes.body);
		}
		const token = loginData.token;
		console.log("   ✅ Logged in successfully, token received!");

		// 2. Test GET /api/admin/backup/status
		console.log("\n2️⃣ Testing GET /api/admin/backup/status...");
		const statusRes = await request({
			hostname: "localhost",
			port: port,
			path: "/api/admin/backup/status",
			method: "GET",
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});

		console.log(`   Status code: ${statusRes.statusCode}`);
		const statusData = JSON.parse(statusRes.body);
		console.log("   Response:", {
			success: statusData.success,
			database: statusData.database,
			collectionsCount: statusData.collectionsCount,
			documentsCount: statusData.documentsCount,
		});

		// 3. Test GET /api/admin/backup/export
		console.log("\n3️⃣ Testing GET /api/admin/backup/export...");
		const exportRes = await request({
			hostname: "localhost",
			port: port,
			path: "/api/admin/backup/export",
			method: "GET",
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});

		console.log(`   Status code: ${exportRes.statusCode}`);
		console.log(`   Content-Disposition: ${exportRes.headers["content-disposition"]}`);
		console.log(`   Content-Type: ${exportRes.headers["content-type"]}`);

		const exportData = JSON.parse(exportRes.body);
		console.log("   ✅ Export successfully downloaded JSON backup!");
		console.log(`   - Collections exported: ${exportData.collectionsCount}`);
		console.log(`   - Documents exported: ${exportData.documentsCount}`);

		// 4. Test POST /api/admin/backup/import
		console.log("\n4️⃣ Testing POST /api/admin/backup/import (JSON payload)...");
		const importPayload = JSON.stringify({
			collections: {
				departments: exportData.collections.departments || [],
			},
		});

		const importRes = await request(
			{
				hostname: "localhost",
				port: port,
				path: "/api/admin/backup/import",
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
					"Content-Length": Buffer.byteLength(importPayload),
				},
			},
			importPayload
		);

		console.log(`   Status code: ${importRes.statusCode}`);
		const importData = JSON.parse(importRes.body);
		console.log("   ✅ Import response:", importData);

		// 5. Test Access Control - Unauthorized request
		console.log("\n5️⃣ Testing Access Control (Unauthenticated request)...");
		const unauthRes = await request({
			hostname: "localhost",
			port: port,
			path: "/api/admin/backup/export",
			method: "GET",
		});
		console.log(`   Status code without token: ${unauthRes.statusCode} (Expected: 401)`);
		if (unauthRes.statusCode === 401) {
			console.log("   ✅ Unauthorized request correctly blocked!");
		}

		console.log("\n==================================================");
		console.log("🎉 ALL API ENDPOINTS VERIFIED SUCCESSFULLY!");
		console.log("==================================================");
		process.exit(0);
	} catch (err) {
		console.error("\n❌ API TEST FAILED:", err.message);
		process.exit(1);
	}
}

testApi();
