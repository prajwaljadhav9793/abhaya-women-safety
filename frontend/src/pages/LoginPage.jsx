import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  User,
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  Building2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  PhoneCall,
  KeyRound,
  FileCheck2,
  UploadCloud,
  UserPlus
} from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function LoginPage({ initialPortal }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Determine starting portal from prop, query string or path
  const searchParams = new URLSearchParams(location.search);
  const portalQuery = searchParams.get("portal") || searchParams.get("role");
  const isPolicePath = location.pathname.includes("admin");

  const [portal, setPortal] = useState(
    initialPortal || (portalQuery === "admin" || portalQuery === "police" || isPolicePath ? "police" : "citizen")
  );

  // Sub-mode for police portal: "login" or "register"
  const [policeMode, setPoliceMode] = useState("login");

  // Form State: Login
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Form State: Officer Registration with ID Proof
  const [officerForm, setOfficerForm] = useState({
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
  const [idProofFile, setIdProofFile] = useState(null);

  // Keep portal in sync if URL changes
  useEffect(() => {
    if (portalQuery === "police" || portalQuery === "admin" || location.pathname.includes("admin")) {
      setPortal("police");
    }
  }, [location]);

  const handlePortalSwitch = (newPortal) => {
    setPortal(newPortal);
    setPoliceMode("login");
    setError("");
    setIdentifier("");
    setPassword("");
  };

  const handleLoginSubmit = async (e, customId, customPw) => {
    if (e) e.preventDefault();
    const id = customId !== undefined ? customId : identifier;
    const pw = customPw !== undefined ? customPw : password;

    if (!id || !pw) {
      setError("Please enter both email/phone and password.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const data = await api("/auth/login", {
        method: "POST",
        body: { identifier: id, password: pw }
      });

      login(data.token, data.user);

      // Smart role-based redirection
      if (data.user?.role === "admin" || portal === "police") {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.message || "Invalid credentials. Please verify your login details.");
    } finally {
      setBusy(false);
    }
  };

  const handleOfficerRegister = async (e) => {
    e.preventDefault();
    setError("");

    if (!officerForm.full_name || !officerForm.email || !officerForm.phone) {
      setError("Please complete all personal and contact fields.");
      return;
    }

    if (!officerForm.badge_number || !officerForm.id_proof_number) {
      setError("Official Officer Badge Number and ID Proof credential number are mandatory.");
      return;
    }

    if (!officerForm.password || officerForm.password.length < 8) {
      setError("Password must be at least 8 characters with letters and numbers.");
      return;
    }

    if (officerForm.password !== officerForm.confirm_password) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);

    try {
      const formData = new FormData();
      formData.append("full_name", officerForm.full_name);
      formData.append("email", officerForm.email);
      formData.append("phone", officerForm.phone);
      formData.append("badge_number", officerForm.badge_number);
      formData.append("department", officerForm.department);
      formData.append("designation", officerForm.designation);
      formData.append("id_proof_type", officerForm.id_proof_type);
      formData.append("id_proof_number", officerForm.id_proof_number);
      formData.append("password", officerForm.password);
      formData.append("confirm_password", officerForm.confirm_password);

      if (idProofFile) {
        formData.append("id_proof_file", idProofFile);
      }

      // Perform direct fetch to pass FormData cleanly
      const tokenHeader = localStorage.getItem("token")
        ? { Authorization: `Bearer ${localStorage.getItem("token")}` }
        : {};

      const res = await fetch("/api/auth/register-officer", {
        method: "POST",
        headers: {
          ...tokenHeader
        },
        body: formData
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to register authority officer.");
      }

      login(data.token, data.user);
      navigate("/admin");
    } catch (err) {
      setError(err.message || "Officer registration failed. Please verify all ID details.");
    } finally {
      setBusy(false);
    }
  };

  const instantDemoLogin = (role) => {
    if (role === "admin" || role === "police") {
      setPortal("police");
      setPoliceMode("login");
      setIdentifier("demo.admin@abhaya.test");
      setPassword("Admin@12345");
      handleLoginSubmit(null, "demo.admin@abhaya.test", "Admin@12345");
    } else {
      setPortal("citizen");
      setIdentifier("demo.user@abhaya.test");
      setPassword("Demo@12345");
      handleLoginSubmit(null, "demo.user@abhaya.test", "Demo@12345");
    }
  };

  const isPolice = portal === "police";
  const isOfficerRegister = isPolice && policeMode === "register";

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 16px",
        background: isPolice
          ? "radial-gradient(circle at 50% 10%, rgba(30, 58, 138, 0.3) 0%, rgba(10, 15, 30, 0.98) 70%)"
          : "radial-gradient(circle at 50% 10%, rgba(168, 85, 247, 0.18) 0%, rgba(15, 12, 26, 0.98) 70%)",
        transition: "background 0.4s ease"
      }}
    >
      {/* Top Breadcrumb / Return */}
      <div style={{ width: "100%", maxWidth: isOfficerRegister ? 560 : 460, marginBottom: 16 }}>
        <Link
          to="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            color: "#94a3b8",
            textDecoration: "none",
            fontSize: "0.85rem",
            fontWeight: 600
          }}
        >
          &larr; Back to Abhaya Home
        </Link>
      </div>

      {/* Main Container */}
      <div
        style={{
          width: "100%",
          maxWidth: isOfficerRegister ? 560 : 460,
          background: isPolice
            ? "rgba(15, 23, 42, 0.85)"
            : "rgba(23, 17, 39, 0.85)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: isPolice
            ? "1px solid rgba(59, 130, 246, 0.4)"
            : "1px solid rgba(168, 85, 247, 0.3)",
          borderRadius: 22,
          boxShadow: isPolice
            ? "0 20px 45px rgba(2, 6, 23, 0.7), 0 0 35px rgba(59, 130, 246, 0.15)"
            : "0 20px 45px rgba(10, 5, 20, 0.7), 0 0 30px rgba(168, 85, 247, 0.12)",
          padding: "30px 26px",
          transition: "all 0.3s ease"
        }}
      >
        {/* Brand Icon & Heading */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div
            style={{
              width: 56,
              height: 56,
              margin: "0 auto 12px",
              borderRadius: 16,
              background: isPolice
                ? "linear-gradient(135deg, #1d4ed8, #0284c7)"
                : "linear-gradient(135deg, #a855f7, #ec4899)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              boxShadow: isPolice
                ? "0 0 25px rgba(37, 99, 235, 0.55)"
                : "0 0 25px rgba(168, 85, 247, 0.5)"
            }}
          >
            {isPolice ? <ShieldCheck size={30} /> : <Shield size={30} />}
          </div>
          <h2
            style={{
              margin: 0,
              fontSize: "1.5rem",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: "#fff"
            }}
          >
            {isPolice
              ? isOfficerRegister
                ? "Police Clearance & Account Creation"
                : "Police & Authority Gateway"
              : "Citizen Safety Portal"}
          </h2>
          <p
            style={{
              margin: "6px 0 0",
              fontSize: "0.85rem",
              color: isPolice ? "#93c5fd" : "#c4b5fd"
            }}
          >
            {isPolice
              ? isOfficerRegister
                ? "Official officer registration with required badge and government ID proof"
                : "Official command terminal for law enforcement & district officials"
              : "Sign in to access your personal safety shield & live monitoring"}
          </p>
        </div>

        {/* Dual Portal Switcher Tabs */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 6,
            background: "rgba(0, 0, 0, 0.3)",
            padding: 4,
            borderRadius: 12,
            marginBottom: 20,
            border: "1px solid rgba(255, 255, 255, 0.08)"
          }}
        >
          <button
            type="button"
            onClick={() => handlePortalSwitch("citizen")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "10px 12px",
              borderRadius: 9,
              border: "none",
              fontSize: "0.83rem",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.2s ease",
              background: !isPolice
                ? "linear-gradient(135deg, rgba(168, 85, 247, 0.4), rgba(236, 72, 153, 0.3))"
                : "transparent",
              color: !isPolice ? "#fff" : "#94a3b8",
              boxShadow: !isPolice ? "0 2px 10px rgba(168, 85, 247, 0.25)" : "none"
            }}
          >
            <User size={15} />
            <span>Citizen Portal</span>
          </button>

          <button
            type="button"
            onClick={() => handlePortalSwitch("police")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "10px 12px",
              borderRadius: 9,
              border: "none",
              fontSize: "0.83rem",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.2s ease",
              background: isPolice
                ? "linear-gradient(135deg, rgba(37, 99, 235, 0.5), rgba(2, 132, 199, 0.4))"
                : "transparent",
              color: isPolice ? "#fff" : "#94a3b8",
              boxShadow: isPolice ? "0 2px 10px rgba(37, 99, 235, 0.3)" : "none"
            }}
          >
            <ShieldCheck size={15} />
            <span>Police / Authority</span>
          </button>
        </div>

        {/* Sub-toggle for Police Portal: Sign In vs Register with ID Proof */}
        {isPolice && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              marginBottom: 18,
              borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
              paddingBottom: 14
            }}
          >
            <button
              type="button"
              onClick={() => {
                setPoliceMode("login");
                setError("");
              }}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: "none",
                background: policeMode === "login" ? "rgba(59, 130, 246, 0.25)" : "rgba(255, 255, 255, 0.05)",
                color: policeMode === "login" ? "#60a5fa" : "#94a3b8",
                fontSize: "0.8rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6
              }}
            >
              <KeyRound size={14} /> Police Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setPoliceMode("register");
                setError("");
              }}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: "none",
                background: policeMode === "register" ? "rgba(59, 130, 246, 0.25)" : "rgba(255, 255, 255, 0.05)",
                color: policeMode === "register" ? "#60a5fa" : "#94a3b8",
                fontSize: "0.8rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6
              }}
            >
              <FileCheck2 size={14} /> Register with ID Proof
            </button>
          </div>
        )}

        {/* 1-Click Fast Demo Credentials Box (Only in Login Mode) */}
        {!isOfficerRegister && (
          <div
            style={{
              background: isPolice
                ? "rgba(30, 58, 138, 0.25)"
                : "rgba(139, 92, 246, 0.12)",
              border: isPolice
                ? "1px solid rgba(59, 130, 246, 0.4)"
                : "1px solid rgba(168, 85, 247, 0.35)",
              borderRadius: 14,
              padding: "12px 14px",
              marginBottom: 20
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8
              }}
            >
              <span
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 800,
                  letterSpacing: "0.06em",
                  color: isPolice ? "#60a5fa" : "#c084fc",
                  textTransform: "uppercase"
                }}
              >
                ⚡ Instant 1-Click Demo Login
              </span>
              <span
                style={{
                  fontSize: "0.7rem",
                  color: "#94a3b8",
                  background: "rgba(255, 255, 255, 0.06)",
                  padding: "2px 6px",
                  borderRadius: 4
                }}
              >
                Auto-fills &amp; Signs In
              </span>
            </div>

            {isPolice ? (
              <button
                type="button"
                className="btn sm"
                onClick={() => instantDemoLogin("police")}
                disabled={busy}
                style={{
                  width: "100%",
                  background: "linear-gradient(135deg, #1d4ed8, #0284c7)",
                  color: "#fff",
                  fontWeight: 700,
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "9px 12px"
                }}
              >
                <ShieldCheck size={16} />
                <span>Login as Police Command Officer</span>
              </button>
            ) : (
              <button
                type="button"
                className="btn sm"
                onClick={() => instantDemoLogin("citizen")}
                disabled={busy}
                style={{
                  width: "100%",
                  background: "linear-gradient(135deg, #9333ea, #db2777)",
                  color: "#fff",
                  fontWeight: 700,
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "9px 12px"
                }}
              >
                <User size={16} />
                <span>Login as Demo Citizen User</span>
              </button>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 8,
                fontSize: "0.74rem",
                color: "#94a3b8"
              }}
            >
              <span>
                <b>ID:</b> {isPolice ? "demo.admin@abhaya.test" : "demo.user@abhaya.test"}
              </span>
              <span>
                <b>Pass:</b> {isPolice ? "Admin@12345" : "Demo@12345"}
              </span>
            </div>
          </div>
        )}

        {/* MODE A: OFFICER REGISTRATION WITH ID PROOF */}
        {isOfficerRegister ? (
          <form onSubmit={handleOfficerRegister}>
            <div
              style={{
                background: "rgba(59, 130, 246, 0.1)",
                border: "1px solid rgba(59, 130, 246, 0.3)",
                borderRadius: 12,
                padding: "12px 14px",
                marginBottom: 16,
                fontSize: "0.8rem",
                color: "#bfdbfe"
              }}
            >
              <div style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                <ShieldCheck size={16} color="#60a5fa" />
                <span>Required Law Enforcement ID Verification</span>
              </div>
              <span>
                Provide your official officer badge number, jurisdictional precinct, and physical identity proof to obtain administrative authority credentials.
              </span>
            </div>

            {/* Officer Personal Info */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#cbd5e1", marginBottom: 4 }}>
                  Officer Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Inspector Ramesh Patil"
                  value={officerForm.full_name}
                  onChange={(e) => setOfficerForm({ ...officerForm, full_name: e.target.value })}
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
                  value={officerForm.email}
                  onChange={(e) => setOfficerForm({ ...officerForm, email: e.target.value })}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(0,0,0,0.4)", color: "#fff", fontSize: "0.85rem" }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#cbd5e1", marginBottom: 4 }}>
                  Mobile Number (10 digits) *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="9876543210"
                  value={officerForm.phone}
                  onChange={(e) => setOfficerForm({ ...officerForm, phone: e.target.value })}
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
                  value={officerForm.badge_number}
                  onChange={(e) => setOfficerForm({ ...officerForm, badge_number: e.target.value })}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(59,130,246,0.4)", background: "rgba(30,58,138,0.2)", color: "#60a5fa", fontWeight: 700, fontSize: "0.85rem" }}
                />
              </div>
            </div>

            {/* Department & Designation */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#cbd5e1", marginBottom: 4 }}>
                  Designation / Rank *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Police Sub-Inspector / DSP"
                  value={officerForm.designation}
                  onChange={(e) => setOfficerForm({ ...officerForm, designation: e.target.value })}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(0,0,0,0.4)", color: "#fff", fontSize: "0.85rem" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#cbd5e1", marginBottom: 4 }}>
                  Police Station / Department *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Shahupuri Police Precinct"
                  value={officerForm.department}
                  onChange={(e) => setOfficerForm({ ...officerForm, department: e.target.value })}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(0,0,0,0.4)", color: "#fff", fontSize: "0.85rem" }}
                />
              </div>
            </div>

            {/* ID Proof Selection & Number */}
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#cbd5e1", marginBottom: 4 }}>
                  Official ID Proof Type *
                </label>
                <select
                  value={officerForm.id_proof_type}
                  onChange={(e) => setOfficerForm({ ...officerForm, id_proof_type: e.target.value })}
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
                  value={officerForm.id_proof_number}
                  onChange={(e) => setOfficerForm({ ...officerForm, id_proof_number: e.target.value })}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(0,0,0,0.4)", color: "#fff", fontSize: "0.85rem" }}
                />
              </div>
            </div>

            {/* ID Proof Document File Upload */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#cbd5e1", marginBottom: 4 }}>
                Upload ID Proof Document / Photo (PDF, PNG, JPG) *
              </label>
              <div
                style={{
                  border: "2px dashed rgba(59, 130, 246, 0.4)",
                  borderRadius: 10,
                  padding: "14px 16px",
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
                      setIdProofFile(e.target.files[0]);
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
                <UploadCloud size={24} style={{ color: "#60a5fa", margin: "0 auto 4px" }} />
                <div style={{ fontSize: "0.82rem", color: "#e2e8f0", fontWeight: 600 }}>
                  {idProofFile ? (
                    <span style={{ color: "#4ade80" }}>
                      ✓ {idProofFile.name} ({Math.round(idProofFile.size / 1024)} KB)
                    </span>
                  ) : (
                    <span>Click or drag official ID proof file here</span>
                  )}
                </div>
                <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 2 }}>
                  Supports Police Warrant Card scan, Departmental Service ID, or Government Photo ID (Max 10 MB)
                </div>
              </div>
            </div>

            {/* Passwords */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#cbd5e1", marginBottom: 4 }}>
                  Security Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Min 8 chars"
                  value={officerForm.password}
                  onChange={(e) => setOfficerForm({ ...officerForm, password: e.target.value })}
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
                  value={officerForm.confirm_password}
                  onChange={(e) => setOfficerForm({ ...officerForm, confirm_password: e.target.value })}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(0,0,0,0.4)", color: "#fff", fontSize: "0.85rem" }}
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 12px",
                  background: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid rgba(239, 68, 68, 0.35)",
                  borderRadius: 8,
                  color: "#fca5a5",
                  fontSize: "0.82rem",
                  marginBottom: 16
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="btn"
              disabled={busy}
              style={{
                width: "100%",
                padding: "12px",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "0.95rem",
                background: "linear-gradient(135deg, #1d4ed8, #0284c7)",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                boxShadow: "0 4px 15px rgba(29, 78, 216, 0.4)",
                cursor: busy ? "not-allowed" : "pointer"
              }}
            >
              {busy ? "Registering Officer Account..." : "✓ Register Authority Officer Account"}
            </button>

            <div style={{ textAlign: "center", marginTop: 12 }}>
              <button
                type="button"
                onClick={() => setPoliceMode("login")}
                style={{
                  background: "none",
                  border: "none",
                  color: "#93c5fd",
                  fontSize: "0.8rem",
                  textDecoration: "underline",
                  cursor: "pointer"
                }}
              >
                &larr; Already have an authorized badge? Sign in as Police Officer
              </button>
            </div>
          </form>
        ) : (
          /* MODE B: STANDARD LOGIN FORM */
          <form onSubmit={handleLoginSubmit}>
            {/* Official Authority Badge Notice for Police */}
            {isPolice && (
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  padding: "10px 12px",
                  background: "rgba(234, 179, 8, 0.08)",
                  border: "1px solid rgba(234, 179, 8, 0.25)",
                  borderRadius: 10,
                  marginBottom: 18,
                  fontSize: "0.78rem",
                  color: "#fde047",
                  lineHeight: 1.4
                }}
              >
                <Building2 size={18} style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <b>Authorized Personnel Notice:</b> Access to complaints dispatch, safety intelligence heatmaps, digital evidence repository, and distress feeds.
                </div>
              </div>
            )}

            {/* Email / ID Field */}
            <div style={{ marginBottom: 14 }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: "#e2e8f0",
                  marginBottom: 6
                }}
              >
                {isPolice ? "Officer ID or Official Email" : "Email Address or Mobile Number"}
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={
                    isPolice
                      ? "demo.admin@abhaya.test or official email"
                      : "demo.user@abhaya.test or mobile number"
                  }
                  required
                  style={{
                    width: "100%",
                    padding: "11px 12px 11px 38px",
                    borderRadius: 10,
                    border: isPolice
                      ? "1px solid rgba(59, 130, 246, 0.3)"
                      : "1px solid rgba(168, 85, 247, 0.25)",
                    background: "rgba(0, 0, 0, 0.4)",
                    color: "#fff",
                    fontSize: "0.9rem",
                    boxSizing: "border-box"
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#64748b"
                  }}
                >
                  {isPolice ? <ShieldCheck size={16} /> : <Mail size={16} />}
                </div>
              </div>
            </div>

            {/* Password Field */}
            <div style={{ marginBottom: 18 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 6
                }}
              >
                <label
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    color: "#e2e8f0"
                  }}
                >
                  {isPolice ? "Security Passcode" : "Password"}
                </label>
              </div>

              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  style={{
                    width: "100%",
                    padding: "11px 40px 11px 38px",
                    borderRadius: 10,
                    border: isPolice
                      ? "1px solid rgba(59, 130, 246, 0.3)"
                      : "1px solid rgba(168, 85, 247, 0.25)",
                    background: "rgba(0, 0, 0, 0.4)",
                    color: "#fff",
                    fontSize: "0.9rem",
                    boxSizing: "border-box"
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#64748b"
                  }}
                >
                  <Lock size={16} />
                </div>

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "#94a3b8",
                    cursor: "pointer",
                    padding: 4
                  }}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 12px",
                  background: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid rgba(239, 68, 68, 0.35)",
                  borderRadius: 8,
                  color: "#fca5a5",
                  fontSize: "0.82rem",
                  marginBottom: 16
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="btn"
              disabled={busy}
              style={{
                width: "100%",
                padding: "12px",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "0.95rem",
                background: isPolice
                  ? "linear-gradient(135deg, #1d4ed8, #0284c7)"
                  : "linear-gradient(135deg, #9333ea, #db2777)",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                boxShadow: isPolice
                  ? "0 4px 15px rgba(29, 78, 216, 0.4)"
                  : "0 4px 15px rgba(147, 51, 234, 0.4)",
                cursor: busy ? "not-allowed" : "pointer"
              }}
            >
              {busy ? (
                "Authenticating..."
              ) : isPolice ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <ShieldCheck size={18} /> Access Police Command Console &rarr;
                </span>
              ) : (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <User size={18} /> Enter Citizen Safety Hub &rarr;
                </span>
              )}
            </button>
          </form>
        )}

        {/* Footer Links */}
        <div style={{ marginTop: 22, textAlign: "center", borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: 16 }}>
          {!isPolice ? (
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#94a3b8" }}>
              New citizen user?{" "}
              <Link to="/register" style={{ color: "#c084fc", fontWeight: 700, textDecoration: "none" }}>
                Create Abhaya Account
              </Link>
            </p>
          ) : !isOfficerRegister ? (
            <p style={{ margin: 0, fontSize: "0.82rem", color: "#94a3b8" }}>
              Need authority clearance?{" "}
              <button
                type="button"
                onClick={() => setPoliceMode("register")}
                style={{
                  background: "none",
                  border: "none",
                  color: "#60a5fa",
                  fontWeight: 700,
                  cursor: "pointer",
                  textDecoration: "underline",
                  fontSize: "0.82rem"
                }}
              >
                Create Officer Account (with ID Proof)
              </button>
            </p>
          ) : null}

          <div style={{ marginTop: 12 }}>
            <button
              type="button"
              onClick={() => handlePortalSwitch(isPolice ? "citizen" : "police")}
              style={{
                background: "none",
                border: "none",
                color: isPolice ? "#93c5fd" : "#c4b5fd",
                fontSize: "0.78rem",
                textDecoration: "underline",
                cursor: "pointer"
              }}
            >
              {isPolice ? "Switch to Citizen / Women Safety Login" : "Switch to Police / Law Enforcement Login"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
