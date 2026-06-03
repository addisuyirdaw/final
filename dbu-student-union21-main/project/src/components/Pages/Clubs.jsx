import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Users, Calendar, Award, Search, Filter, Plus, MapPin, Mail, Phone, Globe, Trash2, Edit, FileText, CheckCircle, XCircle, AlertCircle, MoreVertical, UserMinus, Download, Upload, BookOpen, X } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "../../contexts/AuthContext";
import { useNotifications } from "../../contexts/NotificationContext";
import { apiService } from "../../services/api";
import toast from "react-hot-toast";
import bookingLogo from "../../assets/club-logos/booking.png";
import careerLogo from "../../assets/club-logos/career.png";
import truthLogo from "../../assets/club-logos/truth.png";
import ideaLogo from "../../assets/club-logos/idea.png";
import lawLogo from "../../assets/club-logos/law.png";
import mechanicalLogo from "../../assets/club-logos/mechanical.png";

const DEFAULT_LOGOS = {
  "Book Club": bookingLogo,
  "Booking": bookingLogo,
  "Career Development": careerLogo,
  "Career": careerLogo,
  "Truth Culture": truthLogo,
  "Idea Hub": ideaLogo,
  "Law Club": lawLogo,
  "Law": lawLogo,
  "Mechanical Engineering": mechanicalLogo,
  "Mechanical Engineering Club": mechanicalLogo,
  "Mechanical": mechanicalLogo,
  "Civil Engineering": mechanicalLogo, // Using as placeholder
  "Civil Engineering Club": mechanicalLogo,
  "Civil": mechanicalLogo
};

