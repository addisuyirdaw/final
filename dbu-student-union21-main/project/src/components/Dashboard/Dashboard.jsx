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
	Upload,
	Pencil,
	ChevronDown,
	ChevronUp
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { apiService } from "../../services/api";
import { useFeatureVisibility } from "../../contexts/FeatureVisibilityContext";
import toast from "react-hot-toast";
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

// ── Leadership Branch Creator Component (Admin Only) ────────────────────────
const LeadershipBranchCreator = ({ apiService }) => {
	const [branchName, setBranchName] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [status, setStatus] = useState(null); // { type: 'success'|'error', message: string }
	const [recentBranches, setRecentBranches] = useState([]);

	// Load existing departments on mount
	useEffect(() => {
		apiService.getDepartments()
			.then(data => setRecentBranches(data.departments || []))
			.catch(() => {});
	}, [apiService]);

	const handleDeploy = async (e) => {
		e.preventDefault();
		const trimmed = branchName.trim();
		if (!trimmed) return;

		setIsSubmitting(true);
		setStatus(null);
		try {
			const result = await apiService.createDepartment({ name: trimmed });
			if (result?.success || result?.department) {
				const newDept = result.department;
				setRecentBranches(prev => [newDept, ...prev]);
				setBranchName('');
				setStatus({ type: 'success', message: `✅ "${newDept?.name || trimmed}" is now live in the Union & Leadership dropdown!` });
				// 🔔 Notify Header to re-fetch departments instantly — no page reload needed
				window.dispatchEvent(new CustomEvent('departments-updated'));
			} else {
				throw new Error(result?.message || 'Unknown error from server');
			}
		} catch (err) {
			setStatus({ type: 'error', message: `❌ Failed: ${err.message}` });
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDelete = async (id, name) => {
		if (!window.confirm(`Remove "${name}" from the dropdown menu?`)) return;
		try {
			await apiService.deleteDepartment(id);
			setRecentBranches(prev => prev.filter(d => d._id !== id));
			window.dispatchEvent(new CustomEvent('departments-updated'));
		} catch (err) {
			alert('Delete failed: ' + err.message);
		}
	};

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: 0.7 }}
			className="bg-white rounded-xl shadow-sm border border-indigo-100 overflow-hidden">

			{/* Card Header */}
			<div className="bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-800 p-5 sm:p-6 text-white">
				<div className="flex items-center gap-3">
					<div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center text-2xl shadow-inner flex-shrink-0">
						🏛️
					</div>
					<div>
						<h3 className="text-lg sm:text-xl font-bold tracking-tight">Create Top-Level Leadership Branch</h3>
						<p className="text-indigo-200 text-sm mt-0.5">Deploy a new sector directly into the Union &amp; Leadership dropdown menu</p>
					</div>
				</div>
			</div>

			{/* Input Form */}
			<form onSubmit={handleDeploy} className="p-5 sm:p-6 border-b border-gray-100 bg-gradient-to-b from-indigo-50/40 to-white">
				<label className="block text-sm font-semibold text-gray-700 mb-2">
					New Major Dropdown Branch Name
				</label>
				<div className="flex flex-col sm:flex-row gap-3">
					<input
						id="branch-name-input"
						type="text"
						value={branchName}
						onChange={e => { setBranchName(e.target.value); setStatus(null); }}
						placeholder="Enter new major dropdown branch name (e.g., University Dining Office)..."
						className="flex-1 border border-indigo-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 rounded-xl px-4 py-3 text-sm text-gray-800 outline-none transition-all duration-200 bg-white shadow-sm"
						disabled={isSubmitting}
						maxLength={80}
					/>
					<motion.button
						id="deploy-branch-btn"
						type="submit"
						disabled={isSubmitting || !branchName.trim()}
						whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
						whileTap={{ scale: 0.97 }}
						className="flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-xl shadow-md transition-all duration-200 text-sm whitespace-nowrap">
						{isSubmitting ? (
							<><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Deploying...</>
						) : (
							<>⚡ Deploy to Main Menu Dropdown</>
						)}
					</motion.button>
				</div>

				{/* Status feedback */}
				<AnimatePresence mode="wait">
					{status && (
						<motion.p
							key={status.message}
							initial={{ opacity: 0, y: -6 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0 }}
							className={`mt-3 text-sm font-medium px-3 py-2 rounded-lg ${
								status.type === 'success'
									? 'bg-green-50 text-green-700 border border-green-200'
									: 'bg-red-50 text-red-700 border border-red-200'
							}`}>
							{status.message}
						</motion.p>
					)}
				</AnimatePresence>
			</form>

			{/* Live Branches List */}
			<div className="p-5 sm:p-6 bg-white">
				<h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
					<div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
					Live Dropdown Branches ({recentBranches.length})
				</h4>
				{recentBranches.length === 0 ? (
					<p className="text-sm text-gray-400 italic">No custom branches created yet. Add one above.</p>
				) : (
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
						{recentBranches.map((dept) => (
							<motion.div
								key={dept._id}
								initial={{ opacity: 0, scale: 0.95 }}
								animate={{ opacity: 1, scale: 1 }}
								className="flex items-center justify-between gap-2 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 group">
								<div className="flex items-center gap-2 min-w-0">
									<span className="text-lg">🏛️</span>
									<span className="text-sm font-semibold text-indigo-800 truncate">{dept.name}</span>
								</div>
								<button
									onClick={() => handleDelete(dept._id, dept.name)}
									title="Remove from dropdown"
									className="opacity-0 group-hover:opacity-100 flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg bg-red-100 hover:bg-red-200 text-red-500 hover:text-red-700 transition-all duration-150">
									<Trash2 className="w-3.5 h-3.5" />
								</button>
							</motion.div>
						))}
					</div>
				)}
			</div>
		</motion.div>
	);
};

