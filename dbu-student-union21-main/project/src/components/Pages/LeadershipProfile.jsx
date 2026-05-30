/** @format */
import React, { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, Mail, Phone, MapPin, Loader, BookOpen, Briefcase, 
  FileText, Edit, Trash2, X, Upload, ImageIcon as ImageIconIcon, 
  CheckCircle, AlertCircle 
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import toast from "react-hot-toast";

const API_BASE = (import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "https://dbu-student-portal-2.onrender.com/api" : "http://localhost:5000/api")).replace(/\/api$/, "");

export const LeadershipProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("background");
  
  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    title: "",
    pageGroup: "university_exec",
    department: "",
    background: "",
    responsibility: "",
    order: 0,
    isActive: true
  });
  const [preview, setPreview] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);
  const fileInputRef = useRef(null);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/staff/${id}`);
      const data = await res.json();
      
      if (data.success) {
        setProfile(data.profile);
        // Pre-populate form data
        setFormData({
          name: data.profile.name,
          title: data.profile.title,
          pageGroup: data.profile.pageGroup || "university_exec",
          department: data.profile.department || "",
          background: data.profile.background || "",
          responsibility: data.profile.responsibility || "",
          order: data.profile.order !== undefined ? data.profile.order : 0,
          isActive: data.profile.isActive !== undefined ? data.profile.isActive : true
        });
        setPreview(data.profile.imageUrl.startsWith("/uploads") ? `${API_BASE}${data.profile.imageUrl}` : data.profile.imageUrl);
      } else {
        setError(data.message || "Profile not found");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchProfile();
  }, [id]);

  const handleFiles = (files) => {
    const file = files[0];
    if (!file || !file.type.startsWith("image/")) {
      toast.error("Only image files are allowed");
      return;
    }
    setPendingFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const data = new FormData();
      data.append("name", formData.name);
      data.append("title", formData.title);
      data.append("pageGroup", formData.pageGroup);
      data.append("department", formData.department);
      data.append("background", formData.background);
      data.append("responsibility", formData.responsibility);
      data.append("order", formData.order);
      data.append("isActive", formData.isActive);

      if (pendingFile) {
        data.append("image", pendingFile);
      }

      const res = await fetch(`${API_BASE}/api/staff/${id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: data
      });

      const result = await res.json();
      if (result.success) {
        toast.success("Profile updated successfully!");
        setProfile(result.profile);
        setShowEditModal(false);
        setPendingFile(null);
      } else {
        toast.error(result.message || "Failed to update profile");
      }
    } catch (err) {
      toast.error("Network error saving profile");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to permanently delete this profile?")) return;
    
    try {
      const res = await fetch(`${API_BASE}/api/staff/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Profile deleted successfully");
        navigate(getBackUrl());
      } else {
        toast.error(data.message || "Failed to delete profile");
      }
    } catch (err) {
      toast.error("Network error deleting profile");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-md w-full border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Profile Not Found</h2>
          <p className="text-gray-600 mb-6">{error || "The requested profile does not exist or has been removed."}</p>
          <Link to="/" className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium">
            <ArrowLeft className="w-4 h-4 mr-2" /> Return Home
          </Link>
        </div>
      </div>
    );
  }

  const imageUrl = profile.imageUrl?.startsWith("/uploads") ? `${API_BASE}${profile.imageUrl}` : (profile.imageUrl || "");

  // Determine return URL based on page group
  const getBackUrl = () => {
    switch (profile.pageGroup) {
      case "university_exec": return "/executives";
      case "student_union": return "/student-union";
      case "student_services": return "/student-services";
      case "dormitory": return "/dormitory-management";
      default: return "/";
    }
  };

  const getBackLabel = () => {
    switch (profile.pageGroup) {
      case "university_exec": return "Executives Directory";
      case "student_union": return "Student Union Directory";
      case "student_services": return "Student Services Directory";
      case "dormitory": return "Dormitory Directory";
      default: return "Directory";
    }
  };

  const isAdmin = user && user.role === "system_admin";

  return (
    <div className="min-h-screen bg-gray-50 pt-28 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <Link to={getBackUrl()} className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to {getBackLabel()}
          </Link>
          
          {/* Admin Control Bar */}
          {isAdmin && (
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowEditModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-all shadow-md cursor-pointer hover:shadow-lg"
              >
                <Edit className="w-4 h-4" /> Edit Profile
              </button>
              <button 
                onClick={handleDelete}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-xl transition-all shadow-md cursor-pointer hover:shadow-lg"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </div>
          )}
        </div>

        {/* Profile Header Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-200 mb-8 relative"
        >
          <div className="h-48 bg-gradient-to-r from-blue-900 to-blue-700"></div>
          
          <div className="px-8 pb-8 flex flex-col sm:flex-row gap-8 items-center sm:items-start relative -mt-24">
            <div className="w-48 h-56 rounded-2xl overflow-hidden shadow-xl border-4 border-white flex-shrink-0 bg-white">
              <img 
                src={imageUrl} 
                alt={profile.name} 
                className="w-full h-full object-cover"
                onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=EBF5FF&color=1E3A8A&size=300`; }}
              />
            </div>
            
            <div className="flex-1 text-center sm:text-left mt-4 sm:mt-28">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-2 tracking-tight">{profile.name}</h1>
              <p className="text-xl text-blue-600 font-semibold mb-2">{profile.title}</p>
              <p className="text-gray-500 font-medium text-sm mb-6">Dept: {profile.department}</p>
              
              <div className="flex flex-wrap justify-center sm:justify-start gap-4">
                <button className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-medium hover:bg-blue-100 transition-colors">
                  <Mail className="w-4 h-4" /> Message
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-700 rounded-lg font-medium hover:bg-gray-100 transition-colors border border-gray-200">
                  <Phone className="w-4 h-4" /> Contact Office
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tabs Controls */}
        <div className="flex border-b border-gray-200 mb-8 bg-white p-2 rounded-2xl shadow-sm border">
          <button
            onClick={() => setActiveTab("background")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold transition-all ${
              activeTab === "background"
                ? "bg-blue-600 text-white shadow-md"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            <BookOpen className="w-5 h-5" /> Background &amp; Bio
          </button>
          <button
            onClick={() => setActiveTab("responsibility")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold transition-all ${
              activeTab === "responsibility"
                ? "bg-blue-600 text-white shadow-md"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            <Briefcase className="w-5 h-5" /> Responsibilities &amp; Duties
          </button>
        </div>

        {/* Tab Contents */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content Area */}
          <motion.div 
            key={activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:col-span-2 space-y-8"
          >
            {activeTab === "background" && (
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200 min-h-[300px]">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2 border-b border-gray-100 pb-4">
                  <FileText className="w-6 h-6 text-blue-600" />
                  Credentials &amp; History
                </h2>
                <p className="text-gray-700 text-lg leading-relaxed whitespace-pre-wrap">
                  {profile.background || "No background details listed."}
                </p>
              </div>
            )}

            {activeTab === "responsibility" && (
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200 min-h-[300px]">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2 border-b border-gray-100 pb-4">
                  <Briefcase className="w-6 h-6 text-blue-600" />
                  Functions &amp; Mandate
                </h2>
                <p className="text-gray-700 text-lg leading-relaxed whitespace-pre-wrap">
                  {profile.responsibility || "No specific responsibility details listed."}
                </p>
              </div>
            )}
          </motion.div>

          {/* Sidebar */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-8"
          >
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200">
              <h3 className="font-bold text-gray-900 mb-4 uppercase tracking-wider text-sm">Office Location</h3>
              <div className="flex items-start gap-3 text-gray-600">
                <MapPin className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-gray-900">{profile.department}</p>
                  <p className="text-sm font-medium text-gray-500">Student Affairs Building</p>
                  <p className="text-xs text-gray-400">Main Campus, Debre Berhan University</p>
                </div>
              </div>
            </div>

            <div className="bg-blue-600 p-6 rounded-3xl shadow-sm text-white">
              <h3 className="font-bold mb-2">Need Assistance?</h3>
              <p className="text-blue-100 text-sm mb-4">You can request a meeting or file a concern through the Student Union portal.</p>
              <Link to="/complaints" className="block w-full py-2.5 bg-white text-blue-600 font-bold rounded-lg text-center hover:bg-blue-50 transition-colors">
                Submit Request
              </Link>
            </div>
          </motion.div>

        </div>
      </div>

      {/* Edit Modal (Glassmorphism design, Inter typography, custom inputs matching image_3de8a1.png) */}
      <AnimatePresence>
        {showEditModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-150"
            >
              <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Edit className="w-5 h-5 text-blue-600" />
                  Edit Profile Card
                </h2>
                <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600 p-1">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleUpdate} className="p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Photo Upload Box */}
                  <div className="md:col-span-1">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Profile Photo</label>
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden border-2 border-dashed border-gray-300 hover:border-blue-500 bg-gray-50 cursor-pointer flex flex-col items-center justify-center group transition-all"
                    >
                      {preview ? (
                        <>
                          <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-white font-medium flex items-center gap-2"><Upload className="w-4 h-4"/> Change Photo</span>
                          </div>
                        </>
                      ) : (
                        <div className="text-center p-4">
                          <ImageIconIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-xs text-gray-500 font-medium">Click to upload</p>
                        </div>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFiles(e.target.files)}
                      />
                    </div>
                  </div>

                  {/* Text inputs */}
                  <div className="md:col-span-2 space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Full Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g. Gizew Fetene"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Title / Profession *</label>
                      <input
                        type="text"
                        required
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g. Dean of Student Affairs"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Page Group *</label>
                        <select
                          required
                          value={formData.pageGroup}
                          onChange={(e) => setFormData({ ...formData, pageGroup: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        >
                          <option value="university_exec">University Executives</option>
                          <option value="student_union">Student Union</option>
                          <option value="student_services">Student Services</option>
                          <option value="dormitory">Dormitory Management</option>
                        </select>
                      </div>
                      <div>
                        {/* Dynamic Department text field as per Instruction 3! */}
                        <label className="block text-sm font-bold text-gray-700 mb-1">Department *</label>
                        <input
                          type="text"
                          required
                          name="department"
                          value={formData.department}
                          onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="e.g. Office of the Dean"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Background &amp; Credentials *</label>
                    <textarea
                      required
                      rows="3"
                      value={formData.background}
                      onChange={(e) => setFormData({ ...formData, background: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                      placeholder="Biography, history and academic credentials..."
                    ></textarea>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Responsibilities &amp; Duties *</label>
                    <textarea
                      required
                      rows="3"
                      value={formData.responsibility}
                      onChange={(e) => setFormData({ ...formData, responsibility: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                      placeholder="Functions, mandates, and duties..."
                    ></textarea>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-5 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-70"
                  >
                    {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LeadershipProfile;
