/**
 * Admin Backup Routes
 * - GET /api/admin/backup/export  : Export full JSON database dump
 * - POST /api/admin/backup/import : Import/restore JSON backup
 * - POST /api/admin/backup/email  : Manually trigger backup email dispatch
 * - GET /api/admin/backup/status  : Get current database collections stats
 *
 * @format
 */

const express = require("express");
const router = express.Router();
const multer = require("multer");
const { protect, superAdminOnly } = require("../middleware/auth");
const {
	generateBackupData,
	sendBackupEmail,
	restoreBackupData,
} = require("../services/backupService");

// In-memory multer storage for file uploads (avoids writing temporary files to disk)
const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

/**
 * @route   GET /api/admin/backup/export
 * @desc    Download full database backup as a JSON file
 * @access  Private (Super Admin only)
 */
router.get("/export", protect, superAdminOnly, async (req, res) => {
	try {
		console.log(`[BackupAPI] User ${req.user.username} (${req.user.role}) initiated backup export`);

		const backupData = await generateBackupData();

		const now = new Date();
		const dateStr = now.toISOString().split("T")[0];
		const timeStr = now.toTimeString().split(" ")[0].replace(/:/g, "-");
		const filename = `dbu_backup_${dateStr}_${timeStr}.json`;

		res.setHeader("Content-Type", "application/json");
		res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

		return res.status(200).send(JSON.stringify(backupData, null, 2));
	} catch (error) {
		console.error("[BackupAPI] Export error:", error);
		return res.status(500).json({
			success: false,
			message: "Failed to export database backup",
			error: error.message,
		});
	}
});

/**
 * @route   POST /api/admin/backup/import
 * @desc    Restore database documents from uploaded JSON file or JSON payload
 * @access  Private (Super Admin only)
 */
router.post(
	"/import",
	protect,
	superAdminOnly,
	upload.single("backup"),
	async (req, res) => {
		try {
			console.log(`[BackupAPI] User ${req.user.username} (${req.user.role}) initiated backup import`);

			let payload = null;

			// Check if file was uploaded via multipart/form-data
			if (req.file && req.file.buffer) {
				try {
					const fileContent = req.file.buffer.toString("utf-8");
					payload = JSON.parse(fileContent);
				} catch (parseErr) {
					return res.status(400).json({
						success: false,
						message: "Invalid JSON file format. Could not parse uploaded file.",
						error: parseErr.message,
					});
				}
			} else if (req.body) {
				// Raw JSON body
				payload = req.body.backupData || req.body;
			}

			if (!payload || typeof payload !== "object" || Object.keys(payload).length === 0) {
				return res.status(400).json({
					success: false,
					message:
						"No valid backup data provided. Please upload a .json file (field name 'backup') or send a JSON payload.",
				});
			}

			const results = await restoreBackupData(payload);

			return res.status(200).json({
				success: true,
				message: "Database restore completed successfully",
				totalRestored: results.totalRestored,
				restoredCollections: results.restoredCollections,
				errors: results.errors,
			});
		} catch (error) {
			console.error("[BackupAPI] Import error:", error);
			return res.status(500).json({
				success: false,
				message: "Failed to import database backup",
				error: error.message,
			});
		}
	}
);

/**
 * @route   POST /api/admin/backup/email
 * @desc    Manually trigger email backup dispatch
 * @access  Private (Super Admin only)
 */
router.post("/email", protect, superAdminOnly, async (req, res) => {
	try {
		console.log(`[BackupAPI] User ${req.user.username} triggered manual backup email`);
		const recipient = req.body.recipient || null;

		const result = await sendBackupEmail(recipient);

		return res.status(200).json({
			success: true,
			message: `Database backup email sent successfully to ${result.recipient}`,
			details: result,
		});
	} catch (error) {
		console.error("[BackupAPI] Manual email dispatch error:", error);
		return res.status(500).json({
			success: false,
			message: "Failed to dispatch backup email",
			error: error.message,
		});
	}
});

/**
 * @route   GET /api/admin/backup/status
 * @desc    Get collection stats and backup overview
 * @access  Private (Super Admin only)
 */
router.get("/status", protect, superAdminOnly, async (req, res) => {
	try {
		const backupData = await generateBackupData();
		return res.status(200).json({
			success: true,
			database: backupData.database,
			collectionsCount: backupData.collectionsCount,
			documentsCount: backupData.documentsCount,
			stats: backupData.stats,
			serverTime: new Date().toISOString(),
		});
	} catch (error) {
		console.error("[BackupAPI] Status check error:", error);
		return res.status(500).json({
			success: false,
			message: "Failed to fetch backup status",
			error: error.message,
		});
	}
});

module.exports = router;
