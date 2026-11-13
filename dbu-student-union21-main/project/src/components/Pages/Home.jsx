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

// Verified Google Apps Script Webhook URL (Official DBU Deployment)
const VERIFIED_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzzaz6SauYQRNyiyTyqhlchUH0tghfx2qObh5yJ8GiLjRPVrVaiq-5CFddGbKxATh1_vg/exec";

// Resolve script URL and automatically sanitize any lowercase 'Ath1_vg' env typo to 'ATh1_vg'
const SCRIPT_URL = (() => {
  const envUrl =
    (typeof import.meta !== "undefined" &&
      import.meta.env &&
      (import.meta.env.VITE_GOOGLE_SCRIPT_URL ||
        import.meta.env.NEXT_PUBLIC_GOOGLE_SCRIPT_URL)) ||
    VERIFIED_SCRIPT_URL;
  return envUrl.replace("Ath1_vg", "ATh1_vg").trim();
})();

// The Authentic DBU Student Union Clubs (from DBU Portal Database)
const DBU_CLUBS = [
  "Rotaract Club of Debre Berhan",
  "Booking Club",
  "Career Development Club",
  "Charity Club",
  "Charity and Community Service Club",
  "Civil Engineering Club",
  "DBU Legal Practice and Advocacy Club",
  "Debate Society",
  "Finance Club",
  "Food Engineering Student Association club",
  "Hohe Tesfa Club",
  "Hult Prize Club",
  "Idea Hub",
  "Law Association Club",
  "Mechanical Club",
  "Tecktonic Club",
  "Technology and Innovation Club",
  "Truth Culture Club",
];

