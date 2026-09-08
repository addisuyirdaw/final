/** @format */
import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { AttendanceScanner } from '../Attendance/AttendanceScanner';
import { QRCodeManager } from '../Attendance/QRCodeManager';
import { QrCode, Camera, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';

export function AttendanceHub() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('scanner'); // 'scanner' | 'manager'

  const canManageSessions =
    user?.isAdmin ||
    ['admin', 'superadmin', 'clubs_coordinator', 'academic_affairs', 'president', 'vice_president', 'officer'].includes(
      user?.role
    );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Header & Navigation Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">Attendance & Co-Curricular Hub</h1>
          <p className="text-gray-500 text-sm mt-1">
            Dynamic QR session management and verified co-curricular check-in system
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/transcript"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-sky-50 text-sky-800 hover:bg-sky-100 rounded-xl text-sm font-bold border border-sky-200 transition-colors"
          >
            <FileText className="w-4 h-4 text-sky-700" />
            My Transcript
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-8">
        <button
          onClick={() => setActiveTab('scanner')}
          className={`pb-3.5 px-6 font-bold text-sm flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'scanner'
              ? 'border-sky-600 text-sky-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Camera className="w-4 h-4" />
          Student Check-In Scanner
        </button>

        {canManageSessions && (
          <button
            onClick={() => setActiveTab('manager')}
            className={`pb-3.5 px-6 font-bold text-sm flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'manager'
                ? 'border-sky-600 text-sky-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <QrCode className="w-4 h-4" />
            Live QR Session Generator
            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] uppercase font-black rounded-full">
              Host
            </span>
          </button>
        )}
      </div>

      {/* Tab Panels */}
      {activeTab === 'scanner' ? <AttendanceScanner /> : <QRCodeManager />}
    </div>
  );
}
