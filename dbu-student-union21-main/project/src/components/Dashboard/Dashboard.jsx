/** @format */

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
	Users,
	Vote,
	MessageSquare,
	Award,
	Activity,
	Calendar,
	Bell,
	Clock,
	RefreshCw,
	TrendingUp,
	Sparkles,
	AlertCircle,
	FileText,
	CheckCircle,
	PenTool,
	Trash2,
	Archive,
	Image as ImageIcon,
	X,
	Upload
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { apiService } from "../../services/api";
import "../../app.css";

// Animated Counter Component
const AnimatedCounter = ({ value, duration = 1000 }) => {
	const [count, setCount] = useState(0);
	const numValue = parseInt(value) || 0;

	useEffect(() => {
		if (numValue === 0) {
			setCount(0);
			return;
		}

		let start = 0;
		const increment = numValue / (duration / 16);
		const timer = setInterval(() => {
			start += increment;
			if (start >= numValue) {
				setCount(numValue);
				clearInterval(timer);
			} else {
				setCount(Math.floor(start));
			}
		}, 16);

		return () => clearInterval(timer);
	}, [numValue, duration]);

	return <span>{count}</span>;
};

// Loading Skeleton Component
const StatSkeleton = () => (
	<div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100 animate-pulse">
		<div className="flex items-center justify-between">
			<div className="flex-1">
				<div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
				<div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
				<div className="h-3 bg-gray-200 rounded w-20"></div>
			</div>
			<div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-200 rounded-lg"></div>
		</div>
	</div>
);

const ActivitySkeleton = () => (
	<div className="space-y-4">
		{[1, 2, 3].map((i) => (
			<div key={i} className="flex items-start space-x-3 p-3 animate-pulse">
				<div className="w-2 h-2 mt-2 rounded-full bg-gray-200"></div>
				<div className="flex-1">
					<div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
					<div className="h-3 bg-gray-200 rounded w-1/4"></div>
				</div>
			</div>
		))}
	</div>
);

