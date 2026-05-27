/** @format */

const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const crypto = require("crypto");
const { protect } = require("../middleware/auth");
const {
	validateUserRegistration,
	validateUserLogin,
} = require("../middleware/validation");

const router = express.Router();

const { transporter } = require("../utils/emailService");

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
		const { name, username, password, department, year, phoneNumber, email } =
			req.body;

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
		const { username, password } = req.body;

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
		const { username, password } = req.body;

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

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
router.put("/profile", protect, async (req, res) => {
	try {
		const { name, department, year, phoneNumber, address, email } = req.body;

		const user = await User.findById(req.user.id);
		if (!user) {
			return res.status(404).json({
				success: false,
				message: "User not found",
			});
		}

		// Update fields
		if (name) user.name = name;
		if (department) user.department = department;
		if (year) user.year = year;
		if (phoneNumber) user.phoneNumber = phoneNumber;
		if (address) user.address = address;
		if (email) user.email = email;

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
		const { email } = req.body;
		const user = await User.findOne({ email });

		if (!user) {
			return res.status(404).json({
				success: false,
				message: "There is no user with that email",
			});
		}

		// Get reset token
		const resetToken = crypto.randomBytes(20).toString("hex");

		// Hash token and set to resetPasswordToken field
		user.resetPasswordToken = crypto
			.createHash("sha256")
			.update(resetToken)
			.digest("hex");

		// Set expire
		user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

		await user.save({ validateBeforeSave: false });

		// Create reset url
		const resetUrl = `http://localhost:5173/reset-password/${resetToken}`;

		// Email options
		const mailOptions = {
			from: process.env.EMAIL_USER,
			to: user.email,
			subject: "DBU Student Council - Password Reset Request",
			html: `
				<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #f9f9f9;">
					<div style="text-align: center; margin-bottom: 30px;">
						<h1 style="color: #2563eb; margin: 0;">DBU Student Council</h1>
						<p style="color: #666; margin-top: 5px;">Password Reset Request</p>
					</div>
					
					<div style="background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
						<h2 style="color: #333; margin-top: 0;">Hello ${user.name},</h2>
						
						<p style="color: #555; line-height: 1.6;">
							You have requested to reset your password for your DBU Student Council Portal account.
						</p>
						
						<p style="color: #555; line-height: 1.6;">
							Please click the button below to reset your password. This link will expire in <strong>10 minutes</strong>.
						</p>
						
						<div style="text-align: center; margin: 30px 0;">
							<a href="${resetUrl}" style="background: linear-gradient(to right, #2563eb, #1d4ed8); color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Reset Password</a>
						</div>
						
						<p style="color: #888; font-size: 14px; line-height: 1.6;">
							If the button doesn't work, copy and paste this link into your browser:
						</p>
						<p style="background-color: #f0f4f8; padding: 10px; border-radius: 4px; word-break: break-all; font-size: 12px; color: #2563eb;">
							${resetUrl}
						</p>
						
						<hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
						
						<p style="color: #999; font-size: 12px; line-height: 1.5;">
							If you did not request this password reset, please ignore this email. Your password will remain unchanged.
						</p>
					</div>
					
					<div style="text-align: center; margin-top: 20px; font-size: 12px; color: #999;">
						<p>© ${new Date().getFullYear()} DBU Student Council Portal. All rights reserved.</p>
					</div>
				</div>
			`,
		};

		// Send email
		try {
			console.log("Attempting to send password reset email...");
			console.log("From:", process.env.EMAIL_USER);
			console.log("To:", user.email);

			const info = await transporter.sendMail(mailOptions);
			console.log("Password reset email sent successfully!");
			console.log("Message ID:", info.messageId);
			console.log("Sent to:", user.email);

			return res.status(200).json({
				success: true,
				message: "Password reset link has been sent to your email",
			});
		} catch (emailError) {
			console.error("Email sending failed:", emailError);

			// Reset the token fields if email fails
			user.resetPasswordToken = undefined;
			user.resetPasswordExpire = undefined;
			await user.save({ validateBeforeSave: false });

			return res.status(500).json({
				success: false,
				message: "Failed to send reset email. Please try again later.",
			});
		}

	} catch (error) {
		console.error("Forgot password error:", error);
		return res.status(500).json({
			success: false,
			message: "Could not send reset email",
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