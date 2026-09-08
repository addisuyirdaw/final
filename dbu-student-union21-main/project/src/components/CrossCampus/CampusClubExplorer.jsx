/** @format */
import React, { useState, useEffect, useCallback } from 'react';
import { apiService } from '../../services/api';
import { Search, Filter, Users, ExternalLink, BadgeCheck, Globe } from 'lucide-react';

const CATEGORIES = ['All', 'Academic', 'Technology', 'Cultural', 'Sports', 'Service', 'Arts', 'Professional', 'Social', 'Religious', 'Other'];

const UNIVERSITY_COLORS = {
  DBU: '#0284c7', AAU: '#7c3aed', BDU: '#059669', JU: '#d97706',
  HU: '#dc2626', MU: '#0891b2', WU: '#be185d', ASTU: '#4f46e5',
};

function UniBadge({ code }) {
  const color = UNIVERSITY_COLORS[code] || '#6b7280';
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-white text-[10px] font-bold tracking-wide"
      style={{ backgroundColor: color }}
    >
      {code}
    </span>
  );
}

function ClubCard({ club }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 p-5 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
          style={{ backgroundColor: UNIVERSITY_COLORS[club.universityCode] || '#6b7280' }}
        >
          {club.name.charAt(0)}
        </div>
        <div className="flex flex-col items-end gap-1">
          <UniBadge code={club.universityCode} />
          {club.isVerified && (
            <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
              <BadgeCheck className="w-3 h-3" /> Verified
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div>
        <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-2">{club.name}</h3>
        <span className="inline-block mt-1 text-[10px] px-2 py-0.5 bg-sky-50 text-sky-700 rounded-full font-medium border border-sky-100">
          {club.category}
        </span>
      </div>

      {club.description && (
        <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{club.description}</p>
      )}

      {/* Footer */}
      <div className="mt-auto pt-2 border-t border-gray-50 flex items-center justify-between text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <Users className="w-3 h-3" />
          {club.memberCount > 0 ? `${club.memberCount.toLocaleString()} members` : 'Members N/A'}
        </span>
        {club.founded && <span>Est. {club.founded}</span>}
      </div>
    </div>
  );
}

export function CampusClubExplorer({ universities = [] }) {
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUni, setSelectedUni] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchClubs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 12 };
      if (search.trim()) params.search = search.trim();
      if (selectedUni) params.university = selectedUni;
      if (selectedCategory !== 'All') params.category = selectedCategory;

      const res = await apiService.getCrossCampusClubs(params);
      setClubs(res.clubs || []);
      setTotalPages(res.pages || 1);
    } catch (err) {
      console.error('Failed to fetch clubs:', err.message);
      setClubs([]);
    } finally {
      setLoading(false);
    }
  }, [search, selectedUni, selectedCategory, page]);

  useEffect(() => {
    const t = setTimeout(fetchClubs, 300);
    return () => clearTimeout(t);
  }, [fetchClubs]);

  // Reset to page 1 on filter change
  useEffect(() => { setPage(1); }, [search, selectedUni, selectedCategory]);

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search clubs across all campuses..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
          />
        </div>

        <select
          value={selectedUni}
          onChange={e => setSelectedUni(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 outline-none bg-white"
        >
          <option value="">All Universities</option>
          {universities.map(u => (
            <option key={u.code} value={u.code}>{u.code} — {u.name}</option>
          ))}
        </select>

        <select
          value={selectedCategory}
          onChange={e => setSelectedCategory(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 outline-none bg-white"
        >
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-48 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : clubs.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Globe className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No clubs found</p>
          <p className="text-sm mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {clubs.map(club => <ClubCard key={club._id} club={club} />)}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-1.5 rounded-lg border border-gray-200 text-sm disabled:opacity-40 hover:bg-gray-50 transition-colors"
          >
            Previous
          </button>
          <span className="px-4 py-1.5 text-sm text-gray-500">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-1.5 rounded-lg border border-gray-200 text-sm disabled:opacity-40 hover:bg-gray-50 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
