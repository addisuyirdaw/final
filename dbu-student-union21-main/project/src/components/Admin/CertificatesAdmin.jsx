import React, { useState, useEffect } from "react";
import { Search, Filter, ShieldCheck, XCircle, CheckCircle, RefreshCw, Award, AlertTriangle, Eye, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";
import { apiService } from "../../services/api";
import toast from "react-hot-toast";

export function CertificatesAdmin() {
  const [certs, setCerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Revoke modal state
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchCertificates();
  }, [search, statusFilter, page]);

  const fetchCertificates = async () => {
    setLoading(true);
    try {
      const res = await apiService.getCertificates({
        search,
        status: statusFilter,
        page,
        limit: 20,
      });
      if (res.success) {
        setCerts(res.certificates || []);
        setTotal(res.total || 0);
      }
    } catch (err) {
      toast.error(err.message || "Failed to load certificates");
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeSubmit = async (e) => {
    e.preventDefault();
    if (!revokeTarget) return;

    setActionLoading(true);
    try {
      const res = await apiService.revokeCertificate(revokeTarget.certificateNumber, revokeReason);
      if (res.success) {
        toast.success(`Certificate ${revokeTarget.certificateNumber} revoked`);
        setRevokeTarget(null);
        setRevokeReason("");
        fetchCertificates();
      }
    } catch (err) {
      toast.error(err.message || "Failed to revoke certificate");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReactivate = async (certNumber) => {
    if (!window.confirm(`Reactivate certificate ${certNumber}?`)) return;

    try {
      const res = await apiService.reactivateCertificate(certNumber);
      if (res.success) {
        toast.success(`Certificate ${certNumber} reactivated`);
        fetchCertificates();
      }
    } catch (err) {
      toast.error(err.message || "Failed to reactivate certificate");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Award className="w-7 h-7 text-amber-500" />
            Digital Certificate Management Registry
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            Manage, verify, and revoke officially issued DBU Student Union digital certificates.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-sm font-semibold">
            Total Registry Records: {total}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by student name, cert number, code, or club..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>
        <div className="sm:w-48">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          >
            <option value="">All Statuses</option>
            <option value="VALID">VALID</option>
            <option value="REVOKED">REVOKED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>
        <button
          onClick={fetchCertificates}
          className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors"
          title="Refresh List"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-amber-500" />
            Loading certificate registry...
          </div>
        ) : certs.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Award className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="font-semibold">No certificates found</p>
            <p className="text-xs text-gray-400 mt-1">Certificates will appear here automatically when students generate them from eligible clubs.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="p-4">Cert Number & Code</th>
                  <th className="p-4">Student Name</th>
                  <th className="p-4">Club & Role</th>
                  <th className="p-4">Issue Date</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {certs.map((cert) => (
                  <tr key={cert._id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="p-4">
                      <span className="font-mono font-bold text-gray-900 block">{cert.certificateNumber}</span>
                      <span className="font-mono text-xs text-amber-600 font-medium">{cert.verificationCode}</span>
                    </td>
                    <td className="p-4">
                      <span className="font-semibold text-gray-900 block">{cert.studentName}</span>
                      <span className="text-xs text-gray-500">{cert.studentUsername || cert.studentDepartment || "Student"}</span>
                    </td>
                    <td className="p-4">
                      <span className="font-medium text-gray-800 block">{cert.clubName}</span>
                      <span className="text-xs text-gray-500">{cert.role}</span>
                    </td>
                    <td className="p-4 text-xs text-gray-600">
                      {new Date(cert.issueDate).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      {cert.status === "VALID" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle className="w-3.5 h-3.5" /> VALID
                        </span>
                      ) : cert.status === "REVOKED" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                          <XCircle className="w-3.5 h-3.5" /> REVOKED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-800">
                          {cert.status}
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <a
                        href={`/verify/${cert.certificateNumber}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-xs font-semibold transition-colors"
                        title="View Public Verification Page"
                      >
                        <Eye className="w-3.5 h-3.5" /> Verify
                      </a>
                      {cert.status === "VALID" ? (
                        <button
                          onClick={() => setRevokeTarget(cert)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-md text-xs font-semibold transition-colors"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Revoke
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReactivate(cert.certificateNumber)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-md text-xs font-semibold transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Reactivate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Revoke Modal */}
      {revokeTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-bold text-gray-900">Revoke Certificate</h3>
            </div>
            <p className="text-sm text-gray-600">
              You are revoking certificate <strong className="font-mono text-gray-900">{revokeTarget.certificateNumber}</strong> issued to <strong>{revokeTarget.studentName}</strong>.
            </p>
            <form onSubmit={handleRevokeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Reason for Revocation *</label>
                <textarea
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  placeholder="e.g. Disciplinary action, administrative recalculation, or duplicate issue"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                  rows={3}
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRevokeTarget(null)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold shadow-md"
                >
                  {actionLoading ? "Revoking..." : "Confirm Revocation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CertificatesAdmin;
