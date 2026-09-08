/** @format */
import React, { useState, useEffect, useRef } from 'react';
import { apiService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Link, useSearchParams } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Camera,
  QrCode,
  KeyRound,
  CheckCircle2,
  Clock,
  Award,
  Sparkles,
  ArrowRight,
  RefreshCw,
  FileText,
  AlertCircle,
  VideoOff,
  ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';

export function AttendanceScanner() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const urlToken = searchParams.get('token');
  const urlCode = searchParams.get('code');

  const [activeTab, setActiveTab] = useState(urlCode || urlToken ? 'code' : 'camera');
  const [manualCode, setManualCode] = useState(urlCode ? urlCode.toUpperCase() : '');
  const [submitting, setSubmitting] = useState(false);
  const [lastCheckIn, setLastCheckIn] = useState(null);

  // Mobile Camera state
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const html5QrCodeRef = useRef(null);
  const autoCheckedRef = useRef(false);

  // Student recent attendance history
  const [recentAttendance, setRecentAttendance] = useState([]);
  const [totalHours, setTotalHours] = useState(0);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const fetchHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await apiService.getMyAttendance();
      if (res.success) {
        setRecentAttendance(res.records || []);
        setTotalHours(res.totalHours || 0);
      }
    } catch (err) {
      console.warn('Failed to load attendance history:', err.message);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Fix: Auto-checkin if opened via phone camera scanning action URL (?token=...&code=...)
  useEffect(() => {
    if ((urlToken || urlCode) && user && !autoCheckedRef.current) {
      autoCheckedRef.current = true;
      if (urlCode) setManualCode(urlCode.toUpperCase());

      const autoVerify = async () => {
        try {
          setSubmitting(true);
          const res = await apiService.scanAttendance({
            sessionToken: urlToken || undefined,
            code: urlCode ? urlCode.toUpperCase() : undefined,
          });

          if (res.success) {
            setLastCheckIn(res);
            toast.success(res.message || 'Attendance verified from scan URL!');
            fetchHistory();
          } else {
            toast.error(res.message || 'Auto check-in failed');
          }
        } catch (err) {
          console.error('URL auto check-in error:', err);
          toast.error(err.message || 'Failed to verify attendance');
        } finally {
          setSubmitting(false);
        }
      };

      autoVerify();
    }
  }, [urlToken, urlCode, user]);

  // Mobile Camera Scanner via Html5Qrcode
  const stopScanner = async () => {
    try {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      }
    } catch (err) {
      console.warn('Error stopping scanner:', err);
    } finally {
      setCameraActive(false);
    }
  };

  const startScanner = async () => {
    setCameraError('');
    setCameraActive(false);

    // Give DOM time to mount reader element
    setTimeout(async () => {
      const readerElement = document.getElementById('dbu-qr-reader');
      if (!readerElement) return;

      try {
        if (!html5QrCodeRef.current) {
          html5QrCodeRef.current = new Html5Qrcode('dbu-qr-reader');
        }

        const qrCodeSuccessCallback = async (decodedText) => {
          // Pause camera and process
          if (navigator.vibrate) navigator.vibrate([80, 40, 80]);
          await stopScanner();
          handleProcessScan(decodedText);
        };

        const config = {
          fps: 15,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        };

        await html5QrCodeRef.current.start(
          { facingMode: 'environment' },
          config,
          qrCodeSuccessCallback,
          () => {} // silent scan frame error
        );

        setCameraActive(true);
      } catch (err) {
        console.error('Html5Qrcode start error:', err);
        setCameraError(
          'Camera access was denied or not supported on this device. Please use the 6-character check-in code instead.'
        );
        setCameraActive(false);
      }
    }, 150);
  };

  // Manage scanner lifecycle on tab switch and component unmount
  useEffect(() => {
    if (activeTab === 'camera') {
      startScanner();
    } else {
      stopScanner();
    }

    return () => {
      stopScanner();
    };
  }, [activeTab]);

  const handleProcessScan = async (qrPayload) => {
    try {
      setSubmitting(true);
      const res = await apiService.scanAttendance({ qrPayload });
      if (res.success) {
        setLastCheckIn(res);
        toast.success(res.message || 'Attendance confirmed!');
        fetchHistory();
      } else {
        toast.error(res.message || 'Scan verification failed');
      }
    } catch (err) {
      console.error('Scan processing error:', err);
      toast.error(err.message || 'Failed to verify attendance');
    } finally {
      setSubmitting(false);
    }
  };

  const handleManualSubmit = async (e) => {
    e?.preventDefault();
    const cleanCode = manualCode.trim().toUpperCase();
    if (!cleanCode || cleanCode.length < 4) {
      toast.error('Please enter a valid check-in code');
      return;
    }

    try {
      setSubmitting(true);
      const res = await apiService.scanAttendance({
        sessionToken: urlToken || undefined,
        code: cleanCode,
      });
      if (res.success) {
        setLastCheckIn(res);
        setManualCode('');
        toast.success(res.message || 'Attendance confirmed!');
        fetchHistory();
      } else {
        toast.error(res.message || 'Invalid check-in code');
      }
    } catch (err) {
      console.error('Manual code submission error:', err);
      toast.error(err.message || 'Check-in failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-sky-800 via-sky-700 to-indigo-800 text-white rounded-2xl p-6 md:p-8 shadow-sm">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            Verified Attendance & Co-Curricular Credits
          </div>
          <h1 className="text-2xl md:text-3xl font-bold">QR Attendance Check-In</h1>
          <p className="text-sky-100 text-sm mt-2 leading-relaxed">
            Verify your physical presence at university clubs, hackathons, seminars, and campus events.
            Every verified session adds directly to your official DBU Co-Curricular Transcript.
          </p>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/10 text-white">
          <div>
            <p className="text-xs text-sky-200 uppercase font-semibold">Total Verified Hours</p>
            <p className="text-2xl font-bold mt-0.5">{totalHours} hrs</p>
          </div>
          <div>
            <p className="text-xs text-sky-200 uppercase font-semibold">Sessions Attended</p>
            <p className="text-2xl font-bold mt-0.5">{recentAttendance.length}</p>
          </div>
          <div className="col-span-2 sm:col-span-1 flex items-end">
            <Link
              to="/transcript"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-sky-800 hover:bg-sky-50 rounded-xl text-xs font-bold transition-colors shadow-sm"
            >
              <FileText className="w-3.5 h-3.5" />
              View Transcript
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Check-In Action Card */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 mb-6">
            <button
              onClick={() => setActiveTab('camera')}
              className={`flex-1 pb-3 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-all ${
                activeTab === 'camera'
                  ? 'border-sky-600 text-sky-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Camera className="w-4 h-4" />
              Scan QR with Camera
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`flex-1 pb-3 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-all ${
                activeTab === 'code'
                  ? 'border-sky-600 text-sky-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <KeyRound className="w-4 h-4" />
              Enter Check-In Code
            </button>
          </div>

          {/* URL Detected Auto-Checkin Banner */}
          {urlCode && !lastCheckIn && (
            <div className="mb-6 p-4 bg-sky-50 border border-sky-200 rounded-xl text-sky-900 text-sm flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-sky-600 flex-shrink-0" />
                <span>
                  QR Scan Link detected: Code <strong>{urlCode.toUpperCase()}</strong>
                </span>
              </div>
              {submitting && <RefreshCw className="w-4 h-4 text-sky-600 animate-spin" />}
            </div>
          )}

          {/* Success Banner if just checked in */}
          {lastCheckIn && (
            <div className="mb-6 p-5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 text-sm">
                <p className="font-bold text-base">{lastCheckIn.message || 'Check-in Verified!'}</p>
                <p className="text-xs text-emerald-700 mt-1">
                  Credit: +{lastCheckIn.hoursEarned || 1} hr added to your co-curricular record.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    to="/transcript"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors"
                  >
                    View Updated Transcript <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <button
                    onClick={() => setLastCheckIn(null)}
                    className="text-xs text-emerald-800 underline hover:text-emerald-900 font-semibold"
                  >
                    Check In Another Session
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tab 1: Camera Scanner */}
          {activeTab === 'camera' && (
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="relative w-full max-w-sm aspect-square bg-gray-900 rounded-2xl overflow-hidden shadow-inner flex flex-col items-center justify-center">
                {/* Html5Qrcode target element */}
                <div id="dbu-qr-reader" className="w-full h-full object-cover"></div>

                {!cameraActive && !cameraError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-gray-300 p-6 text-center">
                    <RefreshCw className="w-8 h-8 text-sky-400 animate-spin mb-3" />
                    <p className="text-sm font-semibold">Starting camera...</p>
                    <p className="text-xs text-gray-400 mt-1">Please allow camera permissions if prompted.</p>
                  </div>
                )}
              </div>

              {cameraError && (
                <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs flex flex-col gap-2 w-full max-w-sm">
                  <div className="flex items-center gap-2 font-semibold">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    Camera Access Note
                  </div>
                  <p>{cameraError}</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('code')}
                    className="mt-1 text-left font-bold text-red-800 underline text-xs"
                  >
                    Switch to 6-Digit Code Entry &rarr;
                  </button>
                </div>
              )}

              <div className="text-center text-xs text-gray-500 max-w-xs space-y-1">
                <p>Align the QR code inside the frame to scan automatically.</p>
                <p className="text-gray-400 text-[11px]">
                  Or open your smartphone's Camera app to scan directly from the web!
                </p>
              </div>
            </div>
          )}

          {/* Tab 2: Manual Code */}
          {activeTab === 'code' && (
            <form onSubmit={handleManualSubmit} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  6-Digit Session Code
                </label>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={10}
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                    placeholder="e.g. 7B9X2K"
                    required
                    className="w-full text-center tracking-widest text-2xl md:text-3xl font-mono font-bold px-4 py-4 bg-gray-50 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 focus:bg-white uppercase transition-all"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-2 text-center">
                  Look at the event screen or ask your club coordinator for the 6-character code.
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting || manualCode.trim().length < 4}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-6 bg-sky-700 hover:bg-sky-800 disabled:bg-gray-300 text-white font-bold rounded-xl transition-all shadow-sm hover:shadow-md"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Validating Attendance...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Confirm Attendance
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Attendance History Column */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
            <div>
              <h3 className="text-base font-bold text-gray-900">Your Activity History</h3>
              <p className="text-xs text-gray-500">Verified co-curricular check-ins</p>
            </div>
            <button
              onClick={fetchHistory}
              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
              title="Refresh history"
            >
              <RefreshCw className={`w-4 h-4 ${loadingHistory ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {recentAttendance.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <Clock className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              <p className="text-sm font-semibold">No attendance logged yet</p>
              <p className="text-xs mt-1 text-gray-400">
                Check in at your next club meeting to start building your transcript!
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {recentAttendance.map((rec) => (
                <div
                  key={rec._id}
                  className="p-3.5 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:border-sky-200 transition-all text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-gray-900">{rec.eventTitle}</h4>
                      <p className="text-gray-500 text-[11px] mt-0.5">{rec.clubName}</p>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-sky-100 text-sky-800 font-bold rounded text-[10px]">
                      <Award className="w-3 h-3 text-sky-600" />+{rec.hoursCredit} hr
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-gray-400 mt-2 pt-2 border-t border-gray-200/50">
                    <span>{new Date(rec.scannedAt).toLocaleDateString()}</span>
                    <span className="text-emerald-600 font-semibold uppercase">{rec.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
