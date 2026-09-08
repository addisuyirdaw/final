/** @format */
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { apiService } from '../../services/api';
import { CampusClubExplorer } from '../CrossCampus/CampusClubExplorer';
import { JointEventCard } from '../CrossCampus/JointEventCard';
import { ProposeEventModal } from '../CrossCampus/ProposeEventModal';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe, Users, Calendar, Building2, Plus, ChevronDown,
  Loader, Wifi, MapPin, GraduationCap
} from 'lucide-react';
import toast from 'react-hot-toast';

const TABS = [
  { id: 'universities', label: 'Universities', icon: Building2 },
  { id: 'clubs',        label: 'Club Explorer', icon: Users },
  { id: 'events',       label: 'Joint Events',  icon: Calendar },
];

const UNIVERSITY_COLORS = {
  DBU: '#0284c7', AAU: '#7c3aed', BDU: '#059669', JU: '#d97706',
  HU: '#dc2626', MU: '#0891b2', WU: '#be185d', ASTU: '#4f46e5',
};

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: color + '20' }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );
}

function UniversityCard({ uni }) {
  const color = UNIVERSITY_COLORS[uni.code] || '#6b7280';
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
    >
      {/* Colour bar */}
      <div className="h-2 w-full" style={{ backgroundColor: color }} />
      <div className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-xl flex-shrink-0"
            style={{ backgroundColor: color }}
          >
            {uni.code.charAt(0)}
          </div>
          <span
            className="px-2.5 py-0.5 rounded-full text-white text-[10px] font-bold tracking-wide"
            style={{ backgroundColor: color }}
          >
            {uni.code}
          </span>
        </div>

        <div>
          <h3 className="font-bold text-gray-900 text-sm leading-snug">{uni.name}</h3>
          <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
            <MapPin className="w-3 h-3" /> {uni.location}
          </div>
        </div>

        {uni.description && (
          <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{uni.description}</p>
        )}

        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-50 text-xs text-gray-500">
          {uni.studentCount > 0 && (
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {uni.studentCount.toLocaleString()} students
            </div>
          )}
          {uni.established && (
            <div className="flex items-center gap-1">
              <GraduationCap className="w-3 h-3" />
              Est. {uni.established}
            </div>
          )}
        </div>

        {uni.website && (
          <a
            href={uni.website}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-sky-600 hover:text-sky-700 font-medium"
          >
            <Wifi className="w-3 h-3" /> Visit website
          </a>
        )}
      </div>
    </motion.div>
  );
}

