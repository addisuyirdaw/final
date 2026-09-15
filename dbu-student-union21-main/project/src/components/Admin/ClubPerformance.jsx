import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { Activity, Users, FolderKanban, CheckSquare, FileText, AlertTriangle, ArrowRight, RefreshCw, BarChart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const ClubPerformance = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ summary: {}, performance: [] });
  const [error, setError] = useState('');
  const [sortField, setSortField] = useState('name');
  const [sortDesc, setSortDesc] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPerformance();
  }, []);

  const fetchPerformance = async () => {
    try {
      setLoading(true);
      const res = await apiService.getClubPerformance();
      setData(res || { summary: {}, performance: [] });
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to fetch club performance');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDesc(!sortDesc);
    } else {
      setSortField(field);
      setSortDesc(true);
    }
  };

  const getSignalBadge = (signal) => {
    if (signal === 'Active') return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Active</span>;
    if (signal === 'Low Recent Activity') return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Low Activity</span>;
    if (signal === 'No Recent Activity') return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">Dormant</span>;
    if (signal.includes('Pending Review') || signal.includes('Returned')) return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">{signal}</span>;
    if (signal === 'Club Approval Pending') return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">Pending Approval</span>;
    return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">{signal}</span>;
  };

  const sortedPerformance = [...(data.performance || [])].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];
    
    // Handle string comparison
    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();
    // Handle date comparison
    if (sortField === 'latestEventDate' || sortField === 'latestReportDate') {
      valA = valA ? new Date(valA).getTime() : 0;
      valB = valB ? new Date(valB).getTime() : 0;
    }

    if (valA < valB) return sortDesc ? 1 : -1;
    if (valA > valB) return sortDesc ? -1 : 1;
    return 0;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-lg shadow-sm border border-red-100">
        <AlertTriangle className="w-5 h-5 inline mr-2" /> {error}
        <button onClick={fetchPerformance} className="ml-4 underline">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Total Clubs</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{data.summary.totalClubs || 0}</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Attention Required</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{data.summary.attentionRequired || 0}</p>
          </div>
          <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Active Projects</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{data.summary.activeProjects || 0}</p>
          </div>
          <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
            <FolderKanban className="w-6 h-6 text-purple-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Total Activities</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{data.summary.totalActivities || 0}</p>
          </div>
          <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
            <Activity className="w-6 h-6 text-green-600" />
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <BarChart className="w-5 h-5 text-indigo-600" />
            Institutional Club Performance
          </h3>
          <button 
            onClick={fetchPerformance}
            className="flex items-center text-sm text-gray-600 hover:text-indigo-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-white">
              <tr>
                <th onClick={() => handleSort('name')} className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50">Club</th>
                <th onClick={() => handleSort('memberCount')} className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50">Members</th>
                <th onClick={() => handleSort('eventCount')} className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50">Activities</th>
                <th onClick={() => handleSort('latestEventDate')} className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50">Last Activity</th>
                <th onClick={() => handleSort('activeProjects')} className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50">Projects</th>
                <th onClick={() => handleSort('totalReports')} className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50">Reports</th>
                <th onClick={() => handleSort('supportSignal')} className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50">Status Signal</th>
                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedPerformance.map((club) => (
                <tr key={club.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-bold text-gray-900">{club.name}</div>
                        <div className="text-xs text-gray-500">{club.category}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {club.memberCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {club.eventCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {club.latestEventDate ? new Date(club.latestEventDate).toLocaleDateString() : 'None'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    <span title="Active Projects">{club.activeProjects}</span> / <span title="Completed Projects" className="text-green-600">{club.completedProjects}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {club.totalReports} total {club.pendingReports > 0 && <span className="text-red-500 font-medium">({club.pendingReports} pending)</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getSignalBadge(club.supportSignal)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      onClick={() => navigate(`/clubs/${club.id}`)}
                      className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors flex items-center justify-end gap-1 ml-auto"
                    >
                      Workspace <ArrowRight className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {sortedPerformance.length === 0 && (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                    No club performance data available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
