import React, { useState, useEffect } from "react";
import { Search, X, Loader, CheckCircle, Clock, AlertTriangle, XCircle, Shield, Info, Calendar, Sparkles } from "lucide-react";
import { apiService } from "../../services/api";
import toast from "react-hot-toast";

const STATUS_CONFIG = {
  "Pending Review": {
    color: "bg-amber-100 text-amber-800 border-amber-200",
    icon: Clock,
    desc: "Your proposal is queued and waiting for initial administrative review."
  },
  "Under Review": {
    color: "bg-blue-100 text-blue-800 border-blue-200",
    icon: Shield,
    desc: "Your proposal is actively being evaluated by the Student Union and Academic Affairs committee."
  },
  "Additional Information Requested": {
    color: "bg-purple-100 text-purple-800 border-purple-200",
    icon: AlertTriangle,
    desc: "The administration has reviewed your proposal and requested additional details."
  },
  "Approved": {
    color: "bg-emerald-100 text-emerald-800 border-emerald-200",
    icon: CheckCircle,
    desc: "Congratulations! Your club proposal has been formally approved by the administration."
  },
  "Rejected": {
    color: "bg-rose-100 text-rose-800 border-rose-200",
    icon: XCircle,
    desc: "Your proposal was reviewed and could not be approved at this time."
  }
};

export function ProposalStatusLookupModal({ isOpen, onClose, initialReferenceId = "" }) {
  const [referenceId, setReferenceId] = useState(initialReferenceId);
  const [loading, setLoading] = useState(false);
  const [proposal, setProposal] = useState(null);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (initialReferenceId) {
      setReferenceId(initialReferenceId);
      handleLookup(initialReferenceId);
    }
  }, [initialReferenceId]);

  if (!isOpen) return null;

  const handleLookup = async (idToSearch) => {
    const target = (idToSearch || referenceId).trim().toUpperCase();
    if (!target) {
      toast.error("Please enter a Proposal Reference ID");
      return;
    }

    setLoading(true);
    setSearched(true);
    try {
      const response = await apiService.getClubProposalStatus(target);
      if (response?.proposal) {
        setProposal(response.proposal);
      } else {
        setProposal(null);
        toast.error("No proposal found matching this reference ID");
      }
    } catch (err) {
      console.error("Lookup failed:", err);
      setProposal(null);
      toast.error(err.message || "Failed to find proposal status");
    } finally {
      setLoading(false);
    }
  };

  const statusInfo = proposal?.status ? STATUS_CONFIG[proposal.status] || STATUS_CONFIG["Pending Review"] : null;
  const StatusIcon = statusInfo?.icon || Clock;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-6 sm:p-8 relative border border-slate-100 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100 shrink-0">
          <div>
            <span className="inline-block bg-blue-100 text-blue-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider mb-1">
              Proposal Status Tracker
            </span>
            <h3 className="text-xl font-bold text-slate-900">
              Check New Club Proposal Status
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="py-4 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLookup();
            }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={referenceId}
                onChange={(e) => setReferenceId(e.target.value.toUpperCase())}
                placeholder="Enter Reference ID (e.g. PROP-7A9B2F)"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition uppercase"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition shadow-sm flex items-center gap-1.5"
            >
              {loading ? <Loader className="w-4 h-4 animate-spin" /> : <span>Track</span>}
            </button>
          </form>
        </div>

        {/* Content Area */}
        <div className="overflow-y-auto space-y-4 pt-1 pb-4">
          {loading && (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Loader className="w-8 h-8 animate-spin mx-auto text-blue-600" />
              <p className="text-xs">Looking up proposal status...</p>
            </div>
          )}

          {!loading && searched && !proposal && (
            <div className="py-10 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6">
              <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800">No Proposal Found</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                We could not find any club proposal matching that reference number. Please check the spelling or format.
              </p>
            </div>
          )}

          {!loading && proposal && (
            <div className="space-y-4 animate-fadeIn">
              {/* Proposal Banner */}
              <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-5 rounded-2xl shadow-md space-y-1">
                <span className="text-[10px] uppercase font-bold text-indigo-300 tracking-wider">
                  {proposal.category} Category
                </span>
                <h4 className="text-lg font-bold">
                  {proposal.proposedClubName}
                </h4>
                <p className="text-xs text-slate-300 line-clamp-2">
                  {proposal.shortDescription}
                </p>
              </div>

              {/* Status Badge & Explanation */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Review Status</span>
                  <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border ${statusInfo.color}`}>
                    <StatusIcon className="w-3.5 h-3.5" />
                    <span>{proposal.status}</span>
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed pt-1">
                  {statusInfo.desc}
                </p>
              </div>

              {/* Administrative Feedback or Request if present */}
              {proposal.additionalInfoRequest && proposal.status === "Additional Information Requested" && (
                <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 text-xs text-purple-900 space-y-1.5">
                  <p className="font-bold flex items-center gap-1.5 text-purple-950">
                    <Info className="w-4 h-4 text-purple-600" />
                    Requested Information from Administration:
                  </p>
                  <p className="text-purple-800 whitespace-pre-wrap leading-relaxed">
                    {proposal.additionalInfoRequest}
                  </p>
                </div>
              )}

              {proposal.rejectionReason && proposal.status === "Rejected" && (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs text-rose-900 space-y-1.5">
                  <p className="font-bold flex items-center gap-1.5 text-rose-950">
                    <XCircle className="w-4 h-4 text-rose-600" />
                    Administrative Review Decision:
                  </p>
                  <p className="text-rose-800 whitespace-pre-wrap leading-relaxed">
                    {proposal.rejectionReason}
                  </p>
                </div>
              )}

              {proposal.isClubCreated && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-900 space-y-1">
                  <p className="font-bold flex items-center gap-1.5 text-emerald-950">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    Official Club Established!
                  </p>
                  <p className="text-emerald-800 leading-relaxed">
                    This approved proposal has been officially chartered as a recognized student club on campus.
                  </p>
                </div>
              )}

              {/* Meta details */}
              <div className="grid grid-cols-2 gap-3 text-xs text-slate-500 pt-1">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <div>
                    <span className="block text-[10px] uppercase text-slate-400">Submitted</span>
                    <span className="font-semibold text-slate-700">
                      {new Date(proposal.submittedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-slate-400" />
                  <div>
                    <span className="block text-[10px] uppercase text-slate-400">Last Reviewed</span>
                    <span className="font-semibold text-slate-700">
                      {proposal.reviewedAt ? new Date(proposal.reviewedAt).toLocaleDateString() : "Pending"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 text-right shrink-0">
          <button
            onClick={onClose}
            className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

