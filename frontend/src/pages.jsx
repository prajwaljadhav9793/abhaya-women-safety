import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, CircleMarker, Polyline, Popup, useMap } from "react-leaflet";
import { Chart as C, CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Tooltip, Legend } from "chart.js";
import { Bar, Line, Doughnut } from "react-chartjs-2";
import { 
  Shield, MapPin, Bot, Flag, Navigation, Users, 
  PhoneCall, Phone, AlertTriangle, CheckCircle2, Lock, 
  ArrowRight, Sparkles, Activity, Zap, Compass, 
  Radio, ShieldAlert, ChevronRight, Menu, X, ExternalLink,
  ShieldCheck, FolderLock, LifeBuoy, BarChart3, LogIn, UserPlus, KeyRound,
  FileDown, Download, FileText
} from "lucide-react";
import { api, useLoad, download } from "./api.js";
import { useAuth, Tag } from "./context/AuthContext.jsx";
import SafeRouteIntelligence from "./SafeRouteIntelligence.jsx";
import LiveJourneyGuardian from "./LiveJourneyGuardian.jsx";
import SafetyIntelligenceDashboard from "./SafetyIntelligenceDashboard.jsx";
import NearbyHelp from "./NearbyHelp.jsx";
import AIAssistant from "./AIAssistant.jsx";
import ReportHazard from "./ReportHazard.jsx";
import FakeCallCard from "./components/fakecall/FakeCallCard.jsx";
import FakeCall from "./pages/FakeCall.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import AdminPage from "./pages/AdminPage.jsx";
export { FakeCall, ProfilePage, LoginPage, AdminPage };
C.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Tooltip, Legend);

const DEF = [16.705, 74.243];
const Fit = ({ pts }) => { const m = useMap(); useEffect(() => { if (pts?.length) m.fitBounds(pts, { padding: [30, 30], maxZoom: 16 }); }, [JSON.stringify(pts)]); return null; };
const Map = ({ children, pts, center = DEF }) => <MapContainer center={center} zoom={13} className="map"><TileLayer attribution="&copy; OpenStreetMap contributors" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />{pts && <Fit pts={pts} />}{children}</MapContainer>;
const getPos = () => new Promise((res, rej) => navigator.geolocation ? navigator.geolocation.getCurrentPosition(p => res([p.coords.latitude, p.coords.longitude]), () => rej(new Error("Location permission denied or unavailable. Enter a place manually.")), { timeout: 10000 }) : rej(new Error("Geolocation unsupported")));
const geocode = async q => { const r = await (await fetch("https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=in&q=" + encodeURIComponent(q))).json(); if (!r[0]) throw new Error("Indian place not found: " + q); return { pt: [+r[0].lat, +r[0].lon], label: r[0].display_name }; };
const km = m => (m / 1000).toFixed(1) + " km", mins = s => Math.round(s / 60) + " min";
const Err = ({ e }) => e ? <p className="err">{e}</p> : null;
const Field = ({ l, err, ...p }) => <div><label>{l}</label><input {...p} />{err && <div className="err">{err}</div>}</div>;

