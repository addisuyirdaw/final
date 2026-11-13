/**
 * DBU Student Union - Clean Minimal Student Club Registration Page
 *
 * Connected directly to Google Sheets via Apps Script Webhook.
 * Allows multi-club registration per student with server-side per-club duplicate check.
 *
 * @format
 */

import React, { useState, useEffect } from "react";
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
  Calendar,
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

  // Smooth scroll to registration form when clicking any inactive navbar links
  useEffect(() => {
    const handleNavClick = (e) => {
      if (
        e.target.closest("#registration-form") ||
        e.target.closest("#success-card")
      ) {
        return;
      }

      const anchor = e.target.closest("a, [role='link']");
      const button = e.target.closest("button");

      if (anchor) {
        const href =
          anchor.getAttribute("href") || anchor.getAttribute("to") || "";
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
          document
            .getElementById("registration-form")
            ?.scrollIntoView({ behavior: "smooth" });
          return false;
        }
      }

      if (button) {
        const text = (button.innerText || button.textContent || "")
          .toLowerCase()
          .trim();
        if (
          text.includes("login") ||
          text.includes("admin panel") ||
          text.includes("staff directory")
        ) {
          e.preventDefault();
          e.stopPropagation();
          document
            .getElementById("registration-form")
            ?.scrollIntoView({ behavior: "smooth" });
          return false;
        }
      }
    };

    document.addEventListener("click", handleNavClick, true);
    return () => document.removeEventListener("click", handleNavClick, true);
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

    const cleanFullName = formData.fullName.trim();
    const cleanStudentId = formData.studentId.trim().toUpperCase();
    const cleanDepartment = formData.department.trim();
    const rawPhone = formData.phone.trim().replace(/[\s\-\(\)]/g, "");
    const cleanClubName = formData.clubName;

    // Validation
    if (
      !cleanFullName ||
      !cleanStudentId ||
      !cleanDepartment ||
      !formData.year ||
      !rawPhone ||
      !cleanClubName
    ) {
      setStatus("error");
      setErrorMessage("Please fill in all required fields.");
      setLoading(false);
      return;
    }

    // Ethiopian Phone validation
    const ethiopianPhoneRegex = /^(?:\+251|0)?([79]\d{8})$/;
    const phoneMatch = rawPhone.match(ethiopianPhoneRegex);
    if (!phoneMatch) {
      setStatus("error");
      setErrorMessage(
        "Please enter a valid Ethiopian phone number (e.g., 0912345678 or 0712345678)."
      );
      setLoading(false);
      return;
    }

    const standardizedPhone = "0" + phoneMatch[1];

    // Payload strictly matching Google Apps Script doPost(e) contract
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
        setRegisteredClub(cleanClubName);
        setRegisteredName(cleanFullName);
        setRegisteredYear(formData.year);
        setStatus("success");
      } else if (result.status === "duplicate") {
        setStatus("duplicate");
        setErrorMessage(
          result.message || `You are already registered for ${cleanClubName}!`
        );
      } else {
        setStatus("error");
        setErrorMessage(
          result.message || "An error occurred while saving your registration."
        );
      }
    } catch (err) {
      console.error("Submission error:", err);
      setStatus("error");
      setErrorMessage(
        "Network issue: Unable to save registration. Please check your connection and try again."
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
    <div className="min-h-screen bg-slate-50 text-slate-800 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Minimal University Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold uppercase tracking-wider mb-2">
            <GraduationCap className="w-4 h-4" />
            Debre Berhan University • Student Union
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Student Club Registration
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Open to All Academic Years (Freshman to 5th Year Students)
          </p>
        </div>

        {/* Clean Maintenance Info Note */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 mb-6 text-xs sm:text-sm text-amber-900 flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            Portal dashboard is under scheduled maintenance. <strong>Club Registration is active below.</strong>
          </span>
        </div>

        {/* Form Container */}
        <div
          id="registration-form"
          className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden"
        >
          {status === "success" ? (
            /* Confirmation Screen */
            <div id="success-card" className="p-6 sm:p-8 text-center">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-8 h-8" />
              </div>
              <span className="inline-block px-3 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full uppercase tracking-wider mb-2">
                Registration Confirmed
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
                Registration Submitted Successfully!
              </h2>
              <p className="text-slate-600 text-sm max-w-md mx-auto mb-6">
                Dear <strong>{registeredName}</strong>, your application to join <strong>{registeredClub}</strong> has been recorded.
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
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-xl transition shadow text-sm cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Register for Another Club
              </button>
            </div>
          ) : (
            /* Registration Form */
            <div className="p-6 sm:p-7">
              <div className="border-b border-slate-100 pb-3 mb-5">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  Club Membership Form
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Students may register for multiple clubs by submitting separate applications.
                </p>
              </div>

              {/* Duplicate Submission Alert */}
              {status === "duplicate" && (
                <div className="mb-5 p-3.5 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-2.5 text-amber-900 text-xs sm:text-sm">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Already Registered:</strong>{" "}
                    {errorMessage || "You have already registered for this club with this Student ID. You may choose any other club!"}
                  </div>
                </div>
              )}

              {/* Error Alert */}
              {status === "error" && (
                <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-red-800 text-xs sm:text-sm">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    {errorMessage || "Network error. Please try again."}
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Full Name */}
                <div>
                  <label
                    htmlFor="fullName"
                    className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1"
                  >
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      id="fullName"
                      name="fullName"
                      required
                      value={formData.fullName}
                      onChange={handleChange}
                      placeholder="e.g. Abebe Kebede"
                      className="w-full pl-10 pr-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white outline-none transition"
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
                    <BookOpen className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      id="studentId"
                      name="studentId"
                      required
                      value={formData.studentId}
                      onChange={handleChange}
                      placeholder="DBU/..."
                      className="w-full pl-10 pr-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white outline-none uppercase transition"
                    />
                  </div>
                </div>

                {/* Department */}
                <div>
                  <label
                    htmlFor="department"
                    className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1"
                  >
                    Department / Field of Study <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      id="department"
                      name="department"
                      required
                      value={formData.department}
                      onChange={handleChange}
                      placeholder="e.g. Computer Science, Medicine, Civil Eng..."
                      className="w-full pl-10 pr-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white outline-none transition"
                    />
                  </div>
                </div>

                {/* Year of Study */}
                <div>
                  <label
                    htmlFor="year"
                    className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1"
                  >
                    Year of Study <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                    <select
                      id="year"
                      name="year"
                      required
                      value={formData.year}
                      onChange={handleChange}
                      className="w-full pl-10 pr-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white outline-none transition font-medium"
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
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      required
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="09... / 07..."
                      className="w-full pl-10 pr-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white outline-none transition"
                    />
                  </div>
                </div>

                {/* Select Club */}
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
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white outline-none transition font-medium"
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
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl transition duration-150 shadow disabled:opacity-60 disabled:cursor-not-allowed text-sm sm:text-base cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
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

        {/* Minimal Footer */}
        <div className="mt-6 text-center text-xs text-slate-500">
          © 2026 Debre Berhan University Student Union
        </div>
      </div>
    </div>
  );
};

export default Home;
