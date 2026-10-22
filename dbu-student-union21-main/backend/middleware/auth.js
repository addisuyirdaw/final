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
	if (!req.user) {
		return res.status(401).json({
			success: false,
			message: "Not authorized",
		});
	}

	const privilegedRoles = ["admin", "president", "council_president", "council_secretary", "clubs_coordinator", "academic_affairs", "system_admin"];
	const executiveNames = ['Giziew', 'Sintayew', 'Sintayehu', 'Genete', 'Kalkidan'];
	const isExecutive = req.user.name && executiveNames.some(name => req.user.name.includes(name));

	if (req.user.isAdmin || privilegedRoles.includes(req.user.role) || isExecutive) {
		return next();
	}

	return res.status(403).json({
		success: false,
		message: "Access denied. Higher privileges required.",
	});
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

const superAdminOnly = (req, res, next) => {
	if (
		req.user &&
		(req.user.role === 'system_admin' ||
			req.user.role === 'admin' ||
			req.user.isAdmin === true ||
			req.user.username === 'dbu10101030')
	) {
		return next();
	}
	return res.status(403).json({
		success: false,
		message: "Access denied. Super Admin privileges required.",
	});
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

		// Admins, Presidents, System Admins, and Clubs Coordinator always have access
		const privilegedRoles = ['admin', 'president', 'council_president', 'system_admin', 'clubs_coordinator'];
		const executiveNames = ['Giziew', 'Sintayew', 'Sintayehu', 'Genete', 'Kalkidan'];
		const isExecutive = req.user.name && executiveNames.some(name => req.user.name.includes(name));

		if (
			req.user.isAdmin ||
			privilegedRoles.includes(req.user.role) ||
			req.user.role === 'admin' ||
			req.user.username === 'dbu10101030' ||
			isExecutive
		) {
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

		// Safely normalize user and leader IDs
		const userIdStr = (req.user._id || req.user.id || '').toString();
		const getLeaderId = (leader) => {
			if (!leader) return '';
			return (leader._id || leader).toString();
		};

		const isLeader =
			getLeaderId(club.leadership?.president) === userIdStr ||
			getLeaderId(club.leadership?.vicePresident) === userIdStr ||
			getLeaderId(club.leadership?.secretary) === userIdStr ||
			getLeaderId(club.leadership?.treasurer) === userIdStr;

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
			message: "Server error checking permissions",
			error: error.message
		});
	}
};

// Dedicated RBAC Guard: Strictly Union President (dbu10101020), Super Admin (dbu10101030), or Electoral Committee
const isPresidentOrElectoralAdmin = async (req, res, next) => {
	if (!req.user) {
		return res.status(401).json({
			success: false,
			message: "Authentication required.",
		});
	}

	// Dedicated Union President & SuperAdmin credentials
	const allowedUsernames = ['dbu10101020', 'dbu10101030'];
	const userIdentifier = (req.user.studentId || req.user.username || '').toLowerCase().trim();

	// Dedicated credentials check
	const isDedicatedOfficial = allowedUsernames.includes(userIdentifier);
	const isElectoralCommittee = req.user.role === 'electoral_admin' || req.user.role === 'asmerach_committee';
	const isUnionPresident = (req.user.role === 'president' || req.user.role === 'council_president') && userIdentifier === 'dbu10101020';
	const isSystemAdmin = req.user.role === 'system_admin' && userIdentifier === 'dbu10101030';

	// Explicitly check for club coordinators, club admins, or club presidents
	// (Note: all 17 student club coordinators/representatives hold the generic role 'president' in DB, but are NOT the Union President!)
	const isGenericClubPresident = (req.user.role === 'president' || req.user.role === 'council_president') && userIdentifier !== 'dbu10101020';
	const isClubUser =
		!isDedicatedOfficial && (
			isGenericClubPresident ||
			req.user.role === 'club_admin' ||
			req.user.role === 'clubs_coordinator' ||
			req.user.role === 'club_coordinator' ||
			req.user.role === 'club_leader' ||
			req.user.role === 'CLUB_ADMIN' ||
			req.user.role === 'clubAdmin' ||
			req.user.role === 'CLUB_REP' ||
			req.user.role === 'club_rep' ||
			Boolean(req.user.clubId) ||
			Boolean(req.user.club) ||
			req.user.username === 'dbu10101040' ||
			Boolean(req.user.name && req.user.name.toLowerCase().includes('yirga')) ||
			Boolean(req.user.username && req.user.username.toLowerCase().includes('yirga'))
		);

	if (isClubUser || (!isDedicatedOfficial && !isUnionPresident && !isSystemAdmin && !isElectoralCommittee)) {
		return res.status(403).json({
			success: false,
			message: "ይህ ገጽ የተከለከለ ነው! የሥራ አስፈጻሚ እጩዎች ፕሮፖዛል የሚፈቀደው ለተማሪዎች ህብረት ፕሬዚዳንትና አስመራጭ ኮሚቴ ብቻ ነው።",
		});
	}

	// Double-check against Club models: ensure user is not a leader of any club (e.g., Food Engineering, Booking, etc.)
	if (!isDedicatedOfficial) {
		try {
			const Club = require('../models/Club');
			const isClubOfficial = await Club.exists({
				$or: [
					{ 'leadership.president': req.user._id },
					{ 'leadership.vicePresident': req.user._id },
					{ 'leadership.secretary': req.user._id },
					{ 'leadership.treasurer': req.user._id },
					{ 'members.user': req.user._id, 'members.role': { $in: ['president', 'vice_president', 'officer', 'secretary', 'treasurer'] } }
				]
			});
			if (isClubOfficial) {
				return res.status(403).json({
					success: false,
					message: "ይህ ገጽ የተከለከለ ነው! የሥራ አስፈጻሚ እጩዎች ፕሮፖዛል የሚፈቀደው ለተማሪዎች ህብረት ፕሬዚዳንትና አስመራጭ ኮሚቴ ብቻ ነው።",
				});
			}
		} catch (dbErr) {
			// Ignore DB lookup error and proceed if memory check passed
		}
	}

	next();
};

const presidentOnly = isPresidentOrElectoralAdmin;
const committeeOrPresidentOnly = isPresidentOrElectoralAdmin;

module.exports = {
	protect,
	adminOnly,
	presidentOnly,
	isPresidentOrElectoralAdmin,
	committeeOrPresidentOnly,
	systemAdminOnly,
	superAdminOnly,
	authorize,
	optionalAuth,
	clubLeader
};
