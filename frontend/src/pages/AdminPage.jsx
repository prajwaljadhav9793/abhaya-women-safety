import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  Mail,
  Search,
  Filter,
  FileDown,
  Download,
  FolderLock,
  BarChart3,
  Users,
  Eye,
  Check,
  X,
  RotateCcw,
  Sparkles,
  Building2,
  ExternalLink,
  MessageSquare,
  FileText,
  Radio,
  SlidersHorizontal,
  ChevronRight,
  Activity,
  AlertCircle,
  UserPlus,
  UploadCloud,
  FileCheck2,
  Volume2,
  VolumeX,
  Siren,
  Truck,
  PhoneCall,
  RefreshCw
} from "lucide-react";
import { api, useLoad, download } from "../api.js";
import { useAuth, Tag } from "../context/AuthContext.jsx";
import { playPoliceDispatchChirp, playEmergencyDistressAlarm } from "../emergencyAudio.js";
import SafetyIntelligenceDashboard from "../SafetyIntelligenceDashboard.jsx";

export default function AdminPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab State: complaints | intel | evidence | sos | users | audit
  const initialTab = searchParams.get("tab") || "complaints";
  const [activeTab, setActiveTab] = useState(initialTab);

  // Sync tab with URL query parameter
  const handleTabChange = (t) => {
    setActiveTab(t);
    setSearchParams({ tab: t });
  };

  // Stats query
  const stats = useLoad("/admin/stats");

  // Complaints / Reports State
  const [complaintPage, setComplaintPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  const complaintsQuery = `/admin/reports?page=${complaintPage}${
    statusFilter ? `&status=${statusFilter}` : ""
  }${appliedSearch ? `&q=${encodeURIComponent(appliedSearch)}` : ""}`;

  const {
    data: complaintsData,
    err: complaintsErr,
    reload: reloadComplaints,
    loading: complaintsLoading
  } = useLoad(complaintsQuery, [complaintPage, statusFilter, appliedSearch]);

  // Evidence query
  const [evidencePage, setEvidencePage] = useState(1);
  const {
    data: evidenceData,
    err: evidenceErr,
    reload: reloadEvidence
  } = useLoad(`/admin/evidence?page=${evidencePage}`, [evidencePage, activeTab]);

  // SOS query
  const [sosPage, setSosPage] = useState(1);
  const {
    data: sosData,
    err: sosErr,
    reload: reloadSos
  } = useLoad(`/admin/sos?page=${sosPage}`, [sosPage, activeTab]);

  // Users query
  const [userPage, setUserPage] = useState(1);
  const [userSearch, setUserSearch] = useState("");
  const {
    data: usersData,
    err: usersErr,
    reload: reloadUsers
  } = useLoad(`/admin/users?page=${userPage}${userSearch ? `&q=${encodeURIComponent(userSearch)}` : ""}`, [
    userPage,
    userSearch,
    activeTab
  ]);

  // Audit query
  const [auditPage, setAuditPage] = useState(1);
  const {
    data: auditData,
    err: auditErr,
    reload: reloadAudit
  } = useLoad(`/admin/audit?page=${auditPage}`, [auditPage, activeTab]);

  // Review Modal State for Complaints
  const [reviewModal, setReviewModal] = useState({
    isOpen: false,
    report: null,
    targetStatus: "", // verified | under_review | rejected | needs_info
    reason: "",
    busy: false,
    error: ""
  });

  const [flashMsg, setFlashMsg] = useState("");

  // Real-time Police CAD Dispatch Feed State
  const [liveFeedActive, setLiveFeedActive] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState(new Date());
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem("abhaya_cad_sound") !== "false");
  const [latestIncomingSos, setLatestIncomingSos] = useState(null);
  const [activeDistressAlerts, setActiveDistressAlerts] = useState([]);
  const [realtimeToast, setRealtimeToast] = useState(null);
  const [lastSeenSosId, setLastSeenSosId] = useState(0);
  const [lastSeenReportId, setLastSeenReportId] = useState(0);

  // Patrol Dispatch Modal State
  const [dispatchModal, setDispatchModal] = useState({
    isOpen: false,
    sos: null,
    patrolUnit: "Shahupuri Precinct Mobile-01",
    notes: "",
    busy: false,
    error: ""
  });

  // Citizen SOS Full Inspection Modal
  const [selectedSosDetail, setSelectedSosDetail] = useState(null);

  // Background High-Frequency Real-time Poller (every 2.8s)
  useEffect(() => {
    let isMounted = true;
    let timer = null;

    const pollLiveFeed = async () => {
      try {
        const feed = await api(`/admin/live-feed?last_sos_id=${lastSeenSosId}&last_report_id=${lastSeenReportId}`);
        if (!isMounted) return;

        setLastSyncTime(new Date());

        // 1. Process active distress events list
        if (feed.active_sos) {
          setActiveDistressAlerts(feed.active_sos);
        }

        // 2. Process new SOS distress events
        if (feed.new_sos && feed.new_sos.length > 0) {
          const maxSosId = Math.max(...feed.new_sos.map((s) => s.id));
          if (lastSeenSosId > 0 && maxSosId > lastSeenSosId) {
            const urgent = feed.new_sos[0];
            setLatestIncomingSos(urgent);
            if (soundEnabled) {
              playEmergencyDistressAlarm();
            }
            setRealtimeToast({
              type: "sos",
              title: "🚨 CRITICAL SOS DISTRESS ALERT RECEIVED!",
              desc: `${urgent.user_name || "Citizen"} at ${urgent.jurisdiction_police_station?.name || "Kolhapur"}`,
              id: urgent.id,
              timestamp: Date.now()
            });
            reloadSos();
            if (stats.reload) stats.reload();
          }
          setLastSeenSosId((prev) => Math.max(prev, maxSosId));
        }

        // 3. Process new Citizen Complaints
        if (feed.new_reports && feed.new_reports.length > 0) {
          const maxRepId = Math.max(...feed.new_reports.map((r) => r.id));
          if (lastSeenReportId > 0 && maxRepId > lastSeenReportId) {
            const newRep = feed.new_reports[0];
            if (soundEnabled) {
              playPoliceDispatchChirp();
            }
            setRealtimeToast({
              type: "complaint",
              title: "📢 NEW CITIZEN COMPLAINT LOGGED",
              desc: `#${newRep.id} ${newRep.category} by ${newRep.complainant?.name || "Citizen"}`,
              id: newRep.id,
              timestamp: Date.now()
            });
            reloadComplaints();
            if (stats.reload) stats.reload();
          }
          setLastSeenReportId((prev) => Math.max(prev, maxRepId));
        }
      } catch (err) {
        // Retry smoothly on next interval
      }
    };

    pollLiveFeed();
    timer = setInterval(pollLiveFeed, 2800);

    return () => {
      isMounted = false;
      if (timer) clearInterval(timer);
    };
  }, [lastSeenSosId, lastSeenReportId, soundEnabled]);

  const handleDispatchPatrol = async (e) => {
    if (e) e.preventDefault();
    if (!dispatchModal.sos) return;

    setDispatchModal((prev) => ({ ...prev, busy: true, error: "" }));
    try {
      await api(`/admin/sos/${dispatchModal.sos.id}/dispatch`, {
        method: "POST",
        body: {
          patrol_unit: dispatchModal.patrolUnit,
          notes: dispatchModal.notes
        }
      });

      setFlashMsg(`🚓 Patrol unit '${dispatchModal.patrolUnit}' dispatched to SOS #${dispatchModal.sos.id}. Citizen notified in real-time.`);
      setTimeout(() => setFlashMsg(""), 6000);
      setDispatchModal({ isOpen: false, sos: null, patrolUnit: "Shahupuri Precinct Mobile-01", notes: "", busy: false, error: "" });
      reloadSos();
      if (stats.reload) stats.reload();
    } catch (err) {
      setDispatchModal((prev) => ({ ...prev, busy: false, error: err.message || "Failed to dispatch patrol unit." }));
    }
  };

  const handleResolveSos = async (sosId) => {
    if (!window.confirm(`Confirm resolution of SOS Distress Alert #${sosId}? Citizen will be marked safe and notified in real-time.`)) return;

    try {
      await api(`/admin/sos/${sosId}/resolve`, {
        method: "POST",
        body: { notes: `Emergency handled and marked safe by Officer ${user?.full_name || "Police Commander"}.` }
      });
      setFlashMsg(`✅ SOS Distress Alert #${sosId} marked as RESOLVED. Citizen notified in real-time.`);
      setTimeout(() => setFlashMsg(""), 6000);
      reloadSos();
      if (stats.reload) stats.reload();
    } catch (err) {
      alert(err.message || "Failed to resolve SOS.");
    }
  };

  const openReviewModal = (report, targetStatus) => {
    const defaultReasons = {
      verified: "Complaint verified by authority. Patrol team dispatched & precinct alert issued.",
      under_review: "Complaint held under investigation by local jurisdictional police precinct.",
      rejected: "Complaint reviewed and dismissed (non-hazardous, false alarm or duplicate entry).",
      needs_info: "Complainant requested to provide additional time/location details or photo evidence."
    };

    setReviewModal({
      isOpen: true,
      report,
      targetStatus,
      reason: defaultReasons[targetStatus] || "",
      busy: false,
      error: ""
    });
  };

  const closeReviewModal = () => {
    setReviewModal({
      isOpen: false,
      report: null,
      targetStatus: "",
      reason: "",
      busy: false,
      error: ""
    });
  };

  const handleReviewSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!reviewModal.report || !reviewModal.targetStatus) return;

    setReviewModal((prev) => ({ ...prev, busy: true, error: "" }));

    try {
      await api(`/admin/reports/${reviewModal.report.id}/review`, {
        method: "POST",
        body: {
          status: reviewModal.targetStatus,
          reason: reviewModal.reason.trim() || undefined
        }
      });

      const labelMap = {
        verified: "VERIFIED & DISPATCHED",
        under_review: "PLACED ON HOLD (UNDER INVESTIGATION)",
        rejected: "DISMISSED",
        needs_info: "INFO REQUESTED"
      };

      setFlashMsg(
        `Complaint #${reviewModal.report.id} marked as: ${
          labelMap[reviewModal.targetStatus] || reviewModal.targetStatus
        }`
      );
      setTimeout(() => setFlashMsg(""), 6000);

      closeReviewModal();
      reloadComplaints();
      if (stats.reload) stats.reload();
    } catch (err) {
      setReviewModal((prev) => ({
        ...prev,
        busy: false,
        error: err.message || "Failed to update complaint status."
      }));
    }
  };

  const toggleUserActive = async (targetUser) => {
    if (
      !confirm(
        `Are you sure you want to ${
          targetUser.is_active ? "DEACTIVATE" : "ACTIVATE"
        } account for ${targetUser.full_name}?`
      )
    ) {
      return;
    }

    try {
      await api(`/admin/users/${targetUser.id}/active`, {
        method: "POST",
        body: { active: !targetUser.is_active }
      });
      setFlashMsg(`User account status updated.`);
      setTimeout(() => setFlashMsg(""), 4000);
      reloadUsers();
    } catch (err) {
      alert(err.message || "Failed to toggle user status.");
    }
  };

  // State for provisioning new officer with ID proof
  const [createOfficerModalOpen, setCreateOfficerModalOpen] = useState(false);
  const [newOfficer, setNewOfficer] = useState({
    full_name: "",
    email: "",
    phone: "",
    badge_number: "",
    department: "Shahupuri Police Precinct, Kolhapur",
    designation: "Police Sub-Inspector (PSI)",
    id_proof_type: "Police Warrant Card / Service ID",
    id_proof_number: "",
    password: "",
    confirm_password: ""
  });
  const [newOfficerFile, setNewOfficerFile] = useState(null);
  const [officerBusy, setOfficerBusy] = useState(false);
  const [officerError, setOfficerError] = useState("");

  const handleCreateOfficerSubmit = async (e) => {
    e.preventDefault();
    setOfficerError("");

    if (!newOfficer.full_name || !newOfficer.email || !newOfficer.phone) {
      setOfficerError("Please enter full name, email, and mobile number.");
      return;
    }
    if (!newOfficer.badge_number || !newOfficer.id_proof_number) {
      setOfficerError("Officer badge number and ID proof credential number are mandatory.");
      return;
    }
    if (!newOfficer.password || newOfficer.password.length < 8) {
      setOfficerError("Password must be at least 8 characters with letters & numbers.");
      return;
    }
    if (newOfficer.password !== newOfficer.confirm_password) {
      setOfficerError("Passwords do not match.");
      return;
    }

    setOfficerBusy(true);
    try {
      const formData = new FormData();
      Object.entries(newOfficer).forEach(([k, v]) => formData.append(k, v));
      if (newOfficerFile) formData.append("id_proof_file", newOfficerFile);

      await api("/admin/register-officer", {
        method: "POST",
        form: formData
      });

      setFlashMsg(`Officer ${newOfficer.full_name} successfully provisioned with verified ID proof.`);
      setTimeout(() => setFlashMsg(""), 6000);
      setCreateOfficerModalOpen(false);
      setNewOfficer({
        full_name: "",
        email: "",
        phone: "",
        badge_number: "",
        department: "Shahupuri Police Precinct, Kolhapur",
        designation: "Police Sub-Inspector (PSI)",
        id_proof_type: "Police Warrant Card / Service ID",
        id_proof_number: "",
        password: "",
        confirm_password: ""
      });
      setNewOfficerFile(null);
      reloadUsers();
      if (stats.reload) stats.reload();
    } catch (err) {
      const fieldDetails = err.fields ? Object.values(err.fields).join(", ") : "";
      setOfficerError(fieldDetails ? `${err.message}: ${fieldDetails}` : (err.message || "Failed to provision officer."));
    } finally {
      setOfficerBusy(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setAppliedSearch(searchQuery);
    setComplaintPage(1);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setAppliedSearch("");
    setComplaintPage(1);
  };

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", paddingBottom: 60 }}>
      {/* Real-time Emergency SOS Top Alert Banner */}
      {activeDistressAlerts.length > 0 && (
        <div
          style={{
            background: "linear-gradient(135deg, rgba(220, 38, 38, 0.95), rgba(185, 28, 28, 0.95))",
            color: "#fff",
            padding: "16px 22px",
            borderRadius: 16,
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 14,
            boxShadow: "0 0 35px rgba(239, 68, 68, 0.55)",
            border: "2px solid #fecaca"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ padding: 10, background: "rgba(0,0,0,0.3)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Siren size={30} color="#fff" />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 900, letterSpacing: "0.06em", fontSize: "1rem" }}>
                  🚨 ACTIVE CITIZEN DISTRESS SIGNAL #{activeDistressAlerts[0].id}
                </span>
                <span style={{ background: "#fff", color: "#b91c1c", fontSize: "0.72rem", fontWeight: 800, padding: "2px 8px", borderRadius: 4 }}>
                  IMMEDIATE ACTION REQUIRED
                </span>
                <span style={{ background: "rgba(0,0,0,0.3)", color: "#fee2e2", fontSize: "0.72rem", padding: "2px 8px", borderRadius: 4 }}>
                  {activeDistressAlerts.length} Active Distress Call{activeDistressAlerts.length > 1 ? "s" : ""}
                </span>
              </div>
              <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "#fee2e2" }}>
                Complainant: <b>{activeDistressAlerts[0].user_name || "Citizen"}</b> &bull; Contact: <b>{activeDistressAlerts[0].user_phone || "N/A"}</b> &bull; Location: <b>{activeDistressAlerts[0].jurisdiction_police_station?.name || "Kolhapur"}</b> ({activeDistressAlerts[0].lat ? `${activeDistressAlerts[0].lat.toFixed(4)}, ${activeDistressAlerts[0].lng.toFixed(4)}` : "GPS Locked"})
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setDispatchModal({
                  isOpen: true,
                  sos: activeDistressAlerts[0],
                  patrolUnit: "Shahupuri Precinct Mobile-01",
                  notes: "Emergency dispatch initiated from top priority alert banner.",
                  busy: false,
                  error: ""
                });
              }}
              style={{ background: "#fff", color: "#dc2626", fontWeight: 800, border: "none", display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 18px", boxShadow: "0 4px 12px rgba(0,0,0,0.25)" }}
            >
              <Truck size={17} /> Dispatch Patrol Unit Now
            </button>
            <button
              type="button"
              className="btn ghost sm"
              onClick={() => {
                handleTabChange("sos");
              }}
              style={{ borderColor: "rgba(255,255,255,0.6)", color: "#fff", padding: "8px 14px" }}
            >
              View SOS Feed &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Floating Real-time Event Toast */}
      {realtimeToast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 9999,
            background: realtimeToast.type === "sos" ? "rgba(185, 28, 28, 0.95)" : "rgba(15, 23, 42, 0.95)",
            border: `1.5px solid ${realtimeToast.type === "sos" ? "#f87171" : "#60a5fa"}`,
            borderRadius: 14,
            padding: "16px 20px",
            boxShadow: "0 10px 40px rgba(0,0,0,0.7)",
            maxWidth: 390,
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: "0.92rem", color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
                {realtimeToast.type === "sos" ? <ShieldAlert size={18} color="#fecaca" /> : <FileText size={18} color="#93c5fd" />}
                <span>{realtimeToast.title}</span>
              </div>
              <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "#e2e8f0" }}>
                {realtimeToast.desc}
              </p>
              <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => {
                    handleTabChange(realtimeToast.type === "sos" ? "sos" : "complaints");
                    setRealtimeToast(null);
                  }}
                  style={{
                    background: "rgba(255,255,255,0.15)",
                    border: "1px solid rgba(255,255,255,0.25)",
                    color: "#fff",
                    borderRadius: 6,
                    padding: "3px 8px",
                    fontSize: "0.75rem",
                    cursor: "pointer",
                    fontWeight: 600
                  }}
                >
                  View Details &rarr;
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setRealtimeToast(null)}
              style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: 2 }}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Law Enforcement Official Command Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 58, 138, 0.4))",
          border: "1px solid rgba(59, 130, 246, 0.35)",
          borderRadius: 18,
          padding: "20px 24px",
          marginBottom: 20,
          boxShadow: "0 10px 30px rgba(2, 6, 23, 0.5)",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: "linear-gradient(135deg, #1d4ed8, #0284c7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              boxShadow: "0 0 20px rgba(37, 99, 235, 0.5)",
              flexShrink: 0
            }}
          >
            <ShieldCheck size={30} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <h1 style={{ margin: 0, fontSize: "1.45rem", fontWeight: 800, color: "#fff" }}>
                Police &amp; Higher Authority Command Center
              </h1>
              <span
                style={{
                  background: "rgba(34, 197, 94, 0.2)",
                  color: "#4ade80",
                  border: "1px solid rgba(34, 197, 94, 0.4)",
                  fontSize: "0.68rem",
                  fontWeight: 800,
                  padding: "3px 8px",
                  borderRadius: 6,
                  letterSpacing: "0.05em",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", display: "inline-block" }}></span>
                LIVE CAD RADAR &bull; 2.8s PULSE
              </span>
            </div>
            <p style={{ margin: "4px 0 0", color: "#93c5fd", fontSize: "0.85rem" }}>
              Jurisdiction: Kolhapur District &amp; Cyber Women Safety Desk &bull; Officer:{" "}
              <b>{user?.full_name || "Admin Officer"}</b> ({user?.email})
            </p>
          </div>
        </div>

        {/* Quick Action & Controls Pill */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {/* Audio Alarm Sound Toggle */}
          <button
            type="button"
            className="btn ghost sm"
            onClick={() => {
              const next = !soundEnabled;
              setSoundEnabled(next);
              localStorage.setItem("abhaya_cad_sound", String(next));
              if (next) playPoliceDispatchChirp();
            }}
            title={soundEnabled ? "Mute automatic dispatch sounds" : "Enable automatic dispatch audio alerts"}
            style={{
              borderColor: soundEnabled ? "rgba(34, 197, 94, 0.45)" : "rgba(148, 163, 184, 0.3)",
              color: soundEnabled ? "#4ade80" : "#94a3b8",
              display: "inline-flex",
              alignItems: "center",
              gap: 6
            }}
          >
            {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
            <span>Sound Alerts: <b>{soundEnabled ? "ON" : "MUTED"}</b></span>
          </button>

          <Link
            to="/dashboard"
            className="btn ghost sm"
            style={{
              borderColor: "rgba(59, 130, 246, 0.4)",
              color: "#93c5fd",
              display: "inline-flex",
              alignItems: "center",
              gap: 6
            }}
          >
            <Eye size={14} /> Switch to Citizen View
          </Link>
          <button
            className="btn ghost sm"
            onClick={() => {
              if (stats.reload) stats.reload();
              if (activeTab === "complaints") reloadComplaints();
              if (activeTab === "evidence") reloadEvidence();
              if (activeTab === "sos") reloadSos();
              if (activeTab === "users") reloadUsers();
              if (activeTab === "audit") reloadAudit();
            }}
            title="Refresh current data"
            style={{ borderColor: "rgba(255, 255, 255, 0.2)", color: "#fff", display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <RotateCcw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Real-time Metric Cards Bar */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          marginBottom: 20
        }}
      >
        <div
          className="card"
          style={{
            margin: 0,
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.3)"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#f87171", textTransform: "uppercase" }}>
              SOS Alerts
            </span>
            <ShieldAlert size={16} color="#f87171" />
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#fff", marginTop: 4 }}>
            {stats.data?.sos ?? 0}
          </div>
          <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Emergency distress events</span>
        </div>

        <div
          className="card"
          style={{
            margin: 0,
            background: "rgba(59, 130, 246, 0.1)",
            border: "1px solid rgba(59, 130, 246, 0.3)"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#60a5fa", textTransform: "uppercase" }}>
              Citizen Complaints
            </span>
            <FileText size={16} color="#60a5fa" />
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#fff", marginTop: 4 }}>
            {stats.data?.reports ?? 0}
          </div>
          <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Registered hazards &amp; crimes</span>
        </div>

        <div
          className="card"
          style={{
            margin: 0,
            background: "rgba(234, 179, 8, 0.1)",
            border: "1px solid rgba(234, 179, 8, 0.3)"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#fde047", textTransform: "uppercase" }}>
              On Hold / Pending
            </span>
            <Clock size={16} color="#fde047" />
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#fff", marginTop: 4 }}>
            {(stats.data?.pending ?? 0) + (stats.data?.under_review ?? 0)}
          </div>
          <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
            {stats.data?.pending ?? 0} new &bull; {stats.data?.under_review ?? 0} on hold
          </span>
        </div>

        <div
          className="card"
          style={{
            margin: 0,
            background: "rgba(34, 197, 94, 0.1)",
            border: "1px solid rgba(34, 197, 94, 0.3)"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#4ade80", textTransform: "uppercase" }}>
              Action Verified
            </span>
            <CheckCircle2 size={16} color="#4ade80" />
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#fff", marginTop: 4 }}>
            {stats.data?.verified ?? 0}
          </div>
          <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Patrols &amp; actions dispatched</span>
        </div>

        <div
          className="card"
          style={{
            margin: 0,
            background: "rgba(168, 85, 247, 0.1)",
            border: "1px solid rgba(168, 85, 247, 0.3)"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#c084fc", textTransform: "uppercase" }}>
              Protected Citizens
            </span>
            <Users size={16} color="#c084fc" />
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#fff", marginTop: 4 }}>
            {stats.data?.users ?? 0}
          </div>
          <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Active registered accounts</span>
        </div>
      </div>

      {/* Global Flash Message Banner */}
      {flashMsg && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            background: "linear-gradient(135deg, rgba(34, 197, 94, 0.25), rgba(16, 185, 129, 0.2))",
            border: "1px solid rgba(34, 197, 94, 0.5)",
            borderRadius: 12,
            padding: "12px 16px",
            marginBottom: 20,
            color: "#bbf7d0",
            fontSize: "0.88rem",
            fontWeight: 600
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <CheckCircle2 size={18} style={{ color: "#4ade80" }} />
            <span>{flashMsg}</span>
          </div>
          <button
            onClick={() => setFlashMsg("")}
            style={{ background: "none", border: "none", color: "#bbf7d0", cursor: "pointer" }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Main Command Navigation Tabs */}
      <div
        style={{
          display: "flex",
          gap: 6,
          background: "rgba(15, 23, 42, 0.6)",
          padding: 6,
          borderRadius: 14,
          border: "1px solid rgba(255, 255, 255, 0.08)",
          marginBottom: 22,
          overflowX: "auto"
        }}
      >
        {[
          { id: "complaints", label: "Citizen Complaints", icon: FileText, count: stats.data?.reports },
          { id: "intel", label: "Safety Intel Module", icon: BarChart3 },
          { id: "evidence", label: "Evidence Vault", icon: FolderLock },
          { id: "sos", label: "Live SOS Feeds", icon: ShieldAlert, count: stats.data?.sos },
          { id: "users", label: "Citizen Registry", icon: Users, count: stats.data?.users },
          { id: "audit", label: "Audit Ledger", icon: Activity }
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => handleTabChange(t.id)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 16px",
                borderRadius: 10,
                border: "none",
                fontSize: "0.85rem",
                fontWeight: 700,
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.2s ease",
                background: isActive
                  ? "linear-gradient(135deg, #1d4ed8, #0284c7)"
                  : "transparent",
                color: isActive ? "#fff" : "#94a3b8",
                boxShadow: isActive ? "0 4px 15px rgba(29, 78, 216, 0.35)" : "none"
              }}
            >
              <Icon size={16} />
              <span>{t.label}</span>
              {t.count !== undefined && (
                <span
                  style={{
                    fontSize: "0.72rem",
                    padding: "1px 6px",
                    borderRadius: 10,
                    background: isActive ? "rgba(255, 255, 255, 0.25)" : "rgba(255, 255, 255, 0.08)",
                    color: isActive ? "#fff" : "#cbd5e1"
                  }}
                >
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ============================================================== */}
      {/* TAB 1: CITIZEN COMPLAINTS (MAIN USER REQUIREMENT)               */}
      {/* ============================================================== */}
      {activeTab === "complaints" && (
        <div>
          {/* Controls Bar: Search & Status Filters */}
          <div
            className="card"
            style={{
              padding: "16px 20px",
              marginBottom: 18,
              background: "rgba(15, 23, 42, 0.5)",
              border: "1px solid rgba(59, 130, 246, 0.25)"
            }}
          >
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12
              }}
            >
              {/* Status Filter Buttons */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#94a3b8", marginRight: 4 }}>
                  STATUS FILTER:
                </span>
                {[
                  { key: "", label: "All Complaints" },
                  { key: "pending", label: "Pending Review" },
                  { key: "under_review", label: "🟡 On Hold (Investigating)" },
                  { key: "verified", label: "🟢 Verified / Dispatched" },
                  { key: "rejected", label: "🔴 Dismissed" },
                  { key: "needs_info", label: "ℹ️ Needs Info" }
                ].map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => {
                      setStatusFilter(s.key);
                      setComplaintPage(1);
                    }}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 8,
                      border: statusFilter === s.key ? "1px solid #3b82f6" : "1px solid rgba(255,255,255,0.08)",
                      background:
                        statusFilter === s.key ? "rgba(59, 130, 246, 0.25)" : "rgba(255, 255, 255, 0.03)",
                      color: statusFilter === s.key ? "#fff" : "#cbd5e1",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      cursor: "pointer"
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Live Keyword Search Form */}
              <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    placeholder="Search complaint, location, or citizen..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      padding: "8px 12px 8px 32px",
                      borderRadius: 8,
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      background: "rgba(0, 0, 0, 0.4)",
                      color: "#fff",
                      fontSize: "0.82rem",
                      width: 260
                    }}
                  />
                  <Search
                    size={14}
                    style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#64748b" }}
                  />
                </div>
                <button type="submit" className="btn sm" style={{ padding: "8px 14px" }}>
                  Filter
                </button>
                {appliedSearch && (
                  <button
                    type="button"
                    className="btn ghost sm"
                    onClick={clearSearch}
                    style={{ padding: "8px 10px", color: "#f87171" }}
                    title="Clear filter"
                  >
                    <X size={14} />
                  </button>
                )}
              </form>
            </div>
          </div>

          {complaintsErr && (
            <div className="card" style={{ color: "#f87171", background: "rgba(239,68,68,0.1)" }}>
              Error loading complaints: {complaintsErr}
            </div>
          )}

          {/* Complaints List Cards */}
          {complaintsLoading && !complaintsData ? (
            <p className="mut" style={{ textAlign: "center", padding: 30 }}>
              Loading registered citizen complaints from dispatch queue...
            </p>
          ) : !complaintsData?.items || complaintsData.items.length === 0 ? (
            <div
              className="card"
              style={{
                textAlign: "center",
                padding: "40px 20px",
                background: "rgba(15, 23, 42, 0.4)"
              }}
            >
              <FileCheck2 size={40} style={{ color: "#60a5fa", margin: "0 auto 10px" }} />
              <h3 style={{ margin: 0, color: "#fff" }}>No complaints match this filter</h3>
              <p className="mut" style={{ margin: "6px 0 14px", fontSize: "0.85rem" }}>
                All clear! No pending citizen reports found for the selected status.
              </p>
              {(statusFilter || appliedSearch) && (
                <button
                  className="btn ghost sm"
                  onClick={() => {
                    setStatusFilter("");
                    clearSearch();
                  }}
                >
                  Reset All Filters
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {complaintsData.items.map((r) => {
                const complainant = r.complainant || {};
                const cleanPhone = (complainant.phone || "").replace(/\D/g, "");

                // Format status appearance
                const statusMeta = {
                  verified: {
                    label: "VERIFIED & DISPATCHED",
                    bg: "rgba(34, 197, 94, 0.15)",
                    border: "rgba(34, 197, 94, 0.4)",
                    color: "#4ade80",
                    icon: CheckCircle2
                  },
                  under_review: {
                    label: "ON HOLD / UNDER INVESTIGATION",
                    bg: "rgba(234, 179, 8, 0.15)",
                    border: "rgba(234, 179, 8, 0.4)",
                    color: "#fde047",
                    icon: Clock
                  },
                  rejected: {
                    label: "DISMISSED / FALSE REPORT",
                    bg: "rgba(239, 68, 68, 0.15)",
                    border: "rgba(239, 68, 68, 0.4)",
                    color: "#fca5a5",
                    icon: X
                  },
                  needs_info: {
                    label: "ADDITIONAL INFO REQUESTED",
                    bg: "rgba(59, 130, 246, 0.15)",
                    border: "rgba(59, 130, 246, 0.4)",
                    color: "#93c5fd",
                    icon: AlertCircle
                  },
                  pending: {
                    label: "PENDING INITIAL REVIEW",
                    bg: "rgba(168, 85, 247, 0.15)",
                    border: "rgba(168, 85, 247, 0.4)",
                    color: "#c084fc",
                    icon: Clock
                  }
                }[r.status] || {
                  label: r.status?.toUpperCase(),
                  bg: "rgba(100, 116, 139, 0.2)",
                  border: "rgba(100, 116, 139, 0.4)",
                  color: "#cbd5e1",
                  icon: Clock
                };

                const StatusIcon = statusMeta.icon;

                return (
                  <div
                    key={r.id}
                    className="card"
                    style={{
                      margin: 0,
                      background: "rgba(15, 23, 42, 0.65)",
                      border:
                        r.status === "pending"
                          ? "1px solid rgba(168, 85, 247, 0.4)"
                          : r.status === "verified"
                          ? "1px solid rgba(34, 197, 94, 0.35)"
                          : "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: 14,
                      padding: "20px 22px",
                      boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)"
                    }}
                  >
                    {/* Top Row: Category, ID, Status Badge & PDF Export */}
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 10,
                        borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                        paddingBottom: 12,
                        marginBottom: 14
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <span
                          style={{
                            fontSize: "0.88rem",
                            fontWeight: 800,
                            color: "#fff",
                            background: "rgba(255, 255, 255, 0.08)",
                            padding: "3px 8px",
                            borderRadius: 6
                          }}
                        >
                          CASE #{r.id}
                        </span>
                        <span
                          style={{
                            fontSize: "0.95rem",
                            fontWeight: 700,
                            color: "#e2e8f0"
                          }}
                        >
                          {r.category}
                        </span>
                        {r.severity && (
                          <span
                            style={{
                              fontSize: "0.7rem",
                              fontWeight: 700,
                              padding: "2px 8px",
                              borderRadius: 4,
                              background:
                                r.severity >= 3
                                  ? "rgba(239, 68, 68, 0.25)"
                                  : r.severity === 2
                                  ? "rgba(234, 179, 8, 0.25)"
                                  : "rgba(59, 130, 246, 0.25)",
                              color:
                                r.severity >= 3 ? "#f87171" : r.severity === 2 ? "#fde047" : "#60a5fa"
                            }}
                          >
                            Severity: {r.severity >= 3 ? "HIGH (3)" : r.severity === 2 ? "MEDIUM (2)" : "LOW (1)"}
                          </span>
                        )}
                        {r.is_demo && (
                          <span
                            style={{
                              fontSize: "0.68rem",
                              background: "rgba(100, 116, 139, 0.2)",
                              color: "#94a3b8",
                              padding: "1px 6px",
                              borderRadius: 4
                            }}
                          >
                            DEMO REPORT
                          </span>
                        )}
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {/* Status Badge */}
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            background: statusMeta.bg,
                            border: `1px solid ${statusMeta.border}`,
                            color: statusMeta.color,
                            fontSize: "0.75rem",
                            fontWeight: 800,
                            padding: "4px 10px",
                            borderRadius: 6,
                            letterSpacing: "0.03em"
                          }}
                        >
                          <StatusIcon size={13} />
                          {statusMeta.label}
                        </span>

                        {/* Download Official Legal Incident Dossier */}
                        <button
                          type="button"
                          className="btn ghost sm"
                          onClick={() => download(`/pdf/incident/${r.id}`, `abhaya_incident_dossier_${r.id}.pdf`)}
                          style={{
                            borderColor: "rgba(168, 85, 247, 0.4)",
                            color: "#c084fc",
                            fontSize: "0.78rem",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5
                          }}
                        >
                          <FileDown size={13} /> Official PDF Dossier
                        </button>
                      </div>
                    </div>

                    {/* Middle Grid: Complainant Info + Location & Jurisdiction */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                        gap: 12,
                        background: "rgba(0, 0, 0, 0.25)",
                        padding: "12px 14px",
                        borderRadius: 10,
                        marginBottom: 14,
                        border: "1px solid rgba(255, 255, 255, 0.05)"
                      }}
                    >
                      {/* Complainant Citizen Details */}
                      <div>
                        <div
                          style={{
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            color: "#94a3b8",
                            textTransform: "uppercase",
                            marginBottom: 4
                          }}
                        >
                          👤 Complainant (Registered Citizen)
                        </div>
                        <div style={{ fontWeight: 700, color: "#fff", fontSize: "0.9rem" }}>
                          {complainant.name || `Citizen User #${r.user_id}`}
                        </div>
                        <div style={{ fontSize: "0.82rem", color: "#cbd5e1", marginTop: 2 }}>
                          {complainant.phone ? (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                              <span>📞 +91 {complainant.phone}</span>
                              <a
                                href={`tel:${complainant.phone}`}
                                style={{ color: "#60a5fa", textDecoration: "none", fontSize: "0.75rem", fontWeight: 700 }}
                              >
                                [Call]
                              </a>
                              {cleanPhone && (
                                <a
                                  href={`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(
                                    `Hello ${complainant.name || ""}, this is from the ABHAYA Women Safety Law Enforcement desk regarding your complaint #${r.id}.`
                                  )}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{ color: "#4ade80", textDecoration: "none", fontSize: "0.75rem", fontWeight: 700 }}
                                >
                                  [WhatsApp]
                                </a>
                              )}
                            </span>
                          ) : (
                            <span className="mut">Contact phone on file</span>
                          )}
                        </div>
                        {complainant.email && (
                          <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: 2 }}>
                            ✉️ {complainant.email}
                          </div>
                        )}
                      </div>

                      {/* Location & Jurisdictional Police Station */}
                      <div>
                        <div
                          style={{
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            color: "#94a3b8",
                            textTransform: "uppercase",
                            marginBottom: 4
                          }}
                        >
                          📍 Location &amp; Jurisdictional Precinct
                        </div>
                        <div style={{ fontSize: "0.85rem", color: "#e2e8f0" }}>
                          <b>{r.location_label || "Kolhapur City Area"}</b>
                          {r.lat && r.lng && (
                            <span style={{ marginLeft: 6, fontSize: "0.78rem", color: "#60a5fa" }}>
                              ({r.lat.toFixed(4)}, {r.lng.toFixed(4)}) &bull;{" "}
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${r.lat},${r.lng}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{ color: "#38bdf8", textDecoration: "underline" }}
                              >
                                Open Map &nearr;
                              </a>
                            </span>
                          )}
                        </div>
                        {r.police_station && (
                          <div
                            style={{
                              fontSize: "0.8rem",
                              color: "#93c5fd",
                              marginTop: 4,
                              display: "flex",
                              alignItems: "center",
                              gap: 6
                            }}
                          >
                            <Building2 size={13} />
                            <span>
                              <b>Jurisdiction:</b> {r.police_station.name || "Jurisdictional Police Station"} (Ph:{" "}
                              {r.police_station.phone || "112"})
                            </span>
                          </div>
                        )}
                        {r.officer_in_charge && (
                          <div
                            style={{
                              fontSize: "0.8rem",
                              color: "#60a5fa",
                              marginTop: 4,
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              background: "rgba(59, 130, 246, 0.1)",
                              border: "1px solid rgba(59, 130, 246, 0.25)",
                              padding: "4px 8px",
                              borderRadius: 6,
                              width: "fit-content"
                            }}
                          >
                            <ShieldCheck size={13} color="#60a5fa" />
                            <span>
                              <b>Officer In-Charge:</b> {r.officer_in_charge.officer_name}{" "}
                              <span style={{ color: "#93c5fd", fontSize: "0.74rem" }}>
                                ({r.officer_in_charge.badge_number} &bull; {r.officer_in_charge.designation})
                              </span>
                            </span>
                          </div>
                        )}
                        <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: 3 }}>
                          Incident Time: {new Date(r.incident_time).toLocaleString()} &bull; Filed:{" "}
                          {new Date(r.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* Description Narrative */}
                    <div style={{ marginBottom: 12 }}>
                      <div
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          color: "#94a3b8",
                          textTransform: "uppercase",
                          marginBottom: 4
                        }}
                      >
                        📝 Complainant Statement / Description
                      </div>
                      <div
                        style={{
                          background: "rgba(0,0,0,0.3)",
                          padding: "10px 14px",
                          borderRadius: 8,
                          fontSize: "0.88rem",
                          color: "#f1f5f9",
                          lineHeight: 1.5,
                          whiteSpace: "pre-wrap"
                        }}
                      >
                        {r.description}
                      </div>
                    </div>

                    {/* Attached Evidence Files */}
                    {r.evidence && r.evidence.length > 0 && (
                      <div style={{ marginBottom: 14 }}>
                        <div
                          style={{
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            color: "#94a3b8",
                            textTransform: "uppercase",
                            marginBottom: 6
                          }}
                        >
                          📎 Evidentiary Attachments ({r.evidence.length} files)
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {r.evidence.map((ev) => (
                            <button
                              key={ev.id}
                              type="button"
                              className="btn ghost sm"
                              onClick={() => download(`/evidence/${ev.id}`, ev.name)}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                background: "rgba(59, 130, 246, 0.12)",
                                borderColor: "rgba(59, 130, 246, 0.35)",
                                color: "#93c5fd",
                                fontSize: "0.78rem"
                              }}
                            >
                              <Download size={13} />
                              <span>{ev.name}</span>
                              <span style={{ fontSize: "0.7rem", color: "#64748b" }}>
                                ({Math.round((ev.size || 0) / 1024)} KB)
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Last Official Review Memo / Action Note */}
                    {r.review_reason && (
                      <div
                        style={{
                          padding: "8px 12px",
                          background: "rgba(59, 130, 246, 0.08)",
                          borderLeft: "3px solid #3b82f6",
                          borderRadius: "0 6px 6px 0",
                          marginBottom: 14,
                          fontSize: "0.8rem",
                          color: "#93c5fd"
                        }}
                      >
                        <b>Officer Audit Memo:</b> {r.review_reason}
                      </div>
                    )}

                    {/* Action Bar: VERIFY, HOLD, DISMISS, REQUEST INFO */}
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                        borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                        paddingTop: 12
                      }}
                    >
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {/* 1. Verify Action Button */}
                        <button
                          type="button"
                          onClick={() => openReviewModal(r, "verified")}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "8px 14px",
                            borderRadius: 8,
                            border: "none",
                            background: "linear-gradient(135deg, #15803d, #16a34a)",
                            color: "#fff",
                            fontSize: "0.82rem",
                            fontWeight: 700,
                            cursor: "pointer",
                            boxShadow: "0 2px 8px rgba(22, 163, 74, 0.3)"
                          }}
                        >
                          <CheckCircle2 size={15} /> Verify &amp; Dispatch Action
                        </button>

                        {/* 2. Hold / Under Review Button */}
                        <button
                          type="button"
                          onClick={() => openReviewModal(r, "under_review")}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "8px 14px",
                            borderRadius: 8,
                            border: "none",
                            background: "linear-gradient(135deg, #ca8a04, #eab308)",
                            color: "#000",
                            fontSize: "0.82rem",
                            fontWeight: 700,
                            cursor: "pointer",
                            boxShadow: "0 2px 8px rgba(234, 179, 8, 0.3)"
                          }}
                        >
                          <Clock size={15} /> Hold (Under Investigation)
                        </button>

                        {/* 3. Dismiss Button */}
                        <button
                          type="button"
                          onClick={() => openReviewModal(r, "rejected")}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "8px 14px",
                            borderRadius: 8,
                            border: "none",
                            background: "linear-gradient(135deg, #b91c1c, #dc2626)",
                            color: "#fff",
                            fontSize: "0.82rem",
                            fontWeight: 700,
                            cursor: "pointer",
                            boxShadow: "0 2px 8px rgba(220, 38, 38, 0.3)"
                          }}
                        >
                          <X size={15} /> Dismiss / False Alarm
                        </button>

                        {/* 4. Request Info Button */}
                        <button
                          type="button"
                          onClick={() => openReviewModal(r, "needs_info")}
                          className="btn ghost sm"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            fontSize: "0.82rem"
                          }}
                        >
                          <MessageSquare size={14} /> Request Citizen Info
                        </button>
                      </div>

                      <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                        Officer ID: #{user?.id} &bull; Legally Audited
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Pagination Controls */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "16px 8px"
                }}
              >
                <button
                  type="button"
                  className="btn ghost sm"
                  disabled={complaintPage <= 1}
                  onClick={() => setComplaintPage((p) => Math.max(1, p - 1))}
                >
                  &larr; Previous Page
                </button>
                <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
                  Page {complaintPage} ({complaintsData?.total ?? 0} total complaints)
                </span>
                <button
                  type="button"
                  className="btn ghost sm"
                  disabled={!complaintsData || complaintPage * 15 >= complaintsData.total}
                  onClick={() => setComplaintPage((p) => p + 1)}
                >
                  Next Page &rarr;
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: SAFETY INTEL MODULE & HEATMAP                           */}
      {/* ============================================================== */}
      {activeTab === "intel" && (
        <div>
          <div
            className="card"
            style={{
              background: "rgba(30, 58, 138, 0.2)",
              border: "1px solid rgba(59, 130, 246, 0.35)",
              padding: "16px 20px",
              marginBottom: 16
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <BarChart3 size={24} style={{ color: "#60a5fa", flexShrink: 0 }} />
              <div>
                <h3 style={{ margin: 0, color: "#fff", fontSize: "1.1rem" }}>
                  District Safety Intelligence &amp; Patrol Analysis Module
                </h3>
                <p style={{ margin: "2px 0 0", color: "#93c5fd", fontSize: "0.82rem" }}>
                  Real-time crime aggregation, high-risk transit corridors, lighting deficiency index, and precinct patrol coverage.
                </p>
              </div>
            </div>
          </div>
          {/* Render Safety Intelligence Dashboard */}
          <SafetyIntelligenceDashboard />
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: EVIDENCE VAULT                                          */}
      {/* ============================================================== */}
      {activeTab === "evidence" && (
        <div className="card" style={{ background: "rgba(15, 23, 42, 0.65)" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16
            }}
          >
            <div>
              <h3 style={{ margin: 0, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
                <FolderLock size={20} color="#c084fc" /> Central Law Enforcement Evidence Repository
              </h3>
              <p className="mut" style={{ margin: "4px 0 0", fontSize: "0.82rem" }}>
                Tamper-evident photographic, audio, and testimonial files uploaded by citizens across incidents.
              </p>
            </div>
            <span
              style={{
                fontSize: "0.75rem",
                color: "#94a3b8",
                background: "rgba(255,255,255,0.06)",
                padding: "4px 10px",
                borderRadius: 6
              }}
            >
              Total Records: {evidenceData?.total ?? 0}
            </span>
          </div>

          {evidenceErr && <div style={{ color: "#f87171" }}>{evidenceErr}</div>}

          {!evidenceData?.items || evidenceData.items.length === 0 ? (
            <p className="mut" style={{ textAlign: "center", padding: "30px 0" }}>
              No evidentiary files uploaded to vault yet.
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th>Evidence ID</th>
                    <th>Linked Case</th>
                    <th>Complainant Citizen</th>
                    <th>Filename</th>
                    <th>File Type</th>
                    <th>Size</th>
                    <th>Timestamp</th>
                    <th style={{ textAlign: "right" }}>Download</th>
                  </tr>
                </thead>
                <tbody>
                  {evidenceData.items.map((ev) => (
                    <tr key={ev.id}>
                      <td>
                        <b>#{ev.id}</b>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: "#60a5fa" }}>
                          Case #{ev.report_id}
                        </span>{" "}
                        <span className="mut">({ev.category})</span>
                      </td>
                      <td>
                        <div><b>{ev.user_name}</b></div>
                        {ev.user_phone && <div className="mut" style={{ fontSize: "0.75rem" }}>+91 {ev.user_phone}</div>}
                      </td>
                      <td>{ev.original_name}</td>
                      <td>
                        <span
                          style={{
                            fontSize: "0.72rem",
                            background: "rgba(255,255,255,0.06)",
                            padding: "2px 6px",
                            borderRadius: 4
                          }}
                        >
                          {ev.mime_type || "file"}
                        </span>
                      </td>
                      <td>{Math.round((ev.size_bytes || 0) / 1024)} KB</td>
                      <td>{new Date(ev.uploaded_at).toLocaleString()}</td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          type="button"
                          className="btn ghost sm"
                          onClick={() => download(`/evidence/${ev.id}`, ev.original_name)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            borderColor: "rgba(59, 130, 246, 0.4)",
                            color: "#93c5fd"
                          }}
                        >
                          <Download size={13} /> Download
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Evidence Pagination */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 14,
                  paddingTop: 10,
                  borderTop: "1px solid rgba(255,255,255,0.08)"
                }}
              >
                <button
                  type="button"
                  className="btn ghost sm"
                  disabled={evidencePage <= 1}
                  onClick={() => setEvidencePage((p) => Math.max(1, p - 1))}
                >
                  &larr; Prev
                </button>
                <span style={{ fontSize: "0.82rem", color: "#94a3b8" }}>
                  Page {evidencePage} of {Math.ceil((evidenceData?.total || 1) / 15)}
                </span>
                <button
                  type="button"
                  className="btn ghost sm"
                  disabled={!evidenceData || evidencePage * 15 >= evidenceData.total}
                  onClick={() => setEvidencePage((p) => p + 1)}
                >
                  Next &rarr;
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: LIVE SOS FEEDS                                          */}
      {/* ============================================================== */}
      {activeTab === "sos" && (
        <div className="card" style={{ background: "rgba(15, 23, 42, 0.65)" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16
            }}
          >
            <div>
              <h3 style={{ margin: 0, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
                <ShieldAlert size={20} color="#f87171" /> Real-time SOS Distress Log
              </h3>
              <p className="mut" style={{ margin: "4px 0 0", fontSize: "0.82rem" }}>
                Emergency panic activations, live coordinates broadcasts, and automated gateway dispatch events.
              </p>
            </div>
            <span
              style={{
                fontSize: "0.75rem",
                color: "#94a3b8",
                background: "rgba(255,255,255,0.06)",
                padding: "4px 10px",
                borderRadius: 6
              }}
            >
              Total Alerts: {sosData?.total ?? 0}
            </span>
          </div>

          {sosErr && <div style={{ color: "#f87171" }}>{sosErr}</div>}

          {!sosData?.items || sosData.items.length === 0 ? (
            <p className="mut" style={{ textAlign: "center", padding: "30px 0" }}>
              No active distress events recorded.
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th>SOS Event</th>
                    <th>Citizen Complainant</th>
                    <th>Medical Profile (ICE)</th>
                    <th>GPS / Station Jurisdiction</th>
                    <th>Status &amp; Patrol Unit</th>
                    <th style={{ textAlign: "right" }}>Command Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sosData.items.map((e) => {
                    const isTriggered = e.status === "triggered";
                    const isUnderReview = e.status === "under_review";
                    const isResolved = e.status === "resolved";

                    return (
                      <tr
                        key={e.id}
                        style={{
                          background: isTriggered ? "rgba(239, 68, 68, 0.08)" : isUnderReview ? "rgba(59, 130, 246, 0.05)" : undefined,
                          borderLeft: isTriggered ? "4px solid #ef4444" : isUnderReview ? "4px solid #3b82f6" : "4px solid #10b981"
                        }}
                      >
                        <td>
                          <div style={{ fontWeight: 800, color: "#fff" }}>#{e.id}</div>
                          <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 2 }}>
                            {new Date(e.created_at + (e.created_at.endsWith("Z") ? "" : "Z")).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                          </div>
                          <span
                            className="badge"
                            style={{
                              marginTop: 4,
                              display: "inline-block",
                              background: e.mode === "live" ? "rgba(239, 68, 68, 0.25)" : "rgba(100, 116, 139, 0.25)",
                              color: e.mode === "live" ? "#f87171" : "#cbd5e1",
                              fontSize: "0.68rem"
                            }}
                          >
                            {e.mode?.toUpperCase() || "LIVE"}
                          </span>
                        </td>

                        <td>
                          <div style={{ fontWeight: 700, color: "#fff", fontSize: "0.88rem" }}>
                            {e.user_name || `User #${e.user_id}`}
                          </div>
                          {e.user_phone ? (
                            <div style={{ marginTop: 3 }}>
                              <a
                                href={`tel:${e.user_phone}`}
                                style={{
                                  color: "#38bdf8",
                                  textDecoration: "none",
                                  fontSize: "0.8rem",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                  fontWeight: 600
                                }}
                                title="Click to dial citizen"
                              >
                                <PhoneCall size={12} /> {e.user_phone}
                              </a>
                            </div>
                          ) : (
                            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>No phone</span>
                          )}
                          {e.user_email && (
                            <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 2 }}>
                              {e.user_email}
                            </div>
                          )}
                        </td>

                        <td>
                          {e.medical_profile?.blood_group ? (
                            <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(239, 68, 68, 0.2)", color: "#fca5a5", padding: "2px 7px", borderRadius: 4, fontSize: "0.75rem", fontWeight: 700, marginBottom: 4 }}>
                              <span>🩸 Blood: {e.medical_profile.blood_group}</span>
                            </div>
                          ) : (
                            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Blood group not set</div>
                          )}
                          {e.medical_profile?.allergies && (
                            <div style={{ fontSize: "0.72rem", color: "#fbbf24" }}>
                              Allergies: {e.medical_profile.allergies}
                            </div>
                          )}
                          {e.emergency_contacts && e.emergency_contacts.length > 0 && (
                            <div style={{ fontSize: "0.72rem", color: "#a78bfa", marginTop: 2 }}>
                              ICE: {e.emergency_contacts[0].name} ({e.emergency_contacts[0].phone})
                            </div>
                          )}
                        </td>

                        <td>
                          <div style={{ fontWeight: 600, color: "#e2e8f0", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: 4 }}>
                            <Building2 size={13} color="#93c5fd" />
                            {e.jurisdiction_police_station?.name || "Kolhapur Precinct Desk"}
                          </div>
                          {e.lat && e.lng ? (
                            <div style={{ marginTop: 4 }}>
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${e.lat},${e.lng}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  color: "#38bdf8",
                                  textDecoration: "underline",
                                  fontSize: "0.78rem",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4
                                }}
                              >
                                <MapPin size={12} /> {e.lat.toFixed(4)}, {e.lng.toFixed(4)}
                              </a>
                            </div>
                          ) : (
                            <span className="mut" style={{ fontSize: "0.75rem" }}>{e.location_status || "Cell-tower approximate"}</span>
                          )}
                        </td>

                        <td>
                          <Tag s={e.status} />
                          {e.patrol_unit ? (
                            <div
                              style={{
                                marginTop: 6,
                                padding: "3px 8px",
                                background: "rgba(59, 130, 246, 0.2)",
                                border: "1px solid rgba(59, 130, 246, 0.35)",
                                borderRadius: 6,
                                color: "#93c5fd",
                                fontSize: "0.73rem",
                                fontWeight: 700,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4
                              }}
                            >
                              <Truck size={12} /> {e.patrol_unit}
                            </div>
                          ) : isTriggered ? (
                            <div style={{ marginTop: 4, fontSize: "0.72rem", color: "#f87171", fontWeight: 700 }}>
                              ⚠️ Pending Dispatch
                            </div>
                          ) : null}
                          {e.dispatch_note && (
                            <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: 2, maxWidth: 160 }}>
                              {e.dispatch_note}
                            </div>
                          )}
                        </td>

                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                            <div style={{ display: "flex", gap: 6 }}>
                              <button
                                type="button"
                                className="btn sm"
                                onClick={() => {
                                  setDispatchModal({
                                    isOpen: true,
                                    sos: e,
                                    patrolUnit: e.patrol_unit || "Shahupuri Precinct Mobile-01",
                                    notes: e.dispatch_note || "Patrol unit dispatched immediately.",
                                    busy: false,
                                    error: ""
                                  });
                                }}
                                style={{
                                  background: "linear-gradient(135deg, #1d4ed8, #0284c7)",
                                  color: "#fff",
                                  fontSize: "0.75rem",
                                  padding: "4px 10px",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 5,
                                  fontWeight: 700,
                                  border: "none",
                                  borderRadius: 6
                                }}
                              >
                                <Truck size={13} /> {e.patrol_unit ? "Update Patrol" : "Dispatch Unit"}
                              </button>

                              {!isResolved && (
                                <button
                                  type="button"
                                  className="btn sm"
                                  onClick={() => handleResolveSos(e.id)}
                                  style={{
                                    background: "rgba(16, 185, 129, 0.2)",
                                    border: "1px solid rgba(16, 185, 129, 0.4)",
                                    color: "#6ee7b7",
                                    fontSize: "0.75rem",
                                    padding: "4px 10px",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 4,
                                    borderRadius: 6,
                                    fontWeight: 700
                                  }}
                                  title="Mark safe & resolve emergency"
                                >
                                  <Check size={13} /> Resolve
                                </button>
                              )}
                            </div>

                            <div style={{ display: "flex", gap: 6 }}>
                              <button
                                type="button"
                                className="btn ghost sm"
                                onClick={() => setSelectedSosDetail(e)}
                                style={{
                                  fontSize: "0.72rem",
                                  padding: "3px 8px",
                                  color: "#cbd5e1",
                                  borderColor: "rgba(255,255,255,0.2)",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4
                                }}
                              >
                                <Eye size={12} /> Inspect ICE
                              </button>

                              <button
                                type="button"
                                className="btn ghost sm"
                                onClick={() => download(`/pdf/sos/${e.id}`, `abhaya_sos_dossier_${e.id}.pdf`)}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                  borderColor: "rgba(239, 68, 68, 0.4)",
                                  color: "#f87171",
                                  fontSize: "0.72rem",
                                  padding: "3px 8px"
                                }}
                              >
                                <FileDown size={12} /> Dossier PDF
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* SOS Pagination */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 14,
                  paddingTop: 10,
                  borderTop: "1px solid rgba(255,255,255,0.08)"
                }}
              >
                <button
                  type="button"
                  className="btn ghost sm"
                  disabled={sosPage <= 1}
                  onClick={() => setSosPage((p) => Math.max(1, p - 1))}
                >
                  &larr; Prev
                </button>
                <span style={{ fontSize: "0.82rem", color: "#94a3b8" }}>
                  Page {sosPage} of {Math.ceil((sosData?.total || 1) / 15)}
                </span>
                <button
                  type="button"
                  className="btn ghost sm"
                  disabled={!sosData || sosPage * 15 >= sosData.total}
                  onClick={() => setSosPage((p) => p + 1)}
                >
                  Next &rarr;
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 5: CITIZEN DIRECTORY                                       */}
      {/* ============================================================== */}
      {activeTab === "users" && (
        <div className="card" style={{ background: "rgba(15, 23, 42, 0.65)" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16
            }}
          >
            <div>
              <h3 style={{ margin: 0, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
                <Users size={20} color="#60a5fa" /> Citizen &amp; Official Registry
              </h3>
              <p className="mut" style={{ margin: "4px 0 0", fontSize: "0.82rem" }}>
                Active safety accounts, emergency contacts linkage, and security clearance controls.
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn sm"
                onClick={() => setCreateOfficerModalOpen(true)}
                style={{
                  background: "linear-gradient(135deg, #1d4ed8, #0284c7)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: "0.82rem",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  border: "none",
                  boxShadow: "0 2px 10px rgba(29, 78, 216, 0.4)"
                }}
              >
                <UserPlus size={15} /> + Provision Officer (with ID Proof)
              </button>
              <span
                style={{
                  fontSize: "0.75rem",
                  color: "#94a3b8",
                  background: "rgba(255,255,255,0.06)",
                  padding: "6px 10px",
                  borderRadius: 6
                }}
              >
                Total Registered: {usersData?.total ?? 0}
              </span>
            </div>
          </div>

          {usersErr && <div style={{ color: "#f87171" }}>{usersErr}</div>}

          {!usersData?.items || usersData.items.length === 0 ? (
            <p className="mut" style={{ textAlign: "center", padding: "30px 0" }}>
              No user accounts found.
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th>User ID</th>
                    <th>Full Name &amp; Designation</th>
                    <th>Email Address</th>
                    <th>Mobile Phone</th>
                    <th>Role</th>
                    <th>Official ID Proof</th>
                    <th>Account Status</th>
                    <th style={{ textAlign: "right" }}>Clearance Control</th>
                  </tr>
                </thead>
                <tbody>
                  {usersData.items.map((u) => (
                    <tr key={u.id}>
                      <td>#{u.id}</td>
                      <td>
                        <div><b>{u.full_name}</b></div>
                        {u.officer_profile ? (
                          <div style={{ fontSize: "0.75rem", color: "#93c5fd", marginTop: 2, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            <span style={{ background: "rgba(59, 130, 246, 0.2)", padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>
                              Badge: #{u.officer_profile.badge_number}
                            </span>
                            <span>{u.officer_profile.designation} &bull; {u.officer_profile.department}</span>
                          </div>
                        ) : null}
                      </td>
                      <td>{u.email}</td>
                      <td>{u.phone ? `+91 ${u.phone}` : "-"}</td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            background:
                              u.role === "admin"
                                ? "linear-gradient(135deg, rgba(37, 99, 235, 0.3), rgba(2, 132, 199, 0.3))"
                                : "rgba(255, 255, 255, 0.08)",
                            color: u.role === "admin" ? "#93c5fd" : "#cbd5e1"
                          }}
                        >
                          {u.role === "admin" ? "POLICE / ADMIN" : "CITIZEN"}
                        </span>
                      </td>
                      <td>
                        {u.officer_profile ? (
                          <div style={{ fontSize: "0.75rem" }}>
                            <span style={{ color: "#4ade80", fontWeight: 700 }}>✓ Verified ID</span>
                            <div className="mut" style={{ fontSize: "0.72rem" }}>
                              {u.officer_profile.id_proof_type} ({u.officer_profile.id_proof_number})
                            </div>
                            {u.officer_profile.id_proof_filename && (
                              <button
                                type="button"
                                className="btn ghost sm"
                                onClick={() => download(`/admin/officers/${u.id}/id-proof`, u.officer_profile.id_proof_original_name || `officer_id_${u.id}.pdf`)}
                                style={{ padding: "2px 6px", fontSize: "0.7rem", marginTop: 3, borderColor: "rgba(59, 130, 246, 0.4)", color: "#93c5fd", display: "inline-flex", alignItems: "center", gap: 4 }}
                              >
                                <Download size={11} /> View ID Proof
                              </button>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Citizen / Standard</span>
                        )}
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            color: u.is_active ? "#4ade80" : "#f87171"
                          }}
                        >
                          ● {u.is_active ? "ACTIVE" : "SUSPENDED"}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          type="button"
                          className="btn ghost sm"
                          onClick={() => toggleUserActive(u)}
                          style={{
                            fontSize: "0.75rem",
                            color: u.is_active ? "#f87171" : "#4ade80"
                          }}
                        >
                          {u.is_active ? "Deactivate" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Users Pagination */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 14,
                  paddingTop: 10,
                  borderTop: "1px solid rgba(255,255,255,0.08)"
                }}
              >
                <button
                  type="button"
                  className="btn ghost sm"
                  disabled={userPage <= 1}
                  onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                >
                  &larr; Prev
                </button>
                <span style={{ fontSize: "0.82rem", color: "#94a3b8" }}>
                  Page {userPage} of {Math.ceil((usersData?.total || 1) / 15)}
                </span>
                <button
                  type="button"
                  className="btn ghost sm"
                  disabled={!usersData || userPage * 15 >= usersData.total}
                  onClick={() => setUserPage((p) => p + 1)}
                >
                  Next &rarr;
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 6: TAMPER-EVIDENT AUDIT TRAIL                              */}
      {/* ============================================================== */}
      {activeTab === "audit" && (
        <div className="card" style={{ background: "rgba(15, 23, 42, 0.65)" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16
            }}
          >
            <div>
              <h3 style={{ margin: 0, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
                <Activity size={20} color="#4ade80" /> Immutable Law Enforcement Audit Ledger
              </h3>
              <p className="mut" style={{ margin: "4px 0 0", fontSize: "0.82rem" }}>
                Cryptographic audit trail of all verification decisions, dismissals, and clearance modifications.
              </p>
            </div>
            <span
              style={{
                fontSize: "0.75rem",
                color: "#94a3b8",
                background: "rgba(255,255,255,0.06)",
                padding: "4px 10px",
                borderRadius: 6
              }}
            >
              Audited Entries: {auditData?.total ?? 0}
            </span>
          </div>

          {auditErr && <div style={{ color: "#f87171" }}>{auditErr}</div>}

          {!auditData?.items || auditData.items.length === 0 ? (
            <p className="mut" style={{ textAlign: "center", padding: "30px 0" }}>
              No audit records logged yet.
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th>Log ID</th>
                    <th>Timestamp</th>
                    <th>Officer ID</th>
                    <th>Action Taken</th>
                    <th>Target Record</th>
                    <th>Status Shift</th>
                    <th>Official Reason &amp; Order</th>
                  </tr>
                </thead>
                <tbody>
                  {auditData.items.map((a) => (
                    <tr key={a.id}>
                      <td>#{a.id}</td>
                      <td>{new Date(a.at + (a.at.endsWith("Z") ? "" : "Z")).toLocaleString()}</td>
                      <td>Officer #{a.admin_id}</td>
                      <td>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            color: "#60a5fa"
                          }}
                        >
                          {a.action}
                        </span>
                      </td>
                      <td><b>{a.target}</b></td>
                      <td>
                        <span style={{ fontSize: "0.8rem", color: "#cbd5e1" }}>
                          {a.old || "None"} &rarr; <b>{a.new}</b>
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: "0.82rem", color: "#93c5fd" }}>
                          {a.reason || "Standard authority review"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Audit Pagination */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 14,
                  paddingTop: 10,
                  borderTop: "1px solid rgba(255,255,255,0.08)"
                }}
              >
                <button
                  type="button"
                  className="btn ghost sm"
                  disabled={auditPage <= 1}
                  onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                >
                  &larr; Prev
                </button>
                <span style={{ fontSize: "0.82rem", color: "#94a3b8" }}>
                  Page {auditPage} of {Math.ceil((auditData?.total || 1) / 15)}
                </span>
                <button
                  type="button"
                  className="btn ghost sm"
                  disabled={!auditData || auditPage * 15 >= auditData.total}
                  onClick={() => setAuditPage((p) => p + 1)}
                >
                  Next &rarr;
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* REVIEW ACTION MODAL (FOR VERIFY, HOLD, DISMISS, ETC.)         */}
      {/* ============================================================== */}
      {reviewModal.isOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 16
          }}
          onClick={closeReviewModal}
        >
          <div
            style={{
              background: "#0f172a",
              border: "1px solid rgba(59, 130, 246, 0.4)",
              borderRadius: 18,
              padding: "24px 24px",
              width: "100%",
              maxWidth: 540,
              boxShadow: "0 25px 50px rgba(0, 0, 0, 0.8)",
              color: "#fff"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
                borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                paddingBottom: 12
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <ShieldCheck size={24} color="#60a5fa" />
                <h3 style={{ margin: 0, fontSize: "1.15rem" }}>
                  Official Police Decision on Case #{reviewModal.report?.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeReviewModal}
                style={{
                  background: "none",
                  border: "none",
                  color: "#94a3b8",
                  cursor: "pointer",
                  padding: 4
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Case Snippet */}
            <div
              style={{
                background: "rgba(0, 0, 0, 0.35)",
                padding: "10px 14px",
                borderRadius: 10,
                marginBottom: 16,
                fontSize: "0.82rem",
                border: "1px solid rgba(255, 255, 255, 0.05)"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <b style={{ color: "#fff" }}>{reviewModal.report?.category}</b>
                <span className="mut">{reviewModal.report?.location_label || "Kolhapur"}</span>
              </div>
              <div className="mut" style={{ fontSize: "0.78rem" }}>
                Complainant: {reviewModal.report?.complainant?.name || "Citizen"} &bull; Phone: +91{" "}
                {reviewModal.report?.complainant?.phone || "-"}
              </div>
            </div>

            {/* Target Status Choice Bar */}
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  color: "#94a3b8",
                  marginBottom: 8,
                  textTransform: "uppercase"
                }}
              >
                Select Decision Action:
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  {
                    id: "verified",
                    label: "🟢 Verify & Dispatch",
                    desc: "Valid hazard / patrol dispatched"
                  },
                  {
                    id: "under_review",
                    label: "🟡 Hold (Investigating)",
                    desc: "Under ground verification"
                  },
                  {
                    id: "rejected",
                    label: "🔴 Dismiss",
                    desc: "False report or non-actionable"
                  },
                  {
                    id: "needs_info",
                    label: "ℹ️ Request Info",
                    desc: "Ask citizen for clarification"
                  }
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      const presets = {
                        verified: "Complaint verified by authority. Patrol team dispatched & precinct alert issued.",
                        under_review: "Complaint held under investigation by local jurisdictional police precinct.",
                        rejected: "Complaint reviewed and dismissed (non-hazardous, false alarm or duplicate entry).",
                        needs_info: "Complainant requested to provide additional time/location details or photo evidence."
                      };
                      setReviewModal((prev) => ({
                        ...prev,
                        targetStatus: s.id,
                        reason: presets[s.id] || ""
                      }));
                    }}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 8,
                      border:
                        reviewModal.targetStatus === s.id
                          ? "1px solid #3b82f6"
                          : "1px solid rgba(255, 255, 255, 0.1)",
                      background:
                        reviewModal.targetStatus === s.id
                          ? "rgba(59, 130, 246, 0.25)"
                          : "rgba(0, 0, 0, 0.3)",
                      color: reviewModal.targetStatus === s.id ? "#fff" : "#cbd5e1",
                      textAlign: "left",
                      cursor: "pointer",
                      fontSize: "0.8rem",
                      fontWeight: 600
                    }}
                  >
                    <div>{s.label}</div>
                    <div style={{ fontSize: "0.68rem", color: "#94a3b8", marginTop: 2 }}>{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Official Review Reason / Memo Textarea */}
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  color: "#94a3b8",
                  marginBottom: 6,
                  textTransform: "uppercase"
                }}
              >
                Official Dispatch Memo / Reasoning (Sent to Citizen &amp; Logged to Audit):
              </label>
              <textarea
                rows={3}
                value={reviewModal.reason}
                onChange={(e) =>
                  setReviewModal((prev) => ({ ...prev, reason: e.target.value }))
                }
                placeholder="Enter official dispatch notes, patrol unit ID, or investigation instructions..."
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  background: "rgba(0, 0, 0, 0.4)",
                  color: "#fff",
                  fontSize: "0.85rem",
                  boxSizing: "border-box",
                  resize: "vertical"
                }}
              />
            </div>

            {/* Error Message in Modal */}
            {reviewModal.error && (
              <div
                style={{
                  padding: "8px 12px",
                  background: "rgba(239, 68, 68, 0.2)",
                  border: "1px solid rgba(239, 68, 68, 0.4)",
                  borderRadius: 6,
                  color: "#fca5a5",
                  fontSize: "0.8rem",
                  marginBottom: 14
                }}
              >
                {reviewModal.error}
              </div>
            )}

            {/* Modal Action Buttons */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                className="btn ghost sm"
                onClick={closeReviewModal}
                disabled={reviewModal.busy}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn sm"
                onClick={handleReviewSubmit}
                disabled={reviewModal.busy || !reviewModal.targetStatus}
                style={{
                  background: "linear-gradient(135deg, #1d4ed8, #0284c7)",
                  color: "#fff",
                  fontWeight: 700,
                  padding: "8px 18px",
                  border: "none",
                  boxShadow: "0 2px 10px rgba(29, 78, 216, 0.4)"
                }}
              >
                {reviewModal.busy ? "Recording Decision..." : "Confirm & Save Decision"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ============================================================== */}
      {/* PROVISION OFFICER ACCOUNT MODAL (WITH ID PROOF)                 */}
      {/* ============================================================== */}
      {createOfficerModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 16
          }}
          onClick={() => setCreateOfficerModalOpen(false)}
        >
          <div
            style={{
              background: "#0f172a",
              border: "1px solid rgba(59, 130, 246, 0.4)",
              borderRadius: 18,
              padding: "24px 26px",
              width: "100%",
              maxWidth: 580,
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 25px 50px rgba(0, 0, 0, 0.8)",
              color: "#fff"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
                borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                paddingBottom: 12
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <ShieldCheck size={24} color="#60a5fa" />
                <h3 style={{ margin: 0, fontSize: "1.2rem" }}>
                  Provision Law Enforcement Officer Account
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCreateOfficerModalOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#94a3b8",
                  cursor: "pointer",
                  padding: 4
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div
              style={{
                background: "rgba(59, 130, 246, 0.1)",
                border: "1px solid rgba(59, 130, 246, 0.3)",
                borderRadius: 10,
                padding: "10px 12px",
                marginBottom: 16,
                fontSize: "0.78rem",
                color: "#bfdbfe"
              }}
            >
              <b>Official Verification Requirement:</b> Provisioned officers must supply government/precinct identification proof before obtaining administrative authority clearance.
            </div>

            <form onSubmit={handleCreateOfficerSubmit}>
              {/* Name & Email */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#cbd5e1", marginBottom: 4 }}>
                    Officer Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Patil"
                    value={newOfficer.full_name}
                    onChange={(e) => setNewOfficer({ ...newOfficer, full_name: e.target.value })}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(0,0,0,0.4)", color: "#fff", fontSize: "0.85rem" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#cbd5e1", marginBottom: 4 }}>
                    Official Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="officer@police.gov.in"
                    value={newOfficer.email}
                    onChange={(e) => setNewOfficer({ ...newOfficer, email: e.target.value })}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(0,0,0,0.4)", color: "#fff", fontSize: "0.85rem" }}
                  />
                </div>
              </div>

              {/* Mobile & Badge */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#cbd5e1", marginBottom: 4 }}>
                    Mobile Number (10 digits) *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="9876543210"
                    value={newOfficer.phone}
                    onChange={(e) => setNewOfficer({ ...newOfficer, phone: e.target.value })}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(0,0,0,0.4)", color: "#fff", fontSize: "0.85rem" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#cbd5e1", marginBottom: 4 }}>
                    Officer Badge / Service ID *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MH-KOP-4921"
                    value={newOfficer.badge_number}
                    onChange={(e) => setNewOfficer({ ...newOfficer, badge_number: e.target.value })}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(59,130,246,0.4)", background: "rgba(30,58,138,0.25)", color: "#60a5fa", fontWeight: 700, fontSize: "0.85rem" }}
                  />
                </div>
              </div>

              {/* Designation & Department */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#cbd5e1", marginBottom: 4 }}>
                    Rank / Designation *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Police Sub-Inspector / DSP"
                    value={newOfficer.designation}
                    onChange={(e) => setNewOfficer({ ...newOfficer, designation: e.target.value })}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(0,0,0,0.4)", color: "#fff", fontSize: "0.85rem" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#cbd5e1", marginBottom: 4 }}>
                    Police Precinct / Department *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Shahupuri Police Precinct"
                    value={newOfficer.department}
                    onChange={(e) => setNewOfficer({ ...newOfficer, department: e.target.value })}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(0,0,0,0.4)", color: "#fff", fontSize: "0.85rem" }}
                  />
                </div>
              </div>

              {/* ID Proof Type & Number */}
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#cbd5e1", marginBottom: 4 }}>
                    Official ID Proof Type *
                  </label>
                  <select
                    value={newOfficer.id_proof_type}
                    onChange={(e) => setNewOfficer({ ...newOfficer, id_proof_type: e.target.value })}
                    style={{ width: "100%", padding: "9px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(15,23,42,0.9)", color: "#fff", fontSize: "0.85rem" }}
                  >
                    <option value="Police Warrant Card / Service ID">Police Warrant Card / Service ID</option>
                    <option value="Government Law Enforcement ID">Government Law Enforcement ID</option>
                    <option value="Ministry of Home Affairs Credential">Ministry of Home Affairs Credential</option>
                    <option value="Official Service Aadhaar Card">Official Service Aadhaar Card</option>
                    <option value="State Police Department ID">State Police Department ID</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#cbd5e1", marginBottom: 4 }}>
                    ID Credential Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="WARR-2024-8841"
                    value={newOfficer.id_proof_number}
                    onChange={(e) => setNewOfficer({ ...newOfficer, id_proof_number: e.target.value })}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(0,0,0,0.4)", color: "#fff", fontSize: "0.85rem" }}
                  />
                </div>
              </div>

              {/* ID Proof Document File Upload */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#cbd5e1", marginBottom: 4 }}>
                  Upload ID Proof Document / Photo (PDF, PNG, JPG)
                </label>
                <div
                  style={{
                    border: "2px dashed rgba(59, 130, 246, 0.4)",
                    borderRadius: 10,
                    padding: "12px 14px",
                    textAlign: "center",
                    background: "rgba(0, 0, 0, 0.3)",
                    position: "relative",
                    cursor: "pointer"
                  }}
                >
                  <input
                    type="file"
                    accept=".pdf,image/png,image/jpeg,image/jpg"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setNewOfficerFile(e.target.files[0]);
                      }
                    }}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      opacity: 0,
                      cursor: "pointer",
                      width: "100%",
                      height: "100%"
                    }}
                  />
                  <UploadCloud size={20} style={{ color: "#60a5fa", margin: "0 auto 4px" }} />
                  <div style={{ fontSize: "0.82rem", color: "#e2e8f0", fontWeight: 600 }}>
                    {newOfficerFile ? (
                      <span style={{ color: "#4ade80" }}>
                        ✓ {newOfficerFile.name} ({Math.round(newOfficerFile.size / 1024)} KB)
                      </span>
                    ) : (
                      <span>Attach scanned warrant card, service ID or photo credential</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Passwords */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#cbd5e1", marginBottom: 4 }}>
                    Temporary Password *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Min 8 chars"
                    value={newOfficer.password}
                    onChange={(e) => setNewOfficer({ ...newOfficer, password: e.target.value })}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(0,0,0,0.4)", color: "#fff", fontSize: "0.85rem" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#cbd5e1", marginBottom: 4 }}>
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Re-enter password"
                    value={newOfficer.confirm_password}
                    onChange={(e) => setNewOfficer({ ...newOfficer, confirm_password: e.target.value })}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(0,0,0,0.4)", color: "#fff", fontSize: "0.85rem" }}
                  />
                </div>
              </div>

              {officerError && (
                <div
                  style={{
                    padding: "8px 12px",
                    background: "rgba(239, 68, 68, 0.2)",
                    border: "1px solid rgba(239, 68, 68, 0.4)",
                    borderRadius: 6,
                    color: "#fca5a5",
                    fontSize: "0.8rem",
                    marginBottom: 14
                  }}
                >
                  {officerError}
                </div>
              )}

              {/* Modal Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={() => setCreateOfficerModalOpen(false)}
                  disabled={officerBusy}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn sm"
                  disabled={officerBusy}
                  style={{
                    background: "linear-gradient(135deg, #1d4ed8, #0284c7)",
                    color: "#fff",
                    fontWeight: 700,
                    padding: "8px 18px",
                    border: "none",
                    boxShadow: "0 2px 10px rgba(29, 78, 216, 0.4)"
                  }}
                >
                  {officerBusy ? "Provisioning Officer..." : "✓ Confirm & Provision Officer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: RAPID POLICE PATROL DISPATCH (CAD)                      */}
      {/* ============================================================== */}
      {dispatchModal.isOpen && dispatchModal.sos && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(2, 6, 23, 0.8)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            padding: 16
          }}
          onClick={() => !dispatchModal.busy && setDispatchModal((prev) => ({ ...prev, isOpen: false }))}
        >
          <div
            style={{
              background: "#0f172a",
              border: "1.5px solid #3b82f6",
              borderRadius: 16,
              maxWidth: 540,
              width: "100%",
              padding: 24,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.75)",
              color: "#fff"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ padding: 8, background: "rgba(59, 130, 246, 0.2)", borderRadius: 10 }}>
                  <Truck size={24} color="#60a5fa" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800 }}>
                    Emergency Patrol CAD Dispatch
                  </h3>
                  <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "#94a3b8" }}>
                    SOS Event #{dispatchModal.sos.id} &bull; Complainant: <b>{dispatchModal.sos.user_name || "Citizen"}</b>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDispatchModal((prev) => ({ ...prev, isOpen: false }))}
                disabled={dispatchModal.busy}
                style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Quick Overview Pill */}
            <div
              style={{
                background: "rgba(30, 58, 138, 0.25)",
                border: "1px solid rgba(59, 130, 246, 0.3)",
                borderRadius: 10,
                padding: "12px 14px",
                marginBottom: 16,
                fontSize: "0.82rem"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ color: "#93c5fd" }}>Phone:</span>
                <b>
                  <a href={`tel:${dispatchModal.sos.user_phone}`} style={{ color: "#38bdf8" }}>
                    {dispatchModal.sos.user_phone || "Not recorded"}
                  </a>
                </b>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ color: "#93c5fd" }}>Target Coordinates:</span>
                <b>
                  {dispatchModal.sos.lat && dispatchModal.sos.lng ? (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${dispatchModal.sos.lat},${dispatchModal.sos.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "#38bdf8", textDecoration: "underline" }}
                    >
                      {dispatchModal.sos.lat.toFixed(4)}, {dispatchModal.sos.lng.toFixed(4)} (Open Map)
                    </a>
                  ) : "Unavailable"}
                </b>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#93c5fd" }}>Precinct Jurisdiction:</span>
                <b>{dispatchModal.sos.jurisdiction_police_station?.name || "Shahupuri Police Precinct"}</b>
              </div>
            </div>

            <form onSubmit={handleDispatchPatrol}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#cbd5e1", marginBottom: 6 }}>
                  Select Patrol Unit / Mobile Squad *
                </label>
                <select
                  value={dispatchModal.patrolUnit}
                  onChange={(e) => setDispatchModal((prev) => ({ ...prev, patrolUnit: e.target.value }))}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 8,
                    background: "rgba(0, 0, 0, 0.4)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    color: "#fff",
                    fontSize: "0.85rem"
                  }}
                  required
                >
                  <option value="Shahupuri Precinct Mobile-01">Shahupuri Precinct Mobile-01 (Rapid QRT)</option>
                  <option value="Cyber Women Quick-Response Cheetah-04">Cyber Women Quick-Response Cheetah-04</option>
                  <option value="Laxmipuri Beat Patrol Unit-02">Laxmipuri Beat Patrol Unit-02</option>
                  <option value="Rajarampuri Highway Interceptor-03">Rajarampuri Highway Interceptor-03</option>
                  <option value="District PCR Van Delta-09">District PCR Van Delta-09</option>
                  <option value="Women Night Patrol Nirbhaya-01">Women Night Patrol Nirbhaya-01</option>
                </select>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#cbd5e1", marginBottom: 6 }}>
                  Custom Unit Call-sign / Patrol ID
                </label>
                <input
                  type="text"
                  placeholder="Or enter custom patrol unit call sign..."
                  value={dispatchModal.patrolUnit}
                  onChange={(e) => setDispatchModal((prev) => ({ ...prev, patrolUnit: e.target.value }))}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: 8,
                    background: "rgba(0, 0, 0, 0.4)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    color: "#fff",
                    fontSize: "0.85rem"
                  }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#cbd5e1", marginBottom: 6 }}>
                  Patrol Operational Instructions &amp; Citizen Dispatch Note
                </label>
                <textarea
                  rows={3}
                  value={dispatchModal.notes}
                  onChange={(e) => setDispatchModal((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="e.g. Unit dispatched with priority lights. Establish direct contact with victim on phone immediately."
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 8,
                    background: "rgba(0, 0, 0, 0.4)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    color: "#fff",
                    fontSize: "0.85rem",
                    resize: "vertical"
                  }}
                />
              </div>

              {dispatchModal.error && (
                <div
                  style={{
                    padding: "8px 12px",
                    background: "rgba(239, 68, 68, 0.2)",
                    border: "1px solid rgba(239, 68, 68, 0.4)",
                    borderRadius: 6,
                    color: "#fca5a5",
                    fontSize: "0.8rem",
                    marginBottom: 14
                  }}
                >
                  {dispatchModal.error}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={() => setDispatchModal((prev) => ({ ...prev, isOpen: false }))}
                  disabled={dispatchModal.busy}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn sm"
                  disabled={dispatchModal.busy}
                  style={{
                    background: "linear-gradient(135deg, #1d4ed8, #0284c7)",
                    color: "#fff",
                    fontWeight: 800,
                    padding: "9px 20px",
                    border: "none",
                    boxShadow: "0 4px 14px rgba(29, 78, 216, 0.4)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6
                  }}
                >
                  <Truck size={15} /> {dispatchModal.busy ? "Broadcasting CAD..." : "Confirm & Dispatch Patrol"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: FULL CITIZEN SOS & ICE PROFILE INSPECTION               */}
      {/* ============================================================== */}
      {selectedSosDetail && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(2, 6, 23, 0.8)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            padding: 16
          }}
          onClick={() => setSelectedSosDetail(null)}
        >
          <div
            style={{
              background: "#0f172a",
              border: "1.5px solid rgba(239, 68, 68, 0.4)",
              borderRadius: 16,
              maxWidth: 620,
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: 24,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.85)",
              color: "#fff"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ padding: 8, background: "rgba(239, 68, 68, 0.2)", borderRadius: 10 }}>
                  <ShieldAlert size={26} color="#f87171" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800 }}>
                    Emergency Distress Dossier #{selectedSosDetail.id}
                  </h3>
                  <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "#94a3b8" }}>
                    Triggered at {new Date(selectedSosDetail.created_at + (selectedSosDetail.created_at.endsWith("Z") ? "" : "Z")).toLocaleString()}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSosDetail(null)}
                style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Citizen Identity */}
            <div
              style={{
                background: "rgba(15, 23, 42, 0.8)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: 12,
                padding: "14px 16px",
                marginBottom: 16
              }}
            >
              <h4 style={{ margin: "0 0 10px", fontSize: "0.88rem", color: "#93c5fd", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Complainant Identity
              </h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: "0.85rem" }}>
                <div>
                  <span style={{ color: "#94a3b8", fontSize: "0.78rem" }}>Full Name:</span>
                  <div style={{ fontWeight: 700, color: "#fff" }}>{selectedSosDetail.user_name || `User #${selectedSosDetail.user_id}`}</div>
                </div>
                <div>
                  <span style={{ color: "#94a3b8", fontSize: "0.78rem" }}>Mobile Number:</span>
                  <div>
                    {selectedSosDetail.user_phone ? (
                      <a href={`tel:${selectedSosDetail.user_phone}`} style={{ color: "#38bdf8", fontWeight: 700 }}>
                        📞 {selectedSosDetail.user_phone}
                      </a>
                    ) : "Not recorded"}
                  </div>
                </div>
                <div>
                  <span style={{ color: "#94a3b8", fontSize: "0.78rem" }}>Email:</span>
                  <div style={{ color: "#cbd5e1" }}>{selectedSosDetail.user_email || "N/A"}</div>
                </div>
                <div>
                  <span style={{ color: "#94a3b8", fontSize: "0.78rem" }}>Current Status:</span>
                  <div style={{ marginTop: 2 }}>
                    <Tag s={selectedSosDetail.status} />
                  </div>
                </div>
              </div>
            </div>

            {/* In Case of Emergency (ICE) Medical Profile */}
            <div
              style={{
                background: "rgba(239, 68, 68, 0.08)",
                border: "1px solid rgba(239, 68, 68, 0.25)",
                borderRadius: 12,
                padding: "14px 16px",
                marginBottom: 16
              }}
            >
              <h4 style={{ margin: "0 0 10px", fontSize: "0.88rem", color: "#fca5a5", textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: 6 }}>
                <span>🩺 Emergency Medical Profile (ICE)</span>
              </h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: "0.85rem" }}>
                <div>
                  <span style={{ color: "#94a3b8", fontSize: "0.78rem" }}>Blood Group:</span>
                  <div style={{ fontWeight: 800, color: "#f87171", fontSize: "1rem" }}>
                    {selectedSosDetail.medical_profile?.blood_group || "Not Specified"}
                  </div>
                </div>
                <div>
                  <span style={{ color: "#94a3b8", fontSize: "0.78rem" }}>Preferred Hospital:</span>
                  <div style={{ color: "#fff", fontWeight: 600 }}>
                    {selectedSosDetail.medical_profile?.hospital_preference || "District Civil Hospital Kolhapur"}
                  </div>
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <span style={{ color: "#94a3b8", fontSize: "0.78rem" }}>Known Allergies:</span>
                  <div style={{ color: "#fbbf24" }}>
                    {selectedSosDetail.medical_profile?.allergies || "None reported"}
                  </div>
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <span style={{ color: "#94a3b8", fontSize: "0.78rem" }}>Medical Conditions / Notes:</span>
                  <div style={{ color: "#cbd5e1" }}>
                    {selectedSosDetail.medical_profile?.emergency_notes || "No pre-existing conditions recorded."}
                  </div>
                </div>
              </div>
            </div>

            {/* Emergency Contacts (ICE Circle) */}
            <div
              style={{
                background: "rgba(15, 23, 42, 0.8)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: 12,
                padding: "14px 16px",
                marginBottom: 16
              }}
            >
              <h4 style={{ margin: "0 0 10px", fontSize: "0.88rem", color: "#a78bfa", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Primary Emergency Contacts (Circle)
              </h4>
              {!selectedSosDetail.emergency_contacts || selectedSosDetail.emergency_contacts.length === 0 ? (
                <div style={{ fontSize: "0.82rem", color: "#64748b" }}>No designated circle contacts.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {selectedSosDetail.emergency_contacts.map((c, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        background: "rgba(0,0,0,0.25)",
                        padding: "8px 12px",
                        borderRadius: 8,
                        fontSize: "0.85rem"
                      }}
                    >
                      <div>
                        <b>{c.name}</b> <span style={{ color: "#94a3b8", fontSize: "0.78rem" }}>({c.relation || "Contact"})</span>
                      </div>
                      <a href={`tel:${c.phone}`} style={{ color: "#38bdf8", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <PhoneCall size={12} /> {c.phone}
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Live GPS & CAD Patrol Status */}
            <div
              style={{
                background: "rgba(30, 58, 138, 0.2)",
                border: "1px solid rgba(59, 130, 246, 0.3)",
                borderRadius: 12,
                padding: "14px 16px",
                marginBottom: 20
              }}
            >
              <h4 style={{ margin: "0 0 10px", fontSize: "0.88rem", color: "#60a5fa", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Dispatch &amp; Geolocation Coordinates
              </h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: "0.85rem" }}>
                <div>
                  <span style={{ color: "#94a3b8", fontSize: "0.78rem" }}>Patrol Unit Dispatched:</span>
                  <div style={{ fontWeight: 700, color: "#93c5fd" }}>
                    {selectedSosDetail.patrol_unit || "Pending Unit Assignment"}
                  </div>
                </div>
                <div>
                  <span style={{ color: "#94a3b8", fontSize: "0.78rem" }}>Precinct Jurisdiction:</span>
                  <div style={{ fontWeight: 600, color: "#fff" }}>
                    {selectedSosDetail.jurisdiction_police_station?.name || "Shahupuri Police Precinct"}
                  </div>
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <span style={{ color: "#94a3b8", fontSize: "0.78rem" }}>Live GPS Location:</span>
                  {selectedSosDetail.lat && selectedSosDetail.lng ? (
                    <div style={{ marginTop: 4 }}>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${selectedSosDetail.lat},${selectedSosDetail.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "#38bdf8", textDecoration: "underline", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 5 }}
                      >
                        <MapPin size={14} /> Open Exact Location on Google Maps ({selectedSosDetail.lat.toFixed(5)}, {selectedSosDetail.lng.toFixed(5)}) &rarr;
                      </a>
                    </div>
                  ) : (
                    <div style={{ color: "#94a3b8" }}>{selectedSosDetail.location_status || "Cell-tower approximate"}</div>
                  )}
                </div>
                {selectedSosDetail.dispatch_note && (
                  <div style={{ gridColumn: "span 2" }}>
                    <span style={{ color: "#94a3b8", fontSize: "0.78rem" }}>Dispatch Notes:</span>
                    <div style={{ color: "#e2e8f0", background: "rgba(0,0,0,0.3)", padding: "8px 10px", borderRadius: 6, marginTop: 4 }}>
                      {selectedSosDetail.dispatch_note}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <button
                type="button"
                className="btn ghost sm"
                onClick={() => download(`/pdf/sos/${selectedSosDetail.id}`, `abhaya_sos_dossier_${selectedSosDetail.id}.pdf`)}
                style={{ borderColor: "rgba(239, 68, 68, 0.4)", color: "#f87171", display: "inline-flex", alignItems: "center", gap: 5 }}
              >
                <FileDown size={14} /> Download Official PDF Dossier
              </button>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  className="btn sm"
                  onClick={() => {
                    const s = selectedSosDetail;
                    setSelectedSosDetail(null);
                    setDispatchModal({
                      isOpen: true,
                      sos: s,
                      patrolUnit: s.patrol_unit || "Shahupuri Precinct Mobile-01",
                      notes: s.dispatch_note || "Patrol unit dispatched immediately.",
                      busy: false,
                      error: ""
                    });
                  }}
                  style={{
                    background: "linear-gradient(135deg, #1d4ed8, #0284c7)",
                    color: "#fff",
                    fontWeight: 700,
                    border: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6
                  }}
                >
                  <Truck size={14} /> Dispatch / Update Patrol
                </button>
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={() => setSelectedSosDetail(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

