/** @format */
import React, { useState, useEffect, useRef } from "react";
import {
  FileText,
  Upload,
  CheckCircle,
  AlertCircle,
  Download,
  Copy,
  Check,
  ShieldCheck,
  User,
  Key,
  ArrowRight,
  FileCheck,
  RotateCcw,
  Lock,
  Clock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { apiService } from "../../services/api";
import toast from "react-hot-toast";

export function ProposalSubmission() {
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  // Proposal submission is strictly restricted to Union President (dbu10101020) and System Admin (dbu10101030)
  const allowedUsernames = ["dbu10101020", "dbu10101030"];
  const userIdentifier = (user ? user.studentId || user.username || "" : "").toLowerCase().trim();
  const isAuthorized = user && allowedUsernames.includes(userIdentifier);

  if (!isAuthorized) {
    return <Navigate to="/dashboard" replace />;
  }

  // Core Flow Step: 'loading' | 'verify' | 'upload' | 'receipt'
  const [step, setStep] = useState("loading");

  // Verification Inputs
  const [studentIdInput, setStudentIdInput] = useState("");
  const [examCode, setExamCode] = useState("");
  const [verifying, setVerifying] = useState(false);

  // Verified Candidate Details
  const [candidate, setCandidate] = useState(null);

  // Upload Step State
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Receipt / Confirmation State
  const [receipt, setReceipt] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Deadline Settings
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    checkInitialStatus();
  }, []);

  const checkInitialStatus = async () => {
    try {
      const data = await apiService.getProposalStatus().catch(() => null);

      if (data?.settings) {
        setSettings(data.settings);
      }

      // Pre-fill student ID if logged in user has one
      if (user?.username) {
        const clean = user.username.replace(/^(?:dbu[-_/\s]*)?/i, "").trim();
        setStudentIdInput((prev) => prev || clean || user.username);
      }

      const isPortalOpen = data?.settings?.isOpen !== false;

      // If already verified and has submission receipt
      if (data?.isEligible && data?.proposal) {
        setCandidate(data.candidate);
        setReceipt({
          referenceNumber: data.proposal.latestReferenceNumber,
          submittedAt: data.proposal.latestSubmittedAt,
          fileName: data.proposal.currentFile?.fileName || "proposal.pdf",
          candidateExamCode: data.proposal.candidateExamCode || data.candidate?.examCode,
          studentId: data.candidate?.studentId || user?.username,
          proposalId: data.proposal.id || data.proposal._id,
          currentVersion: data.proposal.currentVersion || 1,
          canResubmit: isPortalOpen && data.proposal.canResubmit !== false && data.canResubmit !== false,
          resubmissionAllowed: data.proposal.resubmissionAllowed !== false,
        });
        setStep("receipt");
        return;
      }

      // If already verified as eligible candidate but hasn't submitted yet
      if (data?.isEligible && data?.candidate) {
        setCandidate(data.candidate);
        setStep("upload");
        return;
      }

      // Otherwise, present the simplified verification form
      setStep("verify");
    } catch (err) {
      console.warn("Status check note:", err.message);
      setStep("verify");
    }
  };

  // ── Step 1: Verification ──────────────────────────────────────────────────
  const handleVerify = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    // 1. Normalize user inputs: trim whitespace and handle both 'DBU...' and raw numbers
    const rawExamCode = String(examCode || "").trim();
    const rawStudentId = String(studentIdInput || "").trim();

    const cleanExamCode = rawExamCode.replace(/^0+/, "") || rawExamCode; // '02' -> '2'
    const cleanStudentId = rawStudentId.toUpperCase().replace(/^(?:DBU[-_/\s]*)?/i, "").trim(); // 'dbu1801228' -> '1801228'

    if (!cleanStudentId) {
      toast.error("እባክዎ የተማሪ መታወቂያ ቁጥርዎን ያስገቡ (Please enter University Student ID)");
      return;
    }
    if (!cleanExamCode) {
      toast.error("እባክዎ የፈተና መለያ ኮድዎን ያስገቡ (Please enter Candidate Exam Code)");
      return;
    }

    // 2. Clear any stale local state before new verification
    setCandidate(null);
    setReceipt(null);
    setFile(null);

    try {
      setVerifying(true);
      const res = await apiService.verifyCandidateExamCode(
        cleanExamCode,
        "Sira Asfetsami",
        cleanStudentId
      );

      // Save token if returned for seamless unauthenticated session
      if (res.token) {
        localStorage.setItem("token", res.token);
      }
      if (res.user) {
        const userObj = { ...res.user, token: res.token };
        localStorage.setItem("user", JSON.stringify(userObj));
      }

      setCandidate(res.candidate);

      // If candidate has already submitted previously, reveal receipt directly
      if (res.proposal) {
        setReceipt({
          referenceNumber: res.proposal.latestReferenceNumber,
          submittedAt: res.proposal.latestSubmittedAt,
          fileName: res.proposal.currentFile?.fileName || "proposal.pdf",
          candidateExamCode: res.proposal.candidateExamCode || res.candidate?.examCode,
          studentId: res.candidate?.studentId || cleanStudentId,
          proposalId: res.proposal.id || res.proposal._id,
          currentVersion: res.proposal.currentVersion || 1,
          canResubmit: res.proposal.canResubmit !== false && res.canResubmit !== false,
          resubmissionAllowed: res.proposal.resubmissionAllowed !== false,
        });
        setStep("receipt");
        toast.success("ሰነድዎ ቀደም ሲል ገቢ ተደርጓል! (Found existing confirmed proposal)");
        return;
      }

      // Reveal Upload Step
      setStep("upload");
      toast.success(res.message || "ማረጋገጫው ተሳክቷል! (Candidate verified successfully)");
    } catch (err) {
      console.error("Verification error:", err);
      toast.error(
        err.message ||
          "ማረጋገጥ አልተቻለም፡ ያስገቡት የፈተና ኮድ ከተማሪ መታወቂያው ጋር አይዛመድም። (Verification failed. Exam code does not match this Student ID)"
      );
    } finally {
      setVerifying(false);
    }
  };

  // ── Step 2: File Handling & Submission ────────────────────────────────────
  const handleFileSelected = (selected) => {
    if (!selected) return;

    if (!selected.name.toLowerCase().endsWith(".pdf")) {
      toast.error("እባክዎ የ PDF ሰነድ ብቻ ይጫኑ (.pdf files only)");
      return;
    }

    if (selected.size > 15 * 1024 * 1024) {
      toast.error("የሰነዱ መጠን ከ 15 MB መብለጥ የለበትም (Maximum file size is 15 MB)");
      return;
    }

    setFile(selected);
  };

  const handleSubmitProposal = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (settings && settings.isOpen === false) {
      toast.error(
        `የማስረከቢያው ጊዜ አልቋል! Submissions closed. Deadline passed on ${settings.deadlineEthiopia || "scheduled time"}.`
      );
      return;
    }

    if (!file) {
      toast.error("እባክዎ ያዘጋጁትን የፕሮፖዛል PDF ሰነድ ይምረጡ (Please choose a proposal PDF)");
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append("proposalFile", file);

      const activeCode = candidate?.examCode || examCode;
      if (activeCode) formData.append("examCode", activeCode.trim());

      const activeStudentId = candidate?.studentId || studentIdInput;
      if (activeStudentId) formData.append("studentId", activeStudentId.trim());

      const res = await apiService.submitProposal(formData);

      setReceipt({
        referenceNumber: res.referenceNumber,
        submittedAt: res.submittedAt || new Date().toISOString(),
        fileName: res.fileName || file.name,
        candidateExamCode: res.candidateExamCode || activeCode,
        studentId: res.studentId || activeStudentId,
        proposalId: res.proposal?.id || res.proposal?._id,
        currentVersion: res.version || res.proposal?.currentVersion || ((receipt?.currentVersion || 1) + (receipt ? 1 : 0)),
        canResubmit: res.canResubmit !== false,
        resubmissionAllowed: res.resubmissionAllowed !== false,
      });

      setFile(null);
      setStep("receipt");
      toast.success(res.message || "ሰነድዎ በተሳካ ሁኔታ ገቢ ተደርጓል!");
    } catch (err) {
      console.error("Submission error:", err);
      toast.error(err.message || "ሰነዱን ማስገባት አልተቻለም። እባክዎ እንደገና ይሞክሩ።");
      // If already submitted, refresh status to show receipt
      if (err.message && err.message.toLowerCase().includes("already")) {
        checkInitialStatus();
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ── Step 3: Receipt Download & Copy ───────────────────────────────────────
  const handleDownloadPdf = async () => {
    if (!receipt?.proposalId) {
      toast.error("የሰነድ መለያ ቁጥር አልተገኘም (Missing proposal ID)");
      return;
    }

    try {
      setDownloading(true);
      await apiService.downloadProposalFile(
        receipt.proposalId,
        1,
        receipt.fileName || `proposal_code_${receipt.candidateExamCode}.pdf`
      );
      toast.success("ሰነዱ እየወረደ ነው... (Download started)");
    } catch (err) {
      console.error("Download error:", err);
      toast.error(err.message || "ሰነዱን ማውረድ አልተቻለም (Failed to download proposal)");
    } finally {
      setDownloading(false);
    }
  };

  const copyRefNumber = () => {
    if (!receipt?.referenceNumber) return;
    navigator.clipboard.writeText(receipt.referenceNumber);
    setCopied(true);
    toast.success("የማመሳከሪያ ቁጥሩ ተቀድቷል (Reference number copied)");
    setTimeout(() => setCopied(false), 2000);
  };

  // Format Ethiopian EAT Date & Time
  const formatReceiptDate = (isoString) => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      return (
        d.toLocaleString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
          timeZone: "Africa/Addis_Ababa",
        }) + " (EAT)"
      );
    } catch {
      return isoString;
    }
  };

  // ── Initial Loading Spinner ───────────────────────────────────────────────
  if (step === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-600 text-sm font-medium">
            የማስረከቢያ ገጹ በመጫን ላይ ነው...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen flex items-center justify-center p-3 sm:p-6 my-auto">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden relative transition-all">
        {/* Top Accent Gradient Bar */}
        <div className="h-2 bg-gradient-to-r from-sky-600 via-indigo-600 to-emerald-500 w-full" />

        <div className="p-6 sm:p-8">
          {/* DBU Student Union Logo & Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white border border-slate-100 shadow-md p-2 mb-3">
              <img
                src="/images/dblogo.png"
                alt="DBU Student Union Logo"
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.currentTarget.src = "/image.png/dbu-logo.png";
                }}
              />
            </div>

            <h1 className="text-lg sm:text-xl font-black text-gray-900 leading-snug tracking-tight">
              የሥራ አስፈጻሚ ስትራቴጂክ ዕቅድ ማስረከቢያ
            </h1>
            <p className="text-xs sm:text-sm font-bold text-sky-800 mt-1 uppercase tracking-wide">
              Executive Committee Proposal Submission
            </p>
            <div className="flex items-center justify-center gap-1.5 mt-1.5 text-[11px] text-gray-500 font-medium">
              <span>መመሪያ ቁጥር 003/2012 አንቀጽ 22</span>
              <span>&bull;</span>
              <span>Debre Berhan University</span>
            </div>
          </div>

          {/* Prominent Deadline Status Banner */}
          {settings && settings.isOpen === false && (
            <div className="mb-6 p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl flex items-start gap-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-black text-rose-950 uppercase tracking-wider block">
                  የማስረከቢያ ጊዜ ተጠናቋል (Submissions Closed)
                </span>
                <p className="text-xs text-rose-800 font-medium mt-1 leading-relaxed">
                  የሥራ አስፈጻሚ ስትራቴጂክ ዕቅድ ማስረከቢያ ጊዜ {settings.deadlineEthiopia ? `በ ${settings.deadlineEthiopia}` : "በፕሬዝዳንቱ"} ተዘግቷል። አዳዲስ ሰነዶችን መቀበል ወይም ማሻሻል አይቻልም።
                </p>
              </div>
            </div>
          )}

          <AnimatePresence mode="wait">
            {/* ────────────────────────────────────────────────────────────── */}
            {/* 1. VERIFICATION STEP                                           */}
            {/* ────────────────────────────────────────────────────────────── */}
            {step === "verify" && (
              <motion.div
                key="step-verify"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <form onSubmit={handleVerify} className="space-y-4">
                  {/* Input 1: University Student ID */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      1. የተማሪ መታወቂያ ቁጥር / University Student ID <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                        <User className="w-5 h-5 text-sky-600" />
                      </div>
                      <input
                        type="text"
                        required
                        value={studentIdInput}
                        onChange={(e) => setStudentIdInput(e.target.value)}
                        placeholder="e.g. 1801228"
                        className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-base font-mono font-bold text-gray-900 placeholder:text-gray-400 placeholder:font-normal focus:bg-white focus:border-sky-600 focus:ring-4 focus:ring-sky-100 focus:outline-none transition-all"
                      />
                    </div>
                    <p className="text-[11px] text-gray-500 mt-1">
                      በዩኒቨርሲቲው የተመዘገቡበት የመታወቂያ ቁጥር (e.g. 1801228)
                    </p>
                  </div>

                  {/* Input 2: Exam Code */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      2. የፈተና መለያ ኮድ / Candidate Exam Code <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                        <Key className="w-5 h-5 text-sky-600" />
                      </div>
                      <input
                        type="text"
                        required
                        value={examCode}
                        onChange={(e) => setExamCode(e.target.value)}
                        placeholder="e.g. 16, 23, 02, 32"
                        className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-base font-mono font-black text-gray-900 uppercase placeholder:text-gray-400 placeholder:font-normal focus:bg-white focus:border-sky-600 focus:ring-4 focus:ring-sky-100 focus:outline-none transition-all"
                      />
                    </div>
                    <p className="text-[11px] text-gray-500 mt-1">
                      በደብረ ብርሃን ዩኒቨርሲቲ ምርጫ ቦርድ የተሰጠዎት ይፋዊ የፈተና ኮድ
                    </p>
                  </div>

                  {/* Verification Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={verifying}
                      className="w-full py-4 px-6 bg-sky-700 hover:bg-sky-800 active:scale-[0.99] text-white rounded-2xl font-black text-base shadow-lg shadow-sky-700/25 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                    >
                      {verifying ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>በማረጋገጥ ላይ... / Verifying...</span>
                        </>
                      ) : (
                        <>
                          <span>አረጋግጥ / Verify Identity</span>
                          <ArrowRight className="w-5 h-5" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* ────────────────────────────────────────────────────────────── */}
            {/* 2. SEAMLESS SUBMISSION STEP                                    */}
            {/* ────────────────────────────────────────────────────────────── */}
            {step === "upload" && (
              <motion.div
                key="step-upload"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                {/* Candidate Verified Badge */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-gray-900 text-sm">
                          {candidate?.name || "እጩ ተወዳዳሪ"}
                        </span>
                        <span className="bg-emerald-200/80 text-emerald-900 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                          Code {candidate?.examCode || examCode}
                        </span>
                      </div>
                      <p className="text-xs text-emerald-800 font-semibold mt-0.5">
                        የተረጋገጠ እጩ (Verified) &bull; ሥራ አስፈፃሚ (Executive)
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCandidate(null);
                      setFile(null);
                      setStep("verify");
                    }}
                    className="text-xs text-emerald-700 hover:text-emerald-900 font-bold underline p-1"
                  >
                    ቀይር
                  </button>
                </div>

                {/* Resubmission Context Banner if updating existing proposal */}
                {receipt && (
                  <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                        <RotateCcw className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sky-950 text-sm">
                            የተሻሻለ ፕሮፖዛል ማስረከቢያ (Version {(receipt.currentVersion || 1) + 1})
                          </span>
                        </div>
                        <p className="text-xs text-sky-800 mt-0.5 font-medium">
                          የቀድሞ ማመሳከሪያ፡ <span className="font-mono font-bold">{receipt.referenceNumber}</span>
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStep("receipt")}
                      className="text-xs font-bold text-sky-700 hover:text-sky-900 bg-white border border-sky-200 px-2.5 py-1.5 rounded-lg shadow-sm cursor-pointer"
                    >
                      ተመለስ / Back
                    </button>
                  </div>
                )}

                {settings && settings.isOpen === false ? (
                  <div className="p-8 bg-slate-50 border-2 border-slate-200 rounded-3xl text-center space-y-3">
                    <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                      <Lock className="w-7 h-7" />
                    </div>
                    <h3 className="text-base font-extrabold text-gray-900">
                      የማስረከቢያ ጊዜው ስላለፈ ሰነድ ማስገባት አይቻልም
                    </h3>
                    <p className="text-xs text-gray-600 max-w-sm mx-auto leading-relaxed">
                      የሥራ አስፈጻሚ ስትራቴጂክ ዕቅድ ማስረከቢያ ጊዜ {settings.deadlineEthiopia ? `በ ${settings.deadlineEthiopia}` : "በፕሬዝዳንቱ"} ተዘግቷል። አዳዲስ ሰነዶችን መጫን አይቻልም።
                    </p>
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setCandidate(null);
                          setStep("verify");
                        }}
                        className="px-5 py-2.5 text-xs font-bold text-gray-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 shadow-sm cursor-pointer"
                      >
                        ወደ ማረጋገጫ ተመለስ / Back
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitProposal} className="space-y-5">
                    {/* Single File Dropzone */}
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragActive(true);
                      }}
                      onDragLeave={() => setDragActive(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragActive(false);
                        if (e.dataTransfer.files?.[0]) {
                          handleFileSelected(e.dataTransfer.files[0]);
                        }
                      }}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-3xl p-6 sm:p-8 text-center transition-all cursor-pointer select-none ${
                        dragActive
                          ? "border-emerald-500 bg-emerald-50/60 scale-[1.01]"
                          : file
                          ? "border-emerald-500 bg-emerald-50/40"
                          : "border-slate-300 hover:border-emerald-400 bg-slate-50/70"
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,application/pdf"
                        disabled={submitting}
                        onChange={(e) => handleFileSelected(e.target.files?.[0])}
                        className="hidden"
                      />

                      {file ? (
                        <div className="flex flex-col items-center">
                          <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mb-2 shadow-inner">
                            <FileCheck className="w-8 h-8" />
                          </div>
                          <p className="font-extrabold text-gray-900 text-sm truncate max-w-xs">
                            {file.name}
                          </p>
                          <p className="text-xs text-emerald-700 font-semibold mt-1">
                            {(file.size / 1024 / 1024).toFixed(2)} MB &bull; ሰነዱ ለመላክ ዝግጁ ነው
                          </p>
                          <span className="mt-3 inline-block text-xs font-bold text-sky-700 underline">
                            ሌላ ሰነድ ለመምረጥ እዚህ ይጫኑ
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <div className="w-14 h-14 bg-sky-100 text-sky-700 rounded-2xl flex items-center justify-center mb-3">
                            <Upload className="w-7 h-7" />
                          </div>
                          <p className="font-black text-gray-900 text-sm sm:text-base leading-snug">
                            {receipt
                              ? `የተሻሻለውን የፕሮፖዛል PDF ሰነድ እዚህ ይጫኑ (Version ${(receipt.currentVersion || 1) + 1})`
                              : "ያዘጋጁትን የፕሮፖዛል PDF ሰነድ እዚህ ይጫኑ"}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            ሰነድዎን ለመምረጥ እዚህ ጠቅ ያድርጉ ወይም ጎትተው ያስቀምጡ
                          </p>
                          <div className="inline-flex items-center gap-2 mt-3 px-3 py-1 bg-white rounded-full border border-slate-200 text-[11px] font-bold text-slate-600">
                            <span>PDF ብቻ</span>
                            <span>&bull;</span>
                            <span>እስከ 15 MB</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Green Submit Button */}
                    <div>
                      <button
                        type="submit"
                        disabled={!file || submitting}
                        className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white rounded-2xl font-black text-base shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {submitting ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>ፕሮፖዛሉ በመግባት ላይ ነው...</span>
                          </>
                        ) : receipt ? (
                          <>
                            <RotateCcw className="w-5 h-5" />
                            <span>የተሻሻለውን ሰነድ አስገባ / Submit Revision (v{(receipt.currentVersion || 1) + 1})</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-5 h-5" />
                            <span>ፕሮፖዛሉን አስገባ / Submit Proposal</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </motion.div>
            )}

            {/* ────────────────────────────────────────────────────────────── */}
            {/* 3. INSTANT RECEIPT STEP                                        */}
            {/* ────────────────────────────────────────────────────────────── */}
            {step === "receipt" && receipt && (
              <motion.div
                key="step-receipt"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.25 }}
                className="space-y-5"
              >
                {/* Success Header */}
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3 shadow-inner">
                    <CheckCircle className="w-10 h-10" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-emerald-800 tracking-tight">
                    ሰነድዎ በተሳካ ሁኔታ ገቢ ተደርጓል!
                  </h2>
                  <p className="text-xs text-gray-600 mt-1">
                    Official Proposal Confirmed &amp; Sealed into Electoral Registry &bull; Version {receipt.currentVersion || 1}
                  </p>
                </div>

                {/* Instant Receipt Box */}
                <div className="bg-slate-50 border-2 border-emerald-500/50 rounded-2xl p-5 space-y-3.5 text-xs text-gray-700">
                  {/* Reference Tracking Number */}
                  <div className="bg-white border border-emerald-200 rounded-xl p-3 flex items-center justify-between gap-2 shadow-sm">
                    <div>
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                        የማመሳከሪያ ቁጥር / Reference Tracking Number
                      </span>
                      <span className="font-mono font-black text-emerald-900 text-base tracking-wide select-all">
                        {receipt.referenceNumber}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={copyRefNumber}
                      className="p-2 text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                      title="Copy Reference Number"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {/* Candidate Code & Student ID */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white border border-slate-200 rounded-xl p-3">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                        የፈተና ኮድ / Exam Code
                      </span>
                      <span className="font-black text-gray-900 text-sm">
                        Code {receipt.candidateExamCode || "VERIFIED"}
                      </span>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-3">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                        የተማሪ መታወቂያ / Student ID
                      </span>
                      <span className="font-mono font-bold text-gray-900 text-sm">
                        {receipt.studentId || "VERIFIED"}
                      </span>
                    </div>
                  </div>

                  {/* Submission Timestamp & Version */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white border border-slate-200 rounded-xl p-3">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                        እትም / Version
                      </span>
                      <span className="font-bold text-gray-900 text-xs">
                        Version {receipt.currentVersion || 1}
                      </span>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-3">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                        የተረከበበት ሰዓት / Timestamp
                      </span>
                      <span className="font-bold text-gray-900 text-xs truncate block" title={receipt.submittedAt}>
                        {formatReceiptDate(receipt.submittedAt)}
                      </span>
                    </div>
                  </div>

                  {/* Document Name */}
                  {receipt.fileName && (
                    <div className="text-[11px] text-gray-500 pt-1 flex items-center gap-1.5 truncate">
                      <FileText className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span className="truncate">ሰነድ፡ {receipt.fileName}</span>
                    </div>
                  )}
                </div>

                {/* Download PDF Action Button */}
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    disabled={downloading}
                    className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white rounded-2xl font-black text-sm sm:text-base shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {downloading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>በማውረድ ላይ...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-5 h-5" />
                        <span>የተጫነውን ሰነድ ይመልከቱ (Download My PDF)</span>
                      </>
                    )}
                  </button>

                  {/* Resubmit / Upload Revision Action */}
                  {receipt.canResubmit !== false ? (
                    <div className="pt-2 border-t border-slate-200 space-y-2">
                      <button
                        type="button"
                        onClick={() => {
                          setFile(null);
                          setStep("upload");
                        }}
                        className="w-full py-3.5 px-6 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 active:scale-[0.99] text-white rounded-2xl font-black text-sm sm:text-base shadow-lg shadow-sky-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <RotateCcw className="w-5 h-5" />
                        <span>የተሻሻለ ፕሮፖዛል ያስገቡ (Resubmit / Upload Revision)</span>
                      </button>
                      <p className="text-[11px] text-gray-500 text-center font-medium">
                        የተፈቀደው አዲስ እትም፡ Version {(receipt.currentVersion || 1) + 1} &bull; የቀድሞው ሰነድ በታሪክ ውስጥ ይጠበቃል።
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center">
                      <p className="text-xs font-bold text-amber-800">
                        🔒 ዳግም ማስረከብ በፕሬዝዳንቱ ፈቃድ ላይ የተመሠረተ ነው
                      </p>
                      <p className="text-[11px] text-amber-700 mt-0.5">
                        ሰነድዎን ማሻሻል ከፈለጉ እባክዎ የተማሪዎች ህብረት ፕሬዝዳንትን ፈቃድ ይጠይቁ።
                      </p>
                    </div>
                  )}
                </div>

                {/* Official Directive Seal Footer */}
                <div className="text-center pt-2">
                  <p className="text-[11px] text-gray-500">
                    መመሪያ ቁጥር 003/2012 አንቀጽ 22 &bull; የሰነዱ ምዝገባ በይፋ ተጠናቋል።
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default ProposalSubmission;
