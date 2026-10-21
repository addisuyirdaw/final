/** @format */
import React, { useState, useEffect } from "react";
import {
  FileText,
  Upload,
  Clock,
  CheckCircle,
  AlertCircle,
  Shield,
  Download,
  History,
  Calendar,
  User,
  ArrowRight,
  FileCheck,
  RefreshCw,
  Key,
  Unlock,
  Sparkles,
  Award,
  Lock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../contexts/AuthContext";
import { apiService } from "../../services/api";
import toast from "react-hot-toast";

// ── Official 16 Exam Codes from Electoral Board Notice ──────────────────────
const OFFICIAL_16_CODES = [
  "16", "23", "02", "32", "37", "38", "22", "19", "04", "30", "24", "20", "03", "36", "34", "15"
];

// ── Countdown Timer Component for Proposal Submissions ──────────────────────
const ProposalCountdown = ({ deadline, onDeadlineReached }) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false,
  });

  useEffect(() => {
    if (!deadline) return;

    const targetDate = new Date(deadline);

    const updateTimer = () => {
      const now = new Date();
      const diff = targetDate.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });
        if (onDeadlineReached) onDeadlineReached();
        return;
      }

      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
        isExpired: false,
      });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [deadline, onDeadlineReached]);

  if (timeLeft.isExpired) {
    return (
      <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5 mb-8 text-center shadow-sm">
        <div className="flex items-center justify-center gap-2 text-red-800 font-bold text-lg uppercase tracking-wider">
          <Clock className="w-5 h-5 text-red-600" />
          Submission Window Closed
        </div>
        <p className="text-red-600 text-sm mt-1">The deadline has passed. New submissions or replacements are now disabled.</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-sky-900 border border-indigo-700/50 text-white rounded-2xl p-6 mb-8 shadow-md relative overflow-hidden">
      <div className="absolute top-3 right-4 flex items-center gap-2">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
        </span>
        <span className="text-emerald-300 font-bold uppercase text-xs tracking-wider">Submissions Open</span>
      </div>

      <div className="flex items-center gap-2 text-sky-200 font-semibold mb-3 uppercase tracking-widest text-xs">
        <Clock className="w-4 h-4 text-sky-300" /> Time Remaining Until Final Deadline:
      </div>

      <div className="grid grid-cols-4 gap-3 max-w-md">
        {[
          { label: "Days", val: timeLeft.days },
          { label: "Hours", val: timeLeft.hours },
          { label: "Min", val: timeLeft.minutes },
          { label: "Sec", val: timeLeft.seconds },
        ].map((unit, i) => (
          <div key={i} className="flex flex-col items-center">
            <div className="bg-white/10 backdrop-blur-md px-3 py-2 sm:px-4 sm:py-3 rounded-xl border border-white/20 text-2xl sm:text-3xl font-black text-white shadow-inner w-full text-center">
              {String(unit.val).padStart(2, "0")}
            </div>
            <span className="text-[11px] uppercase tracking-wider font-bold text-sky-200 mt-1">{unit.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export function ProposalSubmission() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [statusData, setStatusData] = useState(null);
  const [file, setFile] = useState(null);
  const [note, setNote] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // 2019 Top Performer Candidate Verification State
  const [examCode, setExamCode] = useState("");
  const [position, setPosition] = useState("Sira Asfetsami");
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [showRevisionForm, setShowRevisionForm] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, [user]);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const data = await apiService.getProposalStatus();
      setStatusData(data);
    } catch (err) {
      console.error("Error fetching proposal status:", err);
      toast.error("Failed to load proposal status.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (selectedFile) => {
    if (!selectedFile) return;

    if (!selectedFile.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Invalid file format. Please upload a PDF (.pdf) file.");
      return;
    }

    if (selectedFile.size > 15 * 1024 * 1024) {
      toast.error("File size exceeds 15 MB limit. Please compress your PDF.");
      return;
    }

    setFile(selectedFile);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      toast.error("Please choose a proposal PDF document to submit.");
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append("proposalFile", file);
      const activeCode = statusData?.candidate?.examCode || examCode;
      if (activeCode) {
        formData.append("examCode", activeCode.trim());
      }
      if (note.trim()) {
        formData.append("note", note.trim());
      }

      const res = await apiService.submitProposal(formData);
      toast.success(res.message || "Proposal submitted successfully!");
      setFile(null);
      setNote("");
      setShowRevisionForm(false);
      await fetchStatus();
    } catch (err) {
      console.error("Submission error:", err);
      toast.error(err.message || "Failed to submit proposal.");
      if (err.message && err.message.includes("already been submitted")) {
        await fetchStatus();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownload = async (proposalId, version, fileName) => {
    try {
      setDownloading(true);
      await apiService.downloadProposalFile(proposalId, version, fileName);
      toast.success("Proposal download started.");
    } catch (err) {
      console.error("Download error:", err);
      toast.error(err.message || "Failed to download proposal.");
    } finally {
      setDownloading(false);
    }
  };

  const handleVerifyExamCode = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!examCode.trim()) {
      toast.error("Please enter your candidate verification code from the official 16 exam codes.");
      return;
    }

    try {
      setVerifyingCode(true);
      const res = await apiService.verifyCandidateExamCode(examCode.trim(), "Sira Asfetsami");
      toast.success(res.message || "Candidate verified! Welcome to the proposal submission portal.");
      await fetchStatus();
    } catch (err) {
      console.error("Verification error:", err);
      toast.error(err.message || "Invalid candidate code. Only the 16 shortlisted Executive Committee candidates are authorized.");
    } finally {
      setVerifyingCode(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-20">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Verifying candidate eligibility and deadline...</p>
        </div>
      </div>
    );
  }

  // ── INELIGIBLE CANDIDATE VIEW ─────────────────────────────────────────────
  if (!statusData?.isEligible) {
    const isPresident = user && (user.role === 'president' || user.role === 'council_president');

    return (
      <div className="min-h-screen bg-gray-50 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* President Access Helper */}
          {isPresident && (
            <div className="bg-indigo-900 text-white rounded-2xl p-6 sm:p-8 shadow-lg border border-indigo-800">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0 text-2xl">
                  👑
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="bg-indigo-700 text-white text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      Presidential Privileges Active
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold leading-tight">
                    Welcome, {user?.name || "Student Union President"}
                  </h2>
                  <p className="text-indigo-200 text-sm sm:text-base leading-relaxed">
                    This page is the <strong>Candidate Portal</strong> where verified candidates upload proposal documents. As the <strong>Student Union President</strong>, you have exclusive access to the <strong>Proposal Management Dashboard</strong> to set submission deadlines, view the candidate submission statuses, and download proposals.
                  </p>
                  <div className="pt-2">
                    <a
                      href="/admin/proposals"
                      className="inline-flex items-center gap-2 px-5 py-3 bg-white text-indigo-900 rounded-xl font-bold text-sm hover:bg-indigo-50 shadow-md transition-all transform hover:-translate-y-0.5"
                    >
                      📜 Open Proposal Management Dashboard <ArrowRight className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Candidate Self-Verification Card for 2019 Top Performers */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden text-left">

            {/* Header banner */}
            <div className="bg-gradient-to-r from-sky-900 via-indigo-900 to-blue-900 text-white p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-2">
                <span className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-xl">
                  ⚙️
                </span>
                <span className="bg-sky-400/20 text-sky-200 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-sky-400/30">
                  Directive No. 003/2012 &bull; Executive Committee
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Executive Committee Candidate Verification
              </h1>
              <p className="text-sky-100 text-xs sm:text-sm mt-2 max-w-2xl leading-relaxed">
                If you were shortlisted among the top performers running for the <strong>Executive Committee (ዋና ሥራ አስፈጻሚ / Sira Asfetsami)</strong>, verify your credentials below using your official <strong>Student ID</strong> and <strong>Exam Verification Code</strong> to unlock your strategic proposal submission.
              </p>
            </div>

            {/* Form body */}
            <form onSubmit={handleVerifyExamCode} className="p-6 sm:p-8 space-y-6">
              {/* Verified Identity Readout */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" /> Verified Student Identity (Active Account)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs sm:text-sm">
                  <div>
                    <span className="text-gray-500 block text-xs">Student ID / Username:</span>
                    <span className="font-mono font-bold text-gray-900">{user?.username}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-xs">Full Name:</span>
                    <span className="font-bold text-gray-900">{user?.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-xs">Department &amp; Year:</span>
                    <span className="font-semibold text-gray-800">{user?.department || "General"} &bull; {user?.year || "4th Year"}</span>
                  </div>
                </div>
              </div>

              {/* Official 16 Authorized Candidate Codes from Electoral Board */}
              <div className="bg-gradient-to-r from-sky-50 via-indigo-50/60 to-blue-50 border border-sky-200/80 rounded-xl p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-2 text-sky-950 font-bold text-xs uppercase tracking-wider">
                  <Award className="w-4 h-4 text-sky-700" />
                  Official Authorized 16 Candidate Codes (from Stamped Notice):
                </div>
                <div className="flex flex-wrap gap-1.5 sm:gap-2 my-2">
                  {OFFICIAL_16_CODES.map((code) => (
                    <button
                      type="button"
                      key={code}
                      onClick={() => setExamCode(code)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all shadow-xs border ${
                        examCode.trim() === code || examCode.trim() === String(parseInt(code, 10))
                          ? "bg-indigo-700 text-white border-indigo-700 ring-2 ring-indigo-300"
                          : "bg-white text-indigo-900 border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50/50"
                      }`}
                    >
                      Code {code}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-sky-800 leading-relaxed mt-2">
                  📌 <strong>Whitelist Notice:</strong> Only the 16 shortlisted candidates holding these official exam codes are authorized to submit proposals. Leading zeros (e.g. <code className="font-bold">2</code> or <code className="font-bold">02</code>) and prefixes (e.g. <code className="font-bold">DBU-</code>, <code className="font-bold">016R</code>) are normalized automatically.
                </p>
              </div>

              {/* Input: Final Exam Verification Code */}
              <div>
                <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">
                  Candidate Verification Code (from the 16 Official Codes) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Key className="w-5 h-5 text-indigo-500" />
                  </div>
                  <input
                    type="text"
                    required
                    value={examCode}
                    onChange={(e) => setExamCode(e.target.value)}
                    placeholder="Enter one of the 16 codes (e.g. 16, 02, 23, 37, 04)"
                    className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl text-sm font-mono tracking-wide focus:ring-2 focus:ring-indigo-500 uppercase font-semibold"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  💡 Type your exam code (e.g. <code className="bg-gray-100 px-1 py-0.5 rounded font-bold">16</code>, <code className="bg-gray-100 px-1 py-0.5 rounded font-bold">02</code>, or <code className="bg-gray-100 px-1 py-0.5 rounded font-bold">2</code>). Anti-hijacking binds this code directly to your student ID upon first claim.
                </p>
              </div>

              {/* Dedicated Executive Committee Position Display (Directive No. 003/2012) */}
              <div>
                <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-2.5">
                  Nominated Candidate Position / Category
                </label>
                <div className="p-4 rounded-xl border-2 border-indigo-600 bg-indigo-50/70 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-indigo-700 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                      ⚙️
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-gray-900 text-sm sm:text-base">
                          Sira Asfetsami (ሥራ አስፈፃሚ)
                        </span>
                        <span className="bg-indigo-200/80 text-indigo-900 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                          Executive Committee
                        </span>
                      </div>
                      <p className="text-xs text-indigo-900 font-medium mt-0.5">
                        Strategic Proposal Submission (Evaluated for 15% pre-council score)
                      </p>
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-white rounded-lg border border-indigo-200 text-xs font-bold text-indigo-800 shadow-sm">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Authorized Role
                  </div>
                </div>

                <div className="mt-2.5 bg-blue-50 border border-blue-200/80 rounded-xl p-3 text-xs text-blue-900 flex items-start gap-2.5">
                  <span className="text-base leading-none">⚖️</span>
                  <p className="leading-relaxed">
                    <strong>Directive No. 003/2012 Articles 22 &amp; 28 Notice:</strong> Proposal submissions are exclusively designated for Executive Committee (ዋና ሥራ አስፈጻሚ) contestants. Afegubaye candidates are evaluated solely through the written exam (20%), interview (20%), and council speech (60%) without submitting a strategic proposal.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                <button
                  type="submit"
                  disabled={verifyingCode}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-sm font-bold shadow-md transition-all disabled:opacity-50"
                >
                  {verifyingCode ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Verifying Exam Credentials...
                    </>
                  ) : (
                    <>
                      <Unlock className="w-4 h-4" /> Verify &amp; Directly Proceed to Upload Proposal &rarr;
                    </>
                  )}
                </button>

                <a
                  href="/dashboard"
                  className="text-xs text-gray-500 hover:text-gray-800 font-semibold transition-colors"
                >
                  Return to Student Dashboard &rarr;
                </a>
              </div>
            </form>

            {/* Assistance Footer */}
            <div className="bg-amber-50/70 border-t border-amber-100 p-5 text-xs text-amber-900 leading-relaxed">
              <p>
                <strong>Need Help with your Candidate Exam Code?</strong> Candidate verification codes were issued to the 16 top performers of the 2019 batch during the university final exam. If you were shortlisted but have not received your code, please visit the <strong>Student Union President Office</strong> or the <strong>Campus Electoral Board</strong> to verify your record.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { candidate, proposal, settings } = statusData;
  const isDeadlineSet = Boolean(settings?.deadline);
  const isOpen = Boolean(settings?.isOpen);

  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800 mb-2">
                🏛️ DBU Student Union Election 2026
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                Executive Committee Proposal Submission (ሥራ አስፈፃሚ)
              </h1>
              <p className="text-gray-600 text-sm mt-1">
                Strategic proposal repository for Executive Committee candidates under Directive No. 003/2012 (Articles 22 &amp; 28).
              </p>
            </div>
            <button
              onClick={fetchStatus}
              className="inline-flex items-center gap-1.5 self-start sm:self-center px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh Status
            </button>
          </div>
        </div>

        {/* Candidate Profile Verification Card */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-sky-700 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              <User className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-gray-900">{candidate?.name}</h3>
                <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
                  Verified Candidate
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {candidate?.position} &bull; {candidate?.department} &bull; ID: {candidate?.username}
              </p>
            </div>
          </div>
          <div className="text-right text-xs text-gray-500 border-t sm:border-t-0 pt-2 sm:pt-0">
            <p className="font-semibold text-gray-700">Official Position</p>
            <p className="text-sky-700 font-bold">{candidate?.position || "Student Union Candidate"}</p>
          </div>
        </div>

        {/* Deadline Status & Countdown */}
        {isDeadlineSet ? (
          <ProposalCountdown deadline={settings.deadline} onDeadlineReached={fetchStatus} />
        ) : (
          <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5 mb-8 text-center shadow-sm">
            <div className="flex items-center justify-center gap-2 text-amber-800 font-bold text-lg">
              <Clock className="w-5 h-5 text-amber-600" />
              Deadline Not Set
            </div>
            <p className="text-amber-700 text-sm mt-1">
              Submissions are currently disabled until the Student Union President configures the official closing deadline.
            </p>
          </div>
        )}

        {/* Existing Submission Receipt / Locked Screen */}
        {proposal && (
          <div className="bg-white rounded-2xl border-2 border-emerald-500 shadow-md p-6 sm:p-8 mb-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600"></div>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
              <div className="flex items-start gap-3.5">
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 shadow-inner">
                  <CheckCircle className="w-8 h-8 text-emerald-600" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl sm:text-2xl font-black text-gray-900">Official Proposal Confirmed</h3>
                    <span className="bg-emerald-100 text-emerald-800 text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 border border-emerald-300">
                      <Lock className="w-3.5 h-3.5" /> Locked &bull; Sealed
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1 max-w-xl leading-relaxed">
                    Your strategic proposal document has been officially recorded and locked in the Electoral Board registry.
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleDownload(proposal.id, proposal.currentVersion, proposal.currentFile?.fileName)}
                disabled={downloading}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 text-white rounded-xl text-xs sm:text-sm font-bold hover:bg-emerald-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
              >
                <Download className="w-4 h-4" /> Download Submitted PDF
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-emerald-50/80 border border-emerald-200 rounded-xl p-5 text-xs mb-5">
              <div>
                <span className="text-gray-500 block uppercase text-[10px] font-bold tracking-wider">Official Reference Code:</span>
                <span className="font-mono font-black text-emerald-900 text-base">{proposal.latestReferenceNumber}</span>
              </div>
              <div>
                <span className="text-gray-500 block uppercase text-[10px] font-bold tracking-wider">Candidate Exam Code:</span>
                <span className="font-mono font-black text-indigo-900 text-base">
                  Code {proposal.candidateExamCode || candidate?.examCode || "VERIFIED"}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block uppercase text-[10px] font-bold tracking-wider">Registration Timestamp:</span>
                <span className="font-bold text-gray-800 text-xs">
                  {new Date(proposal.latestSubmittedAt).toLocaleString("en-US", {
                    timeZone: "Africa/Addis_Ababa",
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}{" "}
                  (EAT)
                </span>
              </div>
              <div className="sm:col-span-3 pt-2 border-t border-emerald-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-gray-600 block text-xs">
                  <strong>Archived Document:</strong> {proposal.currentFile?.fileName} ({(proposal.currentFile?.fileSize / 1024 / 1024).toFixed(2)} MB)
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                  <Shield className="w-3.5 h-3.5" /> PDF Magic Bytes Verified (%PDF-)
                </span>
              </div>
            </div>

            {/* Strict Duplicate Prevention & One-Time Submission Enforcement Banner */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-700 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center flex-shrink-0 font-bold">
                <Lock className="w-4 h-4 text-slate-700" />
              </div>
              <div className="leading-relaxed">
                <p className="font-bold text-slate-900">Submission Completed &amp; Permanently Locked:</p>
                <p className="mt-0.5 text-slate-600">
                  Under the Ethiopian Higher Education Student Union Election Directive (Directive No. 003/2012) and Electoral Board regulations, proposal submissions are strictly limited to a single final document. Duplicate submissions or replacement uploads for this candidate code are strictly prohibited.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Upload Form (Active ONLY when no proposal has been submitted yet) */}
        {!proposal && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
            <div className="mb-5 border-b border-gray-100 pb-4">
              <h2 className="text-lg font-bold text-gray-900">
                Submit Official PDF Proposal
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Attach your completed executive manifesto or strategic proposal. Only valid PDF files up to 15 MB are accepted. Submissions are strictly one-time.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Drag & Drop Upload Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  if (e.dataTransfer.files?.[0]) {
                    handleFileChange(e.dataTransfer.files[0]);
                  }
                }}
                className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
                  dragOver
                    ? "border-sky-500 bg-sky-50/50"
                    : file
                    ? "border-emerald-400 bg-emerald-50/30"
                    : "border-gray-300 hover:border-gray-400 bg-gray-50/50"
                }`}
              >
                <input
                  id="proposal-pdf-input"
                  type="file"
                  accept=".pdf,application/pdf"
                  disabled={!isOpen || submitting}
                  onChange={(e) => handleFileChange(e.target.files?.[0])}
                  className="hidden"
                />

                {file ? (
                  <div className="flex flex-col items-center">
                    <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mb-3 shadow-inner">
                      <FileCheck className="w-8 h-8" />
                    </div>
                    <p className="font-bold text-gray-900 text-sm">{file.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{(file.size / 1024 / 1024).toFixed(2)} MB &bull; Ready to submit</p>
                    <label
                      htmlFor="proposal-pdf-input"
                      className="mt-3 text-xs font-semibold text-sky-700 hover:text-sky-900 cursor-pointer underline"
                    >
                      Choose a different PDF
                    </label>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="w-14 h-14 bg-sky-100 text-sky-700 rounded-2xl flex items-center justify-center mb-3">
                      <Upload className="w-7 h-7" />
                    </div>
                    <label
                      htmlFor="proposal-pdf-input"
                      className={`font-bold text-sm text-sky-700 hover:text-sky-800 cursor-pointer underline ${
                        !isOpen ? "pointer-events-none opacity-50" : ""
                      }`}
                    >
                      Click to browse PDF file
                    </label>
                    <p className="text-xs text-gray-500 mt-1">or drag and drop your proposal document here</p>
                    <div className="flex items-center gap-3 mt-4 text-[11px] text-gray-400 uppercase font-semibold tracking-wider">
                      <span>PDF Only</span>
                      <span>&bull;</span>
                      <span>Max 15 MB</span>
                      <span>&bull;</span>
                      <span>One-Time Submission</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Optional Note / Version description */}
              <div>
                <label htmlFor="proposal-note" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Proposal Document Title or Note (Optional)
                </label>
                <input
                  id="proposal-note"
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  disabled={!isOpen || submitting}
                  placeholder="e.g., Executive Proposal for Student Welfare & Academic Reform"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 disabled:bg-gray-100"
                />
              </div>

              {/* Submit Action */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                <div className="text-xs text-gray-500">
                  {isOpen ? (
                    <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      Submissions close at: {settings.deadlineEthiopia}
                    </span>
                  ) : (
                    <span className="text-red-600 font-semibold flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4" />
                      Submissions are currently locked.
                    </span>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!isOpen || submitting || !file}
                  className="w-full sm:w-auto px-6 py-3 bg-sky-700 hover:bg-sky-800 text-white rounded-xl font-bold text-sm shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Submitting Final Proposal...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Submit Final Proposal
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
