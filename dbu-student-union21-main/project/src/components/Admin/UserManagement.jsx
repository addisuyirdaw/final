/** @format */
import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { apiService } from "../../services/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  UserPlus,
  Search,
  Filter,
  RefreshCw,
  Edit2,
  Trash2,
  Lock,
  Shield,
  Activity,
  AlertTriangle,
  CheckCircle,
  X,
  ChevronLeft,
  ChevronRight,
  Phone,
  GraduationCap,
  Calendar,
  LockKeyhole,
  CheckCircle2,
  UserCheck,
  UserX,
  FileSpreadsheet
} from "lucide-react";
import toast from "react-hot-toast";

export function UserManagement() {
  const { user: currentUser } = useAuth();
  
  // State variables
  const [users, setUsers] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  
  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  
  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Forms state
  const [createForm, setCreateForm] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    role: "student",
    department: "",
    year: "1st Year",
    isAdmin: false,
    phoneNumber: "",
    address: ""
  });

  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    role: "student",
    department: "",
    year: "1st Year",
    isActive: true,
    isAdmin: false,
    phoneNumber: "",
    address: "",
    isRestricted: false,
    restrictionReason: ""
  });

  const [newPassword, setNewPassword] = useState("");
  const [resetConfirmPass, setResetConfirmPass] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Quick stats computed or fetched
  const [summaryStats, setSummaryStats] = useState({
    total: 0,
    active: 0,
    admins: 0,
    restricted: 0
  });

  useEffect(() => {
    fetchUsers();
  }, [currentPage, selectedRole, selectedDept, selectedYear]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: 8,
        search: searchTerm,
        role: selectedRole,
        department: selectedDept,
        year: selectedYear
      };

      const res = await apiService.getUsers(params);
      if (res.success) {
        setUsers(res.users || []);
        setTotalUsers(res.total || 0);
        setTotalPages(res.pages || 1);
        
        // Also fetch general user statistics for dashboard overview
        try {
          const statsRes = await apiService.getUserStats();
          if (statsRes.success && statsRes.stats) {
            setSummaryStats({
              total: statsRes.stats.totalUsers || 0,
              active: statsRes.stats.activeUsers || 0,
              admins: statsRes.stats.adminUsers || 0,
              restricted: statsRes.stats.restrictedUsers || 0
            });
          }
        } catch {
          // Fallback static computations if general stats fails
          setSummaryStats({
            total: res.total || 0,
            active: (res.users || []).filter(u => u.isActive).length,
            admins: (res.users || []).filter(u => u.isAdmin || u.role === 'admin').length,
            restricted: (res.users || []).filter(u => u.isRestricted).length
          });
        }
      }
    } catch (err) {
      console.error("Failed to load users", err);
      toast.error("Failed to retrieve user registry");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchUsers();
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setSelectedRole("");
    setSelectedDept("");
    setSelectedYear("");
    setCurrentPage(1);
    // Directly trigger fetch by clearing local states
    setTimeout(() => fetchUsers(), 0);
  };

  // Create User
  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!createForm.name || !createForm.username || !createForm.password || !createForm.department) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      setActionLoading(true);
      const res = await apiService.createUser(createForm);
      if (res.success) {
        toast.success("New user/leader profile created!");
        setShowCreateModal(false);
        setCreateForm({
          name: "",
          username: "",
          email: "",
          password: "",
          role: "student",
          department: "",
          year: "1st Year",
          isAdmin: false,
          phoneNumber: "",
          address: ""
        });
        fetchUsers();
      }
    } catch (err) {
      console.error("Create user error", err);
      toast.error(err.message || "Failed to create user");
    } finally {
      setActionLoading(false);
    }
  };

  // Edit User Modal Opening
  const handleOpenEdit = (user) => {
    setSelectedUser(user);
    setEditForm({
      name: user.name || "",
      email: user.email || "",
      role: user.role || "student",
      department: user.department || "",
      year: user.year || "1st Year",
      isActive: user.isActive !== undefined ? user.isActive : true,
      isAdmin: user.isAdmin !== undefined ? user.isAdmin : false,
      phoneNumber: user.phoneNumber || "",
      address: user.address || "",
      isRestricted: user.isRestricted !== undefined ? user.isRestricted : false,
      restrictionReason: user.restrictionReason || ""
    });
    setShowEditModal(true);
  };

  // Update User
  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      setActionLoading(true);
      const res = await apiService.updateUser(selectedUser._id, editForm);
      if (res.success) {
        toast.success("User profile updated successfully!");
        setShowEditModal(false);
        setSelectedUser(null);
        fetchUsers();
      }
    } catch (err) {
      console.error("Update user error", err);
      toast.error(err.message || "Failed to update profile");
    } finally {
      setActionLoading(false);
    }
  };

  // Reset Password Modal Opening
  const handleOpenReset = (user) => {
    setSelectedUser(user);
    setNewPassword("");
    setResetConfirmPass("");
    setShowResetModal(true);
  };

  // Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== resetConfirmPass) {
      toast.error("Passwords do not match");
      return;
    }

    try {
      setActionLoading(true);
      const res = await apiService.resetUserPassword(selectedUser._id, { password: newPassword });
      if (res.success) {
        toast.success(`Password for ${selectedUser.name} reset successfully!`);
        setShowResetModal(false);
        setSelectedUser(null);
      }
    } catch (err) {
      console.error("Reset password error", err);
      toast.error(err.message || "Failed to reset password");
    } finally {
      setActionLoading(false);
    }
  };

  // Delete User
  const handleDeleteUser = async (user) => {
    if (user._id === currentUser.id) {
      toast.error("You cannot delete your own administrative account");
      return;
    }

    if (!window.confirm(`Are you absolutely sure you want to permanently delete the profile of ${user.name}? This cannot be undone.`)) {
      return;
    }

    try {
      const res = await apiService.deleteUser(user._id);
      if (res.success) {
        toast.success(`Profile of ${user.name} removed successfully.`);
        fetchUsers();
      }
    } catch (err) {
      console.error("Delete user error", err);
      toast.error(err.message || "Failed to delete user profile");
    }
  };

  const getRoleBadge = (role) => {
    const roles = {
      student: { label: "Student", style: "bg-gray-100 text-gray-800 border-gray-200" },
      admin: { label: "System Admin", style: "bg-red-50 text-red-700 border-red-100" },
      president: { label: "Union President", style: "bg-blue-50 text-blue-700 border-blue-100 font-semibold" },
      council_president: { label: "Council President", style: "bg-indigo-50 text-indigo-700 border-indigo-100 font-semibold" },
      council_secretary: { label: "Council Secretary", style: "bg-purple-50 text-purple-700 border-purple-100" },
      clubs_coordinator: { label: "Clubs Coordinator", style: "bg-emerald-50 text-emerald-700 border-emerald-100" },
      academic_affairs: { label: "Academic Affairs", style: "bg-amber-50 text-amber-700 border-amber-100" },
      system_admin: { label: "Super Admin", style: "bg-rose-100 text-rose-800 border-rose-200 font-bold" }
    };
    
    const config = roles[role] || { label: role, style: "bg-sky-50 text-sky-800 border-sky-100" };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border font-medium ${config.style}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Users className="w-8 h-8 text-sky-600" />
              User &amp; Leader Workspace
            </h1>
            <p className="text-gray-600 mt-1">
              Add new student union profiles, manage system roles, reset credentials, and audit active users.
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm transition-colors"
          >
            <UserPlus className="w-5 h-5" />
            Add New Person
          </button>
        </div>

        {/* Audit Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Users */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Members</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{summaryStats.total}</p>
            </div>
            <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
          </div>
          
          {/* Active Users */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Access</p>
              <p className="text-3xl font-bold text-emerald-600 mt-1">{summaryStats.active}</p>
            </div>
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
              <UserCheck className="w-6 h-6" />
            </div>
          </div>

          {/* Administrators */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Administrators</p>
              <p className="text-3xl font-bold text-purple-600 mt-1">{summaryStats.admins}</p>
            </div>
            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center">
              <Shield className="w-6 h-6" />
            </div>
          </div>

          {/* Restricted Accounts */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Restricted Accounts</p>
              <p className="text-3xl font-bold text-red-600 mt-1">{summaryStats.restricted}</p>
            </div>
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Workspace Workspace Section */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          
          {/* Search & Filtering Utilities */}
          <div className="p-6 border-b border-gray-100 bg-gray-50/50 space-y-4">
            <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-4">
              {/* Search bar */}
              <div className="relative flex-1">
                <Search className="w-5 h-5 text-gray-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Search by name, student ID, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none text-sm text-gray-800"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="bg-gray-900 hover:bg-gray-800 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2"
                >
                  <Search className="w-4 h-4" /> Search
                </button>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="bg-white hover:bg-gray-100 text-gray-700 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5"
                  title="Reset Filters"
                >
                  <RefreshCw className="w-4 h-4" /> Reset
                </button>
              </div>
            </form>

            <div className="flex flex-wrap items-center gap-4 text-sm pt-2">
              <span className="text-gray-500 font-semibold flex items-center gap-1">
                <Filter className="w-4 h-4" /> Filter by:
              </span>
              
              {/* Role filter */}
              <select
                value={selectedRole}
                onChange={(e) => { setSelectedRole(e.target.value); setCurrentPage(1); }}
                className="px-3 py-1.5 border border-gray-200 rounded-lg outline-none text-xs bg-white text-gray-700"
              >
                <option value="">All Roles</option>
                <option value="student">Student</option>
                <option value="admin">System Admin</option>
                <option value="president">Union President</option>
                <option value="council_president">Council President</option>
                <option value="council_secretary">Council Secretary</option>
                <option value="clubs_coordinator">Clubs Coordinator</option>
                <option value="academic_affairs">Academic Affairs</option>
              </select>

              {/* Department filter */}
              <select
                value={selectedDept}
                onChange={(e) => { setSelectedDept(e.target.value); setCurrentPage(1); }}
                className="px-3 py-1.5 border border-gray-200 rounded-lg outline-none text-xs bg-white text-gray-700"
              >
                <option value="">All Departments</option>
                <option value="Computer Science">Computer Science</option>
                <option value="Electrical Engineering">Electrical Engineering</option>
                <option value="Civil Engineering">Civil Engineering</option>
                <option value="Mechanical Engineering">Mechanical Engineering</option>
                <option value="Chemical Engineering">Chemical Engineering</option>
                <option value="Accounting & Finance">Accounting & Finance</option>
                <option value="Economics">Economics</option>
                <option value="Medicine">Medicine</option>
                <option value="Public Health">Public Health</option>
                <option value="Law">Law</option>
              </select>

              {/* Academic Year filter */}
              <select
                value={selectedYear}
                onChange={(e) => { setSelectedYear(e.target.value); setCurrentPage(1); }}
                className="px-3 py-1.5 border border-gray-200 rounded-lg outline-none text-xs bg-white text-gray-700"
              >
                <option value="">All Years</option>
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
                <option value="5th Year">5th Year</option>
              </select>
            </div>
          </div>

          {/* User Data Table */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex flex-col justify-center items-center py-24">
                <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-500 text-sm mt-4 font-medium">Scanning user databases...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-20 bg-white">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-900 mb-1">No users found</h3>
                <p className="text-gray-500 text-sm">
                  Try adjusting your search criteria or register a new user.
                </p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100/75 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="px-6 py-4">User Details</th>
                    <th className="px-6 py-4">Student ID</th>
                    <th className="px-6 py-4">Department &amp; Year</th>
                    <th className="px-6 py-4">Role Badge</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                  {users.map((item) => (
                    <tr
                      key={item._id}
                      className={`hover:bg-sky-50/20 transition-colors ${
                        !item.isActive ? "bg-gray-50/50 opacity-75" : ""
                      }`}
                    >
                      {/* Name & Avatar */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={item.profileImage || "https://images.pexels.com/photos/3763188/pexels-photo-3763188.jpeg?auto=compress&cs=tinysrgb&w=400"}
                            alt={item.name}
                            className="w-10 h-10 rounded-full object-cover border border-sky-100 bg-white"
                            onError={(e) => {
                              e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=f0f9ff&color=0369a1&size=64`;
                            }}
                          />
                          <div>
                            <p className="font-bold text-gray-900 leading-tight">{item.name}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{item.email || "No email registered"}</p>
                            {item.phoneNumber && (
                              <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                                <Phone className="w-2.5 h-2.5" /> {item.phoneNumber}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Student ID */}
                      <td className="px-6 py-4 font-mono font-semibold text-gray-800 tracking-wider">
                        {item.username?.toUpperCase()}
                      </td>

                      {/* Department & Year */}
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-800">{item.department || "N/A"}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{item.year || "N/A"}</p>
                      </td>

                      {/* Role */}
                      <td className="px-6 py-4">
                        {getRoleBadge(item.role)}
                      </td>

                      {/* Status Badges */}
                      <td className="px-6 py-4 space-y-1">
                        <div>
                          {item.isActive ? (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-gray-400 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span> Deactivated
                            </span>
                          )}
                        </div>
                        {item.isRestricted && (
                          <div>
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-50 border border-red-100 text-[10px] text-red-600 rounded-md font-semibold">
                              Blocked
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Edit Details */}
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 text-sky-600 hover:text-sky-800 hover:bg-sky-50 rounded-lg transition-colors border border-sky-100"
                            title="Edit Profile"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          
                          {/* Reset Password */}
                          <button
                            onClick={() => handleOpenReset(item)}
                            className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors border border-amber-100"
                            title="Reset Credentials"
                          >
                            <Lock className="w-4 h-4" />
                          </button>
                          
                          {/* Delete Account */}
                          <button
                            onClick={() => handleDeleteUser(item)}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors border border-red-100 disabled:opacity-50"
                            disabled={item._id === currentUser.id}
                            title="Delete user"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Paginated Controller */}
          {!loading && totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                Displaying page <strong className="text-gray-900 font-semibold">{currentPage}</strong> of <strong className="text-gray-900 font-semibold">{totalPages}</strong> ({totalUsers} total registered)
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 text-gray-500 hover:text-gray-700 disabled:opacity-50 hover:bg-white rounded-lg border border-gray-200 transition-colors bg-white shadow-xs"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 text-gray-500 hover:text-gray-700 disabled:opacity-50 hover:bg-white rounded-lg border border-gray-200 transition-colors bg-white shadow-xs"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* --- MODALS --- */}
      
      {/* 1. Create User Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-sky-600" />
                  Add New Leader / Student Profile
                </h2>
                <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600 p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Name */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={createForm.name}
                      onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 outline-none text-gray-800"
                      placeholder="e.g. Gizew Fetene"
                    />
                  </div>
                  
                  {/* Student ID / Username */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Student ID (Username) *</label>
                    <input
                      type="text"
                      required
                      value={createForm.username}
                      onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                      placeholder="dbu12345678"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 outline-none text-gray-800"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">Must start with 'dbu' followed by 8 digits</p>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Email Address</label>
                    <input
                      type="email"
                      value={createForm.email}
                      onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                      placeholder="e.g. Gizew@dbu.edu.et"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 outline-none text-gray-800"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={createForm.phoneNumber}
                      onChange={(e) => setCreateForm({ ...createForm, phoneNumber: e.target.value })}
                      placeholder="e.g. +251 912..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 outline-none text-gray-800"
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Default Password *</label>
                    <input
                      type="password"
                      required
                      value={createForm.password}
                      onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 outline-none text-gray-800"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">Minimum 8 characters</p>
                  </div>

                  {/* Department */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Department *</label>
                    <select
                      value={createForm.department}
                      onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 outline-none bg-white text-gray-800"
                    >
                      <option value="">Select Department</option>
                      <option value="Computer Science">Computer Science</option>
                      <option value="Electrical Engineering">Electrical Engineering</option>
                      <option value="Civil Engineering">Civil Engineering</option>
                      <option value="Mechanical Engineering">Mechanical Engineering</option>
                      <option value="Chemical Engineering">Chemical Engineering</option>
                      <option value="Food Engineering">Food Engineering</option>
                      <option value="Accounting & Finance">Accounting & Finance</option>
                      <option value="Economics">Economics</option>
                      <option value="Medicine">Medicine</option>
                      <option value="Public Health">Public Health</option>
                      <option value="Law">Law</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  {/* Year */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Academic Year</label>
                    <select
                      value={createForm.year}
                      onChange={(e) => setCreateForm({ ...createForm, year: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 outline-none bg-white text-gray-800"
                    >
                      <option value="1st Year">1st Year</option>
                      <option value="2nd Year">2nd Year</option>
                      <option value="3rd Year">3rd Year</option>
                      <option value="4th Year">4th Year</option>
                      <option value="5th Year">5th Year</option>
                    </select>
                  </div>

                  {/* System Role */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Union / System Role</label>
                    <select
                      value={createForm.role}
                      onChange={(e) => {
                        const r = e.target.value;
                        setCreateForm({
                          ...createForm,
                          role: r,
                          isAdmin: r === "admin" || r === "system_admin"
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 outline-none bg-white text-gray-800"
                    >
                      <option value="student">Student / Portal Member</option>
                      <option value="admin">System Admin</option>
                      <option value="president">Union President</option>
                      <option value="council_president">Council President</option>
                      <option value="council_secretary">Council Secretary</option>
                      <option value="clubs_coordinator">Clubs Coordinator</option>
                      <option value="academic_affairs">Academic Affairs</option>
                    </select>
                  </div>
                </div>

                {/* Dormitory address */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Dormitory Address Details</label>
                  <input
                    type="text"
                    value={createForm.address}
                    onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
                    placeholder="Block 15, Room 204"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 outline-none text-gray-800"
                  />
                </div>

                {/* Admin toggle */}
                <div className="flex items-center space-x-2 pt-2">
                  <input
                    type="checkbox"
                    id="createIsAdmin"
                    checked={createForm.isAdmin}
                    onChange={(e) => setCreateForm({ ...createForm, isAdmin: e.target.checked })}
                    className="h-4 w-4 text-sky-600 focus:ring-sky-500 border-gray-300 rounded"
                  />
                  <label htmlFor="createIsAdmin" className="text-xs font-semibold text-gray-700 cursor-pointer">
                    Grant Full System Administrator Privileges
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t mt-6">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-xl text-sm font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-70"
                  >
                    {actionLoading && <RefreshCw className="w-4 h-4 animate-spin" />}
                    Create Account
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. Edit User Modal */}
      <AnimatePresence>
        {showEditModal && selectedUser && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Edit2 className="w-5 h-5 text-sky-600" />
                  Modify Profile: {selectedUser.name}
                </h2>
                <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600 p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateUser} className="p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Name */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 outline-none text-gray-800"
                    />
                  </div>

                  {/* Username (Locked/Display) */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Student ID (Username - Locked)</label>
                    <input
                      type="text"
                      disabled
                      value={selectedUser.username?.toUpperCase()}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-400 outline-none font-mono tracking-wider cursor-not-allowed"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Email Address</label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 outline-none text-gray-800"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={editForm.phoneNumber}
                      onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 outline-none text-gray-800"
                    />
                  </div>

                  {/* Department */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Department *</label>
                    <select
                      value={editForm.department}
                      onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 outline-none bg-white text-gray-800"
                    >
                      <option value="Computer Science">Computer Science</option>
                      <option value="Electrical Engineering">Electrical Engineering</option>
                      <option value="Civil Engineering">Civil Engineering</option>
                      <option value="Mechanical Engineering">Mechanical Engineering</option>
                      <option value="Chemical Engineering">Chemical Engineering</option>
                      <option value="Food Engineering">Food Engineering</option>
                      <option value="Accounting & Finance">Accounting & Finance</option>
                      <option value="Economics">Economics</option>
                      <option value="Medicine">Medicine</option>
                      <option value="Public Health">Public Health</option>
                      <option value="Law">Law</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  {/* Year */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Academic Year</label>
                    <select
                      value={editForm.year}
                      onChange={(e) => setEditForm({ ...editForm, year: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 outline-none bg-white text-gray-800"
                    >
                      <option value="1st Year">1st Year</option>
                      <option value="2nd Year">2nd Year</option>
                      <option value="3rd Year">3rd Year</option>
                      <option value="4th Year">4th Year</option>
                      <option value="5th Year">5th Year</option>
                    </select>
                  </div>

                  {/* Role */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Union / System Role</label>
                    <select
                      value={editForm.role}
                      onChange={(e) => {
                        const r = e.target.value;
                        setEditForm({
                          ...editForm,
                          role: r,
                          isAdmin: r === "admin" || r === "system_admin"
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 outline-none bg-white text-gray-800"
                    >
                      <option value="student">Student / Portal Member</option>
                      <option value="admin">System Admin</option>
                      <option value="president">Union President</option>
                      <option value="council_president">Council President</option>
                      <option value="council_secretary">Council Secretary</option>
                      <option value="clubs_coordinator">Clubs Coordinator</option>
                      <option value="academic_affairs">Academic Affairs</option>
                    </select>
                  </div>

                  {/* Dorm Address */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Dormitory Location</label>
                    <input
                      type="text"
                      value={editForm.address}
                      onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 outline-none text-gray-800"
                    />
                  </div>
                </div>

                {/* Account Status Audits */}
                <div className="bg-gray-50 p-4 rounded-xl space-y-3 border border-gray-200/50">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Access Controls</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Active Checkbox */}
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="editIsActive"
                        checked={editForm.isActive}
                        onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                        className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                      />
                      <label htmlFor="editIsActive" className="text-xs font-bold text-gray-700 cursor-pointer">
                        Account Active (Allow Portal Logins)
                      </label>
                    </div>

                    {/* Admin Checkbox */}
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="editIsAdmin"
                        checked={editForm.isAdmin}
                        onChange={(e) => setEditForm({ ...editForm, isAdmin: e.target.checked })}
                        className="h-4 w-4 text-sky-600 focus:ring-sky-500 border-gray-300 rounded"
                        disabled={selectedUser._id === currentUser.id} // protect admin self-demotion
                      />
                      <label htmlFor="editIsAdmin" className="text-xs font-bold text-gray-700 cursor-pointer">
                        Grant System Admin Privileges
                      </label>
                    </div>
                  </div>

                  <div className="border-t border-gray-200/50 my-2 pt-2">
                    {/* Restriction Checkbox */}
                    <div className="flex items-center space-x-2 mb-2">
                      <input
                        type="checkbox"
                        id="editIsRestricted"
                        checked={editForm.isRestricted}
                        onChange={(e) => setEditForm({ ...editForm, isRestricted: e.target.checked })}
                        className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                      />
                      <label htmlFor="editIsRestricted" className="text-xs font-bold text-red-700 cursor-pointer flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Restrict Account (Lock and Block Portal Access)
                      </label>
                    </div>

                    {editForm.isRestricted && (
                      <div className="space-y-1">
                        <label className="block text-[10px] font-semibold text-red-600 uppercase">Reason for Restriction *</label>
                        <textarea
                          required={editForm.isRestricted}
                          rows="2"
                          value={editForm.restrictionReason}
                          onChange={(e) => setEditForm({ ...editForm, restrictionReason: e.target.value })}
                          placeholder="e.g. Non-student account / Misconduct on complaints module"
                          className="w-full p-2 border border-red-200 rounded-lg text-xs bg-red-50/20 focus:ring-1 focus:ring-red-500 outline-none text-gray-800 resize-none"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t mt-4">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 text-gray-650 bg-gray-50 hover:bg-gray-100 rounded-xl text-sm font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-70"
                  >
                    {actionLoading && <RefreshCw className="w-4 h-4 animate-spin" />}
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. Reset Password Modal */}
      <AnimatePresence>
        {showResetModal && selectedUser && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 relative"
            >
              <button
                onClick={() => setShowResetModal(false)}
                className="text-gray-400 hover:text-gray-600 absolute right-4 top-4 p-1"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 pb-4 border-b border-gray-100 mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <LockKeyhole className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Reset User Password</h3>
                  <p className="text-xs text-gray-500">Overriding password for {selectedUser.name}</p>
                </div>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">New System Password *</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter 8+ characters..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none text-gray-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Confirm New Password *</label>
                  <input
                    type="password"
                    required
                    value={resetConfirmPass}
                    onChange={(e) => setResetConfirmPass(e.target.value)}
                    placeholder="Verify the password..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none text-gray-800"
                  />
                </div>

                <div className="bg-amber-50/50 p-3 rounded-lg border border-amber-100/50 text-[10px] text-amber-800 leading-relaxed">
                  <strong>Security Note:</strong> Manually resetting user credentials will apply immediately. Inform the student of their temporary password. They should change it upon login.
                </div>

                <div className="flex justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowResetModal(false)}
                    className="px-3.5 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 disabled:opacity-70"
                  >
                    {actionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    Confirm Reset
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
