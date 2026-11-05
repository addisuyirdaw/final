import React, { useState } from "react";
import { 
  X, 
  Send, 
  CheckCircle, 
  AlertCircle, 
  HelpCircle, 
  Heart, 
  Clock, 
  Briefcase, 
  Phone, 
  Mail, 
  Send as TelegramIcon, 
  MapPin, 
  Award,
  Sparkles,
  User,
  ExternalLink
} from "lucide-react";

export const ROTARACT_INTEREST_AREAS = [
  "Community service",
  "Media and Public Relations",
  "Event planning and coordination",
  "Fundraising membership and engagement",
  "Professional development",
  "Project management",
  "Other"
];

export const ROTARACT_TIME_COMMITMENTS = [
  "1–2 hours per week",
  "3–4 hours per week",
  "5 or more hours per week",
  "My availability varies"
];

export const ROTARACT_MEETING_OPTIONS = [
  "Yes",
  "No",
  "May be"
];

/**
 * 19-Question Rotaract Membership Recruitment Form Modal
 */
export function RotaractRecruitmentModal({
  isOpen,
  onClose,
  onSubmit,
  user,
  clubName = "Rotaract Club of Debre Berhan",
  submitting = false
}) {
  const [formData, setFormData] = useState({
    fullName: user?.name || "",
    studentId: user?.username || "",
    gender: "",
    age: "",
    phone: user?.phoneNumber || user?.phone || "",
    email: user?.email || "",
    telegram: user?.telegram || "",
    institution: "Debre Berhan University",
    department: user?.department || "",
    year: user?.year || "",
    knowledge: "",
    motivation: "",
    expectations: "",
    volunteerExperience: "No",
    volunteerDetails: "",
    interestedAreas: [],
    otherInterestedArea: "",
    contribution: "",
    willingToParticipate: "Yes",
    timeCommitment: "1–2 hours per week",
    additionalInfo: ""
  });

  const [errors, setErrors] = useState({});

  if (!isOpen) return null;

  const handleCheckboxToggle = (area) => {
    setFormData((prev) => {
      const exists = prev.interestedAreas.includes(area);
      const nextAreas = exists
        ? prev.interestedAreas.filter((a) => a !== area)
        : [...prev.interestedAreas, area];
      return { ...prev, interestedAreas: nextAreas };
    });
  };

  const validate = () => {
    const errs = {};
    if (!formData.fullName.trim()) errs.fullName = "Full name is required";
    if (!formData.studentId.trim()) errs.studentId = "Student ID number is required";
    if (!formData.gender) errs.gender = "Please select your gender";
    if (!formData.age || isNaN(formData.age) || Number(formData.age) <= 0) {
      errs.age = "Please provide a valid age";
    }
    if (!formData.phone.trim()) errs.phone = "Phone number is required";
    if (!formData.email.trim() || !formData.email.includes("@")) {
      errs.email = "Valid email address is required";
    }
    if (!formData.telegram.trim()) errs.telegram = "Telegram username is required";
    if (!formData.institution.trim()) errs.institution = "University / Institution is required";
    if (!formData.department.trim()) errs.department = "Department is required";
    if (!formData.year.trim()) errs.year = "Year of study is required";
    if (!formData.knowledge.trim()) {
      errs.knowledge = "Please share what you know about Rotaract club";
    }
    if (!formData.motivation.trim()) {
      errs.motivation = "Please state why you want to join the Rotaract club";
    }
    if (!formData.expectations.trim()) {
      errs.expectations = "Please describe what you hope to gain";
    }
    if (formData.volunteerExperience === "Yes" && !formData.volunteerDetails.trim()) {
      errs.volunteerDetails = "Please briefly describe your volunteer experience";
    }
    if (!formData.interestedAreas.length) {
      errs.interestedAreas = "Please select at least one area of interest";
    }
    if (formData.interestedAreas.includes("Other") && !formData.otherInterestedArea.trim()) {
      errs.otherInterestedArea = "Please specify your other area of interest";
    }
    if (!formData.contribution.trim()) {
      errs.contribution = "Please explain how you can contribute";
    }
    if (!formData.willingToParticipate) {
      errs.willingToParticipate = "Please select your meeting participation willingness";
    }
    if (!formData.timeCommitment) {
      errs.timeCommitment = "Please select your time commitment";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) {
      // Find first error and scroll up if needed
      return;
    }

    const compiledAreas = formData.interestedAreas.map((area) =>
      area === "Other" && formData.otherInterestedArea.trim()
        ? `Other: ${formData.otherInterestedArea.trim()}`
        : area
    );

    const payload = {
      ...formData,
      interestedAreas: compiledAreas
    };

    onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-rose-100">
        {/* Header Banner */}
        <div className="relative bg-gradient-to-r from-rose-900 via-rose-800 to-indigo-900 text-white p-6 sm:p-8 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/20 hover:bg-black/40 rounded-full p-2 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/30 text-rose-200 text-xs font-semibold mb-3 border border-rose-400/30">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            Official Recruitment Questionnaire
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase">
            ROTARACT CLUB OF DEBRE BERHAN — MEMBERSHIP RECRUITMENT FORM
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-rose-100/90 leading-relaxed max-w-2xl">
            We are excited to invite passionate, committed, and service-minded individuals to become members of our Rotaract Club. This is an opportunity to develop your leadership skills, serve the community, build meaningful connections, and create a lasting impact. Join us and be part of the team that will shape the future of this club.
          </p>
          <div className="mt-3 text-xs text-rose-200 flex items-center gap-1 font-medium">
            <span className="text-rose-400 font-bold">*</span> Indicates required question
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6 bg-slate-50/50">
          {Object.keys(errors).length > 0 && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-800 text-sm">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Please complete all required fields:</p>
                <p className="text-xs text-rose-700 mt-0.5">
                  Check highlighted questions below before submitting your recruitment application.
                </p>
              </div>
            </div>
          )}

          {/* Section 1: Personal & Contact Information */}
          <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-xs space-y-5">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 text-base">
                <User className="w-4 h-4 text-rose-600" />
                Part 1: Personal & Academic Details
              </h3>
              <span className="text-xs font-medium text-slate-400">Questions 1 – 9</span>
            </div>

            {/* Q1. Full name */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                1. Full name <span className="text-rose-600 font-bold">*</span>
              </label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="Enter your full name"
                className={`w-full px-4 py-2.5 rounded-lg border text-sm transition focus:ring-2 focus:outline-none ${
                  errors.fullName ? "border-rose-400 focus:ring-rose-200 bg-rose-50/30" : "border-slate-300 focus:border-rose-600 focus:ring-rose-100"
                }`}
              />
              {errors.fullName && <p className="text-xs text-rose-600 mt-1">{errors.fullName}</p>}
            </div>

            {/* Student ID Number */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Student ID Number <span className="text-rose-600 font-bold">*</span>
                <span className="text-xs text-slate-400 font-normal ml-1.5">(e.g. DBU/1234/14 or dbu10101030)</span>
              </label>
              <input
                type="text"
                value={formData.studentId}
                onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                placeholder="Enter your DBU student ID"
                className={`w-full px-4 py-2.5 rounded-lg border text-sm transition focus:ring-2 focus:outline-none ${
                  errors.studentId ? "border-rose-400 focus:ring-rose-200 bg-rose-50/30" : "border-slate-300 focus:border-rose-600 focus:ring-rose-100"
                }`}
              />
              {errors.studentId && <p className="text-xs text-rose-600 mt-1">{errors.studentId}</p>}
            </div>

            {/* Q2. Gender */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                2. Gender <span className="text-rose-600 font-bold">*</span>
              </label>
              <div className="flex gap-6">
                {["Female", "Male"].map((option) => (
                  <label key={option} className="flex items-center gap-2.5 cursor-pointer text-sm font-medium text-slate-700 hover:text-slate-900">
                    <input
                      type="radio"
                      name="gender"
                      value={option}
                      checked={formData.gender === option}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-4 h-4 text-rose-600 focus:ring-rose-500 border-slate-300"
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
              {errors.gender && <p className="text-xs text-rose-600 mt-1">{errors.gender}</p>}
            </div>

            {/* Q3. Age */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                3. Age <span className="text-rose-600 font-bold">*</span>
              </label>
              <input
                type="number"
                min="16"
                max="99"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                placeholder="e.g. 21"
                className={`w-full sm:w-1/3 px-4 py-2.5 rounded-lg border text-sm transition focus:ring-2 focus:outline-none ${
                  errors.age ? "border-rose-400 focus:ring-rose-200 bg-rose-50/30" : "border-slate-300 focus:border-rose-600 focus:ring-rose-100"
                }`}
              />
              {errors.age && <p className="text-xs text-rose-600 mt-1">{errors.age}</p>}
            </div>

            {/* Q4 & Q5. Phone and Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  4. Phone number <span className="text-rose-600 font-bold">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="09... / +251..."
                    className={`w-full pl-9 pr-4 py-2.5 rounded-lg border text-sm transition focus:ring-2 focus:outline-none ${
                      errors.phone ? "border-rose-400 focus:ring-rose-200 bg-rose-50/30" : "border-slate-300 focus:border-rose-600 focus:ring-rose-100"
                    }`}
                  />
                </div>
                {errors.phone && <p className="text-xs text-rose-600 mt-1">{errors.phone}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  5. Email address <span className="text-rose-600 font-bold">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="name@gmail.com"
                    className={`w-full pl-9 pr-4 py-2.5 rounded-lg border text-sm transition focus:ring-2 focus:outline-none ${
                      errors.email ? "border-rose-400 focus:ring-rose-200 bg-rose-50/30" : "border-slate-300 focus:border-rose-600 focus:ring-rose-100"
                    }`}
                  />
                </div>
                {errors.email && <p className="text-xs text-rose-600 mt-1">{errors.email}</p>}
              </div>
            </div>

            {/* Q6 & Q7. Telegram & Institution */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  6. Telegram username <span className="text-rose-600 font-bold">*</span>
                </label>
                <div className="relative">
                  <span className="text-slate-400 font-bold absolute left-3 top-2.5 text-sm">@</span>
                  <input
                    type="text"
                    value={formData.telegram.replace(/^@/, "")}
                    onChange={(e) => setFormData({ ...formData, telegram: `@${e.target.value.replace(/^@/, "")}` })}
                    placeholder="username"
                    className={`w-full pl-8 pr-4 py-2.5 rounded-lg border text-sm transition focus:ring-2 focus:outline-none ${
                      errors.telegram ? "border-rose-400 focus:ring-rose-200 bg-rose-50/30" : "border-slate-300 focus:border-rose-600 focus:ring-rose-100"
                    }`}
                  />
                </div>
                {errors.telegram && <p className="text-xs text-rose-600 mt-1">{errors.telegram}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  7. University/ Institution/ location <span className="text-rose-600 font-bold">*</span>
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={formData.institution}
                    onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                    placeholder="Debre Berhan University"
                    className={`w-full pl-9 pr-4 py-2.5 rounded-lg border text-sm transition focus:ring-2 focus:outline-none ${
                      errors.institution ? "border-rose-400 focus:ring-rose-200 bg-rose-50/30" : "border-slate-300 focus:border-rose-600 focus:ring-rose-100"
                    }`}
                  />
                </div>
                {errors.institution && <p className="text-xs text-rose-600 mt-1">{errors.institution}</p>}
              </div>
            </div>

            {/* Q8 & Q9. Department & Year */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  8. Department/ Field of study <span className="text-rose-600 font-bold">*</span>
                </label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="e.g. Software Engineering"
                  className={`w-full px-4 py-2.5 rounded-lg border text-sm transition focus:ring-2 focus:outline-none ${
                    errors.department ? "border-rose-400 focus:ring-rose-200 bg-rose-50/30" : "border-slate-300 focus:border-rose-600 focus:ring-rose-100"
                  }`}
                />
                {errors.department && <p className="text-xs text-rose-600 mt-1">{errors.department}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  9. Year of study <span className="text-rose-600 font-bold">*</span>
                </label>
                <input
                  type="text"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  placeholder="e.g. 3rd Year"
                  className={`w-full px-4 py-2.5 rounded-lg border text-sm transition focus:ring-2 focus:outline-none ${
                    errors.year ? "border-rose-400 focus:ring-rose-200 bg-rose-50/30" : "border-slate-300 focus:border-rose-600 focus:ring-rose-100"
                  }`}
                />
                {errors.year && <p className="text-xs text-rose-600 mt-1">{errors.year}</p>}
              </div>
            </div>
          </div>

          {/* Section 2: Rotaract Understanding & Motivation */}
          <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-xs space-y-5">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 text-base">
                <Sparkles className="w-4 h-4 text-rose-600" />
                Part 2: Motivation & Understanding
              </h3>
              <span className="text-xs font-medium text-slate-400">Questions 10 – 12</span>
            </div>

            {/* Q10. What do you know about Rotaract club? */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                10. What do you know about Rotaract club? <span className="text-rose-600 font-bold">*</span>
              </label>
              <textarea
                rows="3"
                value={formData.knowledge}
                onChange={(e) => setFormData({ ...formData, knowledge: e.target.value })}
                placeholder="Share what you know about the mission, goals, or activities of Rotaract..."
                className={`w-full px-4 py-2.5 rounded-lg border text-sm transition focus:ring-2 focus:outline-none ${
                  errors.knowledge ? "border-rose-400 focus:ring-rose-200 bg-rose-50/30" : "border-slate-300 focus:border-rose-600 focus:ring-rose-100"
                }`}
              />
              {errors.knowledge && <p className="text-xs text-rose-600 mt-1">{errors.knowledge}</p>}
            </div>

            {/* Q11. Why do you want to join the Rotaract club ? */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                11. Why do you want to join the Rotaract club ? <span className="text-rose-600 font-bold">*</span>
              </label>
              <textarea
                rows="3"
                value={formData.motivation}
                onChange={(e) => setFormData({ ...formData, motivation: e.target.value })}
                placeholder="What inspired you to join this club? What values resonate with you?..."
                className={`w-full px-4 py-2.5 rounded-lg border text-sm transition focus:ring-2 focus:outline-none ${
                  errors.motivation ? "border-rose-400 focus:ring-rose-200 bg-rose-50/30" : "border-slate-300 focus:border-rose-600 focus:ring-rose-100"
                }`}
              />
              {errors.motivation && <p className="text-xs text-rose-600 mt-1">{errors.motivation}</p>}
            </div>

            {/* Q12. What do hope to gain from being a Rotaract club member? */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                12. What do hope to gain from being a Rotaract club member? <span className="text-rose-600 font-bold">*</span>
              </label>
              <textarea
                rows="3"
                value={formData.expectations}
                onChange={(e) => setFormData({ ...formData, expectations: e.target.value })}
                placeholder="e.g. Leadership development, networking, community service, teamwork..."
                className={`w-full px-4 py-2.5 rounded-lg border text-sm transition focus:ring-2 focus:outline-none ${
                  errors.expectations ? "border-rose-400 focus:ring-rose-200 bg-rose-50/30" : "border-slate-300 focus:border-rose-600 focus:ring-rose-100"
                }`}
              />
              {errors.expectations && <p className="text-xs text-rose-600 mt-1">{errors.expectations}</p>}
            </div>
          </div>

          {/* Section 3: Community Service Experience */}
          <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-xs space-y-5">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 text-base">
                <Heart className="w-4 h-4 text-rose-600" />
                Part 3: Volunteer & Service Experience
              </h3>
              <span className="text-xs font-medium text-slate-400">Questions 13 – 14</span>
            </div>

            {/* Q13. Have you participated in community service or volunteer activities before? */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                13. Have you participated in community service or volunteer activities before? <span className="text-rose-600 font-bold">*</span>
              </label>
              <div className="flex gap-6">
                {["Yes", "No"].map((option) => (
                  <label key={option} className="flex items-center gap-2.5 cursor-pointer text-sm font-medium text-slate-700 hover:text-slate-900">
                    <input
                      type="radio"
                      name="volunteerExperience"
                      value={option}
                      checked={formData.volunteerExperience === option}
                      onChange={(e) => setFormData({ ...formData, volunteerExperience: e.target.value })}
                      className="w-4 h-4 text-rose-600 focus:ring-rose-500 border-slate-300"
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Q14. If yes, briefly describe your experience. */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                14. If yes, briefly describe your experience. {formData.volunteerExperience === "Yes" && <span className="text-rose-600 font-bold">*</span>}
              </label>
              <textarea
                rows="3"
                value={formData.volunteerDetails}
                onChange={(e) => setFormData({ ...formData, volunteerDetails: e.target.value })}
                placeholder={formData.volunteerExperience === "Yes" ? "Describe your past volunteering, initiatives, or community work..." : "N/A or none"}
                className={`w-full px-4 py-2.5 rounded-lg border text-sm transition focus:ring-2 focus:outline-none ${
                  errors.volunteerDetails ? "border-rose-400 focus:ring-rose-200 bg-rose-50/30" : "border-slate-300 focus:border-rose-600 focus:ring-rose-100"
                }`}
              />
              {errors.volunteerDetails && <p className="text-xs text-rose-600 mt-1">{errors.volunteerDetails}</p>}
            </div>
          </div>

          {/* Section 4: Areas of Interest & Contribution */}
          <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-xs space-y-5">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 text-base">
                <Briefcase className="w-4 h-4 text-rose-600" />
                Part 4: Interests & Proposed Contribution
              </h3>
              <span className="text-xs font-medium text-slate-400">Questions 15 – 16</span>
            </div>

            {/* Q15. Which areas are you interested in? */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                15. Which areas are you interested in? <span className="text-rose-600 font-bold">*</span>
                <span className="block text-xs font-normal text-slate-500 mt-0.5">Select all areas you are passionate about contributing to:</span>
              </label>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {ROTARACT_INTEREST_AREAS.map((area) => {
                  const isChecked = formData.interestedAreas.includes(area);
                  return (
                    <label
                      key={area}
                      className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs sm:text-sm font-medium cursor-pointer transition ${
                        isChecked
                          ? "bg-rose-50 border-rose-300 text-rose-900"
                          : "bg-slate-50/60 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleCheckboxToggle(area)}
                        className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500 mt-0.5"
                      />
                      <span>{area}</span>
                    </label>
                  );
                })}
              </div>

              {formData.interestedAreas.includes("Other") && (
                <div className="mt-3">
                  <input
                    type="text"
                    value={formData.otherInterestedArea}
                    onChange={(e) => setFormData({ ...formData, otherInterestedArea: e.target.value })}
                    placeholder="Please specify other area..."
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm focus:border-rose-600 focus:ring-rose-100"
                  />
                  {errors.otherInterestedArea && (
                    <p className="text-xs text-rose-600 mt-1">{errors.otherInterestedArea}</p>
                  )}
                </div>
              )}

              {errors.interestedAreas && (
                <p className="text-xs text-rose-600 mt-2 font-medium">{errors.interestedAreas}</p>
              )}
            </div>

            {/* Q16. How do you think you can contribute to the growth and success of our Rotaract club as a member? */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                16. How do you think you can contribute to the growth and success of our Rotaract club as a member? <span className="text-rose-600 font-bold">*</span>
              </label>
              <textarea
                rows="3"
                value={formData.contribution}
                onChange={(e) => setFormData({ ...formData, contribution: e.target.value })}
                placeholder="Mention your unique skills, ideas, enthusiasm, leadership, or initiatives..."
                className={`w-full px-4 py-2.5 rounded-lg border text-sm transition focus:ring-2 focus:outline-none ${
                  errors.contribution ? "border-rose-400 focus:ring-rose-200 bg-rose-50/30" : "border-slate-300 focus:border-rose-600 focus:ring-rose-100"
                }`}
              />
              {errors.contribution && <p className="text-xs text-rose-600 mt-1">{errors.contribution}</p>}
            </div>
          </div>

          {/* Section 5: Dedication & Availability */}
          <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-xs space-y-5">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 text-base">
                <Clock className="w-4 h-4 text-rose-600" />
                Part 5: Dedication & Availability
              </h3>
              <span className="text-xs font-medium text-slate-400">Questions 17 – 19</span>
            </div>

            {/* Q17. Are you willing to participate in club meetings and community service activities */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                17. Are you willing to participate in club meetings and community service activities <span className="text-rose-600 font-bold">*</span>
              </label>
              <div className="flex flex-wrap gap-4">
                {ROTARACT_MEETING_OPTIONS.map((option) => (
                  <label key={option} className="flex items-center gap-2.5 cursor-pointer text-sm font-medium text-slate-700 hover:text-slate-900">
                    <input
                      type="radio"
                      name="willingToParticipate"
                      value={option}
                      checked={formData.willingToParticipate === option}
                      onChange={(e) => setFormData({ ...formData, willingToParticipate: e.target.value })}
                      className="w-4 h-4 text-rose-600 focus:ring-rose-500 border-slate-300"
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
              {errors.willingToParticipate && <p className="text-xs text-rose-600 mt-1">{errors.willingToParticipate}</p>}
            </div>

            {/* Q18. How much time can you generally dedicate to club activities? */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                18. How much time can you generally dedicate to club activities? <span className="text-rose-600 font-bold">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {ROTARACT_TIME_COMMITMENTS.map((timeOption) => (
                  <label
                    key={timeOption}
                    className={`flex items-center gap-2.5 p-3 rounded-lg border text-xs sm:text-sm font-medium cursor-pointer transition ${
                      formData.timeCommitment === timeOption
                        ? "bg-rose-50 border-rose-300 text-rose-900"
                        : "bg-slate-50/60 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <input
                      type="radio"
                      name="timeCommitment"
                      value={timeOption}
                      checked={formData.timeCommitment === timeOption}
                      onChange={(e) => setFormData({ ...formData, timeCommitment: e.target.value })}
                      className="w-4 h-4 text-rose-600 focus:ring-rose-500 border-slate-300"
                    />
                    <span>{timeOption}</span>
                  </label>
                ))}
              </div>
              {errors.timeCommitment && <p className="text-xs text-rose-600 mt-1">{errors.timeCommitment}</p>}
            </div>

            {/* Q19. Is there anything else would like us to know? */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                19. Is there anything else would like us to know?
                <span className="text-xs font-normal text-slate-400 ml-1">(Optional notes, questions, or ideas)</span>
              </label>
              <textarea
                rows="2"
                value={formData.additionalInfo}
                onChange={(e) => setFormData({ ...formData, additionalInfo: e.target.value })}
                placeholder="Any additional thoughts, experiences, or comments..."
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-rose-600 focus:ring-rose-100"
              />
            </div>
          </div>
        </form>

        {/* Sticky Actions Footer */}
        <div className="p-4 sm:p-5 bg-white border-t border-slate-200 flex flex-col-reverse sm:flex-row items-center justify-between gap-3 shrink-0">
          <p className="text-xs text-slate-500 text-center sm:text-left">
            Your application will be forwarded to the Rotaract Board of Directors for verification.
          </p>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-700 to-indigo-700 hover:from-rose-800 hover:to-indigo-800 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Submitting Application...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit Recruitment Form
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 19-Question Application Details & Verification Modal for Leaders & Admins
 */
export function RotaractApplicationDetailsModal({
  isOpen,
  onClose,
  request,
  clubName = "Rotaract Club of Debre Berhan",
  onApprove,
  onReject,
  canManage = false
}) {
  if (!isOpen || !request) return null;

  const app = request.applicationData || {};
  const hasAppData = Boolean(request.applicationData);

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-rose-100">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-rose-900 via-rose-800 to-indigo-900 text-white p-6 shrink-0 flex items-start justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/30 text-rose-200 text-xs font-semibold mb-2 border border-rose-400/30">
              <Award className="w-3.5 h-3.5 text-amber-300" />
              Rotaract Recruitment Review
            </div>
            <h2 className="text-xl font-black text-white">
              {request.fullName || "Applicant Details"}
            </h2>
            <p className="text-xs text-rose-200 mt-0.5">
              {request.department || app.department} • {request.year || app.year} • Applied {new Date(request.joinedAt || Date.now()).toLocaleDateString()}
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-white/80 hover:text-white bg-black/20 hover:bg-black/40 rounded-full p-2 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 bg-slate-50/50">
          {!hasAppData ? (
            <div className="bg-white p-6 rounded-xl border border-slate-200 text-center py-10">
              <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
              <p className="font-bold text-slate-700">Standard Join Request</p>
              <p className="text-sm text-slate-500 mt-1">
                This applicant joined through standard membership flow without custom questionnaire data.
              </p>
              {request.background && (
                <div className="mt-4 p-4 bg-slate-50 rounded-lg text-left text-sm text-slate-700 border">
                  <span className="font-semibold block text-slate-900 mb-1">Reason for joining:</span>
                  {request.background}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Card 1: Personal & Contact Information */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-700 mb-3 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  1. Personal & Contact Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <span className="text-xs text-slate-400 block">1. Full Name</span>
                    <span className="font-semibold text-slate-800">{app.fullName || request.fullName}</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <span className="text-xs text-slate-400 block">Student ID Number</span>
                    <span className="font-semibold text-slate-800">{app.studentId || request.studentId || request.user?.username || "N/A"}</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <span className="text-xs text-slate-400 block">2. Gender</span>
                    <span className="font-semibold text-slate-800">{app.gender || "Not specified"}</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <span className="text-xs text-slate-400 block">3. Age</span>
                    <span className="font-semibold text-slate-800">{app.age || "N/A"}</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <span className="text-xs text-slate-400 block">4. Phone Number</span>
                    {app.phone ? (
                      <a href={`tel:${app.phone}`} className="font-semibold text-indigo-600 hover:underline flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" />
                        {app.phone}
                      </a>
                    ) : (
                      <span className="text-slate-500">N/A</span>
                    )}
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <span className="text-xs text-slate-400 block">5. Email Address</span>
                    {app.email ? (
                      <a href={`mailto:${app.email}`} className="font-semibold text-indigo-600 hover:underline flex items-center gap-1 truncate">
                        <Mail className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{app.email}</span>
                      </a>
                    ) : (
                      <span className="text-slate-500">N/A</span>
                    )}
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <span className="text-xs text-slate-400 block">6. Telegram Username</span>
                    {app.telegram ? (
                      <a
                        href={`https://t.me/${app.telegram.replace(/^@/, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-sky-600 hover:underline flex items-center gap-1"
                      >
                        <TelegramIcon className="w-3.5 h-3.5" />
                        {app.telegram}
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </a>
                    ) : (
                      <span className="text-slate-500">N/A</span>
                    )}
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <span className="text-xs text-slate-400 block">7. University/ Institution</span>
                    <span className="font-semibold text-slate-800">{app.institution || "Debre Berhan University"}</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <span className="text-xs text-slate-400 block">8. Department & 9. Year</span>
                    <span className="font-semibold text-slate-800">
                      {app.department || request.department} — {app.year || request.year}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 2: Rotaract Knowledge & Goals */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-700 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  2. Motivation & Rotaract Knowledge
                </h4>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm">
                  <span className="text-xs font-semibold text-slate-600 block mb-1">
                    10. What do you know about Rotaract club?
                  </span>
                  <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">
                    {app.knowledge || "No response provided."}
                  </p>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm">
                  <span className="text-xs font-semibold text-slate-600 block mb-1">
                    11. Why do you want to join the Rotaract club ?
                  </span>
                  <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">
                    {app.motivation || request.background || "No response provided."}
                  </p>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm">
                  <span className="text-xs font-semibold text-slate-600 block mb-1">
                    12. What do hope to gain from being a Rotaract club member?
                  </span>
                  <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">
                    {app.expectations || "No response provided."}
                  </p>
                </div>
              </div>

              {/* Card 3: Volunteer Background */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-700 flex items-center gap-2">
                  <Heart className="w-4 h-4" />
                  3. Community Service Experience
                </h4>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-slate-600">
                    13. Participated in community service before:
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      app.volunteerExperience === "Yes"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        : "bg-slate-100 text-slate-700 border border-slate-200"
                    }`}
                  >
                    {app.volunteerExperience || "No"}
                  </span>
                </div>

                {app.volunteerDetails && (
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm">
                    <span className="text-xs font-semibold text-slate-600 block mb-1">
                      14. Volunteer Experience Details:
                    </span>
                    <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">
                      {app.volunteerDetails}
                    </p>
                  </div>
                )}
              </div>

              {/* Card 4: Areas of Interest & Contribution */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-700 flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  4. Interests & Contribution
                </h4>

                <div>
                  <span className="text-xs font-semibold text-slate-600 block mb-2">
                    15. Areas of Interest:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {Array.isArray(app.interestedAreas) && app.interestedAreas.length > 0 ? (
                      app.interestedAreas.map((area, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold"
                        >
                          {area}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400">None specified</span>
                    )}
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm mt-3">
                  <span className="text-xs font-semibold text-slate-600 block mb-1">
                    16. How can you contribute to the growth and success of our Rotaract club?
                  </span>
                  <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">
                    {app.contribution || "No response provided."}
                  </p>
                </div>
              </div>

              {/* Card 5: Commitment & Availability */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-700 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  5. Commitment & Dedication
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="text-xs text-slate-400 block">17. Willingness to participate in meetings</span>
                    <span className="font-bold text-slate-800 mt-1 block">
                      {app.willingToParticipate || "Yes"}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="text-xs text-slate-400 block">18. Dedicated Weekly Time</span>
                    <span className="font-bold text-slate-800 mt-1 block">
                      {app.timeCommitment || "1–2 hours per week"}
                    </span>
                  </div>
                </div>

                {app.additionalInfo && (
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm mt-2">
                    <span className="text-xs font-semibold text-slate-600 block mb-1">
                      19. Additional Information:
                    </span>
                    <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">
                      {app.additionalInfo}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-white border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition"
          >
            Close
          </button>

          {canManage && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  onReject(request._id);
                  onClose();
                }}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-xs transition"
              >
                Reject Applicant
              </button>
              <button
                onClick={() => {
                  onApprove(request._id);
                  onClose();
                }}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition"
              >
                Approve Applicant
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