export function Dashboard() {

	const { user } = useAuth();
	const {
		electionVisible,
		leadershipVisible,
		clubsVisible,
		servicesVisible,
		complaintsVisible,
		refresh: refreshVisibility
	} = useFeatureVisibility();
	const [togglingKeys, setTogglingKeys] = useState({});
	const isElectionToggler = user && (
		['dbu10101020', 'dbu10101030'].includes(user.username) ||
		user.role === 'president' ||
		user.role === 'system_admin'
	);
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

	// DB-backed directives state
	const [dbDirectives, setDbDirectives] = useState([]);
	const [directivesLoading, setDirectivesLoading] = useState(true);

	// Edit directive state
	const [editingDirectiveId, setEditingDirectiveId] = useState(null);
	const [editDirectiveForm, setEditDirectiveForm] = useState({ title: '', category: 'Academic', priority: 'Normal', message: '' });
	const [editDirectiveUploading, setEditDirectiveUploading] = useState(false);
	const [showPublishedDropdown, setShowPublishedDropdown] = useState(false);

	// Edit club event state
	const [clubEvents, setClubEvents] = useState(() => {
		try {
			return JSON.parse(localStorage.getItem('club_events') || '[]');
		} catch {
			return [];
		}
	});
	const [editingEventId, setEditingEventId] = useState(null);
	const [editEventForm, setEditEventForm] = useState({ name: '', club: 'Tecktonic', date: '', location: '', description: '' });
	const [showEventsDropdown, setShowEventsDropdown] = useState(false);

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

	// Load directives from the database
	const loadDirectives = async () => {
		try {
			setDirectivesLoading(true);
			const posts = await apiService.getPosts({ type: 'Directive', limit: 10 });
			const directivesArray = Array.isArray(posts) ? posts : (posts?.posts || posts?.data || []);
			setDbDirectives(directivesArray);
		} catch (err) {
			console.error('Error loading directives:', err);
			setDbDirectives([]);
		} finally {
			setDirectivesLoading(false);
		}
	};

	useEffect(() => {
		loadDashboardStats();
		loadDirectives();
		// Auto-refresh every 5 minutes
		const interval = setInterval(() => loadDashboardStats(), 5 * 60 * 1000);
		return () => clearInterval(interval);
	}, [loadDashboardStats]);

	const handleToggleFeature = async (key, displayName) => {
		try {
			setTogglingKeys(prev => ({ ...prev, [key]: true }));
			const result = await apiService.toggleFeatureVisibility(key);
			await refreshVisibility();
			toast.success(result.message || `${displayName} visibility updated`);
		} catch (error) {
			console.error(`Toggle ${key} error:`, error);
			toast.error(error.message || `Failed to update ${displayName} visibility`);
		} finally {
			setTogglingKeys(prev => ({ ...prev, [key]: false }));
		}
	};

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
				const API_BASE = (import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://dbu-student-portal-2.onrender.com/api' : 'http://localhost:5000/api')).replace(/\/api$/, "");
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

			// Build category for the post (map priority to important flag)
			const categoryMap = { 'Academic': 'Academic', 'Housing': 'Housing', 'Guidance': 'Guidance' };
			const postCategory = categoryMap[directiveForm.category] || 'General';

			// Save directive to database via API
			const postData = {
				title: directiveForm.title,
				content: directiveForm.message,
				type: 'Directive',
				category: postCategory,
				important: directiveForm.priority === 'Urgent',
				targetAudience: 'all',
				status: 'published',
				...(imageUrl && { image: imageUrl }),
			};

			const result = await apiService.createPost(postData);
			if (result?.success || result?.post) {
				// Reload directives from DB
				await loadDirectives();
				setShowPublishedDropdown(true);
				setShowDirectiveForm(false);
				setDirectiveForm({ title: '', category: 'Academic', priority: 'Normal', message: '' });
				setDirectiveImage(null);
				setDirectiveImagePreview(null);
				if (directiveFileRef.current) directiveFileRef.current.value = '';
				alert(imageUrl
					? '✅ Directive published and photo added to the homepage carousel!'
					: '✅ Directive published successfully to the main feed.');
			} else {
				throw new Error(result?.message || 'Failed to save directive to database');
			}
		} catch (err) {
			console.error('Directive post error:', err);
			alert('Failed to publish directive: ' + (err.message || 'Unknown error'));
		} finally {
			setDirectiveUploading(false);
		}
	};

	const handleDeleteDirective = async (id) => {
		if (!window.confirm('Delete this directive permanently?')) return;
		try {
			await apiService.deleteDirective(id);
			setDbDirectives(prev => prev.filter(d => d._id !== id));
			if (editingDirectiveId === id) setEditingDirectiveId(null);
		} catch (err) {
			alert('Failed to delete directive: ' + (err.message || 'Unknown error'));
		}
	};

	const handleStartEditDirective = (dir) => {
		setEditingDirectiveId(dir._id);
		setEditDirectiveForm({
			title: dir.title || '',
			category: dir.category || 'Academic',
			priority: dir.important ? 'Urgent' : 'Normal',
			message: dir.content || '',
		});
	};

	const handleCancelEditDirective = () => {
		setEditingDirectiveId(null);
		setEditDirectiveForm({ title: '', category: 'Academic', priority: 'Normal', message: '' });
	};

	const handleUpdateDirective = async (e, id) => {
		e.preventDefault();
		setEditDirectiveUploading(true);
		try {
			const categoryMap = { 'Academic': 'Academic', 'Housing': 'Housing', 'Guidance': 'Guidance' };
			const postCategory = categoryMap[editDirectiveForm.category] || 'General';
			const result = await apiService.updatePost(id, {
				title: editDirectiveForm.title,
				content: editDirectiveForm.message,
				category: postCategory,
				important: editDirectiveForm.priority === 'Urgent',
				type: 'Directive',
				status: 'published',
			});
			if (result?.success || result?.post) {
				await loadDirectives();
				setEditingDirectiveId(null);
				setEditDirectiveForm({ title: '', category: 'Academic', priority: 'Normal', message: '' });
				alert('✅ Directive updated successfully!');
			} else {
				throw new Error(result?.message || 'Failed to update directive');
			}
		} catch (err) {
			alert('Failed to update directive: ' + (err.message || 'Unknown error'));
		} finally {
			setEditDirectiveUploading(false);
		}
	};

	const handlePostEvent = (e) => {
		e.preventDefault();
		const current = JSON.parse(localStorage.getItem('club_events') || '[]');
		const newEvent = { ...eventForm, id: Date.now(), author: user?.name || 'Club Leader', timestamp: new Date().toISOString() };
		current.unshift(newEvent);
		localStorage.setItem('club_events', JSON.stringify(current));
		setClubEvents(current);
		setShowEventForm(false);
		setEventForm({ name: '', club: 'Tecktonic', date: '', location: '', description: '' });
		setShowEventsDropdown(true);
		alert("Club Event published successfully.");
	};

	const handleDeleteEvent = (id) => {
		if (!window.confirm('Delete this event permanently?')) return;
		const current = JSON.parse(localStorage.getItem('club_events') || '[]');
		const filtered = current.filter(evt => evt.id !== id);
		localStorage.setItem('club_events', JSON.stringify(filtered));
		setClubEvents(filtered);
		if (editingEventId === id) setEditingEventId(null);
	};

	const handleStartEditEvent = (evt) => {
		setEditingEventId(evt.id);
		setEditEventForm({
			name: evt.name || '',
			club: evt.club || 'Tecktonic',
			date: evt.date || '',
			location: evt.location || '',
			description: evt.description || '',
		});
	};

	const handleCancelEditEvent = () => {
		setEditingEventId(null);
		setEditEventForm({ name: '', club: 'Tecktonic', date: '', location: '', description: '' });
	};

	const handleUpdateEvent = (e, id) => {
		e.preventDefault();
		const current = JSON.parse(localStorage.getItem('club_events') || '[]');
		const updated = current.map(evt => {
			if (evt.id === id) {
				return {
					...evt,
					name: editEventForm.name,
					club: editEventForm.club,
					date: editEventForm.date,
					location: editEventForm.location,
					description: editEventForm.description,
					timestamp: new Date().toISOString(),
				};
			}
			return evt;
		});
		localStorage.setItem('club_events', JSON.stringify(updated));
		setClubEvents(updated);
		setEditingEventId(null);
		setEditEventForm({ name: '', club: 'Tecktonic', date: '', location: '', description: '' });
		alert("Club Event updated successfully.");
	};

	// Use database directives

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
				{(user?.isAdmin || ['Giziew', 'Sintayew', 'Sintayehu', 'Genete', 'Kalkidan'].some(name => user?.name?.includes(name))) && (
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

						<div className="p-4 sm:p-6 bg-white border-t border-gray-100">
							<button
								type="button"
								onClick={() => setShowPublishedDropdown(!showPublishedDropdown)}
								className="w-full flex items-center justify-between text-sm font-bold text-gray-700 uppercase tracking-wider py-2 hover:text-red-700 transition-colors focus:outline-none"
							>
								<span className="flex items-center gap-2">
									<FileText className="w-4 h-4 text-red-500" />
									Posted & Published Directives ({dbDirectives.length})
								</span>
								{showPublishedDropdown ? (
									<ChevronUp className="w-5 h-5 text-gray-500" />
								) : (
									<ChevronDown className="w-5 h-5 text-gray-500" />
								)}
							</button>

							<AnimatePresence>
								{showPublishedDropdown && (
									<motion.div
										initial={{ opacity: 0, height: 0 }}
										animate={{ opacity: 1, height: 'auto' }}
										exit={{ opacity: 0, height: 0 }}
										transition={{ duration: 0.2 }}
										className="space-y-4 mt-4 overflow-hidden"
									>
										{directivesLoading ? (
											<p className="text-gray-400 text-sm animate-pulse">Loading directives…</p>
										) : dbDirectives.length > 0 ? dbDirectives.map(dir => (
											<div key={dir._id} className="border border-gray-100 rounded-lg overflow-hidden group hover:border-red-200 transition-colors">
												{/* Directive summary row */}
												<div className="p-4 flex justify-between items-start hover:bg-gray-50">
													<div className="flex-1 min-w-0">
														<span className={`text-xs font-bold px-2 py-1 rounded-full mb-2 inline-block ${dir.important ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
															{dir.important ? 'Urgent' : 'Normal'}
														</span>
														<h5 className="font-bold text-gray-900 truncate">{dir.title}</h5>
														<p className="text-xs text-gray-500 mt-1">
															Posted {Math.floor((Date.now() - new Date(dir.createdAt).getTime()) / 60000)} min ago
															{dir.author?.name ? ` by ${dir.author.name}` : ''}
														</p>
													</div>
													<div className="flex gap-2 ml-3 flex-shrink-0">
														<button
															type="button"
															onClick={() => editingDirectiveId === dir._id ? handleCancelEditDirective() : handleStartEditDirective(dir)}
															className={`p-1.5 rounded border shadow-sm transition-colors ${
																editingDirectiveId === dir._id
																	? 'bg-amber-100 border-amber-300 text-amber-700 hover:bg-amber-200'
																	: 'bg-white border-gray-200 text-gray-400 hover:text-amber-600 hover:border-amber-300'
															}`}
															title={editingDirectiveId === dir._id ? 'Cancel edit' : 'Edit directive'}
														>
															{editingDirectiveId === dir._id ? <X className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
														</button>
														<button
															type="button"
															onClick={() => handleDeleteDirective(dir._id)}
															className="p-1.5 text-gray-400 hover:text-red-600 rounded bg-white shadow-sm border border-gray-200 hover:border-red-300 transition-colors"
															title="Delete directive"
														>
															<Trash2 className="w-4 h-4" />
														</button>
													</div>
												</div>

												{/* Inline Edit Form */}
												<AnimatePresence>
													{editingDirectiveId === dir._id && (
														<motion.div
															initial={{ opacity: 0, height: 0 }}
															animate={{ opacity: 1, height: 'auto' }}
															exit={{ opacity: 0, height: 0 }}
															transition={{ duration: 0.2 }}
														>
															<form
																onSubmit={(e) => handleUpdateDirective(e, dir._id)}
																className="p-4 bg-amber-50 border-t border-amber-100 space-y-3"
															>
																<p className="text-xs font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1">
																	<Pencil className="w-3 h-3" /> Editing Directive
																</p>
																<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
																	<div className="sm:col-span-2">
																		<label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
																		<input
																			required
																			value={editDirectiveForm.title}
																			onChange={e => setEditDirectiveForm({ ...editDirectiveForm, title: e.target.value })}
																			type="text"
																			className="w-full border border-amber-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 rounded-lg px-3 py-2 text-sm outline-none bg-white"
																		/>
																	</div>
																	<div>
																		<label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
																		<select
																			value={editDirectiveForm.category}
																			onChange={e => setEditDirectiveForm({ ...editDirectiveForm, category: e.target.value })}
																			className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm bg-white"
																		>
																			<option>Academic</option>
																			<option>Housing</option>
																			<option>Guidance</option>
																		</select>
																	</div>
																	<div>
																		<label className="block text-xs font-medium text-gray-700 mb-1">Priority</label>
																		<select
																			value={editDirectiveForm.priority}
																			onChange={e => setEditDirectiveForm({ ...editDirectiveForm, priority: e.target.value })}
																			className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm bg-white"
																		>
																			<option>Normal</option>
																			<option>Urgent</option>
																		</select>
																	</div>
																	<div className="sm:col-span-2">
																		<label className="block text-xs font-medium text-gray-700 mb-1">Message Body</label>
																		<textarea
																			required
																			rows={3}
																			value={editDirectiveForm.message}
																			onChange={e => setEditDirectiveForm({ ...editDirectiveForm, message: e.target.value })}
																			className="w-full border border-amber-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 rounded-lg px-3 py-2 text-sm outline-none bg-white resize-none"
																		/>
																	</div>
																</div>
																<div className="flex gap-2 pt-1">
																	<button
																		type="submit"
																		disabled={editDirectiveUploading}
																		className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
																	>
																		{editDirectiveUploading ? (
																			<><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</>
																		) : (
																			<><CheckCircle className="w-4 h-4" /> Save Changes</>
																		)}
																	</button>
																	<button
																		type="button"
																		onClick={handleCancelEditDirective}
																		className="flex items-center gap-2 bg-white hover:bg-gray-100 text-gray-600 text-sm font-medium px-4 py-2 rounded-lg border border-gray-200 transition-colors"
																	>
																		<X className="w-4 h-4" /> Cancel
																	</button>
																</div>
															</form>
														</motion.div>
													)}
												</AnimatePresence>
											</div>
										)) : (
											<p className="text-gray-500 text-sm">No directives posted yet.</p>
										)}
									</motion.div>
								)}
							</AnimatePresence>
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
											<option>Begoadragot</option>
											<option>Career Development</option>
											<option>Idea Hub</option>
											<option>Law Club</option>
											<option>Tecktonic</option>
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

						<div className="p-4 sm:p-6 bg-white border-t border-gray-100">
							<button
								type="button"
								onClick={() => setShowEventsDropdown(!showEventsDropdown)}
								className="w-full flex items-center justify-between text-sm font-bold text-gray-700 uppercase tracking-wider py-2 hover:text-blue-600 transition-colors focus:outline-none"
							>
								<span className="flex items-center gap-2">
									<Calendar className="w-4 h-4 text-blue-500" />
									Your Posted Events ({clubEvents.length})
								</span>
								{showEventsDropdown ? (
									<ChevronUp className="w-5 h-5 text-gray-500" />
								) : (
									<ChevronDown className="w-5 h-5 text-gray-500" />
								)}
							</button>

							<AnimatePresence>
								{showEventsDropdown && (
									<motion.div
										initial={{ opacity: 0, height: 0 }}
										animate={{ opacity: 1, height: 'auto' }}
										exit={{ opacity: 0, height: 0 }}
										transition={{ duration: 0.2 }}
										className="space-y-4 mt-4 overflow-hidden"
									>
										{clubEvents.length > 0 ? clubEvents.map(evt => (
											<div key={evt.id} className="border border-gray-100 rounded-lg overflow-hidden group hover:border-blue-200 transition-colors">
												{/* Event summary row */}
												<div className="p-4 flex justify-between items-start hover:bg-gray-50">
													<div className="flex-1 min-w-0">
														<span className="text-xs font-bold px-2 py-1 rounded-full mb-2 inline-block bg-blue-50 text-blue-700">
															{evt.club}
														</span>
														<h5 className="font-bold text-gray-900 truncate">{evt.name}</h5>
														<div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mt-1">
															<span>📅 {evt.date ? new Date(evt.date).toLocaleString() : 'N/A'}</span>
															<span>📍 {evt.location}</span>
														</div>
														{evt.description && (
															<p className="text-xs text-gray-600 mt-2 line-clamp-2">{evt.description}</p>
														)}
													</div>
													<div className="flex gap-2 ml-3 flex-shrink-0">
														<button
															type="button"
															onClick={() => editingEventId === evt.id ? handleCancelEditEvent() : handleStartEditEvent(evt)}
															className={`p-1.5 rounded border shadow-sm transition-colors ${
																editingEventId === evt.id
																	? 'bg-blue-100 border-blue-300 text-blue-700 hover:bg-blue-200'
																	: 'bg-white border-gray-200 text-gray-400 hover:text-blue-600 hover:border-blue-300'
															}`}
															title={editingEventId === evt.id ? 'Cancel edit' : 'Edit event'}
														>
															{editingEventId === evt.id ? <X className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
														</button>
														<button
															type="button"
															onClick={() => handleDeleteEvent(evt.id)}
															className="p-1.5 text-gray-400 hover:text-red-600 rounded bg-white shadow-sm border border-gray-200 hover:border-red-300 transition-colors"
															title="Delete event"
														>
															<Trash2 className="w-4 h-4" />
														</button>
													</div>
												</div>

												{/* Inline Edit Form */}
												<AnimatePresence>
													{editingEventId === evt.id && (
														<motion.div
															initial={{ opacity: 0, height: 0 }}
															animate={{ opacity: 1, height: 'auto' }}
															exit={{ opacity: 0, height: 0 }}
															transition={{ duration: 0.2 }}
														>
															<form
																onSubmit={(e) => handleUpdateEvent(e, evt.id)}
																className="p-4 bg-blue-50 border-t border-blue-100 space-y-3"
															>
																<p className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1">
																	<Pencil className="w-3 h-3" /> Editing Event
																</p>
																<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
																	<div className="sm:col-span-2">
																		<label className="block text-xs font-medium text-gray-700 mb-1">Event Name</label>
																		<input
																			required
																			value={editEventForm.name}
																			onChange={e => setEditEventForm({ ...editEventForm, name: e.target.value })}
																			type="text"
																			className="w-full border border-blue-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded-lg px-3 py-2 text-sm outline-none bg-white"
																		/>
																	</div>
																	<div>
																		<label className="block text-xs font-medium text-gray-700 mb-1">Club Name</label>
																		<select
																			value={editEventForm.club}
																			onChange={e => setEditEventForm({ ...editEventForm, club: e.target.value })}
																			className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm bg-white"
																		>
																			<option>Begoadragot</option>
																			<option>Career Development</option>
																			<option>Idea Hub</option>
																			<option>Law Club</option>
																			<option>Tecktonic</option>
																		</select>
																	</div>
																	<div>
																		<label className="block text-xs font-medium text-gray-700 mb-1">Date & Time</label>
																		<input
																			required
																			value={editEventForm.date}
																			onChange={e => setEditEventForm({ ...editEventForm, date: e.target.value })}
																			type="datetime-local"
																			className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm bg-white"
																		/>
																	</div>
																	<div className="sm:col-span-2">
																		<label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
																		<input
																			required
																			value={editEventForm.location}
																			onChange={e => setEditEventForm({ ...editEventForm, location: e.target.value })}
																			type="text"
																			className="w-full border border-blue-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded-lg px-3 py-2 text-sm outline-none bg-white"
																		/>
																	</div>
																	<div className="sm:col-span-2">
																		<label className="block text-xs font-medium text-gray-700 mb-1">Event Description</label>
																		<textarea
																			required
																			rows={2}
																			value={editEventForm.description}
																			onChange={e => setEditEventForm({ ...editEventForm, description: e.target.value })}
																			className="w-full border border-blue-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded-lg px-3 py-2 text-sm outline-none bg-white resize-none"
																		/>
																	</div>
																</div>
																<div className="flex gap-2 pt-1">
																	<button
																		type="submit"
																		className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
																	>
																		<CheckCircle className="w-4 h-4" /> Save Changes
																	</button>
																	<button
																		type="button"
																		onClick={handleCancelEditEvent}
																		className="flex items-center gap-2 bg-white hover:bg-gray-100 text-gray-600 text-sm font-medium px-4 py-2 rounded-lg border border-gray-200 transition-colors"
																	>
																		<X className="w-4 h-4" /> Cancel
																	</button>
																</div>
															</form>
														</motion.div>
													)}
												</AnimatePresence>
											</div>
										)) : (
											<p className="text-gray-500 text-sm">No recent events posted.</p>
										)}
									</motion.div>
								)}
							</AnimatePresence>
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
						{electionVisible && (
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
						)}

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

			{/* ── Presentation Controls ─────────────────────────────────────── */}
			{isElectionToggler && (
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.65 }}
					className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-6 shadow-lg border border-slate-700 text-left"
				>
					<div className="flex items-center gap-3 mb-5">
						<div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center flex-shrink-0">
							<span className="text-lg">🎛️</span>
						</div>
						<div>
							<h3 className="text-lg font-bold text-white">Presentation Controls</h3>
							<p className="text-sm text-slate-400">Master switches for feature visibility during evaluations</p>
						</div>
					</div>

					<div className="grid grid-cols-1 gap-4 mt-4">
						{[
							{
								key: 'electionVisible',
								label: '🗳️ Election Portal Status',
								visible: electionVisible,
								desc: 'Elections link shows in nav & dashboard'
							},
							{
								key: 'leadershipVisible',
								label: '🏛️ Union & Leadership Dropdown Status',
								visible: leadershipVisible,
								desc: 'Main dropdown folder in header navbar'
							},
							{
								key: 'clubsVisible',
								label: '♣️ Clubs & Associations Panel Status',
								visible: clubsVisible,
								desc: 'Clubs and associations page and menu'
							},
							{
								key: 'servicesVisible',
								label: '🛠️ Services & Requests Module Status',
								visible: servicesVisible,
								desc: 'Services booking & forms dashboard link'
							},
							{
								key: 'complaintsVisible',
								label: '📢 Complaints & Grievance Portal Status',
								visible: complaintsVisible,
								desc: 'Complaints submittal and tracking feed'
							}
						].map((item) => (
							<div key={item.key} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-700/50 rounded-xl p-4 border border-slate-600 transition-all duration-200 hover:bg-slate-700/80">
								<div className="flex items-center gap-3">
									<div className={`w-3 h-3 rounded-full flex-shrink-0 ${
										item.visible ? 'bg-emerald-400 shadow-emerald-400/50 shadow-[0_0_8px_2px]' : 'bg-red-400 shadow-red-400/50 shadow-[0_0_8px_2px]'
									}`} />
									<div>
										<p className="text-white font-semibold text-sm">{item.label}</p>
										<p className="text-slate-400 text-xs mt-0.5">
											{item.visible
												? `Currently visible — ${item.desc}`
												: `Currently hidden — Removed from all views`}
										</p>
									</div>
								</div>

								<button
									onClick={() => handleToggleFeature(item.key, item.label)}
									disabled={togglingKeys[item.key]}
									className={`relative inline-flex items-center gap-3 px-5 py-2.5 rounded-lg font-bold text-sm transition-all duration-200 min-w-[180px] justify-center ${
										item.visible
											? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/30'
											: 'bg-red-500 hover:bg-red-600 text-white shadow-md shadow-red-500/30'
									} disabled:opacity-60 disabled:cursor-not-allowed`}
								>
									{togglingKeys[item.key] ? (
										<>
											<svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
												<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
												<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
											</svg>
											Updating...
										</>
									) : (
										<>
											<span className="text-base">{item.visible ? '👁️' : '🙈'}</span>
											{item.visible ? 'HIDE Option' : 'SHOW Option'}
										</>
									)}
								</button>
							</div>
						))}
					</div>

					<p className="text-xs text-slate-500 mt-4">
						⚠️ Changes take effect immediately across all active sessions. State is persisted to the database.
					</p>
				</motion.div>
			)}

			{/* 🏛️ Major Leadership Branch Creator — Admin Only */}
			{user?.isAdmin && (
				<LeadershipBranchCreator apiService={apiService} />
			)}
		</div>
	);
}
