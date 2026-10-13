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
  KeyRound
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

  // Form State
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Keep portal in sync if URL changes
  useEffect(() => {
    if (portalQuery === "police" || portalQuery === "admin" || location.pathname.includes("admin")) {
      setPortal("police");
    }
  }, [location]);

  const handlePortalSwitch = (newPortal) => {
    setPortal(newPortal);
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

  const instantDemoLogin = (role) => {
    if (role === "admin" || role === "police") {
      setPortal("police");
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

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        background: isPolice
          ? "radial-gradient(circle at 50% 10%, rgba(30, 58, 138, 0.25) 0%, rgba(10, 15, 30, 0.98) 70%)"
          : "radial-gradient(circle at 50% 10%, rgba(168, 85, 247, 0.18) 0%, rgba(15, 12, 26, 0.98) 70%)",
        transition: "background 0.4s ease"
      }}
    >
      {/* Top Breadcrumb / Return */}
      <div style={{ width: "100%", maxWidth: 460, marginBottom: 16 }}>
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
          maxWidth: 460,
          background: isPolice
            ? "rgba(15, 23, 42, 0.75)"
            : "rgba(23, 17, 39, 0.75)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: isPolice
            ? "1px solid rgba(59, 130, 246, 0.35)"
            : "1px solid rgba(168, 85, 247, 0.3)",
          borderRadius: 20,
          boxShadow: isPolice
            ? "0 20px 45px rgba(2, 6, 23, 0.7), 0 0 30px rgba(59, 130, 246, 0.15)"
            : "0 20px 45px rgba(10, 5, 20, 0.7), 0 0 30px rgba(168, 85, 247, 0.12)",
          padding: "28px 24px",
          transition: "all 0.3s ease"
        }}
      >
        {/* Brand Icon & Heading */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div
            style={{
              width: 54,
              height: 54,
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
                ? "0 0 20px rgba(37, 99, 235, 0.5)"
                : "0 0 20px rgba(168, 85, 247, 0.5)"
            }}
          >
            {isPolice ? <ShieldCheck size={28} /> : <Shield size={28} />}
          </div>
          <h2
            style={{
              margin: 0,
              fontSize: "1.45rem",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: "#fff"
            }}
          >
            {isPolice ? "Police & Authority Gateway" : "Citizen Safety Portal"}
          </h2>
          <p
            style={{
              margin: "6px 0 0",
              fontSize: "0.85rem",
              color: isPolice ? "#93c5fd" : "#c4b5fd"
            }}
          >
            {isPolice
              ? "Official command terminal for law enforcement & district officials"
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
            <span>Police / Admin</span>
          </button>
        </div>

        {/* 1-Click Fast Demo Credentials Box */}
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
              <b>Authorized Personnel Notice:</b> Real-time access to complaints verification, live SOS dispatch, safety intelligence heatmaps, and evidence records.
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLoginSubmit}>
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

        {/* Footer Links */}
        <div style={{ marginTop: 22, textAlign: "center", borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: 16 }}>
          {!isPolice ? (
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#94a3b8" }}>
              New citizen user?{" "}
              <Link to="/register" style={{ color: "#c084fc", fontWeight: 700, textDecoration: "none" }}>
                Create Abhaya Account
              </Link>
            </p>
          ) : (
            <p style={{ margin: 0, fontSize: "0.82rem", color: "#94a3b8" }}>
              Need district officer registration? Contact your precinct cyber administrator.
            </p>
          )}

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

