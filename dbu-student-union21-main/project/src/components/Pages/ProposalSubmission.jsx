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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../contexts/AuthContext";
import { apiService } from "../../services/api";
import toast from "react-hot-toast";

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
  const [position, setPosition] = useState("Student Union President");
  const [verifyingCode, setVerifyingCode] = useState(false);

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
      if (note.trim()) {
        formData.append("note", note.trim());
      }

      const res = await apiService.submitProposal(formData);
      toast.success(res.message || "Proposal submitted successfully!");
      setFile(null);
      setNote("");
      await fetchStatus();
    } catch (err) {
      console.error("Submission error:", err);
      toast.error(err.message || "Failed to submit proposal.");
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
    e.preventDefault();
    if (!examCode.trim()) {
      toast.error("Please enter the candidate verification code given during your final exam evaluation.");
      return;
    }

    try {
      setVerifyingCode(true);
      const res = await apiService.verifyCandidateExamCode(examCode.trim(), position);
      toast.success(res.message || "Candidate verified! Welcome to the proposal submission portal.");
      await fetchStatus();
    } catch (err) {
      console.error("Verification error:", err);
      toast.error(err.message || "Invalid exam verification code. Please check and try again.");
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
                  🎓
                </span>
                <span className="bg-sky-400/20 text-sky-200 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-sky-400/30">
                  Candidate Verification &bull; 2019 Batch
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Are you under the 2019 Batch 16 Top Performers?
              </h1>
              <p className="text-sky-100 text-xs sm:text-sm mt-2 max-w-2xl leading-relaxed">
                If you were shortlisted among the top performers selected during the final exam evaluation, verify your credentials below using your official <strong>Student ID</strong> and <strong>Exam Verification Code</strong> to unlock your proposal submission.
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

              {/* Input: Final Exam Verification Code */}
              <div>
                <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">
                  Candidate Verification Code (Given During Final Exam) <span className="text-red-500">*</span>
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
                    placeholder="Enter exam code (e.g. DBU-2019-01, DBU-2019-EXAM)"
                    className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl text-sm font-mono tracking-wide focus:ring-2 focus:ring-indigo-500 uppercase font-semibold"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  💡 Enter the code given to you by the University / Electoral Board during final exam evaluation (e.g. <code className="bg-gray-100 px-1 py-0.5 rounded font-bold">DBU-2019-01</code> to <code className="bg-gray-100 px-1 py-0.5 rounded font-bold">DBU-2019-16</code>, or <code className="bg-gray-100 px-1 py-0.5 rounded font-bold">DBU-2019-EXAM</code>).
                </p>
              </div>

              {/* Input: Running Portfolio / Position */}
              <div>
                <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">
                  Candidate Running Position / Portfolio <span className="text-red-500">*</span>
                </label>
                <select
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="Student Union President">Student Union President</option>
                  <option value="Council President">Council President</option>
                  <option value="Vice President">Vice President</option>
                  <option value="General Secretary">General Secretary</option>
                  <option value="Academic Affairs Executive">Academic Affairs Executive</option>
                  <option value="Student Welfare & Services Executive">Student Welfare & Services Executive</option>
                  <option value="Clubs & Extracurricular Coordinator">Clubs & Extracurricular Coordinator</option>
                  <option value="Finance & Budget Officer">Finance & Budget Officer</option>
                  <option value="Discipline & Ethics Committee">Discipline & Ethics Committee</option>
                  <option value="Campus Representative Executive">Campus Representative Executive</option>
                </select>
                <p className="text-xs text-gray-500 mt-1.5">
                  Select the executive portfolio corresponding to your candidate nomination.
                </p>
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
                      <Unlock className="w-4 h-4" /> Verify Exam Code &amp; Unlock Proposal Form
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
                Candidate Proposal Submission
              </h1>
              <p className="text-gray-600 text-sm mt-1">
                Official digital repository for shortlisted Student Union candidate manifestos and executive proposals.
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

        {/* Existing Submission Receipt / Status */}
        {proposal && (
          <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-6 mb-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-emerald-500"></div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-lg font-bold text-gray-900">Proposal on File (Version {proposal.currentVersion})</h3>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Your proposal is securely stored and pending presidential committee review.
                </p>
              </div>
              <button
                onClick={() => handleDownload(proposal.id, proposal.currentVersion, proposal.currentFile?.fileName)}
                disabled={downloading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
              >
                <Download className="w-4 h-4" /> Download Submitted PDF
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-emerald-50/60 rounded-xl p-4 text-xs">
              <div>
                <span className="text-gray-500 block">Reference Number:</span>
                <span className="font-mono font-bold text-emerald-900 text-sm">{proposal.latestReferenceNumber}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Submitted At:</span>
                <span className="font-bold text-gray-800">
                  {new Date(proposal.latestSubmittedAt).toLocaleString("en-US", {
                    timeZone: "Africa/Addis_Ababa",
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}{" "}
                  (EAT)
                </span>
              </div>
              <div>
                <span className="text-gray-500 block">Attached Document:</span>
                <span className="font-semibold text-gray-800 truncate block">
                  {proposal.currentFile?.fileName} ({(proposal.currentFile?.fileSize / 1024 / 1024).toFixed(2)} MB)
                </span>
              </div>
            </div>

            {/* Version History Table */}
            {proposal.versions && proposal.versions.length > 1 && (
              <div className="mt-5 border-t border-gray-100 pt-4">
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-gray-500" /> Submission Revision History:
                </h4>
                <div className="space-y-2">
                  {proposal.versions.map((ver) => (
                    <div
                      key={ver.version}
                      className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-sky-800 bg-sky-100 px-2 py-0.5 rounded">V{ver.version}</span>
                        <span className="text-gray-600">{ver.fileName}</span>
                        <span className="font-mono text-[11px] text-gray-400">({ver.referenceNumber})</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-gray-400 text-[11px]">
                          {new Date(ver.submittedAt).toLocaleDateString()}
                        </span>
                        <button
                          onClick={() => handleDownload(proposal.id, ver.version, ver.fileName)}
                          className="text-sky-700 hover:text-sky-900 font-bold underline"
                        >
                          Download
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Upload Form (Active only if Open) */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
          <div className="mb-5 border-b border-gray-100 pb-4">
            <h2 className="text-lg font-bold text-gray-900">
              {proposal ? "Replace Proposal Document (Revision)" : "Submit Official PDF Proposal"}
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              {proposal
                ? "You may replace your submitted PDF anytime before the deadline. Earlier versions will remain recorded in your history."
                : "Attach your completed executive manifesto or policy proposal. Only valid PDF files up to 15 MB are accepted."}
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
                    <span>Verified Magic Bytes Check</span>
                  </div>
                </div>
              )}
            </div>

            {/* Optional Note / Version description */}
            <div>
              <label htmlFor="proposal-note" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Revision Notes or Title (Optional)
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
                    Uploading &amp; Verifying...
                  </>
                ) : proposal ? (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload Replacement Proposal
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
      </div>
    </div>
  );
}