export function Clubs() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAcademicAdmin = user?.role === 'academic_affairs';
  const isCoordinator = user?.role === 'clubs_coordinator' || user?.username === 'dbu10101040';
  const loginMatch = user?.username === 'dbu10101040' || user?.username === 'dbu101010ro' || user?.username === 'dbu10101020';
  // isLeader is derived from the currently open club details — safe to use in render
  const { markAsSeen } = useNotifications();
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewClubForm, setShowNewClubForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingClubId, setEditingClubId] = useState(null);
  const [newClub, setNewClub] = useState({
    name: "",
    category: "Academic",
    description: "",
    imageFile: null,
    imagePreview: "",
    contactEmail: "",
    contactPhone: "",
    website: "",
    officeLocation: "",
    meetingSchedule: "",
    requirements: "",
  });
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [selectedClub, setSelectedClub] = useState(null);
  const [joinFormData, setJoinFormData] = useState({
    fullName: "",
    department: "",
    year: "",
    background: "",
  });
  const [joinRequests, setJoinRequests] = useState([]);
  const [showJoinRequests, setShowJoinRequests] = useState(false);
  const [selectedClubDetails, setSelectedClubDetails] = useState(null);
  const [showClubDetails, setShowClubDetails] = useState(false);
  // Component-level isLeader: true when the logged-in user is the president of the currently open club
  const isLeader = (() => {
    const userId = user?._id || user?.id;
    if (!userId || !selectedClubDetails) return false;
    const presidentId = String(selectedClubDetails?.leadership?.president?._id || selectedClubDetails?.leadership?.president || '');
    return presidentId !== '' && String(userId) === presidentId;
  })();

  // Report states
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportFormData, setReportFormData] = useState({
    title: "",
    description: "",
    date: new Date().toISOString().split('T')[0],
    documentUrl: "",
    file: null,
    reportType: "ACTIVITY"
  });
  const [pendingReports, setPendingReports] = useState([]);
  const [showPendingReports, setShowPendingReports] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [reportFeedback, setReportFeedback] = useState("");
  const [showReportReviewModal, setShowReportReviewModal] = useState(false);
  const [clubReports, setClubReports] = useState([]);
  const [showClubReports, setShowClubReports] = useState(false);

  // Assign Manager states
  const [showAssignManagerModal, setShowAssignManagerModal] = useState(false);
  const [assignUserSearchTerm, setAssignUserSearchTerm] = useState("");
  const [searchedUsers, setSearchedUsers] = useState([]);

  // Messaging states
  const [showAskModal, setShowAskModal] = useState(false);
  const [askContent, setAskContent] = useState("");
  const [showInboxModal, setShowInboxModal] = useState(false);
  const [inboxMessages, setInboxMessages] = useState([]);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyContent, setReplyContent] = useState("");
  
  // Restriction & Action Menu states
  const [showRestrictionModal, setShowRestrictionModal] = useState(false);
  const [restrictionReason, setRestrictionReason] = useState("");
  const [selectedMemberForAction, setSelectedMemberForAction] = useState(null);
  const [activeDropdownId, setActiveDropdownId] = useState(null);

  // Member Reports View for Manager
  const [managerPendingReports, setManagerPendingReports] = useState([]);
  const [showManagerPendingReports, setShowManagerPendingReports] = useState(false);

  // Expandable member panel per card
  const [expandedClubId, setExpandedClubId] = useState(null);
  const [expandedClubData, setExpandedClubData] = useState({});

  // Live Check-in & Certification states
  const [checkInCode, setCheckInCode] = useState("");
  const [checkInTimeLeft, setCheckInTimeLeft] = useState(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [eligibleData, setEligibleData] = useState(null);
  const [loadingEligibility, setLoadingEligibility] = useState(false);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [eventForm, setEventForm] = useState({ title: "", description: "", date: new Date().toISOString().split('T')[0], location: "" });
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [startingSessionEventId, setStartingSessionEventId] = useState(null);
  const [endingSessionEventId, setEndingSessionEventId] = useState(null);

  // ── Global Admin Template Repository states ───────────────────────────────
  const [templates, setTemplates] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_templates');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [showTemplateUpload, setShowTemplateUpload] = useState(false);
  const [templateForm, setTemplateForm] = useState({ title: '', description: '', category: 'Other', file: null });
  const [uploadingTemplate, setUploadingTemplate] = useState(false);

  const fetchEligibility = async (clubId) => {
    setLoadingEligibility(true);
    try {
      const res = await apiService.verifyCertificateEligibility(clubId);
      if (res.success) {
        setEligibleData(res);
      }
    } catch (err) {
      console.error("Error fetching eligibility:", err);
    } finally {
      setLoadingEligibility(false);
    }
  };

  const handleCheckIn = async (e) => {
    e.preventDefault();
    if (!checkInCode || checkInCode.trim().length !== 4) {
      toast.error("Please enter a valid 4-digit check-in code.");
      return;
    }
    setCheckingIn(true);
    try {
      const clubId = selectedClubDetails._id || selectedClubDetails.id;
      const res = await apiService.checkInClub({ clubId, sessionCode: checkInCode.trim() });
      if (res.success) {
        toast.success(res.message || "Successfully checked in!");
        setCheckInCode("");
        // Refresh club details to get updated attendanceCount/attendees list
        const updatedDetails = await apiService.getClub(clubId);
        setSelectedClubDetails(updatedDetails);
        // Refresh eligibility data
        fetchEligibility(clubId);
      } else {
        toast.error(res.message || "Invalid check-in code.");
      }
    } catch (err) {
      toast.error(err.message || "Check-in failed. Please try again.");
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!eventForm.title || !eventForm.date) {
      toast.error("Title and Date are required.");
      return;
    }
    setCreatingEvent(true);
    try {
      const clubId = selectedClubDetails._id || selectedClubDetails.id;
      const res = await apiService.createClubEvent(clubId, eventForm);
      if (res.success) {
        toast.success("Event created successfully!");
        setEventForm({ title: "", description: "", date: new Date().toISOString().split('T')[0], location: "" });
        setShowCreateEvent(false);
        // Refresh club details to get updated event list
        const updatedDetails = await apiService.getClub(clubId);
        setSelectedClubDetails(updatedDetails);
        // ── Instant carousel sync: update the matching club card in the clubs list ──
        setClubs(prev => prev.map(c => (String(c._id || c.id) === String(clubId) ? { ...c, events: updatedDetails.events } : c)));
      }
    } catch (err) {
      toast.error(err.message || "Failed to create event");
    } finally {
      setCreatingEvent(false);
    }
  };

  const handleStartSession = async (eventId) => {
    setStartingSessionEventId(eventId);
    try {
      const clubId = selectedClubDetails._id || selectedClubDetails.id;
      const res = await apiService.startCheckInSession(clubId, eventId);
      if (res.success) {
        toast.success(`Check-in started! Code: ${res.code}`);
        setCheckInTimeLeft(600);
        // Refresh club details
        const updatedDetails = await apiService.getClub(clubId);
        setSelectedClubDetails(updatedDetails);
      }
    } catch (err) {
      toast.error(err.message || "Failed to start session");
    } finally {
      setStartingSessionEventId(null);
    }
  };

  const handleEndSession = async (eventId) => {
    if (!window.confirm("Are you sure you want to end this check-in session? This will lock attendance and process absent streaks.")) return;
    setEndingSessionEventId(eventId);
    try {
      const clubId = selectedClubDetails._id || selectedClubDetails.id;
      const res = await apiService.endCheckInSession(clubId, eventId);
      if (res.success) {
        toast.success("Check-in ended. Absentee streaks processed!");
        // Refresh club details
        const updatedDetails = await apiService.getClub(clubId);
        setSelectedClubDetails(updatedDetails);
      }
    } catch (err) {
      toast.error(err.message || "Failed to end session");
    } finally {
      setEndingSessionEventId(null);
    }
  };

  const handleDownloadCertificate = () => {
    if (!eligibleData || !eligibleData.eligible) return;

    const printWindow = window.open('', '_blank', 'width=900,height=650');
    const sealUrl = "https://images.pexels.com/photos/590022/pexels-photo-590022.jpeg?auto=compress&cs=tinysrgb&w=150";
    const userId = user?._id || user?.id || "";

    printWindow.document.write(`
      <html>
        <head>
          <title>Official Certificate of Merit - Debre Berhan University</title>
          <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700;800&family=Montserrat:wght@400;600;700&family=Great+Vibes&display=swap" rel="stylesheet">
          <style>
            body {
              margin: 0;
              padding: 0;
              font-family: 'Montserrat', sans-serif;
              background-color: #fcfcfc;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
            }
            .cert-container {
              width: 820px;
              height: 570px;
              padding: 25px;
              border: 15px double #b8860b;
              background: white;
              box-shadow: 0 4px 20px rgba(0,0,0,0.08);
              position: relative;
              text-align: center;
              box-sizing: border-box;
            }
            .inner-border {
              border: 2px solid #b8860b;
              height: 100%;
              width: 100%;
              padding: 20px;
              box-sizing: border-box;
              position: relative;
            }
            .university-title {
              font-family: 'Cinzel', serif;
              font-size: 24px;
              font-weight: 800;
              color: #0b2240;
              letter-spacing: 2px;
              margin-bottom: 5px;
            }
            .subtitle {
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 3px;
              color: #b8860b;
              font-weight: 700;
              margin-bottom: 25px;
            }
            .cert-heading {
              font-family: 'Cinzel', serif;
              font-size: 34px;
              font-weight: 700;
              color: #b8860b;
              letter-spacing: 1px;
              margin-bottom: 20px;
            }
            .presentation-text {
              font-size: 14px;
              color: #555;
              margin-bottom: 10px;
              font-style: italic;
            }
            .recipient-name {
              font-family: 'Great Vibes', cursive;
              font-size: 42px;
              color: #0b2240;
              margin: 15px 0;
              border-bottom: 1.5px solid #eaeaea;
              display: inline-block;
              padding-bottom: 2px;
              min-width: 250px;
            }
            .description {
              font-size: 13px;
              color: #444;
              max-width: 600px;
              margin: 0 auto 30px auto;
              line-height: 1.6;
            }
            .signatures {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              margin-top: 25px;
              padding: 0 40px;
            }
            .signature-block {
              width: 180px;
              text-align: center;
            }
            .signature-line {
              border-top: 1px solid #b8860b;
              margin-top: 10px;
              padding-top: 5px;
              font-size: 11px;
              font-weight: 700;
              color: #333;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .signature-title {
              font-size: 9px;
              color: #777;
              margin-top: 2px;
            }
            .seal-block {
              text-align: center;
            }
            .seal-image {
              width: 65px;
              height: 65px;
              border-radius: 50%;
              object-fit: cover;
              border: 2px solid #b8860b;
              padding: 2px;
              background: white;
            }
            .cert-id {
              position: absolute;
              bottom: 10px;
              right: 15px;
              font-size: 9px;
              font-family: monospace;
              color: #aaa;
            }
            .print-btn {
              position: fixed;
              top: 15px;
              right: 15px;
              padding: 10px 18px;
              background: #b8860b;
              color: white;
              border: none;
              border-radius: 8px;
              font-weight: bold;
              cursor: pointer;
              box-shadow: 0 4px 10px rgba(0,0,0,0.15);
              font-family: sans-serif;
              font-size: 13px;
            }
            .print-btn:hover {
              background: #966f0a;
            }
            @media print {
              .print-btn {
                display: none;
              }
              body {
                background: white;
              }
              .cert-container {
                box-shadow: none;
                border-color: #b8860b !important;
              }
            }
          </style>
        </head>
        <body>
          <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
          <div class="cert-container">
            <div class="inner-border">
              <div class="university-title">DEBRE BERHAN UNIVERSITY</div>
              <div class="subtitle">Office of Student Affairs & Campus Life</div>
              
              <div class="cert-heading">Certificate of Achievement</div>
              
              <div class="presentation-text">This is officially awarded to</div>
              <div class="recipient-name">${eligibleData.studentName}</div>
              
              <div class="description">
                for outstanding dedication, active participation, and exemplary leadership in the 
                <strong>${eligibleData.clubName}</strong>. By achieving a verified attendance rate of 
                <strong>${eligibleData.percentage}%</strong> across all registered sessions in the 2026/2027 academic year, 
                this student has demonstrated commendable commitment to campus co-curricular excellence.
              </div>
              
              <div class="signatures">
                <div class="signature-block">
                  <div style="font-family: 'Great Vibes', cursive; font-size: 20px; color: #444; height: 25px;">Kirkos Ashebir</div>
                  <div class="signature-line">Kirkos Ashebir</div>
                  <div class="signature-title">Student Union President</div>
                </div>
                
                <div class="seal-block">
                  <img class="seal-image" src="${sealUrl}" alt="DBU Seal" />
                  <div style="font-size: 8px; font-weight: bold; color: #b8860b; margin-top: 5px; text-transform: uppercase; letter-spacing: 1px;">OFFICIAL SEAL</div>
                </div>
                
                <div class="signature-block">
                  <div style="font-family: 'Great Vibes', cursive; font-size: 20px; color: #444; height: 25px;">Dr. Asmare Malese</div>
                  <div class="signature-line">Dr. Asmare Malese</div>
                  <div class="signature-title">Dean of Student Affairs</div>
                </div>
              </div>
              
              <div class="cert-id">Verification ID: DBU-${selectedClubDetails._id || selectedClubDetails.id}-${userId.substring(18)}</div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  useEffect(() => {
    if (showClubDetails && selectedClubDetails) {
      const clubId = selectedClubDetails._id || selectedClubDetails.id;
      const userId = user?._id || user?.id;
      const isApprovedMember = selectedClubDetails.members?.some(
        m => String(m.user?._id || m.user) === String(userId) && m.status === 'approved'
      );
      if (isApprovedMember) {
        fetchEligibility(clubId);
      } else {
        setEligibleData(null);
      }
    } else {
      setEligibleData(null);
    }
  }, [showClubDetails, selectedClubDetails?._id, selectedClubDetails?.id]);

  const categories = [
    "All",
    ...(user ? ["Joined"] : []),
    "Academic",
    "Sports",
    "Cultural",
    "Technology",
    "Service",
    "Arts",
    "Professional",
    "Social",
    "Other",
  ];

  const { id: urlClubId } = useParams();

  // ── Fetch templates once on mount and when user session is loaded ──────────
  const fetchTemplates = async () => {
    if (!user) return;
    setLoadingTemplates(true);
    try {
      const res = await apiService.getTemplates();
      const list = res.templates || [];
      setTemplates(list);
      localStorage.setItem('cached_templates', JSON.stringify(list));
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleUploadTemplate = async (e) => {
    e.preventDefault();
    if (!templateForm.file) return toast.error('Please select a file to upload');
    if (!templateForm.title.trim()) return toast.error('Please enter a title');
    setUploadingTemplate(true);
    try {
      const fd = new FormData();
      fd.append('file', templateForm.file);
      fd.append('title', templateForm.title.trim());
      fd.append('description', templateForm.description.trim());
      fd.append('category', templateForm.category);
      const res = await apiService.uploadTemplate(fd);
      if (res.success) {
        toast.success('Template uploaded successfully!');
        setTemplates(prev => {
          const updated = [res.template, ...prev];
          localStorage.setItem('cached_templates', JSON.stringify(updated));
          return updated;
        });
        setTemplateForm({ title: '', description: '', category: 'Other', file: null });
        setShowTemplateUpload(false);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to upload template');
    } finally {
      setUploadingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (id) => {
    if (!window.confirm('Delete this template? This cannot be undone.')) return;
    try {
      await apiService.deleteTemplate(id);
      setTemplates(prev => {
        const updated = prev.filter(t => t._id !== id);
        localStorage.setItem('cached_templates', JSON.stringify(updated));
        return updated;
      });
      toast.success('Template deleted');
    } catch (err) {
      toast.error(err.message || 'Failed to delete template');
    }
  };

  useEffect(() => {
    fetchClubs();
    markAsSeen('clubs');

    const handleClickOutside = () => setActiveDropdownId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    if (user) {
      fetchTemplates();
    }
  }, [user]);

  const formatTime = (seconds) => {
    if (seconds === null || seconds === undefined) return "";
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  useEffect(() => {
    if (selectedClubDetails?.events) {
      const activeEvent = selectedClubDetails.events.find(e => e.activeCheckIn === true);
      if (activeEvent) {
        const elapsedSec = Math.floor((Date.now() - new Date(activeEvent.updatedAt).getTime()) / 1000);
        const remaining = Math.max(0, 600 - elapsedSec);
        if (remaining > 0) {
          setCheckInTimeLeft(remaining);
          return;
        }
      }
    }
    setCheckInTimeLeft(null);
  }, [selectedClubDetails]);

  useEffect(() => {
    if (checkInTimeLeft === null) return;

    if (checkInTimeLeft <= 0) {
      const activeEvent = selectedClubDetails?.events?.find(e => e.activeCheckIn === true);
      if (activeEvent) {
        const clubId = selectedClubDetails._id || selectedClubDetails.id;
        toast.error("Check-in session has expired and locked automatically.");
        
        apiService.endCheckInSession(clubId, activeEvent._id)
          .then(async (res) => {
            if (res.success) {
              const updatedDetails = await apiService.getClub(clubId);
              setSelectedClubDetails(updatedDetails);
            }
          })
          .catch(err => {
            console.log("Auto-end session response:", err.message);
            apiService.getClub(clubId).then(updated => {
              setSelectedClubDetails(updated);
            }).catch(() => {});
          });
      }
      setCheckInTimeLeft(null);
      return;
    }

    const timer = setTimeout(() => {
      setCheckInTimeLeft(prev => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearTimeout(timer);
  }, [checkInTimeLeft, selectedClubDetails?._id, selectedClubDetails?.id]);

  useEffect(() => {
    if (urlClubId && clubs.length > 0) {
      const matchedClub = clubs.find(c => String(c._id || c.id) === String(urlClubId));
      if (matchedClub) {
        handleViewPublicOverview(matchedClub);
      }
    }
  }, [urlClubId, clubs]);

  const handleViewPublicOverview = async (club) => {
    try {
      const clubId = club._id || club.id;
      const detailedClub = await apiService.getClub(clubId);
      if (detailedClub) {
        setSelectedClub(club);
        setSelectedClubDetails(detailedClub);
        setShowClubDetails(true);
      }
    } catch (err) {
      if (club) {
        setSelectedClubDetails(club);
        setShowClubDetails(true);
      }
    }
  };

  const fetchClubs = async () => {
    try {
      setLoading(true);
      const response = await apiService.getClubs();
      console.log('Clubs API response:', response);

      // Handle different response structures
      let clubsData = [];
      if (Array.isArray(response)) {
        clubsData = response;
      } else if (response.clubs && Array.isArray(response.clubs)) {
        clubsData = response.clubs;
      } else if (response.data && Array.isArray(response.data)) {
        clubsData = response.data;
      } else if (response.success && response.clubs) {
        clubsData = response.clubs;
      }

      setClubs(clubsData);
    } catch (error) {
      console.error("Failed to fetch clubs:", error);
      toast.error("Failed to load clubs");
      setClubs([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredClubs = clubs.filter((club) => {
    const userId = user?._id || user?.id;
    const isUserMember = userId && Array.isArray(club?.members) &&
      club.members.some(m => String(m?.user?._id || m?.user) === String(userId) && m?.status === 'approved');

    const matchesCategory =
      selectedCategory === "All" ||
      (selectedCategory === "Joined" && isUserMember) ||
      club.category === selectedCategory;

    const matchesSearch =
      club.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      club.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleJoinClub = (club) => {
    if (!user) {
      toast.error("Please login to join clubs");
      navigate("/login");
      return;
    }

    if (user.isAdmin && !isAcademicAdmin) {
      // Show club details for admin instead of join form
      handleViewMembers(club);
      return;
    }

    setSelectedClub(club);
    setJoinFormData({
      fullName: user.name || "",
      department: user.department || "",
      year: user.year || "",
      background: "",
    });
    setShowJoinModal(true);
  };

  const handleSubmitJoinRequest = async (e) => {
    e.preventDefault();

    const fullName = joinFormData.fullName || user?.name || "";
    const department = joinFormData.department || user?.department || "";
    const year = joinFormData.year || user?.year || "";
    const background = joinFormData.background?.trim() || "";

    if (!fullName || !department || !year) {
      toast.error("Please fill all required profile fields");
      return;
    }

    if (!background) {
      toast.error("Please explain why you want to join this club");
      return;
    }

    try {
      const response = await apiService.joinClub(selectedClub._id || selectedClub.id, {
        fullName,
        department,
        year,
        background
      });
      toast.success(response?.message || "Welcome! You have successfully joined the club.");
      setShowJoinModal(false);
      setJoinFormData({
        fullName: "",
        department: "",
        year: "",
        background: "",
      });
      await fetchClubs();
    } catch (error) {
      console.error("Failed to join club:", error);
      toast.error(error.message || "Failed to join club");
    }
  };

  // Reports API Logic
  const handleSubmitReport = async (e) => {
    e.preventDefault();
    if (!reportFormData.title || !reportFormData.description || !reportFormData.date) {
      toast.error("Please fill all required report fields");
      return;
    }
    try {
      const clubId = selectedClubDetails?._id || selectedClubDetails?.id || selectedClub?._id || selectedClub?.id;

      const formData = new FormData();
      formData.append('title', reportFormData.title);
      formData.append('description', reportFormData.description);
      formData.append('date', reportFormData.date);
      formData.append('reportType', reportFormData.reportType);
      if (reportFormData.documentUrl) formData.append('documentUrl', reportFormData.documentUrl);
      if (reportFormData.file) formData.append('file', reportFormData.file);

      // Bypass Vite Proxy explicitly for multipart/form-data to prevent Boundary stream corruption!
      const explicitHostUrl = `http://${window.location.hostname}:5000/api`;
      const targetUrl = apiService.baseURL.startsWith('http') ? apiService.baseURL : explicitHostUrl;

      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const response = await fetch(`${targetUrl}/reports/club/${clubId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.token}`
        },
        body: formData
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || data.message || "Failed to submit report");
      }

      toast.success("Report submitted successfully");
      setShowReportModal(false);
      setReportFormData({
        title: "",
        description: "",
        date: new Date().toISOString().split('T')[0],
        documentUrl: "",
        file: null,
        reportType: "ACTIVITY"
      });
    } catch (error) {
      console.error("Failed to submit report:", error);
      toast.error(error.message || "Failed to submit report");
    }
  };

  const fetchClubReports = async (clubId) => {
    try {
      const reports = await apiService.getClubReports(clubId);
      setClubReports(reports || []);
      setSelectedClub(clubs.find(c => (c._id || c.id) === clubId));
      setShowClubReports(true);
    } catch (error) {
      console.error("Failed to fetch club reports:", error);
      toast.error("Failed to load reports");
      setClubReports([]);
    }
  };

  const fetchPendingReports = async () => {
    try {
      const reports = await apiService.getPendingReports();
      setPendingReports(reports || []);
      setShowPendingReports(true);
    } catch (error) {
      console.error("Gracefully caught reports fetch failure:", error);
      toast.error("Failed to load pending reports");
      setPendingReports([]);
    }
  };

  const fetchManagerPendingReports = async (clubId, silentRefresh = false) => {
    // Guard: never fire the request with an undefined or invalid clubId
    if (!clubId || clubId === 'undefined') {
      console.warn("fetchManagerPendingReports called with invalid clubId:", clubId);
      setManagerPendingReports([]);
      return;
    }
    try {
      const reports = await apiService.getPendingManagerReports(clubId);
      setManagerPendingReports(reports || []);
      if (!silentRefresh) setShowManagerPendingReports(true);
    } catch (error) {
      console.error("Failed to fetch manager reports:", error);
      if (!silentRefresh) toast.error("Failed to load member reports");
      setManagerPendingReports([]);
    }
  };

  const handleReviewReport = async (status) => {
    try {
      await apiService.reviewReport(selectedReport._id, { status, feedback: reportFeedback });
      toast.success(`Report ${status.toLowerCase()} successfully!`);
      setShowReportReviewModal(false);
      setSelectedReport(null);
      setReportFeedback("");
      if (showManagerPendingReports && selectedClubDetails) {
        fetchManagerPendingReports(selectedClubDetails._id || selectedClubDetails.id);
      } else {
        fetchPendingReports();
      }
    } catch (error) {
      console.error("Failed to review report:", error);
      toast.error(error.message || "Failed to review report");
    }
  };

  // Messaging Logic
  const handleAskQuestion = async (e) => {
    e.preventDefault();
    if (!askContent.trim()) return toast.error("Question cannot be empty");
    try {
      await apiService.submitClubMessage(selectedClub._id || selectedClub.id, askContent);
      toast.success("Question sent to the Club Representative!");
      setShowAskModal(false);
      setAskContent("");
    } catch (error) {
      console.error("Failed to send message:", error);
      toast.error(error.message || "Failed to send message");
    }
  };

  const fetchInbox = async (clubId) => {
    try {
      const messages = await apiService.getClubInbox(clubId);
      setInboxMessages(messages || []);
      setSelectedClubDetails(clubs.find(c => (c._id || c.id) === clubId));
      setShowInboxModal(true);
    } catch (error) {
      console.error("Failed to fetch inbox:", error);
      toast.error("Failed to load inbox");
      setInboxMessages([]);
    }
  };

  const handleReplyToMessage = async (msgId) => {
    if (!replyContent.trim()) return toast.error("Reply cannot be empty");
    try {
      await apiService.replyToClubMessage(msgId, replyContent);
      toast.success("Reply sent!");
      setReplyingTo(null);
      setReplyContent("");
      // Refresh inbox
      const messages = await apiService.getClubInbox(selectedClubDetails._id || selectedClubDetails.id);
      setInboxMessages(messages || []);
    } catch (error) {
      console.error("Failed to reply:", error);
      toast.error(error.message || "Failed to send reply");
    }
  };

  const fetchJoinRequests = async (clubId) => {
    try {
      const response = await apiService.getClubJoinRequests(clubId);
      setJoinRequests(response.requests || []);
      setSelectedClub(clubs.find(c => (c._id || c.id) === clubId));
      setShowJoinRequests(true);
    } catch (error) {
      console.error("Failed to fetch join requests:", error);
      toast.error("Failed to fetch join requests");
      setJoinRequests([]);
    }
  };

  const toggleMemberPanel = async (clubId) => {
    if (expandedClubId === clubId) {
      setExpandedClubId(null);
      return;
    }
    setExpandedClubId(clubId);
    if (expandedClubData[clubId]) return; // already cached
    try {
      const detailed = await apiService.getClub(clubId);
      setExpandedClubData(prev => ({ ...prev, [clubId]: detailed }));
    } catch (err) {
      console.error('Failed to load club details:', err);
      toast.error('Failed to load member list');
      setExpandedClubId(null);
    }
  };

  const handleApproveRequest = async (clubId, memberId) => {
    try {
      await apiService.approveClubMember(clubId, memberId);
      toast.success("Member approved successfully!");
      await fetchJoinRequests(clubId);
      await fetchClubs(); // Refresh clubs to update member count
      
      // Instantly update the currently viewed club details modal
      if (selectedClubDetails && (selectedClubDetails._id === clubId || selectedClubDetails.id === clubId)) {
        const updatedClub = await apiService.getClub(clubId);
        setSelectedClubDetails(updatedClub);
      }
    } catch (error) {
      console.error("Failed to approve member:", error);
      toast.error("Failed to approve member");
    }
  };

  const handleRejectRequest = async (clubId, memberId) => {
    try {
      await apiService.rejectClubMember(clubId, memberId);
      toast.success("Member rejected successfully!");
      await fetchJoinRequests(clubId);
      
      // Instantly update the currently viewed club details modal
      if (selectedClubDetails && (selectedClubDetails._id === clubId || selectedClubDetails.id === clubId)) {
        const updatedClub = await apiService.getClub(clubId);
        setSelectedClubDetails(updatedClub);
      }
    } catch (error) {
      console.error("Failed to reject member:", error);
      toast.error("Failed to reject member");
    }
  };

  const handleSearchUsersForAssign = () => {
    if (!selectedClubDetails || !Array.isArray(selectedClubDetails.members)) {
      setSearchedUsers([]);
      return;
    }

    // Only allow assigning from approved members
    const approvedMembers = selectedClubDetails.members.filter(m => m.status === 'approved' && m.user);

    if (!assignUserSearchTerm.trim()) {
      setSearchedUsers(approvedMembers.map(m => m.user));
      return;
    }

    const term = assignUserSearchTerm.toLowerCase();
    const filtered = approvedMembers.filter(m => 
      m?.user?.name?.toLowerCase().includes(term) || 
      m?.user?.username?.toLowerCase().includes(term) ||
      m?.fullName?.toLowerCase().includes(term) ||
      m?.username?.toLowerCase().includes(term)
    );

    setSearchedUsers(filtered?.map(m => m?.user) || []);
  };

  const handleAssignManager = async (userId) => {
    try {
      if (!selectedClubDetails) return;
      const clubId = selectedClubDetails._id || selectedClubDetails.id;
      await apiService.assignClubLeader(clubId, userId);
      toast.success("Representative changed successfully!");
      setShowAssignManagerModal(false);
      // Refresh club details
      const updatedClub = await apiService.getClub(clubId);
      setSelectedClubDetails(updatedClub);
      setSelectedClub(updatedClub);
      await fetchClubs();
    } catch (error) {
      console.error("Failed to assign manager:", error);
      toast.error(error.message || "Failed to assign manager");
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error("Image size must be less than 5MB");
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setNewClub({
          ...newClub,
          imageFile: file,
          imagePreview: e.target.result
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditClub = (club) => {
    setNewClub({
      name: club.name,
      category: club.category,
      description: club.description,
      imageFile: null,
      imagePreview: club.image,
      contactEmail: club.contactEmail || "",
      contactPhone: club.contactPhone || "",
      website: club.website || "",
      officeLocation: club.officeLocation || "",
      meetingSchedule: club.meetingSchedule || "",
      requirements: club.requirements || "",
    });
    setEditingClubId(club._id || club.id);
    setIsEditing(true);
    setShowNewClubForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCreateClub = async (e) => {
    e.preventDefault();

    if (!user?.isAdmin && user?.role !== 'president' && !isEditing) {
      toast.error("You do not have permission to create clubs");
      return;
    }

    if (!newClub.name.trim() || !newClub.description.trim()) {
      toast.error("Club name and description are required");
      return;
    }

    try {
      const clubData = {
        name: newClub.name.trim(),
        description: newClub.description.trim(),
        category: newClub.category,
        founded: new Date().getFullYear().toString(),
        image: newClub.imagePreview || "",
        contactEmail: newClub.contactEmail.trim(),
        contactPhone: newClub.contactPhone.trim(),
        website: newClub.website.trim(),
        officeLocation: newClub.officeLocation.trim(),
        meetingSchedule: newClub.meetingSchedule.trim(),
        requirements: newClub.requirements.trim(),
      };

      if (isEditing) {
        console.log('Updating club:', editingClubId, clubData);
        await apiService.updateClub(editingClubId, clubData);
        toast.success("Club updated successfully!");
      } else {
        console.log('Creating club with data:', clubData);
        await apiService.createClub(clubData);
        toast.success("Club created successfully!");
      }

      await fetchClubs(); // Refresh the clubs list

      // Reset form
      setNewClub({
        name: "",
        category: "Academic",
        description: "",
        imageFile: null,
        imagePreview: "",
        contactEmail: "",
        contactPhone: "",
        website: "",
        officeLocation: "",
        meetingSchedule: "",
        requirements: "",
      });
      setIsEditing(false);
      setEditingClubId(null);
      setShowNewClubForm(false);
    } catch (error) {
      console.error("Failed to create club:", error);
      toast.error(error.message || "Failed to create club");
    }
  };

  const handleViewMembers = async (club) => {
    const userId = user?._id || user?.id;
    const isLeader = userId && (String(club?.leadership?.president?._id || club?.leadership?.president) === String(userId));
    // Coordinators, admins, and club leaders can view the manage panel
    if (!user?.isAdmin && !isCoordinator && !isLeader) {
      toast.error("Only administrators, coordinators, or club leaders can manage members");
      return;
    }

    try {
      const clubId = club._id || club.id;
      const detailedClub = await apiService.getClub(clubId);
      
      if (!detailedClub) {
        toast.error("Club details not found");
        return;
      }

      setSelectedClub(club);
      setSelectedClubDetails(detailedClub);
      setShowClubDetails(true);
    } catch (error) {
      console.error("Failed to fetch club details:", error);
      toast.error("Failed to load member list");
      // Fallback to basic data if details fetch fails
      if (club) {
        setSelectedClubDetails(club);
        setShowClubDetails(true);
      }
    }
  };

  const handleRestrictMember = async (clubId, memberId, currentStatus, memberName) => {
    const userId = user?._id || user?.id;
    const isLeader = userId && (String(selectedClubDetails?.leadership?.president?._id || selectedClubDetails?.leadership?.president) === String(userId));
    
    if (!user?.isAdmin && !isCoordinator && !isLeader) {
      toast.error("Access Denied: Insufficient permissions");
      return;
    }

    const newStatus = currentStatus === 'restricted' ? 'approved' : 'restricted';
    
    if (newStatus === 'restricted') {
      setSelectedMemberForAction({ clubId, memberId, name: memberName });
      setRestrictionReason("");
      setShowRestrictionModal(true);
      setActiveDropdownId(null);
    } else {
      // Unrestricting — instant local state mutation first, then API call
      if (!confirm(`Are you sure you want to restore access for ${memberName}?`)) return;

      // 1. Immediately update the badge in the UI (optimistic update)
      setSelectedClubDetails(prev => ({
        ...prev,
        members: prev.members.map(m =>
          m._id === memberId ? { ...m, status: 'approved' } : m
        )
      }));
      setActiveDropdownId(null);

      try {
        await apiService.restrictClubMember(clubId, memberId, 'approved', "Restored by administrator");
        toast.success("Access restored successfully!");
        // NOTE: No background sync here — optimistic state is source of truth.
        // The badge is already gone. A sync would risk re-adding 'restricted' if server is slow.
      } catch (error) {
        // Roll back the optimistic update on failure
        setSelectedClubDetails(prev => ({
          ...prev,
          members: prev.members.map(m =>
            m._id === memberId ? { ...m, status: 'restricted' } : m
          )
        }));
        toast.error("Failed to restore access");
      }
    }
  };

  const submitRestriction = async () => {
    if (!restrictionReason.trim()) {
      toast.error("Please provide a reason for restriction");
      return;
    }

    const { clubId, memberId } = selectedMemberForAction;

    // 1. Immediately update the badge in the UI (optimistic update)
    setSelectedClubDetails(prev => ({
      ...prev,
      members: prev.members.map(m =>
        m._id === memberId ? { ...m, status: 'restricted' } : m
      )
    }));
    setShowRestrictionModal(false);

    try {
      await apiService.restrictClubMember(clubId, memberId, 'restricted', restrictionReason);
      toast.success("Member restricted! They will be kicked out on their next request.");
      // NOTE: No background sync — optimistic badge is already showing correctly.
    } catch (error) {
      // Roll back the optimistic update on failure
      setSelectedClubDetails(prev => ({
        ...prev,
        members: prev.members.map(m =>
          m._id === memberId ? { ...m, status: 'approved' } : m
        )
      }));
      console.error("Restriction failed:", error);
      toast.error(error.response?.data?.message || "Failed to restrict member");
    }
  };

  const handleRemoveMember = async (clubId, memberId, memberName) => {
    const userId = user?._id || user?.id;
    const isLeader = userId && (String(selectedClubDetails?.leadership?.president?._id || selectedClubDetails?.leadership?.president) === String(userId));

    if (!user?.isAdmin && !isCoordinator && !isLeader) {
      toast.error("Access Denied: Insufficient permissions");
      return;
    }

    if (!confirm(`CRITICAL: Are you sure you want to PERMANENTLY DELETE ${memberName}'s account? This action is irreversible.`)) {
      return;
    }

    try {
      // 1. Immediately remove the row from the UI (optimistic update)
      setSelectedClubDetails(prev => ({
        ...prev,
        members: prev.members.filter(m => m._id !== memberId)
      }));
      setActiveDropdownId(null);

      await apiService.removeClubMember(clubId, memberId);
      toast.success("User permanently deleted!");
      // Background sync
      fetchClubs();
      apiService.getClub(clubId).then(updated => setSelectedClubDetails(updated)).catch(() => {});
    } catch (error) {
      console.error("Failed to remove member:", error);
      toast.error(error.response?.data?.message || "Failed to remove member");
      // Re-fetch to restore accurate state
      apiService.getClub(clubId).then(updated => setSelectedClubDetails(updated)).catch(() => {});
    }
  };

  const handleDeleteClub = async (clubId) => {
    if (!user?.isAdmin && user?.role !== 'president') {
      toast.error("You do not have permission to delete clubs");
      return;
    }

    if (!confirm("Are you sure you want to delete this club?")) {
      return;
    }

    // ── Instant optimistic removal so the carousel updates immediately ──
    setClubs(prev => prev.filter(c => String(c._id || c.id) !== String(clubId)));

    try {
      await apiService.deleteClub(clubId);
      toast.success("Club deleted successfully!");
      // Background sync to confirm server state
      fetchClubs();
    } catch (error) {
      console.error("Failed to delete club:", error);
      toast.error("Failed to delete club");
      // Restore clubs list on failure
      fetchClubs();
    }
  };

  const getClubImage = (club) => {
    if (club.image && club.image.trim().length > 0) return club.image;

    // Try exact match
    if (DEFAULT_LOGOS[club.name]) return DEFAULT_LOGOS[club.name];
    
    // Try fuzzy match
    const nameLower = club?.name?.toLowerCase() || "";
    for (const [key, logo] of Object.entries(DEFAULT_LOGOS)) {
       if (nameLower.includes(key.toLowerCase())) return logo;
    }

    // Final fallback to public image from the project root
    return "/images/dblogo.png";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Student Clubs
            </h1>
            {!loading && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-8 border border-white/30">
                < Award className="w-5 h-5" />
                <span className="font-semibold">{clubs.length} Clubs Active to Join</span>
              </motion.div>
            )}
            <p className="text-xl md:text-2xl text-blue-100 max-w-4xl mx-auto">
              Join {clubs.length > 0 ? `one of our ${clubs.length}` : "one of our many"} student clubs and organizations to pursue
              your interests, develop new skills, and connect with like-minded peers.
            </p>
          </motion.div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Admin Controls */}
        {user?.isAdmin && !isAcademicAdmin && (
          <div className="mb-8 bg-white rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">
                {isEditing ? "Edit Club" : "Admin Controls"}
              </h2>
              <button
                onClick={() => {
                  if (showNewClubForm && isEditing) {
                    setIsEditing(false);
                    setEditingClubId(null);
                    setNewClub({
                      name: "",
                      category: "Academic",
                      description: "",
                      imageFile: null,
                      imagePreview: "",
                      contactEmail: "",
                      contactPhone: "",
                      website: "",
                      officeLocation: "",
                      meetingSchedule: "",
                      requirements: "",
                    });
                  }
                  setShowNewClubForm(!showNewClubForm);
                }}
                className={`${isEditing ? "bg-amber-600 hover:bg-amber-700" : "bg-blue-600 hover:bg-blue-700"} text-white px-4 py-2 rounded-lg transition-colors flex items-center`}>
                {isEditing ? (
                  <>
                    <Edit className="w-4 h-4 mr-2" />
                    Cancel Edit
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Club
                  </>
                )}
              </button>
              {(isCoordinator || user?.isAdmin) && (
                <button
                  onClick={fetchPendingReports}
                  className="relative bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center">
                  <FileText className="w-4 h-4 mr-2" />
                  Review Reports
                  {(pendingReports || []).length > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
                      {(pendingReports || []).length}
                    </span>
                  )}
                </button>
              )}
            </div>

            {showNewClubForm && (
              <form onSubmit={handleCreateClub} className="mt-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Club Name *
                    </label>
                    <input
                      type="text"
                      value={newClub.name}
                      onChange={(e) =>
                        setNewClub({ ...newClub, name: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter club name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category *
                    </label>
                    <select
                      value={newClub.category}
                      onChange={(e) =>
                        setNewClub({ ...newClub, category: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                      {categories.filter((cat) => cat !== "All").map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    value={newClub.description}
                    onChange={(e) =>
                      setNewClub({ ...newClub, description: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows="3"
                    placeholder="Describe the club's purpose and activities"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contact Email
                    </label>
                    <input
                      type="email"
                      value={newClub.contactEmail}
                      onChange={(e) =>
                        setNewClub({ ...newClub, contactEmail: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="club@dbu.edu.et"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contact Phone
                    </label>
                    <input
                      type="tel"
                      value={newClub.contactPhone}
                      onChange={(e) =>
                        setNewClub({ ...newClub, contactPhone: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="+251-xxx-xxx-xxx"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Office Location
                    </label>
                    <input
                      type="text"
                      value={newClub.officeLocation}
                      onChange={(e) =>
                        setNewClub({ ...newClub, officeLocation: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Building and room number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Website URL (optional)
                    </label>
                    <input
                      type="url"
                      value={newClub.website}
                      onChange={(e) =>
                        setNewClub({ ...newClub, website: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="https://example.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Meeting Schedule
                  </label>
                  <input
                    type="text"
                    value={newClub.meetingSchedule}
                    onChange={(e) =>
                      setNewClub({ ...newClub, meetingSchedule: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Every Friday at 3:00 PM"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Membership Requirements
                  </label>
                  <textarea
                    value={newClub.requirements}
                    onChange={(e) =>
                      setNewClub({ ...newClub, requirements: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows="2"
                    placeholder="Any specific requirements for joining"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Club Image (Optional)
                  </label>
                  <div className="space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    {newClub.imagePreview && (
                      <div className="mt-2">
                        <img
                          src={newClub.imagePreview}
                          alt="Preview"
                          className="w-32 h-32 object-cover rounded-lg border border-gray-300"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    type="submit"
                    className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors">
                    {isEditing ? "Update Club" : "Create Club"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewClubForm(false)}
                    className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors">
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Search and Filter */}
        <div className="mb-8 lg:mb-12">
          {/* Search Bar */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search clubs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2 mb-6">
            <Filter className="w-5 h-5 text-gray-500" />
            <span className="text-gray-700 font-medium">Filter by category:</span>
          </div>

          <div className="flex flex-wrap gap-3">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full font-medium transition-colors ${selectedCategory === category
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}>
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Results Count */}
        {!loading && (
          <div className="mb-6">
            <p className="text-gray-600">
              Showing {filteredClubs.length} of {clubs.length} clubs
              {selectedCategory !== "All" && ` in ${selectedCategory}`}
              {searchTerm && ` matching "${searchTerm}"`}
            </p>
          </div>
        )}

        {/* Clubs Grid */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 mb-16">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="bg-white rounded-xl overflow-hidden shadow-sm animate-pulse">
                <div className="w-full h-48 bg-gray-200"></div>
                <div className="p-6 space-y-4">
                  <div className="flex justify-between">
                    <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-4 bg-gray-100 rounded w-1/4"></div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-100 rounded w-full"></div>
                    <div className="h-4 bg-gray-100 rounded w-5/6"></div>
                  </div>
                  <div className="pt-4 space-y-3">
                    <div className="h-10 bg-gray-200 rounded w-full"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 mb-16">
            {(filteredClubs || []).length > 0 ? (
              (filteredClubs || []).map((club, index) => {
                const userId = user?._id || user?.id;
                const isLeader = userId && (String(club?.leadership?.president?._id || club?.leadership?.president) === String(userId));
                const activeMember = (club.userMembershipStatus === 'approved') || (userId && Array.isArray(club?.members) && 
                  club.members.some(m => (String(m?.user?._id || m?.user) === String(userId)) && m?.status === 'approved'));

                return (
                  <motion.div
                  key={club._id || club.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow">

                  <div className="relative">
                    <img
                      src={getClubImage(club)}
                      alt={club.name}
                      className="w-full h-48 object-cover bg-gray-200"
                    />
                    <div className="absolute top-4 left-4">
                      <span className="bg-blue-600 text-white text-xs px-3 py-1 rounded-full font-medium">
                        {club.category}
                      </span>
                    </div>
                    {user?.isAdmin && !isAcademicAdmin && (
                      <div className="absolute top-4 right-4 flex space-x-2">
                        <button
                          onClick={() => handleEditClub(club)}
                          className="bg-amber-500 text-white px-3 py-1 rounded-lg hover:bg-amber-600 transition-colors text-sm font-medium shadow-sm"
                          title="Edit Club">
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteClub(club._id || club.id)}
                          className="bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium shadow-sm"
                          title="Delete Club">
                          Delete
                        </button>
                      </div>
                    )}

                    {/* Club Rep / Member Actions */}
                    {user && (
                      ((String(club?.leadership?.president?._id || club?.leadership?.president) === String(userId)) ||
                        (Array.isArray(club?.members) && club.members.some(m => (String(m?.user?._id || m?.user) === String(userId)) && m?.status === 'approved'))) && (
                        <div className="absolute top-4 left-4 flex space-x-2 z-10">
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedClub(club); setShowReportModal(true); }}
                            className="bg-purple-600 text-white p-2 rounded-full hover:bg-purple-700 transition-colors shadow-lg"
                            title="Submit Report/Document">
                            <FileText className="w-4 h-4" />
                          </button>
                        </div>
                      )
                    )}
                  </div>

                  <div className="p-6 relative">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xl font-semibold text-gray-900">
                        {club.name}
                      </h3>
                      <span className="text-gray-500 text-sm">
                        Est. {club.founded}
                      </span>
                    </div>

                    <p className="text-gray-600 mb-4 text-sm leading-relaxed">
                      {club.description}
                    </p>

                    {/* Contact Info */}
                    {(club.contactEmail || club.contactPhone || club.officeLocation || club.website) && (
                      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">Contact Information</h4>
                        <div className="space-y-1">
                          {club.officeLocation && (
                            <div className="flex items-center text-sm text-gray-600">
                              <MapPin className="w-4 h-4 mr-2" />
                              <span>{club.officeLocation}</span>
                            </div>
                          )}
                          {club.contactEmail && (
                            <div className="flex items-center text-sm text-gray-600">
                              <Mail className="w-4 h-4 mr-2" />
                              <span>{club.contactEmail}</span>
                            </div>
                          )}
                          {club.contactPhone && (
                            <div className="flex items-center text-sm text-gray-600">
                              <Phone className="w-4 h-4 mr-2" />
                              <span>{club.contactPhone}</span>
                            </div>
                          )}
                          {club.website && (
                            <div className="flex items-center text-sm text-gray-600">
                              <Globe className="w-4 h-4 mr-2" />
                              <a href={club.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                Visit Website
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Meeting Schedule */}
                    {club.meetingSchedule && (
                      <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                        <h4 className="font-medium text-blue-900 mb-1">Meeting Schedule</h4>
                        <p className="text-sm text-blue-800">{club.meetingSchedule}</p>
                      </div>
                    )}

                    {/* Stats */}
                    <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                      <div className="flex items-center">
                        <Users className="w-4 h-4 mr-1" />
                        <span>{Array.isArray(club.members) ? club.members.filter(m => m.status === 'approved' || m.status === 'restricted').length : (club.members || 0)} members</span>
                      </div>
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        <span>{club.events || 0} events</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 mt-4">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => {
                            if ((user?.isAdmin && !isAcademicAdmin) || isLeader || isCoordinator) {
                              handleViewMembers(club);
                            } else {
                              if (activeMember) {
                                toast.success("You are already an active member of this club!");
                                return;
                              }
                              const isPending = (club.userMembershipStatus === 'pending') || (userId && Array.isArray(club?.members) &&
                                club.members.some(m => String(m?.user?._id || m?.user) === String(userId) && m?.status === 'pending'));
                              if (isPending) {
                                toast.error("Your join request is already pending approval.");
                                        return;
                              }
                              handleJoinClub(club);
                            }
                          }}
                          className={`py-2 rounded-xl font-bold transition-all transform hover:scale-[1.02] shadow-md border-b-4 active:border-b-0 active:translate-y-1 ${((user?.isAdmin && !isAcademicAdmin) || isLeader || isCoordinator)
                            ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white border-green-700 hover:from-green-600 hover:to-emerald-700"
                            : activeMember
                              ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-emerald-700 cursor-default"
                              : ((club.userMembershipStatus === 'pending') || (userId && Array.isArray(club?.members) && club.members.some(m => String(m?.user?._id || m?.user) === String(userId) && m?.status === 'pending')))
                                ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white border-amber-700 cursor-default"
                                : "bg-gradient-to-r from-blue-600 to-indigo-700 text-white border-blue-800 hover:from-blue-700 hover:to-indigo-800"
                          }`}
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            <Users className="w-4 h-4" />
                            <span className="text-xs">
                              {((user?.isAdmin && !isAcademicAdmin) || isLeader || isCoordinator)
                                ? "Manage"
                                 : (() => {
                                   if (club.userMembershipStatus) {
                                     if (club.userMembershipStatus === 'pending') return "Pending";
                                     if (club.userMembershipStatus === 'approved') return "Joined";
                                     if (club.userMembershipStatus === 'rejected') return "Rejected";
                                   }
                                   const membersArr = Array.isArray(club?.members) ? club.members : [];
                                   if (membersArr.length > 0) {
                                     const userId = user?._id || user?.id;
                                     const existingMember = membersArr.find(m => String(m?.user?._id || m?.user) === String(userId));
                                     if (existingMember) {
                                       if (existingMember.status === 'pending') return "Pending";
                                       if (existingMember.status === 'approved') return "Joined";
                                       if (existingMember.status === 'rejected') return "Rejected";
                                     }
                                   }
                                   return "Join";
                                 })()}
                            </span>
                          </div>
                        </button>

                        <button
                          onClick={() => {
                            navigate(`/clubs/${club._id || club.id}`);
                          }}
                          className="py-2 rounded-xl font-bold bg-white text-blue-600 border-2 border-blue-100 hover:border-blue-300 hover:bg-blue-50 transition-all flex items-center justify-center gap-1.5 shadow-sm text-xs"
                        >
                          Read More →
                        </button>
                      </div>

                      {(!loginMatch && (activeMember || isCoordinator || userId && (String(club?.leadership?.president?._id || club?.leadership?.president) === String(userId))) ||
                       (!loginMatch && !isLeader && !user?.isAdmin && user?.username !== 'dbu10101030') ||
                       (!loginMatch && isLeader)) && (
                        <div className="grid grid-cols-2 gap-2">
                          {!loginMatch && (activeMember || isCoordinator || userId && (String(club?.leadership?.president?._id || club?.leadership?.president) === String(userId))) && (
                            <button
                              onClick={() => fetchClubReports(club._id || club.id)}
                              className="py-2 rounded-xl font-bold bg-white text-gray-700 border-2 border-gray-100 hover:border-blue-200 hover:text-blue-600 transition-all flex items-center justify-center gap-1 shadow-sm text-xs">
                              <FileText className="w-3.5 h-3.5" />
                              <span>Reports</span>
                            </button>
                          )}
                          {!loginMatch && !isLeader && !user?.isAdmin && user?.username !== 'dbu10101030' && (
                            <button
                              onClick={() => {
                                setSelectedClub(club);
                                setShowAskModal(true);
                              }}
                              className="py-2 rounded-xl font-bold bg-white text-indigo-700 border-2 border-indigo-100 hover:border-indigo-300 hover:text-indigo-800 transition-all flex items-center justify-center gap-1 shadow-sm text-xs">
                              <Mail className="w-3.5 h-3.5" />
                              <span>Ask Rep</span>
                            </button>
                          )}
                          {!loginMatch && isLeader && (
                            <button
                              onClick={() => {
                                setSelectedClub(club);
                                setReportFormData({
                                  title: "",
                                  description: "",
                                  date: new Date().toISOString().split('T')[0],
                                  documentUrl: "",
                                  file: null,
                                  reportType: "ACTIVITY"
                                });
                                setShowReportModal(true);
                              }}
                              className="py-2 rounded-xl font-bold bg-purple-50 text-purple-700 border-2 border-purple-100 hover:border-purple-300 hover:bg-purple-100 transition-all flex items-center justify-center gap-1 shadow-sm text-xs">
                              <FileText className="w-3.5 h-3.5" />
                              <span>Submit Report</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* ── Expandable Member Transparency Panel ── */}
                    {(activeMember || (user?.isAdmin && !isAcademicAdmin) || isLeader || isCoordinator) && (
                      <div className="mt-3 border-t border-gray-100 pt-3">
                        <button
                          onClick={async (e) => { e.stopPropagation(); await toggleMemberPanel(club._id || club.id); }}
                          className="w-full flex items-center justify-between text-xs font-semibold text-gray-500 hover:text-blue-600 transition-colors py-1 px-1 rounded-lg hover:bg-blue-50"
                        >
                          <span className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5" />
                            {expandedClubId === (club._id || club.id) ? 'Hide Members' : 'View All Members'}
                          </span>
                          <span className="text-gray-400">{expandedClubId === (club._id || club.id) ? '▲' : '▼'}</span>
                        </button>

                        {expandedClubId === (club._id || club.id) && (() => {
                          const detail = expandedClubData[club._id || club.id];
                          if (!detail) return (
                            <div className="mt-2 text-center py-4">
                              <div className="inline-block w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                          );

                          const president = detail.leadership?.president;
                          const vp = detail.leadership?.vicePresident;
                          const secretary = detail.leadership?.secretary;
                          const treasurer = detail.leadership?.treasurer;

                          const leadershipRoles = [
                            { label: 'President', person: president, color: 'bg-indigo-100 text-indigo-700' },
                            { label: 'Vice President', person: vp, color: 'bg-purple-100 text-purple-700' },
                            { label: 'Secretary', person: secretary, color: 'bg-teal-100 text-teal-700' },
                            { label: 'Treasurer', person: treasurer, color: 'bg-amber-100 text-amber-700' },
                          ].filter(r => r.person);

                          const approvedMembers = Array.isArray(detail.members)
                            ? detail.members.filter(m => ['approved', 'restricted'].includes(m?.status) && m?.user)
                            : [];

                          return (
                            <div className="mt-3 space-y-3">
                              {/* Leadership Grid */}
                              {leadershipRoles.length > 0 && (
                                <div>
                                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Leadership</p>
                                  <div className="grid grid-cols-2 gap-1.5">
                                    {leadershipRoles.map(r => (
                                      <div key={r.label} className={`rounded-lg px-2.5 py-2 ${r.color}`}>
                                        <p className="text-[9px] font-bold uppercase tracking-wider opacity-70">{r.label}</p>
                                        <p className="text-xs font-bold truncate">{r.person?.name || r.person?.username || '—'}</p>
                                        {r.person?.username && (
                                          <p className="text-[9px] opacity-60 truncate">@{r.person.username}</p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Members Table */}
                              <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                                  All Members · <span className="text-blue-500">{approvedMembers.length}</span>
                                </p>
                                <div className="max-h-52 overflow-y-auto rounded-xl border border-gray-100">
                                  <table className="w-full text-xs">
                                    <thead className="bg-gray-50 sticky top-0">
                                      <tr>
                                        <th className="px-2 py-1.5 text-left text-[9px] text-gray-400 font-black uppercase">#</th>
                                        <th className="px-2 py-1.5 text-left text-[9px] text-gray-400 font-black uppercase">Name</th>
                                        <th className="px-2 py-1.5 text-left text-[9px] text-gray-400 font-black uppercase">ID</th>
                                        <th className="px-2 py-1.5 text-left text-[9px] text-gray-400 font-black uppercase">Dept</th>
                                        <th className="px-2 py-1.5 text-left text-[9px] text-gray-400 font-black uppercase">Yr</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                      {approvedMembers.length === 0 ? (
                                        <tr><td colSpan="5" className="text-center py-3 text-gray-400 italic">No members yet</td></tr>
                                      ) : approvedMembers.map((m, idx) => {
                                        const presId = String(detail.leadership?.president?._id || detail.leadership?.president || '');
                                        const isPres = presId && String(m.user?._id || m.user) === presId;
                                        return (
                                          <tr key={m._id || idx} className={`${isPres ? 'bg-indigo-50/60' : 'hover:bg-gray-50/60'} transition-colors`}>
                                            <td className="px-2 py-2 text-gray-400 font-mono">{idx + 1}</td>
                                            <td className="px-2 py-2 font-semibold text-gray-800">
                                              <div className="flex items-center gap-1">
                                                {m.fullName || m.user?.name || '—'}
                                                {isPres && <span className="text-[7px] bg-indigo-600 text-white px-1 py-0.5 rounded font-black uppercase">Rep</span>}
                                                {m.status === 'restricted' && <span className="text-[7px] bg-orange-500 text-white px-1 py-0.5 rounded font-black uppercase">⚠</span>}
                                              </div>
                                            </td>
                                            <td className="px-2 py-2 text-gray-500 font-mono text-[10px]">{m.user?.username || m.user?.studentId || '—'}</td>
                                            <td className="px-2 py-2 text-gray-500 truncate max-w-[60px]">{m.department || '—'}</td>
                                            <td className="px-2 py-2 text-gray-500">{m.year || '—'}</td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </motion.div>
                )
              })
            ) : (
              <div className="col-span-full text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No clubs found
                </h3>
                <p className="text-gray-600 mb-4">
                  Try adjusting your search terms or category filter
                </p>
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedCategory("All");
                  }}
                  className="text-blue-600 hover:text-blue-700 font-medium">
                  Clear filters
                </button>
              </div>
            )}
          </div>
        )}

        {/* Join Club Modal */}
        {showJoinModal && selectedClub && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">
                    Join {selectedClub.name}
                  </h2>
                  <button
                    onClick={() => setShowJoinModal(false)}
                    className="text-gray-400 hover:text-gray-600">
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSubmitJoinRequest} className="space-y-4">
                  <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-sm text-blue-900 space-y-2 mb-4">
                    <p className="flex justify-between">
                      <span className="font-semibold text-blue-700">Full Name:</span>
                      <span className="text-gray-800">{joinFormData.fullName || user?.name}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="font-semibold text-blue-700">Department:</span>
                      <span className="text-gray-800">{joinFormData.department || user?.department}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="font-semibold text-blue-700">Academic Year:</span>
                      <span className="text-gray-800">{joinFormData.year || user?.year}</span>
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Why do you want to join this club? *
                    </label>
                    <textarea
                      required
                      value={joinFormData.background}
                      onChange={(e) =>
                        setJoinFormData({ ...joinFormData, background: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      rows="3"
                      placeholder="Tell us about your background and motivation"
                    />
                  </div>

                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setShowJoinModal(false)}
                      className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                      Submit Request
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Club Details Modal for Admin */}
        {showClubDetails && selectedClubDetails && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">
                    {selectedClubDetails?.name || "Club"} - Club Details
                  </h2>
                  <button
                    onClick={() => setShowClubDetails(false)}
                    className="text-gray-400 hover:text-gray-600">
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Club Information</h3>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">Category:</span> {selectedClubDetails?.category || "---"}</p>
                      <p><span className="font-medium">Founded:</span> {selectedClubDetails?.founded || "---"}</p>
                      <p><span className="font-medium">Total Members:</span> {Array.isArray(selectedClubDetails?.members) ? selectedClubDetails.members.filter(m => m?.status === 'approved' || m?.status === 'restricted').length : 0}</p>
                      <p><span className="font-medium">Status:</span> {selectedClubDetails?.status || "---"}</p>
                      {selectedClubDetails?.website && (
                        <p>
                          <span className="font-medium">Website:</span>
                          <a href={selectedClubDetails.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1">
                            {selectedClubDetails.website}
                          </a>
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Contact Information</h3>
                    <div className="space-y-2 text-sm">
                      {selectedClubDetails?.contactEmail && (
                        <p><span className="font-medium">Email:</span> {selectedClubDetails.contactEmail}</p>
                      )}
                      {selectedClubDetails?.contactPhone && (
                        <p><span className="font-medium">Phone:</span> {selectedClubDetails.contactPhone}</p>
                      )}
                      {selectedClubDetails?.officeLocation && (
                        <p><span className="font-medium">Office:</span> {selectedClubDetails.officeLocation}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Description</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{selectedClubDetails?.description || "No description available."}</p>
                </div>

                {/* Live Check-in, Certification Trackers & Event Manager */}
                {(() => {
                  const userId = user?._id || user?.id;
                  const activeMember = selectedClubDetails && ((selectedClubDetails.userMembershipStatus === 'approved') || (userId && Array.isArray(selectedClubDetails?.members) && 
                    selectedClubDetails.members.some(m => (String(m?.user?._id || m?.user) === String(userId)) && m?.status === 'approved')));
                  
                  return (
                    <>
                      {/* Approved Student Member View */}
                      {activeMember && (
                        <>
                          {/* Live Check-In Alert */}
                          {(() => {
                            const activeEvent = selectedClubDetails.events?.find(e => e.activeCheckIn === true);
                            if (!activeEvent) return null;
                            return (
                              <div className="mb-6 p-5 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 animate-pulse">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-emerald-500 text-white rounded-full flex items-center justify-center font-bold text-lg animate-bounce">
                                    ⚡
                                  </div>
                                  <div>
                                    <h4 className="font-extrabold text-sm text-emerald-950 flex items-center gap-2">
                                      Active Live Attendance Check-In
                                      {checkInTimeLeft !== null && (
                                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                                          checkInTimeLeft < 60 ? "bg-red-100 text-red-600 animate-pulse font-black" : "bg-emerald-100 text-emerald-800"
                                        }`}>
                                          ⏱️ {formatTime(checkInTimeLeft)}
                                        </span>
                                      )}
                                    </h4>
                                    <p className="text-xs text-emerald-700 font-semibold mt-0.5">
                                      Session: {activeEvent.title}
                                      {checkInTimeLeft !== null && checkInTimeLeft < 60 && (
                                        <span className="text-red-500 font-bold ml-2 animate-pulse">
                                          (Closing soon!)
                                        </span>
                                      )}
                                    </p>
                                  </div>
                                </div>
                                <form onSubmit={handleCheckIn} className="flex gap-2 w-full md:w-auto">
                                  <input
                                    type="text"
                                    maxLength="4"
                                    placeholder="Code"
                                    value={checkInCode}
                                    onChange={(e) => setCheckInCode(e.target.value.replace(/[^0-9]/g, ""))}
                                    disabled={checkingIn}
                                    className="px-4 py-2 border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-center font-mono font-bold w-32 tracking-widest text-emerald-900 bg-white"
                                  />
                                  <button
                                    type="submit"
                                    disabled={checkingIn || checkInCode.length !== 4}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl font-bold shadow-md transition-all text-xs disabled:opacity-50"
                                  >
                                    {checkingIn ? "Checking..." : "Submit"}
                                  </button>
                                </form>
                              </div>
                            );
                          })()}

                          {/* Certification and Awards eligibility progress card */}
                          {eligibleData && (
                            <div className="mb-8 p-5 bg-gradient-to-br from-indigo-950 to-slate-900 text-white rounded-3xl border border-indigo-900 shadow-xl relative overflow-hidden">
                              <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-xl"></div>
                              <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-amber-500/10 rounded-full blur-xl"></div>
                              
                              <h4 className="font-extrabold text-sm text-amber-400 mb-4 uppercase tracking-widest flex items-center gap-2">
                                ✨ Zero-Intervention Certificate Eligibility
                              </h4>
                              
                              <div className="flex flex-col md:flex-row items-center gap-6 justify-between">
                                <div className="flex items-center gap-4">
                                  <div className="relative w-20 h-20 flex items-center justify-center bg-slate-900/50 rounded-full border border-indigo-900/50">
                                    <svg className="w-16 h-16 transform -rotate-90">
                                      <circle cx="32" cy="32" r="28" stroke="#1e293b" strokeWidth="4" fill="transparent" />
                                      <circle 
                                        cx="32" 
                                        cy="32" 
                                        r="28" 
                                        stroke={eligibleData.eligible ? "#10b981" : "#f59e0b"} 
                                        strokeWidth="4" 
                                        fill="transparent" 
                                        strokeDasharray="175.9" 
                                        strokeDashoffset={175.9 - (175.9 * Math.min(100, eligibleData.percentage)) / 100}
                                        className="transition-all duration-1000 ease-out"
                                      />
                                    </svg>
                                    <span className="absolute text-xs font-black text-white">
                                      {eligibleData.percentage}%
                                    </span>
                                  </div>
                                  
                                  <div>
                                    <p className="text-xs text-indigo-200 font-semibold">Your Verified Attendance</p>
                                    <p className="text-lg font-black text-white mt-0.5">
                                      {eligibleData.attended} / {eligibleData.totalEvents} Sessions
                                    </p>
                                    <p className="text-[10px] text-indigo-300 mt-0.5">
                                      Requirement: {eligibleData.required}% minimum attendance
                                    </p>
                                  </div>
                                </div>
                                
                                <div className="flex flex-col items-center md:items-end text-center md:text-right">
                                  {eligibleData.eligible ? (
                                    <>
                                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-2 uppercase tracking-wide">
                                        👑 Certified Eligible
                                      </span>
                                      <button
                                        type="button"
                                        onClick={handleDownloadCertificate}
                                        className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 px-6 py-2.5 rounded-2xl font-black text-xs shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.03] active:scale-[0.98] flex items-center gap-1.5 border border-amber-300"
                                      >
                                        📜 Download Digital Certificate
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-2 uppercase tracking-wide">
                                        🔒 locked · {eligibleData.percentage}% / {eligibleData.required}%
                                      </span>
                                      <p className="text-[10px] text-gray-400 max-w-[240px]">
                                        Keep attending live sessions! You need {eligibleData.required}% to unlock your verified digital certificate of merit.
                                      </p>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {/* Club Leader / Coordinator / System Admin View */}
                      {(isLeader || isCoordinator || user?.isAdmin) && (
                        <div className="mb-8 p-6 bg-white rounded-3xl border border-gray-100 shadow-md">
                          <div className="flex justify-between items-center mb-6">
                            <div>
                              <h3 className="font-extrabold text-gray-900 flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-indigo-600" /> Event & Attendance Manager
                              </h3>
                              <p className="text-xs text-gray-400 mt-0.5">Create sessions and manage live student check-ins</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowCreateEvent(!showCreateEvent)}
                              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-1.5 rounded-xl font-bold text-xs transition-colors flex items-center gap-1"
                            >
                              <Plus className="w-4 h-4" /> {showCreateEvent ? "Cancel" : "Create Event"}
                            </button>
                          </div>

                          {/* Create Event Inline Form */}
                          {showCreateEvent && (
                            <form onSubmit={handleCreateEvent} className="mb-6 p-5 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                              <h4 className="font-bold text-sm text-gray-800">Add New Event</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs font-semibold text-gray-500 mb-1">Event Title *</label>
                                  <input
                                    type="text"
                                    required
                                    placeholder="e.g. Weekly Debate Session"
                                    value={eventForm.title}
                                    onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white text-gray-800"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-gray-500 mb-1">Location / Venue</label>
                                  <input
                                    type="text"
                                    placeholder="e.g. Block 42, Room 102"
                                    value={eventForm.location}
                                    onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white text-gray-800"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-gray-500 mb-1">Date *</label>
                                  <input
                                    type="date"
                                    required
                                    value={eventForm.date}
                                    onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white text-gray-800"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-gray-500 mb-1">Description</label>
                                  <input
                                    type="text"
                                    placeholder="e.g. Discussion on modern digital democracy"
                                    value={eventForm.description}
                                    onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white text-gray-800"
                                  />
                                </div>
                              </div>
                              <div className="flex justify-end gap-2 pt-2">
                                <button
                                  type="submit"
                                  disabled={creatingEvent}
                                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl font-bold shadow-md transition-colors text-xs disabled:opacity-50"
                                >
                                  {creatingEvent ? "Creating..." : "Save Event"}
                                </button>
                              </div>
                            </form>
                          )}

                          {/* Events List */}
                          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                            {!selectedClubDetails.events || selectedClubDetails.events.length === 0 ? (
                              <div className="text-center py-8 text-gray-400 italic text-sm">No events scheduled yet.</div>
                            ) : (
                              [...selectedClubDetails.events]
                                .sort((a, b) => new Date(b.date) - new Date(a.date))
                                .map((event) => (
                                  <div key={event._id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <h4 className="font-bold text-sm text-gray-800">{event.title}</h4>
                                        {event.activeCheckIn && (
                                          <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                                            Live Check-In Open
                                          </span>
                                        )}
                                        {event.status === 'completed' && (
                                          <span className="bg-gray-100 text-gray-500 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                                            Completed
                                          </span>
                                        )}
                                      </div>
                                      {event.description && <p className="text-xs text-gray-500 mt-1">{event.description}</p>}
                                      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-400 font-medium">
                                        <span>📅 {new Date(event.date).toLocaleDateString()}</span>
                                        {event.location && <span>📍 {event.location}</span>}
                                        {event.status === 'completed' && <span>👥 {event.attendees?.length || 0} Attended</span>}
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                      {event.status === 'planned' && (
                                        <button
                                          type="button"
                                          onClick={() => handleStartSession(event._id)}
                                          disabled={startingSessionEventId === event._id}
                                          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-xl font-bold text-xs transition-colors shadow-sm disabled:opacity-50"
                                        >
                                          {startingSessionEventId === event._id ? "Starting..." : "Start Session"}
                                        </button>
                                      )}

                                      {event.status === 'ongoing' && event.activeCheckIn && (
                                        <div className="flex flex-col md:flex-row items-center gap-3 bg-white p-2.5 rounded-xl border border-emerald-200">
                                          <div className="text-center">
                                            <p className="text-[8px] font-bold text-emerald-600 uppercase tracking-widest">Attendance Code</p>
                                            <p className="text-xl font-black text-emerald-950 tracking-wider leading-none mt-0.5 font-mono">{event.attendanceCode}</p>
                                          </div>
                                          {checkInTimeLeft !== null && (
                                            <div className="text-center border-l border-gray-100 pl-3">
                                              <p className="text-[8px] font-bold text-indigo-600 uppercase tracking-widest">Time Remaining</p>
                                              <p className={`text-xl font-mono leading-none mt-0.5 ${
                                                checkInTimeLeft < 60 ? "text-red-500 font-black animate-pulse" : "text-slate-800 font-bold"
                                              }`}>
                                                {formatTime(checkInTimeLeft)}
                                              </p>
                                            </div>
                                          )}
                                          <button
                                            type="button"
                                            onClick={() => handleEndSession(event._id)}
                                            disabled={endingSessionEventId === event._id}
                                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-xl font-bold text-xs transition-colors shadow-sm disabled:opacity-50"
                                          >
                                            {endingSessionEventId === event._id ? "Ending..." : "End & Close Check-In"}
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}

                {/* Structural Leaders */}
                <div className="mb-8">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Award className="w-5 h-5 text-indigo-600" /> Structural Leaders
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-indigo-50 text-indigo-900 rounded-2xl p-4 border border-indigo-100 flex flex-col items-center text-center shadow-sm">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 mb-1.5">President</span>
                      <span className="font-extrabold text-xs truncate w-full">
                        {selectedClubDetails?.leadership?.president?.name || selectedClubDetails?.leadership?.president?.username || 'Representative'}
                      </span>
                    </div>
                    <div className="bg-purple-50 text-purple-900 rounded-2xl p-4 border border-purple-100 flex flex-col items-center text-center shadow-sm">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-500 mb-1.5">Vice President</span>
                      <span className="font-extrabold text-xs truncate w-full">
                        {selectedClubDetails?.leadership?.vicePresident?.name || selectedClubDetails?.leadership?.vicePresident?.username || 'Assistant Leader'}
                      </span>
                    </div>
                    <div className="bg-teal-50 text-teal-900 rounded-2xl p-4 border border-teal-100 flex flex-col items-center text-center shadow-sm">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-teal-500 mb-1.5">Secretary</span>
                      <span className="font-extrabold text-xs truncate w-full">
                        {selectedClubDetails?.leadership?.secretary?.name || selectedClubDetails?.leadership?.secretary?.username || 'Secretary'}
                      </span>
                    </div>
                    <div className="bg-amber-50 text-amber-900 rounded-2xl p-4 border border-amber-100 flex flex-col items-center text-center shadow-sm">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 mb-1.5">Treasurer</span>
                      <span className="font-extrabold text-xs truncate w-full">
                        {selectedClubDetails?.leadership?.treasurer?.name || selectedClubDetails?.leadership?.treasurer?.username || 'Treasurer'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Authorized Members table VS Public objectives & schedule panel */}
                {(user?.isAdmin || isCoordinator || isLeader) ? (
                  <div className="mb-6">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Users className="w-5 h-5 text-blue-600" /> Club Members 
                      <span className="text-xs font-normal text-gray-400 ml-2">({Array.isArray(selectedClubDetails?.members) ? selectedClubDetails.members.filter(m => m?.status === 'approved' || m?.status === 'restricted').length : 0} enrolled)</span>
                    </h3>
                    <div className="border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                          <tr>
                            <th className="px-4 py-3">Full Name</th>
                            <th className="px-4 py-3">Username</th>
                            <th className="px-4 py-3">Department</th>
                            <th className="px-4 py-3">Year</th>
                            <th className="px-4 py-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {Array.isArray(selectedClubDetails?.members) && selectedClubDetails.members.filter(m => ['approved', 'restricted'].includes(m?.status)).length > 0 ? (
                            [...selectedClubDetails.members]
                              .filter(m => ['approved', 'restricted'].includes(m?.status) && m?.user)
                              .sort((a, b) => {
                                const presidentId = String(selectedClubDetails?.leadership?.president?._id || selectedClubDetails?.leadership?.president);
                                const isAPres = String(a.user?._id || a.user) === presidentId;
                                const isBPres = String(b.user?._id || b.user) === presidentId;
                                return isBPres - isAPres;
                              })
                              .map((member, idx) => (
                              <tr key={idx} className="hover:bg-blue-50/40 transition-colors">
                                <td className="px-4 py-3 font-medium text-gray-900">
                                  <div className="flex items-center gap-2">
                                    {member.fullName || member.user?.name || "Member"}
                                    {String(selectedClubDetails?.leadership?.president?._id || selectedClubDetails?.leadership?.president) === String(member.user?._id || member.user) && (
                                      <span className="px-2 py-0.5 text-[10px] bg-indigo-600 text-white rounded-full font-black uppercase shadow-sm">
                                        Representative
                                      </span>
                                    )}
                                    {member.status === 'restricted' && (
                                      <span className="px-2 py-0.5 text-[10px] bg-orange-600 text-white rounded-full font-black uppercase shadow-sm">
                                        Restricted
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-gray-500">@{member.user?.username || member.username || "---"}</td>
                                <td className="px-4 py-3 text-gray-600">{member.department || "General"}</td>
                                <td className="px-4 py-3 text-gray-600">{member.year || "---"}</td>
                                <td className="px-4 py-3 text-right overflow-visible">
                                  {(() => {
                                    const presidentId = String(selectedClubDetails?.leadership?.president?._id || selectedClubDetails?.leadership?.president);
                                    const isMemberRep = String(member.user?._id || member.user) === presidentId;
                                    const isMemberCoordinator = member.user?.role === 'clubs_coordinator' || member.user?.username === 'dbu10101040';
                                    const canManage = isCoordinator || (isLeader && !isMemberRep && !isMemberCoordinator);
                                    if (!canManage) return <span className="text-gray-300 italic text-[10px]">Read Only</span>;
                                    return (
                                      <div className="relative inline-block text-left">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveDropdownId(activeDropdownId === member._id ? null : member._id);
                                          }}
                                          className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
                                        >
                                          <MoreVertical className="w-5 h-5" />
                                        </button>
                                        {activeDropdownId === member._id && (
                                          <div 
                                            className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-2xl border border-gray-100 z-[100] py-1 overflow-hidden"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <button
                                              onClick={() => handleRestrictMember(selectedClubDetails?._id, member._id, member.status, member.fullName || member.user?.name)}
                                              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-orange-50 transition-colors"
                                            >
                                              <AlertCircle className="w-4 h-4 text-orange-500" />
                                              {member.status === 'restricted' ? 'Unrestrict Student' : 'Restrict Student'}
                                            </button>
                                            <div className="border-t border-gray-50 my-1"></div>
                                            <button
                                              onClick={() => handleRemoveMember(selectedClubDetails?._id, member._id, member.fullName || member.user?.name)}
                                              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors font-semibold"
                                            >
                                              <UserMinus className="w-4 h-4" />
                                              Delete Member
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr><td colSpan="5" className="p-8 text-center text-gray-400 italic">No approved members found</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {selectedClubDetails?.requirements && (
                      <div className="p-5 bg-emerald-50 text-emerald-900 rounded-2xl border border-emerald-100 shadow-sm">
                        <h4 className="font-extrabold text-sm text-emerald-950 mb-2 flex items-center gap-2">🎯 Club Objectives & Requirements</h4>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{selectedClubDetails.requirements}</p>
                      </div>
                    )}
                    {selectedClubDetails?.meetingSchedule && (
                      <div className="p-5 bg-blue-50 text-blue-900 rounded-2xl border border-blue-100 shadow-sm">
                        <h4 className="font-extrabold text-sm text-blue-950 mb-2 flex items-center gap-2">📅 Activities & Meeting Schedule</h4>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{selectedClubDetails.meetingSchedule}</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-center space-x-4">
                  {!(user?.isAdmin || isCoordinator || isLeader) && (
                    <button
                      onClick={() => {
                        const userId = user?._id || user?.id;
                        const activeMember = (selectedClubDetails.userMembershipStatus === 'approved') || (userId && Array.isArray(selectedClubDetails?.members) && 
                          selectedClubDetails.members.some(m => (String(m?.user?._id || m?.user) === String(userId)) && m?.status === 'approved'));
                        
                        if (activeMember) {
                          toast.success("You are already an active member!");
                          return;
                        }
                        const isPending = (selectedClubDetails.userMembershipStatus === 'pending') || (userId && Array.isArray(selectedClubDetails?.members) &&
                          selectedClubDetails.members.some(m => String(m?.user?._id || m?.user) === String(userId) && m?.status === 'pending'));
                        if (isPending) {
                          toast.error("Your join request is already pending.");
                          return;
                        }
                        setShowClubDetails(false);
                        handleJoinClub(selectedClubDetails);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-xl font-bold shadow-md transition-all transform hover:scale-[1.02]"
                    >
                      Join Club
                    </button>
                  )}

                  {isCoordinator && (
                    <button
                      onClick={() => {
                        setShowAssignManagerModal(true);
                        setAssignUserSearchTerm("");
                        if (selectedClubDetails && Array.isArray(selectedClubDetails?.members)) {
                          const approvedMembers = selectedClubDetails.members.filter(m => m?.status === 'approved' && m?.user);
                          setSearchedUsers(approvedMembers.map(m => m.user));
                        } else {
                          setSearchedUsers([]);
                        }
                      }}
                      className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
                      Change Rep
                    </button>
                  )}
                  {(!isCoordinator && (user?.isAdmin || (user?._id || user?.id) && (String(selectedClubDetails?.leadership?.president?._id || selectedClubDetails?.leadership?.president) === String(user?._id || user?.id)))) && (
                    <button
                      onClick={() => fetchManagerPendingReports(selectedClubDetails._id || selectedClubDetails.id)}
                      className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors">
                      Review Member Submissions
                    </button>
                  )}
                  {(user?.isAdmin || isCoordinator || ((user?._id || user?.id) && (String(selectedClubDetails?.leadership?.president?._id || selectedClubDetails?.leadership?.president) === String(user?._id || user?.id)))) && (
                    <>
                      <button
                        onClick={() => {
                          setSelectedClub(selectedClubDetails);
                          fetchJoinRequests(selectedClubDetails._id || selectedClubDetails.id);
                        }}
                        className="bg-amber-600 text-white px-6 py-2 rounded-lg hover:bg-amber-700 transition-colors flex items-center gap-2">
                        View Join Requests
                        {Array.isArray(selectedClubDetails?.members) && selectedClubDetails.members.filter(m => m?.status === 'pending').length > 0 && (
                          <span className="bg-white text-amber-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                            {selectedClubDetails.members.filter(m => m?.status === 'pending').length}
                          </span>
                        )}
                      </button>
                      <button
                        onClick={() => fetchInbox(selectedClubDetails._id || selectedClubDetails.id)}
                        className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors shadow-sm flex items-center gap-2">
                        <Mail className="w-4 h-4" /> Inbox
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setShowClubDetails(false)}
                    className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors">
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Restriction Reason Modal */}
        {showRestrictionModal && selectedMemberForAction && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden"
            >
              <div className="bg-red-600 p-6 text-white text-center">
                <AlertCircle className="w-12 h-12 mx-auto mb-2" />
                <h2 className="text-xl font-bold uppercase tracking-wider">Restrict Student Access</h2>
                <p className="text-red-100 text-sm mt-1">Providing a written reason is mandatory</p>
              </div>
              
              <div className="p-6">
                <div className="mb-6">
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2 tracking-widest">
                    Restricting Access for:
                  </label>
                  <p className="text-lg font-black text-gray-900">{selectedMemberForAction.name}</p>
                </div>

                <div className="mb-6">
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2 tracking-widest">
                    Written Reason
                  </label>
                  <textarea
                    value={restrictionReason}
                    onChange={(e) => setRestrictionReason(e.target.value)}
                    placeholder="e.g. Violation of club funding policies or code of conduct..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all resize-none h-32"
                  ></textarea>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowRestrictionModal(false)}
                    className="flex-1 px-6 py-3 rounded-2xl font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitRestriction}
                    className="flex-1 px-6 py-3 rounded-2xl font-bold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
                  >
                    Confirm Restriction
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Assign Manager Modal */}
        {showAssignManagerModal && selectedClubDetails && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
            <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">
                    Change Representative
                  </h2>
                  <button
                    onClick={() => setShowAssignManagerModal(false)}
                    className="text-gray-400 hover:text-gray-600">
                    ✕
                  </button>
                </div>
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-4">
                    Search for an approved member to assign as the Club Representative (President) for <strong>{selectedClubDetails.name}</strong>.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Search by name, username..."
                      value={assignUserSearchTerm}
                      onChange={(e) => setAssignUserSearchTerm(e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      onClick={handleSearchUsersForAssign}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
                      Search
                    </button>
                  </div>
                </div>

                <div className="space-y-3 max-h-60 overflow-y-auto mt-4">
                  {(searchedUsers || []).length === 0 ? (
                    <p className="text-gray-500 text-center text-sm italic py-4">No users found. Try searching.</p>
                  ) : (
                    (searchedUsers || []).map((u) => (
                      <div key={u._id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50">
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{u.name}</p>
                          <p className="text-xs text-gray-500">@{u.username} • {u.department || 'N/A'}</p>
                        </div>
                        <button
                          onClick={() => handleAssignManager(u._id)}
                          className="bg-indigo-100 text-indigo-700 px-3 py-1 text-xs font-bold rounded hover:bg-indigo-200 transition-colors">
                          Assign
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Join Requests Modal */}
        {showJoinRequests && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">
                    Join Requests - {selectedClub?.name}
                  </h2>
                  <button
                    onClick={() => setShowJoinRequests(false)}
                    className="text-gray-400 hover:text-gray-600">
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  {!(joinRequests || []).length ? (
                    <p className="text-gray-600 text-center py-8">
                      No pending join requests
                    </p>
                  ) : (
                    (joinRequests || []).map((request) => (
                      <div
                        key={request._id}
                        className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {request.fullName}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {request.department} - {request.year}
                            </p>
                            {request.user?.username && (
                              <p className="text-sm text-gray-600">
                                Username: {request.user.username}
                              </p>
                            )}
                            <p className="text-xs text-gray-500">
                              Applied: {new Date(request.joinedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex gap-2">
                             {(user?.isAdmin || isCoordinator || (String(selectedClub?._id || selectedClub?.id) && String(selectedClub?.leadership?.president?._id || selectedClub?.leadership?.president) === String(user?._id || user?.id))) ? (
                               <>
                                 <button
                                   onClick={() => handleApproveRequest(selectedClub._id || selectedClub.id, request._id)}
                                   className="bg-green-600 text-white px-3 py-1 rounded text-sm font-bold hover:bg-green-700 transition-colors shadow-sm">
                                   Approve
                                 </button>
                                 <button
                                   onClick={() => handleRejectRequest(selectedClub._id || selectedClub.id, request._id)}
                                   className="bg-red-600 text-white px-3 py-1 rounded text-sm font-bold hover:bg-red-700 transition-colors shadow-sm">
                                   Reject
                                 </button>
                               </>
                             ) : (
                               <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded text-xs font-bold uppercase">Pending Review</span>
                             )}
                           </div>
                        </div>
                        {request.background && (
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-1">
                              Background:
                            </p>
                            <p className="text-sm text-gray-600">{request.background}</p>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Activity Report Submission Modal (Club Rep) */}
        {showReportModal && selectedClub && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-lg w-full max-h-[75vh] flex flex-col">
              <div className="p-6 border-b border-gray-100 shrink-0 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <FileText className="text-purple-600" />
                  {reportFormData.reportType === 'ANNUAL_REPORT' ? 'Submit Annual Report' : 'Submit Activity Report'}
                </h2>
                <button onClick={() => setShowReportModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>

              <form onSubmit={handleSubmitReport} className="flex flex-col flex-1 h-full overflow-hidden">
                <div className="p-6 space-y-4 flex-1 overflow-y-auto max-h-[60vh]">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Report Title *</label>
                    <input
                      type="text"
                      required
                      value={reportFormData.title}
                      onChange={(e) => setReportFormData({ ...reportFormData, title: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      placeholder="e.g. Annual Sports Day 2024"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Submission Type *</label>
                    <select
                      value={reportFormData.reportType}
                      onChange={(e) => setReportFormData({ ...reportFormData, reportType: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="ACTIVITY">General Activity Report</option>
                      <option value="ANNUAL_REPORT">Annual Report</option>
                      <option value="DOCUMENT">Club Document</option>
                      <option value="ADMIN_REQUEST">Request to Club Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Activity Date *</label>
                    <input
                      type="date"
                      required
                      value={reportFormData.date}
                      onChange={(e) => setReportFormData({ ...reportFormData, date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Detailed Description *</label>
                    <textarea
                      required
                      value={reportFormData.description}
                      onChange={(e) => setReportFormData({ ...reportFormData, description: e.target.value })}
                      rows="5"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      placeholder="Describe what happened, the impact, and attendance..."
                    ></textarea>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Document Link (Optional)</label>
                    <input
                      type="url"
                      value={reportFormData.documentUrl}
                      onChange={(e) => setReportFormData({ ...reportFormData, documentUrl: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Physical File Upload (PDF/Images)</label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg">
                      <div className="space-y-1 text-center">
                        <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        <div className="flex text-sm text-gray-600">
                          <label className="relative cursor-pointer bg-white rounded-md font-medium text-purple-600 hover:text-purple-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-purple-500">
                            <span>Upload a file</span>
                            <input
                              type="file"
                              className="sr-only"
                              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                              onChange={(e) => setReportFormData({ ...reportFormData, file: e.target.files[0] })}
                            />
                          </label>
                          <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs text-gray-500">{reportFormData.file ? reportFormData.file.name : 'PDF, PNG, JPG up to 10MB'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl shrink-0 flex gap-4">
                  <button type="button" onClick={() => setShowReportModal(false)} className="flex-1 bg-white border border-gray-200 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
                  <button type="submit" className="flex-1 bg-purple-600 text-white font-bold py-3 rounded-xl hover:bg-purple-700 transition-colors shadow-lg">Submit for Review</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Pending Reports List Modal (Coordinator) */}
        {showPendingReports && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Pending Activity Reports</h2>
                  <p className="text-gray-500 text-sm">Review submissions from Club Representatives</p>
                </div>
                <button onClick={() => setShowPendingReports(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                {!(pendingReports || []).length ? (
                  <div className="text-center py-20">
                    <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900">All caught up!</h3>
                    <p className="text-gray-500">There are no pending reports to review.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(pendingReports || []).map(report => (
                      <div key={report._id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:border-indigo-300 transition-all group">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex gap-4">
                            <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                              <FileText />
                            </div>
                            <div>
                              <h4 className="font-bold text-lg text-gray-900">{report.title}</h4>
                              <p className="text-sm text-indigo-600 font-medium">{report.club?.name}</p>
                            </div>
                          </div>
                          <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest ${
                            report.status === 'PUBLISHED' || report.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 
                            report.status === 'RETURNED' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {report.status === 'PUBLISHED' || report.status === 'APPROVED' ? 'Accepted' : 
                             report.status === 'RETURNED' ? 'Rejected' : 'Pending'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2 mb-4">{report.description}</p>
                        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                          <span className="text-xs text-gray-400">By {report.submittedBy?.name} on {new Date(report.date).toLocaleDateString()}</span>
                          <button
                            onClick={() => { setSelectedReport(report); setShowReportReviewModal(true); }}
                            className="text-indigo-600 text-sm font-bold flex items-center gap-1 hover:underline">
                            Open Detail View <Search className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-6 border-t border-gray-100 bg-white">
                <button onClick={() => setShowPendingReports(false)} className="w-full bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-black transition-colors">Close Dashboard</button>
              </div>
            </div>
          </div>
        )}
        {/* Manager Pending Reports List Modal */}
        {showManagerPendingReports && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Member Submissions</h2>
                  <p className="text-gray-500 text-sm">Review activity reports and documents submitted by your club members</p>
                </div>
                <button onClick={() => setShowManagerPendingReports(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                {!(managerPendingReports || []).length ? (
                  <div className="text-center py-20">
                    <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900">All caught up!</h3>
                    <p className="text-gray-500">There are no pending member submissions to review.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(managerPendingReports || []).map(report => (
                      <div key={report._id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:border-indigo-300 transition-all group relative">
                        <div className="flex items-start justify-between mb-3 pr-8">
                          <div className="flex gap-4">
                            <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                              <FileText />
                            </div>
                            <div>
                              <h4 className="font-bold text-lg text-gray-900">{report.title}</h4>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest ${
                              report.status === 'PUBLISHED' || report.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 
                              report.status === 'RETURNED' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {report.status === 'PUBLISHED' || report.status === 'APPROVED' ? 'Accepted' : 
                               report.status === 'RETURNED' ? 'Rejected' : 'Pending'}
                            </span>
                            
                            {/* Dropdown Menu Trigger */}
                            <div className="relative">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveDropdownId(activeDropdownId === report._id ? null : report._id);
                                }}
                                className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
                              >
                                <MoreVertical className="w-5 h-5" />
                              </button>
                              
                              {activeDropdownId === report._id && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 py-1 overflow-hidden">
                                  <button
                                    onClick={() => { setSelectedReport(report); setShowReportReviewModal(true); }}
                                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
                                  >
                                    <Search className="w-4 h-4 text-indigo-500" /> Review / Open
                                  </button>
                                  <div className="border-t border-gray-50 my-1"></div>
                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      if (window.confirm("Are you sure you want to permanently delete this member submission?")) {
                                        try {
                                          await apiService.deleteReport(report._id);
                                          toast.success("Submission deleted successfully!");
                                          // Use the report's own club ID as the most reliable source
                                          const clubId = report.club?._id || report.club || selectedClubDetails?._id || selectedClubDetails?.id;
                                          fetchManagerPendingReports(clubId, true);
                                        } catch (err) {
                                          toast.error(err.message || "Failed to delete submission");
                                        }
                                      }
                                    }}
                                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors font-semibold text-left"
                                  >
                                    <span>🗑️</span> Remove Submission
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2 mb-4">{report.description}</p>
                        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                          <span className="text-xs text-gray-400">By {report.submittedBy?.name} on {new Date(report.date).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-6 border-t border-gray-100 bg-white">
                <button onClick={() => setShowManagerPendingReports(false)} className="w-full bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-black transition-colors">Close</button>
              </div>
            </div>
          </div>
        )}

        {/* Report Review Detail Modal */}
        {showReportReviewModal && selectedReport && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-[60]">
            <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-8">
                <div className="flex gap-4 mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200">
                    <FileText className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-extrabold text-gray-900">{selectedReport.title}</h3>
                    <p className="text-indigo-600 font-bold tracking-tight">{selectedReport.club?.name || 'Member Submission'} Review</p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-2xl p-6 mb-6">
                  <h4 className="text-xs font-black text-gray-400 uppercase tracking-tighter mb-4">Report Content</h4>
                  <div className="flex items-center gap-6 mb-4 text-sm font-medium text-gray-500">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" /> {new Date(selectedReport.date).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" /> {selectedReport.submittedBy?.name}
                    </div>
                  </div>
                  <div className="text-gray-800 leading-relaxed whitespace-pre-wrap text-lg font-medium italic border-l-4 border-indigo-200 pl-4 py-2">
                    "{selectedReport.description}"
                  </div>
                  {/* The forced Download Block */}
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="font-bold text-blue-800 mb-2">ATTACHED DOCUMENT:</p>
                    <a
                      href={selectedReport.fileUrl ? `${apiService.baseURL}/reports/download/${selectedReport.fileUrl.split('/').pop()}` : (selectedReport.documentUrl || '#')}
                      target="_blank"
                      rel="noreferrer"
                      download
                      className="text-blue-600 underline font-medium hover:text-blue-800"
                      onClick={(e) => {
                        if (!selectedReport.fileUrl && !selectedReport.documentUrl) {
                          e.preventDefault();
                          alert('Error: No file attached to this report.');
                        }
                      }}
                    >
                      📎 Click here to safely download the internal report file
                    </a>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-black text-gray-700 mb-2 uppercase tracking-widest">{showManagerPendingReports ? "Manager Feedback" : "Main Coordinator Feedback"}</label>
                    <textarea
                      value={reportFeedback}
                      onChange={(e) => setReportFeedback(e.target.value)}
                      placeholder="Add comments or reasons for returning the report..."
                      className="w-full px-5 py-4 border-2 border-gray-100 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 transition-all outline-none min-h-[120px]"
                    ></textarea>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => handleReviewReport('RETURNED')}
                      className="flex items-center justify-center gap-2 bg-rose-50 text-rose-600 font-black py-4 rounded-2xl hover:bg-rose-100 transition-all border-2 border-rose-100 uppercase tracking-widest text-xs">
                      <XCircle className="w-5 h-5" /> Send Back (Return)
                    </button>
                    {showManagerPendingReports ? (
                      <button
                        onClick={() => handleReviewReport('PENDING_REVIEW')}
                        className="flex items-center justify-center gap-2 bg-purple-600 text-white font-black py-4 rounded-2xl hover:bg-purple-700 transition-all shadow-lg uppercase tracking-widest text-xs">
                        <CheckCircle className="w-5 h-5" /> Send to Coordinator
                      </button>
                    ) : (
                      <button
                        onClick={() => handleReviewReport('PUBLISHED')}
                        className="flex items-center justify-center gap-2 bg-emerald-600 text-white font-black py-4 rounded-2xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 uppercase tracking-widest text-xs">
                        <CheckCircle className="w-5 h-5" /> Approve & Publish
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex gap-4 mt-6 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => { setShowReportReviewModal(false); setReportFeedback(""); }}
                    className="flex-1 py-3 bg-gray-100 text-gray-500 font-bold hover:bg-gray-200 transition-colors rounded-xl text-xs uppercase tracking-widest"
                  >
                    Cancel Review
                  </button>
                  <button
                    onClick={async () => {
                      if (window.confirm("Are you sure you want to permanently delete this submission?")) {
                        try {
                          // Use the report's own club ID as the most reliable source
                          const clubId = selectedReport.club?._id || selectedReport.club || selectedClubDetails?._id || selectedClubDetails?.id;
                          await apiService.deleteReport(selectedReport._id);
                          toast.success("Submission deleted successfully!");
                          setShowReportReviewModal(false);
                          setSelectedReport(null);
                          fetchManagerPendingReports(clubId, true);
                        } catch (err) {
                          toast.error(err.message || "Failed to delete submission");
                        }
                      }
                    }}
                    className="flex-1 py-3 bg-red-600 text-white font-bold hover:bg-red-700 transition-colors rounded-xl text-xs uppercase tracking-widest"
                  >
                    🗑️ Delete Submission
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Club Reports View Modal (Public/Members) */}
        {showClubReports && selectedClub && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedClub.name} - Activity Reports</h2>
                  <p className="text-gray-500 text-sm">View latest updates and achievements</p>
                </div>
                <button onClick={() => setShowClubReports(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                {!(clubReports || []).length ? (
                  <div className="text-center py-20">
                    <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 font-medium">No activity reports published yet.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {(clubReports || []).map((report) => (
                      <div key={report._id} className={`bg-white p-6 rounded-2xl shadow-sm border relative ${report.reportType === 'ANNUAL_REPORT' ? 'border-red-200 bg-red-50/10' : 'border-gray-100'}`}>
                        <div className="flex justify-between items-start mb-4 pr-8">
                          <div>
                            <h3 className="text-lg font-bold text-gray-900">
                              {report.title}
                              {report.reportType === 'ANNUAL_REPORT' && <span className="ml-2 text-[10px] bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-bold uppercase">Annual Report</span>}
                            </h3>
                            <span className="text-xs text-gray-400 font-medium">{new Date(report.date).toLocaleDateString()}</span>
                          </div>
                          
                          {/* Dropdown Menu Trigger */}
                          <div className="absolute top-6 right-6">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdownId(activeDropdownId === report._id ? null : report._id);
                              }}
                              className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
                              title="More Options"
                            >
                              <MoreVertical className="w-5 h-5" />
                            </button>
                            
                            {activeDropdownId === report._id && (
                              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 py-1 overflow-hidden">
                                {report.fileUrl && (
                                  <a
                                    href={report.fileUrl ? `${apiService.baseURL}/reports/download/${report.fileUrl.split('/').pop()}` : '#'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
                                  >
                                    <span>📄</span> Download File
                                  </a>
                                )}
                                {(isLeader || isCoordinator || user?.isAdmin) && (
                                  <>
                                    <div className="border-t border-gray-50 my-1"></div>
                                    <button
                                      onClick={async () => {
                                        if (window.confirm("Are you sure you want to permanently delete this report?")) {
                                          try {
                                            await apiService.deleteReport(report._id);
                                            toast.success("Report deleted successfully!");
                                            const clubId = selectedClub._id || selectedClub.id;
                                            const reports = await apiService.getClubReports(clubId);
                                            setClubReports(reports);
                                          } catch (error) {
                                            toast.error(error.message || "Failed to delete report");
                                          }
                                        }
                                      }}
                                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors font-semibold text-left"
                                    >
                                      <span>🗑️</span> Delete Report
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <p className="text-gray-600 text-sm leading-relaxed mb-4 whitespace-pre-wrap">{report.description}</p>

                        <div className="flex flex-col gap-2">
                          {report.status === 'PUBLISHED' || report.status === 'APPROVED' ? (
                            <div className="flex items-center gap-2 text-xs text-green-700 font-bold bg-green-50 w-fit px-3 py-1 rounded-full border border-green-200">
                              <CheckCircle className="w-3 h-3" /> {report.status === 'APPROVED' ? 'APPROVED BY COORDINATOR' : 'PUBLISHED ACTIVITY'}
                            </div>
                          ) : report.status === 'RETURNED' ? (
                            <div className="flex items-center gap-2 text-xs text-red-700 font-bold bg-red-50 w-fit px-3 py-1 rounded-full border border-red-200">
                              <AlertCircle className="w-3 h-3" /> NEEDS REVISION
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-xs text-amber-700 font-bold bg-amber-50 w-fit px-3 py-1 rounded-full border border-amber-200">
                              <CheckCircle className="w-3 h-3 text-amber-500" /> PENDING COORDINATOR REVIEW
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-6 border-t border-gray-100 bg-white">
                <button onClick={() => setShowClubReports(false)} className="w-full bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-black transition-colors">Close View</button>
              </div>
            </div>
          </div>
        )}

        {/* Create Club CTA */}
        <div className="bg-gradient-to-r from-green-600 to-green-800 rounded-2xl p-6 lg:p-8 text-center text-white">
          <div className="max-w-2xl mx-auto">
            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8" />
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold mb-4">
              Want to Start a New Club?
            </h2>
            <p className="text-green-100 mb-6 text-lg">
              Have an idea for a new club or organization? We support student
              initiatives and can help you get started with the registration process.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => user?.isAdmin ? setShowNewClubForm(true) : toast.info("Contact an admin to start a new club")}
                className="bg-white text-green-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
                Start a Club
              </button>
              <button className="border-2 border-white text-white px-6 py-3 rounded-lg font-semibold hover:bg-white hover:text-green-600 transition-colors">
                Learn More
              </button>
            </div>
          </div>
        </div>
        {/* Ask Question Modal */}
        {showAskModal && selectedClub && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">
                    Ask {selectedClub.name} a Question
                  </h2>
                  <button onClick={() => setShowAskModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>
                <form onSubmit={handleAskQuestion}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                    <textarea
                      required
                      value={askContent}
                      onChange={(e) => setAskContent(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      rows="4"
                      placeholder="Type your question here..."
                    />
                  </div>
                  <div className="flex gap-4">
                    <button type="button" onClick={() => setShowAskModal(false)} className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors">Cancel</button>
                    <button type="submit" className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">Send</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Rep Inbox Modal */}
        {showInboxModal && selectedClubDetails && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[70]">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-indigo-600" />
                  {selectedClubDetails.name} Inbox
                </h2>
                <button onClick={() => setShowInboxModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
              <div className="p-6 overflow-y-auto flex-1 bg-gray-50">
                {!(inboxMessages || []).length ? (
                  <p className="text-center text-gray-500 py-8 italic">No messages in inbox.</p>
                ) : (
                  <div className="space-y-4">
                    {(inboxMessages || []).map(msg => (
                      <div key={msg._id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="font-bold text-gray-900 text-sm">{msg.sender?.name}</span>
                            <span className="text-xs text-gray-500 ml-2">({msg.sender?.email})</span>
                          </div>
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${msg.status === 'Answered' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                            {msg.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mb-4 bg-gray-50 p-3 rounded-lg border border-gray-100">{msg.content}</p>

                        {msg.status === 'Answered' ? (
                          <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                            <span className="text-xs font-bold text-indigo-800 block mb-1">Your Reply:</span>
                            <p className="text-sm text-indigo-900">{msg.response}</p>
                          </div>
                        ) : (
                          replyingTo === msg._id ? (
                            <div className="mt-4">
                              <textarea
                                value={replyContent}
                                onChange={(e) => setReplyContent(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 mb-2"
                                rows="3"
                                placeholder="Type your reply..."
                              />
                              <div className="flex justify-end gap-2">
                                <button onClick={() => { setReplyingTo(null); setReplyContent(""); }} className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg">Cancel</button>
                                <button onClick={() => handleReplyToMessage(msg._id)} className="px-3 py-1 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg">Send Reply</button>
                              </div>
                            </div>
                          ) : (
                            <button onClick={() => { setReplyingTo(msg._id); setReplyContent(""); }} className="text-sm text-indigo-600 font-medium hover:text-indigo-800 flex items-center gap-1">
                              <Edit className="w-3 h-3" /> Reply
                            </button>
                          )
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          🏛️  UNIVERSITY REFERENCE TEMPLATES & ANNUAL SERVICE SAMPLES
          Visible to ALL logged-in users. Upload only for Admin/Coordinator.
          ══════════════════════════════════════════════════════════════════ */}
      {user && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Section header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">🏛️ University Reference Templates</h2>
                <p className="text-sm text-gray-500 mt-0.5">Official documents & annual service samples for club representatives</p>
              </div>
            </div>

            {/* Admin upload toggle */}
            {(user?.isAdmin || isCoordinator) && (
              <button
                id="template-upload-toggle-btn"
                onClick={() => setShowTemplateUpload(v => !v)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold rounded-xl shadow-md hover:shadow-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200"
              >
                <Upload className="w-4 h-4" />
                {showTemplateUpload ? 'Cancel Upload' : 'Upload New Template'}
              </button>
            )}
          </div>

          {/* Admin upload form */}
          {showTemplateUpload && (user?.isAdmin || isCoordinator) && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 bg-white rounded-2xl border border-indigo-100 shadow-lg p-6"
            >
              <h3 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
                <Upload className="w-5 h-5 text-indigo-600" /> Upload Reference Document
              </h3>
              <form onSubmit={handleUploadTemplate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Document Title <span className="text-red-500">*</span></label>
                  <input
                    id="template-title-input"
                    type="text"
                    value={templateForm.title}
                    onChange={e => setTemplateForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Annual Activity Report Template 2025"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    id="template-category-select"
                    value={templateForm.category}
                    onChange={e => setTemplateForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                  >
                    {['Annual Report','Budget Request','Event Proposal','Membership Form','Activity Plan','Financial Statement','Other'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">File (PDF / Word / Excel) <span className="text-red-500">*</span></label>
                  <input
                    id="template-file-input"
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                    onChange={e => setTemplateForm(f => ({ ...f, file: e.target.files[0] }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    id="template-desc-input"
                    value={templateForm.description}
                    onChange={e => setTemplateForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Brief description of what this document is for..."
                    rows={2}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>
                <div className="sm:col-span-2 flex justify-end">
                  <button
                    id="template-upload-submit-btn"
                    type="submit"
                    disabled={uploadingTemplate}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                  >
                    {uploadingTemplate ? (
                      <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Uploading...</>
                    ) : (
                      <><Upload className="w-4 h-4" /> Publish Template</>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* Template grid */}
          {loadingTemplates ? (
            <div className="flex justify-center items-center py-16">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <span className="ml-3 text-gray-500 text-sm">Loading templates...</span>
            </div>
          ) : !(templates || []).length ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
              <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No reference templates uploaded yet.</p>
              {(user?.isAdmin || isCoordinator) && (
                <p className="text-sm text-indigo-500 mt-1">Use the "Upload New Template" button above to add your first document.</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {(templates || []).map((tmpl, idx) => (
                <motion.div
                  key={tmpl._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.06 }}
                  className="group relative bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden"
                >
                  {/* Coloured top bar by category */}
                  <div className={`h-1.5 w-full ${
                    tmpl.category === 'Annual Report' ? 'bg-gradient-to-r from-blue-500 to-indigo-500' :
                    tmpl.category === 'Budget Request' ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                    tmpl.category === 'Event Proposal' ? 'bg-gradient-to-r from-orange-500 to-amber-500' :
                    tmpl.category === 'Membership Form' ? 'bg-gradient-to-r from-pink-500 to-rose-500' :
                    tmpl.category === 'Activity Plan' ? 'bg-gradient-to-r from-teal-500 to-cyan-500' :
                    tmpl.category === 'Financial Statement' ? 'bg-gradient-to-r from-violet-500 to-purple-500' :
                    'bg-gradient-to-r from-gray-400 to-slate-500'
                  }`} />

                  <div className="p-5">
                    {/* Category badge */}
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 mb-3">
                      {tmpl.category}
                    </span>

                    {/* File icon + title */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-red-500" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-2">{tmpl.title}</h3>
                        {tmpl.description && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{tmpl.description}</p>
                        )}
                      </div>
                    </div>

                    {/* Meta */}
                    <div className="text-xs text-gray-400 mb-4">
                      Uploaded by <span className="font-medium text-gray-600">{tmpl.uploadedByName || tmpl.uploadedBy?.name || 'Admin'}</span>
                      &nbsp;·&nbsp;
                      {new Date(tmpl.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {tmpl.downloadCount > 0 && (
                        <span> &nbsp;·&nbsp; {tmpl.downloadCount} download{tmpl.downloadCount !== 1 ? 's' : ''}</span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        id={`template-download-btn-${tmpl._id}`}
                        onClick={async () => {
                          try {
                            const user = JSON.parse(localStorage.getItem('user') || '{}');
                            const filename = tmpl.pdfUrl?.split('/').pop();
                            const res = await fetch(`${apiService.baseURL}/templates/download/${filename}`, {
                              headers: { Authorization: `Bearer ${user.token}` }
                            });
                            if (!res.ok) throw new Error('Download failed');
                            const blob = await res.blob();
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = tmpl.fileName || filename;
                            document.body.appendChild(a);
                            a.click();
                            a.remove();
                            URL.revokeObjectURL(url);
                            setTemplates(prev => {
                              const updated = prev.map(t => t._id === tmpl._id ? { ...t, downloadCount: (t.downloadCount||0)+1 } : t);
                              localStorage.setItem('cached_templates', JSON.stringify(updated));
                              return updated;
                            });
                          } catch (err) {
                            toast.error('Failed to download file. Please try again.');
                          }
                        }}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-sm hover:shadow-md"
                      >
                        <Download className="w-3.5 h-3.5" />
                        📥 Download Reference PDF
                      </button>

                      {/* Admin delete */}
                      {(user?.isAdmin || isCoordinator) && (
                        <button
                          id={`template-delete-btn-${tmpl._id}`}
                          onClick={() => handleDeleteTemplate(tmpl._id)}
                          className="p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete template"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}