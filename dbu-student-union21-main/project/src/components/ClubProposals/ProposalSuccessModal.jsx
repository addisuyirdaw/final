import React, { useState } from "react";
import { CheckCircle, Copy, Check, Sparkles, X, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";

export function ProposalSuccessModal({ isOpen, onClose, details, onCheckStatus }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !details) return null;

  const handleCopy = () => {
    if (details.referenceId) {
      navigator.clipboard.writeText(details.referenceId);
      setCopied(true);
      toast.success("Reference ID copied to clipboard!");
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-8 text-center relative border border-slate-100 overflow-hidden">
        {/* Decorative ambient top glow */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-400 via-blue-500 to-indigo-600"></div>

        {/* Big Success Icon */}
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
          <CheckCircle className="w-10 h-10" />
        </div>

        <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">
          Proposal Submitted!
        </h3>

        {/* Required Confirmation Text */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5 text-left text-xs sm:text-sm text-slate-700 leading-relaxed space-y-2 mb-6">
          <p className="font-semibold text-slate-900">
            Your new club proposal has been submitted successfully!
          </p>
          <p className="text-slate-600">
            Thank you for contributing to the DBU student community. Your proposal will be reviewed by the Student Union administration. You will be informed when its status changes.
          </p>
        </div>

        {/* Reference ID Card */}
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border border-blue-200/80 rounded-2xl p-4 text-left mb-6">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">
              Proposal Reference ID
            </span>
            <span className="text-[11px] text-blue-700 font-medium">Keep for Tracking</span>
          </div>
          <div className="flex items-center justify-between bg-white px-3.5 py-2.5 rounded-xl border border-blue-200">
            <span className="font-mono text-base sm:text-lg font-black text-indigo-700 tracking-wide">
              {details.referenceId}
            </span>
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Proposed Club: <strong>{details.clubName}</strong>
          </p>
        </div>

        {/* Review Reminder */}
        <div className="flex items-center gap-2 text-xs text-slate-500 justify-center mb-6">
          <ShieldCheck className="w-4 h-4 text-indigo-600" />
          <span>Status: <strong>Pending Review</strong> by Student Union</span>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          {onCheckStatus && (
            <button
              onClick={() => {
                onClose();
                onCheckStatus(details.referenceId);
              }}
              className="flex-1 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold py-2.5 px-4 rounded-xl transition text-sm"
            >
              Check Status
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl shadow-md transition text-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

