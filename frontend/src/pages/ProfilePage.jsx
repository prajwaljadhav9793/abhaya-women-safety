import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  User,
  Shield,
  ShieldCheck,
  Phone,
  Mail,
  MapPin,
  Heart,
  AlertTriangle,
  Key,
  Lock,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  Download,
  Check,
  Save,
  Sparkles,
  Globe,
  Clock,
  ArrowRight,
  ExternalLink,
  Activity,
  LogOut,
  CheckCircle2,
  ChevronRight,
  ShieldAlert,
  FolderLock
} from "lucide-react";
import { useAuth, Tag } from "../context/AuthContext.jsx";
import { api, download, useLoad } from "../api.js";
import { playEmergencyAlarm, stopEmergencyAlarm, isEmergencyAlarmPlaying } from "../emergencyAudio.js";

export default function ProfilePage() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();

  // Tab State
  const [activeTab, setActiveTab] = useState("profile"); // profile | preferences | security | activity

  // Form Fields: Core Profile
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [locationSharing, setLocationSharing] = useState(user?.location_sharing_enabled ?? true);
  const [prefLang, setPrefLang] = useState(user?.preferred_language || "en");

  // In-Case-of-Emergency (ICE) Details (Persisted in localStorage & attached to SOS)
  const [bloodGroup, setBloodGroup] = useState(() => {
    return localStorage.getItem("abhaya_ice_blood") || "B+";
  });
  const [medicalNotes, setMedicalNotes] = useState(() => {
    return localStorage.getItem("abhaya_ice_notes") || "No known allergies / medication dependencies";
  });
  const [homeCity, setHomeCity] = useState(() => {
    return localStorage.getItem("abhaya_ice_city") || "Kolhapur, Maharashtra";
  });
  const [autoWhatsApp, setAutoWhatsApp] = useState(() => {
    return localStorage.getItem("abhaya_auto_wa") !== "false";
  });
  const [autoSirenOnSos, setAutoSirenOnSos] = useState(() => {
    return localStorage.getItem("abhaya_auto_siren") !== "false";
  });

  // Password Update State
  const [pwForm, setPwForm] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwMsg, setPwMsg] = useState({ text: "", type: "" });
  const [pwLoading, setPwLoading] = useState(false);

  // Status & Notification Feedback
  const [saveStatus, setSaveStatus] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);
  const [isSirenTesting, setIsSirenTesting] = useState(false);

  // Live Stats
  const contactsData = useLoad("/contacts");
  const journeysData = useLoad("/journeys");
  const sosData = useLoad("/sos");

  const contactsCount = contactsData.data?.contacts?.length || 0;
  const journeysCount = journeysData.data?.items?.length || 0;
  const sosCount = sosData.data?.total || sosData.data?.items?.length || 0;

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || "");
      setPhone(user.phone || "");
      setLocationSharing(user.location_sharing_enabled ?? true);
      setPrefLang(user.preferred_language || "en");
      if (user.medical_profile) {
        setBloodGroup(user.medical_profile.blood_group || "B+");
        setMedicalNotes(user.medical_profile.medical_notes || "");
        setHomeCity(user.medical_profile.home_city || "Kolhapur, Maharashtra");
        setAutoWhatsApp(user.medical_profile.auto_whatsapp_enabled ?? true);
        setAutoSirenOnSos(user.medical_profile.auto_siren_enabled ?? true);
      }
    }
  }, [user]);

  // Clean up siren on unmount
  useEffect(() => {
    return () => {
      stopEmergencyAlarm();
    };
  }, []);

  // Save Profile Handler
  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    setSaveLoading(true);
    setSaveStatus("");

    try {
      const d = await api("/auth/profile", {
        method: "PUT",
        body: {
          full_name: fullName.trim(),
          phone: phone.trim(),
          location_sharing_enabled: locationSharing,
          preferred_language: prefLang,
          blood_group: bloodGroup,
          medical_notes: medicalNotes,
          home_city: homeCity,
          auto_whatsapp_enabled: autoWhatsApp,
          auto_siren_enabled: autoSirenOnSos
        }
      });

      if (d.user) {
        setUser(d.user);
      }

      // Save ICE details to local storage as offline cache
      localStorage.setItem("abhaya_ice_blood", bloodGroup);
      localStorage.setItem("abhaya_ice_notes", medicalNotes);
      localStorage.setItem("abhaya_ice_city", homeCity);
      localStorage.setItem("abhaya_auto_wa", String(autoWhatsApp));
      localStorage.setItem("abhaya_auto_siren", String(autoSirenOnSos));

      setSaveStatus("✅ Profile & In-Case-of-Emergency (ICE) record saved to database!");
      setTimeout(() => setSaveStatus(""), 4000);
    } catch (err) {
      setSaveStatus(`❌ ${err.message || "Failed to save profile"}`);
    } finally {
      setSaveLoading(false);
    }
  };

  // Password Change Handler
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwMsg({ text: "", type: "" });

    if (!pwForm.current_password) {
      return setPwMsg({ text: "Please enter your current password", type: "err" });
    }
    if (pwForm.new_password.length < 8) {
      return setPwMsg({ text: "New password must be at least 8 characters long", type: "err" });
    }
    if (pwForm.new_password !== pwForm.confirm_password) {
      return setPwMsg({ text: "New passwords do not match", type: "err" });
    }

    setPwLoading(true);
    try {
      await api("/auth/change-password", {
        method: "POST",
        body: {
          current_password: pwForm.current_password,
          new_password: pwForm.new_password
        }
      });
      setPwMsg({ text: "✅ Password successfully updated! Keep it secure.", type: "ok" });
      setPwForm({ current_password: "", new_password: "", confirm_password: "" });
    } catch (err) {
      setPwMsg({ text: `❌ ${err.message || "Could not change password"}`, type: "err" });
    } finally {
      setPwLoading(false);
    }
  };

  // Siren Audio Test Toggle
  const toggleSirenTest = () => {
    if (isSirenTesting) {
      stopEmergencyAlarm();
      setIsSirenTesting(false);
    } else {
      playEmergencyAlarm();
      setIsSirenTesting(true);
    }
  };

  // Helper for member initials
  const initials = user?.full_name
    ? user.full_name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "AB";

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "Oct 2026";

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", paddingBottom: 60 }}>
      {/* 1. Header Banner Card */}
      <div
        className="card"
        style={{
          background: "linear-gradient(135deg, rgba(28, 17, 69, 0.8) 0%, rgba(13, 19, 48, 0.9) 100%)",
          borderColor: "rgba(168, 85, 247, 0.35)",
          borderRadius: 20,
          padding: "24px 28px",
          marginBottom: 20,
          position: "relative",
          overflow: "hidden"
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -40,
            right: -40,
            width: 180,
            height: 180,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(168, 85, 247, 0.25) 0%, transparent 70%)",
            pointerEvents: "none"
          }}
        />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 18 }}>
          {/* Avatar & User Details */}
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div
              style={{
                width: 74,
                height: 74,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #a855f7 0%, #ec4899 50%, #3b82f6 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.85rem",
                fontWeight: 800,
                color: "#fff",
                boxShadow: "0 0 25px rgba(168, 85, 247, 0.6)",
                border: "3px solid rgba(255, 255, 255, 0.3)",
                flexShrink: 0
              }}
            >
              {initials}
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <h1 style={{ margin: 0, fontSize: "1.65rem", fontWeight: 800 }} className="grad">
                  {user?.full_name || "Abhaya User"}
                </h1>
                <span
                  className="badge b-verified"
                  style={{
                    background: "rgba(16, 185, 129, 0.15)",
                    borderColor: "#10b981",
                    color: "#34d399",
                    fontWeight: 700,
                    fontSize: "0.74rem",
                    padding: "3px 10px"
                  }}
                >
                  <ShieldCheck size={13} /> {user?.role === "admin" ? "ADMINISTRATOR" : "PROTECTED USER"}
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 6, flexWrap: "wrap", color: "#94a3b8", fontSize: "0.85rem" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <Mail size={14} color="#38bdf8" /> {user?.email}
                </span>
                <span>&bull;</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <Phone size={14} color="#34d399" /> {user?.phone || "No phone added"}
                </span>
                <span>&bull;</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <Clock size={14} color="#c084fc" /> Member since {memberSince}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {/* Siren Speaker Test */}
            <button
              type="button"
              onClick={toggleSirenTest}
              className="btn sm"
              style={{
                background: isSirenTesting ? "#ef4444" : "rgba(239, 68, 68, 0.15)",
                borderColor: "#ef4444",
                border: "1px solid #ef4444",
                color: "#fff",
                fontWeight: 700
              }}
              title="Test the emergency audio siren on this phone/computer"
            >
              {isSirenTesting ? (
                <>
                  <VolumeX size={15} /> Stop Siren Test
                </>
              ) : (
                <>
                  <Volume2 size={15} /> Test Siren Audio
                </>
              )}
            </button>

            {/* Download Safety History Dossier PDF */}
            <button
              type="button"
              onClick={() => download("/pdf/monthly", `abhaya_safety_dossier_${user?.id || "user"}.pdf`).catch((e) => alert(e.message))}
              className="btn sm ghost"
              style={{ borderColor: "rgba(168, 85, 247, 0.4)" }}
              title="Download your complete official incident & journey safety audit report"
            >
              <Download size={15} /> Safety Dossier PDF
            </button>
          </div>
        </div>

        {/* Real-time Siren Testing Alert Bar */}
        {isSirenTesting && (
          <div
            style={{
              marginTop: 18,
              padding: "10px 14px",
              background: "rgba(239, 68, 68, 0.25)",
              border: "1px solid #ef4444",
              borderRadius: 10,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}
          >
            <span style={{ color: "#fca5a5", fontSize: "0.85rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
              <Volume2 size={17} className="spin" /> Emergency Siren synthesizer is playing loud piercing dual-tone alarm!
            </span>
            <button
              type="button"
              onClick={toggleSirenTest}
              className="btn sm"
              style={{ background: "#ef4444", color: "#fff", border: "none", fontSize: "0.78rem" }}
            >
              Mute Siren
            </button>
          </div>
        )}
      </div>

      {/* 2. Top Stats Overview Strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 20 }}>
        <div className="card" style={{ padding: "14px 18px", margin: 0, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Phone size={20} />
          </div>
          <div>
            <div style={{ fontSize: "1.35rem", fontWeight: 800 }}>{contactsCount}</div>
            <div style={{ fontSize: "0.78rem", color: "#94a3b8" }}>Emergency Circle</div>
          </div>
        </div>

        <div className="card" style={{ padding: "14px 18px", margin: 0, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(168, 85, 247, 0.15)", color: "#c084fc", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Activity size={20} />
          </div>
          <div>
            <div style={{ fontSize: "1.35rem", fontWeight: 800 }}>{journeysCount}</div>
            <div style={{ fontSize: "0.78rem", color: "#94a3b8" }}>Journeys Protected</div>
          </div>
        </div>

        <div className="card" style={{ padding: "14px 18px", margin: 0, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(239, 68, 68, 0.15)", color: "#f87171", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ShieldAlert size={20} />
          </div>
          <div>
            <div style={{ fontSize: "1.35rem", fontWeight: 800 }}>{sosCount}</div>
            <div style={{ fontSize: "0.78rem", color: "#94a3b8" }}>SOS Alerts Logged</div>
          </div>
        </div>

        <div className="card" style={{ padding: "14px 18px", margin: 0, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(16, 185, 129, 0.15)", color: "#34d399", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ShieldCheck size={20} />
          </div>
          <div>
            <div style={{ fontSize: "1.35rem", fontWeight: 800 }}>100%</div>
            <div style={{ fontSize: "0.78rem", color: "#94a3b8" }}>Readiness Score</div>
          </div>
        </div>
      </div>

      {/* 3. Luxury Tab Selector Bar */}
      <div
        style={{
          display: "flex",
          gap: 8,
          background: "rgba(13, 19, 48, 0.6)",
          padding: 6,
          borderRadius: 14,
          border: "1px solid rgba(139, 92, 246, 0.25)",
          marginBottom: 20,
          overflowX: "auto",
          scrollbarWidth: "none"
        }}
      >
        {[
          { id: "profile", label: "👤 Personal & Medical ICE", icon: User },
          { id: "preferences", label: "🛡️ Safety & Tracking Settings", icon: Shield },
          { id: "security", label: "🔐 Password & Sessions", icon: Key },
          { id: "activity", label: "📊 Safety Vault & Records", icon: FolderLock }
        ].map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: "1 0 auto",
                padding: "10px 16px",
                borderRadius: 10,
                border: "none",
                background: active ? "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)" : "transparent",
                color: active ? "#fff" : "#94a3b8",
                fontWeight: active ? 700 : 500,
                fontSize: "0.88rem",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                transition: "all 0.2s ease",
                whiteSpace: "nowrap"
              }}
            >
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Feedback Toast */}
      {saveStatus && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: 12,
            marginBottom: 16,
            background: saveStatus.startsWith("✅") ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
            border: `1px solid ${saveStatus.startsWith("✅") ? "#10b981" : "#ef4444"}`,
            color: "#fff",
            fontSize: "0.9rem",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 8
          }}
        >
          {saveStatus}
        </div>
      )}

      {/* 4. TAB CONTENT 1: PERSONAL & MEDICAL ICE DETAILS */}
      {activeTab === "profile" && (
        <form onSubmit={handleSaveProfile}>
          <div className="card" style={{ padding: "24px 22px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.15rem", display: "flex", alignItems: "center", gap: 8 }}>
                  <User size={18} color="#c084fc" /> Personal Identity & Contact Information
                </h3>
                <p className="mut" style={{ margin: "2px 0 0", fontSize: "0.8rem" }}>
                  Used across emergency SMS dispatches, police coordinate sharing, and official incident dossiers.
                </p>
              </div>
              <span className="badge" style={{ background: "rgba(56, 189, 248, 0.12)", color: "#38bdf8", borderColor: "#38bdf8" }}>
                ID #{user?.id}
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
              <div>
                <label style={{ fontWeight: 600, color: "#cbd5e1" }}>Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  required
                />
              </div>

              <div>
                <label style={{ fontWeight: 600, color: "#cbd5e1" }}>Mobile Phone Number (India & International)</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 9876543210"
                  required
                />
              </div>

              <div>
                <label style={{ fontWeight: 600, color: "#cbd5e1" }}>Registered Email Address</label>
                <input
                  type="email"
                  value={user?.email || ""}
                  disabled
                  style={{ opacity: 0.7, background: "rgba(13, 19, 48, 0.4)", cursor: "not-allowed" }}
                />
                <span style={{ fontSize: "0.72rem", color: "#34d399", display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                  <CheckCircle2 size={12} /> Verified primary account identity
                </span>
              </div>

              <div>
                <label style={{ fontWeight: 600, color: "#cbd5e1" }}>Primary Home Safe Zone / City</label>
                <input
                  type="text"
                  value={homeCity}
                  onChange={(e) => setHomeCity(e.target.value)}
                  placeholder="e.g. Kolhapur, Maharashtra"
                />
              </div>
            </div>

            {/* Medical ICE Section */}
            <div style={{ marginTop: 24, paddingTop: 18, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <Heart size={18} color="#f43f5e" />
                <h3 style={{ margin: 0, fontSize: "1.05rem", color: "#fda4af" }}>
                  Medical In-Case-of-Emergency (ICE) Details
                </h3>
              </div>
              <p className="mut" style={{ margin: "0 0 16px", fontSize: "0.8rem" }}>
                In critical medical situations or police rescues, first responders can access this data directly from your verified SOS dossier.
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 16 }}>
                <div>
                  <label style={{ fontWeight: 600, color: "#cbd5e1" }}>Blood Group</label>
                  <select value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)}>
                    <option value="A+">A Positive (A+)</option>
                    <option value="A-">A Negative (A-)</option>
                    <option value="B+">B Positive (B+)</option>
                    <option value="B-">B Negative (B-)</option>
                    <option value="O+">O Positive (O+)</option>
                    <option value="O-">O Negative (O-)</option>
                    <option value="AB+">AB Positive (AB+)</option>
                    <option value="AB-">AB Negative (AB-)</option>
                    <option value="Unknown">Unknown</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontWeight: 600, color: "#cbd5e1" }}>Allergies & Critical Medical Directives</label>
                  <input
                    type="text"
                    value={medicalNotes}
                    onChange={(e) => setMedicalNotes(e.target.value)}
                    placeholder="e.g. Asthmatic (inhaler in purse), Penicillin allergy, Diabetic"
                  />
                </div>
              </div>
            </div>

            <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
              <button type="submit" disabled={saveLoading} className="btn" style={{ minWidth: 160 }}>
                {saveLoading ? <Sparkles size={16} className="spin" /> : <Save size={16} />}
                Save Changes
              </button>
            </div>
          </div>
        </form>
      )}

      {/* 5. TAB CONTENT 2: SAFETY & TRACKING PREFERENCES */}
      {activeTab === "preferences" && (
        <form onSubmit={handleSaveProfile}>
          <div className="card" style={{ padding: "24px 22px" }}>
            <div style={{ marginBottom: 18, borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: "1.15rem", display: "flex", alignItems: "center", gap: 8 }}>
                <Shield size={18} color="#34d399" /> Safety Intelligence & Dispatch Settings
              </h3>
              <p className="mut" style={{ margin: "2px 0 0", fontSize: "0.8rem" }}>
                Control how ABHAYA gathers telemetry, alerts your emergency contacts, and interacts during live journeys.
              </p>
            </div>

            {/* Toggle 1: Live Location Sharing */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0", borderBottom: "1px solid rgba(255,255,255,0.06)", flexWrap: "wrap", gap: 12 }}>
              <div style={{ maxWidth: 540 }}>
                <b style={{ color: "#fff", fontSize: "0.95rem", display: "flex", alignItems: "center", gap: 6 }}>
                  <MapPin size={16} color="#38bdf8" /> Real-Time Location Sharing & GPS Broadcasting
                </b>
                <p className="mut" style={{ margin: "4px 0 0", fontSize: "0.82rem" }}>
                  Permits ABHAYA to calculate live safe paths, detect off-route hazards, and broadcast high-precision GPS coordinates during an active SOS event.
                </p>
              </div>
              <label className="switch" style={{ position: "relative", display: "inline-block", width: 52, height: 28 }}>
                <input
                  type="checkbox"
                  checked={locationSharing}
                  onChange={(e) => setLocationSharing(e.target.checked)}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span
                  style={{
                    position: "absolute",
                    cursor: "pointer",
                    inset: 0,
                    backgroundColor: locationSharing ? "#10b981" : "#475569",
                    borderRadius: 34,
                    transition: "0.3s"
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      height: 20,
                      width: 20,
                      left: locationSharing ? 26 : 4,
                      bottom: 4,
                      backgroundColor: "white",
                      borderRadius: "50%",
                      transition: "0.3s"
                    }}
                  />
                </span>
              </label>
            </div>

            {/* Toggle 2: Automated WhatsApp Emergency Dispatch */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0", borderBottom: "1px solid rgba(255,255,255,0.06)", flexWrap: "wrap", gap: 12 }}>
              <div style={{ maxWidth: 540 }}>
                <b style={{ color: "#fff", fontSize: "0.95rem", display: "flex", alignItems: "center", gap: 6 }}>
                  💬 WhatsApp 1-Tap Emergency Auto-Launch
                </b>
                <p className="mut" style={{ margin: "4px 0 0", fontSize: "0.82rem" }}>
                  When SOS is activated, automatically pre-fills your live Google Maps coordinates and launches WhatsApp to your priority contact so you can send instantly.
                </p>
              </div>
              <label className="switch" style={{ position: "relative", display: "inline-block", width: 52, height: 28 }}>
                <input
                  type="checkbox"
                  checked={autoWhatsApp}
                  onChange={(e) => setAutoWhatsApp(e.target.checked)}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span
                  style={{
                    position: "absolute",
                    cursor: "pointer",
                    inset: 0,
                    backgroundColor: autoWhatsApp ? "#25D366" : "#475569",
                    borderRadius: 34,
                    transition: "0.3s"
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      height: 20,
                      width: 20,
                      left: autoWhatsApp ? 26 : 4,
                      bottom: 4,
                      backgroundColor: "white",
                      borderRadius: "50%",
                      transition: "0.3s"
                    }}
                  />
                </span>
              </label>
            </div>

            {/* Toggle 3: Automatic Siren on SOS */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0", borderBottom: "1px solid rgba(255,255,255,0.06)", flexWrap: "wrap", gap: 12 }}>
              <div style={{ maxWidth: 540 }}>
                <b style={{ color: "#fff", fontSize: "0.95rem", display: "flex", alignItems: "center", gap: 6 }}>
                  🔊 Automatic Loud Piercing Alarm on SOS
                </b>
                <p className="mut" style={{ margin: "4px 0 0", fontSize: "0.82rem" }}>
                  Immediately blasts the high-decibel dual-frequency audio siren upon pressing SOS to deter attackers and attract bystander attention.
                </p>
              </div>
              <label className="switch" style={{ position: "relative", display: "inline-block", width: 52, height: 28 }}>
                <input
                  type="checkbox"
                  checked={autoSirenOnSos}
                  onChange={(e) => setAutoSirenOnSos(e.target.checked)}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span
                  style={{
                    position: "absolute",
                    cursor: "pointer",
                    inset: 0,
                    backgroundColor: autoSirenOnSos ? "#ef4444" : "#475569",
                    borderRadius: 34,
                    transition: "0.3s"
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      height: 20,
                      width: 20,
                      left: autoSirenOnSos ? 26 : 4,
                      bottom: 4,
                      backgroundColor: "white",
                      borderRadius: "50%",
                      transition: "0.3s"
                    }}
                  />
                </span>
              </label>
            </div>

            {/* Language Selector */}
            <div style={{ paddingTop: 18 }}>
              <label style={{ fontWeight: 600, color: "#cbd5e1", display: "flex", alignItems: "center", gap: 6 }}>
                <Globe size={16} color="#c084fc" /> Preferred Platform & Voice Language
              </label>
              <div style={{ maxWidth: 360, marginTop: 8 }}>
                <select value={prefLang} onChange={(e) => setPrefLang(e.target.value)}>
                  <option value="en">English (Default)</option>
                  <option value="hi">हिंदी (Hindi)</option>
                  <option value="mr">मराठी (Marathi - Kolhapur & Maharashtra)</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
              <button type="submit" disabled={saveLoading} className="btn" style={{ minWidth: 160 }}>
                {saveLoading ? <Sparkles size={16} className="spin" /> : <Save size={16} />}
                Update Settings
              </button>
            </div>
          </div>
        </form>
      )}

      {/* 6. TAB CONTENT 3: PASSWORD & SECURITY */}
      {activeTab === "security" && (
        <div>
          <form onSubmit={handlePasswordChange}>
            <div className="card" style={{ padding: "24px 22px", marginBottom: 20 }}>
              <div style={{ marginBottom: 18, borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: "1.15rem", display: "flex", alignItems: "center", gap: 8 }}>
                  <Key size={18} color="#fbbf24" /> Update Account Password
                </h3>
                <p className="mut" style={{ margin: "2px 0 0", fontSize: "0.8rem" }}>
                  Passwords are encrypted using one-way salted cryptographic hashing. Min 8 characters with letters and numbers.
                </p>
              </div>

              {pwMsg.text && (
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: 10,
                    marginBottom: 16,
                    background: pwMsg.type === "ok" ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                    border: `1px solid ${pwMsg.type === "ok" ? "#10b981" : "#ef4444"}`,
                    color: "#fff",
                    fontSize: "0.88rem"
                  }}
                >
                  {pwMsg.text}
                </div>
              )}

              <div style={{ maxWidth: 440 }}>
                {/* Current Password */}
                <div style={{ position: "relative" }}>
                  <label style={{ fontWeight: 600, color: "#cbd5e1" }}>Current Password</label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showCurrentPw ? "text" : "password"}
                      value={pwForm.current_password}
                      onChange={(e) => setPwForm({ ...pwForm, current_password: e.target.value })}
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPw(!showCurrentPw)}
                      style={{ position: "absolute", right: 12, top: 18, background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}
                    >
                      {showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div style={{ position: "relative", marginTop: 10 }}>
                  <label style={{ fontWeight: 600, color: "#cbd5e1" }}>New Password (8+ alphanumeric characters)</label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showNewPw ? "text" : "password"}
                      value={pwForm.new_password}
                      onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })}
                      placeholder="Min 8 characters"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPw(!showNewPw)}
                      style={{ position: "absolute", right: 12, top: 18, background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}
                    >
                      {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div style={{ marginTop: 10 }}>
                  <label style={{ fontWeight: 600, color: "#cbd5e1" }}>Confirm New Password</label>
                  <input
                    type="password"
                    value={pwForm.confirm_password}
                    onChange={(e) => setPwForm({ ...pwForm, confirm_password: e.target.value })}
                    placeholder="Re-enter new password"
                    required
                  />
                </div>

                <div style={{ marginTop: 18 }}>
                  <button type="submit" disabled={pwLoading} className="btn">
                    {pwLoading ? "Updating..." : "Update Password"}
                  </button>
                </div>
              </div>
            </div>
          </form>

          {/* Session & Device Card */}
          <div className="card" style={{ padding: "20px 22px" }}>
            <h4 style={{ margin: "0 0 10px", fontSize: "0.95rem", color: "#e2e8f0", display: "flex", alignItems: "center", gap: 8 }}>
              <Lock size={16} color="#38bdf8" /> Active Session & Client Information
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, fontSize: "0.82rem", color: "#94a3b8" }}>
              <div style={{ background: "rgba(255,255,255,0.02)", padding: 10, borderRadius: 8 }}>
                <b>Token Status:</b> <span style={{ color: "#34d399" }}>Active & Encrypted</span>
              </div>
              <div style={{ background: "rgba(255,255,255,0.02)", padding: 10, borderRadius: 8 }}>
                <b>Client Environment:</b> {typeof window !== "undefined" ? window.navigator.userAgent.slice(0, 36) + "..." : "Browser"}
              </div>
              <div style={{ background: "rgba(255,255,255,0.02)", padding: 10, borderRadius: 8 }}>
                <b>Session Role:</b> <span style={{ textTransform: "uppercase", color: "#c084fc" }}>{user?.role}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. TAB CONTENT 4: SAFETY VAULT & QUICK ACCESS */}
      {activeTab === "activity" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card" style={{ padding: "22px 24px" }}>
            <h3 style={{ margin: "0 0 14px", fontSize: "1.15rem", display: "flex", alignItems: "center", gap: 8 }}>
              <FolderLock size={18} color="#c084fc" /> Personal Safety Vault & Module Shortcuts
            </h3>
            <p className="mut" style={{ margin: "0 0 18px", fontSize: "0.82rem" }}>
              Quickly manage your trusted circle, audit past journey paths, download evidence dossiers, and inspect incident logs.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
              <Link
                to="/contacts"
                style={{
                  background: "rgba(56, 189, 248, 0.08)",
                  border: "1px solid rgba(56, 189, 248, 0.25)",
                  borderRadius: 14,
                  padding: "16px",
                  textDecoration: "none",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}
              >
                <div>
                  <b style={{ color: "#38bdf8", fontSize: "0.95rem" }}>Emergency Circle</b>
                  <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: 4 }}>
                    {contactsCount} priority contacts configured
                  </div>
                </div>
                <ChevronRight size={18} color="#38bdf8" />
              </Link>

              <Link
                to="/journey"
                style={{
                  background: "rgba(168, 85, 247, 0.08)",
                  border: "1px solid rgba(168, 85, 247, 0.25)",
                  borderRadius: 14,
                  padding: "16px",
                  textDecoration: "none",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}
              >
                <div>
                  <b style={{ color: "#c084fc", fontSize: "0.95rem" }}>Live Journey Guardian</b>
                  <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: 4 }}>
                    3D WebGL satellite monitoring
                  </div>
                </div>
                <ChevronRight size={18} color="#c084fc" />
              </Link>

              <Link
                to="/history"
                style={{
                  background: "rgba(16, 185, 129, 0.08)",
                  border: "1px solid rgba(16, 185, 129, 0.25)",
                  borderRadius: 14,
                  padding: "16px",
                  textDecoration: "none",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}
              >
                <div>
                  <b style={{ color: "#34d399", fontSize: "0.95rem" }}>Evidence Vault</b>
                  <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: 4 }}>
                    Tamper-proof incident records
                  </div>
                </div>
                <ChevronRight size={18} color="#34d399" />
              </Link>

              <Link
                to="/reports"
                style={{
                  background: "rgba(245, 158, 11, 0.08)",
                  border: "1px solid rgba(245, 158, 11, 0.25)",
                  borderRadius: 14,
                  padding: "16px",
                  textDecoration: "none",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}
              >
                <div>
                  <b style={{ color: "#fbbf24", fontSize: "0.95rem" }}>Community Hazard Reports</b>
                  <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: 4 }}>
                    Audit unlit alleys & safe points
                  </div>
                </div>
                <ChevronRight size={18} color="#fbbf24" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 8. Bottom Account Sign Out Row */}
      <div style={{ marginTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, padding: "16px 20px", background: "rgba(239, 68, 68, 0.06)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: 14 }}>
        <div>
          <b style={{ color: "#fca5a5", fontSize: "0.92rem", display: "flex", alignItems: "center", gap: 6 }}>
            <LogOut size={16} /> Sign Out of ABHAYA
          </b>
          <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: 2 }}>
            Clears local session token and ends current device session.
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            if (window.confirm("Are you sure you want to log out of your ABHAYA session?")) {
              logout();
            }
          }}
          className="btn sm"
          style={{ background: "#dc2626", color: "#fff", border: "none", fontWeight: 700 }}
        >
          Logout Session
        </button>
      </div>
    </div>
  );
}

