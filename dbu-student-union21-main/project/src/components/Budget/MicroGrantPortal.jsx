/** @format */
import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { GrantApplicationModal } from './GrantApplicationModal';
import {
  Sparkles,
  Plus,
  Filter,
  Search,
  Building,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Award,
  DollarSign,
  ChevronRight,
  ShieldCheck,
  Send,
  Eye,
  FileText,
} from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  PENDING: {
    label: 'Pending Review',
    color: 'bg-amber-50 text-amber-800 border-amber-200',
    icon: Clock,
  },
  UNDER_REVIEW: {
    label: 'Under Evaluation',
    color: 'bg-blue-50 text-blue-800 border-blue-200',
    icon: RefreshCw,
  },
  APPROVED: {
    label: 'Approved for Funding',
    color: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    icon: CheckCircle2,
  },
  DISBURSED: {
    label: 'Funds Disbursed',
    color: 'bg-purple-50 text-purple-800 border-purple-200',
    icon: ShieldCheck,
  },
  REJECTED: {
    label: 'Not Funded',
    color: 'bg-red-50 text-red-800 border-red-200',
    icon: XCircle,
  },
};

export function MicroGrantPortal() {
  const { user } = useAuth();
  const [grants, setGrants] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedGrant, setSelectedGrant] = useState(null);
  const [evaluatingGrant, setEvaluatingGrant] = useState(null);

  // Admin evaluation state
  const [newStatus, setNewStatus] = useState('APPROVED');
  const [approvedAmount, setApprovedAmount] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);

  const isReviewer =
    user?.isAdmin ||
    ['admin', 'system_admin', 'superadmin', 'audit_finance', 'clubs_coordinator', 'academic_affairs', 'president'].includes(
      user?.role
    );

  const fetchGrants = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (categoryFilter !== 'ALL') params.category = categoryFilter;

      const res = await apiService.getMicroGrants(params);
      if (res.success) {
        setGrants(res.grants || []);
        setStats(res.stats || null);
      }
    } catch (err) {
      console.error('Fetch grants error:', err);
      toast.error('Failed to load micro-grants pool');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGrants();
  }, [statusFilter, categoryFilter]);

  const handleOpenEvaluation = (grant) => {
    setEvaluatingGrant(grant);
    setNewStatus(grant.status === 'PENDING' ? 'APPROVED' : grant.status);
    setApprovedAmount(grant.amountApproved || grant.amountRequested || '');
    setReviewNotes(grant.reviewNotes || '');
  };

  const handleSaveEvaluation = async (e) => {
    e?.preventDefault();
    if (!evaluatingGrant) return;

    try {
      setSavingStatus(true);
      const res = await apiService.updateGrantStatus(evaluatingGrant._id, {
        status: newStatus,
        amountApproved: parseFloat(approvedAmount) || undefined,
        reviewNotes: reviewNotes.trim(),
      });

      if (res.success) {
        toast.success(res.message || 'Grant status updated successfully!');
        setEvaluatingGrant(null);
        fetchGrants();
      } else {
        toast.error(res.message || 'Failed to update grant status');
      }
    } catch (err) {
      console.error('Grant evaluation error:', err);
      toast.error(err.message || 'Server error updating status');
    } finally {
      setSavingStatus(false);
    }
  };

  const filteredGrants = grants.filter((g) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      g.title?.toLowerCase().includes(term) ||
      g.purpose?.toLowerCase().includes(term) ||
      g.applicantId?.name?.toLowerCase().includes(term) ||
      g.universityId?.name?.toLowerCase().includes(term) ||
      g.clubId?.name?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-sky-800 to-blue-900 text-white rounded-2xl p-6 md:p-10 shadow-sm relative overflow-hidden">
        <div className="max-w-3xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            Inter-University Federation Innovation Fund
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight">Student Micro-Grants Portal</h1>
          <p className="text-sky-100 text-sm sm:text-base mt-2 leading-relaxed">
            Direct seed funding and micro-grants for student club prototypes, environmental projects, hackathon
            innovations, and campus outreach. Fully audited and published to the public ledger.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => setShowApplyModal(true)}
              className="inline-flex items-center gap-2 px-5 py-3 bg-white text-sky-900 hover:bg-sky-50 font-bold rounded-xl text-sm transition-all shadow-md hover:shadow-lg"
            >
              <Plus className="w-4 h-4" />
              Apply for Project Micro-Grant
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/10 text-white relative z-10">
            <div>
              <p className="text-xs text-sky-200 uppercase font-semibold">Total Proposals</p>
              <p className="text-2xl font-black mt-0.5">{stats.totalApplications}</p>
            </div>
            <div>
              <p className="text-xs text-sky-200 uppercase font-semibold">Funding Requested</p>
              <p className="text-2xl font-black mt-0.5">{(stats.totalFundingRequested || 0).toLocaleString()} ETB</p>
            </div>
            <div>
              <p className="text-xs text-sky-200 uppercase font-semibold">Disbursed to Date</p>
              <p className="text-2xl font-black mt-0.5 text-emerald-300">
                {(stats.totalFundingDisbursed || 0).toLocaleString()} ETB
              </p>
            </div>
            <div>
              <p className="text-xs text-sky-200 uppercase font-semibold">Active & Approved</p>
              <p className="text-2xl font-black mt-0.5">
                {(stats.statusCounts?.APPROVED || 0) + (stats.statusCounts?.DISBURSED || 0)} Projects
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search projects or applicants..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all outline-none"
          />
        </div>

        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto overflow-x-auto">
          {['ALL', 'PENDING', 'UNDER_REVIEW', 'APPROVED', 'DISBURSED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                statusFilter === st
                  ? 'bg-sky-700 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Grants Cards Grid */}
      {loading ? (
        <div className="py-16 text-center text-gray-500">
          <RefreshCw className="w-8 h-8 mx-auto mb-3 text-sky-600 animate-spin" />
          <p className="text-sm font-semibold">Loading Micro-Grant Proposals...</p>
        </div>
      ) : filteredGrants.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-500">
          <Award className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-gray-800">No grant applications found</h3>
          <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
            Be the first student club or innovator to apply for funding!
          </p>
          <button
            onClick={() => setShowApplyModal(true)}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-sky-700 text-white rounded-xl text-xs font-bold"
          >
            <Plus className="w-4 h-4" /> Apply for Micro-Grant
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredGrants.map((grant) => {
            const statusConf = STATUS_CONFIG[grant.status] || STATUS_CONFIG.PENDING;
            const StatusIcon = statusConf.icon;

            return (
              <div
                key={grant._id}
                className="bg-white rounded-2xl border border-gray-200 hover:border-sky-300 transition-all p-6 shadow-sm hover:shadow-md flex flex-col justify-between"
              >
                <div>
                  {/* Card Header: Category & Status */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-700 bg-sky-50 px-2.5 py-1 rounded-md border border-sky-100">
                      {grant.category?.replace('_', ' ') || 'Innovation'}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${statusConf.color}`}
                    >
                      <StatusIcon className="w-3 h-3" />
                      {statusConf.label}
                    </span>
                  </div>

                  {/* Title & Purpose */}
                  <h3 className="text-lg font-bold text-gray-900 leading-snug">{grant.title}</h3>
                  <p className="text-xs text-gray-600 mt-2 line-clamp-3 leading-relaxed">{grant.purpose}</p>

                  {/* Institutional Tags */}
                  <div className="flex flex-wrap items-center gap-3 mt-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Building className="w-3.5 h-3.5 text-sky-600" />
                      <span>{grant.universityId?.name || 'Debre Berhan University'}</span>
                    </div>
                    {grant.clubId && (
                      <div className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-purple-600" />
                        <span>{grant.clubId.name}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      <span>{grant.timelineMonths || 3} Mos</span>
                    </div>
                  </div>
                </div>

                {/* Footer: Funding & Actions */}
                <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Requested Fund</span>
                    <span className="text-lg font-black text-gray-900 font-mono">
                      {(grant.amountRequested || 0).toLocaleString()} ETB
                    </span>
                    {grant.amountApproved > 0 && (
                      <span className="text-[10px] font-bold text-emerald-600 block">
                        Approved: {grant.amountApproved.toLocaleString()} ETB
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {isReviewer && (
                      <button
                        onClick={() => handleOpenEvaluation(grant)}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-xs font-bold rounded-lg transition-colors"
                      >
                        Review / Disburse
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Grant Application Modal */}
      <GrantApplicationModal
        isOpen={showApplyModal}
        onClose={() => setShowApplyModal(false)}
        onSuccess={() => {
          fetchGrants();
        }}
      />

      {/* Admin Evaluation Modal */}
      {evaluatingGrant && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-sky-900 text-white p-6 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Evaluate Micro-Grant Proposal</h3>
                <p className="text-xs text-sky-200 mt-0.5 font-mono">{evaluatingGrant.title}</p>
              </div>
              <button
                onClick={() => setEvaluatingGrant(null)}
                className="p-1 hover:bg-white/10 rounded-full text-white/80"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveEvaluation} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Grant Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-semibold"
                >
                  <option value="UNDER_REVIEW">UNDER REVIEW</option>
                  <option value="APPROVED">APPROVED (Awaiting Disbursement)</option>
                  <option value="DISBURSED">DISBURSED (Post to Public Ledger Now)</option>
                  <option value="REJECTED">REJECTED</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Approved Amount (ETB)
                </label>
                <input
                  type="number"
                  value={approvedAmount}
                  onChange={(e) => setApprovedAmount(e.target.value)}
                  placeholder={evaluatingGrant.amountRequested}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-bold font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Reviewer Committee Notes</label>
                <textarea
                  rows={3}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Notes explaining evaluation criteria or disbursement terms..."
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEvaluatingGrant(null)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold text-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingStatus}
                  className="px-5 py-2 bg-sky-700 hover:bg-sky-800 text-white rounded-xl text-xs font-bold"
                >
                  {savingStatus ? 'Saving...' : 'Update & Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
