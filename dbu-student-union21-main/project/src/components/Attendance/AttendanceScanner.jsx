/** @format */
import React, { useState, useEffect, useRef } from 'react';
import { apiService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
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
} from 'lucide-react';
import toast from 'react-hot-toast';

export function AttendanceScanner() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('code'); // 'code' | 'camera'
  const [manualCode, setManualCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lastCheckIn, setLastCheckIn] = useState(null);

  // Camera state
  const videoRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [scanning, setScanning] = useState(false);

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

  // Camera stream handler
  const startCamera = async () => {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);
        setScanning(true);
        detectQRFromStream();
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setCameraError(
        'Camera permission was denied or camera is unavailable. Please use the 6-character code option.'
      );
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setScanning(false);
  };

  // Switch tab cleanup
  useEffect(() => {
    if (activeTab !== 'camera') {
      stopCamera();
    } else {
      startCamera();
    }
    return () => stopCamera();
  }, [activeTab]);

  // Native BarcodeDetector if supported in browser
  const detectQRFromStream = async () => {
    if (!('BarcodeDetector' in window)) {
      return;
    }

    try {
      const barcodeDetector = new window.BarcodeDetector({ formats: ['qr_code'] });
      const scanInterval = setInterval(async () => {
        if (!videoRef.current || !cameraActive) {
          clearInterval(scanInterval);
          return;
        }

        try {
          const barcodes = await barcodeDetector.detect(videoRef.current);
          if (barcodes.length > 0) {
            const rawValue = barcodes[0].rawValue;
            clearInterval(scanInterval);
            stopCamera();
            handleProcessScan(rawValue);
          }
        } catch (_) {}
      }, 500);
    } catch (_) {}
  };

  const handleProcessScan = async (qrPayload) => {
    try {
      setSubmitting(true);
      const res = await apiService.scanAttendance({ qrPayload });
      if (res.success) {
        setLastCheckIn(res);
        toast.success(res.message || 'Attendance recorded!');
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
      const res = await apiService.scanAttendance({ code: cleanCode });
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
          </div>

          {/* Success Banner if just checked in */}
          {lastCheckIn && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 text-sm">
                <p className="font-bold">{lastCheckIn.message || 'Check-in Verified!'}</p>
                <p className="text-xs text-emerald-700 mt-1">
                  Credit: +{lastCheckIn.hoursEarned || 1} hr added to your co-curricular record.
                </p>
                <div className="mt-3">
                  <Link
                    to="/transcript"
                    className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 underline hover:text-emerald-900"
                  >
                    Check updated co-curricular transcript <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Tab 1: Manual Code */}
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

          {/* Tab 2: Camera Scanner */}
          {activeTab === 'camera' && (
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="relative w-full max-w-sm aspect-square bg-black rounded-2xl overflow-hidden shadow-inner flex items-center justify-center">
                {cameraActive ? (
                  <>
                    <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                    {/* QR Finder Reticle */}
                    <div className="absolute inset-8 border-2 border-dashed border-sky-400 rounded-xl pointer-events-none animate-pulse">
                      <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-sky-400"></div>
                      <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-sky-400"></div>
                      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-sky-400"></div>
                      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-sky-400"></div>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-6 text-gray-400">
                    <VideoOff className="w-12 h-12 mx-auto mb-2 text-gray-500" />
                    <p className="text-sm">Camera inactive</p>
                  </div>
                )}
              </div>

              {cameraError && (
                <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {cameraError}
                </div>
              )}

              <p className="text-xs text-gray-500 text-center">
                Point your camera at the attendance QR code displayed on the screen.
              </p>
            </div>
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
