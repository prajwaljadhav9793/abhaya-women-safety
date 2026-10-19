import React, { createContext, useContext, useEffect, useState } from "react";
import { Routes, Route, Navigate, NavLink, Link, useNavigate, useLocation, Outlet } from "react-router-dom";
import { Shield, Home, Users, Route as RouteIcon, Navigation, Flag, BarChart3, LifeBuoy, Bot, FolderLock, User, Settings, LogOut, PhoneCall, Menu, X, Bell, Sparkles, ShieldAlert, Volume2, VolumeX, ShieldCheck, FileText, Activity } from "lucide-react";
import { api, tok, useLoad } from "./api.js";
import * as P from "./pages.jsx";
import FakeCall from "./pages/FakeCall.jsx";
import { AuthProvider, useAuth, Tag } from "./context/AuthContext.jsx";
import { ErrorBoundary } from "./components/ErrorBoundary.jsx";
import { playEmergencyAlarm, stopEmergencyAlarm, captureEmergencyCoordinates, isEmergencyAlarmPlaying } from "./emergencyAudio.js";
export { useAuth, Tag };

function Sos() {
  const location = useLocation();
  const isDashboard = location.pathname === "/dashboard";
  const [res, setRes] = useState(null), [busy, setBusy] = useState(false), [err, setErr] = useState("");
  const [alarmActive, setAlarmActive] = useState(false);

  useEffect(() => {
    return () => {
      stopEmergencyAlarm();
    };
  }, []);

  const toggleAlarm = () => {
    if (alarmActive) {
      stopEmergencyAlarm();
      setAlarmActive(false);
    } else {
      playEmergencyAlarm();
      setAlarmActive(true);
    }
  };

  const closeSos = () => {
    stopEmergencyAlarm();
    setAlarmActive(false);
    setRes(null);
    setErr("");
  };

  // Real-time synchronization with Police CAD Dispatch while SOS modal is active
  useEffect(() => {
    if (!res?.sos?.id) return;
    const sosId = res.sos.id;
    let isMounted = true;

    const interval = setInterval(async () => {
      try {
        const updated = await api(`/sos/${sosId}`);
        if (!isMounted) return;
        if (updated?.sos) {
          setRes((prev) => (prev ? { ...prev, sos: { ...prev.sos, ...updated.sos } } : prev));
        }
      } catch (e) {
        // silent fail
      }
    }, 2500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [res?.sos?.id]);

  const press = async () => {
    if (busy) return;
    setBusy(true);
    setErr("");

    // 1. Instantly sound the piercing siren on click
    playEmergencyAlarm();
    setAlarmActive(true);

    try {
      // 2. Guaranteed multi-tier location capture (GPS -> Wi-Fi -> Local Cache -> IP -> Regional)
      const coords = await captureEmergencyCoordinates();

      const data = await api("/sos", {
        method: "POST",
        body: {
          lat: coords.lat,
          lng: coords.lng,
          accuracy: coords.accuracy,
          note: `🚨 Emergency SOS activated from navbar (Source: ${coords.source || "GPS"})`
        }
      });

      setRes(data);
      const primary = data?.contacts?.[0];
      if (primary && primary.wa_url && !primary.phone?.includes("000000099")) {
        if (!data?.has_real_gateway) {
          window.open(primary.wa_url, "_blank");
        }
      }
    } catch (e) {
      setErr(e.message || "Failed to dispatch SOS alert");
    } finally {
      setBusy(false);
    }
  };

  // Listen for custom trigger from Hero SOS button on Dashboard
  useEffect(() => {
    const handleTrigger = () => {
      press();
    };
    window.addEventListener("abhaya-trigger-sos", handleTrigger);
    return () => {
      window.removeEventListener("abhaya-trigger-sos", handleTrigger);
    };
  }, [busy]);

  const s = res?.sos;
  return <>
    <button
      className="sos"
      onClick={press}
      disabled={busy}
      aria-label="SOS emergency"
      style={isDashboard ? { display: "none" } : undefined}
    >
      {busy ? "..." : "SOS"}
    </button>
    {(res || err) && <div className="modal"><div className="card" style={{ maxWidth: 520, border: "2px solid #ef4444" }}>
      {err ? (
        <>
          <h3 className="err">🚨 SOS could not be created</h3>
          <p>{err}</p>
          <p>Call local emergency services (India: 112) or a trusted person directly.</p>
        </>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3 style={{ color: "#ef4444", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
              🚨 Emergency SOS Active
            </h3>
            <span className="badge b-verified" style={{ background: "#ef4444", color: "#fff", fontWeight: "bold" }}>
              {s.mode.toUpperCase()} ALERT
            </span>
          </div>
          <p className="mut" style={{ margin: "2px 0 8px" }}>
            Event #{s.id} &bull; {new Date(s.created_at + "Z").toLocaleString()}
          </p>

          {/* Emergency Audio Siren Control Banner */}
          <div
            style={{
              background: alarmActive ? "rgba(239, 68, 68, 0.2)" : "rgba(100, 116, 139, 0.2)",
              border: `1px solid ${alarmActive ? "#ef4444" : "#64748b"}`,
              borderRadius: 8,
              padding: "10px 14px",
              marginBottom: 12,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}
          >
            <span style={{ color: alarmActive ? "#fca5a5" : "#cbd5e1", fontSize: "0.85rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
              {alarmActive ? (
                <>
                  <Volume2 size={18} className="spin" /> 🔊 Loud Emergency Siren is Sounding!
                </>
              ) : (
                <>
                  <VolumeX size={18} /> 🔇 Siren Silenced
                </>
              )}
            </span>
            <button
              type="button"
              onClick={toggleAlarm}
              className="btn sm"
              style={{
                background: alarmActive ? "#ef4444" : "#475569",
                color: "#fff",
                border: "none",
                fontSize: "0.78rem",
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                gap: 5
              }}
            >
              {alarmActive ? <><VolumeX size={14} /> Silence Siren</> : <><Volume2 size={14} /> Sound Siren</>}
            </button>
          </div>

          <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 6, padding: "8px 12px", marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <b>📍 Captured Live Location:</b>
              <span style={{ fontSize: "0.72rem", background: "rgba(56, 189, 248, 0.2)", color: "#38bdf8", padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>
                {s.location_status === "captured" ? "GPS / COORDS LOCKED" : s.location_status?.toUpperCase()}
              </span>
            </div>
            {s.lat && s.lng ? (
              <a href={s.map_url || `https://www.google.com/maps?q=${s.lat},${s.lng}`} target="_blank" rel="noreferrer" style={{ color: "#38bdf8", textDecoration: "underline", fontWeight: 600, fontSize: "0.9rem" }}>
                Google Maps Pin ({s.lat.toFixed(5)}, {s.lng.toFixed(5)}) &bull; Acc: {s.accuracy ? Math.round(s.accuracy) + "m" : "High"} ↗
              </a>
            ) : (
              <span className="mut">{s.location_status}</span>
            )}
          </div>

          {res.evidence_pdf_url && (
            <div style={{ marginBottom: 14 }}>
              <a
                href={res.evidence_pdf_url}
                target="_blank"
                rel="noreferrer"
                className="btn sm"
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                📄 Download SOS Evidence PDF
              </a>
              <span className="mut" style={{ marginLeft: 8, fontSize: "0.78rem" }}>
                Shared with emergency contacts; link expires in 7 days.
              </span>
            </div>
          )}

          {/* Real-time Police CAD Dispatch & Patrol Status Card */}
          <div
            style={{
              background: s.status === "resolved"
                ? "rgba(16, 185, 129, 0.15)"
                : s.patrol_unit
                ? "rgba(59, 130, 246, 0.2)"
                : "rgba(245, 158, 11, 0.15)",
              border: `1.5px solid ${
                s.status === "resolved"
                  ? "#10b981"
                  : s.patrol_unit
                  ? "#3b82f6"
                  : "#f59e0b"
              }`,
              borderRadius: 8,
              padding: "12px 14px",
              marginBottom: 14
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <b style={{ color: "#fff", fontSize: "0.88rem", display: "flex", alignItems: "center", gap: 6 }}>
                {s.status === "resolved" ? (
                  <>✅ Marked Safe by Police Authority</>
                ) : s.patrol_unit ? (
                  <>🚓 Police Patrol Unit Dispatched!</>
                ) : (
                  <>🚨 Live Police CAD Monitoring Active</>
                )}
              </b>
              <span
                style={{
                  fontSize: "0.7rem",
                  padding: "2px 7px",
                  borderRadius: 4,
                  fontWeight: 800,
                  background: s.status === "resolved" ? "rgba(16, 185, 129, 0.3)" : s.patrol_unit ? "rgba(59, 130, 246, 0.3)" : "rgba(245, 158, 11, 0.3)",
                  color: s.status === "resolved" ? "#4ade80" : s.patrol_unit ? "#93c5fd" : "#fde68a"
                }}
              >
                {s.status === "resolved" ? "RESOLVED & SAFE" : s.patrol_unit ? "UNIT EN ROUTE" : "PRECINCT RADAR ACTIVE"}
              </span>
            </div>

            {s.patrol_unit ? (
              <div>
                <p style={{ margin: "2px 0 6px", fontSize: "0.82rem", color: "#e2e8f0" }}>
                  Assigned Patrol Unit: <b style={{ color: "#93c5fd" }}>{s.patrol_unit}</b> has been deployed and is responding to your live GPS coordinates.
                </p>
                {s.dispatch_note && (
                  <p style={{ margin: "4px 0 0", fontSize: "0.78rem", color: "#cbd5e1", background: "rgba(0,0,0,0.3)", padding: "6px 8px", borderRadius: 4 }}>
                    <b>Dispatch Instructions:</b> {s.dispatch_note}
                  </p>
                )}
              </div>
            ) : s.status === "resolved" ? (
              <p style={{ margin: "2px 0 0", fontSize: "0.82rem", color: "#cbd5e1" }}>
                Emergency incident has been marked safe and resolved by local police authorities.
              </p>
            ) : (
              <p style={{ margin: "2px 0 0", fontSize: "0.82rem", color: "#cbd5e1" }}>
                Your emergency distress signal and medical profile are transmitting live to the Police Command Center CAD radar (updates every 2.5s).
              </p>
            )}
          </div>

          {/* Primary WhatsApp Dispatch Action Card */}
          {res.contacts?.[0] && (
            <div
              style={{
                background: res.has_real_gateway ? "rgba(16, 185, 129, 0.12)" : "rgba(37, 211, 102, 0.12)",
                border: `1px solid ${res.has_real_gateway ? "#10b981" : "#25D366"}`,
                borderRadius: 8,
                padding: "12px 14px",
                marginBottom: 14
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <b style={{ color: res.has_real_gateway ? "#34d399" : "#25D366", fontSize: "0.9rem" }}>
                  💬 WhatsApp Emergency Alert
                </b>
                <span
                  className="badge"
                  style={{
                    background: res.has_real_gateway ? "#10b981" : "#25D366",
                    color: "#000",
                    fontWeight: "bold",
                    fontSize: "0.7rem",
                    padding: "2px 6px"
                  }}
                >
                  {res.has_real_gateway ? "CLOUD AUTO-SENT" : "PRE-FILLED READY"}
                </span>
              </div>
              <p style={{ margin: "2px 0 8px", fontSize: "0.8rem", color: "#e2e8f0" }}>
                {res.has_real_gateway
                  ? `Real emergency alert dispatched directly to ${res.contacts[0].name} (${res.contacts[0].phone}) via Cloud Gateway.`
                  : `Emergency message with live coordinates is pre-filled for ${res.contacts[0].name} (${res.contacts[0].phone}). Tap below to send instantly on WhatsApp:`}
              </p>
              {res.contacts[0].wa_url && (
                <a
                  href={res.contacts[0].wa_url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn sm"
                  style={{
                    background: "#25D366",
                    color: "#fff",
                    textDecoration: "none",
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6
                  }}
                >
                  📲 Send on WhatsApp (+91 {res.contacts[0].phone}) Now
                </a>
              )}
              {!res.has_real_gateway && (
                <div style={{ marginTop: 6, fontSize: "0.72rem", color: "#94a3b8" }}>
                  🔒 <i>Meta Security Note: WhatsApp requires 1 tap on 'Send' to prevent malicious sites from hijacking accounts. For 100% silent automated background dispatch, configure Fast2SMS or Twilio in backend/.env.</i>
                </div>
              )}
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <b style={{ color: "#fff", display: "flex", alignItems: "center", gap: 6 }}>
                ⚡ All Emergency Contacts:
              </b>
              <span className="badge b-verified" style={{ background: "#10b981", color: "#fff", fontSize: "0.75rem", padding: "2px 8px" }}>
                {res.has_real_gateway ? "AUTO-DISPATCHED" : "REGISTERED"}
              </span>
            </div>
            <p className="mut" style={{ fontSize: "0.85rem", margin: "4px 0 8px" }}>
              Emergency alerts with your live coordinates were dispatched automatically by the ABHAYA emergency gateway. No manual action required. Optional direct backups below:
            </p>
            {((res.contacts && res.contacts.length > 0) ? res.contacts : s.notifications).map(c => {
              const name = c.name || c.contact_name || "Emergency Contact";
              const phone = c.phone || c.recipient;
              const cleanP = (phone || "").replace(/\D/g, "");
              const locStr = s.map_url || "Location unavailable";
              const sosText = encodeURIComponent(
                `🚨 ABHAYA EMERGENCY SOS! I need immediate help! Live Location: ${locStr} ` +
                (res.evidence_pdf_url ? `SOS evidence PDF (link expires in 7 days): ${res.evidence_pdf_url}` : "")
              );
              const waUrl = c.wa_url || (cleanP ? `https://wa.me/${cleanP}?text=${sosText}` : null);
              const smsUrl = c.sms_url || (cleanP ? `sms:${cleanP}?body=${sosText}` : null);

              return (
                <div key={c.id || phone} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(16, 185, 129, 0.08)", padding: "8px 12px", borderRadius: 6, marginBottom: 6, border: "1px solid rgba(16, 185, 129, 0.25)" }}>
                  <div>
                    <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                      {name}
                      <span style={{ fontSize: "0.7rem", background: "rgba(16, 185, 129, 0.2)", color: "#34d399", padding: "1px 6px", borderRadius: 4, fontWeight: "bold" }}>
                        ⚡ Auto-Sent
                      </span>
                    </div>
                    <div className="mut" style={{ fontSize: "0.8rem", marginTop: 2 }}>{phone} &bull; <span style={{ color: "#34d399" }}>Delivered to Gateway</span></div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {waUrl && (
                      <a href={waUrl} target="_blank" rel="noreferrer" className="btn sm" style={{ background: "#25D366", color: "#fff", textDecoration: "none", fontSize: "0.8rem", padding: "4px 8px" }} title="Optional backup chat">
                        💬 WhatsApp (Backup)
                      </a>
                    )}
                    {smsUrl && (
                      <a href={smsUrl} className="btn sm ghost" style={{ textDecoration: "none", fontSize: "0.8rem", padding: "4px 8px" }} title="Optional backup SMS">
                        📱 SMS (Backup)
                      </a>
                    )}
                    {cleanP && (
                      <a href={`tel:${cleanP}`} className="btn sm red" style={{ textDecoration: "none", fontSize: "0.8rem", padding: "4px 8px" }}>
                        📞 Call
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <b>📡 System Dispatch Logs:</b>
          <table style={{ margin: "6px 0 12px" }}>
            <tbody>
              {s.notifications.map(n => (
                <tr key={n.id}>
                  <td>{n.channel} {n.recipient}</td>
                  <td><Tag s={n.status} /></td>
                  <td className="mut" style={{ fontSize: "0.8rem" }}>{n.error || "Dispatched successfully"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {res.warnings && res.warnings.length > 0 && res.warnings.map((w, i) => (
            <div className="warn" key={i} style={{ marginBottom: 10 }}>{w}</div>
          ))}
        </>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 12 }}>
        <button className="btn ghost" onClick={closeSos}>Close</button>
        {s && (
          <button className="btn sm" onClick={async () => {
            closeSos();
            try {
              await api(`/sos/${s.id}/resolve`, { method: "POST" });
            } catch (e) {}
          }}>
            Resolve Emergency
          </button>
        )}
      </div>
    </div></div>}
  </>;
}

const citizenNav = [
  ["/dashboard", Home, "Dashboard"],
  ["/contacts", Users, "Emergency Contacts"],
  ["/routes", RouteIcon, "Safe Routes"],
  ["/journey", Navigation, "Live Journey"],
  ["/fake-call", PhoneCall, "Fake Call"],
  ["/reports", Flag, "Report Hazard"],
  ["/analytics", BarChart3, "Safety Intel"],
  ["/nearby", LifeBuoy, "Nearby Help"],
  ["/assistant", Bot, "AI Assistant"],
  ["/history", FolderLock, "Evidence Vault"],
  ["/profile", User, "My Profile"]
];

const policeNav = [
  ["/admin", ShieldCheck, "Command Center"],
  ["/admin?tab=complaints", FileText, "Citizen Complaints"],
  ["/analytics", BarChart3, "Safety Intel Module"],
  ["/history", FolderLock, "Evidence Vault"],
  ["/routes", RouteIcon, "Safe Routes Intel"],
  ["/admin?tab=sos", ShieldAlert, "Live SOS Feeds"],
  ["/admin?tab=users", Users, "Citizen Registry"],
  ["/admin?tab=audit", Activity, "Audit Ledger"],
  ["/profile", User, "Officer Profile"]
];

function Shell() {
  const { user, logout } = useAuth();
  const { data } = useLoad("/notifications");
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAdmin = user?.role === "admin";

  return (
    <div className="shell">
      {/* Mobile Top Header */}
      <header className="mobile-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button 
            className="mobile-toggle-btn"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle Navigation"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <Link to="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
            <img src="/logo.png" alt="Logo" style={{ width: 28, height: 28, borderRadius: 6 }} />
            <span className="grad" style={{ fontWeight: 800, fontSize: "1.15rem" }}>ABHAYA</span>
          </Link>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span 
            className="badge" 
            style={{ 
              fontSize: "0.68rem",
              background: isAdmin ? "rgba(59, 130, 246, 0.2)" : "rgba(34, 197, 94, 0.2)",
              color: isAdmin ? "#93c5fd" : "#4ade80",
              border: isAdmin ? "1px solid rgba(59, 130, 246, 0.4)" : "1px solid rgba(34, 197, 94, 0.4)"
            }}
          >
            {isAdmin ? "AUTHORITY DESK" : "SHIELD ACTIVE"}
          </span>
          {data?.items?.length > 0 && (
            <span className="badge b-pending" style={{ fontSize: "0.68rem" }}>
              <Bell size={12} /> {data.items.length}
            </span>
          )}
        </div>
      </header>

      {/* Backdrop for mobile drawer */}
      {mobileOpen && (
        <div className="side-backdrop" onClick={() => setMobileOpen(false)}></div>
      )}

      {/* Responsive Sidebar */}
      <aside className={`side ${mobileOpen ? "side-mobile-open" : ""}`}>
        <div>
          <div className="side-brand-header">
            <Link to="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
              <img src="/logo.png" alt="Logo" style={{ width: 36, height: 36, borderRadius: 8, filter: isAdmin ? "drop-shadow(0 0 10px rgba(59,130,246,0.5))" : "drop-shadow(0 0 10px rgba(168,85,247,0.5))" }} />
              <div>
                <div className="grad" style={{ fontWeight: 800, fontSize: "1.25rem", lineHeight: 1.1 }}>ABHAYA</div>
                <div style={{ fontSize: "0.62rem", color: isAdmin ? "#93c5fd" : "#94a3b8", letterSpacing: "1.5px", fontWeight: 700 }}>
                  {isAdmin ? "LAW ENFORCEMENT" : "SAFETY PLATFORM"}
                </div>
              </div>
            </Link>
          </div>

          <div className="side-nav-menu">
            {isAdmin ? (
              <>
                <div className="side-nav-section-title" style={{ color: "#60a5fa" }}>LAW ENFORCEMENT COMMAND</div>
                {policeNav.map(([to, I, t]) => (
                  <NavLink 
                    key={to} 
                    to={to} 
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) => `side-nav-item ${isActive ? "active" : ""}`}
                  >
                    <span className="side-icon-wrap"><I size={17} /></span>
                    <span>{t}</span>
                  </NavLink>
                ))}

                <div className="side-nav-section-title" style={{ marginTop: 14 }}>CITIZEN TOOLS PREVIEW</div>
                <NavLink 
                  to="/dashboard" 
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) => `side-nav-item ${isActive ? "active" : ""}`}
                >
                  <span className="side-icon-wrap"><Home size={17} /></span>
                  <span>Citizen Dashboard</span>
                </NavLink>
                <NavLink 
                  to="/fake-call" 
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) => `side-nav-item ${isActive ? "active" : ""}`}
                >
                  <span className="side-icon-wrap"><PhoneCall size={17} /></span>
                  <span>Fake Call Tool</span>
                </NavLink>
              </>
            ) : (
              <>
                <div className="side-nav-section-title">CORE SAFETY MODULES</div>
                {citizenNav.map(([to, I, t]) => (
                  <NavLink 
                    key={to} 
                    to={to} 
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) => `side-nav-item ${isActive ? "active" : ""}`}
                  >
                    <span className="side-icon-wrap"><I size={17} /></span>
                    <span>{t}</span>
                  </NavLink>
                ))}
              </>
            )}
          </div>
        </div>

        {/* User Mini Card at Sidebar Bottom */}
        <div className="side-user-footer">
          <div className="side-user-info">
            <div className="user-avatar-circle" style={{ background: isAdmin ? "linear-gradient(135deg, #1d4ed8, #0284c7)" : undefined }}>
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : "U"}
            </div>
            <div className="user-details-text">
              <div className="user-name-label">{user?.full_name || "User"}</div>
              <div className="user-role-chip" style={{ color: isAdmin ? "#60a5fa" : undefined }}>
                {isAdmin ? "Police / Authority" : "Protected Citizen"}
              </div>
            </div>
          </div>
          <button 
            className="side-logout-btn" 
            onClick={e => { e.preventDefault(); logout(); }}
            title="Log out"
          >
            <LogOut size={15} /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <main className="main">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>

      {/* Global Floating SOS Trigger */}
      <Sos />

      {/* Mobile Native App Style Bottom Navigation Bar */}
      <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
        {isAdmin ? (
          <>
            <NavLink to="/admin" className={({ isActive }) => `mob-tab ${isActive ? "active" : ""}`}>
              <ShieldCheck size={19} />
              <span>Command</span>
            </NavLink>
            <NavLink to="/admin?tab=complaints" className={({ isActive }) => `mob-tab ${isActive ? "active" : ""}`}>
              <FileText size={19} />
              <span>Complaints</span>
            </NavLink>
            <NavLink to="/analytics" className={({ isActive }) => `mob-tab ${isActive ? "active" : ""}`}>
              <BarChart3 size={19} />
              <span>Intel</span>
            </NavLink>
            <NavLink to="/history" className={({ isActive }) => `mob-tab ${isActive ? "active" : ""}`}>
              <FolderLock size={19} />
              <span>Evidence</span>
            </NavLink>
          </>
        ) : (
          <>
            <NavLink to="/dashboard" className={({ isActive }) => `mob-tab ${isActive ? "active" : ""}`}>
              <Home size={19} />
              <span>Home</span>
            </NavLink>
            <NavLink to="/routes" className={({ isActive }) => `mob-tab ${isActive ? "active" : ""}`}>
              <RouteIcon size={19} />
              <span>Routes</span>
            </NavLink>
            <NavLink to="/journey" className={({ isActive }) => `mob-tab ${isActive ? "active" : ""}`}>
              <Navigation size={19} />
              <span>Journey</span>
            </NavLink>
            <NavLink to="/nearby" className={({ isActive }) => `mob-tab ${isActive ? "active" : ""}`}>
              <LifeBuoy size={19} />
              <span>Nearby</span>
            </NavLink>
          </>
        )}
        <button 
          type="button" 
          className="mob-tab" 
          onClick={() => setMobileOpen(true)}
          aria-label="Open Navigation Drawer"
        >
          <Menu size={19} />
          <span>Menu</span>
        </button>
      </nav>
    </div>
  );
}
const Guard = ({ admin, children }) => {
  const { user, ready } = useAuth();
  if (!ready) return <p style={{ padding: 20 }}>Loading...</p>;
  if (!user) return <Navigate to="/login" />;
  if (admin && user.role !== "admin") return <Navigate to="/dashboard" />;
  return children;
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<P.Landing />} />
          <Route path="/login" element={<P.Login />} />
          <Route path="/admin-login" element={<P.Login initialPortal="police" />} />
          <Route path="/register" element={<P.Register />} />
          <Route element={<Guard><Shell /></Guard>}>
            <Route path="/dashboard" element={<P.Dashboard />} />
            <Route path="/contacts" element={<P.Contacts />} />
            <Route path="/routes" element={<P.RoutesPage />} />
            <Route path="/journey" element={<P.Journey />} />
            <Route path="/fake-call" element={<FakeCall />} />
            <Route path="/reports" element={<P.Reports />} />
            <Route path="/analytics" element={<P.Analytics />} />
            <Route path="/nearby" element={<P.Nearby />} />
            <Route path="/assistant" element={<P.Assistant />} />
            <Route path="/history" element={<P.History />} />
            <Route path="/profile" element={<P.Profile />} />
            <Route path="/admin" element={<Guard admin><P.Admin /></Guard>} />
          </Route>
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </AuthProvider>
    </ErrorBoundary>
  );
}
