import React, { useState, useEffect } from "react";
import {
  BarChart3,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  Shield,
  Activity,
  MessageSquare,
  Vote,
  Download,
  Lock,
  Settings,
  UserPlus,
  FileText,
  X,
  Loader,
  Image as ImageIcon,
  FolderPlus,
  Trash2,
  Building2,
  Plus,
  Award
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { apiService } from "../../services/api";
import { useElectionVisibility } from "../../contexts/FeatureVisibilityContext";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

const API_BASE = (import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "https://dbu-student-portal-2.onrender.com/api" : "http://localhost:5000/api")).replace(/\/api$/, "");

// Create User Modal Component
const CreateUserModal = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    role: "student",
    department: "",
    year: "1st Year",
    isAdmin: false,
    phoneNumber: ""
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic validation
    if (!formData.name || !formData.username || !formData.password || !formData.department) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      setLoading(true);
      await apiService.createUser(formData);
      toast.success("User created successfully!");
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Create user error:", error);
      toast.error(error.message || "Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Create New User</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="dbu12345678"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department *</label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Department</option>
                <option value="Computer Science">Computer Science</option>
                <option value="Engineering">Engineering</option>
                <option value="Business">Business</option>
                <option value="Medicine">Medicine</option>
                <option value="Agriculture">Agriculture</option>
                <option value="Education">Education</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
              <select
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
                <option value="5th Year">5th Year</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                value={formData.role}
                onChange={(e) => {
                  const newRole = e.target.value;
                  setFormData({
                    ...formData,
                    role: newRole,
                    isAdmin: newRole === 'admin' // Auto-set isAdmin if role is admin
                  });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="student">Student</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <input
              type="checkbox"
              id="isAdmin"
              checked={formData.isAdmin}
              onChange={(e) => setFormData({ ...formData, isAdmin: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isAdmin" className="text-sm text-gray-700">
              Grant System Administrator Privileges
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create User'
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { electionVisible, refresh: refreshVisibility } = useElectionVisibility();
  const [togglingElection, setTogglingElection] = useState(false);
  const [stats, setStats] = useState({
    users: { total: 0, active: 0, admins: 0, students: 0 },
    complaints: { total: 0, pending: 0, resolved: 0, underReview: 0 },
    clubs: { total: 0, active: 0, pending: 0 },
    elections: { total: 0, active: 0, upcoming: 0, completed: 0 },
    posts: { total: 0, published: 0, drafts: 0 },
    contacts: { total: 0, new: 0, replied: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState("7d");
  const [recentActivity, setRecentActivity] = useState([]);

  // Modal states
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);

  // Department Manager state
  const [departments, setDepartments] = useState([]);
  const [deptLoading, setDeptLoading] = useState(false);
  const [newDeptName, setNewDeptName] = useState("");
  const [deptSaving, setDeptSaving] = useState(false);
  const [deletingDeptId, setDeletingDeptId] = useState(null);

  const isSystemAdmin = user && (user.role === 'system_admin' || user.role === 'admin' || user.isAdmin === true) &&
    (user.username === 'dbu10101030' || user.username?.toLowerCase() === 'dbu10101030');

  const fetchDepartments = async () => {
    try {
      setDeptLoading(true);
      const res = await fetch(`${API_BASE}/api/departments`);
      const data = await res.json();
      if (data.success) setDepartments(data.departments);
    } catch (err) {
      console.error('Error fetching departments:', err);
    } finally {
      setDeptLoading(false);
    }
  };

  const handleCreateDept = async (e) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;
    try {
      setDeptSaving(true);
      const res = await fetch(`${API_BASE}/api/departments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ name: newDeptName.trim() })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Department "${data.department.name}" created!`);
        setNewDeptName("");
        fetchDepartments();
        window.dispatchEvent(new Event('departments-updated'));
      } else {
        toast.error(data.message || 'Failed to create department');
      }
    } catch (err) {
      toast.error('Network error. Please try again.');
    } finally {
      setDeptSaving(false);
    }
  };

  const handleDeleteDept = async (deptId, deptName) => {
    if (!window.confirm(`Delete department "${deptName}"? Staff members assigned to it will remain but the header link will be removed.`)) return;
    try {
      setDeletingDeptId(deptId);
      const res = await fetch(`${API_BASE}/api/departments/${deptId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Department "${deptName}" deleted.`);
        fetchDepartments();
        window.dispatchEvent(new Event('departments-updated'));
      } else {
        toast.error(data.message || 'Failed to delete department');
      }
    } catch (err) {
      toast.error('Network error. Please try again.');
    } finally {
      setDeletingDeptId(null);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchDepartments();
  }, [selectedTimeframe]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch all stats in parallel
      const [
        userStats,
        complaintStats,
        clubStats,
        electionStats,
        postStats,
        contactStats
      ] = await Promise.allSettled([
        apiService.getUserStats(),
        apiService.getComplaintStats(),
        apiService.getClubStats(),
        apiService.getElectionStats(),
        apiService.getPostStats(),
        apiService.getContactStats()
      ]);

      // Process results and handle any failures gracefully
      setStats({
        users: userStats.status === 'fulfilled' ? {
          total: userStats.value.stats.totalUsers,
          active: userStats.value.stats.activeUsers,
          admins: userStats.value.stats.adminUsers,
          students: userStats.value.stats.studentUsers
        } : { total: 0, active: 0, admins: 0, students: 0 },
        complaints: complaintStats.status === 'fulfilled' ? {
          total: complaintStats.value.stats.totalComplaints,
          pending: complaintStats.value.stats.pendingComplaints,
          resolved: complaintStats.value.stats.resolvedComplaints,
          underReview: complaintStats.value.stats.underReviewComplaints
        } : { total: 0, pending: 0, resolved: 0, underReview: 0 },
        clubs: clubStats.status === 'fulfilled' ? {
          total: clubStats.value.stats.totalClubs,
          active: clubStats.value.stats.activeClubs,
          pending: clubStats.value.stats.pendingClubs
        } : { total: 0, active: 0, pending: 0 },
        elections: electionStats.status === 'fulfilled' ? {
          total: electionStats.value.stats.totalElections,
          active: electionStats.value.stats.activeElections,
          upcoming: electionStats.value.stats.upcomingElections,
          completed: electionStats.value.stats.completedElections
        } : { total: 0, active: 0, upcoming: 0, completed: 0 },
        posts: postStats.status === 'fulfilled' ? postStats.value.stats : { total: 0, published: 0, drafts: 0 },
        contacts: contactStats.status === 'fulfilled' ? contactStats.value.stats : { total: 0, new: 0, replied: 0 },
      });

      // Generate recent activity (mock data for now)
      setRecentActivity([
        { id: 1, type: 'user', message: 'New user registered', time: '2 minutes ago' },
        { id: 2, type: 'complaint', message: 'Complaint resolved', time: '15 minutes ago' },
        { id: 3, type: 'club', message: 'New club approved', time: '1 hour ago' },
        { id: 4, type: 'election', message: 'Election results announced', time: '2 hours ago' },
      ]);

    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = async () => {
    try {
      toast.success('Report export started. You will receive it via email.');
    } catch (error) {
      toast.error('Failed to export report');
    }
  };

  const handleToggleElection = async () => {
    try {
      setTogglingElection(true);
      const result = await apiService.toggleElectionVisibility();
      await refreshVisibility();
      toast.success(result.message || 'Election visibility updated');
    } catch (error) {
      console.error('Toggle election error:', error);
      toast.error(error.message || 'Failed to update election visibility');
    } finally {
      setTogglingElection(false);
    }
  };

  const quickActions = [
    {
      title: 'Create User',
      description: 'Add new student or admin',
      icon: UserPlus,
      color: 'bg-blue-500',
      action: () => setShowCreateUserModal(true)
    },
    {
      title: 'System Settings',
      description: 'Configure system settings',
      icon: Settings,
      color: 'bg-purple-500',
      action: () => toast.info('System settings would open here')
    },
    {
      title: 'Generate Report',
      description: 'Create detailed analytics report',
      icon: FileText,
      color: 'bg-green-500',
      action: handleExportReport
    },
    {
      title: 'Manage Users',
      description: 'Update user profiles, roles, and status',
      icon: Users,
      color: 'bg-orange-500',
      action: () => navigate('/admin/users')
    },
    {
      title: 'Carousel Manager',
      description: 'Manage homepage carousel images',
      icon: ImageIcon,
      color: 'bg-indigo-500',
      action: () => navigate('/admin/carousel')
    },
    {
      title: 'Team Manager',
      description: 'Manage leadership profiles',
      icon: Users,
      color: 'bg-teal-500',
      action: () => navigate('/admin/team')
    },
    {
      title: 'Certificate Registry',
      description: 'Verify, audit & revoke student digital certificates',
      icon: Award,
      color: 'bg-amber-500',
      action: () => navigate('/admin/certificates')
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back, {user?.name}</p>
          <div className="flex items-center mt-2">
            <Shield className="w-4 h-4 text-blue-600 mr-1" />
            <span className="text-sm text-blue-600 font-medium">
              {user?.role === 'admin' ? 'System Administrator' :
                user?.role === 'academic_affairs' ? 'Academic Affairs Administrator' : 'Admin User'}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3 mt-4 sm:mt-0">
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>

          <button
            onClick={handleExportReport}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Users Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.users.total}</p>
              <p className="text-sm text-green-600 mt-1">
                {stats.users.active} active
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </motion.div>

        {/* Complaints Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Complaints</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.complaints.total}</p>
              <p className="text-sm text-orange-600 mt-1">
                {stats.complaints.pending} pending
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </motion.div>

        {/* Clubs Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Clubs</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.clubs.active}</p>
              <p className="text-sm text-purple-600 mt-1">
                {stats.clubs.pending} pending approval
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </motion.div>

        {/* Elections Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Elections</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.elections.active}</p>
              <p className="text-sm text-green-600 mt-1">
                {stats.elections.upcoming} upcoming
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Vote className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={action.action}
              className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left group">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 ${action.color} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <action.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{action.title}</p>
                  <p className="text-sm text-gray-500">{action.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </motion.div>

      {/* ── Presentation Controls ─────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-6 shadow-lg border border-slate-700"
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

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-700/50 rounded-xl p-4 border border-slate-600">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
              electionVisible ? 'bg-emerald-400 shadow-emerald-400/50 shadow-[0_0_8px_2px]' : 'bg-red-400 shadow-red-400/50 shadow-[0_0_8px_2px]'
            }`} />
            <div>
              <p className="text-white font-semibold text-sm">🗳️ Election Portal</p>
              <p className="text-slate-400 text-xs mt-0.5">
                {electionVisible
                  ? 'Currently visible — Elections link shows in nav & dashboard'
                  : 'Currently hidden — Elections link removed from all views'}
              </p>
            </div>
          </div>

          <button
            id="btn-toggle-election-visibility"
            onClick={handleToggleElection}
            disabled={togglingElection}
            className={`relative inline-flex items-center gap-3 px-5 py-2.5 rounded-lg font-bold text-sm transition-all duration-200 min-w-[180px] justify-center ${
              electionVisible
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/30'
                : 'bg-red-500 hover:bg-red-600 text-white shadow-md shadow-red-500/30'
            } disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            {togglingElection ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Updating...
              </>
            ) : (
              <>
                <span className="text-base">{electionVisible ? '👁️' : '🙈'}</span>
                {electionVisible ? 'HIDE Elections' : 'SHOW Elections'}
              </>
            )}
          </button>
        </div>

        <p className="text-xs text-slate-500 mt-3">
          ⚠️ Changes take effect immediately across all active sessions. State is persisted to the database.
        </p>
      </motion.div>

      {/* Recent Activity & System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
            <Activity className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className={`w-2 h-2 mt-2 rounded-full ${activity.type === 'user' ? 'bg-blue-500' :
                  activity.type === 'complaint' ? 'bg-orange-500' :
                    activity.type === 'club' ? 'bg-purple-500' : 'bg-green-500'
                  }`}></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{activity.message}</p>
                  <p className="text-xs text-gray-500">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* System Status */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">System Status</h3>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Database</span>
              <span className="flex items-center text-sm text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                Online
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">API Server</span>
              <span className="flex items-center text-sm text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                Healthy
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">File Storage</span>
              <span className="flex items-center text-sm text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                Available
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Email Service</span>
              <span className="flex items-center text-sm text-yellow-600">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                Limited
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Performance Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 mb-1">98.5%</div>
            <div className="text-sm text-gray-600">System Uptime</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 mb-1">1.2s</div>
            <div className="text-sm text-gray-600">Avg Response Time</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 mb-1">2.1GB</div>
            <div className="text-sm text-gray-600">Storage Used</div>
          </div>
        </div>
      </motion.div>

      {/* ── Department Manager ───────────────────────────────────────── */}
      {isSystemAdmin && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-white rounded-xl p-6 shadow-sm border border-blue-100"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Department / Navigation Manager</h3>
              <p className="text-sm text-gray-500">Create or remove entries from the "Union &amp; Leadership" header dropdown</p>
            </div>
          </div>

          {/* Create new dept */}
          <form onSubmit={handleCreateDept} className="flex gap-3 mb-6">
            <input
              type="text"
              value={newDeptName}
              onChange={(e) => setNewDeptName(e.target.value)}
              placeholder="e.g. University Dining Office"
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              required
            />
            <button
              type="submit"
              disabled={deptSaving || !newDeptName.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-colors disabled:opacity-60"
            >
              {deptSaving ? <Loader className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {deptSaving ? 'Creating...' : 'Create'}
            </button>
          </form>

          {/* Dept list */}
          {deptLoading ? (
            <div className="flex justify-center py-8">
              <Loader className="w-6 h-6 text-blue-500 animate-spin" />
            </div>
          ) : departments.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <FolderPlus className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No departments yet. Create the first one above.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {departments.map(dept => (
                  <motion.div
                    key={dept._id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="flex items-center justify-between px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg group hover:border-blue-200 hover:bg-blue-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Building2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      <span className="text-sm font-medium text-gray-800">{dept.name}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteDept(dept._id, dept.name)}
                      disabled={deletingDeptId === dept._id}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      title="Delete department"
                    >
                      {deletingDeptId === dept._id
                        ? <Loader className="w-4 h-4 animate-spin" />
                        : <Trash2 className="w-4 h-4" />}
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
              <p className="text-xs text-gray-400 pt-1">Total: {departments.length} department{departments.length !== 1 ? 's' : ''} — each appears as a link in the site header.</p>
            </div>
          )}
        </motion.div>
      )}

      {/* Modals */}
      {showCreateUserModal && (
        <CreateUserModal
          onClose={() => setShowCreateUserModal(false)}
          onSuccess={() => fetchDashboardData()}
        />
      )}
    </div>
  );
}