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
  Mail,
} from "lucide-react";

// Google Apps Script Webhook URL (Dashin Beer & DBU Club Registration)
const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxG4BseqySnV7RXP7V4Db_HAX7h7S21tHTu7MoE9Zn2wc2vqTzKY8BpeBt56mAvjnhf1w/exec";

// The Authentic DBU Student Union Clubs
const DBU_CLUBS = [
  "Rotaract Club of Debre Berhan",
  "Booking Club",
  "Career Development Club",
  "Charity Club",
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
  "Truth Culture Club",
];

// Study Years specified for DBU Students
const STUDY_YEARS = [
  "Freshman",
  "2nd Year",
  "3rd Year",
  "4th Year",
  "Graduating Class",
];

export const MaintenanceHome = () => {
  const [formData, setFormData] = useState({
    fullName: "",
    studentId: "",
    department: "",
    yearOfStudy: "",
    phone: "",
    clubName: "",
    email: "",
  });

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("idle"); // "idle" | "success" | "error"
  const [registeredClub, setRegisteredClub] = useState("");
  const [registeredName, setRegisteredName] = useState("");
  const [registeredYear, setRegisteredYear] = useState("");
  const [registeredEmail, setRegisteredEmail] = useState("");
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
    const cleanYearOfStudy = formData.yearOfStudy.trim();
    const rawPhone = formData.phone.trim().replace(/[\s\-\(\)]/g, "");
    const cleanClubName = formData.clubName.trim();
    const cleanEmail = formData.email.trim();

    // Required fields validation
    if (
      !cleanFullName ||
      !cleanStudentId ||
      !cleanDepartment ||
      !cleanYearOfStudy ||
      !rawPhone ||
      !cleanClubName ||
      !cleanEmail
    ) {
      setStatus("error");
      setErrorMessage("Please fill in all required fields.");
      setLoading(false);
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setStatus("error");
      setErrorMessage("Please enter a valid email address (e.g., name@gmail.com).");
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

    // Payload matching Google Apps Script requirements exactly
    const payload = {
      fullName: cleanFullName,
      studentId: cleanStudentId,
      department: cleanDepartment,
      yearOfStudy: cleanYearOfStudy,
      phone: standardizedPhone,
      clubName: cleanClubName,
      email: cleanEmail,
    };

    try {
      await fetch(SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify(payload),
      });

      // Save info for confirmation view
      setRegisteredClub(cleanClubName);
      setRegisteredName(cleanFullName);
      setRegisteredYear(cleanYearOfStudy);
      setRegisteredEmail(cleanEmail);

      // Clear all fields as requested
      setFormData({
        fullName: "",
        studentId: "",
        department: "",
        yearOfStudy: "",
        phone: "",
        clubName: "",
        email: "",
      });

      setStatus("success");
    } catch (err) {
      console.error("Submission error:", err);
      setStatus("error");
      setErrorMessage(
        "Network error. Please check your connection and try again."
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
      yearOfStudy: "",
      phone: "",
      clubName: "",
      email: "",
    });
    setStatus("idle");
    setErrorMessage("");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Minimal University Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold uppercase tracking-wider mb-2">
            <GraduationCap className="w-4 h-4" />
            CampusNexus • DBU Student Union
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            CampusNexus Club Registration
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Debre Berhan University • Open to All Academic Years
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
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8" />
              </div>

              {/* Success Message */}
              <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 sm:p-5 mb-6 text-emerald-900 font-semibold text-sm sm:text-base leading-relaxed shadow-sm text-center">
                ✅ Your club registration has been successfully submitted! The list of students selected for the Dashen Brewery tour will be announced via email once registration closes.
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 max-w-sm mx-auto mb-6 text-left text-xs sm:text-sm space-y-2">
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
                {registeredEmail && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Email:</span>
                    <span className="font-semibold text-slate-800">{registeredEmail}</span>
                  </div>
                )}
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
                    htmlFor="yearOfStudy"
                    className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1"
                  >
                    Year of Study <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                    <select
                      id="yearOfStudy"
                      name="yearOfStudy"
                      required
                      value={formData.yearOfStudy}
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

                {/* Email Address */}
                <div>
                  <label
                    htmlFor="email"
                    className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1"
                  >
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="e.g. name@gmail.com"
                      className="w-full pl-10 pr-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white outline-none transition"
                    />
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

export default MaintenanceHome;
