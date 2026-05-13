/** @format */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { Upload, Trash2, Eye, EyeOff, Image, CheckCircle, AlertCircle, X, GripVertical } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const CarouselAdmin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState(null); // { url, caption }
  const [pendingCaption, setPendingCaption] = useState("");
  const [pendingFile, setPendingFile] = useState(null);
  const fileInputRef = useRef(null);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  });

  const fetchSlides = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/carousel/all`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setSlides(data.slides);
    } catch {
      showToast("Failed to load slides", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.isAdmin) { navigate("/"); return; }
    fetchSlides();
  }, [user]);

  const handleFiles = (files) => {
    const file = files[0];
    if (!file || !file.type.startsWith("image/")) {
      showToast("Only image files are allowed", "error");
      return;
    }
    setPendingFile(file);
    setPendingCaption("");
    const reader = new FileReader();
    reader.onload = (e) => setPreview({ url: e.target.result });
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleUpload = async () => {
    if (!pendingFile) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", pendingFile);
      formData.append("caption", pendingCaption);
      formData.append("order", slides.length);

      const res = await fetch(`${API_BASE}/api/carousel/upload`, {
        method: "POST",
        headers: authHeaders(),
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        showToast("✅ Slide uploaded successfully!");
        setPreview(null);
        setPendingFile(null);
        fetchSlides();
      } else {
        showToast(data.message || "Upload failed", "error");
      }
    } catch {
      showToast("Network error during upload", "error");
    } finally {
      setUploading(false);
    }
  };

  const toggleActive = async (slide) => {
    try {
      const res = await fetch(`${API_BASE}/api/carousel/${slide._id}`, {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !slide.isActive }),
      });
      const data = await res.json();
      if (data.success) {
        setSlides((prev) => prev.map((s) => s._id === slide._id ? { ...s, isActive: !s.isActive } : s));
        showToast(`Slide ${!slide.isActive ? "shown" : "hidden"}`);
      }
    } catch {
      showToast("Failed to update slide", "error");
    }
  };

  const deleteSlide = async (id) => {
    if (!window.confirm("Delete this slide permanently?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/carousel/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setSlides((prev) => prev.filter((s) => s._id !== id));
        showToast("Slide deleted");
      }
    } catch {
      showToast("Failed to delete slide", "error");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 py-10 px-4">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl text-white font-semibold
              ${toast.type === "error" ? "bg-red-600" : "bg-emerald-600"}`}
          >
            {toast.type === "error" ? <AlertCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-extrabold text-white mb-2 tracking-tight">
            🎠 Carousel Manager
          </h1>
          <p className="text-blue-300 text-lg">Drag & drop images to update the homepage carousel instantly</p>
        </div>

        {/* Upload Drop Zone */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`relative border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all duration-300 mb-8
            ${dragOver ? "border-blue-400 bg-blue-500/20 scale-[1.01]" : "border-blue-700/60 bg-white/5 hover:border-blue-500 hover:bg-blue-500/10"}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-blue-600/30 flex items-center justify-center">
              <Upload className="w-10 h-10 text-blue-400" />
            </div>
            <div>
              <p className="text-white text-xl font-bold">Drop an image here</p>
              <p className="text-blue-300 text-sm mt-1">or click to browse — JPG, PNG, GIF, WebP up to 10MB</p>
            </div>
          </div>
        </motion.div>

        {/* Preview + Caption + Upload */}
        <AnimatePresence>
          {preview && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 mb-8 flex flex-col md:flex-row gap-6 items-start"
            >
              <div className="relative w-full md:w-64 h-44 rounded-2xl overflow-hidden flex-shrink-0 shadow-lg">
                <img src={preview.url} alt="Preview" className="w-full h-full object-cover" />
                <button
                  onClick={() => { setPreview(null); setPendingFile(null); }}
                  className="absolute top-2 right-2 w-7 h-7 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 flex flex-col gap-4">
                <div>
                  <label className="text-blue-200 text-sm font-semibold block mb-1">Caption (optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Celebrating Our Rich Cultural Heritage"
                    value={pendingCaption}
                    onChange={(e) => setPendingCaption(e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-blue-400 transition"
                  />
                </div>
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 disabled:opacity-50 text-white font-bold py-3 px-8 rounded-xl transition-all duration-200 shadow-lg flex items-center gap-2 self-start"
                >
                  {uploading ? (
                    <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Uploading...</>
                  ) : (
                    <><Upload className="w-5 h-5" /> Upload to Carousel</>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Slides Grid */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-white font-bold text-xl">
            Current Slides <span className="text-blue-400 text-base">({slides.length})</span>
          </h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : slides.length === 0 ? (
          <div className="text-center py-20 text-blue-300">
            <Image className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg">No slides yet. Upload your first image above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {slides.map((slide, i) => (
              <motion.div
                key={slide._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`relative rounded-2xl overflow-hidden border-2 transition-all duration-300 group
                  ${slide.isActive ? "border-blue-500/50 shadow-lg shadow-blue-900/30" : "border-white/10 opacity-60"}`}
              >
                {/* Image */}
                <div className="h-44 bg-gray-900 overflow-hidden">
                  <img
                    src={slide.imageUrl.startsWith("/uploads")
                      ? `${API_BASE}${slide.imageUrl}`
                      : slide.imageUrl}
                    alt={slide.caption || `Slide ${i + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=Slide+${i+1}&background=1e3a8a&color=fff&size=200`; }}
                  />
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                </div>

                {/* Caption */}
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="text-white text-sm font-medium line-clamp-1">
                    {slide.caption || <span className="text-white/40 italic">No caption</span>}
                  </p>
                  <p className="text-blue-300 text-xs mt-0.5">
                    {new Date(slide.createdAt).toLocaleDateString()}
                  </p>
                </div>

                {/* Status badge */}
                <div className={`absolute top-3 left-3 text-xs font-bold px-2 py-0.5 rounded-full
                  ${slide.isActive ? "bg-emerald-500 text-white" : "bg-gray-600 text-gray-200"}`}>
                  {slide.isActive ? "LIVE" : "HIDDEN"}
                </div>

                {/* Action buttons */}
                <div className="absolute top-3 right-3 flex gap-2">
                  <button
                    onClick={() => toggleActive(slide)}
                    title={slide.isActive ? "Hide slide" : "Show slide"}
                    className="w-8 h-8 bg-black/50 hover:bg-blue-600 text-white rounded-full flex items-center justify-center transition-colors backdrop-blur-sm"
                  >
                    {slide.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => deleteSlide(slide._id)}
                    title="Delete slide"
                    className="w-8 h-8 bg-black/50 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors backdrop-blur-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CarouselAdmin;
