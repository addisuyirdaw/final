import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { Calendar, ChevronLeft, ChevronRight, CheckCircle, XCircle, Search } from 'lucide-react';

export function DailyAttendanceRegister({ selectedClubId }) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [registerData, setRegisterData] = useState({ stats: null, register: [] });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!selectedClubId) return;

    const fetchDailyRegister = async () => {
      try {
        setLoading(true);
        // Using apiService.request directly since the endpoint is /api/attendance/club/:clubId/daily
        const res = await apiService.request(`/attendance/club/${selectedClubId}/daily?date=${selectedDate}`);
        if (res.success) {
          setRegisterData({ stats: res.stats, register: res.register || [] });
        }
      } catch (err) {
        console.error('Fetch daily register error:', err);
        setRegisterData({ stats: null, register: [] });
      } finally {
        setLoading(false);
      }
    };

    fetchDailyRegister();
  }, [selectedClubId, selectedDate]);

  const changeDate = (days) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const filteredRegister = registerData.register.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (r.studentId && r.studentId.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (!selectedClubId) {
    return null;
  }

  return (
    <div className="mt-8 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header & Date Picker */}
      <div className="p-6 border-b border-gray-200 bg-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-sky-600" /> Daily Attendance Register
          </h3>
          <p className="text-sm text-gray-500 mt-1">Review the roster and check-ins for specific dates.</p>
        </div>
        
        <div className="flex items-center bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <button onClick={() => changeDate(-1)} className="p-2.5 hover:bg-gray-50 transition-colors text-gray-500">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 border-x border-gray-200 text-sm font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-sky-500/20"
          />
          <button onClick={() => changeDate(1)} className="p-2.5 hover:bg-gray-50 transition-colors text-gray-500">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {registerData.stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-white border-b border-gray-100">
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 flex flex-col items-center justify-center text-center">
            <span className="text-gray-500 text-[11px] uppercase font-bold tracking-wider mb-1">Total Roster</span>
            <span className="text-2xl font-black text-gray-900">{registerData.stats.totalMembers}</span>
          </div>
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 flex flex-col items-center justify-center text-center">
            <span className="text-emerald-600 text-[11px] uppercase font-bold tracking-wider mb-1">Present</span>
            <span className="text-2xl font-black text-emerald-700">{registerData.stats.presentCount}</span>
          </div>
          <div className="p-4 rounded-xl bg-red-50 border border-red-100 flex flex-col items-center justify-center text-center">
            <span className="text-red-600 text-[11px] uppercase font-bold tracking-wider mb-1">Absent</span>
            <span className="text-2xl font-black text-red-700">{registerData.stats.absentCount}</span>
          </div>
          <div className="p-4 rounded-xl bg-sky-50 border border-sky-100 flex flex-col items-center justify-center text-center">
            <span className="text-sky-600 text-[11px] uppercase font-bold tracking-wider mb-1">Attendance Rate</span>
            <span className="text-2xl font-black text-sky-700">{registerData.stats.attendanceRate}</span>
          </div>
        </div>
      )}

      {/* Roster Table */}
      <div className="p-6">
        <div className="relative max-w-sm mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
          />
        </div>

        {loading ? (
          <div className="py-12 text-center text-gray-400 animate-pulse">Loading register...</div>
        ) : registerData.register.length === 0 || (registerData.stats?.presentCount === 0 && registerData.stats?.absentCount === 0) ? (
          <div className="py-12 text-center text-gray-400">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-base font-semibold text-gray-600">No attendance session scheduled or recorded for this date.</p>
            <p className="text-sm mt-1 text-gray-400">Select another date or ensure you have active members.</p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-gray-200 rounded-xl">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-3">Student</th>
                  <th className="px-6 py-3 text-center">Status</th>
                  <th className="px-6 py-3 text-right">Time Checked In</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRegister.map((student, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3.5">
                      <div className="font-semibold text-gray-900">{student.name}</div>
                      <div className="text-[11px] text-gray-500 font-mono mt-0.5">{student.studentId?.toUpperCase()}</div>
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold ${
                        student.status === 'PRESENT' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {student.status === 'PRESENT' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {student.status}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right font-mono text-xs text-gray-500">
                      {student.checkInTime ? new Date(student.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredRegister.length === 0 && (
              <div className="p-6 text-center text-sm text-gray-500">No students match your search.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
