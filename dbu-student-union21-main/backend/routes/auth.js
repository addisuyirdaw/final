/** @format */

const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { protect } = require("../middleware/auth");
const {
	validateUserRegistration,
	validateUserLogin,
} = require("../middleware/validation");


const router = express.Router();

// ── Multer: profile avatar upload ──────────────────────────────────────────
const profilesDir = path.join(__dirname, "../uploads/profiles");
if (!fs.existsSync(profilesDir)) fs.mkdirSync(profilesDir, { recursive: true });

const profileStorage = multer.diskStorage({
	destination: (_req, _file, cb) => cb(null, profilesDir),
	filename: (_req, file, cb) => {
		const ext = path.extname(file.originalname).toLowerCase();
		cb(null, `profile-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
	},
});

const uploadAvatar = multer({
	storage: profileStorage,
	limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
	fileFilter: (_req, file, cb) => {
		if (file.mimetype.startsWith("image/")) return cb(null, true);
		cb(new Error("Only image files are allowed for profile avatars"), false);
	},
}).single("profileImage");

const { sendEmail } = require("../utils/emailService");

// Generate JWT Token
const generateToken = (id) => {
	return jwt.sign({ id }, process.env.JWT_SECRET, {
		expiresIn: "2h",
	});
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
router.post("/register", validateUserRegistration, async (req, res) => {
	try {
		let { name, username, password, department, year, phoneNumber, email } =
			req.body;

		if (username) {
			username = username.toLowerCase();
		}

		console.log('Registration attempt:', { username, email });

		// Check if user exists
		const userExists = await User.findOne({
			$or: [{ username: username }, ...(email ? [{ email: email }] : [])],
		});

		if (userExists) {
			return res.status(400).json({
				success: false,
				message: "User already exists with this username or email",
			});
		}

		// Create user
		const user = await User.create({
			name,
			username,
			password,
			department,
			year,
			phoneNumber,
			email: email || undefined,
			studentId: username,
		});

		// Generate token
		const token = generateToken(user._id);

		console.log('Registration successful:', username);
		return res.status(201).json({
			success: true,
			message: "User registered successfully",
			token,
			user: {
				id: user._id,
				name: user.name,
				username: user.username,
				email: user.email,
				department: user.department,
				year: user.year,
				role: user.role,
				isAdmin: user.isAdmin,
				profileImage: user.profileImage,
				isRestricted: false,
				restrictionReason: null,
			},
		});
	} catch (error) {
		console.error("Registration error:", error);

		if (error.name === "ValidationError") {
			const errors = Object.values(error.errors).map((err) => err.message);
			return res.status(400).json({
				success: false,
				message: "Validation failed",
				errors,
			});
		}

		return res.status(500).json({
			success: false,
			message: "Server error during registration",
		});
	}
});

// @desc    Login user (Student)
// @route   POST /api/auth/login
// @access  Public
router.post("/login", validateUserLogin, async (req, res) => {
	try {
		let { username, password } = req.body;
		if (username) {
			username = username.toLowerCase();
		}

		console.log('Login attempt:', username);

		// Check for user and include password
		const user = await User.findOne({ username }).select("+password");
		if (!user) {
			console.log('User not found:', username);
			return res.status(401).json({
				success: false,
				message: "Invalid credentials",
			});
		}

		console.log('User found:', user.username, 'Active:', user.isActive, 'Locked:', user.isLocked);

		// Check if account is locked
		if (user.isLocked && user.lockUntil > Date.now()) {
			console.log('Account locked:', username);
			return res.status(423).json({
				success: false,
				message: "Account temporarily locked due to too many failed login attempts",
			});
		}

		// Reset lock if expired
		if (user.isLocked && user.lockUntil <= Date.now()) {
			user.loginAttempts = 0;
			user.isLocked = false;
			user.lockUntil = undefined;
			await user.save();
			console.log('Lock reset for:', username);
		}

		// Check if account is restricted — block login entirely
		if (user.isRestricted) {
			const reason = user.restrictionReason || "Violation of community guidelines";
			console.log('Account restricted:', username);
			return res.status(403).json({
				success: false,
				isRestricted: true,
				reason,
				message: `Your account is restricted. Reason: ${reason}`,
			});
		}

		// Check if user is active
		if (!user.isActive) {
			console.log('Account inactive:', username);
			return res.status(401).json({
				success: false,
				message: "Account has been deactivated",
			});
		}

		// Check password
		const isMatch = await bcrypt.compare(password, user.password);
		console.log('Password match result:', isMatch);

		if (!isMatch) {
			console.log('Password mismatch for:', username);

			// Increment login attempts
			user.loginAttempts = (user.loginAttempts || 0) + 1;
			if (user.loginAttempts >= 5) {
				user.isLocked = true;
				user.lockUntil = Date.now() + 30 * 60 * 1000;
			}
			await user.save();

			return res.status(401).json({
				success: false,
				message: "Invalid credentials",
			});
		}

		// Reset login attempts on successful login
		user.loginAttempts = 0;
		user.isLocked = false;
		user.lockUntil = undefined;
		user.lastLogin = new Date();
		await user.save();

		// Generate token
		const token = generateToken(user._id);

		console.log('Login successful:', username);
		return res.json({
			success: true,
			message: "Login successful",
			token,
			user: {
				id: user._id,
				name: user.name,
				username: user.username,
				email: user.email,
				department: user.department,
				year: user.year,
				role: user.role || 'student',
				isAdmin: user.isAdmin,
				profileImage: user.profileImage,
				isRestricted: user.isRestricted || false,
				restrictionReason: user.restrictionReason || null,
			},
		});
	} catch (error) {
		console.error("Login error:", error);
		return res.status(500).json({
			success: false,
			message: "Server error during login",
			error: error.message,
			stack: error.stack
		});
	}
});

// @desc    Admin Login
// @route   POST /api/auth/admin-login
// @access  Public
router.post("/admin-login", async (req, res) => {
	try {
		let { username, password } = req.body;
		if (username) {
			username = username.toLowerCase();
		}

		console.log('Admin login attempt:', username);

		// Find user with password field
		const admin = await User.findOne({ username }).select("+password");
		if (!admin) {
			return res.status(401).json({
				success: false,
				message: "Admin account not found. Please contact system administrator."
			});
		}

		// Check if user is actually an admin
		if (!admin.isAdmin && admin.role !== 'admin') {
			console.log('Admin privilege check failed:', {
				username: admin.username,
				isAdmin: admin.isAdmin,
				role: admin.role
			});
			return res.status(403).json({
				success: false,
				message: "Access denied. This account does not have admin privileges."
			});
		}

		// Check if account is active
		if (!admin.isActive) {
			return res.status(403).json({
				success: false,
				message: "Account has been deactivated"
			});
		}

		// Check if account is locked
		if (admin.isLocked && admin.lockUntil > Date.now()) {
			return res.status(423).json({
				success: false,
				message: "Account temporarily locked due to too many failed login attempts"
			});
		}

		// Check password using bcrypt
		const isMatch = await bcrypt.compare(password, admin.password);
		console.log('Admin password match:', isMatch);

		if (!isMatch) {
			// Increment login attempts
			admin.loginAttempts += 1;
			if (admin.loginAttempts >= 5) {
				admin.isLocked = true;
				admin.lockUntil = Date.now() + 30 * 60 * 1000;
			}
			await admin.save();

			return res.status(401).json({
				success: false,
				message: "Invalid credentials. Please check your username and password."
			});
		}

		// Reset login attempts on successful login
		admin.loginAttempts = 0;
		admin.isLocked = false;
		admin.lockUntil = undefined;
		admin.lastLogin = new Date();
		await admin.save();

		// Generate token with admin role
		const token = jwt.sign(
			{
				id: admin._id,
				role: admin.role,
				isAdmin: admin.isAdmin
			},
			process.env.JWT_SECRET,
			{ expiresIn: "2h" }
		);

		console.log('Admin login successful:', username);

		return res.status(200).json({
			success: true,
			message: "Admin login successful",
			token,
			user: {
				id: admin._id,
				name: admin.name,
				username: admin.username,
				email: admin.email,
				role: admin.role,
				isAdmin: admin.isAdmin,
				profileImage: admin.profileImage
			}
		});

	} catch (error) {
		console.error("Admin login error:", error);
		return res.status(500).json({
			success: false,
			message: "Internal server error"
		});
	}
});

// @desc    Get current user profile
// @route   GET /api/auth/profile
// @access  Private
router.get("/profile", protect, async (req, res) => {
	try {
		const user = await User.findById(req.user.id).select("-password");

		return res.json({
			success: true,
			user,
		});
	} catch (error) {
		console.error("Profile fetch error:", error);
		return res.status(500).json({
			success: false,
			message: "Server error fetching profile",
		});
	}
});

// @desc    Update user profile (supports multipart/form-data for avatar upload)
// @route   PUT /api/auth/profile
// @access  Private
router.put("/profile", protect, (req, res, next) => {
	// Run multer; if the request has no file, multer simply skips it
	uploadAvatar(req, res, async (err) => {
		if (err) {
			return res.status(400).json({ success: false, message: err.message });
		}

		try {
			const { name, department, year, phoneNumber, address, email } = req.body;

			const user = await User.findById(req.user.id);
			if (!user) {
				return res.status(404).json({
					success: false,
					message: "User not found",
				});
			}

			// Update text fields
			if (name) user.name = name;
			if (department) user.department = department;
			if (year) user.year = year;
			if (phoneNumber) user.phoneNumber = phoneNumber;
			if (address) user.address = address;
			if (email) user.email = email;

			// If a new avatar was uploaded, delete the old file and save the new URL
			if (req.file) {
				// Remove old avatar from disk if it was a locally-stored file
				if (user.profileImage && user.profileImage.startsWith("/uploads/profiles/")) {
					try {
						const oldPath = path.join(__dirname, "..", user.profileImage);
						if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
					} catch (_) { /* ignore — file may already be gone */ }
				}
				user.profileImage = `/uploads/profiles/${req.file.filename}`;
				// Read and store base64 backup in MongoDB for self-healing
				try {
					const buf = fs.readFileSync(req.file.path);
					user.profileImageData = buf.toString('base64');
					user.profileImageName = req.file.originalname;
					user.profileImageMimeType = req.file.mimetype;
				} catch (e) { console.error('Auth avatar: profileImageData read error', e.message); }
			}

			await user.save();

			return res.json({
				success: true,
				message: "Profile updated successfully",
				user: {
					id: user._id,
					name: user.name,
					email: user.email,
					username: user.username,
					department: user.department,
					year: user.year,
					phoneNumber: user.phoneNumber,
					address: user.address,
					role: user.role,
					isAdmin: user.isAdmin,
					profileImage: user.profileImage,
				},
			});
		} catch (error) {
			console.error("Profile update error:", error);
			return res.status(500).json({
				success: false,
				message: "Server error updating profile",
			});
		}
	});
});


// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
router.put("/change-password", protect, async (req, res) => {
	try {
		const { currentPassword, newPassword } = req.body;

		if (!currentPassword || !newPassword) {
			return res.status(400).json({
				success: false,
				message: "Please provide current and new password",
			});
		}

		if (newPassword.length < 8) {
			return res.status(400).json({
				success: false,
				message: "New password must be at least 8 characters",
			});
		}

		const user = await User.findById(req.user.id).select("+password");

		// Check current password
		const isMatch = await bcrypt.compare(currentPassword, user.password);
		if (!isMatch) {
			return res.status(400).json({
				success: false,
				message: "Current password is incorrect",
			});
		}

		// Update password
		user.password = newPassword;
		await user.save();

		return res.json({
			success: true,
			message: "Password changed successfully",
		});
	} catch (error) {
		console.error("Password change error:", error);
		return res.status(500).json({
			success: false,
			message: "Server error changing password",
		});
	}
});

// @desc    Logout user (client-side token removal)
// @route   POST /api/auth/logout
// @access  Private
router.post("/logout", protect, (req, res) => {
	return res.json({
		success: true,
		message: "Logged out successfully",
	});
});

// @desc    Forgot Password
// @route   POST /api/auth/forgot-password
// @access  Public
router.post("/forgot-password", async (req, res) => {
	try {
		// Accept either email or username (identifier)
		const { email, identifier } = req.body;
		const lookup = (identifier || email || '').trim();

		console.log('🔑 Forgot-password request for:', lookup);

		if (!lookup) {
			return res.status(400).json({
				success: false,
				message: "Please provide your email address or student username",
			});
		}

		// Search by email OR by username (case-insensitive)
		const user = await User.findOne({
			$or: [
				{ email: { $regex: new RegExp(`^${lookup}$`, 'i') } },
				{ username: { $regex: new RegExp(`^${lookup}$`, 'i') } },
			]
		});

		console.log('🔎 User found:', user ? `${user.username} (${user.email || 'no email'})` : 'NOT FOUND');

		if (!user) {
			return res.status(404).json({
				success: false,
				message: "No account found with that email or username. Check the spelling and try again.",
			});
		}

		// Check user has an email address to send reset link to
		if (!user.email) {
			return res.status(400).json({
				success: false,
				message: "This account has no email address on file. Please contact the administrator to reset your password.",
			});
		}

		// Generate reset token
		const resetToken = crypto.randomBytes(20).toString("hex");

		// Hash and save token
		user.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
		user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
		await user.save({ validateBeforeSave: false });

		// Build reset URL
		const resetUrl = `http://localhost:5173/reset-password/${resetToken}`;
		const isDev = process.env.NODE_ENV !== 'production';

		// Build HTML email
		const html = `
			<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #f9f9f9;">
				<div style="text-align: center; margin-bottom: 30px;">
					<h1 style="color: #2563eb; margin: 0;">DBU Student Council</h1>
					<p style="color: #666; margin-top: 5px;">Password Reset Request</p>
				</div>
				<div style="background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
					<h2 style="color: #333; margin-top: 0;">Hello ${user.name},</h2>
					<p style="color: #555; line-height: 1.6;">You have requested to reset your password for your DBU Student Council Portal account.</p>
					<p style="color: #555; line-height: 1.6;">Click the button below to reset your password. This link expires in <strong>10 minutes</strong>.</p>
					<div style="text-align: center; margin: 30px 0;">
						<a href="${resetUrl}" style="background: linear-gradient(to right, #2563eb, #1d4ed8); color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Reset Password</a>
					</div>
					<p style="color: #888; font-size: 14px;">If the button doesn't work, copy this link into your browser:</p>
					<p style="background-color: #f0f4f8; padding: 10px; border-radius: 4px; word-break: break-all; font-size: 12px; color: #2563eb;">${resetUrl}</p>
					<hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
					<p style="color: #999; font-size: 12px;">If you did not request this, please ignore this email.</p>
				</div>
				<div style="text-align: center; margin-top: 20px; font-size: 12px; color: #999;">
					<p>© ${new Date().getFullYear()} DBU Student Council Portal.</p>
				</div>
			</div>`;

		// Send email using the sendEmail helper
		try {
			console.log('📧 Sending reset email to:', user.email);
			const info = await sendEmail({ to: user.email, subject: 'DBU Student Council - Password Reset Request', html });
			console.log('✅ Reset email sent! ID:', info.messageId);

			return res.status(200).json({
				success: true,
				message: `Password reset link sent to ${user.email}. Check your spam/junk folder too.`,
				...(isDev && { resetUrl, devNote: 'Dev mode: use this link directly if email not received' }),
			});
		} catch (emailError) {
			console.error('❌ Reset email failed:', emailError.message);

			// In dev mode — always return the reset link directly so students are never blocked
			if (isDev) {
				return res.status(200).json({
					success: true,
					message: 'Email delivery failed. Use the direct link below to reset your password.',
					resetUrl,
					devNote: 'SMTP failed — click the button below to reset directly',
				});
			}

			// In production — clear the token and return error
			user.resetPasswordToken = undefined;
			user.resetPasswordExpire = undefined;
			await user.save({ validateBeforeSave: false });
			return res.status(500).json({
				success: false,
				message: 'Failed to send reset email. Please contact the administrator.',
			});
		}

	} catch (error) {
		console.error('Forgot password error:', error);
		return res.status(500).json({
			success: false,
			message: 'Server error processing password reset request.',
			error: process.env.NODE_ENV !== 'production' ? error.message : undefined,
		});
	}
});

// @desc    Reset Password
// @route   PUT /api/auth/reset-password/:resetToken
// @access  Public
router.put("/reset-password/:resetToken", async (req, res) => {
	try {
		// Get hashed token
		const resetPasswordToken = crypto
			.createHash("sha256")
			.update(req.params.resetToken)
			.digest("hex");

		const user = await User.findOne({
			resetPasswordToken,
			resetPasswordExpire: { $gt: Date.now() },
		});

		if (!user) {
			return res.status(400).json({
				success: false,
				message: "Invalid token",
			});
		}

		// Set new password
		user.password = req.body.password;
		user.resetPasswordToken = undefined;
		user.resetPasswordExpire = undefined;

		await user.save();

		const token = generateToken(user._id);

		return res.status(200).json({
			success: true,
			message: "Password updated success",
			token,
			user: {
				id: user._id,
				name: user.name,
				username: user.username,
				email: user.email,
				role: user.role,
				isAdmin: user.isAdmin,
			},
		});

	} catch (error) {
		console.error("Reset password error:", error);
		return res.status(500).json({
			success: false,
			message: "Server error resetting password",
		});
	}
});

module.exports = router;