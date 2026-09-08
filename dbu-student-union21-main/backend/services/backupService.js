/**
 * Database Backup Service
 * - Exports full database dump across all MongoDB collections
 * - Sends automated daily backup emails via Nodemailer at midnight (0 0 * * *)
 * - Restores/upserts backup documents from JSON payloads
 *
 * @format
 */

const cron = require("node-cron");
const mongoose = require("mongoose");
const { transporter } = require("../utils/emailService");

/**
 * Generate full JSON backup of all collections in the connected database
 */
const generateBackupData = async () => {
	if (mongoose.connection.readyState !== 1) {
		throw new Error("Cannot generate backup: Database is not connected");
	}

	const db = mongoose.connection.db;
	const collections = await db.listCollections().toArray();

	const backup = {
		version: "1.0",
		timestamp: new Date().toISOString(),
		database: mongoose.connection.name || "dbu_student_union",
		stats: {},
		collectionsCount: 0,
		documentsCount: 0,
		collections: {},
	};

	let totalDocs = 0;

	for (const col of collections) {
		// Skip internal MongoDB system collections
		if (col.name.startsWith("system.")) continue;

		try {
			const docs = await db.collection(col.name).find({}).toArray();
			backup.collections[col.name] = docs;
			backup.stats[col.name] = docs.length;
			totalDocs += docs.length;
		} catch (err) {
			console.error(`[BackupService] Error exporting collection ${col.name}:`, err.message);
		}
	}

	// Also verify any registered Mongoose models that might not have a collection created yet
	for (const modelName of mongoose.modelNames()) {
		try {
			const model = mongoose.model(modelName);
			const colName = model.collection.name;
			if (!backup.collections[colName]) {
				const docs = await model.find({}).lean();
				backup.collections[colName] = docs;
				backup.stats[colName] = docs.length;
				totalDocs += docs.length;
			}
		} catch (err) {
			// Ignore if already fetched or model has no data
		}
	}

	backup.collectionsCount = Object.keys(backup.collections).length;
	backup.documentsCount = totalDocs;

	return backup;
};

/**
 * Send database backup JSON file via email
 */
