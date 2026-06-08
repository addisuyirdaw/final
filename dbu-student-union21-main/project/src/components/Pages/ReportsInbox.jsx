import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import toast from 'react-hot-toast';

export const ReportsInbox = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('PENDING'); // PENDING or HISTORY or ALL

  // Review Modal State
  const [selectedReport, setSelectedReport] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewStatus, setReviewStatus] = useState('APPROVED');
  const [reviewFeedback, setReviewFeedback] = useState('');

  useEffect(() => {
    fetchInbox();
  }, []);

  const fetchInbox = async () => {
    try {
      setLoading(true);
      const data = await apiService.getInboxReports();
      setReports(data || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch reports inbox');
    } finally {
      setLoading(false);
    }
  };
  const handleReview = async (e) => {
    e.preventDefault();
    try {
      if (reviewStatus === 'APPROVED' || reviewStatus === 'PUBLISHED') {
        await apiService.approveReport(selectedReport._id, { feedback: reviewFeedback });
      } else if (reviewStatus === 'RETURNED') {
        await apiService.returnReport(selectedReport._id, { feedback: reviewFeedback });
      } else {
        await apiService.reviewReport(selectedReport._id, { status: reviewStatus, feedback: reviewFeedback });
      }
      setShowReviewModal(false);
      setSelectedReport(null);
      setReviewFeedback('');
      fetchInbox(); // Refresh data
    } catch (err) {
      setError(err.message || 'Failed to review report');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING_REVIEW': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Pending Review</span>;
      case 'APPROVED': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Approved</span>;
      case 'RETURNED': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Needs Revision</span>;
      case 'PUBLISHED': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">Published</span>;
      default: return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">{status || 'Unknown'}</span>;
    }
  };

  const filteredReports = reports.filter(r => {
    const typeMatch = filterType === 'ALL' || r.reportType === filterType;
    const statusMatch = statusFilter === 'ALL'
      ? true
      : statusFilter === 'PENDING'
        ? r.status === 'PENDING_REVIEW'
        : (r.status === 'APPROVED' || r.status === 'PUBLISHED' || r.status === 'RETURNED');
    return typeMatch && statusMatch;
  });

  const getFileIcon = (fileUrl) => {
    if (!fileUrl) return '📄';
    if (fileUrl.toLowerCase().endsWith('.pdf')) return '📕';
    if (fileUrl.match(/\.(jpeg|jpg|gif|png)$/i)) return '🖼️';
    return '📄';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pt-16">
      <div className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 mt-10">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-6">Coordinator Reports Inbox</h1>
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 shadow-sm border border-red-100">
            {error}
          </div>
        )}


        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div className="flex gap-2 bg-gray-100 p-1 rounded-xl w-fit">
            <button
              onClick={() => setStatusFilter('PENDING')}
              className={`px-6 py-2 rounded-lg font-bold transition-colors text-sm ${statusFilter === 'PENDING' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >Requires Action</button>
            <button
              onClick={() => setStatusFilter('HISTORY')}
              className={`px-6 py-2 rounded-lg font-bold transition-colors text-sm ${statusFilter === 'HISTORY' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >History / Approved</button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${filterType === 'ALL' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'}`}
            >All Types</button>
            <button
              onClick={() => setFilterType('ANNUAL_REPORT')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${filterType === 'ANNUAL_REPORT' ? 'bg-red-600 text-white' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'}`}
            >Annual Only</button>
            <button
              onClick={() => setFilterType('ACTIVITY')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${filterType === 'ACTIVITY' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'}`}
            >Activity Only</button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading inbox...</div>
        ) : filteredReports.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm text-center py-16 border border-gray-100">
            <p className="text-gray-500">No reports found for this filter.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Document Name</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Club</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Sender</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Download & Review</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredReports.map((report) => (
                    <tr key={report._id} className={`hover:bg-gray-50 transition-colors ${report.reportType === 'ANNUAL_REPORT' ? 'bg-red-50/30' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {report.title}
                        {report.reportType === 'ANNUAL_REPORT' && <span className="ml-2 text-[10px] bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-bold">ANNUAL</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {report.club?.name || 'Unknown Club'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {report.submittedBy?.name || 'Unknown Sender'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(report.date || report.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {report.reportType || 'ACTIVITY'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {getStatusBadge(report.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex items-center gap-3">
                        {report.fileUrl && (
                          <a
                            href={`${apiService.baseURL}/reports/download/${report.fileUrl.split('/').pop()}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 px-3 py-1.5 rounded font-bold transition-colors shadow-sm inline-flex items-center gap-1"
                          >
                            <span>{getFileIcon(report.fileUrl)}</span> Download Attachment
                          </a>
                        )}
                        {report.documentUrl && !report.fileUrl && (
                          <a
                            href={report.documentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-purple-100 text-purple-700 hover:bg-purple-200 px-3 py-1.5 rounded font-bold transition-colors shadow-sm inline-flex items-center gap-1"
                          >
                            🔗 External Link
                          </a>
                        )}
                        <button
                          onClick={() => {
                            setSelectedReport(report);
                            setReviewStatus(report.status === 'PENDING_REVIEW' ? 'APPROVED' : report.status);
                            setShowReviewModal(true);
                          }}
                          className="bg-gray-900 text-white hover:bg-black px-3 py-1.5 rounded font-medium transition-colors"
                        >
                          Review
                        </button>
                        <button
                          onClick={async () => {
                            if (window.confirm('Are you sure you want to permanently delete this report and its files?')) {
                              try {
                                await apiService.deleteReport(report._id);
                                toast.success('Report deleted successfully');
                                fetchInbox();
                              } catch (err) {
                                toast.error(err.message || 'Failed to delete report');
                              }
                            }
                          }}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded font-bold transition-colors shadow-sm inline-flex items-center gap-1"
                        >
                          🗑️ Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {showReviewModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Review Report: {selectedReport.title}</h2>

            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200 mb-6">
              <p className="font-bold text-blue-800 mb-2">ATTACHED DOCUMENT:</p>
              <a
                href={selectedReport.fileUrl ? `${apiService.baseURL}/reports/download/${selectedReport.fileUrl.split('/').pop()}` : selectedReport.documentUrl}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 underline font-medium hover:text-blue-800"
              >
                📎 Click here to safely open/download the report file
              </a>
            </div>

            <form onSubmit={handleReview}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Update Status</label>
                <select
                  value={reviewStatus}
                  onChange={(e) => setReviewStatus(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="PENDING_REVIEW">Pending Review</option>
                  <option value="APPROVED">Approved</option>
                  <option value="RETURNED">Needs Revision</option>
                  <option value="PUBLISHED">Published</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Feedback (Optional)</label>
                <textarea
                  value={reviewFeedback}
                  onChange={(e) => setReviewFeedback(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  rows="3"
                  placeholder="Provide feedback for the club..."
                />
              </div>
              <div className="flex gap-4">
                <button type="button" onClick={() => setShowReviewModal(false)} className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-xl font-bold hover:bg-gray-200">Cancel</button>
                <button type="submit" className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-700">Submit Review</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
