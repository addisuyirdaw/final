/**
 * DBU Student Union - Temporary Freshman Club Registration & Scheduled Maintenance Page
 *
 * Connected directly to Google Sheets via Apps Script Webhook.
 * Bypasses Render backend to ensure 100% uptime for freshman registration.
 *
 * @format
 */

import React, { useState } from "react";
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

export const Home = () => {
  const [formData, setFormData] = useState({
    fullName: "",
    studentId: "",
    department: "",
    phone: "",
    clubName: "",
  });

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("idle"); // "idle" | "success" | "duplicate" | "error"
  const [registeredClub, setRegisteredClub] = useState("");
  const [registeredName, setRegisteredName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

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

    // Basic frontend validation
    if (
      !formData.fullName.trim() ||
      !formData.studentId.trim() ||
      !formData.department.trim() ||
      !formData.phone.trim() ||
      !formData.clubName
    ) {
      setStatus("error");
      setErrorMessage("እባክዎ ሁሉንም አስፈላጊ መረጃዎች በትክክል ይሙሉ (Please fill in all required fields).");
      setLoading(false);
      return;
    }

    const payload = {
      fullName: formData.fullName.trim(),
      studentId: formData.studentId.trim().toUpperCase(),
      department: formData.department.trim(),
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
      // Fallback: If Google Apps Script redirects with an opaque response (common with CORS),
      // we still treat a 200 response or verify error
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
      phone: "",
      clubName: "",
    });
    setStatus("idle");
    setErrorMessage("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-blue-50/40 to-slate-100 text-slate-800 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* University Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold uppercase tracking-wider mb-3">
            <GraduationCap className="w-4 h-4" />
            Debre Berhan University • Student Union
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            የፍሬሽማን ተማሪዎች የክለብ ምዝገባ
          </h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">
            2026/2027 Freshman Student Clubs Registration Portal
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
                🛠️ ስርዓቱ በዝግጅት ላይ ነው (Scheduled Maintenance)
              </h2>
              <p className="text-xs sm:text-sm text-amber-800 mt-1 leading-relaxed">
                ዋናው የፖርታል አገልግሎት ለተወሰነ ጊዜ በጥገና ላይ ነው። ነገር ግን የፍሬሽማን ተማሪዎች የክለብ ምዝገባ ክፍት ስለሆነ ከታች ያለውን ፎርም ሞልተው ይመዝገቡ!
              </p>
              <div className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-100/70 px-2.5 py-1 rounded-md">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                የምዝገባ አገልግሎት ያለማቋረጥ ይሰራል (Live Registration Active)
              </div>
            </div>
          </div>
        </div>

        {/* Registration Card / Success State */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden">
          {status === "success" ? (
            /* 🎉 Success Card */
            <div className="p-6 sm:p-10 text-center">
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
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-xl transition shadow-md hover:shadow-lg text-sm"
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
                  እባክዎ ትክክለኛ መረጃዎችን በመጠቀም ቅጹን ይሙሉ
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
                      placeholder="Freshman Natural / Social"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white outline-none transition"
                    />
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
                      placeholder="09..."
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