const sendBackupEmail = async (customRecipient = null) => {
	try {
		console.log("[BackupService] Generating database backup for email...");
		const backupData = await generateBackupData();

		const recipient =
			customRecipient ||
			process.env.BACKUP_EMAIL ||
			process.env.EMAIL_TO ||
			process.env.EMAIL_USER ||
			"addisulal@gmail.com";

		const now = new Date();
		const dateStr = now.toISOString().split("T")[0];
		const timeStr = now.toTimeString().split(" ")[0].replace(/:/g, "-");
		const filename = `dbu_backup_${dateStr}_${timeStr}.json`;
		const jsonString = JSON.stringify(backupData, null, 2);

		// Build formatted breakdown table for email body
		const breakdownRows = Object.entries(backupData.stats)
			.sort(([a], [b]) => a.localeCompare(b))
			.map(
				([col, count]) => `
          <tr>
            <td style="padding: 6px 12px; border: 1px solid #e5e7eb; font-family: monospace;">${col}</td>
            <td style="padding: 6px 12px; border: 1px solid #e5e7eb; text-align: right; font-weight: 600;">${count}</td>
          </tr>`
			)
			.join("");

		const emailHtml = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 650px; margin: 0 auto; padding: 20px; color: #1f2937;">
        <div style="background: linear-gradient(135deg, #1e40af, #3b82f6); padding: 20px; border-radius: 8px 8px 0 0; color: white;">
          <h2 style="margin: 0; font-size: 22px;">💾 DBU Student Union Database Backup</h2>
          <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 14px;">Automated System Backup Report</p>
        </div>

        <div style="background: #ffffff; border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
          <p>Hello Administrator,</p>
          <p>Your automated database backup has completed successfully. A full JSON snapshot is attached to this email.</p>

          <div style="background: #f3f4f6; border-radius: 6px; padding: 16px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 4px 0; color: #6b7280;">📅 <strong>Date:</strong></td>
                <td style="padding: 4px 0; text-align: right;">${now.toUTCString()}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #6b7280;">🗄️ <strong>Database:</strong></td>
                <td style="padding: 4px 0; text-align: right; font-weight: bold;">${backupData.database}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #6b7280;">📁 <strong>Total Collections:</strong></td>
                <td style="padding: 4px 0; text-align: right;">${backupData.collectionsCount}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #6b7280;">📄 <strong>Total Documents:</strong></td>
                <td style="padding: 4px 0; text-align: right; font-weight: bold; color: #2563eb;">${backupData.documentsCount}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #6b7280;">📎 <strong>Attachment:</strong></td>
                <td style="padding: 4px 0; text-align: right; font-family: monospace;">${filename} (${(jsonString.length / 1024).toFixed(1)} KB)</td>
              </tr>
            </table>
          </div>

          <h3 style="font-size: 15px; margin: 20px 0 10px 0; color: #374151;">Collection Breakdown</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px;">
            <thead>
              <tr style="background: #f9fafb;">
                <th style="padding: 8px 12px; border: 1px solid #e5e7eb; text-align: left;">Collection Name</th>
                <th style="padding: 8px 12px; border: 1px solid #e5e7eb; text-align: right;">Record Count</th>
              </tr>
            </thead>
            <tbody>
              ${breakdownRows}
            </tbody>
          </table>

          <p style="font-size: 12px; color: #9ca3af; margin-top: 24px; border-top: 1px solid #f3f4f6; padding-top: 12px;">
            This is an automated notification sent by the DBU Student Council Management System. Keep this backup secure.
          </p>
        </div>
      </div>
    `;

		console.log(`[BackupService] Sending backup email to: ${recipient}...`);

		const info = await transporter.sendMail({
			from: `"DBU System Backup" <${process.env.EMAIL_USER}>`,
			to: recipient,
			subject: `💾 DBU Database Backup - ${dateStr} (${backupData.documentsCount} docs)`,
			text: `DBU Database Backup completed on ${now.toISOString()}.\nTotal collections: ${backupData.collectionsCount}\nTotal documents: ${backupData.documentsCount}\nDatabase: ${backupData.database}`,
			html: emailHtml,
			attachments: [
				{
					filename: filename,
					content: jsonString,
					contentType: "application/json",
				},
			],
		});

		console.log("[BackupService] ✅ Backup email sent successfully! MessageId:", info.messageId);

		return {
			success: true,
			messageId: info.messageId,
			recipient,
			filename,
			stats: backupData.stats,
			documentsCount: backupData.documentsCount,
			collectionsCount: backupData.collectionsCount,
		};
	} catch (error) {
		console.error("[BackupService] ❌ Failed to send backup email:", error.message);
		throw error;
	}
};

/**
 * Restore / upsert documents from backup JSON into the database
 */
const restoreBackupData = async (payload) => {
	if (mongoose.connection.readyState !== 1) {
		throw new Error("Cannot restore backup: Database is not connected");
	}

	const db = mongoose.connection.db;

	// Support both { collections: { ... } } and raw { users: [...], clubs: [...] }
	const collectionsSource =
		payload.collections && typeof payload.collections === "object"
			? payload.collections
			: payload;

	const metadataKeys = [
		"version",
		"timestamp",
		"database",
		"stats",
		"collectionsCount",
		"documentsCount",
		"totalCollections",
		"totalDocuments",
	];

	const results = {
		success: true,
		restoredCollections: {},
		totalRestored: 0,
		errors: [],
	};

	for (const [colName, docs] of Object.entries(collectionsSource)) {
		if (metadataKeys.includes(colName)) continue;
		if (!Array.isArray(docs)) continue;

		try {
			const collection = db.collection(colName);
			let count = 0;

			for (const doc of docs) {
				if (!doc || typeof doc !== "object") continue;

				// Clone document to avoid modifying original reference
				const docToInsert = { ...doc };

				// Normalize _id to ObjectId if valid 24-character hex string or $oid format
				let docId = docToInsert._id;
				if (docId) {
					if (typeof docId === "string" && mongoose.Types.ObjectId.isValid(docId)) {
						docId = new mongoose.Types.ObjectId(docId);
					} else if (
						docId &&
						typeof docId === "object" &&
						docId.$oid &&
						mongoose.Types.ObjectId.isValid(docId.$oid)
					) {
						docId = new mongoose.Types.ObjectId(docId.$oid);
					}
					docToInsert._id = docId;

					// Upsert using replaceOne
					await collection.replaceOne({ _id: docId }, docToInsert, { upsert: true });
				} else {
					// Document without explicit _id
					await collection.insertOne(docToInsert);
				}
				count++;
			}

			results.restoredCollections[colName] = count;
			results.totalRestored += count;
		} catch (err) {
			console.error(`[BackupService] Error restoring collection ${colName}:`, err.message);
			results.errors.push({ collection: colName, error: err.message });
		}
	}

	return results;
};

/**
 * Initialize automatic cron job running every midnight (0 0 * * *)
 */
const initBackupCron = () => {
	// Schedule to run every day at midnight (00:00)
	const cronSchedule = "0 0 * * *";

	console.log(`[BackupCron] Registering scheduled backup job: "${cronSchedule}" (daily at midnight)`);

	cron.schedule(
		cronSchedule,
		async () => {
			console.log(`[BackupCron] ⏰ Triggering scheduled database backup at ${new Date().toISOString()}...`);
			try {
				const result = await sendBackupEmail();
				console.log(`[BackupCron] ✅ Scheduled backup successfully sent to ${result.recipient}`);
			} catch (err) {
				console.error("[BackupCron] ❌ Scheduled backup failed:", err.message);
				// Gracefully handle error - do NOT crash server
			}
		},
		{
			scheduled: true,
			timezone: "Africa/Addis_Ababa", // Use Ethiopia local timezone or server default
		}
	);
};

module.exports = {
	generateBackupData,
	sendBackupEmail,
	restoreBackupData,
	initBackupCron,
};
