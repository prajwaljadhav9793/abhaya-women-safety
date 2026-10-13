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
  FileCheck2
} from "lucide-react";
import { api, useLoad, download } from "../api.js";
import { useAuth, Tag } from "../context/AuthContext.jsx";
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
                  letterSpacing: "0.05em"
                }}
              >
                ● LIVE DISPATCH TERMINAL
              </span>
            </div>
            <p style={{ margin: "4px 0 0", color: "#93c5fd", fontSize: "0.85rem" }}>
              Jurisdiction: Kolhapur District &amp; Cyber Women Safety Desk &bull; Officer:{" "}
              <b>{user?.full_name || "Admin Officer"}</b> ({user?.email})
            </p>
          </div>
        </div>

        {/* Quick Action Pill */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
            style={{ borderColor: "rgba(255, 255, 255, 0.2)", color: "#fff" }}
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
                    <th>Citizen User</th>
                    <th>Trigger Timestamp</th>
                    <th>Mode</th>
                    <th>GPS Coordinates</th>
                    <th>Status</th>
                    <th>Circle Alerts Dispatched</th>
                    <th style={{ textAlign: "right" }}>Certified PDF</th>
                  </tr>
                </thead>
                <tbody>
                  {sosData.items.map((e) => (
                    <tr key={e.id}>
                      <td>
                        <b>#{e.id}</b>
                      </td>
                      <td>User #{e.user_id}</td>
                      <td>{new Date(e.created_at + (e.created_at.endsWith("Z") ? "" : "Z")).toLocaleString()}</td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            background: e.mode === "live" ? "rgba(239, 68, 68, 0.25)" : "rgba(100, 116, 139, 0.25)",
                            color: e.mode === "live" ? "#f87171" : "#cbd5e1"
                          }}
                        >
                          {e.mode?.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        {e.lat && e.lng ? (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${e.lat},${e.lng}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: "#38bdf8", textDecoration: "underline", fontSize: "0.8rem" }}
                          >
                            {e.lat.toFixed(4)}, {e.lng.toFixed(4)}
                          </a>
                        ) : (
                          <span className="mut">{e.location_status || "Unavailable"}</span>
                        )}
                      </td>
                      <td>
                        <Tag s={e.status} />
                      </td>
                      <td>
                        <span style={{ fontSize: "0.8rem", color: "#4ade80" }}>
                          {e.notifications?.map((n) => n.status).join(", ") || "Gateway Dispatched"}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          type="button"
                          className="btn ghost sm"
                          onClick={() => download(`/pdf/sos/${e.id}`, `abhaya_sos_dossier_${e.id}.pdf`)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            borderColor: "rgba(239, 68, 68, 0.4)",
                            color: "#f87171"
                          }}
                        >
                          <FileDown size={13} /> SOS Dossier
                        </button>
                      </td>
                    </tr>
                  ))}
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
    </div>
  );
}

