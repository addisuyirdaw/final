import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Search, ShieldCheck, Award, Calendar, User, Building, CheckCircle2, XCircle, AlertTriangle, RefreshCw, WifiOff } from "lucide-react";
import { motion } from "framer-motion";
import { apiService } from "../../services/api";

export function VerifyPage() {
  const { certNumber: routeCertNumber } = useParams();
  const navigate = useNavigate();

  const [inputNumber, setInputNumber] = useState(routeCertNumber || "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [searched, setSearched] = useState(false);
  const [serverError, setServerError] = useState(false);

  useEffect(() => {
    if (routeCertNumber) {
      setInputNumber(routeCertNumber);
      console.log("VerifyPage route certNumber:", routeCertNumber);
      handleVerify(routeCertNumber);
    }
  }, [routeCertNumber]);

  const handleVerify = async (queryNumber) => {
    const target = (queryNumber || inputNumber).trim();
    if (!target) return;

    setLoading(true);
    setSearched(true);
    setServerError(false);
    console.log("VerifyPage requesting verification for:", target);
    try {
      const data = await apiService.verifyCertificatePublic(target);
      console.log("VerifyPage received response:", data);
      if (data && typeof data === "object") {
        setResult(data);
      } else {
        setServerError(true);
      }
    } catch (err) {
      console.error("Verification connection error:", err);
      setServerError(true);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const onSubmitSearch = (e) => {
    e.preventDefault();
    if (!inputNumber.trim()) return;
    navigate(`/verify/${encodeURIComponent(inputNumber.trim())}`);
    handleVerify(inputNumber.trim());
  };

  const cert = result?.certificate;
  const isValid = result?.found && !result?.tampered && cert?.status === "VALID";
  const isRevoked = result?.found && cert?.status === "REVOKED";
  const isCancelled = result?.found && cert?.status === "CANCELLED";
  const isTampered = result?.found && result?.tampered;
  const isNotFound = searched && !loading && !serverError && !result?.found;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto space-y-8">

        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 shadow-lg shadow-amber-500/20 text-slate-950 mb-2">
            <ShieldCheck className="w-9 h-9" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            DBU Certificate Verification Portal
          </h1>
          <p className="text-slate-400 text-sm max-w-lg mx-auto">
            Official authenticity registry for Debre Berhan University Student Union credentials.
          </p>
        </div>

        {/* Search Bar */}
        <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-6 shadow-2xl backdrop-blur-sm">
          <form onSubmit={onSubmitSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <Search className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={inputNumber}
                onChange={(e) => setInputNumber(e.target.value)}
                placeholder="Enter Certificate Number (e.g. DBU-SS-2026-000001)"
                className="w-full pl-11 pr-4 py-3.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm tracking-wide font-mono uppercase"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !inputNumber.trim()}
              className="px-7 py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:scale-[0.98] text-slate-950 font-bold rounded-xl shadow-lg hover:shadow-amber-500/20 transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify Certificate"
              )}
            </button>
          </form>
          <p className="text-xs text-slate-500 mt-3 text-center sm:text-left">
            💡 Enter the 16-character certificate ID printed at the bottom of your official DBU certificate.
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-slate-800/50 rounded-2xl p-12 text-center border border-slate-700">
            <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-300 font-medium">Querying DBU Central Verification Registry...</p>
            <p className="text-xs text-slate-500 mt-1">Verifying SHA-256 cryptographic hash signature...</p>
          </div>
        )}

        {/* Server / Backend Unavailable */}
        {!loading && serverError && (
          <div className="bg-slate-800 border-2 border-amber-500/80 rounded-2xl p-8 text-center space-y-4 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
              <WifiOff className="w-9 h-9" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">⚠️ Verification service temporarily unavailable.</h2>
              <p className="text-slate-400 text-sm max-w-md mx-auto mt-2">
                Could not connect to the Debre Berhan University verification server. Please check your network connection or try again shortly.
              </p>
            </div>
            <button
              onClick={() => handleVerify(inputNumber)}
              className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              Retry Verification
            </button>
          </div>
        )}

        {/* Verification Results */}
        {!loading && !serverError && searched && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* 1. VALID RESULT */}
            {isValid && (
              <div className="bg-slate-800 border-2 border-emerald-500/80 rounded-2xl overflow-hidden shadow-2xl">
                {/* Header Banner */}
                <div className="bg-emerald-600/20 border-b border-emerald-500/30 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 uppercase tracking-wider">
                          ✓ VALID CERTIFICATE
                        </span>
                        <span className="text-xs text-emerald-400 font-mono">STATUS: {cert.status}</span>
                      </div>
                      <h2 className="text-xl font-bold text-white mt-1">Official DBU Certificate Verified</h2>
                    </div>
                  </div>
                  <div className="text-right font-mono text-xs text-slate-400">
                    <div>Issued: {new Date(cert.issueDate).toLocaleDateString()}</div>
                    <div className="text-emerald-400 font-semibold">{cert.certificateNumber}</div>
                  </div>
                </div>

                {/* Body Details */}
                <div className="p-6 sm:p-8 space-y-6">
                  {/* Student Info Card */}
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 bg-slate-900/80 p-5 rounded-xl border border-slate-700/60">
                    <img
                      src={cert.profileImage || "https://images.pexels.com/photos/3763188/pexels-photo-3763188.jpeg?auto=compress&cs=tinysrgb&w=400"}
                      alt={cert.studentName}
                      className="w-24 h-24 rounded-xl object-cover border-2 border-amber-500/40 shadow-md flex-shrink-0"
                      onError={(e) => {
                        e.target.src = "https://images.pexels.com/photos/3763188/pexels-photo-3763188.jpeg?auto=compress&cs=tinysrgb&w=400";
                      }}
                    />
                    <div className="flex-1 space-y-2 text-center sm:text-left">
                      <div>
                        <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Recipient Name</span>
                        <h3 className="text-2xl font-bold text-amber-400">{cert.studentName}</h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-sm">
                        <div>
                          <span className="text-slate-500 text-xs">Student ID / Username:</span>
                          <p className="font-mono text-slate-200 font-medium">{cert.studentUsername || "N/A"}</p>
                        </div>
                        <div>
                          <span className="text-slate-500 text-xs">Department:</span>
                          <p className="text-slate-200">{cert.studentDepartment || "Debre Berhan University"}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Certificate Credentials Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/40 space-y-1">
                      <div className="flex items-center gap-2 text-amber-500 text-xs font-semibold uppercase">
                        <Building className="w-4 h-4" /> Issuing Club / Organization
                      </div>
                      <p className="text-white font-bold text-lg">{cert.clubName}</p>
                      <p className="text-xs text-slate-400">Debre Berhan University Student Union</p>
                    </div>

                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/40 space-y-1">
                      <div className="flex items-center gap-2 text-amber-500 text-xs font-semibold uppercase">
                        <Award className="w-4 h-4" /> Position / Role Recognized
                      </div>
                      <p className="text-white font-bold text-lg">{cert.role}</p>
                      <p className="text-xs text-slate-400">Official Service Role</p>
                    </div>

                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/40 space-y-1">
                      <div className="flex items-center gap-2 text-amber-500 text-xs font-semibold uppercase">
                        <Calendar className="w-4 h-4" /> Service Period
                      </div>
                      <p className="text-slate-200 text-sm font-mono">
                        {cert.startDateGC || "N/A"} — {cert.endDateGC || "N/A"}
                      </p>
                      <p className="text-xs text-slate-400">Gregorian Calendar</p>
                    </div>

                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/40 space-y-1">
                      <div className="flex items-center gap-2 text-amber-500 text-xs font-semibold uppercase">
                        <User className="w-4 h-4" /> Authorized Signature
                      </div>
                      <p className="text-slate-200 text-sm font-semibold">{cert.issuedByName || "DBU Student Union Office"}</p>
                      <p className="text-xs text-slate-400">Office of Student Affairs</p>
                    </div>
                  </div>

                  {/* Verification Cryptographic Proof */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs space-y-1">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>VERIFICATION CODE:</span>
                      <span className="text-amber-400 font-bold tracking-widest">{cert.verificationCode}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>HMAC-SHA256 CHECKSUM:</span>
                      <span className="text-emerald-400">MATCHED & VALIDATED</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. REVOKED OR CANCELLED RESULT */}
            {(isRevoked || isCancelled) && (
              <div className="bg-slate-800 border-2 border-red-500/80 rounded-2xl overflow-hidden shadow-2xl">
                <div className="bg-red-600/20 border-b border-red-500/30 p-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 flex-shrink-0">
                    <XCircle className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-red-500 text-white uppercase tracking-wider">
                      ❌ Certificate Revoked
                    </span>
                    <h2 className="text-xl font-bold text-white mt-1">This Certificate Has Been Invalidated</h2>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <p className="text-slate-300 text-sm">
                    The certificate <strong className="font-mono text-amber-400">{cert.certificateNumber}</strong> issued to <strong>{cert.studentName}</strong> was officially revoked by DBU Student Union administration.
                  </p>
                  {cert.revokeReason && (
                    <div className="bg-red-950/40 border border-red-800/40 p-4 rounded-xl text-xs text-red-300">
                      <strong>Reason for Revocation:</strong> {cert.revokeReason}
                    </div>
                  )}
                  <p className="text-xs text-slate-500">
                    Revoked certificates are no longer considered valid proof of achievement or service at Debre Berhan University.
                  </p>
                </div>
              </div>
            )}

            {/* 3. TAMPERED DATA DETECTED */}
            {isTampered && (
              <div className="bg-slate-800 border-2 border-amber-500/80 rounded-2xl p-6 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mx-auto">
                  <AlertTriangle className="w-7 h-7" />
                </div>
                <h2 className="text-xl font-bold text-white">⚠️ Security Signature Mismatch</h2>
                <p className="text-slate-300 text-sm max-w-md mx-auto">
                  The data associated with certificate <strong className="font-mono">{cert.certificateNumber}</strong> failed the cryptographic integrity check. This record may have been altered without authorization.
                </p>
              </div>
            )}

            {/* 4. NOT FOUND RESULT */}
            {isNotFound && (
              <div className="bg-slate-800 border-2 border-slate-700 rounded-2xl p-8 text-center space-y-4 shadow-2xl">
                <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto">
                  <XCircle className="w-9 h-9" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">❌ Certificate Not Found</h2>
                  <p className="text-slate-400 text-sm max-w-md mx-auto mt-2">
                    No certificate matching <strong className="font-mono text-amber-400">{inputNumber}</strong> exists in the official Debre Berhan University Student Union database.
                  </p>
                </div>
                <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-700/60 max-w-md mx-auto text-left text-xs text-slate-400 space-y-1">
                  <p className="font-semibold text-slate-300">Why might this happen?</p>
                  <ul className="list-disc list-inside space-y-1 text-slate-400">
                    <li>The certificate number was typed incorrectly.</li>
                    <li>The certificate was fabricated or altered using external design tools.</li>
                    <li>The certificate was issued before the online registry was established.</li>
                  </ul>
                </div>
              </div>
            )}
          </motion.div>
        )}

      </div>
    </div>
  );
}

export default VerifyPage;
