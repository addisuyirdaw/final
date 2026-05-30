/** @format */
import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { apiService } from "../../services/api";
import { motion } from "framer-motion";
import {
  User,
  Mail,
  Phone,
  MapPin,
  GraduationCap,
  Calendar,
  Lock,
  Shield,
  KeyRound,
  Eye,
  EyeOff,
  Loader,
  CheckCircle,
  AlertCircle,
  BookOpen
} from "lucide-react";
import toast from "react-hot-toast";

export function Profile() {
  const { user, updateUserSession } = useAuth();
  const [profileLoading, setProfileLoading] = useState(true);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  
  // Password visible toggles
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phoneNumber: "",
    department: "",
    year: "1st Year",
    address: "",
    profileImage: ""
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    try {
      setProfileLoading(true);
      const res = await apiService.getProfile();
      if (res.success && res.user) {
        setFormData({
          name: res.user.name || "",
          email: res.user.email || "",
          phoneNumber: res.user.phoneNumber || "",
          department: res.user.department || "",
          year: res.user.year || "1st Year",
          address: res.user.address || "",
          profileImage: res.user.profileImage || ""
        });
      }
    } catch (err) {
      console.error("Failed to load profile", err);
      toast.error("Failed to sync profile from server");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Name is required");
      return;
    }

    try {
      setUpdatingProfile(true);
      const res = await apiService.updateProfile(formData);
      if (res.success) {
        toast.success("Profile updated successfully!");
        // Sync context state
        updateUserSession({
          name: res.user.name,
          email: res.user.email,
          department: res.user.department,
          year: res.user.year,
          phoneNumber: res.user.phoneNumber,
          address: res.user.address,
          profileImage: res.user.profileImage
        });
      }
    } catch (err) {
      console.error("Profile update error", err);
      toast.error(err.message || "Failed to update profile");
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    const { currentPassword, newPassword, confirmPassword } = passwordData;

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    try {
      setUpdatingPassword(true);
      const res = await apiService.changePassword({
        currentPassword,
        newPassword
      });
      if (res.success) {
        toast.success("Password changed successfully!");
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: ""
        });
      }
    } catch (err) {
      console.error("Password change error", err);
      toast.error(err.message || "Failed to change password");
    } finally {
      setUpdatingPassword(false);
    }
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Syncing profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-sky-100 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src={formData.profileImage || "https://images.pexels.com/photos/3763188/pexels-photo-3763188.jpeg?auto=compress&cs=tinysrgb&w=400"}
                alt={formData.name}
                className="w-20 h-20 rounded-full object-cover border-4 border-sky-100 bg-white"
                onError={(e) => {
                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name)}&background=0284c7&color=fff&size=128`;
                }}
              />
              <span className="absolute bottom-0 right-0 bg-emerald-500 w-4 h-4 rounded-full border-2 border-white"></span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{formData.name}</h1>
              <p className="text-gray-500 text-sm mt-0.5">@{user?.username || "student_id"}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-50 text-sky-700 rounded-full text-xs font-semibold border border-sky-100">
                  <Shield className="w-3.5 h-3.5" />
                  {user?.role === "student" ? "Portal Member" : user?.role?.toUpperCase().replace("_", " ")}
                </span>
                {user?.isAdmin && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-semibold border border-purple-100">
                    <Shield className="w-3.5 h-3.5" />
                    Administrator
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="bg-sky-50/50 p-4 rounded-xl border border-sky-100/50 text-right md:w-64">
            <p className="text-xs text-gray-500">Student ID Code</p>
            <p className="text-xl font-bold text-sky-700 font-mono tracking-wider mt-0.5">{user?.username?.toUpperCase()}</p>
            <p className="text-xs text-gray-400 mt-1">Debre Berhan University</p>
          </div>
        </div>

        {/* Dashboard Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Form Info */}
          <div className="lg:col-span-2 space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8"
            >
              <div className="flex items-center gap-3 pb-6 border-b border-gray-100 mb-6">
                <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Personal Information</h2>
                  <p className="text-sm text-gray-500">Update your primary contact and portal profile details</p>
                </div>
              </div>

              <form onSubmit={handleProfileSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Name Input */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-shadow outline-none text-gray-800"
                        required
                        placeholder="Gizew Fetene"
                      />
                    </div>
                  </div>

                  {/* Email Input */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-shadow outline-none text-gray-800"
                        placeholder="student@dbu.edu.et"
                      />
                    </div>
                  </div>

                  {/* Phone Input */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
                      <input
                        type="tel"
                        value={formData.phoneNumber}
                        onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-shadow outline-none text-gray-800"
                        placeholder="+251 912 34 5678"
                      />
                    </div>
                  </div>

                  {/* Profile Image Input */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
                      Profile Avatar URL
                    </label>
                    <div className="relative">
                      <User className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
                      <input
                        type="url"
                        value={formData.profileImage}
                        onChange={(e) => setFormData({ ...formData, profileImage: e.target.value })}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-shadow outline-none text-gray-800"
                        placeholder="https://..."
                      />
                    </div>
                  </div>

                  {/* Department Dropdown */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
                      Department
                    </label>
                    <div className="relative">
                      <GraduationCap className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
                      <select
                        value={formData.department}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white transition-shadow outline-none text-gray-800"
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
                  </div>

                  {/* Year Dropdown */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
                      Academic Year
                    </label>
                    <div className="relative">
                      <Calendar className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
                      <select
                        value={formData.year}
                        onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white transition-shadow outline-none text-gray-800"
                      >
                        <option value="1st Year">1st Year</option>
                        <option value="2nd Year">2nd Year</option>
                        <option value="3rd Year">3rd Year</option>
                        <option value="4th Year">4th Year</option>
                        <option value="5th Year">5th Year</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Address Input */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
                    Dormitory Address / Block Details
                  </label>
                  <div className="relative">
                    <MapPin className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-shadow outline-none text-gray-800"
                      placeholder="e.g. Block 15, Room 204"
                    />
                  </div>
                </div>

                {/* Submit button */}
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={updatingProfile}
                    className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-medium shadow-sm transition-colors flex items-center gap-2 disabled:opacity-75"
                  >
                    {updatingProfile ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        Saving Changes...
                      </>
                    ) : (
                      "Save Profile"
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>

          {/* Right Column: Password Change & Metadata */}
          <div className="space-y-8">
            {/* Change Password Card */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
            >
              <div className="flex items-center gap-3 pb-5 border-b border-gray-100 mb-5">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Change Password</h2>
                  <p className="text-xs text-gray-500">Security credentials update</p>
                </div>
              </div>

              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                {/* Current Password */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
                    Current Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                    <input
                      type={showCurrentPass ? "text" : "password"}
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      className="w-full pl-9 pr-10 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-gray-800"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                    >
                      {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
                    New Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                    <input
                      type={showNewPass ? "text" : "password"}
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      className="w-full pl-9 pr-10 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-gray-800"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                    >
                      {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">Minimum length: 8 characters</p>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
                    Confirm New Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                    <input
                      type={showConfirmPass ? "text" : "password"}
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      className="w-full pl-9 pr-10 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-gray-800"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPass(!showConfirmPass)}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={updatingPassword}
                    className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-75 shadow-sm"
                  >
                    {updatingPassword ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        Changing...
                      </>
                    ) : (
                      "Change Password"
                    )}
                  </button>
                </div>
              </form>
            </motion.div>

            {/* Union Council Stats / Details */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-sky-950 text-white rounded-2xl shadow-sm p-6 relative overflow-hidden"
            >
              <div className="absolute right-[-20px] bottom-[-20px] text-sky-900 opacity-20 pointer-events-none">
                <BookOpen className="w-40 h-40" />
              </div>
              <h3 className="text-lg font-bold flex items-center gap-2 mb-3">
                <CheckCircle className="w-5 h-5 text-sky-400" />
                DBU Student Council
              </h3>
              <p className="text-xs text-sky-200 leading-relaxed mb-4">
                Thank you for being a part of Debre Berhan University's digital student portal. Maintain accurate details so the council can contact you for academic directives, events, and voting registrations.
              </p>
              <div className="border-t border-sky-900 pt-3 flex justify-between items-center text-xs">
                <span className="text-sky-300">Account status:</span>
                <span className="font-semibold text-emerald-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
                  Active Account
                </span>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
