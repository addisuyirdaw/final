/** @format */
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Loader, Home, ShieldAlert, Sparkles } from "lucide-react";

const API_BASE = (import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "https://dbu-student-portal-2.onrender.com/api" : "http://localhost:5000/api")).replace(/\/api$/, "");

export const Dormitory = () => {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDormitory = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/api/staff?pageGroup=dormitory`);
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

    fetchDormitory();
  }, []);

  // Group profiles by department
  const groupedProfiles = profiles.reduce((groups, profile) => {
    const dept = profile.department || "Housing Administration";
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
            <Home className="w-24 h-24 text-emerald-600" />
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-100 uppercase tracking-widest mb-4">
            <Sparkles className="w-3.5 h-3.5" /> Campus Living
          </span>
          <h1 className="text-4xl md:text-5xl font-black text-gray-950 mb-4 tracking-tight">
            Dormitory Management
          </h1>
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
            Meet the residential advisors, room allocation coordinators, and dormitory supervisors overseeing student accommodation services.
          </p>
        </div>

        {/* Profiles Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="text-center">
              <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-500 font-medium">Loading dormitory staff...</p>
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
            <Home className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-1">No Housing Profiles</h3>
            <p className="text-gray-500 text-sm px-6">No profiles found in the database. Add dormitory staff members through the Admin panel.</p>
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
                        className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200/80 hover:border-blue-200 flex flex-col items-center text-center h-full cursor-pointer transition-all duration-300 ease-in-out hover:scale-[1.03] hover:shadow-[0_10px_30px_rgba(16,185,129,0.08)] group"
                        onClick={() => navigate(`/profile/${profile._id}`)}
                      >
                        {/* Image Container */}
                        <div className="w-40 h-48 rounded-2xl mb-6 overflow-hidden border-4 border-emerald-50 bg-gray-50 shadow-md">
                          <img 
                            src={imageUrl} 
                            alt={profile.name} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                            onError={(e) => { 
                              e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=ECFDF5&color=059669&size=192`; 
                            }} 
                          />
                        </div>

                        {/* Name and Title */}
                        <h3 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-emerald-600 transition-colors">
                          {profile.name}
                        </h3>
                        <p className="text-emerald-600 font-semibold text-sm mb-4">
                          {profile.title}
                        </p>

                        {/* Bio Excerpt */}
                        <div className="text-gray-600 text-sm mb-6 flex-grow text-left w-full bg-gray-50 p-4 rounded-xl border border-gray-100 line-clamp-3">
                          <p>{profile.background || "No bio summary listed."}</p>
                        </div>

                        {/* Footer Action */}
                        <div className="mt-auto w-full pt-4 border-t border-gray-100">
                          <span className="text-emerald-700 font-bold hover:underline flex items-center justify-center gap-1.5 text-sm">
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
    </div>
  );
};

export default Dormitory;
