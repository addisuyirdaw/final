/** @format */
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import QRCode from 'react-qr-code';
import {
  Printer,
  Download,
  Share2,
  ShieldCheck,
  Award,
  Calendar,
  CheckCircle,
  Building,
  User,
  GraduationCap,
  Sparkles,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';

export function CoCurricularTranscriptView() {
  const { studentId } = useParams();
  const { user } = useAuth();
  const [transcript, setTranscript] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const targetId = studentId || user?.username || user?._id || user?.id;

  useEffect(() => {
    async function loadTranscript() {
      if (!targetId) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError('');
        const res = await apiService.getStudentTranscript(targetId);
        if (res.success && res.transcript) {
          setTranscript(res.transcript);
        } else {
          setError(res.message || 'Could not find transcript for this student.');
        }
      } catch (err) {
        console.error('Transcript fetch error:', err);
        setError(err.message || 'Failed to load co-curricular transcript.');
      } finally {
        setLoading(false);
      }
    }

    loadTranscript();
  }, [targetId]);

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast.success('Transcript link copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <RefreshCw className="w-10 h-10 text-sky-600 animate-spin mb-4" />
        <p className="text-gray-600 font-semibold">Compiling Official Co-Curricular Transcript...</p>
        <p className="text-gray-400 text-xs mt-1">Verifying campus clubs, attendances, and digital signatures</p>
      </div>
    );
  }

  if (error || !transcript) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white rounded-2xl border border-gray-200 text-center shadow-sm">
        <GraduationCap className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">Transcript Unavailable</h2>
        <p className="text-sm text-gray-500 mb-6">{error || 'No co-curricular records found for this student.'}</p>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-700 hover:bg-sky-800 text-white rounded-xl text-sm font-semibold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Portal
        </Link>
      </div>
    );
  }

  const { student, summary, sections, academicInstitution, signatories } = transcript;
  const verificationUrl = `${window.location.origin}/transcript/${student.username || student.id}`;

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6">
      {/* Action Bar (Hidden on Print) */}
      <div className="no-print flex flex-wrap items-center justify-between gap-4 mb-6 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Link to="/attendance" className="hover:text-sky-700 font-medium inline-flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Attendance Scanner
          </Link>
          <span>/</span>
          <span className="font-semibold text-gray-900">Official Transcript</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-gray-300 hover:bg-gray-50 rounded-xl text-xs font-semibold text-gray-700 transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" /> Share
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-sky-700 hover:bg-sky-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow"
          >
            <Printer className="w-3.5 h-3.5" /> Print / Save as PDF
          </button>
        </div>
      </div>

      {/* Official Transcript Sheet */}
      <div className="print-sheet bg-white border-2 border-gray-300 rounded-2xl shadow-lg p-8 md:p-12 text-gray-900 relative overflow-hidden">
        {/* Decorative Top Border */}
        <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-r from-sky-800 via-blue-700 to-indigo-900"></div>

        {/* Institution Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-6 border-b-2 border-sky-800/20">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <img
              src="/image.png/dbu-logo.png"
              alt="DBU Logo"
              className="w-20 h-20 object-contain p-1 border border-sky-100 rounded-lg bg-white"
              onError={(e) => {
                e.target.src = 'https://ui-avatars.com/api/?name=DBU&background=0284c7&color=fff&size=128';
              }}
            />
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-sky-900 uppercase">
                {academicInstitution.name}
              </h1>
              <p className="text-sm font-bold text-gray-600">{academicInstitution.nativeName}</p>
              <p className="text-xs text-sky-800 font-semibold mt-1 uppercase tracking-wider">
                {academicInstitution.office}
              </p>
              <p className="text-[11px] text-gray-500">
                {academicInstitution.location} • Est. {academicInstitution.established}
              </p>
            </div>
          </div>

          <div className="text-center sm:text-right bg-sky-50/60 p-3 rounded-xl border border-sky-100">
            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest font-black text-sky-800 bg-sky-100/70 px-2.5 py-0.5 rounded-full mb-1">
              <ShieldCheck className="w-3 h-3 text-sky-700" />
              OFFICIAL CREDENTIAL
            </span>
            <p className="font-mono text-xs font-bold text-gray-800">{transcript.transcriptId}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">
              Issued: {new Date(transcript.issuedAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Document Title Banner */}
        <div className="my-6 text-center">
          <h2 className="text-lg md:text-xl font-extrabold uppercase tracking-widest text-sky-950">
            Official Co-Curricular Transcript
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Verified Record of Student Leadership, Campus Engagement, and Service Hours
          </p>
        </div>

        {/* Student Demographics Profile */}
        <div className="bg-gray-50/80 rounded-xl p-5 border border-gray-200 mb-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-gray-500 block">Student Name</span>
              <span className="text-sm font-bold text-gray-900 mt-0.5 block">{student.name}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-gray-500 block">DBU Student ID</span>
              <span className="text-sm font-mono font-bold text-sky-800 mt-0.5 block">
                {student.username || 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-gray-500 block">Department</span>
              <span className="text-sm font-semibold text-gray-800 mt-0.5 block">
                {student.department || 'Undergraduate Studies'}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-gray-500 block">Academic Year</span>
              <span className="text-sm font-semibold text-gray-800 mt-0.5 block">
                {student.year || '4th Year'}
              </span>
            </div>
          </div>
        </div>

        {/* Summary Highlights Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="p-4 rounded-xl bg-sky-50 border border-sky-100 text-center">
            <span className="text-2xl font-black text-sky-800">{summary.totalVerifiedHours}</span>
            <span className="text-[11px] block text-sky-900 font-semibold uppercase mt-0.5">
              Service Hours
            </span>
          </div>
          <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100 text-center">
            <span className="text-2xl font-black text-indigo-800">{summary.totalEventsAttended}</span>
            <span className="text-[11px] block text-indigo-900 font-semibold uppercase mt-0.5">
              Sessions Attended
            </span>
          </div>
          <div className="p-4 rounded-xl bg-purple-50 border border-purple-100 text-center">
            <span className="text-2xl font-black text-purple-800">{summary.activeClubsCount}</span>
            <span className="text-[11px] block text-purple-900 font-semibold uppercase mt-0.5">
              Active Clubs
            </span>
          </div>
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-center">
            <span className="text-2xl font-black text-emerald-800">{summary.leadershipRolesCount}</span>
            <span className="text-[11px] block text-emerald-900 font-semibold uppercase mt-0.5">
              Leadership Roles
            </span>
          </div>
        </div>

        {/* Standing Ribbon */}
        <div className="mb-8 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-600" />
            <span>
              Co-Curricular Standing:{' '}
              <strong className="text-sm font-bold text-amber-950">{summary.coCurricularStanding}</strong>
            </span>
          </div>
          <span className="text-[11px] font-mono text-amber-800 uppercase font-semibold">
            {summary.academicYear}
          </span>
        </div>

        {/* Section I: Executive Governance & Leadership Appointments */}
        <div className="mb-8">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-200 mb-3">
            <GraduationCap className="w-4 h-4 text-sky-700" />
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              Section I: Student Governance & Executive Leadership
            </h3>
          </div>

          {sections.leadershipPositions.length === 0 ? (
            <p className="text-xs text-gray-400 italic py-2">No executive leadership appointments recorded.</p>
          ) : (
            <div className="space-y-2">
              {sections.leadershipPositions.map((lead, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100 text-xs"
                >
                  <div>
                    <span className="font-bold text-gray-900">{lead.clubName}</span>
                    <span className="text-gray-500 ml-2">({lead.category})</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-sky-700 px-2 py-0.5 bg-sky-100 rounded">
                      {lead.role}
                    </span>
                    <span className="text-gray-500 font-mono text-[11px]">{lead.academicYear}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section II: Recognized Club Affiliations */}
        <div className="mb-8">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-200 mb-3">
            <Building className="w-4 h-4 text-sky-700" />
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              Section II: Recognized Club Affiliations & Active Memberships
            </h3>
          </div>

          {sections.clubMemberships.length === 0 ? (
            <p className="text-xs text-gray-400 italic py-2">No active club memberships found.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {sections.clubMemberships.map((club, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100"
                >
                  <div>
                    <p className="font-bold text-gray-900">{club.clubName}</p>
                    <p className="text-[11px] text-gray-500">Joined: {new Date(club.joinedAt).toLocaleDateString()}</p>
                  </div>
                  <span className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded text-[10px] font-bold">
                    {club.role}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section III: Verified Event Attendance & Clocked Hours */}
        <div className="mb-8">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-200 mb-3">
            <Calendar className="w-4 h-4 text-sky-700" />
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              Section III: Verified Co-Curricular Event Attendance & Clocked Hours
            </h3>
          </div>

          {sections.verifiedEvents.length === 0 ? (
            <p className="text-xs text-gray-400 italic py-2">
              No QR-scanned or verified event attendance recorded yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-100 text-gray-600 uppercase font-semibold text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Activity / Event Title</th>
                    <th className="py-2.5 px-3">Host Body</th>
                    <th className="py-2.5 px-3">Verification</th>
                    <th className="py-2.5 px-3 text-right">Hours</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sections.verifiedEvents.map((ev, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/60">
                      <td className="py-2 px-3 text-gray-500 font-mono">
                        {new Date(ev.date).toLocaleDateString()}
                      </td>
                      <td className="py-2 px-3 font-semibold text-gray-900">{ev.title}</td>
                      <td className="py-2 px-3 text-gray-600">{ev.organization}</td>
                      <td className="py-2 px-3">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          <CheckCircle className="w-3 h-3 text-emerald-600" /> {ev.verificationMethod}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-sky-800">+{ev.hours} hr</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Section IV: University Certifications */}
        {sections.certificates.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-200 mb-3">
              <Award className="w-4 h-4 text-sky-700" />
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                Section IV: University Certifications & Accreditations
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {sections.certificates.map((cert, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-between"
                >
                  <div>
                    <p className="font-bold text-gray-900">{cert.title}</p>
                    <p className="text-[11px] text-gray-500">Issuer: {cert.issuer}</p>
                  </div>
                  <span className="text-[10px] font-mono text-gray-400">
                    {new Date(cert.issueDate).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Official Signatures & Verification Seal */}
        <div className="mt-12 pt-8 border-t-2 border-gray-200">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-end">
            {/* QR Verification Seal */}
            <div className="flex items-center gap-4">
              <div className="p-2 bg-white border border-gray-300 rounded-lg shadow-sm">
                <QRCode value={verificationUrl} size={70} />
              </div>
              <div className="text-[10px] text-gray-500 leading-tight">
                <p className="font-bold text-gray-800 uppercase">Tamper-Proof Seal</p>
                <p className="font-mono text-[9px] text-sky-800 mt-0.5 break-all">
                  HASH: {transcript.verificationHash}
                </p>
                <p className="text-[9px] text-gray-400 mt-1">Scan to verify online authenticity</p>
              </div>
            </div>

            {/* Signatory 1 */}
            <div className="text-center sm:text-left">
              <div className="border-b border-gray-400 pb-1 mb-1 font-serif italic text-sm text-gray-600">
                Dean of Student Affairs
              </div>
              <p className="text-xs font-bold text-gray-900">Office of Student Services</p>
              <p className="text-[10px] text-gray-500">Debre Berhan University</p>
            </div>

            {/* Signatory 2 */}
            <div className="text-center sm:text-right">
              <div className="border-b border-gray-400 pb-1 mb-1 font-serif italic text-sm text-gray-600">
                President, Student Union
              </div>
              <p className="text-xs font-bold text-gray-900">DBU Student Union Executive</p>
              <p className="text-[10px] text-gray-500">Debre Berhan University</p>
            </div>
          </div>
        </div>
      </div>

      {/* Print Stylesheet */}
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-sheet {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}
