/** @format */
import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Mail, Phone, MapPin, Loader } from "lucide-react";

const API_BASE = (import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "https://dbu-student-portal-2.onrender.com/api" : "http://localhost:5000/api")).replace(/\/api$/, "");

export const LeadershipProfile = () => {
  const { roleSlug } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/api/leadership/role/${roleSlug}`);
        const data = await res.json();
        
        if (data.success) {
          setProfile(data.profile);
        } else {
          setError(data.message || "Profile not found");
        }
      } catch (err) {
        setError("Network error. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [roleSlug]);

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
          <p className="text-gray-600 mb-6">{error || "The requested leadership profile does not exist or has been removed."}</p>
          <Link to="/" className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium">
            <ArrowLeft className="w-4 h-4 mr-2" /> Return Home
          </Link>
        </div>
      </div>
    );
  }

  const imageUrl = profile.imageUrl?.startsWith("/uploads") ? `${API_BASE}${profile.imageUrl}` : (profile.imageUrl || "");

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Link to="/#leadership" className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Directory
        </Link>

        {/* Profile Header Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-200 mb-8"
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
              <p className="text-xl text-blue-600 font-semibold mb-6">{profile.role}</p>
              
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

        {/* Bio & Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Bio Content */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2 space-y-8"
          >
            {profile.bio && (
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b border-gray-100 pb-4">Overview</h2>
                <p className="text-gray-700 text-lg leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
              </div>
            )}

            {profile.bioDetails && profile.bioDetails.length > 0 && (
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 border-b border-gray-100 pb-4">Detailed Information</h2>
                <div className="space-y-6">
                  {profile.bioDetails.map((detail, index) => (
                    <div key={index}>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">{detail.label}</h3>
                      <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{detail.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>

          {/* Sidebar */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-8"
          >
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200">
              <h3 className="font-bold text-gray-900 mb-4 uppercase tracking-wider text-sm">Office Location</h3>
              <div className="flex items-start gap-3 text-gray-600">
                <MapPin className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">Student Affairs Building</p>
                  <p className="text-sm">Main Campus, Debre Berhan University</p>
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
    </div>
  );
};

export default LeadershipProfile;
