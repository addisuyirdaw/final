/** @format */
import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { X, Sparkles, Send, DollarSign, Building, Users, Calendar, AlertCircle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const GRANT_CATEGORIES = [
  { id: 'TECHNOLOGY_INNOVATION', label: 'Technology & AI Innovation' },
  { id: 'COMMUNITY_OUTREACH', label: 'Community Service & Outreach' },
  { id: 'RESEARCH_ACADEMIC', label: 'Academic & Research Projects' },
  { id: 'ENVIRONMENTAL', label: 'Environmental & Sustainability' },
  { id: 'CULTURAL_ARTS', label: 'Cultural Heritage & Arts' },
  { id: 'OTHER', label: 'Other Student Initiatives' },
];

export function GrantApplicationModal({ isOpen, onClose, onSuccess }) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('TECHNOLOGY_INNOVATION');
  const [amountRequested, setAmountRequested] = useState('');
  const [timelineMonths, setTimelineMonths] = useState(3);
  const [purpose, setPurpose] = useState('');
  const [universityId, setUniversityId] = useState('');
  const [clubId, setClubId] = useState('');

  const [universities, setUniversities] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    async function loadMetadata() {
      try {
        const [univRes, clubRes] = await Promise.all([
          apiService.getUniversities().catch(() => ({ universities: [] })),
          apiService.getClubs().catch(() => ({ clubs: [] })),
        ]);

        const univList = univRes.universities || [];
        setUniversities(univList);

        const dbuUniv = univList.find((u) => u.code === 'DBU');
        if (dbuUniv && !universityId) {
          setUniversityId(dbuUniv._id);
        } else if (univList.length > 0 && !universityId) {
          setUniversityId(univList[0]._id);
        }

        const clubList = clubRes.clubs || clubRes.data || (Array.isArray(clubRes) ? clubRes : []);
        setClubs(clubList);
      } catch (err) {
        console.warn('Metadata load note in grant modal:', err);
      }
    }

    loadMetadata();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanAmount = parseFloat(amountRequested);

    if (!title.trim()) {
      toast.error('Please enter a project title');
      return;
    }
    if (isNaN(cleanAmount) || cleanAmount < 50) {
      toast.error('Please enter a valid requested funding amount (min 50 ETB)');
      return;
    }
    if (!purpose.trim() || purpose.trim().length < 20) {
      toast.error('Please provide a detailed project purpose (at least 20 characters)');
      return;
    }

    try {
      setSubmitting(true);
      const res = await apiService.applyForMicroGrant({
        title: title.trim(),
        category,
        amountRequested: cleanAmount,
        timelineMonths: parseInt(timelineMonths, 10),
        purpose: purpose.trim(),
        universityId: universityId || undefined,
        clubId: clubId || undefined,
      });

      if (res.success) {
        toast.success('Micro-grant application submitted successfully!');
        // Reset form
        setTitle('');
        setAmountRequested('');
        setPurpose('');
        setTimelineMonths(3);
        onSuccess?.(res.grant);
        onClose();
      } else {
        toast.error(res.message || 'Failed to submit grant application');
      }
    } catch (err) {
      console.error('Grant application error:', err);
      toast.error(err.message || 'Server error submitting application');
    } finally {
      setSubmitting(false);
    }
  };

  const presetAmounts = [5000, 10000, 25000, 50000];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-sky-800 via-blue-700 to-indigo-900 text-white p-6 flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 bg-white/10 rounded-full text-xs font-semibold mb-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Student Innovation Funding
            </div>
            <h2 className="text-xl font-bold">Apply for Student Micro-Grant</h2>
            <p className="text-sky-100 text-xs mt-0.5">
              Transparent project funding for student club prototypes, research, and outreach.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/80 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Project Title */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Project Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. IoT Smart Campus Waste Segregation Bin Prototype"
              required
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all outline-none text-gray-800"
            />
          </div>

          {/* Category & Timeline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Grant Category <span className="text-red-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all outline-none text-gray-800"
              >
                {GRANT_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-sky-600" />
                Execution Timeline
              </label>
              <select
                value={timelineMonths}
                onChange={(e) => setTimelineMonths(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all outline-none text-gray-800"
              >
                <option value={1}>1 Month (Sprint / Event)</option>
                <option value={2}>2 Months</option>
                <option value={3}>3 Months (One Quarter)</option>
                <option value={6}>6 Months (Semester Project)</option>
                <option value={12}>1 Year (Annual Initiative)</option>
              </select>
            </div>
          </div>

          {/* Amount Requested */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>
                Amount Requested (ETB) <span className="text-red-500">*</span>
              </span>
              <span className="text-gray-400 font-normal text-[11px]">In Ethiopian Birr (ETB)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-xs font-bold text-gray-400">ETB</span>
              <input
                type="number"
                min="50"
                step="100"
                value={amountRequested}
                onChange={(e) => setAmountRequested(e.target.value)}
                placeholder="25000"
                required
                className="w-full pl-14 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all outline-none text-gray-900 font-mono"
              />
            </div>

            {/* Quick-select chips */}
            <div className="flex flex-wrap gap-2 mt-2">
              {presetAmounts.map((amt) => (
                <button
                  type="button"
                  key={amt}
                  onClick={() => setAmountRequested(amt.toString())}
                  className="px-2.5 py-1 bg-gray-100 hover:bg-sky-50 hover:text-sky-700 text-gray-600 rounded-lg text-xs font-semibold border border-gray-200 transition-colors"
                >
                  +{amt.toLocaleString()} ETB
                </button>
              ))}
            </div>
          </div>

          {/* Affiliation: University & Club */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-sky-600" />
                University Campus <span className="text-red-500">*</span>
              </label>
              <select
                value={universityId}
                onChange={(e) => setUniversityId(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all outline-none text-gray-800"
              >
                {universities.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name} ({u.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-sky-600" />
                Affiliated Club (Optional)
              </label>
              <select
                value={clubId}
                onChange={(e) => setClubId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all outline-none text-gray-800"
              >
                <option value="">Independent Student Project</option>
                {clubs.map((c) => (
                  <option key={c.id || c._id} value={c.id || c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Purpose & Breakdown */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Project Description & Budget Justification <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={4}
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="Outline project objectives, estimated itemized expenses (hardware, materials, transport), expected outcomes, and target student beneficiaries..."
              required
              className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all outline-none text-gray-800 resize-none leading-relaxed"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              All approved grants and disbursements are permanently published to the Public Financial Transparency Ledger.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-5 py-2.5 border border-gray-300 text-gray-700 hover:bg-gray-100 rounded-xl text-sm font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-sky-700 hover:bg-sky-800 disabled:bg-gray-400 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Submitting Proposal...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit Grant Application
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
