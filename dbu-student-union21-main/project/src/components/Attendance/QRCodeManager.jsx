/** @format */
import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'react-qr-code';
import { apiService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import {
  QrCode,
  Clock,
  Users,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  RefreshCw,
  Sparkles,
  Award,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

export function QRCodeManager({ defaultClubId = null, defaultEventTitle = '' }) {
  const { user } = useAuth();
  const [clubs, setClubs] = useState([]);
  const [selectedClubId, setSelectedClubId] = useState(defaultClubId || '');
  const [eventTitle, setEventTitle] = useState(defaultEventTitle || '');
  const [validMinutes, setValidMinutes] = useState(30);
  const [hoursCredit, setHoursCredit] = useState(1);
  const [generating, setGenerating] = useState(false);

  // Active session state
  const [session, setSession] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [roster, setRoster] = useState([]);
  const [loadingRoster, setLoadingRoster] = useState(false);

  const qrContainerRef = useRef(null);

  // Load clubs user can manage
  useEffect(() => {
    async function loadUserClubs() {
      try {
        const res = await apiService.getClubs();
        const clubList = res.clubs || res.data || (Array.isArray(res) ? res : []);
        setClubs(clubList);
        if (!selectedClubId && clubList.length > 0) {
          setSelectedClubId(clubList[0]._id);
        }
      } catch (err) {
        console.warn('Could not load clubs for QR manager:', err.message);
      }
    }
    loadUserClubs();
  }, []);

  // Countdown timer for active session
  useEffect(() => {
    if (!session || !session.expiresAt) return;

    function updateTimer() {
      const remaining = Math.max(0, Math.floor((new Date(session.expiresAt).getTime() - Date.now()) / 1000));
      setTimeLeft(remaining);
    }

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [session]);

  // Poll live attendee roster when session is active
  useEffect(() => {
    if (!session?.sessionToken) return;

    async function fetchRoster() {
      try {
        setLoadingRoster(true);
        const res = await apiService.getAttendanceRoster(session.sessionToken);
        if (res.success && res.attendees) {
          setRoster(res.attendees);
        }
      } catch (err) {
        console.warn('Roster fetch note:', err.message);
      } finally {
        setLoadingRoster(false);
      }
    }

    fetchRoster();
    const rosterInterval = setInterval(fetchRoster, 8000); // Poll every 8s
    return () => clearInterval(rosterInterval);
  }, [session?.sessionToken]);

  const handleGenerate = async (e) => {
    e?.preventDefault();
    try {
      setGenerating(true);
      const res = await apiService.generateAttendanceQR({
        clubId: selectedClubId || undefined,
        eventTitle: eventTitle.trim() || 'General Club Session',
        validMinutes: parseInt(validMinutes, 10),
        hoursCredit: parseFloat(hoursCredit),
      });

      if (res.success && res.session) {
        setSession(res.session);
        setRoster([]);
        toast.success('Live attendance QR session created!');
      }
    } catch (err) {
      console.error('QR generation error:', err);
      toast.error(err.message || 'Failed to generate attendance QR code');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyCode = () => {
    if (!session?.shortCode) return;
    navigator.clipboard.writeText(session.shortCode);
    setCopied(true);
    toast.success(`Copied code: ${session.shortCode}`);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleFullscreen = () => {
    if (!qrContainerRef.current) return;
    if (!document.fullscreenElement) {
      qrContainerRef.current.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const formatSeconds = (sec) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-sky-700 via-blue-700 to-indigo-800 text-white p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Dynamic Session Generator
            </div>
            <h2 className="text-2xl font-bold">QR Attendance Manager</h2>
            <p className="text-sky-100 text-sm mt-1">
              Project live QR codes on auditoriums and screens for instant student check-in and co-curricular credit.
            </p>
          </div>
          {session && (
            <div className="flex items-center gap-2">
              <button
                onClick={toggleFullscreen}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/15 hover:bg-white/25 rounded-xl text-sm font-semibold transition-colors"
                title="Toggle Auditorium Projector Mode"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                {isFullscreen ? 'Exit Projector' : 'Projector Mode'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="p-6 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Controls Column */}
          <div className="lg:col-span-5 space-y-6">
            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Hosting Club or Body
                </label>
                <select
                  value={selectedClubId}
                  onChange={(e) => setSelectedClubId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all"
                >
                  <option value="">General DBU Student Union Event</option>
                  {clubs.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} ({c.category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Event / Meeting Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="e.g. AI & Robotics Weekly Workshop"
                  required
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-sky-600" />
                    Validity
                  </label>
                  <select
                    value={validMinutes}
                    onChange={(e) => setValidMinutes(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all"
                  >
                    <option value={15}>15 Minutes</option>
                    <option value={30}>30 Minutes</option>
                    <option value={45}>45 Minutes</option>
                    <option value={60}>1 Hour</option>
                    <option value={120}>2 Hours</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-amber-500" />
                    Hours Credit
                  </label>
                  <select
                    value={hoursCredit}
                    onChange={(e) => setHoursCredit(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all"
                  >
                    <option value={0.5}>0.5 Hour</option>
                    <option value={1}>1.0 Hour</option>
                    <option value={1.5}>1.5 Hours</option>
                    <option value={2}>2.0 Hours</option>
                    <option value={3}>3.0 Hours</option>
                    <option value={4}>4.0 Hours</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={generating}
                className="w-full mt-2 inline-flex items-center justify-center gap-2 px-6 py-3 bg-sky-700 hover:bg-sky-800 disabled:bg-gray-400 text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-lg"
              >
                {generating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Generating Session...
                  </>
                ) : (
                  <>
                    <QrCode className="w-4 h-4" />
                    {session ? 'Refresh / Re-generate QR' : 'Launch Attendance Session'}
                  </>
                )}
              </button>
            </form>

            {/* Live Attendees Panel */}
            {session && (
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-gray-800">
                    <Users className="w-4 h-4 text-sky-600" />
                    Live Attendee Roster
                    <span className="px-2 py-0.5 bg-sky-100 text-sky-700 text-xs font-semibold rounded-full">
                      {roster.length} Checked In
                    </span>
                  </div>
                  {loadingRoster && <RefreshCw className="w-3.5 h-3.5 text-gray-400 animate-spin" />}
                </div>

                {roster.length === 0 ? (
                  <p className="text-xs text-gray-500 py-3 text-center italic">
                    Waiting for students to scan QR or enter code...
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {roster.map((item, idx) => (
                      <div
                        key={item._id || idx}
                        className="flex items-center justify-between text-xs bg-white p-2 rounded-lg border border-gray-100"
                      >
                        <div>
                          <p className="font-semibold text-gray-800">{item.studentId?.name || 'Student'}</p>
                          <p className="text-gray-400 font-mono text-[10px]">{item.studentId?.username?.toUpperCase()}</p>
                        </div>
                        <div className="text-right">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                            <ShieldCheck className="w-3 h-3" />
                            +{item.hoursCredit} hr
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* QR Display Column */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center">
            {session ? (
              <div
                ref={qrContainerRef}
                className="w-full flex flex-col items-center justify-center bg-gradient-to-b from-sky-50/50 to-indigo-50/50 border-2 border-dashed border-sky-300 rounded-2xl p-6 md:p-8 text-center"
              >
                <div className="mb-4">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full mb-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                    SESSION ACTIVE
                  </span>
                  <h3 className="text-xl font-bold text-gray-900">{session.eventTitle}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{session.clubName}</p>
                </div>

                {/* The QR Code Card */}
                {(() => {
                  const scanUrl = `${window.location.origin}/attendance?token=${encodeURIComponent(session.sessionToken)}&code=${encodeURIComponent(session.shortCode)}&title=${encodeURIComponent(session.eventTitle)}&club=${encodeURIComponent(session.clubName)}&hours=${session.hoursCredit}`;
                  return (
                    <div className="p-5 bg-white rounded-2xl shadow-xl border-4 border-sky-100 mb-5 relative group flex flex-col items-center">
                      <QRCode
                        value={scanUrl}
                        size={250}
                        level="H"
                        style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                      />
                      <div className="mt-3 text-[11px] font-semibold text-gray-500 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        Scan with any Phone Camera or DBU Scanner
                      </div>

                      {/* Direct Scan Link Copy Button */}
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(scanUrl);
                          toast.success('Direct Check-In URL copied!');
                        }}
                        className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-semibold rounded-lg transition-colors border border-sky-200"
                        title={scanUrl}
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Copy Direct Check-In Link
                      </button>
                    </div>
                  );
                })()}

                {/* 6-Character Manual Fallback Code */}
                <div className="w-full max-w-sm bg-white p-4 rounded-xl border border-sky-200 shadow-sm flex items-center justify-between gap-4 mb-4">
                  <div className="text-left">
                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                      Backup 6-Digit Code
                    </p>
                    <p className="text-2xl font-mono font-extrabold text-sky-700 tracking-widest">
                      {session.shortCode}
                    </p>
                  </div>
                  <button
                    onClick={handleCopyCode}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-sky-50 hover:bg-sky-100 text-sky-700 font-semibold rounded-lg text-xs transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>

                {/* Countdown Timer */}
                <div className="flex items-center gap-6 text-xs text-gray-600">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-sky-600" />
                    <span>
                      Time Left:{' '}
                      <strong className={timeLeft < 180 ? 'text-red-600 font-mono text-sm' : 'font-mono text-sm'}>
                        {timeLeft > 0 ? formatSeconds(timeLeft) : 'EXPIRED'}
                      </strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-amber-500" />
                    <span>
                      Credit: <strong>{session.hoursCredit} Co-Curricular Hours</strong>
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full h-96 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center bg-gray-50">
                <div className="w-16 h-16 rounded-2xl bg-sky-50 flex items-center justify-center text-sky-600 mb-4 shadow-sm">
                  <QrCode className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-1">No Active Session</h3>
                <p className="text-sm text-gray-500 max-w-sm mb-6">
                  Select your club or enter an event title on the left, then click{' '}
                  <strong className="text-sky-700">"Launch Attendance Session"</strong> to generate your dynamic QR code.
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <AlertCircle className="w-4 h-4" />
                  Supports projector display & live attendance tracking
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
