/** @format */
import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Menu, X, User, LogOut, Bell, MapPin, Mail, CircleUserRound, Building2 } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useNotifications } from "../../contexts/NotificationContext";
import { useFeatureVisibility } from "../../contexts/FeatureVisibilityContext";
import { NotificationBadge } from "./NotificationBadge";
import { NotificationDropdown } from "./NotificationDropdown";
import { apiService } from "../../services/api";
import "../../app.css";

const API_BASE = (import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "https://dbu-student-portal-2.onrender.com/api" : "http://localhost:5000/api")).replace(/\/api$/, "");

export function Header() {
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [isNotifOpen, setIsNotifOpen] = useState(false);
	const { user, logout } = useAuth();
	const { notifications, markAsSeen } = useNotifications();
	const { electionVisible, leadershipVisible, clubsVisible, servicesVisible, complaintsVisible } = useFeatureVisibility();
	const navigate = useNavigate();
	const location = useLocation(); // ✅ Get current route
	const notifRef = useRef(null);
	const [selectedClub, setSelectedClub] = useState(null);
	const [departments, setDepartments] = useState([]);

	const fetchDepts = React.useCallback(async () => {
		try {
			const data = await apiService.getDepartments();
			if (data.success) {
				setDepartments(data.departments);
			}
		} catch (err) {
			console.error("Error fetching departments in header:", err);
		}
	}, []);

	useEffect(() => {
		fetchDepts();
		// Re-fetch whenever admin creates / deletes a department
		window.addEventListener("departments-updated", fetchDepts);
		return () => window.removeEventListener("departments-updated", fetchDepts);
	}, [fetchDepts]);

	const clubsData = [
		{ id: "begoadragot", name: "Begoadragot", desc: "The heart of campus volunteerism. Dedicated to blood drives, supporting low-income students, and local community service.", activities: "Charity Auctions and Humanitarian Campaigns." },
		{ id: "booking", name: "Booking Club", desc: "An academic resource network. Facilitates the exchange of rare textbooks, research journals, and peer-to-peer tutoring.", activities: "Book Swaps and Study Groups." },
		{ id: "career-dev", name: "Career Development", desc: "The bridge to the future. Specializes in professional branding and workplace readiness.", activities: "CV Building, Mock Interviews, and Job Fairs." },
		{ id: "civil-eng", name: "Civil Engineering", desc: "Professional building and design. Focuses on structural integrity and modern urban planning.", activities: "Site Visits, CAD Design Competitions, and Bridge Building." },
		{ id: "food-eng", name: "Food Engineering", desc: "Science for the future. Researches food safety, processing technology, and nutritional security.", activities: "Lab Experiments and Food Safety Seminars." },
		{ id: "hohe-tesfa", name: "Hohe Tesfa", desc: "Focused on \"Alpha Hope.\" Provides peer-to-peer mentorship for freshmen and mental health awareness.", activities: "Guidance Workshops and \"Hope\" Seminars." },
		{ id: "idea-hub", name: "Idea Hub", desc: "An innovation incubator. Helps students turn creative thoughts into viable business models.", activities: "Pitch Competitions and Entrepreneurship Bootcamps." },
		{ id: "law-club", name: "Law Club", desc: "The center for advocacy. Promotes legal literacy and student rights.", activities: "Mock Trials, Legal Debates, and Charter Education." },
		{ id: "mech-club", name: "Mechanical Club", desc: "Technical and industrial innovation. Specializes in automotive design, robotics, and machine maintenance.", activities: "Robot Wars and Workshop Training." },
		{ id: "tecktonic", name: "Tecktonic", desc: "The hub for digital transformation. Focuses on software engineering, AI research, and competitive coding.", activities: "Hackathons, Tech-Talks, and Hardware Prototyping." },
		{ id: "truth-culture", name: "Truth Culture", desc: "Preserving integrity and heritage. Focuses on ethical leadership and celebrating Ethiopia's diverse cultural history.", activities: "Cultural Festivals and Ethics Forums." }
	];

	const totalNotifications = Object.values(notifications).reduce((a, b) => a + b, 0);

	useEffect(() => {
		function handleClickOutside(event) {
			if (notifRef.current && !notifRef.current.contains(event.target)) {
				setIsNotifOpen(false);
			}
		}
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const handleLogout = () => {
		logout();
		navigate("/");
	};

	const navigation = !user
		? [
			{ name: "Home", href: "/" },
			...(clubsVisible ? [{ name: "Clubs", href: "/clubs" }] : []),
			...(servicesVisible ? [{ name: "Services", href: "/services" }] : []),
			{ name: "Latest Announcements", href: "/latest" },
			{ name: "About Us", href: "/about" },
			{ name: "Contact Us", href: "/contact" },
		]
		: [];

	const leadershipPages = [
		{ name: "University Executives", href: "/executives" },
		{ name: "Student Union", href: "/student-union" },
		{ name: "Student Services", href: "/student-services" },
		{ name: "Dormitory Management", href: "/dormitory-management" },
	];

	// Filter out any departments fetched from the database that are duplicates of the core leadership pages
	const coreNames = leadershipPages.map(p => p.name.toLowerCase().trim());
	const blacklist = [
		"club",
		"ልዩ",
		"vice president",
		"vice president, administration and develo",
		"audit and finace student union",
		"executive committee",
		"clubs & associations committee",
		"housing & accommodation services",
		"office of the dean",
		"psychology & guidance department",
		"president's office"
	];
	const customDepartments = departments.filter(dept => {
		if (!dept.name) return false;
		const nameLower = dept.name.toLowerCase().trim();
		if (coreNames.includes(nameLower)) return false;
		
		const matchesBlacklist = blacklist.some(item => 
			nameLower === item || 
			nameLower.startsWith(item) ||
			nameLower.includes("vice president") ||
			nameLower.includes("audit and finace")
		);
		return !matchesBlacklist;
	});

	const protectedNavigation = [
		...(user
			? [
				{ name: "Dashboard", href: "/dashboard" },
				...(clubsVisible ? [{ name: "Clubs", href: "/clubs" }] : []),
				...(electionVisible ? [{ name: "Elections", href: "/elections" }] : []),
				...(servicesVisible ? [{ name: "Services", href: "/services" }] : []),
				{ name: "Latest", href: "/latest" },
				...(complaintsVisible ? [{ name: "Complaints", href: "/complaints" }] : []),
				{ name: "My Profile", href: "/profile" },
			]
			: []),
	];

	return (
		<header className="bg-white shadow-sm border-b border-gray-200">
			{/* Very Top Utility Bar */}
			<div className="bg-sky-700 text-white">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs sm:text-sm">
						<div className="flex flex-wrap items-center gap-4 sm:gap-6">
							<span className="inline-flex items-center gap-1.5">
								<MapPin className="w-4 h-4" />
								Debre Berhan, Amhara, Ethiopia
							</span>
							<span className="inline-flex items-center gap-1.5">
								<Mail className="w-4 h-4" />
								pro@dbu.edu.et
							</span>
						</div>
						{!user && (
							<a
								href="/executives"
								className="inline-flex items-center gap-1.5 hover:text-blue-100 transition-colors"
							>
								<CircleUserRound className="w-4 h-4" />
								Staff Directory
							</a>
						)}
					</div>
				</div>
			</div>

			{/* University Brand Bar */}
			<div className="bg-white border-b border-gray-200">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
					<div className="flex items-center justify-between gap-4">
						<div className="flex items-center gap-3">
							<img
								src="/image.png/dbu-logo.png"
								alt="Debre Berhan University Logo"
								className="w-20 h-20 md:w-24 md:h-24 object-contain rounded-md border border-sky-100 bg-white p-1"
							/>
							<div>
							<p className="text-2xl md:text-4xl font-bold text-sky-700 leading-none">
								Debre Berhan University
							</p>
							<p className="text-xs md:text-sm text-gray-600 mt-1">
								Practical Education for a Better Success
							</p>
							</div>
						</div>
						<a
							href="https://www.dbu.edu.et/"
							target="_blank"
							rel="noreferrer"
							className="hidden sm:inline-flex bg-sky-50 text-sky-700 px-4 py-2 rounded-lg hover:bg-sky-100 transition-colors font-semibold text-sm border border-sky-200"
						>
							Main University Site
						</a>
					</div>
				</div>
			</div>

			{/* Main Header */}
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex justify-between items-center py-4">
					{/* Desktop Navigation */}
					<nav className="hidden md:flex items-center space-x-8">
						{navigation.map((item) => (
							<React.Fragment key={item.name}>
								{item.href.includes("#") ? (
									<a
										href={item.href}
										className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
									>
										{item.name}
									</a>
								) : (
									<Link
										to={item.href}
										className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
									>
										{item.name}
									</Link>
								)}
								{item.name === "Leadership" && (
									<div className="relative group">
										<button className="text-gray-700 hover:text-blue-600 font-medium transition-colors flex items-center gap-1">
											Clubs <span className="text-xs">▼</span>
										</button>
										<div className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-100 rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 overflow-hidden max-h-96 overflow-y-auto">
											<div className="py-2">
												{clubsData.map(club => (
													<button key={club.id} onClick={() => setSelectedClub(club)} className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600">
														{club.name}
													</button>
												))}
											</div>
										</div>
									</div>
								)}
							</React.Fragment>
						))}
						
						{/* ── Union & Leadership Dropdown — Hybrid Dynamic ── */}
						{leadershipVisible && (
							<div className="relative group">
								<button className="text-gray-700 hover:text-blue-600 font-medium transition-colors flex items-center gap-1">
									Union & Leadership <span className="text-xs">▼</span>
								</button>
								<div className="absolute top-full left-0 mt-2 w-56 bg-white border border-gray-100 rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
									<div className="py-2 max-h-80 overflow-y-auto">
										{leadershipPages.map(page => (
											<Link
												key={page.href}
												to={page.href}
												className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 font-medium transition-colors"
											>
												{page.name}
											</Link>
										))}
										{customDepartments.map(dept => (
											<Link
												key={dept._id}
												to={`/leadership/${dept._id}`}
												className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 font-medium transition-colors"
											>
												{dept.name}
											</Link>
										))}
									</div>
								</div>
							</div>
						)}

						{user &&
							protectedNavigation.map((item) => (
								<Link
									key={item.name}
									to={item.href}
									className="text-gray-700 hover:text-blue-600 font-medium transition-colors relative"
								>
									{item.name}
								</Link>
							))}
					</nav>

					{/* User Menu */}
					<div className="flex items-center space-x-4">
						{user ? (
							<div className="flex items-center space-x-3">
								<div className="flex items-center space-x-2 text-gray-700">
									<User className="w-5 h-5" />
									<span className="hidden sm:inline">{user.name}</span>
									{user.isAdmin && (
										<span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
											Admin
										</span>
									)}
								</div>
								{user && (user.role === 'admin' || user.role === 'system_admin' || user.isAdmin === true) && (
									<Link
										to="/admin"
										className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-blue-700 transition-colors"
									>
										Admin Panel
									</Link>
								)}

								{/* Notification Bell */}
								<div className="relative" ref={notifRef}>
									<button
										onClick={() => setIsNotifOpen(!isNotifOpen)}
										className="p-2 text-gray-700 hover:text-blue-600 rounded-full hover:bg-gray-100 transition-colors relative"
									>
										<Bell className="w-6 h-6" />
										{totalNotifications > 0 && <NotificationBadge count={totalNotifications} />}
									</button>
									<NotificationDropdown
										isOpen={isNotifOpen}
										onClose={() => setIsNotifOpen(false)}
									/>
								</div>

								<button
									onClick={handleLogout}
									className="flex items-center space-x-2 text-gray-700 hover:text-red-600"
								>
									<LogOut className="w-5 h-5" />
									<span className="hidden sm:inline">Logout</span>
								</button>
							</div>
						) : (
							// ✅ Hide the login button if already on /login
							location.pathname !== "/login" && (
								<Link
									to="/login"
									className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
								>
									Login
								</Link>
							)
						)}

						{/* Mobile menu button */}
						<button
							aria-label="Toggle menu"
							onClick={() => setIsMenuOpen(!isMenuOpen)}
							className="md:hidden p-2 rounded-md text-gray-700 hover:text-blue-600"
						>
							{isMenuOpen ? (
								<X className="w-6 h-6" />
							) : (
								<Menu className="w-6 h-6" />
							)}
						</button>
					</div>
				</div>
			</div>

			{/* Mobile Navigation */}
			{isMenuOpen && (
				<div className="md:hidden bg-white border-t border-gray-200 overflow-y-auto max-h-[80vh]">
					<div className="px-4 py-2 space-y-1">
						{navigation.map((item) => (
							<React.Fragment key={item.name}>
								{item.href.includes("#") ? (
									<a
										href={item.href}
										className="block px-3 py-2 text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-md"
										onClick={() => setIsMenuOpen(false)}
									>
										{item.name}
									</a>
								) : (
									<Link
										to={item.href}
										className="block px-3 py-2 text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-md"
										onClick={() => setIsMenuOpen(false)}
									>
										{item.name}
									</Link>
								)}
								{item.name === "Leadership" && (
									<div className="pt-2 pb-1 border-t border-gray-100 mt-2">
										<p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Clubs</p>
										{clubsData.map(club => (
											<button key={club.id} onClick={() => { setIsMenuOpen(false); setSelectedClub(club); }} className="w-full text-left block px-3 py-2 text-sm text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-md">
												{club.name}
											</button>
										))}
									</div>
								)}
							</React.Fragment>
						))}

						{/* ── Mobile: Union & Leadership — Hybrid Dynamic ── */}
						{leadershipVisible && (
							<div className="pt-2 pb-1 border-t border-gray-100 mt-2">
								<p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Union & Leadership Directory</p>
								{leadershipPages.map(page => (
									<Link
										key={page.href}
										to={page.href}
										onClick={() => setIsMenuOpen(false)}
										className="block px-3 py-2 text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-md font-medium"
									>
										{page.name}
									</Link>
								))}
								{customDepartments.map(dept => (
									<Link
										key={dept._id}
										to={`/leadership/${dept._id}`}
										onClick={() => setIsMenuOpen(false)}
										className="block px-3 py-2 text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-md font-medium"
									>
										{dept.name}
									</Link>
								))}
							</div>
						)}

						{user &&
							protectedNavigation.map((item) => (
								<Link
									key={item.name}
									to={item.href}
									className="block px-3 py-2 text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-md relative"
									onClick={() => setIsMenuOpen(false)}
								>
									{item.name}
								</Link>
							))}
						<a 
							href="https://www.dbu.edu.et/" 
							target="_blank" 
							rel="noreferrer" 
							className="block px-3 py-2 text-blue-700 font-medium hover:bg-gray-50 rounded-md"
							onClick={() => setIsMenuOpen(false)}
						>
							Main University
						</a>
					</div>
				</div>
			)}

			{/* Club Detail Modal */}
			{selectedClub && (
				<div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex items-center justify-center p-4">
					<div className="bg-white rounded-2xl w-full max-w-md p-6 relative">
						<button onClick={() => setSelectedClub(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
							<X className="w-6 h-6" />
						</button>
						<h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedClub.name}</h2>
						<p className="text-gray-700 mb-3">{selectedClub.desc}</p>
						<div className="bg-blue-50 p-3 rounded-lg mb-6">
							<p className="text-sm text-blue-800"><span className="font-bold">Activities:</span> {selectedClub.activities}</p>
						</div>
						<div className="flex gap-4">
							<button onClick={() => { setSelectedClub(null); navigate("/login"); }} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex-1">
								Join Club
							</button>
							<button onClick={() => setSelectedClub(null)} className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors">
								Close
							</button>
						</div>
					</div>
				</div>
			)}
		</header>
	);
}
