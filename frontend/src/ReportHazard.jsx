import React, { useState, useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  CircleMarker,
  useMap,
  useMapEvents
} from "react-leaflet";
import L from "leaflet";
import {
  Shield,
  ShieldAlert,
  AlertTriangle,
  Zap,
  Navigation,
  Radio,
  MapPin,
  Compass,
  LocateFixed,
  UploadCloud,
  FileText,
  FileDown,
  Trash2,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Eye,
  HelpCircle,
  Sparkles,
  X,
  ExternalLink,
  Lock,
  Layers,
  Check,
  AlertCircle
} from "lucide-react";
import { api, useLoad, download } from "./api.js";
import { Tag } from "./context/AuthContext.jsx";

// Custom Leaflet Selected Pin Icon
const selectedHazardPinIcon = L.divIcon({
  className: "hazard-selected-pin-icon",
  html: `
    <div style="position: relative; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center;">
      <div style="
        position: absolute;
        width: 38px;
        height: 38px;
        border-radius: 50%;
        background: rgba(239, 68, 68, 0.4);
        animation: radarPing 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
      "></div>
      <div style="
        position: absolute;
        width: 28px;
        height: 28px;
        border-radius: 50% 50% 50% 0;
        background: linear-gradient(135deg, #ef4444, #b91c1c);
        transform: rotate(-45deg);
        border: 2px solid #ffffff;
        box-shadow: 0 0 16px rgba(239, 68, 68, 0.95);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="width: 8px; height: 8px; background: #ffffff; border-radius: 50%; transform: rotate(45deg);"></div>
      </div>
    </div>
  `,
  iconSize: [38, 38],
  iconAnchor: [19, 36],
  popupAnchor: [0, -36]
});

// Categories Configuration
const CATEGORIES_DATA = [
  {
    id: "Harassment",
    label: "Harassment & Stalking",
    icon: ShieldAlert,
    color: "#f43f5e",
    accent: "rgba(244, 63, 94, 0.15)",
    border: "#f43f5e",
    desc: "Verbal catcalling, trailing, lewd gestures, or physical stalking."
  },
  {
    id: "Unsafe street or area",
    label: "Unsafe Street / Alley",
    icon: AlertTriangle,
    color: "#f97316",
    accent: "rgba(249, 115, 22, 0.15)",
    border: "#f97316",
    desc: "Deserted stretch, blind alley, isolated shortcut, unpatrolled zone."
  },
  {
    id: "Poor lighting",
    label: "Poor / Zero Lighting",
    icon: Zap,
    color: "#eab308",
    accent: "rgba(234, 179, 8, 0.15)",
    border: "#eab308",
    desc: "Broken streetlights, pitch-black corridors, dangerous shadows."
  },
  {
    id: "Suspicious activity",
    label: "Suspicious Activity",
    icon: Radio,
    color: "#a855f7",
    accent: "rgba(168, 85, 247, 0.15)",
    border: "#a855f7",
    desc: "Unauthorized loitering, individuals congregating near dark spots."
  },
  {
    id: "Transport-related concern",
    label: "Transit / Transport Risk",
    icon: Navigation,
    color: "#06b6d4",
    accent: "rgba(6, 182, 212, 0.15)",
    border: "#06b6d4",
    desc: "Unregulated auto-rickshaws, unsafe bus stops, dark boarding points."
  },
  {
    id: "Other safety concern",
    label: "General Safety Hazard",
    icon: Shield,
    color: "#10b981",
    accent: "rgba(16, 185, 129, 0.15)",
    border: "#10b981",
    desc: "Damaged sidewalks, open pits, dangerous surroundings, or obstacles."
  }
];

// Kolhapur Local Landmarks for Fast Geocoding
const KOLHAPUR_HOTSPOTS = [
  { label: "Central Bus Stand (CBS), Shahupuri", lat: 16.7042, lng: 74.2435 },
  { label: "Rajarampuri Main Road (2nd Lane)", lat: 16.6975, lng: 74.2412 },
  { label: "Mahalaxmi Temple (Bhavani Mandap)", lat: 16.6948, lng: 74.2238 },
  { label: "Rankala Lake & Chaupati", lat: 16.686, lng: 74.2084 },
  { label: "Shivaji University Campus (Vidyanagar)", lat: 16.678, lng: 74.254 },
  { label: "Tarabai Park / Cyber Chowk", lat: 16.711, lng: 74.232 }
];

// Prompt helper suggestions
const SUGGESTED_PROMPTS = [
  "Multiple streetlights broken along a 150m stretch; pitch dark after 8 PM.",
  "Isolated pedestrian shortcut with blind corners and zero public visibility.",
  "Group loitering near the bus stop passing verbal remarks to women commuters.",
  "Auto drivers demanding excessive cash and refusing meter at unlit stand.",
  "Vehicle trailing solo women travelers along this corridor without headlights."
];

// Curated Kolhapur Police Jurisdictions
const POLICE_STATIONS = [
  { id: "kh-pol-01", name: "Kolhapur Police Control Room & SP Office", lat: 16.7082, lng: 74.2462, phone: "0231-2653960", address: "Kasaba Bawada Road, Near Collector Office, Kolhapur", zone: "District Police HQ & Central Control" },
  { id: "kh-pol-02", name: "Shahupuri Police Station", lat: 16.7035, lng: 74.2428, phone: "0231-2651033", address: "Station Road, Near Central Bus Stand, Shahupuri", zone: "CBS & Railway Transit Zone" },
  { id: "kh-pol-03", name: "Rajarampuri Police Station", lat: 16.6912, lng: 74.2482, phone: "0231-2524333", address: "1st Lane, Rajarampuri, Kolhapur", zone: "Residential & Commercial Zone" },
  { id: "kh-pol-04", name: "Juna Rajwada Police Station", lat: 16.6942, lng: 74.2235, phone: "0231-2540333", address: "Near Mahalaxmi Temple, Old Palace Area", zone: "Heritage & Temple Zone" },
  { id: "kh-pol-05", name: "Laxmipuri Police Station", lat: 16.7001, lng: 74.2312, phone: "0231-2640333", address: "Commerce Centre, Laxmipuri Market Area", zone: "Central Market Zone" },
  { id: "kh-pol-06", name: "Karveer Police Station", lat: 16.6985, lng: 74.2380, phone: "0231-2652333", address: "Bhavani Mandap Road, Karveer", zone: "Karveer Sub-Division" },
  { id: "kh-pol-07", name: "Gokul Shirgaon Police Chowki", lat: 16.6515, lng: 74.2630, phone: "0231-2672333", address: "Near KIT College & MIDC, Gokul Shirgaon", zone: "MIDC & KIT Campus Zone" },
  { id: "kh-pol-08", name: "Cyber Chowk Police Outpost & Traffic Control", lat: 16.6825, lng: 74.2508, phone: "112", address: "Cyber Chowk, University Road", zone: "University Corridor" }
];

