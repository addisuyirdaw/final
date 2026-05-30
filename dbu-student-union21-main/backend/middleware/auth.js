/** @format */

const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Protect routes - require authentication
const protect = async (req, res, next) => {
	let token;

	if (
		req.headers.authorization &&
		req.headers.authorization.startsWith("Bearer")
	) {
		try {
			// Get token from header
			token = req.headers.authorization.split(" ")[1];

			// Check if it's a mock token (for development)
			if (token.startsWith("eyJ")) {
				// JWT tokens start with eyJ
				try {
					// Try to parse as mock token first
					const parts = token.split(".");
					if (parts.length === 3) {
						const payload = JSON.parse(atob(parts[1]));

						// Check if it's a mock token
						if (
							payload.id &&
							(payload.id.toString().includes("admin_") ||
								payload.id.toString().includes("student_") ||
								payload.id.toString().includes("google_"))
						) {
							// Handle mock token
							const mockUser = {
								_id: payload.id,
								id: payload.id,
								email: payload.email,
								role: payload.role,
								isAdmin: payload.isAdmin || false,
								isActive: true,
								name: payload.name || "Mock User",
							};

							req.user = mockUser;
							return next();
						}
					}
				} catch (mockError) {
					// If mock token parsing fails, continue with real JWT verification
				}
			}

			// Verify real JWT token
			const decoded = jwt.verify(token, process.env.JWT_SECRET);

			// Get user from token
			req.user = await User.findById(decoded.id).select("-password");

			if (!req.user) {
				console.warn('Auth Failure: Decoded ID', decoded.id, 'not found in database');
				return res.status(401).json({
					success: false,
					message: "Not authorized, user not found",
				});
			}

			if (!req.user.isActive) {
				return res.status(401).json({
					success: false,
					message: "Account has been deactivated",
				});
			}

			// Global Guard: Block restricted users from all non-essential API routes
			if (req.user.isRestricted && req.originalUrl !== '/api/auth/me') {
				const reason = req.user.restrictionReason || "Violation of community guidelines";
				return res.status(403).json({
					success: false,
					message: `Your account is restricted. Reason: ${reason}`,
					isRestricted: true,
					reason: reason
				});
			}

			next();
		} catch (error) {
			console.error("Token verification error:", error);
			return res.status(401).json({
				success: false,
				message: "Not authorized, token failed",
			});
		}
	}

	if (!token) {
		return res.status(401).json({
			success: false,
			message: "Not authorized, no token",
		});
	}
};

const adminOnly = (req, res, next) => {
	const privilegedRoles = ["admin", "president", "council_president", "council_secretary", "clubs_coordinator", "academic_affairs", "system_admin"];
	const executiveNames = ['Gizew', 'Sintayew', 'Sintayehu', 'Genete', 'Kalkidan'];
	const isExecutive = req.user && req.user.name && executiveNames.some(name => req.user.name.includes(name));
	if (req.user && (req.user.isAdmin || privilegedRoles.includes(req.user.role) || isExecutive)) {
		next();
	} else {
		res.status(403).json({
			success: false,
			message: "Access denied. Higher privileges required.",
		});
	}
};

const systemAdminOnly = (req, res, next) => {
	if (req.user && (req.user.isAdmin || req.user.role === 'admin' || req.user.role === 'system_admin') && req.user.username === 'dbu10101030') {
		next();
	} else {
		res.status(403).json({
			success: false,
			message: "Access denied. Only System Administrator with username 10101030 is permitted to perform this action.",
		});
	}
};


// Specific role access
const authorize = (...roles) => {
	return (req, res, next) => {
		if (!req.user) {
			return res.status(401).json({
				success: false,
				message: "Not authorized",
			});
		}

		const isPrivileged = req.user.isAdmin ||
			['admin', 'president', 'council_president', 'system_admin'].includes(req.user.role);

		if (!roles.includes(req.user.role) && !isPrivileged) {
			return res.status(403).json({
				success: false,
				message: `User role ${req.user.role} is not authorized to access this route`,
			});
		}

		next();
	};
};

// Optional authentication - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
	let token;

	if (
		req.headers.authorization &&
		req.headers.authorization.startsWith("Bearer")
	) {
		try {
			token = req.headers.authorization.split(" ")[1];

			// Handle mock tokens
			if (token.startsWith("eyJ")) {
				try {
					const parts = token.split(".");
					if (parts.length === 3) {
						const payload = JSON.parse(atob(parts[1]));

						if (
							payload.id &&
							(payload.id.toString().includes("admin_") ||
								payload.id.toString().includes("student_") ||
								payload.id.toString().includes("google_"))
						) {
							const mockUser = {
								_id: payload.id,
								id: payload.id,
								email: payload.email,
								role: payload.role,
								isAdmin: payload.isAdmin || false,
								isActive: true,
								name: payload.name || "Mock User",
							};

							req.user = mockUser;
							return next();
						}
					}
				} catch (mockError) {
					// Continue with real JWT verification
				}
			}

			const decoded = jwt.verify(token, process.env.JWT_SECRET);
			req.user = await User.findById(decoded.id).select("-password");
		} catch (error) {
			// Token is invalid, continue without user for optional auth
			console.log('Optional auth token verification failed:', error.message);
		}
	}

	req.user = req.user || null;
	next();
};

// Club Leader access (for specific club)
const clubLeader = async (req, res, next) => {
	try {
		if (!req.user) {
			return res.status(401).json({
				success: false,
				message: "Not authorized",
			});
		}

		// Admins and President always have access
		if (req.user.isAdmin || req.user.role === 'admin' || req.user.role === 'president') {
			return next();
		}

		const Club = require("../models/Club");
		const club = await Club.findById(req.params.id);

		if (!club) {
			return res.status(404).json({
				success: false,
				message: "Club not found"
			});
		}

		// Check if user is in leadership or is the global Clubs Coordinator
		const isLeader =
			(club.leadership.president && club.leadership.president.toString() === req.user._id.toString()) ||
			(club.leadership.vicePresident && club.leadership.vicePresident.toString() === req.user._id.toString()) ||
			(club.leadership.secretary && club.leadership.secretary.toString() === req.user._id.toString()) ||
			req.user.role === "clubs_coordinator" ||
			req.user.username === "dbu10101040";

		if (isLeader) {
			next();
		} else {
			res.status(403).json({
				success: false,
				message: "Access denied. Club leadership privileges required."
			});
		}
	} catch (error) {
		console.error("Club leader check error:", error);
		res.status(500).json({
			success: false,
			message: "Server error checking permissions"
		});
	}
};

module.exports = {
	protect,
	adminOnly,
	systemAdminOnly,
	authorize,
	optionalAuth,
	clubLeader
};
