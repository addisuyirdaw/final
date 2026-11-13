/**
 * DBU Student Union - All-Years Student Club Registration & Scheduled Maintenance Page
 *
 * Connected directly to Google Sheets via Apps Script Webhook.
 * Bypasses backend to ensure 100% uptime for all-years student registration.
 *
 * @format
 */

import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Users,
  Building,
  GraduationCap,
  Phone,
  User,
  BookOpen,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Calendar,
  X,
  Lock,
} from "lucide-react";

// Google Apps Script Webhook URL (configured via Vercel env or fallback)
const SCRIPT_URL =
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    (import.meta.env.VITE_GOOGLE_SCRIPT_URL ||
      import.meta.env.NEXT_PUBLIC_GOOGLE_SCRIPT_URL)) ||
  "https://script.google.com/macros/s/AKfycbzzaz6SauYQRNyiyTyqhlchUH0tghfx2qObh5yJ8GiLjRPVrVaiq-5CFddGbKxATh1_vg/exec";

// The Authentic DBU Student Union Clubs (from DBU Portal Database)
const DBU_CLUBS = [
  "Rotaract Club of Debre Berhan",
  "Booking Club",
  "Career Development Club",
  "Charity Club (በጎ አድራጎት ክበብ)",
  "Charity and Community Service Club",
  "Civil Engineering Club",
  "DBU Legal Practice and Advocacy Club",
  "Debate Society",
  "Finance Club",
  "Food Engineering Student Association club",
  "Hult Prize Club",
  "Idea Hub",
  "Law Association Club",
  "Mechanical Club",
  "Tecktonic Club",
  "Technology and Innovation Club",
  "Truth Culture Club",
  "ሆሄ ተስፋ ክበብ",
];

// Study Years for All DBU Students
const STUDY_YEARS = [
  "Freshman (የመጀመሪያ ዓመት ፍሬሽማን)",
  "1st Year (1ኛ ዓመት)",
  "2nd Year (2ኛ ዓመት)",
  "3rd Year (3ኛ ዓመት)",
  "4th Year (4ኛ ዓመት)",
  "5th Year (5ኛ ዓመት)",
  "Postgraduate (ድህረ-ምረቃ / ማስተርስ)",
];

