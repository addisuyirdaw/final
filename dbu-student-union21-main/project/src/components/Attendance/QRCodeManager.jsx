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
  Square,
  Search,
  CheckCircle2,
  XCircle,
  Calendar,
} from 'lucide-react';
import toast from 'react-hot-toast';

export function QRCodeManager({ defaultClubId = null, defaultEventId = null }) {
  const { user } = useAuth();
  const [clubs, setClubs] = useState([]);
  const [selectedClubId, setSelectedClubId] = useState(defaultClubId || '');
  const [clubEvents, setClubEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(defaultEventId || '');
  const [customTitle, setCustomTitle] = useState('');
  const [validMinutes, setValidMinutes] = useState(30);
  const [hoursCredit, setHoursCredit] = useState(1);
  const [generating, setGenerating] = useState(false);

  // Active session state
  const [session, setSession] = useState(null);
  const [currentChallenge, setCurrentChallenge] = useState('');
  const [challengeSecondsLeft, setChallengeSecondsLeft] = useState(20);
  const [presentCount, setPresentCount] = useState(0);
  const [recentCheckins, setRecentCheckins] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [endingSession, setEndingSession] = useState(false);

  // Detailed Roster Modal
  const [showRosterModal, setShowRosterModal] = useState(false);
  const [rosterTab, setRosterTab] = useState('present'); // 'present' | 'not_yet'
  const [rosterData, setRosterData] = useState({ attendees: [], notYet: [] });
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [rosterSearch, setRosterSearch] = useState('');

  const qrContainerRef = useRef(null);

  // 1. Load clubs the user can manage
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

  // 2. Load eligible events when selected club changes
  useEffect(() => {
    if (!selectedClubId) {
      setClubEvents([]);
      setSelectedEventId('');
      return;
    }

    async function loadEvents() {
      try {
        const res = await apiService.getClubAttendanceEvents(selectedClubId);
        if (res.success && res.events) {
          setClubEvents(res.events);
          if (res.events.length > 0 && !selectedEventId) {
            setSelectedEventId(res.events[0]._id);
          } else if (res.events.length === 0) {
            setSelectedEventId('');
          }
        }
      } catch (err) {
        // Non-fatal if club has no events or user is general admin
        setClubEvents([]);
      }
    }
    loadEvents();
  }, [selectedClubId]);

  // 3. Overall Session Countdown Timer
  useEffect(() => {
    if (!session || !session.expiresAt || !session.isActive) return;

    function updateTimer() {
      const remaining = Math.max(0, Math.floor((new Date(session.expiresAt).getTime() - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0 && session.isActive) {
        setSession((prev) => (prev ? { ...prev, isActive: false } : null));
      }
    }

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [session?.expiresAt, session?.isActive]);

  // 4. Lightweight Summary & Rotating Challenge Polling (Every 6 seconds)
  useEffect(() => {
    if (!session?.sessionToken || !session?.isActive) return;

    async function fetchSummary() {
      try {
        const res = await apiService.getAttendanceSummary(session.sessionToken);
        if (res.success) {
          setPresentCount(res.presentCount || 0);
          setRecentCheckins(res.recentCheckins || []);
          if (res.currentChallenge) {
            setCurrentChallenge(res.currentChallenge);
          }
          if (res.challengeExpiresIn) {
            setChallengeSecondsLeft(res.challengeExpiresIn);
          }
          if (res.isActive === false && session.isActive) {
            setSession((prev) => (prev ? { ...prev, isActive: false } : null));
            toast.error('This attendance session has ended.');
          }
        }
      } catch (err) {
        console.warn('Session summary poll note:', err.message);
      }
    }

    fetchSummary();
    const pollInterval = setInterval(fetchSummary, 6000);
    return () => clearInterval(pollInterval);
  }, [session?.sessionToken, session?.isActive]);

  // 5. Local 1-second Countdown for 20-second Rotating Challenge Progress Ring
  useEffect(() => {
    if (!session?.isActive) return;

    const timer = setInterval(() => {
      setChallengeSecondsLeft((prev) => (prev > 1 ? prev - 1 : 20));
    }, 1000);

    return () => clearInterval(timer);
  }, [session?.isActive]);

  // Launch / Start Attendance
  const handleLaunchAttendance = async (e) => {
    e?.preventDefault();
    try {
      setGenerating(true);
      let res = null;

      if (selectedClubId && selectedEventId) {
        // Official Event-Linked Route
        res = await apiService.startEventAttendance(selectedClubId, selectedEventId, {
          validMinutes: parseInt(validMinutes, 10),
        });
      } else {
        // Fallback / Institutional General Meeting
        res = await apiService.generateAttendanceQR({
          clubId: selectedClubId || undefined,
          eventTitle: customTitle.trim() || 'DBU Campus Event',
          validMinutes: parseInt(validMinutes, 10),
          hoursCredit: parseFloat(hoursCredit),
        });
      }

      if (res.success && res.session) {
        setSession(res.session);
        setCurrentChallenge(res.session.currentChallenge || '');
        setChallengeSecondsLeft(res.session.challengeExpiresIn || 20);
        setPresentCount(0);
        setRecentCheckins([]);
        toast.success(`Live attendance session active for "${res.session.eventTitle}"!`);
      }
    } catch (err) {
      console.error('Launch attendance error:', err);
      toast.error(err.message || 'Failed to start attendance session');
    } finally {
      setGenerating(false);
    }
  };

  // End Attendance Session Early
  const handleEndAttendance = async () => {
    if (!session?.sessionToken) return;
    if (!window.confirm('Are you sure you want to end attendance now? This will immediately lock check-in.')) {
      return;
    }

    try {
      setEndingSession(true);
      const res = await apiService.closeAttendanceSession(session.sessionToken);
      if (res.success) {
        setSession((prev) => (prev ? { ...prev, isActive: false } : null));
        toast.success('Attendance session closed. No further check-ins will be accepted.');
      }
    } catch (err) {
      console.error('End session error:', err);
      toast.error(err.message || 'Failed to close attendance session');
    } finally {
      setEndingSession(false);
    }
  };

  // Fetch detailed roster for modal
  const handleOpenRoster = async () => {
    if (!session?.sessionToken) return;
    try {
      setLoadingRoster(true);
      setShowRosterModal(true);
      const res = await apiService.getAttendanceRoster(session.sessionToken);
      if (res.success) {
        setRosterData({
          attendees: res.attendees || [],
          notYet: res.notYet || [],
        });
      }
    } catch (err) {
      console.error('Fetch roster error:', err);
      toast.error(err.message || 'Failed to load attendee roster');
    } finally {
      setLoadingRoster(false);
    }
  };

  const handleCopyCode = () => {
    if (!session?.shortCode) return;
    navigator.clipboard.writeText(session.shortCode);
    setCopied(true);
    toast.success(`Copied check-in code: ${session.shortCode}`);
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

  // Build the rotating QR scan URL
  const qrScanUrl = session
    ? `${window.location.origin}/attendance?token=${encodeURIComponent(session.sessionToken)}${
        currentChallenge ? `&c=${encodeURIComponent(currentChallenge)}` : ''
      }`
    : '';

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-sky-800 via-blue-700 to-indigo-900 text-white p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Unified Event Attendance & Rotating QR
            </div>
            <h2 className="text-2xl font-bold">QR Attendance Manager</h2>
            <p className="text-sky-100 text-sm mt-1">
              Project dynamic, short-lived rotating QR codes for approved events with live attendee roster verification.
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
            <form onSubmit={handleLaunchAttendance} className="space-y-4">
              {/* Club Selector */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Hosting Club or Organization
                </label>
                <select
                  value={selectedClubId}
                  onChange={(e) => setSelectedClubId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all"
                >
                  <option value="">General DBU Event / University Body</option>
                  {clubs.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} ({c.category})
                    </option>
                  ))}
                </select>
              </div>

              {/* Event Picker if Club Selected */}
              {selectedClubId && clubEvents.length > 0 ? (
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Select Approved Event</span>
                    <span className="text-[10px] text-sky-600 font-normal">
                      {clubEvents.length} eligible event{clubEvents.length !== 1 ? 's' : ''}
                    </span>
                  </label>
                  <select
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all"
                  >
                    {clubEvents.map((ev) => (
                      <option key={ev._id} value={ev._id}>
                        {ev.title} ({new Date(ev.date).toLocaleDateString()} · {ev.status.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>
              ) : selectedClubId ? (
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Meeting / Activity Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="e.g. Weekly Club Assembly"
                    required
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all"
                  />
                  <p className="text-[11px] text-amber-700 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    No scheduled events found for this club. Creating a general session.
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Campus Event Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="e.g. Campus Leadership Summit"
                    required
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all"
                  />
                </div>
              )}

              {/* Session Duration & Hours */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-sky-600" />
                    Window Duration
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
                    Transcript Hours
                  </label>
                  <input
                    type="text"
                    disabled={Boolean(selectedEventId)}
                    value={selectedEventId ? 'Derived from event' : `${hoursCredit} hr`}
                    onChange={(e) => setHoursCredit(parseFloat(e.target.value) || 1)}
                    className="w-full px-3.5 py-2.5 bg-gray-100 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={generating}
                className="w-full mt-2 inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-sky-700 hover:bg-sky-800 disabled:bg-gray-400 text-white font-bold rounded-xl transition-all shadow-sm hover:shadow-md"
              >
                {generating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Starting Attendance Session...
                  </>
                ) : (
                  <>
                    <QrCode className="w-4 h-4" />
                    {session?.isActive ? 'Refresh / Re-Launch Session' : 'Start Attendance Session'}
                  </>
                )}
              </button>
            </form>

            {/* Live Metrics & Session Controls */}
            {session && (
              <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      <Users className="w-4 h-4 text-sky-600" />
                      Live Attendance Stats
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">Real-time check-in stream</p>
                  </div>
                  <button
                    onClick={handleOpenRoster}
                    className="text-xs font-bold text-sky-700 hover:text-sky-800 hover:underline inline-flex items-center gap-1"
                  >
                    View Full Roster &rarr;
                  </button>
                </div>

                {/* Counter & Status */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-white rounded-xl border border-gray-200 text-center">
                    <span className="text-2xl font-black text-sky-700">{presentCount}</span>
                    <span className="text-[10px] block uppercase font-bold text-gray-500 mt-0.5">
                      Present
                    </span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-gray-200 text-center">
                    <span
                      className={`text-2xl font-black ${
                        session.isActive && timeLeft > 0 ? 'text-emerald-600' : 'text-red-600'
                      }`}
                    >
                      {session.isActive && timeLeft > 0 ? formatSeconds(timeLeft) : 'Closed'}
                    </span>
                    <span className="text-[10px] block uppercase font-bold text-gray-500 mt-0.5">
                      {session.isActive && timeLeft > 0 ? 'Time Left' : 'Status'}
                    </span>
                  </div>
                </div>

                {/* Recent Check-ins Ticker */}
                {recentCheckins.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-gray-200 text-xs">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Recent Check-ins:</span>
                    {recentCheckins.slice(0, 3).map((rc) => (
                      <div key={rc.id} className="flex items-center justify-between text-gray-700 py-1">
                        <span className="font-semibold flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          {rc.name}
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono">
                          {new Date(rc.scannedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* End Attendance Button */}
                {session.isActive && (
                  <button
                    type="button"
                    onClick={handleEndAttendance}
                    disabled={endingSession}
                    className="w-full mt-2 inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-colors shadow-sm disabled:opacity-50"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    {endingSession ? 'Closing Attendance...' : 'End Attendance (Lock Session)'}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* QR Display Column */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center">
            {session ? (
              <div
                ref={qrContainerRef}
                className={`w-full flex flex-col items-center justify-center rounded-2xl p-6 md:p-8 text-center transition-all ${
                  isFullscreen
                    ? 'bg-slate-900 text-white min-h-screen justify-center'
                    : 'bg-gradient-to-b from-sky-50/70 to-indigo-50/70 border-2 border-dashed border-sky-300'
                }`}
              >
                {/* Header Strip */}
                <div className="mb-4">
                  {session.isActive ? (
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full mb-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                      ATTENDANCE ACTIVE
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-full mb-2">
                      <XCircle className="w-3.5 h-3.5" />
                      ATTENDANCE CLOSED
                    </span>
                  )}
                  <h3
                    className={`text-xl md:text-2xl font-black ${
                      isFullscreen ? 'text-white' : 'text-gray-900'
                    }`}
                  >
                    {session.eventTitle}
                  </h3>
                  <p className={`text-xs mt-0.5 ${isFullscreen ? 'text-sky-200' : 'text-gray-500'}`}>
                    {session.clubName} • {session.hoursCredit} Co-Curricular Hr{session.hoursCredit !== 1 ? 's' : ''}
                  </p>
                </div>

                {/* The Rotating QR Code Card */}
                {session.isActive ? (
                  <div className="p-6 bg-white rounded-3xl shadow-2xl border-4 border-sky-100 mb-4 flex flex-col items-center">
                    <QRCode
                      value={qrScanUrl}
                      size={isFullscreen ? 320 : 250}
                      level="H"
                      style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                    />

                    {/* Rotating Challenge Progress Bar */}
                    <div className="mt-4 w-full flex flex-col items-center gap-1">
                      <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-sky-600 h-1.5 rounded-full transition-all duration-1000 ease-linear"
                          style={{ width: `${(challengeSecondsLeft / 20) * 100}%` }}
                        ></div>
                      </div>
                      <div className="flex items-center justify-between w-full text-[10px] text-gray-500 font-semibold px-1 mt-0.5">
                        <span className="flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" /> Rotating Anti-Proxy QR
                        </span>
                        <span className="font-mono text-sky-700">{challengeSecondsLeft}s</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-12 bg-white rounded-3xl border-2 border-red-200 shadow-sm mb-4 text-center max-w-sm">
                    <XCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                    <h4 className="text-base font-bold text-gray-900">Attendance Has Ended</h4>
                    <p className="text-xs text-gray-500 mt-1">
                      This session is closed. No new check-ins are being accepted.
                    </p>
                  </div>
                )}

                {/* Backup Check-In Code & Live Counter */}
                <div className="w-full max-w-sm flex items-center justify-between gap-3 mb-4">
                  {/* Code */}
                  <div
                    className={`flex-1 p-3 rounded-xl border text-left flex items-center justify-between ${
                      isFullscreen ? 'bg-slate-800 border-slate-700' : 'bg-white border-sky-200'
                    }`}
                  >
                    <div>
                      <span
                        className={`text-[9px] uppercase font-bold tracking-wider block ${
                          isFullscreen ? 'text-gray-400' : 'text-gray-400'
                        }`}
                      >
                        Check-In Code
                      </span>
                      <span className="text-xl font-mono font-extrabold text-sky-600 tracking-widest">
                        {session.shortCode}
                      </span>
                    </div>
                    <button
                      onClick={handleCopyCode}
                      className="p-1.5 hover:bg-sky-50 rounded-lg text-sky-700 transition-colors"
                      title="Copy code"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Present Pill */}
                  <div
                    className={`px-4 py-3 rounded-xl border text-center ${
                      isFullscreen ? 'bg-slate-800 border-slate-700' : 'bg-white border-sky-200'
                    }`}
                  >
                    <span
                      className={`text-[9px] uppercase font-bold tracking-wider block ${
                        isFullscreen ? 'text-gray-400' : 'text-gray-400'
                      }`}
                    >
                      Present
                    </span>
                    <span className="text-xl font-bold text-emerald-600">{presentCount}</span>
                  </div>
                </div>

                {/* Projector Controls Strip */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleOpenRoster}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                      isFullscreen
                        ? 'bg-slate-800 hover:bg-slate-700 text-white'
                        : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200'
                    }`}
                  >
                    View Roster ({presentCount})
                  </button>

                  {session.isActive && (
                    <button
                      onClick={handleEndAttendance}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors"
                    >
                      End Attendance
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="w-full h-96 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center bg-gray-50">
                <div className="w-16 h-16 rounded-2xl bg-sky-50 flex items-center justify-center text-sky-600 mb-4 shadow-sm">
                  <QrCode className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-1">No Active Attendance Session</h3>
                <p className="text-sm text-gray-500 max-w-sm mb-6">
                  Select your club and approved event on the left, then click{' '}
                  <strong className="text-sky-700">"Start Attendance Session"</strong> to launch the live rotating QR challenge.
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Includes 20-second dynamic rotating QR and auditorium projector mode
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Attendee Roster Modal */}
      {showRosterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{session?.eventTitle}</h3>
                <p className="text-xs text-gray-500">Official Attendance Roster</p>
              </div>
              <button
                onClick={() => setShowRosterModal(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Tabs & Search */}
            <div className="px-5 pt-3 pb-2 border-b border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex gap-2">
                <button
                  onClick={() => setRosterTab('present')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    rosterTab === 'present'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Present ({rosterData.attendees.length})
                </button>
                <button
                  onClick={() => setRosterTab('not_yet')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    rosterTab === 'not_yet'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Not Yet ({rosterData.notYet.length})
                </button>
              </div>

              <div className="relative w-full sm:w-60">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search student..."
                  value={rosterSearch}
                  onChange={(e) => setRosterSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-sky-500 focus:bg-white"
                />
              </div>
            </div>

            {/* List Body */}
            <div className="p-5 overflow-y-auto flex-1 divide-y divide-gray-100 text-xs">
              {loadingRoster ? (
                <div className="py-12 flex flex-col items-center justify-center text-gray-400">
                  <RefreshCw className="w-6 h-6 animate-spin mb-2 text-sky-600" />
                  <p>Loading roster...</p>
                </div>
              ) : rosterTab === 'present' ? (
                rosterData.attendees.length === 0 ? (
                  <p className="text-center py-10 text-gray-400 italic">No attendees checked in yet.</p>
                ) : (
                  rosterData.attendees
                    .filter((a) => {
                      const name = a.studentId?.name || '';
                      const id = a.studentId?.username || '';
                      return (
                        name.toLowerCase().includes(rosterSearch.toLowerCase()) ||
                        id.toLowerCase().includes(rosterSearch.toLowerCase())
                      );
                    })
                    .map((item, idx) => (
                      <div key={item._id || idx} className="py-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          <div>
                            <p className="font-bold text-gray-800">{item.studentId?.name || 'Student'}</p>
                            <p className="text-[11px] text-gray-400 font-mono">
                              {item.studentId?.username?.toUpperCase()} • {item.studentId?.department || 'DBU'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="inline-block px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded">
                            Present
                          </span>
                          <span className="text-[10px] text-gray-400 block mt-0.5 font-mono">
                            {new Date(item.scannedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    ))
                )
              ) : rosterData.notYet.length === 0 ? (
                <p className="text-center py-10 text-gray-400 italic">
                  All eligible members have recorded attendance.
                </p>
              ) : (
                rosterData.notYet
                  .filter((m) => {
                    const name = m.fullName || '';
                    return name.toLowerCase().includes(rosterSearch.toLowerCase());
                  })
                  .map((m, idx) => (
                    <div key={m.userId || idx} className="py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="w-2 h-2 rounded-full bg-gray-300"></span>
                        <div>
                          <p className="font-semibold text-gray-800">{m.fullName}</p>
                          <p className="text-[11px] text-gray-400">
                            {m.department} • {m.year}
                          </p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold rounded">
                        Not Yet
                      </span>
                    </div>
                  ))
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
              <span>{rosterData.attendees.length} verified attendees</span>
              <button
                onClick={() => setShowRosterModal(false)}
                className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 font-bold rounded-lg text-gray-700 transition-colors"
              >
                Close Roster
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
