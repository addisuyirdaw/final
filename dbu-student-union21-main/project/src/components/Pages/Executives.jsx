/** @format */
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Loader, Award, ShieldAlert, Sparkles, X, Upload, Image as ImageIcon } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import toast from "react-hot-toast";

const API_BASE = (import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "https://dbu-student-portal-2.onrender.com/api" : "http://localhost:5000/api")).replace(/\/api$/, "");

export const Executives = () => {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();



  // Modal & Add State
  const [openAddModal, setOpenAddModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    title: "",
    department: "",
    background: "",
    responsibility: ""
  });
  const [preview, setPreview] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);
  const fileInputRef = useRef(null);

  const fetchExecutives = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/staff?pageGroup=university_exec`);
      const data = await res.json();
      if (data.success) {
        setProfiles(data.profiles);
      } else {
        setError(data.message || "Failed to load profiles");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExecutives();
  }, []);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pendingFile) {
      toast.error("Please select a profile photo.");
      return;
    }
    setUploading(true);

    try {
      const data = new FormData();
      data.append("name", formData.name);
      data.append("title", formData.title);
      data.append("department", formData.department);
      data.append("background", formData.background);
      data.append("responsibility", formData.responsibility);
      data.append("pageGroup", "university_exec");
      data.append("image", pendingFile);

      const res = await fetch(`${API_BASE}/api/staff`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: data
      });

      const result = await res.json();
      if (result.success) {
        toast.success("Executive profile slot successfully created!");
        setFormData({ name: "", title: "", department: "", background: "", responsibility: "" });
        setPendingFile(null);
        setPreview(null);
        setOpenAddModal(false);
        fetchExecutives();
      } else {
        toast.error(result.message || "Failed to create profile slot");
      }
    } catch (err) {
      toast.error("Network error. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  // Group profiles by department
  const groupedProfiles = profiles.reduce((groups, profile) => {
    const dept = profile.department || "Administration";
    if (!groups[dept]) groups[dept] = [];
    groups[dept].push(profile);
    return groups;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50 pt-28 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Page Header */}
        <div className="text-center mb-16 relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-6 opacity-10">
            <Award className="w-24 h-24 text-sky-700" />
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-sky-50 text-sky-800 border border-sky-100 uppercase tracking-widest mb-4">
            <Sparkles className="w-3.5 h-3.5" /> DBU Administration
          </span>
          <h1 className="text-4xl md:text-5xl font-black text-gray-950 mb-4 tracking-tight">
            University Executives
          </h1>
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-6">
            Meet the leadership steering Debre Berhan University's vision, academic distinction, and student union affairs.
          </p>

          {user && user.role === 'system_admin' && (
            <div className="flex justify-center">
              <button
                onClick={() => setOpenAddModal(true)}
                className="mb-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-200"
              >
                + Add New Leadership Profile Slot
              </button>
            </div>
          )}
        </div>

        {/* Profiles Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="text-center">
              <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-500 font-medium">Loading executive profiles...</p>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-gray-200 max-w-md mx-auto shadow-sm">
            <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-1">Failed to load profiles</h3>
            <p className="text-gray-500 text-sm px-6">{error}</p>
          </div>
        ) : Object.keys(groupedProfiles).length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-gray-200 max-w-md mx-auto shadow-sm">
            <Award className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-1">No Executive Profiles</h3>
            <p className="text-gray-500 text-sm px-6">No profiles found. Seed data or add them through the Admin console.</p>
          </div>
        ) : (
          <div className="space-y-16">
            {Object.entries(groupedProfiles).map(([department, deptProfiles]) => (
              <div key={department} className="space-y-6">
                {/* Department Section Title */}
                <div className="flex items-center gap-4">
                  <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight whitespace-nowrap">
                    {department}
                  </h2>
                  <div className="h-[2px] bg-gray-200 w-full rounded-full" />
                </div>

                {/* Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {deptProfiles.map((profile, index) => {
                    const imageUrl = profile.imageUrl?.startsWith("/uploads") 
                      ? `${API_BASE}${profile.imageUrl}` 
                      : (profile.imageUrl || "");

                    return (
                      <motion.div
                        key={profile._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200/80 hover:border-blue-200 flex flex-col items-center text-center h-full cursor-pointer transition-all duration-300 ease-in-out hover:scale-[1.03] hover:shadow-[0_10px_30px_rgba(30,58,138,0.08)] group"
                        onClick={() => navigate(`/profile/${profile._id}`)}
                      >
                        {/* Image Container */}
                        <div className="w-40 h-48 rounded-2xl mb-6 overflow-hidden border-4 border-sky-50 bg-gray-50 shadow-md">
                          <img 
                            src={imageUrl} 
                            alt={profile.name} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                            onError={(e) => { 
                              e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=EBF5FF&color=1E3A8A&size=192`; 
                            }} 
                          />
                        </div>

                        {/* Name and Title */}
                        <h3 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-blue-700 transition-colors">
                          {profile.name}
                        </h3>
                        <p className="text-blue-600 font-semibold text-sm mb-4">
                          {profile.title}
                        </p>

                        {/* Bio Excerpt */}
                        <div className="text-gray-600 text-sm mb-6 flex-grow text-left w-full bg-gray-50 p-4 rounded-xl border border-gray-100 line-clamp-3">
                          <p>{profile.background || "No bio summary listed."}</p>
                        </div>

                        {/* Footer Action */}
                        <div className="mt-auto w-full pt-4 border-t border-gray-100">
                          <span className="text-blue-700 font-bold hover:underline flex items-center justify-center gap-1.5 text-sm">
                            View Full Profile 
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Unified Profile Creation Modal Form */}
      <AnimatePresence>
        {openAddModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100"
            >
              <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-600" />
                  Reserve New Leadership Profile Slot
                </h2>
                <button onClick={() => setOpenAddModal(false)} className="text-gray-400 hover:text-gray-600 p-1">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Photo Upload Box */}
                  <div className="md:col-span-1">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Profile Photo *</label>
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
                          <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
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
                        placeholder="e.g. Dr. Asmare"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Official Title *</label>
                      <input
                        type="text"
                        required
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g. Academic Vice Dean"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Department / Profession *</label>
                      <input
                        type="text"
                        required
                        value={formData.department}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g. Office of the Dean"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Background Paragraph *</label>
                    <textarea
                      required
                      rows="3"
                      value={formData.background}
                      onChange={(e) => setFormData({ ...formData, background: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                      placeholder="Academic history, previous achievements, credentials..."
                    ></textarea>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Responsibility / Function Details *</label>
                    <textarea
                      required
                      rows="3"
                      value={formData.responsibility}
                      onChange={(e) => setFormData({ ...formData, responsibility: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                      placeholder="Mandates, specific duties, daily roles..."
                    ></textarea>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setOpenAddModal(false)}
                    className="px-5 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-70"
                  >
                    {uploading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    {uploading ? "Saving..." : "Save Profile Slot"}
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

export default Executives;
