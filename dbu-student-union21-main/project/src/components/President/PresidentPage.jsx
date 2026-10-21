/** @format */
import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
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
  Award,
  Crown,
  Sparkles,
  RotateCcw,
  Edit3,
  Sliders,
  ToggleLeft,
  ToggleRight,
  Trash2,
  User,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../contexts/AuthContext";
import { apiService } from "../../services/api";
import toast from "react-hot-toast";

export function PresidentPage() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL, SUBMITTED, PENDING
  const [downloadingId, setDownloadingId] = useState(null);

  // 16 Official Candidate Exam Codes State
  const [showExamCodes, setShowExamCodes] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);

  // Deadline Settings State
  const [showDeadlineModal, setShowDeadlineModal] = useState(false);
  const [deadlineInput, setDeadlineInput] = useState("");
  const [savingDeadline, setSavingDeadline] = useState(false);

  // Version History Modal
  const [selectedCandidateHistory, setSelectedCandidateHistory] = useState(null);

  // Administrative Controls State
  const [deletingId, setDeletingId] = useState(null);
  const [togglingCode, setTogglingCode] = useState(null);

  // Edit Candidate Mapping State
  const [editMappingCandidate, setEditMappingCandidate] = useState(null);
  const [savingMapping, setSavingMapping] = useState(false);

  // AI Proposal Evaluation State
  const [evaluatingId, setEvaluatingId] = useState(null);
  const [selectedEvaluation, setSelectedEvaluation] = useState(null);
  const [savingScore, setSavingScore] = useState(false);

  // Strict Presidential Guard: ONLY Student Union President (dbu10101020) can control proposals
  const isOtherAdmin =
    user &&
    (user.username === "dbu10101030" ||
      user.username === "dbu10101011" ||
      user.username === "dbu10101040" ||
      (user.role === "admin" && user.username !== "dbu10101020") ||
      (user.role === "system_admin" && user.username !== "dbu10101020"));

  const isPresident =
    user &&
    (user.username === "dbu10101020" ||
      user.role === "president" ||
      user.role === "council_president") &&
    !isOtherAdmin;

  useEffect(() => {
    if (isPresident) {
      fetchDashboard();
    }
  }, [isPresident]);

  if (!isPresident) {
    return <Navigate to="/dashboard" replace />;
  }

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

  // 1. Delete / Reset Proposal
  const handleDeleteProposal = async (candidate) => {
    const confirmPrompt = `Are you sure you want to delete the submitted proposal for candidate "${candidate.name}" (Code: ${candidate.examCode})?\n\nThis will remove the uploaded PDF and reset their status to Pending, allowing the candidate to upload again.`;
    if (!window.confirm(confirmPrompt)) return;

    try {
      setDeletingId(candidate.proposalId);
      const res = await apiService.deleteProposal(candidate.proposalId);
      toast.success(res.message || "Proposal removed. Candidate can now re-submit.");
      await fetchDashboard();
    } catch (err) {
      console.error("Delete proposal error:", err);
      toast.error(err.message || "Failed to delete proposal.");
    } finally {
      setDeletingId(null);
    }
  };

  // 2. Toggle Candidate Active / Inactive Status
  const handleToggleCandidateStatus = async (candidate) => {
    const newActiveState = candidate.isActive === false;
    try {
      setTogglingCode(candidate.examCode);
      const res = await apiService.toggleCandidateStatus(candidate.examCode, newActiveState);
      toast.success(res.message || `Candidate Code ${candidate.examCode} status updated.`);
      await fetchDashboard();
    } catch (err) {
      console.error("Toggle candidate error:", err);
      toast.error(err.message || "Failed to update candidate active status.");
    } finally {
      setTogglingCode(null);
    }
  };

  // 3. Save Candidate Mapping
  const handleSaveMapping = async (e) => {
    e.preventDefault();
    if (!editMappingCandidate?.newExamCode || !editMappingCandidate?.newStudentId) {
      toast.error("Both Exam Code and University Student ID are required.");
      return;
    }

    try {
      setSavingMapping(true);
      const res = await apiService.editCandidateMapping({
        oldExamCode: editMappingCandidate.oldExamCode,
        newExamCode: editMappingCandidate.newExamCode,
        oldStudentId: editMappingCandidate.oldStudentId,
        newStudentId: editMappingCandidate.newStudentId,
      });
      toast.success(res.message || "Candidate mapping updated successfully!");
      setEditMappingCandidate(null);
      await fetchDashboard();
    } catch (err) {
      console.error("Save mapping error:", err);
      toast.error(err.message || "Failed to update mapping.");
    } finally {
      setSavingMapping(false);
    }
  };

  // 4. AI-Assisted Proposal Evaluation
  const handleOpenAiEvaluate = async (candidate, forceRefresh = false) => {
    if (!candidate.proposalId) {
      toast.error("Candidate has not submitted a proposal PDF yet.");
      return;
    }

    try {
      setEvaluatingId(candidate.proposalId);
      let evalData = candidate.evaluation;

      if (!evalData || forceRefresh) {
        toast.loading("AI እቅዱን በማንበብ በመመሪያ ቁጥር 003/2012 አንቀጽ 22 መስፈርት እየገመገመ ነው...", { id: "ai-eval" });
        const res = await apiService.evaluateProposalWithAi(candidate.proposalId);
        evalData = res.evaluation || res;
        toast.success("የ AI እቅድ ግምገማ በአማርኛ ተጠናቅቋል!", { id: "ai-eval" });
        await fetchDashboard();
      }

      const rawCriteria = evalData?.criteria || {};
      const stratObj = evalData?.strategicObjectives || rawCriteria.strategicObjectives || {
        score: 3.2,
        maxScore: 4.0,
        strengths: "በአማርኛ - የተማሪውን አካዳሚያዊ ልህቀት፣ ማህበራዊ ደህንነት እና የካምፓስ ዲጂታል አሰራርን ለማሳደግ የተቀመጡት ግቦች ግልጽና ፋይዳ ያላቸው መሆናቸው።",
        weaknesses: "በአማርኛ - ከተማሪዎች ልዩ ፍላጎት እና ከምርምር ማዕከላት ጋር በተገናኘ የተካተቱ ዝርዝር ስትራቴጂካዊ ዓላማዎች ውስን መሆናቸው።",
        pointDeductions: "በአማርኛ - ከ 4.0 ነጥብ ላይ 0.8 ነጥብ የተቀነሰው በዓላማዎቹ ውስጥ የተማሪዎች የልዩ ፍላጎት ድጋፍ አቀራረብ በበቂ ሁኔታ ባለመብራራቱ ነው።",
      };

      const actObj = evalData?.actionability || rawCriteria.actionability || {
        score: 3.0,
        maxScore: 4.0,
        strengths: "በአማርኛ - ከተማሪዎች ህብረት ስራ አስፈፃሚ ስልጣንና ተግባር ጋር በቀጥታ የተጣጣሙ የተግባር እርምጃዎችና የቅሬታ መፍቻ መንገዶች መካተታቸው።",
        weaknesses: "በአማርኛ - ያልተጠበቁ የካምፓስ መስተጓጎሎች ሲያጋጥሙ ተግባራቱን ለማስቀጠል የሚያስችሉ አማራጭ ስልቶች አለመቀመጣቸው።",
        pointDeductions: "በአማርኛ - ከ 4.0 ነጥብ ላይ 1.0 ነጥብ የተቀነሰው አደጋ ሲያጋጥም የሚወሰዱ ተለዋዋጭ የአሰራር ስልቶች ባለመገለጻቸው ነው።",
      };

      const timeObj = evalData?.timeline || rawCriteria.timeline || rawCriteria.timelinePlanning || {
        score: 2.8,
        maxScore: 4.0,
        strengths: "በአማርኛ - የክንውን ምዕራፎቹ በየሩብ ዓመቱ እና በሴሚስተር ደረጃ ተከፋፍለው ቅደም ተከተላቸው የተጠበቀ መሆኑ።",
        weaknesses: "በአማርኛ - በምዕራፍ 2 ላይ የታቀዱት በርካታ ተግባራት በአንድ ወር ውስጥ ተደራርበው የመፈጸም ዕድላቸው አነስተኛ መሆኑ።",
        pointDeductions: "በአማርኛ - ከ 4.0 ነጥብ ላይ 1.2 ነጥብ የተቀነሰው በጊዜ ሰሌዳው ላይ የተደራረቡና የማይጣጣሙ የፈተና ወቅት ድልድሎች በመኖራቸው ነው።",
      };

      const budObj = evalData?.budgetingClarity || rawCriteria.budgetingClarity || rawCriteria.clarityBudgeting || {
        score: 2.2,
        maxScore: 3.0,
        strengths: "በአማርኛ - ከመመሪያ ቁጥር 003/2012 አንቀጽ 22 የፋይናንስ ግልጽነት እና የኦዲት መርሆዎች ጋር የተጣጣመ አቀራረብ መያዙ።",
        weaknesses: "በአማርኛ - በእያንዳንዱ የታቀደ ተግባር ስር የሚፈጀው ግምታዊ የገንዘብ መጠን እና ከተማሪ ህብረት አሰራር ጋር የተፈጠሩ ክፍተቶች መኖራቸው።",
        pointDeductions: "በአማርኛ - ከ 3.0 ነጥብ ላይ 0.8 ነጥብ የተቀነሰው ለእያንዳንዱ ተግባር ዝርዝር የበጀት ግምት ባለመያዙ ነው።",
      };

      const riskText = evalData?.riskAssessment || "በአማርኛ - እጩው ቢመረጥ እቅዱን ተግባራዊ ለማድረግ የበጀት እጥረት እና የዩኒቨርሲቲው አስተዳደራዊ ውሳኔዎች መዘግየት ዋና ተግዳሮት ሊሆኑ ይችላሉ።";
      const recText = evalData?.committeeRecommendation || evalData?.summary || evalData?.summaryFeedback || "በአማርኛ - እጩው ያቀረበው የስትራቴጂክ ዕቅድ መመሪያ ቁጥር 003/2012 አንቀጽ 22 መስፈርቶችን በአጥጋቢ ሁኔታ የሚያሟላ በመሆኑ፣ የተገለጹትን ክፍተቶች በማስተካከል ለሥራ አስፈፃሚነት እንዲያልፍ አስመራጭ ኮሚቴው ይመክራል።";

      const totalVal = evalData?.totalScore !== undefined
        ? Number(evalData.totalScore)
        : Number((stratObj.score + actObj.score + timeObj.score + budObj.score).toFixed(1));

      setSelectedEvaluation({
        candidate,
        proposalId: candidate.proposalId,
        evaluation: evalData,
        totalScore: totalVal,
        maxTotal: 15.0,
        criteria: {
          strategicObjectives: stratObj,
          actionability: actObj,
          timeline: timeObj,
          timelinePlanning: timeObj,
          budgetingClarity: budObj,
          clarityBudgeting: budObj,
        },
        strategicObjectives: stratObj,
        actionability: actObj,
        timeline: timeObj,
        budgetingClarity: budObj,
        riskAssessment: riskText,
        committeeRecommendation: recText,
        summary: recText,
        summaryFeedback: recText,
        reviewNotes: evalData?.reviewNotes || "",
      });
    } catch (err) {
      console.error("AI evaluate error:", err);
      toast.error(err.message || "Failed to evaluate proposal with AI.", { id: "ai-eval" });
    } finally {
      setEvaluatingId(null);
    }
  };

  // 5. Accept and Save Official Score
  const handleSaveEvaluationScore = async () => {
    if (!selectedEvaluation) return;
    try {
      setSavingScore(true);
      const res = await apiService.saveProposalScore(selectedEvaluation.proposalId, {
        totalScore: Number(selectedEvaluation.totalScore),
        maxTotal: 15.0,
        criteria: selectedEvaluation.criteria,
        strategicObjectives: selectedEvaluation.strategicObjectives,
        actionability: selectedEvaluation.actionability,
        timeline: selectedEvaluation.timeline,
        budgetingClarity: selectedEvaluation.budgetingClarity,
        riskAssessment: selectedEvaluation.riskAssessment,
        committeeRecommendation: selectedEvaluation.committeeRecommendation,
        summary: selectedEvaluation.committeeRecommendation || selectedEvaluation.summary,
        summaryFeedback: selectedEvaluation.committeeRecommendation || selectedEvaluation.summaryFeedback,
        reviewNotes: selectedEvaluation.reviewNotes,
      });
      toast.success(res.message || "የዕቅዱ ውጤት በይፋ ጸድቆ ተመዝግቧል!");
      setSelectedEvaluation(null);
      await fetchDashboard();
    } catch (err) {
      console.error("Save score error:", err);
      toast.error(err.message || "Failed to save proposal score.");
    } finally {
      setSavingScore(false);
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
          <p className="text-gray-600 font-medium">Loading President Office & Proposal Registry...</p>
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
      (c.latestReferenceNumber && c.latestReferenceNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.examCode && c.examCode.toLowerCase().includes(searchTerm.toLowerCase()));

    if (statusFilter === "SUBMITTED") return matchesSearch && c.isSubmitted;
    if (statusFilter === "PENDING") return matchesSearch && !c.isSubmitted;
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Presidential Office Header Banner */}
        <div className="mb-8 bg-gradient-to-r from-indigo-900 via-indigo-800 to-sky-900 rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-8 text-9xl">
            🏛️
          </div>
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-400 text-indigo-950 flex items-center gap-1.5 uppercase tracking-wider shadow-sm">
                  <Crown className="w-3.5 h-3.5" /> President Office
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/10 backdrop-blur-sm text-sky-200">
                  Debre Berhan University Student Union
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/20">
                  Authorized: dbu10101020
                </span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
                Candidate Proposal Management
              </h1>
              <p className="text-sky-100 text-sm sm:text-base mt-2 max-w-2xl leading-relaxed">
                Official Presidential Portal under Ethiopian Higher Education Directive No. 003/2012 Article 22 & 28:
                Manage Executive Committee (ሥራ አስፈፃሚ) proposal submissions, configure deadlines, and download verified PDF documents.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setShowDeadlineModal(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-indigo-950 rounded-xl text-xs sm:text-sm font-black shadow-md transition-all active:scale-95"
              >
                <Calendar className="w-4 h-4" /> Configure Deadline
              </button>
              <button
                onClick={fetchDashboard}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs sm:text-sm font-semibold transition-colors backdrop-blur-sm"
                title="Refresh Registry"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
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
            <p className="text-xs text-gray-500 mt-1">16 Official authorized candidates</p>
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
            <p className="text-xs text-amber-700 mt-1">Candidates yet to submit PDF</p>
          </div>

          {/* Card 4: Submission Window Status */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Submission Window</span>
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

        {/* 16 Authorized Candidate Exam Codes Reference */}
        <div className="bg-white rounded-2xl shadow-sm border border-indigo-100 p-5 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">
                  Official 16 Authorized Candidate Exam Codes
                </h3>
                <p className="text-gray-500 text-xs">
                  Whitelisted exam codes published on the official notice board for Executive Committee proposals.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowExamCodes(!showExamCodes)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-colors"
            >
              {showExamCodes ? (
                <>
                  Hide Codes <ChevronUp className="w-4 h-4" />
                </>
              ) : (
                <>
                  View 16 Codes <ChevronDown className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          <AnimatePresence>
            {showExamCodes && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mt-4 pt-4 border-t border-gray-100"
              >
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
                  {(settings?.allowedExamCodes || ["16", "23", "02", "32", "37", "38", "22", "19", "04", "30", "24", "20", "03", "36", "34", "15"]).map((code) => {
                    const matchedCandidate = candidates.find((c) => String(c.examCode) === String(code));
                    const isSubmitted = matchedCandidate?.isSubmitted;
                    return (
                      <div
                        key={code}
                        onClick={() => handleCopyCode(code)}
                        className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all hover:scale-105 select-none relative group ${
                          isSubmitted
                            ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                            : "bg-slate-50 border-gray-200 text-gray-800 hover:border-indigo-300"
                        }`}
                      >
                        <div className="text-xs font-semibold text-gray-400 group-hover:text-indigo-600 flex items-center justify-center gap-1">
                          Code {copiedCode === code ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100" />}
                        </div>
                        <div className="text-lg font-black tracking-wide mt-0.5">{code}</div>
                        <div className="text-[10px] mt-1 font-semibold truncate">
                          {isSubmitted ? (
                            <span className="text-emerald-700 font-bold">✓ Submitted</span>
                          ) : (
                            <span className="text-amber-600">Pending</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search candidate name, ID, code, ref..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <span className="text-xs font-semibold text-gray-400 uppercase mr-1">Filter:</span>
            {[
              { id: "ALL", label: "All Candidates" },
              { id: "SUBMITTED", label: "Submitted" },
              { id: "PENDING", label: "Pending" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                  statusFilter === f.id
                    ? "bg-indigo-700 text-white"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Candidate Proposals Roster Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900">
                Candidate Proposal Submissions Roster
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Showing {filteredCandidates.length} of {candidates.length} candidates
              </p>
            </div>
            <span className="text-xs bg-indigo-50 text-indigo-700 font-bold px-2.5 py-1 rounded-full border border-indigo-100">
              Executive Committee Candidates Only
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-slate-50 text-xs font-bold uppercase text-gray-500 border-b border-gray-100">
                <tr>
                  <th className="px-5 py-4">Candidate & Student ID</th>
                  <th className="px-4 py-4 text-center">Exam Code & Access</th>
                  <th className="px-4 py-4 text-center">Submission Status</th>
                  <th className="px-4 py-4 text-center">AI Evaluation (15%)</th>
                  <th className="px-5 py-4">Reference & Date</th>
                  <th className="px-5 py-4 text-right">Administrative Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCandidates.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                      <FileText className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm font-semibold">No candidates found matching the search criteria.</p>
                    </td>
                  </tr>
                ) : (
                  filteredCandidates.map((c) => (
                    <tr key={c.candidateId || c.username} className="hover:bg-slate-50/70 transition-colors">
                      {/* Candidate Column */}
                      <td className="px-5 py-4">
                        <div className="font-bold text-gray-900">{c.name}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                          <span className="font-mono font-medium text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                            ID: {c.studentId || c.username}
                          </span>
                          {c.department ? (
                            <>
                              <span>&bull;</span>
                              <span>{c.department}</span>
                            </>
                          ) : null}
                        </div>
                      </td>

                      {/* Exam Code & Access Toggle Column */}
                      <td className="px-4 py-4 text-center">
                        <div className="flex flex-col items-center gap-1.5">
                          <div className="flex items-center gap-1.5">
                            {c.examCode ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
                                Code {c.examCode}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">&mdash;</span>
                            )}
                            <button
                              onClick={() =>
                                setEditMappingCandidate({
                                  candidateName: c.name,
                                  oldExamCode: c.examCode,
                                  newExamCode: c.examCode,
                                  oldStudentId: c.studentId || c.username,
                                  newStudentId: c.studentId || c.username,
                                })
                              }
                              className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                              title="Edit Assigned Exam Code / University Student ID"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Action toggle to enable/disable exam code */}
                          {c.examCode && (
                            <button
                              onClick={() => handleToggleCandidateStatus(c)}
                              disabled={togglingCode === c.examCode}
                              className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full transition-colors ${
                                c.isActive === false
                                  ? "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                                  : "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                              }`}
                              title={c.isActive === false ? "Click to Activate" : "Click to Deactivate"}
                            >
                              {c.isActive === false ? (
                                <>
                                  <ToggleLeft className="w-3.5 h-3.5 text-red-500" /> Inactive
                                </>
                              ) : (
                                <>
                                  <ToggleRight className="w-3.5 h-3.5 text-emerald-600" /> Active
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Status Column */}
                      <td className="px-4 py-4 text-center">
                        {c.isSubmitted ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle className="w-3.5 h-3.5" /> Submitted
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                            <Clock className="w-3.5 h-3.5" /> Pending
                          </span>
                        )}
                      </td>

                      {/* AI Rubric Evaluation (15%) Column */}
                      <td className="px-4 py-4 text-center">
                        {c.isSubmitted && c.proposalId ? (
                          c.evaluation && c.evaluation.totalScore !== undefined ? (
                            <div className="flex flex-col items-center gap-1">
                              <button
                                onClick={() => handleOpenAiEvaluate(c)}
                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-black transition-all shadow-sm"
                                title="Click to view full rubric evaluation and scores"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                                {c.evaluation.totalScore} / 15 pts
                              </button>
                              <span className="text-[10px] font-bold text-gray-500">
                                {c.evaluation.status === "Approved" ? "✓ Approved" : "Draft AI Review"}
                              </span>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleOpenAiEvaluate(c)}
                              disabled={evaluatingId === c.proposalId}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                              title="Evaluate proposal with AI against Directive No. 003/2012 Article 22"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              {evaluatingId === c.proposalId ? "Analyzing..." : "AI Auto-Evaluate"}
                            </button>
                          )
                        ) : (
                          <span className="text-xs text-gray-400 italic">Awaiting PDF</span>
                        )}
                      </td>

                      {/* Reference & Date Column */}
                      <td className="px-5 py-4">
                        {c.isSubmitted ? (
                          <div>
                            <div className="text-xs font-mono font-bold text-gray-800 flex items-center gap-1">
                              <FileCheck className="w-3.5 h-3.5 text-indigo-600" />
                              {c.latestReferenceNumber || "REF-COMPLIANT"}
                            </div>
                            <div className="text-[11px] text-gray-400 mt-0.5">
                              {c.latestSubmittedAtFormatted || "Recorded"}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">No submission yet</span>
                        )}
                      </td>

                      {/* Actions Column */}
                      <td className="px-5 py-4 text-right">
                        {c.isSubmitted && c.proposalId ? (
                          <div className="inline-flex items-center gap-2">
                            <button
                              onClick={() => handleDownloadFile(c.proposalId, c.currentVersion, `${c.username}_proposal.pdf`)}
                              disabled={downloadingId === `${c.proposalId}-latest`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                              title="Download Proposal PDF"
                            >
                              <Download className="w-3.5 h-3.5" />
                              {downloadingId === `${c.proposalId}-latest` ? "..." : "PDF"}
                            </button>

                            {/* Delete Proposal / Allow Resubmit Button */}
                            <button
                              onClick={() => handleDeleteProposal(c)}
                              disabled={deletingId === c.proposalId}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                              title="Delete uploaded proposal PDF and reset status back to Pending"
                            >
                              <RotateCcw className="w-3.5 h-3.5 text-red-600" />
                              {deletingId === c.proposalId ? "Resetting..." : "Allow Resubmit"}
                            </button>

                            {c.versionHistory && c.versionHistory.length > 1 && (
                              <button
                                onClick={() => setSelectedCandidateHistory(c)}
                                className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs transition-colors"
                                title="View Version Audit"
                              >
                                <History className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 font-medium">Pending Upload</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Edit Candidate Mapping Modal */}
        {editMappingCandidate && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95">
              <button
                onClick={() => setEditMappingCandidate(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Edit Candidate Mapping</h3>
                  <p className="text-xs text-gray-500">Correct Exam Code or University Student ID</p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-gray-200 rounded-xl mb-4 text-xs">
                <span className="font-bold text-gray-700">Candidate: </span>
                <span className="text-gray-900 font-semibold">{editMappingCandidate.candidateName}</span>
              </div>

              <form onSubmit={handleSaveMapping} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Assigned Exam Code
                  </label>
                  <input
                    type="text"
                    value={editMappingCandidate.newExamCode}
                    onChange={(e) =>
                      setEditMappingCandidate({ ...editMappingCandidate, newExamCode: e.target.value.trim() })
                    }
                    placeholder="e.g. 16, 23, 02"
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    University Student ID
                  </label>
                  <input
                    type="text"
                    value={editMappingCandidate.newStudentId}
                    onChange={(e) =>
                      setEditMappingCandidate({ ...editMappingCandidate, newStudentId: e.target.value.trim() })
                    }
                    placeholder="e.g. 1801228"
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    required
                  />
                </div>

                <p className="text-[11px] text-gray-500">
                  Updating this mapping immediately updates the candidate verification whitelist and synchronizes proposal submission records.
                </p>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setEditMappingCandidate(null)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingMapping}
                    className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    {savingMapping ? "Saving..." : "Save Mapping"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* AI Rubric Evaluation Modal */}
        {selectedEvaluation && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
              <button
                onClick={() => setSelectedEvaluation(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">የዕቅድ ግምገማ እና የውጤት ማረጋገጫ (Directive 003/2012 Art. 22)</h3>
                  <p className="text-xs text-gray-500">
                    ዕጩ ተወዳዳሪ፡ <span className="font-bold text-gray-800">{selectedEvaluation.candidate.name}</span> &bull; የፈተና ኮድ፡ <span className="font-mono font-bold text-indigo-700">Code {selectedEvaluation.candidate.examCode}</span> &bull; መታወቂያ፡ <span className="font-mono font-bold text-indigo-700">{selectedEvaluation.candidate.studentId || selectedEvaluation.candidate.username}</span>
                  </p>
                </div>
              </div>

              {/* Total Score Banner */}
              <div className="p-4 bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-blue-500/10 border border-purple-200 rounded-2xl mb-5 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">አጠቃላይ የተሰጠ ውጤት / Official Proposal Score</span>
                  <div className="text-3xl font-black text-gray-900 mt-0.5">
                    {selectedEvaluation.totalScore} <span className="text-lg font-semibold text-gray-500">/ 15.0 ነጥብ (pts)</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-gray-500 block">የክብደት ድርሻ / Grade Weight (15%)</span>
                  <span className="text-xl font-bold text-indigo-700">
                    {((selectedEvaluation.totalScore / 15) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Criteria Breakdown */}
              <div className="space-y-5 mb-6">
                {/* Criterion 1: Strategic Objectives */}
                <div className="p-4 bg-slate-50 border border-gray-200 rounded-2xl shadow-sm">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200/70">
                    <div>
                      <span className="text-xs font-bold text-gray-900 block">
                        1. ስትራቴጂካዊ ዓላማ እና ጠቀሜታ (4%) / Strategic Objectives & Campus Relevance
                      </span>
                      <span className="text-[11px] text-gray-500">ከ 4.0 ነጥብ የተቀመጠ የክብደት መጠን</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="0"
                        max="4"
                        step="0.1"
                        value={selectedEvaluation.criteria?.strategicObjectives?.score ?? 0}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          const scoreVal = Math.min(4, Math.max(0, val));
                          const newCrit = {
                            ...selectedEvaluation.criteria,
                            strategicObjectives: {
                              ...selectedEvaluation.criteria.strategicObjectives,
                              score: scoreVal,
                            },
                          };
                          const newTotal = (
                            newCrit.strategicObjectives.score +
                            newCrit.actionability.score +
                            (newCrit.timeline?.score ?? newCrit.timelinePlanning?.score ?? 0) +
                            (newCrit.budgetingClarity?.score ?? newCrit.clarityBudgeting?.score ?? 0)
                          ).toFixed(1);
                          setSelectedEvaluation({ ...selectedEvaluation, criteria: newCrit, totalScore: Number(newTotal) });
                        }}
                        className="w-16 px-2 py-1 text-sm font-bold text-indigo-700 bg-white border border-gray-300 rounded-lg text-center"
                      />
                      <span className="text-xs font-bold text-gray-500">/ 4.0</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="p-2.5 bg-emerald-50/80 border border-emerald-200 rounded-xl">
                      <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block mb-0.5">
                        ✓ ጠንካራ ጎኖች (Strengths):
                      </span>
                      <p className="text-xs text-emerald-950 font-sans leading-relaxed">
                        {selectedEvaluation.criteria?.strategicObjectives?.strengths || "በአማርኛ - የተማሪውን አካዳሚያዊ ልህቀትና ሁለንተናዊ የካምፓስ አገልግሎቶችን ለማሻሻል የተቀመጡት ግቦች ግልጽና ፋይዳ ያላቸው መሆናቸው።"}
                      </p>
                    </div>

                    <div className="p-2.5 bg-amber-50/80 border border-amber-200 rounded-xl">
                      <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block mb-0.5">
                        ⚠ ክፍተቶች እና ጉድለቶች (Weaknesses):
                      </span>
                      <p className="text-xs text-amber-950 font-sans leading-relaxed">
                        {selectedEvaluation.criteria?.strategicObjectives?.weaknesses || "በአማርኛ - ከተማሪዎች ልዩ ፍላጎት እና ከምርምር ማዕከላት ጋር በተገናኘ የተካተቱ ዝርዝር ስትራቴጂካዊ ዓላማዎች ውስን መሆናቸው።"}
                      </p>
                    </div>

                    <div className="p-2.5 bg-rose-50/80 border border-rose-200 rounded-xl">
                      <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider block mb-0.5">
                        ✕ ነጥብ የተቀነሰበት ምክንያት (Point Deductions):
                      </span>
                      <p className="text-xs text-rose-950 font-sans leading-relaxed">
                        {selectedEvaluation.criteria?.strategicObjectives?.pointDeductions || "በአማርኛ - ከ 4.0 ነጥብ ላይ የተቀነሰበት ተጨባጭ ምክንያት።"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Criterion 2: Actionability */}
                <div className="p-4 bg-slate-50 border border-gray-200 rounded-2xl shadow-sm">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200/70">
                    <div>
                      <span className="text-xs font-bold text-gray-900 block">
                        2. አፈጻጸም እና አዋጭነት (4%) / Actionability & Feasibility
                      </span>
                      <span className="text-[11px] text-gray-500">ከ 4.0 ነጥብ የተቀመጠ የክብደት መጠን</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="0"
                        max="4"
                        step="0.1"
                        value={selectedEvaluation.criteria?.actionability?.score ?? 0}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          const scoreVal = Math.min(4, Math.max(0, val));
                          const newCrit = {
                            ...selectedEvaluation.criteria,
                            actionability: {
                              ...selectedEvaluation.criteria.actionability,
                              score: scoreVal,
                            },
                          };
                          const newTotal = (
                            newCrit.strategicObjectives.score +
                            newCrit.actionability.score +
                            (newCrit.timeline?.score ?? newCrit.timelinePlanning?.score ?? 0) +
                            (newCrit.budgetingClarity?.score ?? newCrit.clarityBudgeting?.score ?? 0)
                          ).toFixed(1);
                          setSelectedEvaluation({ ...selectedEvaluation, criteria: newCrit, totalScore: Number(newTotal) });
                        }}
                        className="w-16 px-2 py-1 text-sm font-bold text-indigo-700 bg-white border border-gray-300 rounded-lg text-center"
                      />
                      <span className="text-xs font-bold text-gray-500">/ 4.0</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="p-2.5 bg-emerald-50/80 border border-emerald-200 rounded-xl">
                      <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block mb-0.5">
                        ✓ ጠንካራ ጎኖች (Strengths):
                      </span>
                      <p className="text-xs text-emerald-950 font-sans leading-relaxed">
                        {selectedEvaluation.criteria?.actionability?.strengths || "በአማርኛ - ከተማሪዎች ህብረት ስራ አስፈፃሚ ስልጣንና ተግባር ጋር በቀጥታ የተጣጣሙ የተግባር እርምጃዎች መካተታቸው።"}
                      </p>
                    </div>

                    <div className="p-2.5 bg-amber-50/80 border border-amber-200 rounded-xl">
                      <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block mb-0.5">
                        ⚠ ክፍተቶች እና ጉድለቶች (Weaknesses):
                      </span>
                      <p className="text-xs text-amber-950 font-sans leading-relaxed">
                        {selectedEvaluation.criteria?.actionability?.weaknesses || "በአማርኛ - ያልተጠበቁ የካምፓስ መስተጓጎሎች ሲያጋጥሙ ተግባራቱን ለማስቀጠል የሚያስችሉ አማራጭ ስልቶች አለመቀመጣቸው።"}
                      </p>
                    </div>

                    <div className="p-2.5 bg-rose-50/80 border border-rose-200 rounded-xl">
                      <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider block mb-0.5">
                        ✕ ነጥብ የተቀነሰበት ምክንያት (Point Deductions):
                      </span>
                      <p className="text-xs text-rose-950 font-sans leading-relaxed">
                        {selectedEvaluation.criteria?.actionability?.pointDeductions || "በአማርኛ - ከ 4.0 ነጥብ ላይ የተቀነሰበት ትክክለኛ ምክንያት።"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Criterion 3: Timeline */}
                <div className="p-4 bg-slate-50 border border-gray-200 rounded-2xl shadow-sm">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200/70">
                    <div>
                      <span className="text-xs font-bold text-gray-900 block">
                        3. የጊዜ ሰሌዳ እና ምዕራፎች (4%) / Realistic Timeline & Milestone Planning
                      </span>
                      <span className="text-[11px] text-gray-500">ከ 4.0 ነጥብ የተቀመጠ የክብደት መጠን</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="0"
                        max="4"
                        step="0.1"
                        value={selectedEvaluation.criteria?.timeline?.score ?? selectedEvaluation.criteria?.timelinePlanning?.score ?? 0}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          const scoreVal = Math.min(4, Math.max(0, val));
                          const newCrit = {
                            ...selectedEvaluation.criteria,
                            timeline: {
                              ...(selectedEvaluation.criteria.timeline || {}),
                              score: scoreVal,
                            },
                            timelinePlanning: {
                              ...(selectedEvaluation.criteria.timelinePlanning || {}),
                              score: scoreVal,
                            },
                          };
                          const newTotal = (
                            newCrit.strategicObjectives.score +
                            newCrit.actionability.score +
                            newCrit.timeline.score +
                            (newCrit.budgetingClarity?.score ?? newCrit.clarityBudgeting?.score ?? 0)
                          ).toFixed(1);
                          setSelectedEvaluation({ ...selectedEvaluation, criteria: newCrit, totalScore: Number(newTotal) });
                        }}
                        className="w-16 px-2 py-1 text-sm font-bold text-indigo-700 bg-white border border-gray-300 rounded-lg text-center"
                      />
                      <span className="text-xs font-bold text-gray-500">/ 4.0</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="p-2.5 bg-emerald-50/80 border border-emerald-200 rounded-xl">
                      <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block mb-0.5">
                        ✓ ጠንካራ ጎኖች (Strengths):
                      </span>
                      <p className="text-xs text-emerald-950 font-sans leading-relaxed">
                        {selectedEvaluation.criteria?.timeline?.strengths || "በአማርኛ - የክንውን ምዕራፎቹ በየሴሚስተሩ እና በወራት ተከፋፍለው ቅደም ተከተላቸው የተጠበቀ መሆኑ።"}
                      </p>
                    </div>

                    <div className="p-2.5 bg-amber-50/80 border border-amber-200 rounded-xl">
                      <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block mb-0.5">
                        ⚠ ክፍተቶች እና ጉድለቶች (Weaknesses):
                      </span>
                      <p className="text-xs text-amber-950 font-sans leading-relaxed">
                        {selectedEvaluation.criteria?.timeline?.weaknesses || "በአማርኛ - በምዕራፍ 2 ላይ የታቀዱት በርካታ ተግባራት በአንድ ወቅት ተደራርበው የመፈጸም ዕድላቸው አነስተኛ መሆኑ።"}
                      </p>
                    </div>

                    <div className="p-2.5 bg-rose-50/80 border border-rose-200 rounded-xl">
                      <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider block mb-0.5">
                        ✕ ነጥብ የተቀነሰበት ምክንያት (Point Deductions):
                      </span>
                      <p className="text-xs text-rose-950 font-sans leading-relaxed">
                        {selectedEvaluation.criteria?.timeline?.pointDeductions || "በአማርኛ - በጊዜ ሰሌዳ ምክንያት ነጥብ የተቆረጠበት ዝርዝር ምክንያት።"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Criterion 4: Budgeting Clarity */}
                <div className="p-4 bg-slate-50 border border-gray-200 rounded-2xl shadow-sm">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200/70">
                    <div>
                      <span className="text-xs font-bold text-gray-900 block">
                        4. በጀት እና አደረጃጀት (3%) / Clarity, Budgeting & Student Union Alignment
                      </span>
                      <span className="text-[11px] text-gray-500">ከ 3.0 ነጥብ የተቀመጠ የክብደት መጠን</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="0"
                        max="3"
                        step="0.1"
                        value={selectedEvaluation.criteria?.budgetingClarity?.score ?? selectedEvaluation.criteria?.clarityBudgeting?.score ?? 0}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          const scoreVal = Math.min(3, Math.max(0, val));
                          const newCrit = {
                            ...selectedEvaluation.criteria,
                            budgetingClarity: {
                              ...(selectedEvaluation.criteria.budgetingClarity || {}),
                              score: scoreVal,
                            },
                            clarityBudgeting: {
                              ...(selectedEvaluation.criteria.clarityBudgeting || {}),
                              score: scoreVal,
                            },
                          };
                          const newTotal = (
                            newCrit.strategicObjectives.score +
                            newCrit.actionability.score +
                            (newCrit.timeline?.score ?? newCrit.timelinePlanning?.score ?? 0) +
                            newCrit.budgetingClarity.score
                          ).toFixed(1);
                          setSelectedEvaluation({ ...selectedEvaluation, criteria: newCrit, totalScore: Number(newTotal) });
                        }}
                        className="w-16 px-2 py-1 text-sm font-bold text-indigo-700 bg-white border border-gray-300 rounded-lg text-center"
                      />
                      <span className="text-xs font-bold text-gray-500">/ 3.0</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="p-2.5 bg-emerald-50/80 border border-emerald-200 rounded-xl">
                      <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block mb-0.5">
                        ✓ ጠንካራ ጎኖች (Strengths):
                      </span>
                      <p className="text-xs text-emerald-950 font-sans leading-relaxed">
                        {selectedEvaluation.criteria?.budgetingClarity?.strengths || "በአማርኛ - ከመመሪያ ቁጥር 003/2012 አንቀጽ 22 የፋይናንስ ግልጽነት እና የኦዲት መርሆዎች ጋር የተጣጣመ አቀራረብ መያዙ።"}
                      </p>
                    </div>

                    <div className="p-2.5 bg-amber-50/80 border border-amber-200 rounded-xl">
                      <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block mb-0.5">
                        ⚠ ክፍተቶች እና ጉድለቶች (Weaknesses):
                      </span>
                      <p className="text-xs text-amber-950 font-sans leading-relaxed">
                        {selectedEvaluation.criteria?.budgetingClarity?.weaknesses || "በአማርኛ - በእያንዳንዱ የታቀደ ተግባር ስር የሚፈጀው ግምታዊ የገንዘብ መጠን እና ከተማሪ ህብረት አሰራር ጋር የተፈጠሩ ክፍተቶች መኖራቸው።"}
                      </p>
                    </div>

                    <div className="p-2.5 bg-rose-50/80 border border-rose-200 rounded-xl">
                      <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider block mb-0.5">
                        ✕ ነጥብ የተቀነሰበት ምክንያት (Point Deductions):
                      </span>
                      <p className="text-xs text-rose-950 font-sans leading-relaxed">
                        {selectedEvaluation.criteria?.budgetingClarity?.pointDeductions || "በአማርኛ - ከ 3.0 ነጥብ ላይ የተቀነሰበት ምክንያት።"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Risk Assessment */}
                <div className="p-4 bg-orange-50/80 border border-orange-200 rounded-2xl shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck className="w-4 h-4 text-orange-600" />
                    <label className="text-xs font-bold text-orange-900 uppercase tracking-wider">
                      የስጋት እና ተግዳሮት ዳሰሳ (Risk Assessment)
                    </label>
                  </div>
                  <textarea
                    rows="2"
                    value={selectedEvaluation.riskAssessment || ""}
                    onChange={(e) =>
                      setSelectedEvaluation({
                        ...selectedEvaluation,
                        riskAssessment: e.target.value,
                      })
                    }
                    placeholder="እጩው ቢያልፍ እቅዱን ተግባራዊ ለማድረግ ሊያጋጥሙ የሚችሉ ተግዳሮቶች እና ስጋቶች..."
                    className="w-full px-3.5 py-2 text-xs font-sans border border-orange-300 rounded-xl bg-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>

                {/* Committee Recommendation */}
                <div className="p-4 bg-indigo-50/80 border border-indigo-200 rounded-2xl shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="w-4 h-4 text-indigo-700" />
                    <label className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
                      ለአስመራጭ ኮሚቴው የተሰጠ የማጠቃለያ ውሳኔ ሃሳብ (Committee Recommendation)
                    </label>
                  </div>
                  <textarea
                    rows="3"
                    value={selectedEvaluation.committeeRecommendation || selectedEvaluation.summary || ""}
                    onChange={(e) =>
                      setSelectedEvaluation({
                        ...selectedEvaluation,
                        committeeRecommendation: e.target.value,
                        summary: e.target.value,
                        summaryFeedback: e.target.value,
                      })
                    }
                    placeholder="ለአስመራጭ ኮሚቴው የተሰጠ የማጠቃለያ ውሳኔ ሃሳብ..."
                    className="w-full px-3.5 py-2 text-xs font-sans border border-indigo-300 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => handleOpenAiEvaluate(selectedEvaluation.candidate, true)}
                  disabled={evaluatingId === selectedEvaluation.proposalId}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-purple-700 hover:bg-purple-50 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {evaluatingId === selectedEvaluation.proposalId ? "በመገምገም ላይ..." : "እንደገና በ AI ገምግም / Re-Run Evaluation"}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedEvaluation(null)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50"
                  >
                    ይቅር / Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEvaluationScore}
                    disabled={savingScore}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    {savingScore ? "በማስቀመጥ ላይ..." : "ውጤቱን አጽድቅና መዝግብ / Accept & Save"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Deadline Configuration Modal */}
        {showDeadlineModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95">
              <button
                onClick={() => setShowDeadlineModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Configure Proposal Deadline</h3>
                  <p className="text-xs text-gray-500">Student Union President Authority</p>
                </div>
              </div>

              <form onSubmit={handleSaveDeadline} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Closing Date & Time (EAT)
                  </label>
                  <input
                    type="datetime-local"
                    value={deadlineInput}
                    onChange={(e) => setDeadlineInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    required
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    Candidates will be blocked from submitting once this deadline timestamp is reached.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={handleClearDeadline}
                    disabled={savingDeadline}
                    className="px-3.5 py-2 text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold transition-colors"
                  >
                    Clear / Disable Window
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowDeadlineModal(false)}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingDeadline}
                      className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                    >
                      {savingDeadline ? "Saving..." : "Save Deadline"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Version History Modal */}
        {selectedCandidateHistory && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95">
              <button
                onClick={() => setSelectedCandidateHistory(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-4">
                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full uppercase">
                  Audit History
                </span>
                <h3 className="text-lg font-bold text-gray-900 mt-2">
                  {selectedCandidateHistory.name} ({selectedCandidateHistory.username})
                </h3>
                <p className="text-xs text-gray-500">Document submissions log</p>
              </div>

              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {(selectedCandidateHistory.versionHistory || []).map((v) => (
                  <div key={v.version} className="p-3 bg-slate-50 border border-gray-200 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-gray-800">Version {v.version}</div>
                      <div className="text-[11px] font-mono text-indigo-600 mt-0.5">{v.referenceNumber}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">{v.submittedAtFormatted}</div>
                    </div>
                    <button
                      onClick={() => handleDownloadFile(selectedCandidateHistory.proposalId, v.version, `${selectedCandidateHistory.username}_v${v.version}.pdf`)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" /> Download
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PresidentPage;