export const Home = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [formData, setFormData] = useState({
    fullName: "",
    studentId: "",
    department: "",
    year: "",
    phone: "",
    clubName: "",
  });

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("idle"); // "idle" | "success" | "duplicate" | "error"
  const [registeredClub, setRegisteredClub] = useState("");
  const [registeredName, setRegisteredName] = useState("");
  const [registeredYear, setRegisteredYear] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [showNoticeModal, setShowNoticeModal] = useState(false);

  // Auto-show maintenance notice if redirected via ?service=...
  useEffect(() => {
    const serviceParam = searchParams.get("service");
    if (serviceParam) {
      setShowNoticeModal(true);
      toast(
        "ይቅርታ! ይህ አገልግሎት በጊዜያዊ ጥገና ላይ ነው። በአሁኑ ሰዓት የክለብ አባልነት ምዝገባ ብቻ ክፍት ነው። እባክዎ ከታች ያለውን ፎርም ይጠቀሙ።",
        {
          id: "service-redirect-notice",
          icon: "🛠️",
          duration: 5000,
          style: {
            borderRadius: "12px",
            background: "#0f172a",
            color: "#f8fafc",
            fontSize: "13px",
            fontWeight: "500",
            border: "1px solid #334155",
          },
        }
      );
      searchParams.delete("service");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Intercept navigation on Header / Navbar links to prevent navigating to broken pages
  useEffect(() => {
    const handleNavIntercept = (e) => {
      // Don't intercept clicks inside the registration form, modal, or success card
      if (
        e.target.closest("#registration-form") ||
        e.target.closest("#maintenance-modal") ||
        e.target.closest("#success-card")
      ) {
        return;
      }

      const anchor = e.target.closest("a, [role='link']");
      const button = e.target.closest("button");

      if (anchor) {
        const href = anchor.getAttribute("href") || anchor.getAttribute("to") || "";
        // If clicking external link to DBU portal or an internal path that is not root/hash
        if (
          href &&
          href !== "/" &&
          href !== "#" &&
          !href.startsWith("#") &&
          !href.startsWith("tel:") &&
          !href.startsWith("mailto:")
        ) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation?.();
          setShowNoticeModal(true);
          toast(
            "ይቅርታ! ይህ አገልግሎት በጊዜያዊ ጥገና ላይ ነው። በአሁኑ ሰዓት የክለብ አባልነት ምዝገባ ብቻ ክፍት ነው። እባክዎ ከታች ያለውን ፎርም ይጠቀሙ።",
            {
              id: "nav-maintenance-notice",
              icon: "🛠️",
              duration: 5000,
              style: {
                borderRadius: "12px",
                background: "#0f172a",
                color: "#f8fafc",
                fontSize: "13px",
                fontWeight: "500",
                border: "1px solid #334155",
              },
            }
          );
          return false;
        }
      }

      if (button) {
        const text = (button.innerText || button.textContent || "").toLowerCase().trim();
        if (
          text.includes("login") ||
          text.includes("admin panel") ||
          text.includes("staff directory")
        ) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation?.();
          setShowNoticeModal(true);
          toast(
            "ይቅርታ! ይህ አገልግሎት በጊዜያዊ ጥገና ላይ ነው። በአሁኑ ሰዓት የክለብ አባልነት ምዝገባ ብቻ ክፍት ነው።",
            {
              id: "btn-maintenance-notice",
              icon: "🔒",
              duration: 5000,
              style: {
                borderRadius: "12px",
                background: "#0f172a",
                color: "#f8fafc",
                fontSize: "13px",
                fontWeight: "500",
                border: "1px solid #334155",
              },
            }
          );
          return false;
        }
      }
    };

    document.addEventListener("click", handleNavIntercept, true);
    return () => document.removeEventListener("click", handleNavIntercept, true);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (status !== "idle") setStatus("idle");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus("idle");
    setErrorMessage("");

    // Comprehensive frontend validation
    if (
      !formData.fullName.trim() ||
      !formData.studentId.trim() ||
      !formData.department.trim() ||
      !formData.year ||
      !formData.phone.trim() ||
      !formData.clubName
    ) {
      setStatus("error");
      setErrorMessage(
        "እባክዎ ሁሉንም አስፈላጊ መረጃዎች (የጥናት ዓመት እና ክለብ ጨምሮ) በትክክል ይሙሉ (Please fill in all required fields)."
      );
      setLoading(false);
      return;
    }

    const payload = {
      fullName: formData.fullName.trim(),
      studentId: formData.studentId.trim().toUpperCase(),
      department: `${formData.department.trim()} [${formData.year}]`,
      year: formData.year,
      phone: formData.phone.trim(),
      clubName: formData.clubName,
      timestamp: new Date().toISOString(),
    };

    try {
      // POST with text/plain to prevent CORS preflight blocking on Google Apps Script
      const response = await fetch(SCRIPT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.status === "success") {
        setRegisteredClub(formData.clubName);
        setRegisteredName(formData.fullName.trim());
        setRegisteredYear(formData.year);
        setStatus("success");
      } else if (result.status === "duplicate") {
        setStatus("duplicate");
      } else {
        setStatus("error");
        setErrorMessage(
          result.message || "የኔትወርክ ችግር አለ፤ እባክዎ እንደገና ይሞክሩ።"
        );
      }
    } catch (err) {
      console.error("Submission network error:", err);
      setStatus("error");
      setErrorMessage("የኔትወርክ ችግር አለ፤ እባክዎ እንደገና ይሞክሩ።");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      fullName: "",
      studentId: "",
      department: "",
      year: "",
      phone: "",
      clubName: "",
    });
    setStatus("idle");
    setErrorMessage("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-blue-50/40 to-slate-100 text-slate-800 py-8 px-4 sm:px-6 lg:px-8">
      {/* 🛑 Navigation Intercept Modal */}
      {showNoticeModal && (
        <div
          id="maintenance-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setShowNoticeModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 text-left relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowNoticeModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-start gap-3.5">
              <div className="p-3 bg-amber-100 text-amber-700 rounded-xl shrink-0 mt-0.5">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                  ይቅርታ! ይህ አገልግሎት በጥገና ላይ ነው
                </h3>
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 mt-0.5">
                  Service Temporarily Under Maintenance
                </p>
                <div className="mt-3 text-xs sm:text-sm text-slate-600 space-y-2 leading-relaxed">
                  <p>
                    ዋናው የፖርታል ዳሽቦርድና ሌሎች አገልግሎቶች ለተወሰነ ጊዜ በጥገና ላይ ናቸው።
                  </p>
                  <p className="font-semibold text-blue-900 bg-blue-50 p-2.5 rounded-xl border border-blue-100">
                    ✨ በአሁኑ ሰዓት ለሁሉም ዓመት ተማሪዎች (ከፍሬሽማን እስከ 5ኛ ዓመት) የክለብ አባልነት ምዝገባ ብቻ ክፍት ነው። እባክዎ ከታች ያለውን ፎርም ይጠቀሙ!
                  </p>
                </div>

                <div className="mt-5 flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNoticeModal(false);
                      document
                        .getElementById("registration-form")
                        ?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-2.5 px-4 rounded-xl text-xs sm:text-sm shadow transition cursor-pointer"
                  >
                    ወደ ምዝገባው ቅጽ ሂድ (Go to Registration)
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNoticeModal(false)}
                    className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-medium transition cursor-pointer"
                  >
                    እሺ (Close)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto">
        {/* University Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold uppercase tracking-wider mb-3">
            <GraduationCap className="w-4 h-4" />
            Debre Berhan University • Student Union
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            የደብረ ብርሃን ዩኒቨርሲቲ የተማሪዎች ክለብ አባልነት ምዝገባ
          </h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1 font-medium">
            DBU All-Years Student Club Registration Portal (ከፍሬሽማን እስከ 5ኛ ዓመት)
          </p>
        </div>

        {/* 🛠️ Scheduled Maintenance Alert Banner */}
        <div className="bg-amber-50 border-l-4 border-amber-500 rounded-xl p-4 sm:p-5 shadow-sm mb-8">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 rounded-lg text-amber-700 shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-amber-900 flex items-center gap-2">
                🛠️ ስርዓቱ በጥገና ላይ ነው (Scheduled Maintenance)
              </h2>
              <p className="text-xs sm:text-sm text-amber-800 mt-1 leading-relaxed">
                ዋናው የፖርታል ዳሽቦርድ አገልግሎት ለተወሰነ ጊዜ በጥገና ላይ ነው። ነገር ግን ለሁሉም ዓመት ተማሪዎች (ከፍሬሽማን እስከ 5ኛ ዓመት) የክለብ አባልነት ምዝገባ ክፍት ስለሆነ ከታች ያለውን ፎርም ሞልተው ይመዝገቡ!
              </p>
              <div className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-md border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                የሁሉም ዓመት ተማሪዎች ምዝገባ ክፍት ነው (All-Years Registration Active)
              </div>
            </div>
          </div>
        </div>

        {/* Registration Card / Success State */}
        <div
          id="registration-form"
          className="bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden"
        >
          {status === "success" ? (
            /* 🎉 Success Card */
            <div id="success-card" className="p-6 sm:p-10 text-center">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10" />
              </div>
              <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full uppercase tracking-wider mb-2">
                ምዝገባው ተሳክቷል • Registration Confirmed
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
                ምዝገባዎ በተሳካ ሁኔታ ተጠናቋል!
              </h3>
              <p className="text-slate-600 text-sm sm:text-base max-w-md mx-auto mb-6">
                ውድ <strong>{registeredName}</strong>፣ ወደ <strong>{registeredClub}</strong> ያቀረቡት የምዝገባ ጥያቄ ተመዝግቧል። የክለቡ አመራሮች በቅርቡ ያነጋግሩዎታል።
              </p>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 max-w-sm mx-auto mb-6 text-left text-xs sm:text-sm space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">ተማሪ:</span>
                  <span className="font-semibold text-slate-800">{registeredName}</span>
                </div>
                {registeredYear && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">የጥናት ዓመት:</span>
                    <span className="font-semibold text-slate-800">{registeredYear}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">የተመረጠው ክለብ:</span>
                  <span className="font-semibold text-blue-700">{registeredClub}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ሁኔታ:</span>
                  <span className="inline-flex items-center text-emerald-700 font-medium">
                    ተመዝግቧል (Recorded)
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-xl transition shadow-md hover:shadow-lg text-sm cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                ሌላ ተማሪ መዝግብ (Register Another Student)
              </button>
            </div>
          ) : (
            /* 📝 Registration Form */
            <div className="p-6 sm:p-8">
              <div className="border-b border-slate-100 pb-4 mb-6">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  የክለብ አባልነት ማመልከቻ ፎርም (Club Application)
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  ለሁሉም ዓመት የደብረ ብርሃን ዩኒቨርሲቲ ተማሪዎች ክፍት ነው • Open to All DBU Students
                </p>
              </div>

              {/* Duplicate Submission Alert */}
              {status === "duplicate" && (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-3 text-amber-900 text-sm">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>ማሳሰቢያ (Notice):</strong> በዚህ ክለብ አስቀድመው ተመዝግበዋል! (You have already registered for this club with this Student ID).
                  </div>
                </div>
              )}

              {/* Error Alert */}
              {status === "error" && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-800 text-sm">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    {errorMessage || "የኔትወርክ ችግር አለ፤ እባክዎ እንደገና ይሞክሩ።"}
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                {/* Full Name */}
                <div>
                  <label
                    htmlFor="fullName"
                    className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1"
                  >
                    ሙሉ ስም (Full Name) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      id="fullName"
                      name="fullName"
                      required
                      value={formData.fullName}
                      onChange={handleChange}
                      placeholder="e.g. አበበ ከበደ / Abebe Kebede"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white outline-none transition"
                    />
                  </div>
                </div>

                {/* Student ID */}
                <div>
                  <label
                    htmlFor="studentId"
                    className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1"
                  >
                    የተማሪ መታወቂያ ቁጥር (Student ID) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <BookOpen className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      id="studentId"
                      name="studentId"
                      required
                      value={formData.studentId}
                      onChange={handleChange}
                      placeholder="DBU/..."
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white outline-none uppercase transition"
                    />
                  </div>
                </div>

                {/* Department / Stream */}
                <div>
                  <label
                    htmlFor="department"
                    className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1"
                  >
                    የትምህርት ክፍል / ዘርፍ (Department / Stream) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      id="department"
                      name="department"
                      required
                      value={formData.department}
                      onChange={handleChange}
                      placeholder="e.g. Computer Science, Medicine, Civil Eng, Natural Science..."
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white outline-none transition"
                    />
                  </div>
                </div>

                {/* Year of Study Dropdown */}
                <div>
                  <label
                    htmlFor="year"
                    className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1"
                  >
                    የጥናት ዓመት (Year of Study) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                    <select
                      id="year"
                      name="year"
                      required
                      value={formData.year}
                      onChange={handleChange}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white outline-none transition font-medium"
                    >
                      <option value="" disabled>
                        -- የጥናት ዓመት ይምረጡ (Select Year of Study) --
                      </option>
                      {STUDY_YEARS.map((yr) => (
                        <option key={yr} value={yr}>
                          {yr}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Phone Number */}
                <div>
                  <label
                    htmlFor="phone"
                    className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1"
                  >
                    ስልክ ቁጥር (Phone Number) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      required
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="09... / 07..."
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white outline-none transition"
                    />
                  </div>
                </div>

                {/* Club Selection Dropdown (DBU Clubs) */}
                <div>
                  <label
                    htmlFor="clubName"
                    className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1"
                  >
                    መቀላቀል የሚፈልጉት ክለብ (Select Club) <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="clubName"
                    name="clubName"
                    required
                    value={formData.clubName}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white outline-none transition font-medium"
                  >
                    <option value="" disabled>
                      -- ክለብ ይምረጡ (Select a Club) --
                    </option>
                    {DBU_CLUBS.map((club) => (
                      <option key={club} value={club}>
                        {club}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 mt-1">
                    ተማሪዎች ከአንድ በላይ ክለቦችን መርጠው በተናጠል መመዝገብ ይችላሉ።
                  </p>
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3 px-6 rounded-xl transition duration-200 shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed text-sm sm:text-base cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        በመመዝገብ ላይ... (Submitting...)
                      </>
                    ) : (
                      <>
                        ይመዝገቡ (Submit Registration)
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="mt-8 text-center text-xs text-slate-500 space-y-1">
          <p>© 2026 Debre Berhan University Student Union. All rights reserved.</p>
          <p>ደብረ ብርሃን ዩኒቨርሲቲ የተማሪዎች ህብረት • ተማሪዎችን ማብቃት ለላቀ ውጤት</p>
        </div>
      </div>
    </div>
  );
};

export default Home;
