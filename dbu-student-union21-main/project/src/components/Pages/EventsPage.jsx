/** @format */
import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { apiService } from '../../services/api';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Search,
  RefreshCw,
  ExternalLink,
  Tag,
  AlertCircle
} from 'lucide-react';

export function EventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'week' | 'month'

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiService.getUpcomingEvents();
      if (res && res.success) {
        setEvents(res.events || []);
      } else {
        setEvents([]);
      }
    } catch (err) {
      console.error('Failed to fetch upcoming campus events:', err);
      setError('Unable to load campus events at this time. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const formatDate = (dateVal) => {
    if (!dateVal) return 'Date TBD';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return 'Date TBD';
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (timeVal) => {
    if (!timeVal) return null;
    const d = new Date(timeVal);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Filter and search logic
  const filteredEvents = useMemo(() => {
    const now = new Date();

    // End of this week (Sunday 23:59:59)
    const endOfWeek = new Date(now);
    const dayOfWeek = now.getDay();
    const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    endOfWeek.setDate(now.getDate() + daysUntilSunday);
    endOfWeek.setHours(23, 59, 59, 999);

    // End of this month
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    return events.filter((ev) => {
      // Search filter (title + club name)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const titleMatch = (ev.title || '').toLowerCase().includes(query);
        const clubMatch = (ev.club?.name || '').toLowerCase().includes(query);
        if (!titleMatch && !clubMatch) return false;
      }

      // Timeframe filter
      if (activeFilter === 'week') {
        const evDate = new Date(ev.date);
        if (isNaN(evDate.getTime()) || evDate > endOfWeek) return false;
      } else if (activeFilter === 'month') {
        const evDate = new Date(ev.date);
        if (isNaN(evDate.getTime()) || evDate > endOfMonth) return false;
      }

      return true;
    });
  }, [events, searchQuery, activeFilter]);

  const todayDisplay = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="min-h-screen bg-gray-50/50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-6">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <span className="p-2 bg-blue-600 text-white rounded-xl shadow-sm">
                <Calendar className="w-5 h-5" />
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                Campus Events
              </h1>
            </div>
            <p className="text-gray-500 text-sm">
              Discover approved upcoming activities, workshops, and gatherings across DBU clubs.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200/60 rounded-lg">
              📅 Today: {todayDisplay}
            </span>
            <button
              onClick={fetchEvents}
              disabled={loading}
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-white rounded-lg border border-gray-200 transition-colors disabled:opacity-50"
              title="Refresh events"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Controls: Search & Filter */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by event title or club name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Timeframe Filter Buttons */}
          <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-lg self-start md:self-auto">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all ${
                activeFilter === 'all'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All Upcoming
            </button>
            <button
              onClick={() => setActiveFilter('week')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all ${
                activeFilter === 'week'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => setActiveFilter('month')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all ${
                activeFilter === 'month'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              This Month
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between text-red-700 text-sm">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={fetchEvents}
              className="font-bold underline text-xs hover:text-red-900"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading Skeletons */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div
                key={idx}
                className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm animate-pulse space-y-4"
              >
                <div className="flex justify-between items-start">
                  <div className="h-5 bg-gray-200 rounded w-2/3"></div>
                  <div className="h-5 bg-gray-100 rounded w-16"></div>
                </div>
                <div className="h-4 bg-gray-100 rounded w-1/2"></div>
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <div className="h-3.5 bg-gray-100 rounded w-3/4"></div>
                  <div className="h-3.5 bg-gray-100 rounded w-1/2"></div>
                </div>
                <div className="pt-3 border-t border-gray-100 flex justify-between">
                  <div className="h-4 bg-gray-100 rounded w-20"></div>
                  <div className="h-4 bg-gray-100 rounded w-16"></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredEvents.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
            <div className="w-12 h-12 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-gray-800 mb-1">
              {searchQuery || activeFilter !== 'all'
                ? 'No matching events found'
                : 'No upcoming events scheduled right now'}
            </h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
              {searchQuery || activeFilter !== 'all'
                ? 'Try adjusting your search criteria or resetting filters to see more events.'
                : 'Check back soon! Student clubs regularly post campus workshops, meetings, and activities.'}
            </p>
            {(searchQuery || activeFilter !== 'all') ? (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setActiveFilter('all');
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-sm font-semibold transition-colors"
              >
                Reset Filters
              </button>
            ) : (
              <Link
                to="/clubs"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-sm font-semibold shadow-sm transition-colors"
              >
                <Users className="w-4 h-4" />
                Explore Active Clubs
              </Link>
            )}
          </div>
        )}

        {/* Event Cards Grid */}
        {!loading && !error && filteredEvents.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((ev) => {
              const startFormatted = formatTime(ev.startTime);
              const endFormatted = formatTime(ev.endTime);

              return (
                <div
                  key={ev._id || `${ev.title}-${ev.date}`}
                  className="bg-white rounded-xl border border-gray-200/90 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Category & Club Header */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                        <Tag className="w-3 h-3 text-gray-400" />
                        {ev.club?.category || 'General'}
                      </span>
                      <span className="text-xs font-semibold text-blue-600 truncate max-w-[150px]">
                        {ev.club?.name}
                      </span>
                    </div>

                    {/* Title */}
                    <h2 className="text-lg font-bold text-gray-900 line-clamp-2 leading-snug">
                      {ev.title}
                    </h2>

                    {/* Description if present */}
                    {ev.description && (
                      <p className="text-xs text-gray-500 line-clamp-2">
                        {ev.description}
                      </p>
                    )}

                    {/* Event Logistics */}
                    <div className="space-y-1.5 pt-2 border-t border-gray-100 text-xs text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                        <span className="font-semibold text-gray-800">{formatDate(ev.date)}</span>
                      </div>

                      {(startFormatted || endFormatted) && (
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                          <span>
                            {startFormatted && endFormatted
                              ? `${startFormatted} – ${endFormatted}`
                              : startFormatted || endFormatted}
                          </span>
                        </div>
                      )}

                      {ev.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                          <span className="truncate">{ev.location}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Footer: View Club Link */}
                  <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs text-gray-400">DBU Verified Event</span>
                    <Link
                      to={ev.club?._id ? `/clubs/${ev.club._id}` : '/clubs'}
                      className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      View Club
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