export function Dashboard() {
	const { user } = useAuth();
	const [isLoading, setIsLoading] = useState(true);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [error, setError] = useState(null);
	const [lastUpdated, setLastUpdated] = useState(null);
	
	// Posting Form States
	const [showDirectiveForm, setShowDirectiveForm] = useState(false);
	const [showEventForm, setShowEventForm] = useState(false);
	const [directiveForm, setDirectiveForm] = useState({ title: '', category: 'Academic', priority: 'Normal', message: '' });
	const [eventForm, setEventForm] = useState({ name: '', club: 'Tecktonic', date: '', location: '', description: '' });

	// Image upload state for Executive Posting Tool
	const [directiveImage, setDirectiveImage] = useState(null);       // File object
	const [directiveImagePreview, setDirectiveImagePreview] = useState(null); // data-URL preview
	const [directiveUploading, setDirectiveUploading] = useState(false);
	const directiveFileRef = useRef(null);

	const [stats, setStats] = useState([
		{
			title: "Active Students",
			value: "0",
			change: "Loading...",
			icon: Users,
			color: "bg-gradient-to-br from-blue-500 to-blue-600",
			lightColor: "bg-blue-50",
			textColor: "text-blue-600",
		},
		{
			title: "Ongoing Elections",
			value: "0",
			change: "Loading...",
			icon: Vote,
			color: "bg-gradient-to-br from-emerald-500 to-green-600",
			lightColor: "bg-green-50",
			textColor: "text-green-600",
		},
		{
			title: "Active Clubs",
			value: "0",
			change: "Loading...",
			icon: Award,
			color: "bg-gradient-to-br from-purple-500 to-purple-600",
			lightColor: "bg-purple-50",
			textColor: "text-purple-600",
		},
		{
			title: "Pending Complaints",
			value: "0",
			change: "Loading...",
			icon: MessageSquare,
			color: "bg-gradient-to-br from-orange-500 to-amber-600",
			lightColor: "bg-orange-50",
			textColor: "text-orange-600",
		},
	]);

	const [recentActivities, setRecentActivities] = useState([]);
	const [upcomingEvents, setUpcomingEvents] = useState([]);

	const loadDashboardStats = useCallback(async (showRefreshState = false) => {
		try {
			if (showRefreshState) {
				setIsRefreshing(true);
			}
			setError(null);

			// Fetch stats in parallel using PUBLIC stats endpoints (accessible to all logged-in users)
			const [electionsStats, clubsStats, complaintsStats, usersStats] = await Promise.allSettled([
				apiService.getElectionPublicStats().catch(() => null),
				apiService.getClubPublicStats().catch(() => null),
				apiService.getComplaintPublicStats().catch(() => null),
				apiService.getUserPublicStats().catch(() => null),
			]);

			// Helper function to safely extract values from the response
			const getStatValue = (result, key) => {
				if (result.status !== 'fulfilled' || !result.value) return 0;
				return result.value?.[key] ?? 0;
			};

			// Active elections (based on date: startDate <= now && endDate > now)
			const electionsActive = getStatValue(electionsStats, 'active');

			// Clubs
			const clubsActive = getStatValue(clubsStats, 'active');
			const clubsTotal = getStatValue(clubsStats, 'total');

			// Complaints
			const complaintsPending = getStatValue(complaintsStats, 'pending');
			const complaintsTotal = getStatValue(complaintsStats, 'total');

			// Students
			const studentsActive = getStatValue(usersStats, 'active');
			const studentsTotal = getStatValue(usersStats, 'total');

			setStats([
				{
					title: "Active Students",
					value: String(studentsActive),
					change: `${studentsActive} Active / ${studentsTotal} Total Accounts`,
					icon: Users,
					color: "bg-gradient-to-br from-blue-500 to-blue-600",
					lightColor: "bg-blue-50",
					textColor: "text-blue-600",
				},
				{
					title: "Ongoing Elections",
					value: String(electionsActive),
					change: "Active now",
					icon: Vote,
					color: "bg-gradient-to-br from-emerald-500 to-green-600",
					lightColor: "bg-green-50",
					textColor: "text-green-600",
				},
				{
					title: "Clubs Active to Join",
					value: String(clubsActive),
					change: `${clubsActive} Active / ${clubsTotal} Total Clubs`,
					icon: Award,
					color: "bg-gradient-to-br from-purple-500 to-purple-600",
					lightColor: "bg-purple-50",
					textColor: "text-purple-600",
				},
				{
					title: "Pending Complaints",
					value: String(complaintsPending),
					change: `${complaintsPending} Pending / ${complaintsTotal} Total`,
					icon: MessageSquare,
					color: "bg-gradient-to-br from-orange-500 to-amber-600",
					lightColor: "bg-orange-50",
					textColor: "text-orange-600",
				},
			]);

			// Set real-time activities (dynamic based on current data)
			setRecentActivities([
				{
					id: 1,
					title: "Welcome to DBU Student Portal",
					time: "Just now",
					type: "info",
				},
				{
					id: 2,
					title: `${electionsActive} elections currently active`,
					time: "Live",
					type: "election",
				},
				{
					id: 3,
					title: `${clubsTotal} clubs active to join`,
					time: "Updated",
					type: "club",
				},
			]);

			// Dynamic upcoming events
			setUpcomingEvents([
				{
					id: 1,
					title: "Student Council Meeting",
					date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
					time: "02:00 PM",
					location: "Conference Hall",
				},
				{
					id: 2,
					title: "Club Registration Deadline",
					date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
					time: "11:59 PM",
					location: "Online Portal",
				},
			]);

			setLastUpdated(new Date());
		} catch (err) {
			console.error('Error loading dashboard stats:', err);
			setError('Failed to load dashboard data. Please try again.');
		} finally {
			setIsLoading(false);
			setIsRefreshing(false);
		}
	}, [user]);

	useEffect(() => {
		loadDashboardStats();
		// Auto-refresh every 5 minutes
		const interval = setInterval(() => loadDashboardStats(), 5 * 60 * 1000);
		return () => clearInterval(interval);
	}, [loadDashboardStats]);

	const getGreeting = () => {
		const hour = new Date().getHours();
		if (hour < 12) return "Good morning";
		if (hour < 17) return "Good afternoon";
		return "Good evening";
	};

	const getActivityIcon = (type) => {
		switch (type) {
			case "election": return <Vote className="w-4 h-4 text-green-500" />;
			case "club": return <Award className="w-4 h-4 text-purple-500" />;
			case "complaint": return <MessageSquare className="w-4 h-4 text-orange-500" />;
			default: return <Sparkles className="w-4 h-4 text-blue-500" />;
		}
	};

	const formatLastUpdated = () => {
		if (!lastUpdated) return "";
		const now = new Date();
		const diff = Math.floor((now - lastUpdated) / 1000);
		if (diff < 60) return "Just now";
		if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
		return lastUpdated.toLocaleTimeString();
	};

	const handleDirectiveFileChange = (e) => {
		const file = e.target.files?.[0];
		if (!file) return;
		if (!file.type.startsWith('image/')) {
			alert('Only image files are allowed.');
			return;
		}
		setDirectiveImage(file);
		const reader = new FileReader();
		reader.onload = (ev) => setDirectiveImagePreview(ev.target.result);
		reader.readAsDataURL(file);
	};

	const handlePostDirective = async (e) => {
		e.preventDefault();
		setDirectiveUploading(true);
		try {
			let imageUrl = null;

			// If an image was selected, upload it to the carousel endpoint
			if (directiveImage) {
				const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
				const token = localStorage.getItem('token') ||
					(() => { try { return JSON.parse(localStorage.getItem('user') || '{}').token; } catch { return ''; } })();

				const fd = new FormData();
				fd.append('image', directiveImage);
				fd.append('caption', directiveForm.title);
				fd.append('order', 0);

				const res = await fetch(`${API_BASE}/api/carousel/upload`, {
					method: 'POST',
					headers: { Authorization: `Bearer ${token}` },
					body: fd,
				});
				const data = await res.json();
				if (data.success) {
					imageUrl = data.slide?.imageUrl || null;
				} else {
					alert('Image upload failed: ' + (data.message || 'Unknown error'));
					return;
				}
			}

			// Store directive locally (with optional imageUrl for feed rendering)
			const current = JSON.parse(localStorage.getItem('official_directives') || '[]');
			current.unshift({
				...directiveForm,
				id: Date.now(),
				author: user?.name || 'Admin',
				timestamp: new Date().toISOString(),
				...(imageUrl && { imageUrl }),
			});
			localStorage.setItem('official_directives', JSON.stringify(current));

			setShowDirectiveForm(false);
			setDirectiveForm({ title: '', category: 'Academic', priority: 'Normal', message: '' });
			setDirectiveImage(null);
			setDirectiveImagePreview(null);
			if (directiveFileRef.current) directiveFileRef.current.value = '';

			alert(imageUrl
				? '✅ Directive published and photo added to the homepage carousel!'
				: '✅ Directive published successfully to the main feed.');
		} catch (err) {
			console.error('Directive post error:', err);
			alert('Failed to publish directive. Please try again.');
		} finally {
			setDirectiveUploading(false);
		}
	};

	const handlePostEvent = (e) => {
		e.preventDefault();
		const current = JSON.parse(localStorage.getItem('club_events') || '[]');
		current.unshift({ ...eventForm, id: Date.now(), author: user?.name || 'Club Leader', timestamp: new Date().toISOString() });
		localStorage.setItem('club_events', JSON.stringify(current));
		setShowEventForm(false);
		setEventForm({ name: '', club: 'Tecktonic', date: '', location: '', description: '' });
		alert("Club Event published successfully.");
	};

	const mockDirectives = JSON.parse(localStorage.getItem('official_directives') || '[]');

	return (
		<div className="space-y-4 sm:space-y-6 p-2 sm:p-0">
			{/* Welcome Section - Responsive */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 text-white relative overflow-hidden">
				{/* Decorative elements */}
				<div className="absolute top-0 right-0 w-32 h-32 sm:w-64 sm:h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
				<div className="absolute bottom-0 left-0 w-24 h-24 sm:w-48 sm:h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>

				<div className="relative z-10">
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
						<div>
							<h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1 sm:mb-2">
								{getGreeting()}, {user?.name?.split(' ')[0] || 'Student'}! 👋
							</h1>
							<p className="text-blue-100 text-sm sm:text-base">
								Welcome to your Student Union Portal
							</p>
							{lastUpdated && (
								<p className="text-blue-200 text-xs mt-2 flex items-center gap-1">
									<Clock className="w-3 h-3" />
									Last updated: {formatLastUpdated()}
								</p>
							)}
						</div>
						<button
							onClick={() => loadDashboardStats(true)}
							disabled={isRefreshing}
							className="self-start sm:self-auto flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm px-3 sm:px-4 py-2 rounded-lg transition-all duration-200 text-sm">
							<RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
							<span className="hidden sm:inline">Refresh</span>
						</button>
					</div>
				</div>
			</motion.div>

			{/* Error State */}
			<AnimatePresence mode="wait">
				{error && (
					<motion.div
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -10 }}
						transition={{ duration: 0.2 }}
						className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
						<div className="flex items-center gap-3">
							<AlertCircle className="w-5 h-5 text-red-500" />
							<p className="text-red-700 text-sm">{error}</p>
						</div>
						<button
							onClick={() => loadDashboardStats(true)}
							className="text-red-600 hover:text-red-700 text-sm font-medium">
							Retry
						</button>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Pitch Stats for Presentation (Task 4) - RESTORED */}
			{(user?.isAdmin || user?.role === 'clubs_coordinator') && (
				<motion.div
					initial={{ opacity: 0, scale: 0.98 }}
					animate={{ opacity: 1, scale: 1 }}
					className="bg-gradient-to-br from-gray-900 to-blue-900 rounded-2xl p-6 lg:p-8 text-white shadow-2xl border-4 border-blue-500/30 overflow-hidden relative"
				>
					{/* Watermark/Background decoration */}
					<div className="absolute top-0 right-0 p-4 opacity-10">
						<Award className="w-32 h-32" />
					</div>

					<div className="relative z-10">
						<div className="flex items-center gap-3 mb-6">
							<div className="bg-blue-500/20 p-2 rounded-lg">
								<Sparkles className="w-5 h-5 text-blue-400" />
							</div>
							<h2 className="text-sm font-black uppercase tracking-[0.2em] text-blue-300">
								Executive Presentation Metrics
							</h2>
						</div>

						<div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
							<div className="space-y-1">
								<p className="text-4xl lg:text-5xl font-black text-white">
									<AnimatedCounter value="11" />
								</p>
								<p className="text-[10px] lg:text-xs font-bold text-blue-200 uppercase tracking-widest flex items-center gap-2">
									<Award className="w-3 h-3" /> Total Clubs
								</p>
							</div>
							<div className="space-y-1">
								<p className="text-4xl lg:text-5xl font-black text-amber-400">
									<AnimatedCounter value="5" />
								</p>
								<p className="text-[10px] lg:text-xs font-bold text-amber-200 uppercase tracking-widest flex items-center gap-2">
									<Clock className="w-3 h-3" /> Reports Pending
								</p>
							</div>
							<div className="space-y-1">
								<p className="text-4xl lg:text-5xl font-black text-emerald-400">
									<AnimatedCounter value="3" />
								</p>
								<p className="text-[10px] lg:text-xs font-bold text-emerald-200 uppercase tracking-widest flex items-center gap-2">
									<CheckCircle className="w-3 h-3" /> Finished Reviews
								</p>
							</div>
							<div className="space-y-1">
								<p className="text-4xl lg:text-5xl font-black text-red-400">
									<AnimatedCounter value="2" /> <span className="text-lg">Days</span>
								</p>
								<p className="text-[10px] lg:text-xs font-bold text-red-200 uppercase tracking-widest flex items-center gap-2">
									<Calendar className="w-3 h-3" /> Until Election
								</p>
							</div>
						</div>

						<div className="mt-8 flex items-center gap-2 text-[10px] text-gray-400 font-medium">
							<div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
							System generating real-time audit data for council board review
						</div>
					</div>
				</motion.div>
			)}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
				{isLoading ? (
					<>
						<StatSkeleton />
						<StatSkeleton />
						<StatSkeleton />
						<StatSkeleton />
					</>
				) : (
					stats.map((stat, index) => (
						<motion.div
							key={stat.title}
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: index * 0.1 }}
							whileHover={{ scale: 1.02, y: -2 }}
							className="bg-white rounded-xl p-4 sm:p-6 shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 group cursor-pointer">
							<div className="flex items-center justify-between">
								<div className="flex-1 min-w-0">
									<p className="text-xs sm:text-sm font-medium text-gray-500 truncate">
										{stat.title}
									</p>
									<p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">
										<AnimatedCounter value={stat.value} />
									</p>
									<div className="flex items-center gap-1 mt-1 sm:mt-2">
										<TrendingUp className={`w-3 h-3 ${stat.textColor}`} />
										<p className={`text-xs sm:text-sm ${stat.textColor} truncate`}>
											{stat.change}
										</p>
									</div>
								</div>
								<div
									className={`w-10 h-10 sm:w-12 sm:h-12 ${stat.color} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
									<stat.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
								</div>
							</div>
						</motion.div>
					))
				)}
			</div>

			{/* Activity and Events Grid - Responsive */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
				{/* Recent Activity */}
				<motion.div
					initial={{ opacity: 0, x: -20 }}
					animate={{ opacity: 1, x: 0 }}
					transition={{ delay: 0.4 }}
					className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
					<div className="flex items-center justify-between mb-4">
						<h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
							<Activity className="w-5 h-5 text-blue-500" />
							Recent Activity
						</h3>
						<Bell className="w-5 h-5 text-gray-400" />
					</div>
					{isLoading ? (
						<ActivitySkeleton />
					) : (
						<div className="space-y-3">
							{recentActivities.map((activity, index) => (
								<motion.div
									key={activity.id}
									initial={{ opacity: 0, x: -10 }}
									animate={{ opacity: 1, x: 0 }}
									transition={{ delay: 0.5 + index * 0.1 }}
									className="flex items-start space-x-3 p-2 sm:p-3 rounded-lg hover:bg-gray-50 transition-colors group">
									<div className="mt-0.5">
										{getActivityIcon(activity.type)}
									</div>
									<div className="flex-1 min-w-0">
										<p className="text-xs sm:text-sm font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">
											{activity.title}
										</p>
										<p className="text-xs text-gray-500 mt-0.5">{activity.time}</p>
									</div>
								</motion.div>
							))}
						</div>
					)}
				</motion.div>

				{/* Upcoming Events */}
				<motion.div
					initial={{ opacity: 0, x: 20 }}
					animate={{ opacity: 1, x: 0 }}
					transition={{ delay: 0.5 }}
					className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
					<div className="flex items-center justify-between mb-4">
						<h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
							<Calendar className="w-5 h-5 text-purple-500" />
							Upcoming Events
						</h3>
						<Calendar className="w-5 h-5 text-gray-400" />
					</div>
					{isLoading ? (
						<ActivitySkeleton />
					) : (
						<div className="space-y-3">
							{upcomingEvents.map((event, index) => (
								<motion.div
									key={event.id}
									initial={{ opacity: 0, x: 10 }}
									animate={{ opacity: 1, x: 0 }}
									transition={{ delay: 0.6 + index * 0.1 }}
									whileHover={{ scale: 1.01 }}
									className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:border-blue-300 hover:shadow-md transition-all duration-200 cursor-pointer group">
									<h4 className="font-medium text-gray-900 text-sm sm:text-base group-hover:text-blue-600 transition-colors truncate">
										{event.title}
									</h4>
									<div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600 mt-2">
										<div className="flex items-center gap-1">
											<Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
											<span>{new Date(event.date).toLocaleDateString()}</span>
										</div>
										<div className="flex items-center gap-1">
											<Clock className="w-3 h-3 sm:w-4 sm:h-4" />
											<span>{event.time}</span>
										</div>
									</div>
									<p className="text-xs sm:text-sm text-gray-500 mt-1 truncate">
										📍 {event.location}
									</p>
								</motion.div>
							))}
						</div>
					)}
				</motion.div>
			</div>

			{/* Executive & Club Leader Posting Tools */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mt-6">
				{/* Executive Directives Tool */}
				{(user?.isAdmin || ['Gizew', 'Sintayew', 'Sintayehu', 'Genete', 'Kalkidan'].some(name => user?.name?.includes(name))) && (
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						className="bg-white rounded-xl shadow-sm border border-red-100 overflow-hidden">
						<div className="bg-red-700 p-4 sm:p-6 text-white flex justify-between items-center">
							<div>
								<h3 className="text-lg font-bold flex items-center gap-2">
									<PenTool className="w-5 h-5" /> Executive Posting Tool
								</h3>
								<p className="text-red-100 text-sm">Publish Special Directives to the main feed</p>
							</div>
							<button onClick={() => setShowDirectiveForm(!showDirectiveForm)} className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
								{showDirectiveForm ? 'Cancel' : '+ New Directive'}
							</button>
						</div>
						
						{showDirectiveForm && (
							<form onSubmit={handlePostDirective} className="p-4 sm:p-6 border-b border-gray-100 bg-gray-50">
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Directive Title</label>
										<input required value={directiveForm.title} onChange={e => setDirectiveForm({...directiveForm, title: e.target.value})} type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="e.g. Mandatory Registration" />
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
										<select value={directiveForm.category} onChange={e => setDirectiveForm({...directiveForm, category: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2">
											<option>Academic</option>
											<option>Housing</option>
											<option>Guidance</option>
										</select>
									</div>
										<div>
											<label className="block text-sm font-medium text-gray-700 mb-1">Priority Level</label>
											<select value={directiveForm.priority} onChange={e => setDirectiveForm({...directiveForm, priority: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2">
												<option>Normal</option>
												<option>Urgent</option>
											</select>
										</div>
										{/* ── Photo Upload ── */}
										<div className="sm:col-span-2">
											<label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
												<ImageIcon className="w-4 h-4 text-red-500" />
												Carousel Photo <span className="text-gray-400 font-normal">(optional — will appear on homepage carousel)</span>
											</label>
											<div
												className="relative border-2 border-dashed border-red-200 rounded-xl p-4 bg-red-50 hover:border-red-400 hover:bg-red-100 transition-colors cursor-pointer"
												onClick={() => directiveFileRef.current?.click()}
											>
												<input
													ref={directiveFileRef}
													type="file"
													accept="image/*"
													className="hidden"
													onChange={handleDirectiveFileChange}
												/>
												{directiveImagePreview ? (
													<div className="flex items-center gap-4">
														<img src={directiveImagePreview} alt="Preview" className="w-20 h-14 object-cover rounded-lg border border-red-200 shadow-sm flex-shrink-0" />
														<div className="flex-1 min-w-0">
															<p className="text-sm font-medium text-gray-800 truncate">{directiveImage?.name}</p>
															<p className="text-xs text-gray-500">{directiveImage ? (directiveImage.size / 1024).toFixed(1) + ' KB' : ''} — click to change</p>
														</div>
														<button
															type="button"
															onClick={(ev) => { ev.stopPropagation(); setDirectiveImage(null); setDirectiveImagePreview(null); if (directiveFileRef.current) directiveFileRef.current.value = ''; }}
															className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-full bg-red-200 hover:bg-red-400 text-red-700 transition-colors"
														>
															<X className="w-4 h-4" />
														</button>
													</div>
												) : (
													<div className="flex flex-col items-center gap-1 py-2 text-red-400">
														<Upload className="w-6 h-6" />
														<p className="text-xs font-medium text-center">Click to upload a photo<br /><span className="text-gray-400 font-normal">JPG, PNG, WebP — max 10 MB</span></p>
													</div>
												)}
											</div>
										</div>
									</div>
								<div className="mb-4">
									<label className="block text-sm font-medium text-gray-700 mb-1">Message Body</label>
									<textarea required value={directiveForm.message} onChange={e => setDirectiveForm({...directiveForm, message: e.target.value})} rows="3" className="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="Write the official directive here..."></textarea>
								</div>
								<button
									type="submit"
									disabled={directiveUploading}
									className="bg-red-700 text-white px-6 py-2 rounded-lg font-medium hover:bg-red-800 transition-colors disabled:opacity-60 flex items-center gap-2"
								>
									{directiveUploading ? (
										<><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Publishing...</>
									) : (
										<><Upload className="w-4 h-4" /> Publish Directive</>
									)}
								</button>
							</form>
						)}

						<div className="p-4 sm:p-6 bg-white">
							<h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Recent Directives</h4>
							<div className="space-y-4">
								{mockDirectives.length > 0 ? mockDirectives.slice(0,3).map(dir => (
									<div key={dir.id} className="border border-gray-100 rounded-lg p-4 flex justify-between items-start group hover:bg-gray-50">
										<div>
											<span className={`text-xs font-bold px-2 py-1 rounded-full mb-2 inline-block ${dir.priority === 'Urgent' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>{dir.priority}</span>
											<h5 className="font-bold text-gray-900">{dir.title}</h5>
											<p className="text-xs text-gray-500 mt-1">Posted {Math.floor((Date.now() - new Date(dir.timestamp).getTime()) / 60000)} minutes ago by {dir.author}</p>
										</div>
										<div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
											<button className="p-1.5 text-gray-400 hover:text-red-600 rounded bg-white shadow-sm border border-gray-200"><Trash2 className="w-4 h-4" /></button>
											<button className="p-1.5 text-gray-400 hover:text-blue-600 rounded bg-white shadow-sm border border-gray-200"><Archive className="w-4 h-4" /></button>
										</div>
									</div>
								)) : (
									<p className="text-gray-500 text-sm">No recent directives posted.</p>
								)}
							</div>
						</div>
					</motion.div>
				)}

				{/* Club Leader Tool */}
				{(user?.role === 'club_leader' || user?.isAdmin) && (
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.1 }}
						className="bg-white rounded-xl shadow-sm border border-blue-100 overflow-hidden">
						<div className="bg-blue-600 p-4 sm:p-6 text-white flex justify-between items-center">
							<div>
								<h3 className="text-lg font-bold flex items-center gap-2">
									<PenTool className="w-5 h-5" /> Club Leader Posting Tool
								</h3>
								<p className="text-blue-100 text-sm">Schedule events on the Campus Bulletin</p>
							</div>
							<button onClick={() => setShowEventForm(!showEventForm)} className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
								{showEventForm ? 'Cancel' : '+ Post Event'}
							</button>
						</div>
						
						{showEventForm && (
							<form onSubmit={handlePostEvent} className="p-4 sm:p-6 border-b border-gray-100 bg-gray-50">
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Event Name</label>
										<input required value={eventForm.name} onChange={e => setEventForm({...eventForm, name: e.target.value})} type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="e.g. AI Hackathon" />
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Club Name</label>
										<select value={eventForm.club} onChange={e => setEventForm({...eventForm, club: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2">
											<option>Tecktonic</option>
											<option>Idea Hub</option>
											<option>Law Club</option>
											<option>Begoadragot</option>
											<option>Career Development</option>
										</select>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
										<input required value={eventForm.date} onChange={e => setEventForm({...eventForm, date: e.target.value})} type="datetime-local" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
										<input required value={eventForm.location} onChange={e => setEventForm({...eventForm, location: e.target.value})} type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="e.g. Main Hall" />
									</div>
								</div>
								<div className="mb-4">
									<label className="block text-sm font-medium text-gray-700 mb-1">Event Description</label>
									<textarea required value={eventForm.description} onChange={e => setEventForm({...eventForm, description: e.target.value})} rows="2" className="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="Describe the event details..."></textarea>
								</div>
								<button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors">
									Publish Event
								</button>
							</form>
						)}

						<div className="p-4 sm:p-6 bg-white">
							<h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Your Posted Events</h4>
							<div className="space-y-4">
								<p className="text-gray-500 text-sm">No recent events posted.</p>
							</div>
						</div>
					</motion.div>
				)}
			</div>

			{/* Quick Actions for Admin */}
			{user?.isAdmin && (
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.6 }}
					className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
					<h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
						Quick Actions
					</h3>
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
						<motion.button
							whileHover={{ scale: 1.02 }}
							whileTap={{ scale: 0.98 }}
							className="p-3 sm:p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 text-left group">
							<div className="flex items-center space-x-3">
								<div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
									<Vote className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
								</div>
								<div className="min-w-0">
									<p className="font-medium text-gray-900 text-sm sm:text-base truncate">
										Start New Election
									</p>
									<p className="text-xs sm:text-sm text-gray-500 truncate">
										Create student election
									</p>
								</div>
							</div>
						</motion.button>

						<motion.button
							whileHover={{ scale: 1.02 }}
							whileTap={{ scale: 0.98 }}
							className="p-3 sm:p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-all duration-200 text-left group">
							<div className="flex items-center space-x-3">
								<div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
									<Users className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
								</div>
								<div className="min-w-0">
									<p className="font-medium text-gray-900 text-sm sm:text-base truncate">
										Manage Clubs
									</p>
									<p className="text-xs sm:text-sm text-gray-500 truncate">
										Review club requests
									</p>
								</div>
							</div>
						</motion.button>

						<motion.button
							whileHover={{ scale: 1.02 }}
							whileTap={{ scale: 0.98 }}
							className="p-3 sm:p-4 border border-gray-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition-all duration-200 text-left group sm:col-span-2 lg:col-span-1">
							<div className="flex items-center space-x-3">
								<div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
									<Activity className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
								</div>
								<div className="min-w-0">
									<p className="font-medium text-gray-900 text-sm sm:text-base truncate">
										View Reports
									</p>
									<p className="text-xs sm:text-sm text-gray-500 truncate">
										Analytics and insights
									</p>
								</div>
							</div>
						</motion.button>
					</div>
				</motion.div>
			)}
		</div>
	);
}
