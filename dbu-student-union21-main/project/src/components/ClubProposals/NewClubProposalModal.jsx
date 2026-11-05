import React, { useState } from "react";
import { X, Sparkles, CheckCircle, AlertCircle, Loader, Copy, Users, BookOpen, User, Phone, Mail, FileText, Check } from "lucide-react";
import { apiService } from "../../services/api";
import toast from "react-hot-toast";

const CLUB_CATEGORIES = [
  "Academic",
  "Technology",
  "Leadership",
  "Service",
  "Arts",
  "Sports",
  "Entrepreneurship",
  "Social",
  "Other"
];

const ACADEMIC_YEARS = [
  "1st Year",
  "2nd Year",
  "3rd Year",
  "4th Year",
  "5th Year",
  "Postgraduate"
];

export function NewClubProposalModal({ isOpen, onClose, user, onSubmitted }) {
  const [formData, setFormData] = useState({
    // Proposer Info
    fullName: user?.name || "",
    studentId: user?.username || "",
    department: user?.department || "",
    year: user?.year || "1st Year",
    phone: user?.phoneNumber || user?.phone || "",
    email: user?.email || "",

    // Proposed Club Info
    clubName: "",
    category: "Academic",
    shortDescription: "",
    rationale: "",
    objectives: "",
    activities: "",
    benefits: "",
    estimatedFoundingMembers: "10",

    // Founding Team
    foundingMembers: "",
    proposedLeader: user?.name || "",
    facultyAdvisor: ""
  });

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  if (!isOpen) return null;

  const validate = () => {
    const errs = {};
    if (!formData.fullName.trim()) errs.fullName = "Full name is required";
    if (!formData.studentId.trim()) errs.studentId = "Student ID is required";
    if (!formData.department.trim()) errs.department = "Department is required";
    if (!formData.year.trim()) errs.year = "Academic year is required";
    if (!formData.phone.trim()) errs.phone = "Phone number is required";
    if (!formData.email.trim()) errs.email = "Email address is required";

    if (!formData.clubName.trim()) errs.clubName = "Proposed club name is required";
    if (!formData.category.trim()) errs.category = "Category is required";
    if (!formData.shortDescription.trim()) errs.shortDescription = "Short description is required";
    if (!formData.rationale.trim()) errs.rationale = "Please explain why this club should be established at DBU";
    if (!formData.objectives.trim()) errs.objectives = "Main objectives are required";
    if (!formData.activities.trim()) errs.activities = "Proposed activities and programs are required";
    if (!formData.benefits.trim()) errs.benefits = "Expected student benefits are required";

    const membersCount = Number(formData.estimatedFoundingMembers);
    if (isNaN(membersCount) || membersCount < 1) {
      errs.estimatedFoundingMembers = "Please specify at least 1 interested founding member";
    }

    if (!formData.proposedLeader.trim()) {
      errs.proposedLeader = "Proposed Club President or Coordinator is required";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      toast.error("Please fill in all required fields before submitting");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        proposer: {
          fullName: formData.fullName.trim(),
          studentId: formData.studentId.trim(),
          department: formData.department.trim(),
          year: formData.year.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim()
        },
        proposedClub: {
          name: formData.clubName.trim(),
          category: formData.category,
          shortDescription: formData.shortDescription.trim(),
          rationale: formData.rationale.trim(),
          objectives: formData.objectives.trim(),
          activities: formData.activities.trim(),
          benefits: formData.benefits.trim(),
          estimatedFoundingMembers: Number(formData.estimatedFoundingMembers) || 10
        },
        foundingTeam: {
          foundingMembers: formData.foundingMembers.trim(),
          proposedLeader: formData.proposedLeader.trim(),
          facultyAdvisor: formData.facultyAdvisor.trim()
        }
      };

      const response = await apiService.submitClubProposal(payload);
      toast.success("New club proposal submitted successfully!");
      if (onSubmitted) {
        onSubmitted({
          referenceId: response.referenceId,
          clubName: formData.clubName.trim(),
          message: response.message
        });
      }
      onClose();
    } catch (err) {
      console.error("Failed to submit proposal:", err);
      toast.error(err.message || "Failed to submit proposal");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-100">
        {/* Header Banner */}
        <div className="relative bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 sm:p-8 shrink-0">
          <div className="flex items-start justify-between">
            <div className="space-y-1 pr-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-400 text-slate-950 uppercase tracking-wider mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                DBU Student Union • New Club Proposal
              </span>
              <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight">
                Propose a New Student Club
              </h2>
              <p className="text-xs sm:text-sm text-blue-100 max-w-2xl leading-relaxed">
                Have an idea for a student organization that does not exist at DBU yet? Submit your proposal for review and help create new opportunities for students.
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white p-2 rounded-xl hover:bg-white/10 transition"
              aria-label="Close"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 overflow-y-auto space-y-8 text-slate-800">
          {/* Section A: Proposer Information */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
              <User className="w-5 h-5 text-blue-600" />
              <h3 className="text-base font-bold text-slate-900">
                A. Proposer Information
              </h3>
              <span className="text-xs text-slate-500 font-normal ml-auto">Lead Student Proposer</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="e.g. Abebe Bikila"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition focus:ring-2 focus:outline-none ${
                    errors.fullName ? "border-rose-400 bg-rose-50/40" : "border-slate-300 focus:ring-blue-500"
                  }`}
                />
                {errors.fullName && <p className="text-xs text-rose-500 mt-1">{errors.fullName}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Student ID <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.studentId}
                  onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                  placeholder="e.g. DBU/1234/14"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono transition focus:ring-2 focus:outline-none ${
                    errors.studentId ? "border-rose-400 bg-rose-50/40" : "border-slate-300 focus:ring-blue-500"
                  }`}
                />
                {errors.studentId && <p className="text-xs text-rose-500 mt-1">{errors.studentId}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Academic Year <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:ring-2 focus:ring-blue-500 transition"
                >
                  {ACADEMIC_YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Department / Field <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="e.g. Computer Science"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition focus:ring-2 focus:outline-none ${
                    errors.department ? "border-rose-400 bg-rose-50/40" : "border-slate-300 focus:ring-blue-500"
                  }`}
                />
                {errors.department && <p className="text-xs text-rose-500 mt-1">{errors.department}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Phone Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="e.g. 0911234567"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition focus:ring-2 focus:outline-none ${
                    errors.phone ? "border-rose-400 bg-rose-50/40" : "border-slate-300 focus:ring-blue-500"
                  }`}
                />
                {errors.phone && <p className="text-xs text-rose-500 mt-1">{errors.phone}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g. student@dbu.edu.et"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition focus:ring-2 focus:outline-none ${
                    errors.email ? "border-rose-400 bg-rose-50/40" : "border-slate-300 focus:ring-blue-500"
                  }`}
                />
                {errors.email && <p className="text-xs text-rose-500 mt-1">{errors.email}</p>}
              </div>
            </div>
          </div>

          {/* Section B: Proposed Club Information */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              <h3 className="text-base font-bold text-slate-900">
                B. Proposed Club Information
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Proposed Club Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.clubName}
                  onChange={(e) => setFormData({ ...formData, clubName: e.target.value })}
                  placeholder="e.g. DBU Artificial Intelligence & Robotics Club"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition focus:ring-2 focus:outline-none ${
                    errors.clubName ? "border-rose-400 bg-rose-50/40" : "border-slate-300 focus:ring-indigo-500"
                  }`}
                />
                {errors.clubName && <p className="text-xs text-rose-500 mt-1">{errors.clubName}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Category <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:ring-2 focus:ring-indigo-500 transition"
                >
                  {CLUB_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Short Description <span className="text-rose-500">*</span>
                <span className="text-xs text-slate-400 font-normal ml-2">(A concise overview of the club)</span>
              </label>
              <input
                type="text"
                required
                value={formData.shortDescription}
                onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                placeholder="e.g. Fostering practical machine learning and hardware robotics skills among DBU students."
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition focus:ring-2 focus:outline-none ${
                  errors.shortDescription ? "border-rose-400 bg-rose-50/40" : "border-slate-300 focus:ring-indigo-500"
                }`}
              />
              {errors.shortDescription && <p className="text-xs text-rose-500 mt-1">{errors.shortDescription}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Why should this club be established at DBU? <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={formData.rationale}
                onChange={(e) => setFormData({ ...formData, rationale: e.target.value })}
                placeholder="Explain the background need, student interest, and gap this club fills on campus..."
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition focus:ring-2 focus:outline-none ${
                  errors.rationale ? "border-rose-400 bg-rose-50/40" : "border-slate-300 focus:ring-indigo-500"
                }`}
              />
              {errors.rationale && <p className="text-xs text-rose-500 mt-1">{errors.rationale}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Main Objectives <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.objectives}
                  onChange={(e) => setFormData({ ...formData, objectives: e.target.value })}
                  placeholder="1. Host bi-weekly hands-on workshops&#10;2. Build collaborative open-source projects&#10;3. Compete in national innovation contests"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition focus:ring-2 focus:outline-none ${
                    errors.objectives ? "border-rose-400 bg-rose-50/40" : "border-slate-300 focus:ring-indigo-500"
                  }`}
                />
                {errors.objectives && <p className="text-xs text-rose-500 mt-1">{errors.objectives}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Proposed Activities & Programs <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.activities}
                  onChange={(e) => setFormData({ ...formData, activities: e.target.value })}
                  placeholder="Regular meetings, hackathons, guest speakers, community outreach, mentorship..."
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition focus:ring-2 focus:outline-none ${
                    errors.activities ? "border-rose-400 bg-rose-50/40" : "border-slate-300 focus:ring-indigo-500"
                  }`}
                />
                {errors.activities && <p className="text-xs text-rose-500 mt-1">{errors.activities}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Expected Student Benefits <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.benefits}
                  onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
                  placeholder="e.g. Practical career skills, certified co-curricular credit, peer network"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition focus:ring-2 focus:outline-none ${
                    errors.benefits ? "border-rose-400 bg-rose-50/40" : "border-slate-300 focus:ring-indigo-500"
                  }`}
                />
                {errors.benefits && <p className="text-xs text-rose-500 mt-1">{errors.benefits}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Interested Founding Members <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.estimatedFoundingMembers}
                  onChange={(e) => setFormData({ ...formData, estimatedFoundingMembers: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition focus:ring-2 focus:outline-none ${
                    errors.estimatedFoundingMembers ? "border-rose-400 bg-rose-50/40" : "border-slate-300 focus:ring-indigo-500"
                  }`}
                />
                {errors.estimatedFoundingMembers && (
                  <p className="text-xs text-rose-500 mt-1">{errors.estimatedFoundingMembers}</p>
                )}
              </div>
            </div>
          </div>

          {/* Section C: Founding Team */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
              <Users className="w-5 h-5 text-purple-600" />
              <h3 className="text-base font-bold text-slate-900">
                C. Founding Team
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Proposed President or Coordinator <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.proposedLeader}
                  onChange={(e) => setFormData({ ...formData, proposedLeader: e.target.value })}
                  placeholder="e.g. Abebe Bikila"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition focus:ring-2 focus:outline-none ${
                    errors.proposedLeader ? "border-rose-400 bg-rose-50/40" : "border-slate-300 focus:ring-purple-500"
                  }`}
                />
                {errors.proposedLeader && (
                  <p className="text-xs text-rose-500 mt-1">{errors.proposedLeader}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Proposed Faculty Advisor <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={formData.facultyAdvisor}
                  onChange={(e) => setFormData({ ...formData, facultyAdvisor: e.target.value })}
                  placeholder="e.g. Dr. Kassa (Dept of CS)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-purple-500 transition"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Names of Initial Founding Members <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={formData.foundingMembers}
                  onChange={(e) => setFormData({ ...formData, foundingMembers: e.target.value })}
                  placeholder="List initial interested students with their department or IDs (e.g. Tigist Alemu (CS), Yared Bekele (Law))..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-purple-500 transition"
                />
              </div>
            </div>
          </div>

          {/* Submission Notice Box */}
          <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 text-xs text-amber-900 flex items-start gap-3">
            <span className="text-xl">⚖️</span>
            <div className="space-y-1">
              <p className="font-bold">Important Notice regarding Club Creation Authority:</p>
              <p className="leading-relaxed text-amber-800">
                Submitting a proposal does not guarantee official recognition or immediate creation. All submissions are reviewed by the Student Union administration and Academic Affairs. Only authorized university administrators hold the authority to approve and officially charter new student organizations.
              </p>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 transition text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold px-8 py-2.5 rounded-xl shadow-lg transition text-sm"
            >
              {submitting ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>Submitting Proposal...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Submit Club Proposal</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

