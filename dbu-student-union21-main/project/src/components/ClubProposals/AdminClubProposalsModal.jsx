import React, { useState, useEffect } from "react";
import { X, Search, Filter, CheckCircle, XCircle, AlertTriangle, Clock, Shield, Sparkles, Plus, Loader, ChevronRight, MessageSquare, User, BookOpen, Users, Phone, Mail, Calendar, ArrowRight } from "lucide-react";
import { apiService } from "../../services/api";
import toast from "react-hot-toast";

const STATUS_TABS = [
  { id: "All", label: "All Proposals" },
  { id: "Pending Review", label: "Pending Review" },
  { id: "Under Review", label: "Under Review" },
  { id: "Additional Information Requested", label: "Needs Info" },
  { id: "Approved", label: "Approved" },
  { id: "Rejected", label: "Rejected" }
];

export function AdminClubProposalsModal({ isOpen, onClose, user, onClubCreated }) {
  const [proposals, setProposals] = useState([]);
  const [counts, setCounts] = useState({ all: 0, pending: 0, underReview: 0, needsInfo: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProposal, setSelectedProposal] = useState(null);

  // Review action modal state
  const [actionPrompt, setActionPrompt] = useState(null); // { type: 'REJECT' | 'NEEDS_INFO' | 'NOTE' | 'CREATE_CLUB', title: '' }
  const [promptText, setPromptText] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchProposals();
    }
  }, [isOpen, activeTab, searchTerm]);

  if (!isOpen) return null;

  const fetchProposals = async () => {
    try {
      setLoading(true);
      const res = await apiService.getClubProposals({
        status: activeTab,
        search: searchTerm
      });
      setProposals(res.proposals || []);
      if (res.counts) setCounts(res.counts);
      // Auto-update selectedProposal if open
      if (selectedProposal) {
        const updated = (res.proposals || []).find((p) => p._id === selectedProposal._id);
        if (updated) setSelectedProposal(updated);
      }
    } catch (err) {
      console.error("Failed to fetch club proposals:", err);
      toast.error(err.message || "Failed to load club proposals");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (proposalId, status, extra = {}) => {
    setActionLoading(true);
    try {
      await apiService.updateClubProposalStatus(proposalId, {
        status,
        rejectionReason: extra.rejectionReason,
        additionalInfoRequest: extra.additionalInfoRequest,
        note: extra.note
      });
      toast.success(`Proposal marked as "${status}"`);
      setActionPrompt(null);
      setPromptText("");
      await fetchProposals();
    } catch (err) {
      console.error("Failed to update status:", err);
      toast.error(err.message || "Failed to update status");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddAdminNote = async (proposalId) => {
    if (!promptText.trim()) return;
    setActionLoading(true);
    try {
      await apiService.addClubProposalNote(proposalId, promptText.trim());
      toast.success("Internal administrative note saved");
      setActionPrompt(null);
      setPromptText("");
      await fetchProposals();
    } catch (err) {
      console.error("Failed to add note:", err);
      toast.error(err.message || "Failed to record comment");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateClubFromProposal = async (proposal) => {
    setActionLoading(true);
    try {
      const res = await apiService.createClubFromProposal(proposal._id, {
        name: proposal.proposedClub.name,
        category: proposal.proposedClub.category,
        description: proposal.proposedClub.shortDescription,
        contactEmail: proposal.proposer.email,
        contactPhone: proposal.proposer.phone,
        requirements: `Main Objectives:\n${proposal.proposedClub.objectives}\n\nKey Activities:\n${proposal.proposedClub.activities}\n\nExpected Benefits:\n${proposal.proposedClub.benefits}`
      });
      toast.success(res.message || "Official club successfully created!");
      setActionPrompt(null);
      await fetchProposals();
      if (onClubCreated) {
        onClubCreated(res.club);
      }
    } catch (err) {
      console.error("Failed to create club:", err);
      toast.error(err.message || "Failed to create club");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-6xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white p-6 sm:p-7 shrink-0 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-block bg-blue-500/20 text-blue-200 border border-blue-400/30 text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Authorized Administrative Dashboard
              </span>
              <span className="inline-block bg-amber-500/20 text-amber-300 border border-amber-400/30 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                {counts.pending} Pending Review
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              New Student Club Proposals Management
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Review student initiatives, verify proposer credentials, provide administrative feedback, and officially charter approved clubs.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-2 rounded-xl hover:bg-white/10 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 sm:p-6 border-b border-slate-200/80 bg-slate-50 shrink-0 space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Status Tabs */}
            <div className="flex flex-wrap items-center gap-1.5">
              {STATUS_TABS.map((tab) => {
                const countKey =
                  tab.id === "All"
                    ? "all"
                    : tab.id === "Pending Review"
                    ? "pending"
                    : tab.id === "Under Review"
                    ? "underReview"
                    : tab.id === "Additional Information Requested"
                    ? "needsInfo"
                    : tab.id === "Approved"
                    ? "approved"
                    : "rejected";
                const countVal = counts[countKey] || 0;

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                      activeTab === tab.id
                        ? "bg-slate-900 text-white shadow-sm"
                        : "bg-white text-slate-600 hover:bg-slate-200/80 border border-slate-200"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        activeTab === tab.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {countVal}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search proposer, ID, club..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
          </div>
        </div>

        {/* Main Content Area (Split Grid: List + Detail Drawer) */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          {/* Proposal List Column */}
          <div className="lg:col-span-5 border-r border-slate-200 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
            {loading ? (
              <div className="py-16 text-center text-slate-400 space-y-2">
                <Loader className="w-8 h-8 animate-spin mx-auto text-blue-600" />
                <p className="text-xs">Loading proposals...</p>
              </div>
            ) : proposals.length === 0 ? (
              <div className="py-16 text-center text-slate-500">
                <BookOpen className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="font-bold text-sm">No proposals in this category</p>
                <p className="text-xs text-slate-400 mt-1">Try switching tabs or adjusting search filter</p>
              </div>
            ) : (
              proposals.map((item) => {
                const isSelected = selectedProposal?._id === item._id;
                const statusColor =
                  item.status === "Approved"
                    ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                    : item.status === "Rejected"
                    ? "bg-rose-100 text-rose-800 border-rose-200"
                    : item.status === "Additional Information Requested"
                    ? "bg-purple-100 text-purple-800 border-purple-200"
                    : item.status === "Under Review"
                    ? "bg-blue-100 text-blue-800 border-blue-200"
                    : "bg-amber-100 text-amber-800 border-amber-200";

                return (
                  <div
                    key={item._id}
                    onClick={() => setSelectedProposal(item)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-white border-blue-500 shadow-md ring-2 ring-blue-100"
                        : "bg-white border-slate-200 hover:border-blue-300 hover:shadow-xs"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <span className="font-mono text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                          {item.referenceId}
                        </span>
                        <h4 className="font-bold text-slate-900 text-sm mt-1 line-clamp-1">
                          {item.proposedClub.name}
                        </h4>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${statusColor}`}>
                        {item.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 line-clamp-2 mb-3">
                      {item.proposedClub.shortDescription}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 pt-2.5">
                      <div className="flex items-center gap-1.5 font-medium text-slate-600 truncate">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{item.proposer.fullName}</span>
                        <span className="text-slate-300">•</span>
                        <span className="font-mono text-slate-500">{item.proposer.studentId}</span>
                      </div>
                      {item.isClubCreated && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                          Club Created
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Proposal Detail View Column */}
          <div className="lg:col-span-7 overflow-y-auto p-6 sm:p-8 bg-white">
            {!selectedProposal ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400 space-y-3">
                <BookOpen className="w-12 h-12 text-slate-300" />
                <h4 className="font-bold text-slate-700 text-base">Select a Proposal to Review</h4>
                <p className="text-xs max-w-sm text-slate-500">
                  Click on any club proposal from the left list to review its founding team, objectives, and submit administrative decisions.
                </p>
              </div>
            ) : (
              <div className="space-y-6 animate-fadeIn">
                {/* Proposal Detail Header */}
                <div className="border-b border-slate-200 pb-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
                        {selectedProposal.referenceId}
                      </span>
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-100 px-2.5 py-1 rounded-lg">
                        {selectedProposal.proposedClub.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-full border ${
                          selectedProposal.status === "Approved"
                            ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                            : selectedProposal.status === "Rejected"
                            ? "bg-rose-100 text-rose-800 border-rose-200"
                            : selectedProposal.status === "Additional Information Requested"
                            ? "bg-purple-100 text-purple-800 border-purple-200"
                            : selectedProposal.status === "Under Review"
                            ? "bg-blue-100 text-blue-800 border-blue-200"
                            : "bg-amber-100 text-amber-800 border-amber-200"
                        }`}
                      >
                        {selectedProposal.status}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                    {selectedProposal.proposedClub.name}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                    {selectedProposal.proposedClub.shortDescription}
                  </p>
                </div>

                {/* Section: Proposer Details */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-3">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-4 h-4 text-blue-600" />
                    Proposer Information
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block">Full Name</span>
                      <span className="font-bold text-slate-800">{selectedProposal.proposer.fullName}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Student ID</span>
                      <span className="font-mono font-bold text-blue-700">{selectedProposal.proposer.studentId}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Department & Year</span>
                      <span className="font-semibold text-slate-800">
                        {selectedProposal.proposer.department} • {selectedProposal.proposer.year}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Phone</span>
                      <span className="font-semibold text-slate-800">{selectedProposal.proposer.phone}</span>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-slate-400 block">Email</span>
                      <span className="font-semibold text-slate-800">{selectedProposal.proposer.email}</span>
                    </div>
                  </div>
                </div>

                {/* Section: Proposal Rationale & Objectives */}
                <div className="space-y-4 text-xs sm:text-sm">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-1">
                    <h5 className="font-bold text-slate-800 text-xs uppercase text-indigo-700">
                      Why should this club be established at DBU?
                    </h5>
                    <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {selectedProposal.proposedClub.rationale}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-1">
                      <h5 className="font-bold text-slate-800 text-xs uppercase text-blue-700">
                        Main Objectives
                      </h5>
                      <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {selectedProposal.proposedClub.objectives}
                      </p>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-1">
                      <h5 className="font-bold text-slate-800 text-xs uppercase text-purple-700">
                        Proposed Activities & Programs
                      </h5>
                      <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {selectedProposal.proposedClub.activities}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-1">
                      <h5 className="font-bold text-slate-800 text-xs uppercase text-emerald-700">
                        Expected Student Benefits
                      </h5>
                      <p className="text-slate-700 leading-relaxed">
                        {selectedProposal.proposedClub.benefits}
                      </p>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-1">
                      <h5 className="font-bold text-slate-800 text-xs uppercase text-amber-700">
                        Founding Team & Community
                      </h5>
                      <p className="text-slate-700 leading-relaxed">
                        <strong>Proposed Leader:</strong> {selectedProposal.foundingTeam.proposedLeader}
                        <br />
                        <strong>Estimated Founding Members:</strong> {selectedProposal.proposedClub.estimatedFoundingMembers}
                        {selectedProposal.foundingTeam.facultyAdvisor && (
                          <>
                            <br />
                            <strong>Faculty Advisor:</strong> {selectedProposal.foundingTeam.facultyAdvisor}
                          </>
                        )}
                        {selectedProposal.foundingTeam.foundingMembers && (
                          <>
                            <br />
                            <strong>Members:</strong> {selectedProposal.foundingTeam.foundingMembers}
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Section: Administrative Notes & History */}
                {(selectedProposal.adminNotes || []).length > 0 && (
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
                    <h5 className="font-bold text-slate-700 text-xs uppercase flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                      Internal Administrative Comments
                    </h5>
                    <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                      {selectedProposal.adminNotes.map((note, idx) => (
                        <div key={idx} className="bg-white p-2.5 rounded-xl border border-slate-200 text-xs">
                          <p className="text-slate-800">{note.note}</p>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            By {note.authorName} • {new Date(note.createdAt).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Critical Action: Charter Official Club from Approved Proposal */}
                {selectedProposal.status === "Approved" && !selectedProposal.isClubCreated && (
                  <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-5 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900 text-sm">
                          Charter Official Student Club
                        </h4>
                        <p className="text-xs text-emerald-900 mt-0.5 leading-relaxed">
                          This proposal has been approved. Authorized administrators can now charter the official club into the active DBU directory with one click.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        setActionPrompt({
                          type: "CREATE_CLUB",
                          title: `Establish Official Club: "${selectedProposal.proposedClub.name}"`
                        })
                      }
                      className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Establish Official Club Now</span>
                    </button>
                  </div>
                )}

                {selectedProposal.isClubCreated && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-900 flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="font-bold">Official Club Chartered & Active</p>
                      <p className="text-emerald-800">
                        Chartered on {new Date(selectedProposal.clubCreatedAt).toLocaleDateString()}. Duplicate creation is disabled.
                      </p>
                    </div>
                  </div>
                )}

                {/* Administrative Decision Action Controls */}
                <div className="pt-4 border-t border-slate-200 space-y-3">
                  <h4 className="font-bold text-xs text-slate-500 uppercase tracking-wider">
                    Administrative Review Controls
                  </h4>

                  <div className="flex flex-wrap gap-2">
                    {selectedProposal.status !== "Approved" && (
                      <button
                        onClick={() =>
                          handleUpdateStatus(selectedProposal._id, "Approved", {
                            note: "Proposal formally approved by Student Union administration."
                          })
                        }
                        className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-xs"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Approve Proposal</span>
                      </button>
                    )}

                    {selectedProposal.status !== "Under Review" && selectedProposal.status !== "Approved" && (
                      <button
                        onClick={() =>
                          handleUpdateStatus(selectedProposal._id, "Under Review", {
                            note: "Moved to committee evaluation."
                          })
                        }
                        className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-xs"
                      >
                        <Shield className="w-3.5 h-3.5" />
                        <span>Mark Under Review</span>
                      </button>
                    )}

                    <button
                      onClick={() =>
                        setActionPrompt({
                          type: "NEEDS_INFO",
                          title: "Request Additional Information from Proposer"
                        })
                      }
                      className="inline-flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-xs"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Request More Info</span>
                    </button>

                    {selectedProposal.status !== "Rejected" && !selectedProposal.isClubCreated && (
                      <button
                        onClick={() =>
                          setActionPrompt({
                            type: "REJECT",
                            title: "Reject Club Proposal"
                          })
                        }
                        className="inline-flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-xs"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Reject with Reason</span>
                      </button>
                    )}

                    <button
                      onClick={() =>
                        setActionPrompt({
                          type: "NOTE",
                          title: "Add Internal Administrative Note"
                        })
                      }
                      className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs px-3.5 py-2 rounded-xl transition"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                      <span>Add Comment</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Prompt Modal for Rejection Reason, Additional Info Request, or Note */}
        {actionPrompt && (
          <div className="fixed inset-0 z-[60] bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
              <h3 className="text-base font-bold text-slate-900">{actionPrompt.title}</h3>

              {actionPrompt.type === "CREATE_CLUB" ? (
                <div className="text-xs text-slate-600 space-y-2">
                  <p>
                    You are about to officially establish <strong>{selectedProposal.proposedClub.name}</strong> as an active DBU Student Club.
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-slate-500">
                    <li>Category: {selectedProposal.proposedClub.category}</li>
                    <li>Lead Coordinator: {selectedProposal.proposer.fullName}</li>
                    <li>Status will become Active in the public directory</li>
                  </ul>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    {actionPrompt.type === "REJECT"
                      ? "Rejection Reason (Visible to Student)"
                      : actionPrompt.type === "NEEDS_INFO"
                      ? "Specific Information Requested (Visible to Student)"
                      : "Internal Comment (Admin Only)"}
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    placeholder={
                      actionPrompt.type === "REJECT"
                        ? "Explain the criteria or reasons why this proposal cannot be approved..."
                        : actionPrompt.type === "NEEDS_INFO"
                        ? "Specify the missing details or documents needed from the proposer..."
                        : "Write internal observation or notes for the committee..."
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setActionPrompt(null);
                    setPromptText("");
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionLoading || (actionPrompt.type !== "CREATE_CLUB" && !promptText.trim())}
                  onClick={() => {
                    if (actionPrompt.type === "CREATE_CLUB") {
                      handleCreateClubFromProposal(selectedProposal);
                    } else if (actionPrompt.type === "REJECT") {
                      handleUpdateStatus(selectedProposal._id, "Rejected", {
                        rejectionReason: promptText.trim()
                      });
                    } else if (actionPrompt.type === "NEEDS_INFO") {
                      handleUpdateStatus(selectedProposal._id, "Additional Information Requested", {
                        additionalInfoRequest: promptText.trim()
                      });
                    } else if (actionPrompt.type === "NOTE") {
                      handleAddAdminNote(selectedProposal._id);
                    }
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition disabled:opacity-50 ${
                    actionPrompt.type === "REJECT"
                      ? "bg-rose-600 hover:bg-rose-700"
                      : actionPrompt.type === "CREATE_CLUB"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {actionLoading ? "Processing..." : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

