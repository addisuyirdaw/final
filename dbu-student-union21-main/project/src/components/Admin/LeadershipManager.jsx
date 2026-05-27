/** @format */
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../contexts/AuthContext";
import { Upload, Trash2, Edit, Plus, CheckCircle, AlertCircle, X, Users, Image as ImageIcon } from "lucide-react";

const API_BASE = (import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "https://dbu-student-portal-2.onrender.com/api" : "http://localhost:5000/api")).replace(/\/api$/, "");

export const LeadershipManager = () => {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    role: "",
    priority: 0,
    bio: "",
    bioDetails: [] // Array of {label, text}
  });
  const [preview, setPreview] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);
  const fileInputRef = useRef(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  });

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/leadership/admin/all`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setProfiles(data.profiles);
    } catch {
      showToast("Failed to load profiles", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.isAdmin) fetchProfiles();
  }, [user]);

  const handleFiles = (files) => {
    const file = files[0];
    if (!file || !file.type.startsWith("image/")) {
      showToast("Only image files are allowed", "error");
      return;
    }
    setPendingFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setFormData({ name: "", role: "", priority: 0, bio: "", bioDetails: [] });
    setPendingFile(null);
    setPreview(null);
    setEditingId(null);
    setShowModal(false);
  };

  const handleEdit = (profile) => {
    setFormData({
      name: profile.name,
      role: profile.role,
      priority: profile.priority,
      bio: profile.bio || "",
      bioDetails: profile.bioDetails || []
    });
    setPreview(profile.imageUrl.startsWith("/uploads") ? `${API_BASE}${profile.imageUrl}` : profile.imageUrl);
    setPendingFile(null);
    setEditingId(profile._id);
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setUploading(true);

    try {
      const data = new FormData();
      data.append("name", formData.name);
      data.append("role", formData.role);
      data.append("priority", formData.priority);
      data.append("bio", formData.bio);
      data.append("bioDetails", JSON.stringify(formData.bioDetails));

      if (pendingFile) {
        data.append("image", pendingFile);
      } else if (!editingId) {
        showToast("Please select an image", "error");
        setUploading(false);
        return;
      }

      const url = editingId 
        ? `${API_BASE}/api/leadership/${editingId}`
        : `${API_BASE}/api/leadership/add`;
      
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: data,
      });

      const result = await res.json();
      if (result.success) {
        showToast(`Profile ${editingId ? "updated" : "added"} successfully`);
        fetchProfiles();
        resetForm();
      } else {
        showToast(result.message || "Failed to save profile", "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this profile?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/leadership/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setProfiles((prev) => prev.filter((p) => p._id !== id));
        showToast("Profile deleted");
      } else {
         showToast(data.message || "Failed to delete", "error");
      }
    } catch {
      showToast("Failed to delete profile", "error");
    }
  };

  const toggleActive = async (profile) => {
    try {
      const res = await fetch(`${API_BASE}/api/leadership/${profile._id}`, {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !profile.isActive }),
      });
      const data = await res.json();
      if (data.success) {
        setProfiles((prev) => prev.map((p) => p._id === profile._id ? { ...p, isActive: !p.isActive } : p));
        showToast(`Profile ${!profile.isActive ? "shown" : "hidden"}`);
      }
    } catch {
      showToast("Failed to update profile status", "error");
    }
  };

  const addBioDetail = () => {
    setFormData({
      ...formData,
      bioDetails: [...formData.bioDetails, { label: "", text: "" }]
    });
  };

  const updateBioDetail = (index, field, value) => {
    const newDetails = [...formData.bioDetails];
    newDetails[index][field] = value;
    setFormData({ ...formData, bioDetails: newDetails });
  };

  const removeBioDetail = (index) => {
    const newDetails = formData.bioDetails.filter((_, i) => i !== index);
    setFormData({ ...formData, bioDetails: newDetails });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-white font-semibold
              ${toast.type === "error" ? "bg-red-600" : "bg-emerald-600"}`}
          >
            {toast.type === "error" ? <AlertCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-600" />
              Team Manager
            </h1>
            <p className="text-gray-600 mt-1">Manage leadership profiles for the Home page and directory</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" /> Add Team Member
          </button>
        </div>

        {/* Profiles Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : profiles.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-200 shadow-sm">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No profiles yet</h3>
            <p className="text-gray-500">Click "Add Team Member" to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {profiles.map((profile) => (
              <div key={profile._id} className={`bg-white rounded-2xl shadow-sm border transition-all hover:shadow-md ${profile.isActive ? 'border-gray-200' : 'border-gray-200 opacity-60'}`}>
                <div className="relative h-48 rounded-t-2xl overflow-hidden bg-gray-100">
                  <img
                    src={profile.imageUrl.startsWith("/uploads") ? `${API_BASE}${profile.imageUrl}` : profile.imageUrl}
                    alt={profile.name}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=EBF5FF&color=1E3A8A`; }}
                  />
                  <div className="absolute top-3 right-3 flex gap-2">
                    <button
                      onClick={() => toggleActive(profile)}
                      className={`px-2 py-1 text-xs font-bold rounded-md text-white shadow-sm ${profile.isActive ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-gray-500 hover:bg-gray-600'}`}
                    >
                      {profile.isActive ? "LIVE" : "HIDDEN"}
                    </button>
                  </div>
                  <div className="absolute top-3 left-3">
                    <span className="bg-black/60 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded-md">
                      Priority: {profile.priority}
                    </span>
                  </div>
                </div>
                
                <div className="p-5">
                  <h3 className="font-bold text-lg text-gray-900 line-clamp-1">{profile.name}</h3>
                  <p className="text-blue-600 font-medium text-sm mb-3 line-clamp-1">{profile.role}</p>
                  
                  <div className="flex gap-2 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => handleEdit(profile)}
                      className="flex-1 flex items-center justify-center gap-1 py-2 bg-gray-50 hover:bg-blue-50 text-gray-700 hover:text-blue-700 rounded-lg transition-colors border border-gray-200 hover:border-blue-200"
                    >
                      <Edit className="w-4 h-4" /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(profile._id)}
                      className="w-10 flex items-center justify-center bg-gray-50 hover:bg-red-50 text-gray-500 hover:text-red-600 rounded-lg transition-colors border border-gray-200 hover:border-red-200"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add/Edit Modal */}
        <AnimatePresence>
          {showModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl"
              >
                <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">
                    {editingId ? "Edit Team Member" : "Add Team Member"}
                  </h2>
                  <button onClick={resetForm} className="text-gray-400 hover:text-gray-600 p-1">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleSave} className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Image Upload Sidebar */}
                    <div className="md:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Profile Photo *</label>
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="relative w-full aspect-[3/4] rounded-xl overflow-hidden border-2 border-dashed border-gray-300 hover:border-blue-500 bg-gray-50 cursor-pointer flex flex-col items-center justify-center group transition-colors"
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
                            <ImageIcon className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-500 font-medium">Click to upload</p>
                            <p className="text-xs text-gray-400 mt-1">Portrait recommended</p>
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

                    {/* Details Column */}
                    <div className="md:col-span-2 space-y-5">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                          <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="e.g. Gizew Fetene"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Role/Title *</label>
                          <input
                            type="text"
                            required
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="e.g. Dean of Student Affairs"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Display Priority</label>
                        <input
                          type="number"
                          value={formData.priority}
                          onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                          className="w-full md:w-1/3 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="0"
                        />
                        <p className="text-xs text-gray-500 mt-1">Higher numbers appear first on the Home page.</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Short Bio</label>
                        <textarea
                          rows="3"
                          value={formData.bio}
                          onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                          placeholder="Brief description for the profile card..."
                        ></textarea>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-gray-700">Detailed Bio Sections (Profile Page)</label>
                          <button
                            type="button"
                            onClick={addBioDetail}
                            className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                          >
                            <Plus className="w-4 h-4" /> Add Section
                          </button>
                        </div>
                        
                        <div className="space-y-3">
                          {formData.bioDetails.map((detail, index) => (
                            <div key={index} className="flex gap-3 items-start bg-gray-50 p-3 rounded-lg border border-gray-200">
                              <div className="flex-1 space-y-2">
                                <input
                                  type="text"
                                  placeholder="Section Label (e.g. Background)"
                                  value={detail.label}
                                  onChange={(e) => updateBioDetail(index, "label", e.target.value)}
                                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                                />
                                <textarea
                                  placeholder="Content..."
                                  rows="2"
                                  value={detail.text}
                                  onChange={(e) => updateBioDetail(index, "text", e.target.value)}
                                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 resize-none"
                                ></textarea>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeBioDetail(index)}
                                className="text-gray-400 hover:text-red-500 p-1"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </div>
                          ))}
                          {formData.bioDetails.length === 0 && (
                            <p className="text-sm text-gray-500 italic bg-gray-50 p-3 rounded-lg border border-dashed border-gray-300">
                              No detailed sections added. Click "Add Section" to include details like Background, Function, etc.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-5 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={uploading}
                      className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2 disabled:opacity-70"
                    >
                      {uploading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                      {uploading ? "Saving..." : "Save Profile"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default LeadershipManager;