const havM = (a, b) => {
  if (!a || !b) return Infinity;
  const R = 6371000;
  const p1 = (a[0] * Math.PI) / 180;
  const p2 = (b[0] * Math.PI) / 180;
  const dp = ((b[0] - a[0]) * Math.PI) / 180;
  const dl = ((b[1] - a[1]) * Math.PI) / 180;
  const x = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
  return 2 * R * Math.asin(Math.sqrt(x));
};

const getPoliceStationForPoint = (pLat, pLng, label = "") => {
  if (pLat && pLng) {
    let closest = POLICE_STATIONS[1];
    let minD = Infinity;
    for (const ps of POLICE_STATIONS) {
      const d = havM([Number(pLat), Number(pLng)], [ps.lat, ps.lng]);
      if (d < minD) {
        minD = d;
        closest = ps;
      }
    }
    return { ...closest, distance_m: Math.round(minD) };
  }
  const l = (label || "").toLowerCase();
  if (l.includes("cbs") || l.includes("bus stand") || l.includes("shahupuri")) return POLICE_STATIONS[1];
  if (l.includes("rajarampuri")) return POLICE_STATIONS[2];
  if (l.includes("mahalaxmi") || l.includes("rajwada")) return POLICE_STATIONS[3];
  if (l.includes("rankala") || l.includes("karveer")) return POLICE_STATIONS[5];
  if (l.includes("laxmipuri")) return POLICE_STATIONS[4];
  if (l.includes("kit") || l.includes("gokul")) return POLICE_STATIONS[6];
  if (l.includes("university") || l.includes("cyber")) return POLICE_STATIONS[7];
  return POLICE_STATIONS[1];
};

// Map Click Listener Component
function MapClickPicker({ position, onPick }) {
  useMapEvents({
    click(e) {
      onPick([e.latlng.lat, e.latlng.lng]);
    }
  });

  return position ? (
    <Marker position={position} icon={selectedHazardPinIcon}>
      <Popup>
        <div style={{ padding: 4, textAlign: "center" }}>
          <b style={{ color: "#ef4444" }}>Selected Hazard Spot</b>
          <div style={{ fontSize: "0.76rem", color: "#64748b" }}>
            {position[0].toFixed(5)}, {position[1].toFixed(5)}
          </div>
        </div>
      </Popup>
    </Marker>
  ) : null;
}

// Map Auto-pan Controller
function MapPanController({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, 15, { animate: true });
    }
  }, [center, map]);
  return null;
}