// Study Years for All DBU Students
const STUDY_YEARS = [
  "Freshman",
  "1st Year",
  "2nd Year",
  "3rd Year",
  "4th Year",
  "5th Year",
  "Postgraduate",
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
        "Notice: This service is under scheduled maintenance. Club Registration is actively open below.",
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
            "Notice: This service is under scheduled maintenance. Club Registration is actively open below.",
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
            "Notice: Portal login is temporarily offline during maintenance. Club registration is open below.",
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

    // Basic input trimming and normalization
    const cleanFullName = formData.fullName.trim();
    const cleanStudentId = formData.studentId.trim().toUpperCase();
    const cleanDepartment = formData.department.trim();
    const rawPhone = formData.phone.trim().replace(/[\s\-\(\)]/g, "");
    const cleanClubName = formData.clubName;

    // Comprehensive frontend validation
    if (
      !cleanFullName ||
      !cleanStudentId ||
      !cleanDepartment ||
      !formData.year ||
      !rawPhone ||
      !cleanClubName
    ) {
      setStatus("error");
      setErrorMessage(
        "Please fill in all required fields (including Year of Study and Club Selection)."
      );
      setLoading(false);
      return;
    }

    // Phone number format validation (Ethiopian numbers: 09..., 07..., or +251...)
    const ethiopianPhoneRegex = /^(?:\+251|0)?([79]\d{8})$/;
    const phoneMatch = rawPhone.match(ethiopianPhoneRegex);
    if (!phoneMatch) {
      setStatus("error");
      setErrorMessage(
        "Invalid phone number. Please enter a valid Ethiopian mobile number (e.g., 0912345678 or 0712345678)."
      );
      setLoading(false);
      return;
    }

    // Standardize phone to 10-digit local format: "09..." or "07..."
    const standardizedPhone = "0" + phoneMatch[1];

    // Client-side quick check: prevent registering for the EXACT SAME club twice on this device
    const registrationKey = `${cleanStudentId}::${cleanClubName}`;
    try {
      const existingRegistrations = JSON.parse(
        localStorage.getItem("dbu_registered_club_keys") || "[]"
      );

      if (existingRegistrations.includes(registrationKey)) {
        setStatus("duplicate");
        setErrorMessage(
          `Notice: You have already registered for ${cleanClubName} with Student ID ${cleanStudentId}.`
        );
        setLoading(false);
        return;
      }
    } catch {
      // LocalStorage access fallback (e.g. private browsing)
    }

    // Exact 5 payload keys matching Google Apps Script doPost(e) contract
    const payload = {
      fullName: cleanFullName,
      studentId: cleanStudentId,
      department: cleanDepartment,
      phone: standardizedPhone,
      clubName: cleanClubName,
    };

    try {
      const response = await fetch(SCRIPT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const result = await response.json();

      if (result.status === "success") {
        setRegisteredClub(formData.clubName);
        setRegisteredName(formData.fullName.trim());
        setRegisteredYear(formData.year);
        // Persist submitted Student ID + Club composite key locally
        try {
          const keys = JSON.parse(
            localStorage.getItem("dbu_registered_club_keys") || "[]"
          );
          if (!keys.includes(registrationKey)) keys.push(registrationKey);
          localStorage.setItem(
            "dbu_registered_club_keys",
            JSON.stringify(keys)
          );
        } catch {
          // ignore storage error
        }
        setStatus("success");
      } else if (result.status === "duplicate") {
        setStatus("duplicate");
        setErrorMessage(
          result.message ||
            `You are already registered for ${cleanClubName} with Student ID ${cleanStudentId}.`
        );
      } else {
        setStatus("error");
        setErrorMessage(
          result.message || "An error occurred while saving your registration. Please try again."
        );
      }
    } catch (err) {
      console.error("Submission failed:", err);
      setStatus("error");
      setErrorMessage(
        "Network issue: Unable to record registration in Google Sheet. Please check your connection and try again."
      );
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
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
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
                  Notice: Service Under Maintenance
                </h3>
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 mt-0.5">
                  Scheduled System Upgrade
                </p>
                <div className="mt-3 text-xs sm:text-sm text-slate-600 space-y-2 leading-relaxed">
                  <p>
                    The main portal dashboard and other services are temporarily offline for scheduled system upgrades.
                  </p>
                  <p className="font-semibold text-blue-900 bg-blue-50 p-2.5 rounded-xl border border-blue-100">
                    ✨ Student Club Registration is actively open for all academic years (Freshman to 5th Year). Please use the registration form below!
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
                    Go to Registration Form
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNoticeModal(false)}
                    className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-medium transition cursor-pointer"
                  >
                    Close
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
            Debre Berhan University Student Club Registration
          </h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1 font-medium">
            Official Registration Portal for All Academic Years (Freshman to 5th Year)
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
                🛠️ System Under Scheduled Maintenance
              </h2>
              <p className="text-xs sm:text-sm text-amber-800 mt-1 leading-relaxed">
                The main student union portal is undergoing scheduled maintenance. However, Student Club Registration is actively open for all students (Freshman to 5th Year). Please complete the form below to register for your club!
              </p>
              <div className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-md border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Club Registration Active for All Academic Years
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
                Registration Confirmed
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
                Your Registration Has Been Successfully Submitted!
              </h3>
              <p className="text-slate-600 text-sm sm:text-base max-w-md mx-auto mb-6">
                Dear <strong>{registeredName}</strong>, your membership application for <strong>{registeredClub}</strong> has been successfully recorded. Club leadership will contact you shortly.
              </p>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 max-w-sm mx-auto mb-6 text-left text-xs sm:text-sm space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Student Name:</span>
                  <span className="font-semibold text-slate-800">{registeredName}</span>
                </div>
                {registeredYear && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Year of Study:</span>
                    <span className="font-semibold text-slate-800">{registeredYear}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Selected Club:</span>
                  <span className="font-semibold text-blue-700">{registeredClub}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status:</span>
                  <span className="inline-flex items-center text-emerald-700 font-medium">
                    Recorded (Active)
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-xl transition shadow-md hover:shadow-lg text-sm cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Register Another Student
              </button>
            </div>
          ) : (
            /* 📝 Registration Form */
            <div className="p-6 sm:p-8">
              <div className="border-b border-slate-100 pb-4 mb-6">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Club Membership Application Form
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Open to All Debre Berhan University Students (Freshman – 5th Year)
                </p>
              </div>

              {/* Duplicate Submission Alert */}
              {status === "duplicate" && (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-3 text-amber-900 text-sm">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Already Registered:</strong>{" "}
                    {errorMessage ||
                      "You have already registered for this club with this Student ID. You may still apply to any other club!"}
                  </div>
                </div>
              )}

              {/* Error Alert */}
              {status === "error" && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-800 text-sm">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    {errorMessage || "Network issue encountered. Please try again."}
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
                    Full Name <span className="text-red-500">*</span>
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
                      placeholder="e.g. Abebe Kebede"
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
                    Student ID <span className="text-red-500">*</span>
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
                    Department / Field of Study <span className="text-red-500">*</span>
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
                    Year of Study <span className="text-red-500">*</span>
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
                        -- Select Year of Study --
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
                    Phone Number <span className="text-red-500">*</span>
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
                    Select Club to Join <span className="text-red-500">*</span>
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
                      -- Select a Club --
                    </option>
                    {DBU_CLUBS.map((club) => (
                      <option key={club} value={club}>
                        {club}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 mt-1">
                    Students may register for multiple clubs by submitting separate applications.
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
                        Submitting Application...
                      </>
                    ) : (
                      <>
                        Submit Club Registration
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
          <p>Debre Berhan University Student Union • Empowering Students for Excellence</p>
        </div>
      </div>
    </div>
  );
};

export default Home;