export function CrossCampusNetwork() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('universities');
  const [universities, setUniversities] = useState([]);
  const [events, setEvents] = useState([]);
  const [loadingUnis, setLoadingUnis] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [showProposeModal, setShowProposeModal] = useState(false);
  const [registeringId, setRegisteringId] = useState(null);
  const [eventFilter, setEventFilter] = useState('');

  // Fetch universities once
  useEffect(() => {
    (async () => {
      try {
        setLoadingUnis(true);
        const res = await apiService.getUniversities();
        setUniversities(res.universities || []);
      } catch (err) {
        console.error('Failed to load universities:', err.message);
      } finally {
        setLoadingUnis(false);
      }
    })();
  }, []);

  // Fetch events when tab is active
  const fetchEvents = useCallback(async (filter = '') => {
    setLoadingEvents(true);
    try {
      const params = {};
      if (filter) params.status = filter;
      const res = await apiService.getJointEvents(params);
      setEvents(res.events || []);
    } catch (err) {
      console.error('Failed to load events:', err.message);
    } finally {
      setLoadingEvents(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'events') fetchEvents(eventFilter);
  }, [activeTab, eventFilter, fetchEvents]);

  const handleRegister = async (eventId) => {
    if (!user) { toast.error('Please log in to register'); return; }
    try {
      setRegisteringId(eventId);
      const res = await apiService.registerForJointEvent(eventId);
      if (res.success) {
        toast.success('Successfully registered!');
        fetchEvents(eventFilter);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to register');
    } finally {
      setRegisteringId(null);
    }
  };

  const handleCancel = async (eventId) => {
    try {
      setRegisteringId(eventId);
      const res = await apiService.cancelJointEventRegistration(eventId);
      if (res.success) {
        toast.success('Registration cancelled');
        fetchEvents(eventFilter);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to cancel');
    } finally {
      setRegisteringId(null);
    }
  };

  const totalStudents = universities.reduce((s, u) => s + (u.studentCount || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-sky-900 via-indigo-900 to-violet-900 text-white">
        <div className="absolute inset-0 opacity-10">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white"
              style={{
                width: `${Math.random() * 120 + 20}px`,
                height: `${Math.random() * 120 + 20}px`,
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                opacity: Math.random() * 0.4 + 0.1,
              }}
            />
          ))}
        </div>
        <div className="relative max-w-6xl mx-auto px-4 py-16 sm:py-20">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-sm font-medium">
              <Globe className="w-4 h-4" />
              Cross-Campus Student Club Network
            </div>
            <h1 className="text-4xl sm:text-5xl font-black leading-tight">
              Connect Beyond <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-300 to-violet-300">
                Your Campus
              </span>
            </h1>
            <p className="text-sky-200 max-w-2xl mx-auto text-lg leading-relaxed">
              Discover clubs, collaborate on hackathons, debates, and workshops with students
              from universities across Ethiopia.
            </p>
          </motion.div>

          {/* Stats */}
          {!loadingUnis && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-3 gap-4 mt-10 max-w-xl mx-auto"
            >
              {[
                { label: 'Universities', value: universities.length },
                { label: 'Students', value: totalStudents > 0 ? `${(totalStudents / 1000).toFixed(0)}K+` : '—' },
                { label: 'Joint Events', value: events.length || '∞' },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <p className="text-3xl font-black">{s.value}</p>
                  <p className="text-sky-300 text-sm">{s.label}</p>
                </div>
              ))}
            </motion.div>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-1">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-4 text-sm font-semibold border-b-2 transition-colors ${
                    active
                      ? 'border-sky-600 text-sky-700'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {/* ── Universities tab ── */}
          {activeTab === 'universities' && (
            <motion.div key="universities" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900">Partner Universities</h2>
                <p className="text-sm text-gray-500 mt-1">Ethiopian universities connected through the cross-campus network</p>
              </div>
              {loadingUnis ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-52 bg-gray-100 rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {universities.map(uni => <UniversityCard key={uni._id} uni={uni} />)}
                </div>
              )}
            </motion.div>
          )}

          {/* ── Club Explorer tab ── */}
          {activeTab === 'clubs' && (
            <motion.div key="clubs" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900">Club Explorer</h2>
                <p className="text-sm text-gray-500 mt-1">Browse and search clubs from all connected universities</p>
              </div>
              <CampusClubExplorer universities={universities} />
            </motion.div>
          )}

          {/* ── Joint Events tab ── */}
          {activeTab === 'events' && (
            <motion.div key="events" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Joint Events</h2>
                  <p className="text-sm text-gray-500 mt-1">Inter-university hackathons, debates, workshops & more</p>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={eventFilter}
                    onChange={e => setEventFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 outline-none bg-white"
                  >
                    <option value="">All Status</option>
                    <option value="proposed">Proposed</option>
                    <option value="approved">Approved</option>
                    <option value="ongoing">Ongoing</option>
                    <option value="completed">Completed</option>
                  </select>
                  {user && (
                    <button
                      onClick={() => setShowProposeModal(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
                    >
                      <Plus className="w-4 h-4" /> Propose Event
                    </button>
                  )}
                </div>
              </div>

              {loadingEvents ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : events.length === 0 ? (
                <div className="text-center py-20 text-gray-400">
                  <Calendar className="w-14 h-14 mx-auto mb-4 opacity-30" />
                  <p className="font-semibold text-lg">No events yet</p>
                  <p className="text-sm mt-1">Be the first to propose a joint event!</p>
                  {user && (
                    <button
                      onClick={() => setShowProposeModal(true)}
                      className="mt-6 px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-sm font-semibold transition-colors"
                    >
                      <Plus className="w-4 h-4 inline mr-1" /> Propose an Event
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {events.map(event => (
                    <JointEventCard
                      key={event._id}
                      event={event}
                      currentUserId={user?._id || user?.id}
                      onRegister={handleRegister}
                      onCancel={handleCancel}
                      registering={registeringId === event._id}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Propose Event Modal */}
      {showProposeModal && (
        <ProposeEventModal
          onClose={() => setShowProposeModal(false)}
          onSuccess={() => { fetchEvents(eventFilter); setActiveTab('events'); }}
        />
      )}
    </div>
  );
}