export default function ReportHazard() {
  const [activeTab, setActiveTab] = useState("report"); // "report", "map", "history"
  const mine = useLoad("/reports");
  const pins = useLoad("/reports/pins");

  // Form State
  const [category, setCategory] = useState("Harassment");
  const [severity, setSeverity] = useState(2); // 1 = Low, 2 = Moderate, 3 = Critical
  const [description, setDescription] = useState("");
  const [incidentTime, setIncidentTime] = useState(
    new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16)
  );
  const [locationLabel, setLocationLabel] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [files, setFiles] = useState([]);

  // UI / Status State
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [successMsg, setSuccessMsg] = useState("");

  // History Tab Filters
  const [historySearch, setHistorySearch] = useState("");
  const [historyStatusFilter, setHistoryStatusFilter] = useState("all");

  // Map Filter
  const [mapCategoryFilter, setMapCategoryFilter] = useState("all");

  // Selected Pin Coordinates for Mini-map
  const mapPinPos = lat && lng ? [Number(lat), Number(lng)] : null;
  const initialMapCenter = mapPinPos || [16.705, 74.243]; // Kolhapur CBS default

  // Geolocation Handler
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setErrorMsg("Geolocation is not supported by your browser.");
      return;
    }
    setIsLocating(true);
    setErrorMsg("");
    navigator.geolocation.getCurrentPosition(
      pos => {
        const curLat = Number(pos.coords.latitude.toFixed(6));
        const curLng = Number(pos.coords.longitude.toFixed(6));
        try { localStorage.setItem("abhaya_last_coords", JSON.stringify({ lat: curLat, lng: curLng, timestamp: Date.now() })); } catch (e) {}
        setLat(curLat);
        setLng(curLng);
        if (!locationLabel) {
          setLocationLabel(`My Location (${curLat}, ${curLng})`);
        }
        setIsLocating(false);
      },
      err => {
        setIsLocating(false);
        setErrorMsg("Unable to retrieve GPS coordinates: " + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Quick Pick Landmark Handler
  const handleSelectLandmark = lm => {
    setLat(lm.lat);
    setLng(lm.lng);
    setLocationLabel(lm.label);
  };

  // Map Click Coordinate Handler
  const handleMapPick = coords => {
    const pLat = Number(coords[0].toFixed(6));
    const pLng = Number(coords[1].toFixed(6));
    setLat(pLat);
    setLng(pLng);
    if (!locationLabel) {
      setLocationLabel(`Pinned Location (${pLat}, ${pLng})`);
    }
  };

  // Time Shortcut Handlers
  const handleTimeShortcut = minsAgo => {
    const d = new Date(Date.now() - minsAgo * 60000 - new Date().getTimezoneOffset() * 60000);
    setIncidentTime(d.toISOString().slice(0, 16));
  };

  // File Upload Handlers
  const handleFileChange = e => {
    if (!e.target.files) return;
    const selected = Array.from(e.target.files);
    // Limit to 5 files
    const total = [...files, ...selected].slice(0, 5);
    setFiles(total);
  };

  const handleRemoveFile = index => {
    setFiles(files.filter((_, i) => i !== index));
  };

  // Form Submit Handler
  const handleSubmit = async e => {
    e.preventDefault();
    setErrorMsg("");
    setFieldErrors({});
    setSuccessMsg("");

    if (!description.trim() || description.trim().length < 10) {
      setErrorMsg("Please provide a description of the incident (at least 10 characters).");
      setFieldErrors({ description: "Min 10 characters required" });
      return;
    }

    setIsSubmitting(true);
    const fd = new FormData();
    fd.append("category", category);
    fd.append("severity", severity);
    fd.append("description", description.trim());
    fd.append("incident_time", incidentTime);
    if (locationLabel) fd.append("location_label", locationLabel.trim());
    if (lat) fd.append("lat", lat);
    if (lng) fd.append("lng", lng);

    files.forEach(f => {
      fd.append("files", f);
    });

    try {
      const resp = await api("/reports", { method: "POST", form: fd });
      setSuccessMsg(
        resp.message ||
          "Hazard report submitted successfully! It will appear on the community map for citizen safety."
      );
      // Reset Form Fields
      setDescription("");
      setLocationLabel("");
      setLat("");
      setLng("");
      setFiles([]);
      // Reload Data
      mine.reload();
      pins.reload();
      // Auto-switch to history tab after 2.5s
      setTimeout(() => {
        setSuccessMsg("");
      }, 5000);
    } catch (err) {
      setErrorMsg(err.message || "Failed to submit hazard report. Please check the inputs.");
      if (err.fields) setFieldErrors(err.fields);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete / Withdraw Report Handler
  const handleWithdraw = async id => {
    if (!window.confirm("Are you sure you want to withdraw this safety report and its evidence?")) {
      return;
    }
    try {
      await api(`/reports/${id}`, { method: "DELETE" });
      mine.reload();
      pins.reload();
    } catch (err) {
      alert("Could not withdraw report: " + err.message);
    }
  };

  // Filtered History
  const historyItems = (mine.data?.items || []).filter(item => {
    const matchesSearch =
      historySearch === "" ||
      item.category?.toLowerCase().includes(historySearch.toLowerCase()) ||
      item.description?.toLowerCase().includes(historySearch.toLowerCase()) ||
      item.location_label?.toLowerCase().includes(historySearch.toLowerCase());

    const matchesStatus =
      historyStatusFilter === "all" || item.status === historyStatusFilter;

    return matchesSearch && matchesStatus;
  });

  // Filtered Community Pins
  const communityPins = (pins.data?.items || []).filter(p => {
    if (mapCategoryFilter === "all") return true;
    return p.category === mapCategoryFilter;
  });

  return (
    <div style={{ maxWidth: 1160, margin: "0 auto", padding: "10px 0 40px" }}>
      {/* 1. HERO HEADER */}
      <div
        style={{
          background:
            "linear-gradient(135deg, rgba(30, 27, 75, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%)",
          border: "1px solid rgba(139, 92, 246, 0.3)",
          borderRadius: 20,
          padding: "26px 28px",
          marginBottom: 24,
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4)",
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
            background: "radial-gradient(circle, rgba(139, 92, 246, 0.25), transparent 70%)",
            filter: "blur(20px)",
            pointerEvents: "none"
          }}
        />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", background: "rgba(139, 92, 246, 0.15)", border: "1px solid rgba(139, 92, 246, 0.35)", borderRadius: 20, fontSize: "0.75rem", fontWeight: 700, color: "#c084fc", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>
              <ShieldAlert size={14} /> Community Safety Intelligence
            </div>
            <h1 style={{ fontSize: "1.85rem", fontWeight: 800, color: "#fff", margin: "0 0 8px" }}>
              Report Hazard & Safety Incident
            </h1>
            <p className="mut" style={{ maxWidth: 650, margin: 0, fontSize: "0.92rem", lineHeight: 1.5 }}>
              Crowdsource safety alerts on poorly lit roads, harassment hotspots, or unsafe transit corridors.
              Every report directly enriches safe route computations and builds certified evidence dossiers.
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div
              style={{
                background: "rgba(0, 0, 0, 0.35)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: 12,
                padding: "10px 16px",
                textAlign: "center"
              }}
            >
              <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#f43f5e" }}>
                {(pins.data?.items || []).length}
              </div>
              <div style={{ fontSize: "0.72rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: 600 }}>
                City Hazard Pins
              </div>
            </div>

            <div
              style={{
                background: "rgba(0, 0, 0, 0.35)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: 12,
                padding: "10px 16px",
                textAlign: "center"
              }}
            >
              <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#a855f7" }}>
                {(mine.data?.items || []).length}
              </div>
              <div style={{ fontSize: "0.72rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: 600 }}>
                Your Reports
              </div>
            </div>
          </div>
        </div>

        {/* 2. NAVIGATION TABS */}
        <div
          style={{
            display: "flex",
            gap: 10,
            marginTop: 22,
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            paddingTop: 18,
            flexWrap: "wrap"
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab("report")}
            className="btn"
            style={{
              background:
                activeTab === "report"
                  ? "linear-gradient(90deg, #7c3aed, #9333ea)"
                  : "rgba(255, 255, 255, 0.06)",
              borderColor: activeTab === "report" ? "#a855f7" : "rgba(255, 255, 255, 0.12)",
              color: "#fff",
              fontWeight: 700,
              padding: "9px 18px",
              fontSize: "0.86rem",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              boxShadow: activeTab === "report" ? "0 0 16px rgba(168, 85, 247, 0.4)" : "none"
            }}
          >
            <ShieldAlert size={16} /> 📝 File Hazard Report
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("map")}
            className="btn"
            style={{
              background:
                activeTab === "map"
                  ? "linear-gradient(90deg, #7c3aed, #9333ea)"
                  : "rgba(255, 255, 255, 0.06)",
              borderColor: activeTab === "map" ? "#a855f7" : "rgba(255, 255, 255, 0.12)",
              color: "#fff",
              fontWeight: 700,
              padding: "9px 18px",
              fontSize: "0.86rem",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              boxShadow: activeTab === "map" ? "0 0 16px rgba(168, 85, 247, 0.4)" : "none"
            }}
          >
            <MapPin size={16} /> 🗺️ Live Community Map ({(pins.data?.items || []).length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className="btn"
            style={{
              background:
                activeTab === "history"
                  ? "linear-gradient(90deg, #7c3aed, #9333ea)"
                  : "rgba(255, 255, 255, 0.06)",
              borderColor: activeTab === "history" ? "#a855f7" : "rgba(255, 255, 255, 0.12)",
              color: "#fff",
              fontWeight: 700,
              padding: "9px 18px",
              fontSize: "0.86rem",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              boxShadow: activeTab === "history" ? "0 0 16px rgba(168, 85, 247, 0.4)" : "none"
            }}
          >
            <FileText size={16} /> 📁 My Reports &amp; Dossiers ({(mine.data?.items || []).length})
          </button>
        </div>
      </div>

      {/* SUCCESS TOAST BANNER */}
      {successMsg && (
        <div
          style={{
            padding: "16px 20px",
            background: "linear-gradient(90deg, rgba(16, 185, 129, 0.2), rgba(6, 182, 212, 0.2))",
            border: "1.5px solid #10b981",
            borderRadius: 14,
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 0 20px rgba(16, 185, 129, 0.3)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <CheckCircle2 size={24} style={{ color: "#10b981" }} />
            <div>
              <b style={{ color: "#10b981", fontSize: "0.98rem" }}>Report Filed Successfully!</b>
              <div style={{ color: "#e2e8f0", fontSize: "0.84rem" }}>{successMsg}</div>
            </div>
          </div>
          <button
            type="button"
            className="btn sm"
            onClick={() => setActiveTab("history")}
            style={{ background: "#10b981", color: "#000", fontWeight: 700 }}
          >
            View Dossier &rarr;
          </button>
        </div>
      )}

      {/* ERROR BANNER */}
      {errorMsg && (
        <div
          style={{
            padding: "14px 18px",
            background: "rgba(239, 68, 68, 0.18)",
            border: "1px solid #ef4444",
            borderRadius: 12,
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 10,
            color: "#fca5a5"
          }}
        >
          <AlertCircle size={20} style={{ color: "#ef4444", flexShrink: 0 }} />
          <span style={{ fontSize: "0.88rem" }}>{errorMsg}</span>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 1: REPORT A HAZARD FORM                                           */}
      {/* ===================================================================== */}
      {activeTab === "report" && (
        <form onSubmit={handleSubmit}>
          {/* STEP 1: CATEGORY SELECTOR CARDS */}
          <div className="card" style={{ marginBottom: 20, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <b style={{ fontSize: "1.05rem", color: "#fff" }}>
                  1. Select Hazard / Incident Category
                </b>
                <div className="mut" style={{ fontSize: "0.82rem" }}>
                  Choose the category that best describes the safety concern.
                </div>
              </div>
              <span
                style={{
                  fontSize: "0.78rem",
                  color: "#c084fc",
                  background: "rgba(168, 85, 247, 0.15)",
                  padding: "4px 10px",
                  borderRadius: 8,
                  fontWeight: 600
                }}
              >
                Required
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                gap: 12
              }}
            >
              {CATEGORIES_DATA.map(cat => {
                const isSelected = category === cat.id;
                const IconComponent = cat.icon;
                return (
                  <div
                    key={cat.id}
                    onClick={() => setCategory(cat.id)}
                    style={{
                      background: isSelected
                        ? `linear-gradient(135deg, ${cat.accent}, rgba(15, 23, 42, 0.8))`
                        : "rgba(15, 23, 42, 0.5)",
                      border: isSelected ? `2px solid ${cat.border}` : "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: 14,
                      padding: "16px",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      boxShadow: isSelected ? `0 0 16px ${cat.border}44` : "none",
                      position: "relative"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 10,
                          background: cat.accent,
                          color: cat.color,
                          display: "grid",
                          placeItems: "center",
                          flexShrink: 0
                        }}
                      >
                        <IconComponent size={22} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <b style={{ color: isSelected ? "#fff" : "#e2e8f0", fontSize: "0.94rem" }}>
                            {cat.label}
                          </b>
                          {isSelected && (
                            <span
                              style={{
                                width: 20,
                                height: 20,
                                borderRadius: "50%",
                                background: cat.color,
                                color: "#000",
                                display: "grid",
                                placeItems: "center",
                                fontSize: "12px",
                                fontWeight: 900
                              }}
                            >
                              ✓
                            </span>
                          )}
                        </div>
                        <p style={{ margin: "4px 0 0", fontSize: "0.78rem", color: "#94a3b8", lineHeight: 1.4 }}>
                          {cat.desc}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {fieldErrors.category && <div className="err" style={{ marginTop: 8 }}>{fieldErrors.category}</div>}
          </div>

          {/* STEP 2: THREAT & SEVERITY LEVEL */}
          <div className="card" style={{ marginBottom: 20, padding: 24 }}>
            <div style={{ marginBottom: 12 }}>
              <b style={{ fontSize: "1.05rem", color: "#fff" }}>
                2. Threat &amp; Severity Level
              </b>
              <div className="mut" style={{ fontSize: "0.82rem" }}>
                Rate how urgently this hazard impacts safety.
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
              {[
                {
                  level: 1,
                  title: "Level 1: Minor Caution",
                  desc: "Single broken lamp, damaged pavement, low immediate danger.",
                  color: "#eab308",
                  bg: "rgba(234, 179, 8, 0.15)"
                },
                {
                  level: 2,
                  title: "Level 2: Moderate Hazard",
                  desc: "Unlit stretch, deserted alley, suspicious loitering after dark.",
                  color: "#f97316",
                  bg: "rgba(249, 115, 22, 0.15)"
                },
                {
                  level: 3,
                  title: "Level 3: Critical Threat",
                  desc: "Active stalking, aggressive harassment, urgent threat to commuters.",
                  color: "#ef4444",
                  bg: "rgba(239, 68, 68, 0.18)"
                }
              ].map(s => {
                const isSelected = severity === s.level;
                return (
                  <div
                    key={s.level}
                    onClick={() => setSeverity(s.level)}
                    style={{
                      padding: "14px 16px",
                      borderRadius: 12,
                      background: isSelected ? s.bg : "rgba(15, 23, 42, 0.4)",
                      border: isSelected ? `2px solid ${s.color}` : "1px solid rgba(255, 255, 255, 0.08)",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      boxShadow: isSelected ? `0 0 14px ${s.color}33` : "none"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                      <b style={{ color: isSelected ? s.color : "#cbd5e1", fontSize: "0.88rem" }}>
                        {s.title}
                      </b>
                      {isSelected && <span style={{ color: s.color, fontWeight: 800 }}>● Active</span>}
                    </div>
                    <div style={{ fontSize: "0.76rem", color: "#94a3b8" }}>{s.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* STEP 3: INTERACTIVE LOCATION & MAP PICKER */}
          <div className="card" style={{ marginBottom: 20, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
              <div>
                <b style={{ fontSize: "1.05rem", color: "#fff" }}>
                  3. Hazard Location &amp; Interactive Map Pin
                </b>
                <div className="mut" style={{ fontSize: "0.82rem" }}>
                  Click anywhere on the map or tap "Use My GPS" to pin the exact hazard coordinates.
                </div>
              </div>

              <button
                type="button"
                onClick={handleDetectLocation}
                disabled={isLocating}
                className="btn sm"
                style={{
                  background: "linear-gradient(90deg, #10b981, #059669)",
                  color: "#fff",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontWeight: 700
                }}
              >
                <LocateFixed size={15} /> {isLocating ? "Acquiring GPS..." : "Detect My Current GPS"}
              </button>
            </div>

            {/* Quick Kolhapur Landmark Chips */}
            <div style={{ marginBottom: 14 }}>
              <span className="mut" style={{ fontSize: "0.76rem", display: "block", marginBottom: 6 }}>
                ⚡ Quick Kolhapur Landmarks:
              </span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {KOLHAPUR_HOTSPOTS.map(lm => (
                  <button
                    key={lm.label}
                    type="button"
                    onClick={() => handleSelectLandmark(lm)}
                    className="btn ghost sm"
                    style={{
                      fontSize: "0.74rem",
                      padding: "4px 10px",
                      background: locationLabel === lm.label ? "rgba(99, 102, 241, 0.25)" : "rgba(255, 255, 255, 0.04)",
                      borderColor: locationLabel === lm.label ? "#818cf8" : "rgba(255, 255, 255, 0.1)"
                    }}
                  >
                    📍 {lm.label.split("(")[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive Leaflet Map for Pinning */}
            <div
              style={{
                height: 280,
                borderRadius: 14,
                overflow: "hidden",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                marginBottom: 14,
                position: "relative"
              }}
            >
              <MapContainer
                center={initialMapCenter}
                zoom={14}
                style={{ width: "100%", height: "100%" }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapClickPicker position={mapPinPos} onPick={handleMapPick} />
                {mapPinPos && <MapPanController center={mapPinPos} />}
              </MapContainer>

              <div
                style={{
                  position: "absolute",
                  bottom: 10,
                  left: 10,
                  background: "rgba(15, 23, 42, 0.85)",
                  padding: "4px 10px",
                  borderRadius: 8,
                  fontSize: "0.74rem",
                  color: "#cbd5e1",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  zIndex: 1000,
                  pointerEvents: "none"
                }}
              >
                👆 Click map to drop hazard pin
              </div>
            </div>

            {/* Inputs: Place Name & Coordinates */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontSize: "0.8rem", color: "#cbd5e1", display: "block", marginBottom: 4 }}>
                  Place / Street Landmark Description
                </label>
                <input
                  type="text"
                  name="location_label"
                  value={locationLabel}
                  onChange={e => setLocationLabel(e.target.value)}
                  placeholder="e.g. Near CBS Bus Stop, Behind Rankala Chaupati"
                  style={{ width: "100%" }}
                />
              </div>

              <div>
                <label style={{ fontSize: "0.8rem", color: "#cbd5e1", display: "block", marginBottom: 4 }}>
                  Latitude
                </label>
                <input
                  type="number"
                  step="any"
                  name="lat"
                  value={lat}
                  onChange={e => setLat(e.target.value)}
                  placeholder="16.7042"
                  style={{ width: "100%" }}
                />
              </div>

              <div>
                <label style={{ fontSize: "0.8rem", color: "#cbd5e1", display: "block", marginBottom: 4 }}>
                  Longitude
                </label>
                <input
                  type="number"
                  step="any"
                  name="lng"
                  value={lng}
                  onChange={e => setLng(e.target.value)}
                  placeholder="74.2435"
                  style={{ width: "100%" }}
                />
              </div>
            </div>

            {/* Designated Jurisdictional Police Station Indicator */}
            {(() => {
              const assignedPs = getPoliceStationForPoint(lat, lng, locationLabel);
              return (
                <div
                  style={{
                    marginTop: 16,
                    padding: "12px 16px",
                    background: "linear-gradient(135deg, rgba(30, 58, 138, 0.35), rgba(15, 23, 42, 0.7))",
                    border: "1px solid rgba(59, 130, 246, 0.4)",
                    borderRadius: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 12
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: "rgba(59, 130, 246, 0.2)",
                      color: "#60a5fa",
                      display: "grid",
                      placeItems: "center",
                      fontSize: "20px",
                      flexShrink: 0
                    }}
                  >
                    🚔
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <b style={{ color: "#93c5fd", fontSize: "0.92rem" }}>
                        Designated Police Station: {assignedPs.name}
                      </b>
                      <span
                        style={{
                          fontSize: "0.7rem",
                          background: "rgba(59, 130, 246, 0.25)",
                          color: "#bfdbfe",
                          padding: "2px 8px",
                          borderRadius: 6,
                          fontWeight: 700
                        }}
                      >
                        {assignedPs.zone || "Kolhapur Police Jurisdiction"}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: 3 }}>
                      📍 {assignedPs.address} • 📞 Police Desk: <b>{assignedPs.phone}</b> (National Emergency: 112 / 1091)
                      {assignedPs.distance_m && (
                        <span style={{ color: "#38bdf8", marginLeft: 6 }}>
                          • ~{(assignedPs.distance_m / 1000).toFixed(1)} km from selected location
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* STEP 4: INCIDENT TIME & SMART SHORTCUTS */}
          <div className="card" style={{ marginBottom: 20, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
              <div>
                <b style={{ fontSize: "1.05rem", color: "#fff" }}>
                  4. Incident Date &amp; Time
                </b>
                <div className="mut" style={{ fontSize: "0.82rem" }}>
                  When did this hazard occur or when was it observed?
                </div>
              </div>

              {/* Time Shortcut Buttons */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => handleTimeShortcut(0)}
                  className="btn ghost sm"
                  style={{ fontSize: "0.72rem", padding: "3px 8px" }}
                >
                  ⚡ Just Now
                </button>
                <button
                  type="button"
                  onClick={() => handleTimeShortcut(15)}
                  className="btn ghost sm"
                  style={{ fontSize: "0.72rem", padding: "3px 8px" }}
                >
                  15m Ago
                </button>
                <button
                  type="button"
                  onClick={() => handleTimeShortcut(60)}
                  className="btn ghost sm"
                  style={{ fontSize: "0.72rem", padding: "3px 8px" }}
                >
                  1h Ago
                </button>
                <button
                  type="button"
                  onClick={() => handleTimeShortcut(720)}
                  className="btn ghost sm"
                  style={{ fontSize: "0.72rem", padding: "3px 8px" }}
                >
                  Yesterday
                </button>
              </div>
            </div>

            <input
              type="datetime-local"
              name="incident_time"
              value={incidentTime}
              onChange={e => setIncidentTime(e.target.value)}
              style={{ maxWidth: 320 }}
            />
            {fieldErrors.incident_time && <div className="err">{fieldErrors.incident_time}</div>}
          </div>

          {/* STEP 5: DESCRIPTION & SUGGESTION PROMPTS */}
          <div className="card" style={{ marginBottom: 20, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div>
                <b style={{ fontSize: "1.05rem", color: "#fff" }}>
                  5. Detailed Hazard Description
                </b>
                <div className="mut" style={{ fontSize: "0.82rem" }}>
                  Explain the conditions, individuals involved, or environmental risks (minimum 10 characters).
                </div>
              </div>
              <span
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  color: description.length >= 10 ? "#10b981" : "#ef4444"
                }}
              >
                {description.length} / 10 min chars
              </span>
            </div>

            {/* Quick Prompt Pills */}
            <div style={{ marginBottom: 10 }}>
              <span className="mut" style={{ fontSize: "0.75rem", display: "block", marginBottom: 6 }}>
                💡 Click a pre-filled phrase to insert:
              </span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {SUGGESTED_PROMPTS.map((pr, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setDescription(prev => (prev ? prev + " " + pr : pr))}
                    className="btn ghost sm"
                    style={{
                      fontSize: "0.72rem",
                      padding: "3px 8px",
                      background: "rgba(255, 255, 255, 0.03)",
                      textAlign: "left"
                    }}
                  >
                    + {pr.length > 50 ? pr.slice(0, 48) + "..." : pr}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              name="description"
              rows={4}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Provide a clear description of the safety hazard, what you experienced, lighting conditions, or behavior observed..."
              style={{ width: "100%", fontSize: "0.92rem", lineHeight: 1.5 }}
            />
            {fieldErrors.description && <div className="err">{fieldErrors.description}</div>}
          </div>

          {/* STEP 6: DIGITAL EVIDENCE VAULT UPLOADER */}
          <div className="card" style={{ marginBottom: 20, padding: 24 }}>
            <div style={{ marginBottom: 12 }}>
              <b style={{ fontSize: "1.05rem", color: "#fff" }}>
                6. Digital Evidence Vault (Optional)
              </b>
              <div className="mut" style={{ fontSize: "0.82rem" }}>
                Attach supporting photos, audio recordings, video clips, or PDF documents (max 5 files, 10 MB each).
              </div>
            </div>

            {/* Drop Zone Box */}
            <label
              style={{
                display: "block",
                border: "2px dashed rgba(139, 92, 246, 0.4)",
                borderRadius: 14,
                padding: "24px 20px",
                textAlign: "center",
                background: "rgba(139, 92, 246, 0.04)",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
            >
              <UploadCloud size={32} style={{ color: "#a855f7", margin: "0 auto 8px" }} />
              <div style={{ fontWeight: 600, color: "#fff", fontSize: "0.92rem" }}>
                Click to browse or drag &amp; drop evidence files
              </div>
              <div className="mut" style={{ fontSize: "0.78rem", marginTop: 4 }}>
                Accepted Formats: JPG, PNG, MP4, MP3, WAV, PDF (Certified Secure Hash)
              </div>
              <input
                type="file"
                multiple
                accept=".jpg,.jpeg,.png,.mp4,.mp3,.wav,.pdf"
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
            </label>

            {/* Attached Files List */}
            {files.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <span className="mut" style={{ fontSize: "0.76rem", display: "block", marginBottom: 6 }}>
                  Attached Files ({files.length}/5):
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {files.map((fl, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        background: "rgba(15, 23, 42, 0.6)",
                        padding: "8px 12px",
                        borderRadius: 8,
                        border: "1px solid rgba(255, 255, 255, 0.08)"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <FileText size={16} style={{ color: "#a855f7" }} />
                        <span style={{ fontSize: "0.82rem", color: "#e2e8f0" }}>{fl.name}</span>
                        <span className="mut" style={{ fontSize: "0.74rem" }}>
                          ({(fl.size / (1024 * 1024)).toFixed(2)} MB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(idx)}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#ef4444",
                          cursor: "pointer",
                          padding: 4
                        }}
                        title="Remove file"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {fieldErrors.files && <div className="err" style={{ marginTop: 8 }}>{fieldErrors.files}</div>}
          </div>

          {/* STEP 7: PRIVACY GUARANTEE & SUBMISSION */}
          <div
            style={{
              padding: "16px 20px",
              background: "rgba(15, 23, 42, 0.75)",
              border: "1px solid rgba(99, 102, 241, 0.25)",
              borderRadius: 14,
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              gap: 12
            }}
          >
            <Lock size={20} style={{ color: "#10b981", flexShrink: 0 }} />
            <div style={{ fontSize: "0.8rem", color: "#94a3b8", lineHeight: 1.4 }}>
              <b>Citizen Privacy Guarantee:</b> Your personal account identity is strictly confidential.
              Community hazard map pins display approximate location rounded to ~100m to preserve your privacy
              while warning other women travelers.
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn"
            style={{
              width: "100%",
              padding: "14px 24px",
              fontSize: "1rem",
              fontWeight: 800,
              background: "linear-gradient(90deg, #7c3aed, #9333ea, #ec4899)",
              border: "none",
              borderRadius: 12,
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              boxShadow: "0 0 24px rgba(147, 51, 234, 0.4)",
              cursor: isSubmitting ? "wait" : "pointer"
            }}
          >
            {isSubmitting ? (
              <>Submitting Certified Hazard Report...</>
            ) : (
              <>
                <ShieldAlert size={20} /> Submit Certified Safety Report
              </>
            )}
          </button>
        </form>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: LIVE COMMUNITY HAZARD MAP                                      */}
      {/* ===================================================================== */}
      {activeTab === "map" && (
        <div>
          {/* Filter Bar */}
          <div
            className="card"
            style={{
              marginBottom: 16,
              padding: "14px 18px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 10
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Layers size={18} style={{ color: "#a855f7" }} />
              <b style={{ color: "#fff", fontSize: "0.95rem" }}>
                Filter Community Hazards:
              </b>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[
                { id: "all", label: "All Hazards" },
                { id: "Harassment", label: "Harassment" },
                { id: "Poor lighting", label: "Lighting" },
                { id: "Unsafe street or area", label: "Unsafe Streets" },
                { id: "Transport-related concern", label: "Transport" }
              ].map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setMapCategoryFilter(f.id)}
                  className="btn sm"
                  style={{
                    background: mapCategoryFilter === f.id ? "#7c3aed" : "rgba(255, 255, 255, 0.05)",
                    borderColor: mapCategoryFilter === f.id ? "#a855f7" : "rgba(255, 255, 255, 0.12)",
                    color: "#fff",
                    fontSize: "0.76rem"
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Map Container */}
          <div
            style={{
              height: 520,
              borderRadius: 16,
              overflow: "hidden",
              border: "1px solid rgba(139, 92, 246, 0.3)",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
              position: "relative"
            }}
          >
            <MapContainer
              center={[16.705, 74.243]}
              zoom={13}
              style={{ width: "100%", height: "100%" }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {communityPins.map(p => {
                const isVerified = p.status === "verified";
                const pinColor = isVerified ? "#ef4444" : "#f59e0b";
                return (
                  <CircleMarker
                    key={p.id}
                    center={[p.lat, p.lng]}
                    radius={isVerified ? 9 : 7}
                    pathOptions={{
                      color: pinColor,
                      fillColor: pinColor,
                      fillOpacity: 0.7,
                      weight: 2
                    }}
                  >
                    <Popup>
                      <div style={{ padding: 4 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                          <b style={{ color: pinColor }}>{p.category}</b>
                          {p.is_demo && (
                            <span style={{ fontSize: "0.68rem", background: "#f59e0b", color: "#000", padding: "1px 4px", borderRadius: 4, fontWeight: 700 }}>
                              DEMO
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: "0.78rem", color: "#475569" }}>
                          Status: <b>{p.status}</b>
                        </div>
                        <div style={{ fontSize: "0.74rem", color: "#64748b", marginTop: 2 }}>
                          Reported: {p.when ? new Date(p.when).toLocaleDateString() : "Recent"}
                        </div>
                        <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 4, borderTop: "1px solid #e2e8f0", paddingTop: 4 }}>
                          📍 Approx: {p.lat}, {p.lng}
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MapContainer>

            {/* Map Legend */}
            <div
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                background: "rgba(15, 23, 42, 0.9)",
                padding: "8px 14px",
                borderRadius: 10,
                fontSize: "0.76rem",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                zIndex: 1000,
                display: "flex",
                flexDirection: "column",
                gap: 4
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444", display: "inline-block" }} />
                <span style={{ color: "#fca5a5" }}>Verified Threat (Red)</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b", display: "inline-block" }} />
                <span style={{ color: "#fde68a" }}>Under Review (Amber)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: MY SUBMITTED REPORTS & CERTIFIED DOSSIERS                      */}
      {/* ===================================================================== */}
      {activeTab === "history" && (
        <div>
          {/* Search & Filter Header */}
          <div
            className="card"
            style={{
              padding: "16px 20px",
              marginBottom: 18,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 260 }}>
              <Search size={18} style={{ color: "#94a3b8" }} />
              <input
                type="text"
                value={historySearch}
                onChange={e => setHistorySearch(e.target.value)}
                placeholder="Search your reports by category, description, or landmark..."
                style={{ width: "100%", background: "transparent", border: "none", outline: "none", color: "#fff", fontSize: "0.88rem" }}
              />
            </div>

            {/* Status Filter Chips */}
            <div style={{ display: "flex", gap: 6 }}>
              {[
                { id: "all", label: "All" },
                { id: "verified", label: "Verified" },
                { id: "pending", label: "Pending" },
                { id: "under_review", label: "Under Review" }
              ].map(st => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setHistoryStatusFilter(st.id)}
                  className="btn sm"
                  style={{
                    background: historyStatusFilter === st.id ? "#7c3aed" : "rgba(255, 255, 255, 0.05)",
                    borderColor: historyStatusFilter === st.id ? "#a855f7" : "rgba(255, 255, 255, 0.1)",
                    color: "#fff",
                    fontSize: "0.74rem",
                    padding: "3px 8px"
                  }}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reports List */}
          {historyItems.length === 0 ? (
            <div
              className="card"
              style={{
                textAlign: "center",
                padding: "48px 20px",
                background: "rgba(15, 23, 42, 0.5)",
                border: "1px dashed rgba(255, 255, 255, 0.15)",
                borderRadius: 16
              }}
            >
              <ShieldAlert size={44} style={{ color: "#64748b", margin: "0 auto 12px" }} />
              <h3 style={{ color: "#fff", marginBottom: 6 }}>No Incident Reports Found</h3>
              <p className="mut" style={{ maxWidth: 450, margin: "0 auto 20px", fontSize: "0.88rem" }}>
                {historySearch || historyStatusFilter !== "all"
                  ? "No reports match your current search and filter criteria."
                  : "You haven't filed any safety hazard reports yet. Report unsafe areas or hazards to protect your community."}
              </p>
              <button
                type="button"
                onClick={() => setActiveTab("report")}
                className="btn"
                style={{ background: "linear-gradient(90deg, #7c3aed, #9333ea)", color: "#fff", fontWeight: 700 }}
              >
                + File Your First Hazard Report
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {historyItems.map(r => {
                const catConf =
                  CATEGORIES_DATA.find(c => c.id === r.category) || CATEGORIES_DATA[0];
                const IconComponent = catConf.icon;

                return (
                  <div
                    key={r.id}
                    className="card"
                    style={{
                      borderLeft: `4px solid ${catConf.color}`,
                      padding: 20,
                      background: "rgba(20, 27, 54, 0.75)",
                      borderRadius: 14
                    }}
                  >
                    {/* Header */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        flexWrap: "wrap",
                        gap: 10,
                        marginBottom: 10
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 8,
                            background: catConf.accent,
                            color: catConf.color,
                            display: "grid",
                            placeItems: "center"
                          }}
                        >
                          <IconComponent size={18} />
                        </div>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <b style={{ color: "#fff", fontSize: "1.05rem" }}>
                              #{r.id} {r.category}
                            </b>
                            <Tag s={r.status} />
                            {r.is_demo && (
                              <span
                                style={{
                                  fontSize: "0.68rem",
                                  background: "rgba(245, 158, 11, 0.15)",
                                  color: "#fbbf24",
                                  padding: "2px 6px",
                                  borderRadius: 4,
                                  fontWeight: 700
                                }}
                              >
                                DEMO
                              </span>
                            )}
                          </div>
                          <div className="mut" style={{ fontSize: "0.76rem" }}>
                            Submitted: {new Date(r.created_at + "Z").toLocaleString()}
                          </div>
                        </div>
                      </div>

                      {/* Severity Badge */}
                      <div
                        style={{
                          fontSize: "0.76rem",
                          padding: "3px 8px",
                          borderRadius: 6,
                          background:
                            r.severity === 3
                              ? "rgba(239, 68, 68, 0.2)"
                              : r.severity === 1
                              ? "rgba(234, 179, 8, 0.2)"
                              : "rgba(249, 115, 22, 0.2)",
                          color:
                            r.severity === 3
                              ? "#ef4444"
                              : r.severity === 1
                              ? "#eab308"
                              : "#f97316",
                          fontWeight: 700
                        }}
                      >
                        Severity: Level {r.severity || 2}
                      </div>
                    </div>

                    {/* Description */}
                    <p style={{ margin: "0 0 10px", color: "#e2e8f0", fontSize: "0.9rem", lineHeight: 1.5 }}>
                      {r.description}
                    </p>

                    {/* Location & Time Metadata */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                        flexWrap: "wrap",
                        fontSize: "0.8rem",
                        color: "#94a3b8",
                        marginBottom: 10
                      }}
                    >
                      <span>
                        📍 <b>{r.location_label || "Location Landmark"}</b>{" "}
                        {r.lat && r.lng ? `(${Number(r.lat).toFixed(4)}, ${Number(r.lng).toFixed(4)})` : ""}
                      </span>
                      {r.incident_time && (
                        <span>
                          🕒 Incident: {new Date(r.incident_time).toLocaleString()}
                        </span>
                      )}
                    </div>

                    {/* Designated Police Station Submission Banner */}
                    {(() => {
                      const repPs = r.police_station || getPoliceStationForPoint(r.lat, r.lng, r.location_label);
                      return (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            flexWrap: "wrap",
                            gap: 10,
                            padding: "10px 14px",
                            background: "linear-gradient(135deg, rgba(30, 58, 138, 0.3), rgba(15, 23, 42, 0.6))",
                            border: "1px solid rgba(59, 130, 246, 0.35)",
                            borderRadius: 10,
                            marginBottom: 12
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div
                              style={{
                                width: 34,
                                height: 34,
                                borderRadius: "50%",
                                background: "rgba(59, 130, 246, 0.2)",
                                color: "#60a5fa",
                                display: "grid",
                                placeItems: "center",
                                fontSize: "17px",
                                flexShrink: 0
                              }}
                            >
                              🚔
                            </div>
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                <b style={{ color: "#93c5fd", fontSize: "0.88rem" }}>
                                  Submitted to: {repPs.name}
                                </b>
                                <span
                                  style={{
                                    fontSize: "0.68rem",
                                    background: "rgba(16, 185, 129, 0.15)",
                                    color: "#34d399",
                                    border: "1px solid rgba(16, 185, 129, 0.3)",
                                    padding: "1px 6px",
                                    borderRadius: 4,
                                    fontWeight: 700
                                  }}
                                >
                                  Jurisdiction Assigned
                                </span>
                              </div>
                              <div style={{ fontSize: "0.76rem", color: "#94a3b8", marginTop: 2 }}>
                                📍 {repPs.address}
                                {repPs.distance_m && (
                                  <span style={{ color: "#38bdf8" }}>
                                    {" "}• ~{(repPs.distance_m / 1000).toFixed(1)} km from incident spot
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <a
                              href={`tel:${(repPs.phone || "112").replace(/-/g, "")}`}
                              className="btn sm"
                              style={{
                                fontSize: "0.75rem",
                                padding: "4px 10px",
                                background: "rgba(59, 130, 246, 0.2)",
                                borderColor: "#3b82f6",
                                color: "#bfdbfe",
                                textDecoration: "none",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 5,
                                fontWeight: 700
                              }}
                              title="Call Police Station Desk"
                            >
                              📞 Call Police: {repPs.phone || "112"}
                            </a>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Official Review Feedback Note */}
                    {r.review_reason && (
                      <div
                        style={{
                          background: "rgba(168, 85, 247, 0.12)",
                          border: "1px solid rgba(168, 85, 247, 0.3)",
                          padding: "8px 12px",
                          borderRadius: 8,
                          fontSize: "0.82rem",
                          color: "#e9d5ff",
                          marginBottom: 12
                        }}
                      >
                        <b>Official Review Feedback:</b> {r.review_reason}
                      </div>
                    )}

                    {/* Evidence Files List */}
                    {r.evidence && r.evidence.length > 0 && (
                      <div style={{ marginBottom: 12 }}>
                        <span className="mut" style={{ fontSize: "0.74rem", display: "block", marginBottom: 4 }}>
                          Certified Evidence Files:
                        </span>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {r.evidence.map(ev => (
                            <button
                              key={ev.id}
                              type="button"
                              onClick={() => download("/evidence/" + ev.id, ev.name)}
                              className="btn ghost sm"
                              style={{
                                fontSize: "0.75rem",
                                padding: "4px 10px",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6
                              }}
                            >
                              <FileDown size={13} style={{ color: "#a855f7" }} />
                              {ev.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Footer Actions */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        borderTop: "1px solid rgba(255, 255, 255, 0.06)",
                        paddingTop: 12,
                        marginTop: 6
                      }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          download(
                            "/pdf/incident/" + r.id,
                            `abhaya_incident_dossier_${r.id}.pdf`
                          )
                        }
                        className="btn sm"
                        style={{
                          background: "linear-gradient(135deg, #7c3aed, #9333ea)",
                          color: "#fff",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          fontWeight: 700,
                          fontSize: "0.8rem",
                          padding: "6px 14px"
                        }}
                      >
                        <FileDown size={15} /> Download Official PDF Dossier
                      </button>

                      <button
                        type="button"
                        onClick={() => handleWithdraw(r.id)}
                        className="btn red sm"
                        style={{ fontSize: "0.78rem", padding: "4px 10px" }}
                      >
                        <Trash2 size={13} /> Withdraw
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
