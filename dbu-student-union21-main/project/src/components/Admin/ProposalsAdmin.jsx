/** @format */
import React, { useState, useEffect } from "react";
import {
  FileText,
  Users,
  CheckCircle,
  Clock,
  AlertCircle,
  Download,
  Calendar,
  Settings,
  RefreshCw,
  Search,
  Filter,
  History,
  X,
  Eye,
  ShieldCheck,
  Check,
  FileCheck,
  Key,
  Copy,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../contexts/AuthContext";
import { apiService } from "../../services/api";
import toast from "react-hot-toast";

export function ProposalsAdmin() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL, SUBMITTED, PENDING
  const [downloadingId, setDownloadingId] = useState(null);

  // 2019 Candidate Exam Codes State
  const [showExamCodes, setShowExamCodes] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);

  // Deadline Settings State
  const [showDeadlineModal, setShowDeadlineModal] = useState(false);
  const [deadlineInput, setDeadlineInput] = useState("");
  const [savingDeadline, setSavingDeadline] = useState(false);

  // Version History Modal
  const [selectedCandidateHistory, setSelectedCandidateHistory] = useState(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await apiService.getPresidentProposalDashboard();
      setData(res);

      if (res?.settings?.deadline) {
        // Pre-fill datetime-local picker formatted for local input
        const d = new Date(res.settings.deadline);
        const pad = (n) => String(n).padStart(2, "0");
        const formatted = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        setDeadlineInput(formatted);
      }
    } catch (err) {
      console.error("Failed to load proposal dashboard:", err);
      toast.error(err.message || "Failed to load candidate proposals.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDeadline = async (e) => {
    e.preventDefault();
    if (!deadlineInput) {
      toast.error("Please select a closing date and time.");
      return;
    }

    try {
      setSavingDeadline(true);
      const isoDeadline = new Date(deadlineInput).toISOString();
      const res = await apiService.updateProposalDeadline({ deadline: isoDeadline });
      toast.success(res.message || "Deadline updated successfully!");
      setShowDeadlineModal(false);
      await fetchDashboard();
    } catch (err) {
      console.error("Deadline update error:", err);
      toast.error(err.message || "Failed to update deadline.");
    } finally {
      setSavingDeadline(false);
    }
  };

  const handleClearDeadline = async () => {
    if (!window.confirm("Are you sure you want to disable submissions by clearing the deadline?")) return;

    try {
      setSavingDeadline(true);
      const res = await apiService.updateProposalDeadline({ deadline: null });
      toast.success(res.message || "Deadline cleared.");
      setDeadlineInput("");
      setShowDeadlineModal(false);
      await fetchDashboard();
    } catch (err) {
      console.error("Deadline clear error:", err);
      toast.error(err.message || "Failed to clear deadline.");
    } finally {
      setSavingDeadline(false);
    }
  };

  const handleDownloadFile = async (proposalId, version, fileName) => {
    try {
      setDownloadingId(`${proposalId}-${version || "latest"}`);
      await apiService.downloadProposalFile(proposalId, version, fileName);
      toast.success("Download started successfully.");
    } catch (err) {
      console.error("Download error:", err);
      toast.error(err.message || "Failed to download proposal PDF.");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Copied code: ${code}`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-20">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading candidate proposals and registry...</p>
        </div>
      </div>
    );
  }

  const { summary, settings, candidates = [] } = data || {};

  const filteredCandidates = candidates.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.department && c.department.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.position && c.position.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.latestReferenceNumber && c.latestReferenceNumber.toLowerCase().includes(searchTerm.toLowerCase()));

    if (statusFilter === "SUBMITTED") return matchesSearch && c.isSubmitted;
    if (statusFilter === "PENDING") return matchesSearch && !c.isSubmitted;
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header Bar */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> Student Union President Exclusive
              </span>
              <span className="text-xs font-semibold text-gray-500">&bull; Debre Berhan University</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Candidate Proposal Management
            </h1>
            <p className="text-gray-600 text-sm mt-1">
              Review and download official PDF proposals submitted by authorized Student Union candidates.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowDeadlineModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-colors"
            >
              <Calendar className="w-4 h-4" /> Configure Deadline
            </button>
            <button
              onClick={fetchDashboard}
              className="inline-flex items-center gap-2 px-3 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {/* Card 1: Total Candidates */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Eligible Candidates</span>
              <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-gray-900">{summary?.totalEligible ?? candidates.length}</div>
            <p className="text-xs text-gray-500 mt-1">Active eligible candidates from election</p>
          </div>

          {/* Card 2: Submitted */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-emerald-200 bg-emerald-50/20">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Proposals Received</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <CheckCircle className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-emerald-900">{summary?.totalSubmitted || 0}</div>
            <p className="text-xs text-emerald-700 mt-1">
              {summary?.totalEligible ? `${Math.round((summary.totalSubmitted / summary.totalEligible) * 100)}% completion` : "0%"}
            </p>
          </div>

          {/* Card 3: Pending */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-amber-200 bg-amber-50/20">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Pending Submissions</span>
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-amber-900">{summary?.totalPending || 0}</div>
            <p className="text-xs text-amber-700 mt-1">Candidates yet to submit their PDF</p>
          </div>

          {/* Card 4: Submission Window Status */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Submission Portal</span>
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  settings?.status === "OPEN"
                    ? "bg-emerald-100 text-emerald-700"
                    : settings?.status === "CLOSED"
                    ? "bg-red-100 text-red-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                <Calendar className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-lg font-black uppercase tracking-wider ${
                  settings?.status === "OPEN"
                    ? "text-emerald-700"
                    : settings?.status === "CLOSED"
                    ? "text-red-700"
                    : "text-gray-700"
                }`}
              >
                {settings?.status === "OPEN" ? "Open" : settings?.status === "CLOSED" ? "Closed" : "Not Set"}
              </span>
              {settings?.status === "OPEN" && (
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1 truncate" title={settings?.deadlineEthiopia}>
              {settings?.deadlineEthiopia || "Deadline not configured"}
            </p>
          </div>
        </div>

        {/* ── 2019 BATCH 16 TOP PERFORMER CANDIDATE CODES ACCORDION ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-indigo-100 overflow-hidden mb-6">
          <button
            type="button"
            onClick={() => setShowExamCodes(!showExamCodes)}
            className="w-full px-5 py-3.5 bg-gradient-to-r from-indigo-50 via-sky-50 to-blue-50 flex items-center justify-between hover:bg-indigo-100/60 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-700 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                <Key className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-indigo-950 flex items-center gap-2">
                  2019 Batch &bull; 16 Top Performer Candidate Verification Codes
                  <span className="bg-indigo-200/80 text-indigo-900 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                    Official Reference
                  </span>
                </h3>
                <p className="text-xs text-indigo-700 mt-0.5">
                  Click to view and copy candidate exam verification codes issued during final exams.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-indigo-800 text-xs font-bold flex-shrink-0">
              <span>{showExamCodes ? "Hide Codes" : "View 16 Candidate Codes"}</span>
              {showExamCodes ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </button>

          {showExamCodes && (
            <div className="p-5 border-t border-indigo-100 bg-slate-50/60">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <p className="text-xs text-gray-700 leading-relaxed">
                  Shortlisted candidates from the <strong>2019 Batch (16 Top Performers)</strong> unlock their proposal submission portal by entering their Student ID and their assigned final exam code. Click any code below to copy it:
                </p>
                <span className="text-[11px] font-bold text-indigo-700 whitespace-nowrap">
                  16 Allocated Slots
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                {(settings?.allowedExamCodes || [
                  'DBU-2019-01', 'DBU-2019-02', 'DBU-2019-03', 'DBU-2019-04',
                  'DBU-2019-05', 'DBU-2019-06', 'DBU-2019-07', 'DBU-2019-08',
                  'DBU-2019-09', 'DBU-2019-10', 'DBU-2019-11', 'DBU-2019-12',
                  'DBU-2019-13', 'DBU-2019-14', 'DBU-2019-15', 'DBU-2019-16',
                  'DBU-2019-EXAM', 'DBU2019-TOP16'
                ]).map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => handleCopyCode(code)}
                    className="flex items-center justify-between gap-1 px-2.5 py-1.5 bg-white border border-gray-200 hover:border-indigo-500 hover:bg-indigo-50 rounded-lg text-xs font-mono font-bold text-gray-800 transition-all shadow-sm"
                    title={`Click to copy ${code}`}
                  >
                    <span>{code}</span>
                    {copiedCode === code ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search candidate, ID, or position..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider hidden sm:inline">Filter:</span>
            <div className="flex gap-1.5 bg-gray-100 p-1 rounded-xl w-full sm:w-auto">
              <button
                onClick={() => setStatusFilter("ALL")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === "ALL" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                All ({summary?.totalEligible ?? candidates.length})
              </button>
              <button
                onClick={() => setStatusFilter("SUBMITTED")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === "SUBMITTED"
                    ? "bg-white text-emerald-700 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Submitted ({summary?.totalSubmitted || 0})
              </button>
              <button
                onClick={() => setStatusFilter("PENDING")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === "PENDING" ? "bg-white text-amber-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Pending ({summary?.totalPending || 0})
              </button>
            </div>
          </div>
        </div>

        {/* Candidates Proposal Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4 sm:px-6">Candidate Details</th>
                  <th className="py-3.5 px-4">Position / Department</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Latest Reference</th>
                  <th className="py-3.5 px-4">Submission Time (EAT)</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs sm:text-sm">
                {filteredCandidates.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-gray-500">
                      No candidates found matching the criteria.
                    </td>
                  </tr>
                ) : (
                  filteredCandidates.map((c, idx) => (
                    <tr key={c.username} className="hover:bg-slate-50/80 transition-colors">
                      {/* Name & ID */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 font-bold text-[11px] flex items-center justify-center flex-shrink-0">
                            {idx + 1}
                          </span>
                          <div>
                            <div className="font-bold text-gray-900">{c.name}</div>
                            <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono text-gray-500 mt-0.5">
                              <span>{c.username}</span>
                              {c.examCode && (
                                <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold px-1.5 py-0.5 rounded text-[10px]">
                                  Code: {c.examCode}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Position / Dept */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-gray-800">{c.position}</div>
                        <div className="text-[11px] text-gray-500">
                          {c.department} &bull; {c.year}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {c.isSubmitted ? (
                          c.status === 'Submitted (Archived)' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
                              <CheckCircle className="w-3.5 h-3.5 text-slate-500" /> Archived (V{c.currentVersion})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                              <CheckCircle className="w-3.5 h-3.5" /> Submitted (V{c.currentVersion})
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                            <Clock className="w-3.5 h-3.5" /> Pending
                          </span>
                        )}
                      </td>

                      {/* Reference Number */}
                      <td className="py-3.5 px-4 font-mono text-xs">
                        {c.latestReferenceNumber ? (
                          <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-700 font-bold">
                            {c.latestReferenceNumber}
                          </span>
                        ) : (
                          <span className="text-gray-400">&mdash;</span>
                        )}
                      </td>

                      {/* Submission Time */}
                      <td className="py-3.5 px-4 text-xs text-gray-600">
                        {c.latestSubmittedAtFormatted || <span className="text-gray-400">Not yet submitted</span>}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 sm:px-6 text-right">
                        {c.isSubmitted ? (
                          <div className="flex items-center justify-end gap-2">
                            {/* Download Button */}
                            <button
                              onClick={() => handleDownloadFile(c.proposalId, c.currentVersion, c.fileName)}
                              disabled={downloadingId === `${c.proposalId}-latest`}
                              title="Download PDF"
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-sky-700 hover:bg-sky-800 text-white rounded-lg text-xs font-bold shadow-sm transition-colors disabled:opacity-50"
                            >
                              <Download className="w-3.5 h-3.5" />
                              {downloadingId === `${c.proposalId}-latest` ? "..." : "PDF"}
                            </button>

                            {/* View Revision History */}
                            {c.versionHistory && c.versionHistory.length > 1 && (
                              <button
                                onClick={() => setSelectedCandidateHistory(c)}
                                title="View previous versions"
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition-colors"
                              >
                                <History className="w-3.5 h-3.5" /> ({c.versionHistory.length})
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">No document</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── DEADLINE CONFIGURATION MODAL ─────────────────────────────────── */}
        <AnimatePresence>
          {showDeadlineModal && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-100"
              >
                <div className="bg-indigo-900 text-white p-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-indigo-200" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg leading-tight">Configure Submission Deadline</h3>
                      <p className="text-xs text-indigo-200 mt-0.5">Timezone: Africa/Addis_Ababa (EAT)</p>
                    </div>
                  </div>
                  <button onClick={() => setShowDeadlineModal(false)} className="text-white/70 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveDeadline} className="p-6 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                      Closing Date &amp; Time
                    </label>
                    <input
                      type="datetime-local"
                      value={deadlineInput}
                      onChange={(e) => setDeadlineInput(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                    <p className="text-xs text-gray-500 mt-1.5">
                      Submissions will automatically lock on the server once this timestamp is reached.
                    </p>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700">
                    <p>
                      <strong>Currently Configured:</strong>
                    </p>
                    <p className="font-semibold text-indigo-900 mt-0.5">
                      {settings?.deadlineEthiopia || "Deadline not set"}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-4 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={handleClearDeadline}
                      disabled={savingDeadline || !settings?.deadline}
                      className="px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl disabled:opacity-40 transition-colors"
                    >
                      Clear Deadline
                    </button>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowDeadlineModal(false)}
                        className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={savingDeadline}
                        className="px-5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold shadow-sm transition-colors disabled:opacity-50"
                      >
                        {savingDeadline ? "Saving..." : "Save Deadline"}
                      </button>
                    </div>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ── VERSION HISTORY MODAL ────────────────────────────────────────── */}
        <AnimatePresence>
          {selectedCandidateHistory && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-gray-100"
              >
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">
                      Proposal Version History &bull; {selectedCandidateHistory.name}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {selectedCandidateHistory.position} &bull; {selectedCandidateHistory.username}
                    </p>
                  </div>
                  <button onClick={() => setSelectedCandidateHistory(null)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 max-h-96 overflow-y-auto space-y-3">
                  {selectedCandidateHistory.versionHistory.map((ver) => (
                    <div
                      key={ver.version}
                      className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">
                            Version {ver.version}
                          </span>
                          <span className="font-semibold text-gray-800">{ver.fileName}</span>
                        </div>
                        <p className="text-gray-500 text-[11px] mt-1 font-mono">Ref: {ver.referenceNumber}</p>
                        <p className="text-gray-400 text-[11px] mt-0.5">Timestamp: {ver.submittedAtFormatted}</p>
                      </div>

                      <button
                        onClick={() =>
                          handleDownloadFile(selectedCandidateHistory.proposalId, ver.version, ver.fileName)
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-700 hover:bg-sky-800 text-white rounded-lg font-bold text-xs shadow-sm transition-colors flex-shrink-0"
                      >
                        <Download className="w-3.5 h-3.5" /> Download
                      </button>
                    </div>
                  ))}
                </div>

                <div className="p-4 bg-gray-50 border-t border-gray-100 text-right">
                  <button
                    onClick={() => setSelectedCandidateHistory(null)}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl text-xs font-bold transition-colors"
                  >
                    Close History
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