/* ---------- public ---------- */
export function Landing() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  const quickDemoLogin = async (id, pw) => {
    setDemoLoading(true);
    try {
      const d = await api("/auth/login", { method: "POST", body: { identifier: id, password: pw } });
      login(d.token, d.user);
    } catch (err) {
      navigate("/login");
    } finally {
      setDemoLoading(false);
    }
  };

  const features = [
    {
      icon: <ShieldAlert size={26} />,
      iconClass: "f-icon-red",
      tag: "EMERGENCY RESPONSE",
      title: "One-Tap Instant SOS",
      desc: "Instantly broadcast your live GPS coordinates to priority emergency contacts via automated SMS and WhatsApp messages without delay."
    },
    {
      icon: <Navigation size={26} />,
      iconClass: "f-icon-blue",
      tag: "REAL-TIME TRACKING",
      title: "Live Journey Guardian",
      desc: "Monitors your commute in real-time, automatically detecting sudden route deviations, unusual halts, and prompting timed safety check-ins."
    },
    {
      icon: <MapPin size={26} />,
      iconClass: "f-icon-purple",
      tag: "AI NAVIGATION",
      title: "Safe Route Intelligence",
      desc: "Multi-factor algorithm evaluating street lighting, police station proximity, and verified incident density to suggest the safest route."
    },
    {
      icon: <PhoneCall size={26} />,
      iconClass: "f-icon-green",
      tag: "DISCREET ESCAPE",
      title: "Fake Call Simulator",
      desc: "Simulate a convincing incoming call with customizable caller identity and voice prompts to safely exit uncomfortable situations."
    },
    {
      icon: <Users size={26} />,
      iconClass: "f-icon-blue",
      tag: "LOCAL AMENITIES",
      title: "Nearby Emergency Help",
      desc: "One-tap proximity search for verified 24/7 hospitals, police stations, late-night pharmacies, and women's crisis centres."
    },
    {
      icon: <Flag size={26} />,
      iconClass: "f-icon-amber",
      tag: "COMMUNITY SAFETY",
      title: "Crowdsourced Reports",
      desc: "Report unlit alleys, catcalling hotspots, or hazardous transit spots. Reports undergo review before community verification."
    },
    {
      icon: <Bot size={26} />,
      iconClass: "f-icon-pink",
      tag: "AI ADVISOR",
      title: "AI Safety Companion",
      desc: "24/7 intelligent assistant providing practical self-defense tips, safety strategies, and legal rights guidance under Indian law."
    },
    {
      icon: <Lock size={26} />,
      iconClass: "f-icon-purple",
      tag: "DATA PRIVACY",
      title: "Encrypted Evidence Vault",
      desc: "Securely store photos, incident notes, and audio recordings in a tamper-evident, encrypted personal history vault."
    }
  ];

  const steps = [
    {
      num: "01",
      title: "Create Your Circle",
      desc: "Sign up in 30 seconds and configure priority contacts with WhatsApp and SMS alerting enabled."
    },
    {
      num: "02",
      title: "Select Safe Routes",
      desc: "Compare safest, fastest, and shortest routes with transparent safety ratings before you leave."
    },
    {
      num: "03",
      title: "Activate Journey Guardian",
      desc: "Start a tracked trip with continuous deviation detection and automated safety check-in countdowns."
    },
    {
      num: "04",
      title: "Instant SOS Whenever Needed",
      desc: "One touch sends immediate distress alerts with live GPS tracking directly to your circle and emergency dispatch."
    }
  ];

  const helplines = [
    { num: "112", label: "National Emergency Helpline", sub: "Police, Fire & Ambulance" },
    { num: "1091", label: "Women Safety Helpline", sub: "24x7 Dedicated Support" },
    { num: "181", label: "Women in Distress Helpline", sub: "National Commission for Women" },
    { num: "1090", label: "Women Power Line", sub: "Anti-Stalking & Harassment" }
  ];

  return (
    <div className="landing-wrap">
      {/* Background ambient lighting */}
      <div className="ambient-glow ambient-glow-1"></div>
      <div className="ambient-glow ambient-glow-2"></div>
      <div className="ambient-glow ambient-glow-3"></div>

      {/* Glassmorphic Navbar */}
      <nav className="landing-nav-bar">
        <div className="nav-container">
          <Link to="/" className="brand-wrapper">
            <img src="/logo.png" alt="ABHAYA Logo" className="brand-logo-img" />
            <div className="brand-text-block">
              <span className="brand-title">ABHAYA</span>
              <span className="brand-subtitle-badge">WOMEN SAFETY INTEL</span>
            </div>
          </Link>

          <div className="nav-menu-links">
            <a href="#features" className="nav-link-item">Features</a>
            <a href="#how" className="nav-link-item">How It Works</a>
            <a href="#portal" className="nav-link-item">Login / Register</a>
            <a href="#helplines" className="nav-link-item">Helplines</a>
            <a href="#about" className="nav-link-item">About & Privacy</a>
          </div>

          <div className="nav-action-buttons">
            {user ? (
              <Link to={user.role === "admin" ? "/admin" : "/dashboard"} className="btn-nav-register">
                {user.role === "admin" ? "Police Console" : "Dashboard"} <ArrowRight size={14} />
              </Link>
            ) : (
              <>
                <Link to="/login" className="btn-nav-login" title="Login with email or phone">
                  <LogIn size={15} /> Citizen Login
                </Link>
                <Link to="/admin-login" className="btn-nav-login" style={{ borderColor: "rgba(59, 130, 246, 0.45)", color: "#93c5fd" }} title="Police & Authorities Portal">
                  <ShieldCheck size={15} /> Police Portal
                </Link>
                <Link to="/register" className="btn-nav-register" title="Create a new account">
                  <UserPlus size={15} /> Register Free
                </Link>
              </>
            )}
            <button 
              className="mobile-menu-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle Navigation"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        <div className={`mobile-nav-drawer ${mobileMenuOpen ? "open" : ""}`}>
          <a href="#features" className="nav-link-item" onClick={() => setMobileMenuOpen(false)}>Features</a>
          <a href="#how" className="nav-link-item" onClick={() => setMobileMenuOpen(false)}>How It Works</a>
          <a href="#portal" className="nav-link-item" onClick={() => setMobileMenuOpen(false)}>Login / Register Portal</a>
          <a href="#helplines" className="nav-link-item" onClick={() => setMobileMenuOpen(false)}>Helplines</a>
          <a href="#about" className="nav-link-item" onClick={() => setMobileMenuOpen(false)}>About & Privacy</a>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
            {user ? (
              <Link to={user.role === "admin" ? "/admin" : "/dashboard"} className="btn-nav-register" style={{ width: "100%", justifyContent: "center" }} onClick={() => setMobileMenuOpen(false)}>
                {user.role === "admin" ? "Police Console" : "Go to Dashboard"} <ArrowRight size={14} />
              </Link>
            ) : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, width: "100%" }}>
                  <Link to="/login" className="btn-nav-login" style={{ justifyContent: "center", padding: "10px 14px" }} onClick={() => setMobileMenuOpen(false)}>
                    <LogIn size={16} /> Citizen Login
                  </Link>
                  <Link to="/register" className="btn-nav-register" style={{ justifyContent: "center", padding: "10px 14px" }} onClick={() => setMobileMenuOpen(false)}>
                    <UserPlus size={16} /> Register
                  </Link>
                </div>
                <Link to="/admin-login" className="btn-nav-login" style={{ width: "100%", justifyContent: "center", padding: "10px 14px", borderColor: "rgba(59, 130, 246, 0.45)", color: "#93c5fd" }} onClick={() => setMobileMenuOpen(false)}>
                  <ShieldCheck size={16} /> Police &amp; Authority Portal
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="landing-hero-section">
        <div className="hero-two-col">
          <div className="hero-left-content">
            <div className="hero-status-pill">
              <span className="status-dot-pulse"></span>
              <span>24/7 Protection Active • Real-Time Safety Platform</span>
            </div>

            <h1 className="hero-main-title">
              Your Safety. Your Journey. <span className="hero-title-highlight">Your Power.</span>
            </h1>

            <p className="hero-description-text">
              ABHAYA is a proactive women’s safety ecosystem built to protect when seconds count. 
              Featuring automated multi-channel SOS alerts, AI-driven safe route navigation, 
              live journey deviation monitoring, and direct emergency responder access.
            </p>

            <div className="hero-cta-bar">
              <Link to={user ? "/dashboard" : "/register"} className="btn btn-hero-primary">
                <UserPlus size={18} /> {user ? "Go to Dashboard" : "Register Free"} <ArrowRight size={18} />
              </Link>
              {!user && (
                <Link to="/login" className="btn-hero-login">
                  <LogIn size={17} /> Login to Account
                </Link>
              )}
              <a href="#features" className="btn ghost btn-hero-secondary">
                Explore Features
              </a>
            </div>

            {/* Quick Demo & Fast Login Strip directly in Hero */}
            {!user && (
              <div className="hero-demo-strip">
                <div className="demo-strip-label">
                  <Sparkles size={14} color="#c084fc" />
                  <span>1-Click Test Access:</span>
                </div>
                <div className="demo-strip-buttons">
                  <button 
                    type="button" 
                    className="demo-pill-btn" 
                    onClick={() => quickDemoLogin("demo.user@abhaya.test", "Demo@12345")}
                    disabled={demoLoading}
                    title="Sign in instantly with Demo User account"
                  >
                    {demoLoading ? "..." : "👤 Demo User"}
                  </button>
                  <button 
                    type="button" 
                    className="demo-pill-btn admin" 
                    onClick={() => quickDemoLogin("demo.admin@abhaya.test", "Admin@12345")}
                    disabled={demoLoading}
                    title="Sign in instantly with Demo Admin account"
                  >
                    {demoLoading ? "..." : "🛡️ Demo Admin"}
                  </button>
                  <Link to="/login" style={{ color: "#38bdf8", fontSize: "0.8rem", fontWeight: 600, textDecoration: "none", marginLeft: 4 }}>
                    Login Page →
                  </Link>
                  <span style={{ color: "#475569" }}>•</span>
                  <Link to="/register" style={{ color: "#f472b6", fontSize: "0.8rem", fontWeight: 600, textDecoration: "none" }}>
                    Register Free →
                  </Link>
                </div>
              </div>
            )}

            <div style={{ marginTop: 14 }}>
              <a href="tel:112" className="emergency-quick-chip">
                <PhoneCall size={15} /> Emergency Dial: <b>112</b> (Govt Toll-Free)
              </a>
            </div>
          </div>

          <div className="hero-right-visual">
            <div className="hero-visual-card">
              <div className="hero-visual-header">
                <div>
                  <b style={{ color: "#fff", fontSize: "0.95rem" }}>ABHAYA ACTIVE GUARDIAN</b>
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Real-time Safety Matrix</div>
                </div>
                <span className="hero-live-badge">
                  <span className="status-dot-pulse"></span> SYSTEM LIVE
                </span>
              </div>

              <div className="hero-card-row">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Navigation size={17} color="#38bdf8" />
                  <span>Journey Guardian</span>
                </div>
                <span className="badge b-verified">Route Monitored</span>
              </div>

              <div className="hero-card-row">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <MapPin size={17} color="#c084fc" />
                  <span>Safe Route Rating</span>
                </div>
                <span style={{ color: "#34d399", fontWeight: 700, fontSize: "0.85rem" }}>98.4% Safe</span>
              </div>

              <div className="hero-card-row">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Users size={17} color="#34d399" />
                  <span>Emergency Circle</span>
                </div>
                <span style={{ color: "#cbd5e1", fontSize: "0.82rem" }}>3 Contacts Synced</span>
              </div>

              <div className="hero-card-row">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <PhoneCall size={17} color="#fbbf24" />
                  <span>Fake Call Simulator</span>
                </div>
                <span className="badge b-pending">Discreet Escape Ready</span>
              </div>

              <div className="hero-sos-trigger-banner">
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 16px rgba(239,68,68,0.7)", flexShrink: 0 }}>
                  <ShieldAlert size={22} color="#fff" />
                </div>
                <div>
                  <b style={{ color: "#fff", fontSize: "0.92rem", display: "block" }}>One-Tap SOS Protection</b>
                  <span style={{ fontSize: "0.78rem", color: "#fca5a5" }}>SMS & WhatsApp live coordinates broadcast</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Impact Metrics Bar */}
      <section className="trust-metrics-section">
        <div className="metrics-strip">
          <div className="metric-item">
            <div className="metric-number">&lt; 3s</div>
            <div className="metric-label">Rapid SOS Dispatch</div>
          </div>
          <div className="metric-item">
            <div className="metric-number">98%+</div>
            <div className="metric-label">Route Safety Accuracy</div>
          </div>
          <div className="metric-item">
            <div className="metric-number">100%</div>
            <div className="metric-label">Encrypted Private Vault</div>
          </div>
          <div className="metric-item">
            <div className="metric-number">24x7</div>
            <div className="metric-label">Emergency Helplines</div>
          </div>
        </div>
      </section>

      {/* Core Platform Features Grid */}
      <section id="features" className="features-section-wrap">
        <div className="section-header-block">
          <span className="section-pill-tag">PROACTIVE INTELLIGENCE</span>
          <h2 className="section-main-heading">Built to Protect Every Step of the Way</h2>
          <p className="section-subtext">
            ABHAYA integrates proactive navigation, rapid distress response, and verified local help 
            into a unified security shield.
          </p>
        </div>

        <div className="features-card-grid">
          {features.map((item, idx) => (
            <div className="premium-feature-card" key={idx}>
              <div className={`feature-icon-container ${item.iconClass}`}>
                {item.icon}
              </div>
              <div className="feature-tag-chip">{item.tag}</div>
              <h3 className="feature-card-heading">{item.title}</h3>
              <p className="feature-card-body">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how" className="how-it-works-section">
        <div className="section-header-block">
          <span className="section-pill-tag">EASY 4-STEP ONBOARDING</span>
          <h2 className="section-main-heading">How ABHAYA Works for You</h2>
          <p className="section-subtext">
            Simple setup, zero hassle. Gain full peace of mind whenever you step out.
          </p>
        </div>

        <div className="steps-timeline-grid">
          {steps.map((st, i) => (
            <div className="step-card" key={i}>
              <div className="step-number-bubble">{st.num}</div>
              <h3 className="step-title">{st.title}</h3>
              <p className="step-text">{st.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Dedicated Portal Access Section (Login & Register Highlight) */}
      <section id="portal" className="portal-access-section">
        <div style={{ textAlign: "center", maxWidth: 700, margin: "0 auto 36px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 99, background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.35)", color: "#c084fc", fontSize: "0.78rem", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>
            <KeyRound size={14} /> INSTANT PORTAL ACCESS
          </div>
          <h2 style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.5rem)", fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", marginBottom: 10 }}>
            Login or Register for <span className="grad">ABHAYA Safety</span>
          </h2>
          <p className="mut" style={{ fontSize: "1rem", lineHeight: 1.6 }}>
            Ready to secure your journeys? Choose an option below to access your dashboard or start testing with 1-click demo accounts.
          </p>
        </div>

        <div className="portal-cards-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
          {/* Card 1: Register */}
          <div className="portal-access-card register-card">
            <div>
              <div className="portal-card-header">
                <div className="portal-icon-box register-glow">
                  <UserPlus size={26} />
                </div>
                <span className="badge b-verified">NEW MEMBERS</span>
              </div>
              <h3 className="portal-card-title">Create Citizen Account</h3>
              <p className="portal-card-desc">
                Setup your safety profile in under 30 seconds. Connect your trusted emergency contacts circle with automatic SMS & WhatsApp coordinate broadcasting.
              </p>
              <ul className="portal-card-benefits">
                <li><CheckCircle2 size={16} color="#34d399" /> 100% Free & Confidential protection</li>
                <li><CheckCircle2 size={16} color="#34d399" /> Live GPS journey monitoring & deviation guards</li>
                <li><CheckCircle2 size={16} color="#34d399" /> Safe route intelligence with Kolhapur hazard map</li>
                <li><CheckCircle2 size={16} color="#34d399" /> Discreet fake call simulator for uncomfortable spots</li>
              </ul>
            </div>
            <Link to="/register" className="btn btn-hero-primary" style={{ width: "100%", justifyContent: "center" }}>
              <UserPlus size={18} /> Register Free Account <ArrowRight size={18} />
            </Link>
          </div>

          {/* Card 2: Citizen Login */}
          <div className="portal-access-card login-card">
            <div>
              <div className="portal-card-header">
                <div className="portal-icon-box login-glow">
                  <LogIn size={26} />
                </div>
                <span className="badge b-pending">CITIZEN PORTAL</span>
              </div>
              <h3 className="portal-card-title">Citizen Safety Login</h3>
              <p className="portal-card-desc">
                Access your personal safety dashboard, manage guardian circles, view verified safe routes, and track commutes.
              </p>
              <div className="portal-demo-box">
                <div style={{ fontSize: "0.76rem", fontWeight: 700, color: "#c084fc", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  <Sparkles size={13} /> 1-Click Citizen Demo Login:
                </div>
                <button
                  type="button"
                  className="btn ghost sm"
                  style={{ width: "100%", justifyContent: "center", borderColor: "rgba(168,85,247,0.4)" }}
                  onClick={() => quickDemoLogin("demo.user@abhaya.test", "Demo@12345")}
                  disabled={demoLoading}
                >
                  👤 Sign in as Demo Citizen
                </button>
              </div>
            </div>
            <Link to="/login" className="btn ghost" style={{ width: "100%", justifyContent: "center", borderColor: "rgba(168,85,247,0.5)", color: "#fff" }}>
              <LogIn size={18} /> Citizen Sign In <ArrowRight size={18} />
            </Link>
          </div>

          {/* Card 3: Police & Law Enforcement Command Gateway */}
          <div className="portal-access-card" style={{ borderColor: "rgba(59, 130, 246, 0.4)", background: "rgba(15, 23, 42, 0.7)" }}>
            <div>
              <div className="portal-card-header">
                <div className="portal-icon-box" style={{ background: "linear-gradient(135deg, rgba(37, 99, 235, 0.3), rgba(2, 132, 199, 0.3))", border: "1px solid rgba(59, 130, 246, 0.5)", color: "#60a5fa" }}>
                  <ShieldCheck size={26} />
                </div>
                <span className="badge" style={{ background: "rgba(59, 130, 246, 0.2)", color: "#93c5fd", border: "1px solid rgba(59, 130, 246, 0.4)" }}>AUTHORITY ACCESS</span>
              </div>
              <h3 className="portal-card-title">Police &amp; Authority Portal</h3>
              <p className="portal-card-desc">
                Dedicated command center for jurisdictional police, emergency dispatchers & higher authorities to manage complaints, review evidence & monitor live SOS feeds.
              </p>
              <div className="portal-demo-box" style={{ background: "rgba(30, 58, 138, 0.25)", borderColor: "rgba(59, 130, 246, 0.35)" }}>
                <div style={{ fontSize: "0.76rem", fontWeight: 700, color: "#93c5fd", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  <ShieldCheck size={13} /> 1-Click Police Command Login:
                </div>
                <button
                  type="button"
                  className="btn ghost sm"
                  style={{ width: "100%", justifyContent: "center", borderColor: "rgba(59, 130, 246, 0.5)", color: "#93c5fd" }}
                  onClick={() => quickDemoLogin("demo.admin@abhaya.test", "Admin@12345")}
                  disabled={demoLoading}
                >
                  👮 Sign in as Police Officer
                </button>
              </div>
            </div>
            <Link to="/admin-login" className="btn" style={{ width: "100%", justifyContent: "center", background: "linear-gradient(135deg, #1d4ed8, #0284c7)", color: "#fff", border: "none" }}>
              <ShieldCheck size={18} /> Police Command Gateway <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* Helplines Emergency Ribbon */}
      <section id="helplines" className="helpline-section">
        <div className="helpline-box">
          <div style={{ textAlign: "center", maxWidth: 650, margin: "0 auto" }}>
            <span style={{ color: "#f87171", fontSize: "0.78rem", fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" }}>
              GOVERNMENT OF INDIA OFFICIAL EMERGENCY CONTACTS
            </span>
            <h2 style={{ fontSize: "1.9rem", color: "#fff", marginTop: 6, marginBottom: 8 }}>
              24x7 Emergency Helplines Directory
            </h2>
            <p className="mut" style={{ color: "#fecaca" }}>
              Toll-free emergency numbers accessible from any phone even with zero balance or locked screen:
            </p>
          </div>

          <div className="helpline-cards-row">
            {helplines.map((h, i) => (
              <a href={`tel:${h.num}`} className="helpline-item-card" key={i} title={`Dial ${h.num}`}>
                <div>
                  <div className="helpline-dial-number">{h.num}</div>
                  <div className="helpline-service-name">{h.label}</div>
                  <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{h.sub}</div>
                </div>
                <Phone size={18} color="#fca5a5" />
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Privacy Pledge Banner */}
      <section id="about" className="privacy-pledge-banner">
        <div className="privacy-banner-inner">
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(139,92,246,0.18)", border: "1px solid var(--bd)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Lock size={26} color="#c084fc" />
          </div>
          <div>
            <h3 style={{ fontSize: "1.2rem", color: "#fff", marginBottom: 6 }}>
              Privacy First & Responsible Engineering
            </h3>
            <p className="mut" style={{ margin: 0, fontSize: "0.88rem", lineHeight: 1.6 }}>
              Your location is shared strictly with your designated emergency contacts only during an active journey or SOS trigger, with an always-visible stop control. Evidence logs remain encrypted and confidential. ABHAYA is built as an academic mini-project to empower women safety intelligence and complement official emergency services (India: 112).
            </p>
          </div>
        </div>
      </section>

      {/* Premium Footer */}
      <footer className="landing-footer">
        <div className="footer-inner-container">
          <div className="footer-top-grid">
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <img src="/logo.png" alt="ABHAYA Logo" style={{ width: 34, height: 34, borderRadius: 6 }} />
                <span style={{ fontSize: "1.3rem", fontWeight: 800, color: "#fff" }}>ABHAYA</span>
              </div>
              <p className="mut" style={{ maxWidth: 380, fontSize: "0.88rem", lineHeight: 1.6 }}>
                Because Every Woman Deserves to Feel Safe, Everywhere. A modern, proactive safety intelligence ecosystem combining rapid SOS, AI navigation, and community resilience.
              </p>
            </div>

            <div>
              <div className="footer-column-title">Platform Features</div>
              <div className="footer-link-list">
                <a href="#features">One-Tap SOS Dispatch</a>
                <a href="#features">Live Journey Guardian</a>
                <a href="#features">Safe Route Intelligence</a>
                <a href="#features">Fake Call Simulator</a>
                <a href="#features">Nearby Help Radius</a>
              </div>
            </div>

            <div>
              <div className="footer-column-title">Quick Links</div>
              <div className="footer-link-list">
                <Link to="/login">User Login</Link>
                <Link to="/register">Create Account</Link>
                <a href="#helplines">Emergency Helplines (112)</a>
                <a href="#about">Privacy Pledge</a>
              </div>
            </div>
          </div>

          <div className="footer-bottom-bar">
            <span>© 2026 ABHAYA — Women Safety Intelligence Platform. College Mini-Project.</span>
            <span>Protect • Prevent • Empower</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
function useForm(init) { const [v, set] = useState(init); return [v, e => set({ ...v, [e.target.name]: e.target.value }), set]; }
export const Login = LoginPage;

export function Register() {
  const { login } = useAuth();
  const nv = useNavigate(), [v, ch] = useForm({ full_name: "", email: "", phone: "", password: "", confirm_password: "" }), [e, setE] = useState(""), [f, setF] = useState({}), [busy, setBusy] = useState(false);
  return (
    <div className="main" style={{ maxWidth: 440 }}>
      <div style={{ marginBottom: 16 }}>
        <Link to="/" className="mut" style={{ textDecoration: "none" }}>&larr; Back to Landing Page</Link>
      </div>
      <h2 className="grad">Create Citizen Account</h2>
      <p className="mut" style={{ marginTop: -8, marginBottom: 18, fontSize: "0.88rem" }}>
        Instant registration with encrypted safety shield &amp; 24/7 SOS monitoring.
      </p>
      <form
        className="card"
        onSubmit={async ev => {
          ev.preventDefault();
          setE("");
          setBusy(true);
          try {
            const res = await api("/auth/register", {
              method: "POST",
              body: {
                full_name: (v.full_name || "").trim(),
                email: (v.email || "").trim(),
                phone: (v.phone || "").trim(),
                password: v.password || "",
                confirm_password: v.confirm_password || ""
              }
            });
            if (res.token && res.user) {
              login(res.token, res.user);
              nv("/dashboard");
            } else {
              nv("/login");
            }
          } catch (x) {
            setE(x.message || "Registration failed. Please check the entered fields.");
            setF(x.fields || {});
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field l="Full name" name="full_name" onChange={ch} err={f.full_name} placeholder="e.g. Ananya Sharma" required />
        <Field l="Email" name="email" type="email" onChange={ch} err={f.email} placeholder="ananya@example.com" required />
        <Field l="Mobile number (10 digits)" name="phone" onChange={ch} err={f.phone} placeholder="9876543210" required />
        <Field l="Password" name="password" type="password" onChange={ch} err={f.password} placeholder="Min 8 letters & numbers" required />
        <Field l="Confirm password" name="confirm_password" type="password" onChange={ch} err={f.confirm_password} placeholder="Re-type password" required />
        <Err e={e} />
        <button className="btn" disabled={busy} style={{ width: "100%", justifyContent: "center", marginTop: 8 }}>
          {busy ? "Creating Account..." : "Create Account & Enter Safety Hub →"}
        </button>
        <p className="mut" style={{ textAlign: "center", marginTop: 14 }}>
          Already have an account? <Link to="/login" style={{ color: "var(--brand, #a855f7)", fontWeight: 600 }}>Login here</Link>
        </p>
      </form>
    </div>
  );
}

/* ---------- dashboard / profile ---------- */
export function Dashboard() {
  const { user } = useAuth();
  const st = useLoad("/status");
  const sos = useLoad("/sos");
  const cs = useLoad("/contacts");

  const contactsList = cs.data?.contacts || [];
  const sosEvents = sos.data?.items || [];
  const hasContacts = contactsList.length > 0;

  // Time of day greeting
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = user?.full_name ? user.full_name.split(" ")[0] : "User";
  const todayFormatted = new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });

  const featureTiles = [
    {
      to: "/journey",
      title: "Live Journey Guardian",
      desc: "Live commute tracker with automatic route deviation and inactivity detection.",
      icon: <Navigation size={22} />,
      iconClass: "f-icon-blue",
      badge: "LIVE TRACKER"
    },
    {
      to: "/routes",
      title: "Safe Route Intelligence",
      desc: "Calculate safest routes with lighting analysis and incident density ratings.",
      icon: <MapPin size={22} />,
      iconClass: "f-icon-purple",
      badge: "AI NAVIGATION"
    },
    {
      to: "/fake-call",
      title: "Fake Call Simulator",
      desc: "Trigger a realistic simulated call with scheduled countdown to exit unsafe situations.",
      icon: <PhoneCall size={22} />,
      iconClass: "f-icon-green",
      badge: "DISCREET ESCAPE"
    },
    {
      to: "/contacts",
      title: "Emergency Contacts",
      desc: "Configure trusted guardians and priority order for instant SMS & WhatsApp alerts.",
      icon: <Users size={22} />,
      iconClass: "f-icon-red",
      badge: `${contactsList.length} SYNCED`
    },
    {
      to: "/nearby",
      title: "Nearby Emergency Help",
      desc: "Locate 24/7 verified police stations, hospitals, and crisis centers within radius.",
      icon: <LifeBuoy size={22} />,
      iconClass: "f-icon-blue",
      badge: "VERIFIED"
    },
    {
      to: "/reports",
      title: "Report Hazard / Incident",
      desc: "Crowdsource alerts on poorly lit roads, harassment hotspots, or unsafe transit.",
      icon: <Flag size={22} />,
      iconClass: "f-icon-amber",
      badge: "COMMUNITY"
    },
    {
      to: "/assistant",
      title: "AI Safety Assistant",
      desc: "Chat with 24/7 AI companion for legal rights in India, de-escalation & self-defense.",
      icon: <Bot size={22} />,
      iconClass: "f-icon-pink",
      badge: "AI COMPANION"
    },
    {
      to: "/analytics",
      title: "Safety Intelligence",
      desc: "Visual charts, heatmap analytics, danger zone maps, and incident review.",
      icon: <BarChart3 size={22} />,
      iconClass: "f-icon-purple",
      badge: "ANALYTICS"
    },
    {
      to: "/history",
      title: "History & Evidence Vault",
      desc: "Encrypted records of previous journeys, distress events, and stored evidence.",
      icon: <FolderLock size={22} />,
      iconClass: "f-icon-blue",
      badge: "ENCRYPTED"
    }
  ];

  return (
    <div className="dash-container">
      {/* Top Greeting Header */}
      <div className="dash-header-banner">
        <div>
          <h1 className="dash-greeting-h1">
            {timeGreeting}, <span className="grad">{firstName}</span> 👋
          </h1>
          <div className="dash-date-text">
            <span>{todayFormatted}</span>
            <span>•</span>
            <span className="dash-status-badge">
              <span className="status-dot-pulse"></span>
              Protection Armed & Ready
            </span>
          </div>
        </div>

        <div className="dash-header-actions">
          <Link to="/fake-call" className="btn ghost sm" style={{ borderRadius: 10 }}>
            <PhoneCall size={14} color="#34d399" /> Fake Call
          </Link>
          <a href="tel:112" className="emergency-quick-chip" style={{ padding: "6px 12px", fontSize: "0.82rem" }}>
            <Phone size={13} /> Dial 112
          </a>
        </div>
      </div>

      {/* Safety Readiness Banner */}
      <div className={`dash-readiness-banner ${!hasContacts ? "warning" : ""}`}>
        <div className="readiness-content">
          <div className="readiness-icon-box">
            {hasContacts ? <ShieldCheck size={28} /> : <AlertTriangle size={28} />}
          </div>
          <div>
            <div className="readiness-title">
              {hasContacts ? "Safety Shield Operational" : "Action Recommended: Set Up Emergency Circle"}
            </div>
            <p className="readiness-desc">
              {hasContacts
                ? "Your trusted guardians are configured. In an emergency, tapping the SOS button will immediately broadcast your real-time GPS location via SMS and WhatsApp."
                : "You have not added any emergency contacts yet. Add your trusted friends or family members now so SOS alerts can reach them in real-time."}
            </p>
            <div className="readiness-pills-row">
              <span className="readiness-pill">
                <Users size={12} color={hasContacts ? "#34d399" : "#fbbf24"} />
                {contactsList.length} Contacts Synced
              </span>
              <span className="readiness-pill">
                <Navigation size={12} color="#38bdf8" />
                Live GPS: {user?.location_sharing_enabled ? "Enabled" : "Active for SOS"}
              </span>
              <span className="readiness-pill">
                <Zap size={12} color="#f472b6" />
                Dispatch Mode: Real-time Multi-channel
              </span>
            </div>
          </div>
        </div>

        <div>
          {!hasContacts ? (
            <Link to="/contacts" className="btn sm" style={{ background: "linear-gradient(135deg, #d97706, #dc2626)" }}>
              + Add Contact
            </Link>
          ) : (
            <Link to="/contacts" className="btn ghost sm">
              Manage Circle →
            </Link>
          )}
        </div>
      </div>

      {/* Quick Metrics Strip */}
      <div className="dash-stats-row">
        <Link to="/contacts" className="dash-stat-card">
          <div className="stat-card-top">
            <span className="stat-label-text">Trusted Circle</span>
            <div className="stat-icon-wrapper f-icon-red">
              <Users size={18} />
            </div>
          </div>
          <div>
            <div className="stat-value-big">{contactsList.length}</div>
            <div className="stat-label-text">Priority Contacts</div>
          </div>
          <span className="stat-card-link-text">
            View Circle <ChevronRight size={14} />
          </span>
        </Link>

        <Link to="/journey" className="dash-stat-card">
          <div className="stat-card-top">
            <span className="stat-label-text">Journey Guardian</span>
            <div className="stat-icon-wrapper f-icon-blue">
              <Navigation size={18} />
            </div>
          </div>
          <div>
            <div className="stat-value-big" style={{ fontSize: "1.3rem" }}>Ready</div>
            <div className="stat-label-text">Deviation Guard Armed</div>
          </div>
          <span className="stat-card-link-text">
            Start Commute <ChevronRight size={14} />
          </span>
        </Link>

        <Link to="/routes" className="dash-stat-card">
          <div className="stat-card-top">
            <span className="stat-label-text">Route Intelligence</span>
            <div className="stat-icon-wrapper f-icon-purple">
              <MapPin size={18} />
            </div>
          </div>
          <div>
            <div className="stat-value-big" style={{ fontSize: "1.3rem", color: "#34d399" }}>98% Safe</div>
            <div className="stat-label-text">Kolhapur Safety Zone</div>
          </div>
          <span className="stat-card-link-text">
            Find Safest Path <ChevronRight size={14} />
          </span>
        </Link>

        <Link to="/fake-call" className="dash-stat-card">
          <div className="stat-card-top">
            <span className="stat-label-text">Discreet Escape</span>
            <div className="stat-icon-wrapper f-icon-green">
              <PhoneCall size={18} />
            </div>
          </div>
          <div>
            <div className="stat-value-big" style={{ fontSize: "1.3rem" }}>1-Tap</div>
            <div className="stat-label-text">Simulated Incoming Call</div>
          </div>
          <span className="stat-card-link-text">
            Trigger Simulator <ChevronRight size={14} />
          </span>
        </Link>
      </div>

      {/* Safety Modules Grid Hub */}
      <div>
        <div className="dash-hub-header">
          <div>
            <h2 className="dash-hub-title">Safety Modules & Intelligence Hub</h2>
            <p className="dash-hub-subtitle">Access live tracking, AI analysis, nearby shelters, and community alerts</p>
          </div>
        </div>

        <div className="dash-feature-tiles-grid" style={{ marginTop: 16 }}>
          {featureTiles.map((t, idx) => (
            <Link to={t.to} key={idx} className="dash-feature-tile">
              <div>
                <div className="tile-top-row">
                  <div className={`tile-icon-box ${t.iconClass}`}>
                    {t.icon}
                  </div>
                  <span className="tile-badge-pill">{t.badge}</span>
                </div>
                <div className="tile-title">
                  <span>{t.title}</span>
                  <ChevronRight size={16} color="#64748b" />
                </div>
                <p className="tile-desc">{t.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Bottom Insights (2 Columns: Recent SOS Events & Platform Integrations) */}
      <div className="dash-bottom-two-col">
        {/* Left: Recent Activity */}
        <div className="dash-panel-card">
          <h3 className="dash-panel-title">
            <ShieldAlert size={18} color="#f87171" />
            Recent Emergency Alerts & Activity
          </h3>

          {sosEvents.length > 0 ? (
            <div>
              {sosEvents.slice(0, 4).map(e => (
                <div key={e.id} className="sos-event-item">
                  <div>
                    <div style={{ fontWeight: 600, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
                      <span>SOS Event #{e.id}</span>
                      <Tag s={e.status} />
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: 2 }}>
                      {new Date(e.created_at + "Z").toLocaleString()} • Mode: {e.mode || "standard"}
                    </div>
                  </div>
                  <Link to="/history" style={{ fontSize: "0.78rem", color: "#c084fc" }}>
                    Details →
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: "26px 16px", textAlign: "center", background: "rgba(255,255,255,0.02)", borderRadius: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(16,185,129,0.15)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
                <CheckCircle2 size={22} color="#34d399" />
              </div>
              <b style={{ color: "#fff", display: "block" }}>No Emergency Alerts Recorded</b>
              <p className="mut" style={{ fontSize: "0.82rem", margin: "4px 0 0" }}>
                Your safety status is clear. All emergency systems are on standby.
              </p>
            </div>
          )}
        </div>

        {/* Right: Network & Integrations */}
        <div className="dash-panel-card">
          <h3 className="dash-panel-title">
            <Activity size={18} color="#38bdf8" />
            System Integrations & Helplines
          </h3>

          <div style={{ marginBottom: 16 }}>
            <div className="integration-health-row">
              <span style={{ color: "#cbd5e1" }}>SMS & WhatsApp Gateway</span>
              <span className="badge b-verified">Operational</span>
            </div>
            <div className="integration-health-row">
              <span style={{ color: "#cbd5e1" }}>Safe Routing Intelligence</span>
              <span className="badge b-verified">Active</span>
            </div>
            <div className="integration-health-row">
              <span style={{ color: "#cbd5e1" }}>AI Safety Assistant (Gemini)</span>
              <span className="badge b-verified">Connected</span>
            </div>
            <div className="integration-health-row">
              <span style={{ color: "#cbd5e1" }}>Nearby Verified Places</span>
              <span className="badge b-verified">Kolhapur Live</span>
            </div>
          </div>

          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 14 }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: 1, color: "#94a3b8", textTransform: "uppercase", marginBottom: 8 }}>
              Toll-Free Emergency Quick Dial
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <a href="tel:112" className="emergency-quick-chip" style={{ justifyContent: "center" }}>
                <PhoneCall size={13} /> 112 (All-in-One)
              </a>
              <a href="tel:1091" className="emergency-quick-chip" style={{ justifyContent: "center" }}>
                <Phone size={13} /> 1091 (Women)
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
export const Profile = ProfilePage;


/* ---------- contacts ---------- */
export function Contacts() {
  const { data, reload } = useLoad("/contacts"), [v, ch, set] = useForm({ name: "", relationship: "", phone: "", email: "", priority: 1 }), [e, setE] = useState(""), [f, setF] = useState({});
  const save = async ev => { ev.preventDefault(); try { await api("/contacts", { method: "POST", body: v }); set({ name: "", relationship: "", phone: "", email: "", priority: 1 }); setE(""); setF({}); reload(); } catch (x) { setE(x.message); setF(x.fields || {}); } };
  const upd = (c, b) => api("/contacts/" + c.id, { method: "PUT", body: b }).then(reload);
  return <><h2>Emergency contacts</h2><form className="card" onSubmit={save}><div className="grid"><Field l="Name" name="name" value={v.name} onChange={ch} err={f.name} /><Field l="Phone" name="phone" value={v.phone} onChange={ch} err={f.phone} /><Field l="Relationship" name="relationship" value={v.relationship} onChange={ch} /><Field l="Email (optional)" name="email" value={v.email} onChange={ch} err={f.email} /><Field l="Priority (1 = first)" name="priority" type="number" value={v.priority} onChange={ch} /></div><Err e={e} /><button className="btn">Add contact</button></form>
    {(data?.contacts || []).map(c => <div className="card row" key={c.id} style={{ justifyContent: "space-between" }}><div><b>{c.name}</b> <span className="mut">({c.relationship || "contact"}) {c.phone} - priority {c.priority}</span></div>
      <div className="row"><label><input type="checkbox" style={{ width: "auto" }} checked={c.notify_on_sos} onChange={x => upd(c, { notify_on_sos: x.target.checked })} /> SOS alerts</label>
        <label><input type="checkbox" style={{ width: "auto" }} checked={c.notify_on_journey} onChange={x => upd(c, { notify_on_journey: x.target.checked })} /> Journey</label>
        <button className="btn red sm" onClick={() => confirm("Delete this contact?") && api("/contacts/" + c.id, { method: "DELETE" }).then(reload)}>Delete</button></div></div>)}</>;
}

/* ---------- routes ---------- */
export const RoutesPage = SafeRouteIntelligence;

/* ---------- journey ---------- */
export const Journey = LiveJourneyGuardian;

/* ---------- reports ---------- */
export const Reports = ReportHazard;


/* ---------- analytics ---------- */
export function Analytics() {
  return <SafetyIntelligenceDashboard />;
}

/* ---------- nearby ---------- */
export function Nearby() {
  return <NearbyHelp />;
}

/* ---------- AI ---------- */
export function Assistant() {
  return <AIAssistant />;
}

/* ---------- history & vault ---------- */
export function History() {
  const sos = useLoad("/sos"), js = useLoad("/journeys"), rp = useLoad("/reports"), dl = (p, n) => download(p, n).catch(e => alert(e.message));
  return (
    <>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>History &amp; Evidence Vault</h2>
          <p className="mut" style={{ margin: "4px 0 0" }}>Certified electronic safety records, GPS breadcrumbs, and digital evidence dossiers</p>
        </div>
      </div>

      {/* Top Bulk Summary Export Bar */}
      <div className="card" style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.2)" }}>
        <div style={{ fontSize: "0.78rem", fontWeight: 700, letterSpacing: 1, color: "#c084fc", textTransform: "uppercase", marginBottom: 10 }}>
          Certified Safety Audit Reports (PDF)
        </div>
        <div className="row" style={{ flexWrap: "wrap", gap: 10 }}>
          <button className="btn sm" style={{ background: "linear-gradient(135deg, #dc2626, #b91c1c)", color: "#fff", display: "inline-flex", alignItems: "center", gap: 8 }} onClick={() => dl("/pdf/sos", "abhaya_sos_history.pdf")}>
            <ShieldAlert size={15} /> SOS History Dossier (PDF)
          </button>
          <button className="btn sm" style={{ background: "linear-gradient(135deg, #059669, #047857)", color: "#fff", display: "inline-flex", alignItems: "center", gap: 8 }} onClick={() => dl("/pdf/journeys", "abhaya_journeys_audit.pdf")}>
            <Navigation size={15} /> Journey Commute Report (PDF)
          </button>
          <button className="btn sm" style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "#fff", display: "inline-flex", alignItems: "center", gap: 8 }} onClick={() => dl("/pdf/monthly", "abhaya_monthly_safety_audit.pdf")}>
            <FileText size={15} /> 30-Day Safety Digest (PDF)
          </button>
        </div>
      </div>

      {/* SOS Events Table */}
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <b>Emergency SOS Distress Events</b>
          <span className="mut" style={{ fontSize: "0.78rem" }}>{(sos.data?.items || []).length} Recorded</span>
        </div>
        {(sos.data?.items || []).length === 0 ? (
          <p className="mut" style={{ textAlign: "center", padding: "16px 0" }}>No SOS distress events recorded.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Event ID</th>
                  <th>Trigger Time</th>
                  <th>Operating Mode</th>
                  <th>Location Status</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Download Option</th>
                </tr>
              </thead>
              <tbody>
                {(sos.data?.items || []).map(e => (
                  <tr key={e.id}>
                    <td><b>#{e.id}</b></td>
                    <td>{new Date(e.created_at + "Z").toLocaleString()}</td>
                    <td><span className="badge" style={{ background: e.mode === "live" ? "rgba(239,68,68,0.2)" : "rgba(100,116,139,0.2)", color: e.mode === "live" ? "#f87171" : "#cbd5e1" }}>{e.mode?.toUpperCase()}</span></td>
                    <td>{e.location_status || "captured"}</td>
                    <td><Tag s={e.status} /></td>
                    <td style={{ textAlign: "right" }}>
                      <button className="btn ghost sm" style={{ display: "inline-flex", alignItems: "center", gap: 5, borderColor: "rgba(239,68,68,0.4)", color: "#f87171" }} onClick={() => dl("/pdf/sos/" + e.id, `abhaya_sos_dossier_${e.id}.pdf`)}>
                        <FileDown size={13} /> Download PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Journeys Table */}
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <b>Monitored Journeys &amp; Commutes</b>
          <span className="mut" style={{ fontSize: "0.78rem" }}>{(js.data?.items || []).length} Recorded</span>
        </div>
        {(js.data?.items || []).length === 0 ? (
          <p className="mut" style={{ textAlign: "center", padding: "16px 0" }}>No commute journeys recorded.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Trip #</th>
                  <th>Departure Time</th>
                  <th>Destination</th>
                  <th>Route / Distance</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(js.data?.items || []).map(x => (
                  <tr key={x.id}>
                    <td><b>#{x.id}</b></td>
                    <td>{new Date(x.started_at + "Z").toLocaleString()}</td>
                    <td>{x.dest_label?.split(",")[0] || "Destination"}</td>
                    <td>{x.planned_distance_m ? `${(x.planned_distance_m / 1000).toFixed(1)} km` : "—"}</td>
                    <td><Tag s={x.status} /></td>
                    <td style={{ textAlign: "right" }}>
                      <div className="row" style={{ justifyContent: "flex-end", gap: 6 }}>
                        <button className="btn ghost sm" style={{ display: "inline-flex", alignItems: "center", gap: 5, borderColor: "rgba(16,185,129,0.4)", color: "#34d399" }} onClick={() => dl("/pdf/journey/" + x.id, `abhaya_journey_${x.id}.pdf`)}>
                          <FileDown size={13} /> Download PDF
                        </button>
                        <button className="btn red sm" onClick={() => confirm("Delete journey record?") && api("/journeys/" + x.id, { method: "DELETE" }).then(js.reload)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Incidents & Evidence Dossiers */}
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <b>Incidents &amp; Digital Evidence Vault</b>
          <span className="mut" style={{ fontSize: "0.78rem" }}>{(rp.data?.items || []).length} Dossiers</span>
        </div>
        {(rp.data?.items || []).length === 0 ? (
          <p className="mut" style={{ textAlign: "center", padding: "16px 0" }}>No incident reports filed.</p>
        ) : (
          (rp.data?.items || []).map(r => (
            <div key={r.id} style={{ padding: "12px 14px", background: "rgba(255,255,255,0.02)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)", marginBottom: 10 }}>
              <div className="row" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div>
                  <b style={{ color: "#fff", fontSize: "0.95rem" }}>Report #{r.id} — {r.category}</b> <Tag s={r.status} />
                  <div className="mut" style={{ fontSize: "0.76rem", marginTop: 2 }}>{new Date(r.created_at + "Z").toLocaleString()}</div>
                </div>
                <button className="btn ghost sm" style={{ display: "inline-flex", alignItems: "center", gap: 6, borderColor: "rgba(168,85,247,0.5)", color: "#c084fc" }} onClick={() => dl("/pdf/incident/" + r.id, `abhaya_incident_${r.id}.pdf`)}>
                  <FileDown size={14} /> Download Incident Dossier (PDF)
                </button>
              </div>
              <p style={{ margin: "6px 0", fontSize: "0.85rem", color: "#cbd5e1" }}>{r.description}</p>
              {r.evidence && r.evidence.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <span className="mut" style={{ fontSize: "0.75rem", display: "block", marginBottom: 4 }}>Evidence Attachments:</span>
                  <div className="row" style={{ flexWrap: "wrap", gap: 6 }}>
                    {r.evidence.map(ev => (
                      <button key={ev.id} className="btn ghost sm" style={{ fontSize: "0.75rem", padding: "4px 8px" }} onClick={() => dl("/evidence/" + ev.id, ev.name)}>
                        <Download size={12} /> {ev.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </>
  );
}

/* ---------- admin ---------- */
export const Admin = AdminPage;

