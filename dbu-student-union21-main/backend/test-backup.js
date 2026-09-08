/**
 * Standalone Verification Script for Backup Service
 *
 * @format
 */

require("dotenv").config();
const mongoose = require("mongoose");
const {
	generateBackupData,
	sendBackupEmail,
	restoreBackupData,
} = require("./services/backupService");

async function runTest() {
	console.log("==================================================");
	console.log("🧪 TESTING DATABASE BACKUP SERVICE");
	console.log("==================================================");

	try {
		console.log("\n1️⃣ Connecting to MongoDB...");
		await mongoose.connect(process.env.MONGODB_URI, {
			useNewUrlParser: true,
			useUnifiedTopology: true,
			serverSelectionTimeoutMS: 10000,
		});
		console.log("   ✅ MongoDB connected successfully!");

		console.log("\n2️⃣ Generating backup data dump...");
		const backupData = await generateBackupData();
		console.log(`   ✅ Backup generated successfully!`);
		console.log(`   - Database: ${backupData.database}`);
		console.log(`   - Collections Count: ${backupData.collectionsCount}`);
		console.log(`   - Total Documents: ${backupData.documentsCount}`);
		console.log("   - Collections Breakdown:", backupData.stats);

		// Verify structure
		if (backupData.collectionsCount === 0 || backupData.documentsCount === 0) {
			console.warn("   ⚠️ Warning: Backup generated 0 documents");
		}

		console.log("\n3️⃣ Testing restore/upsert logic with a sample subset...");
		// Test upsert on a safe sample (e.g. restore users from the backup)
		const testPayload = {
			collections: {
				users: backupData.collections.users || [],
			},
		};
		const restoreResult = await restoreBackupData(testPayload);
		console.log(`   ✅ Restore logic test passed!`);
		console.log(`   - Total Restored/Upserted: ${restoreResult.totalRestored}`);
		console.log(`   - Collection details:`, restoreResult.restoredCollections);

		console.log("\n4️⃣ Testing automated email dispatch with JSON attachment...");
		console.log(`   - Destination: addisulal@gmail.com`);
		console.log(`   - Sender: ${process.env.EMAIL_USER}`);

		const emailResult = await sendBackupEmail("addisulal@gmail.com");
		console.log("   ✅ Email sent successfully!");
		console.log(`   - MessageId: ${emailResult.messageId}`);
		console.log(`   - Attachment filename: ${emailResult.filename}`);
		console.log(`   - Recipient: ${emailResult.recipient}`);

		console.log("\n==================================================");
		console.log("🎉 ALL BACKUP VERIFICATIONS PASSED SUCCESSFULLY!");
		console.log("==================================================");
		process.exit(0);
	} catch (error) {
		console.error("\n❌ TEST FAILED:", error);
		process.exit(1);
	}
}

runTest();
