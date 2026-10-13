import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap, Tooltip } from "react-leaflet";
import {
  Shield, ShieldCheck, MapPin, Phone, PhoneCall, Navigation,
  Compass, Search, Crosshair, Clock, ExternalLink, Share2, Copy,
  Check, AlertTriangle, HeartHandshake, Flame, Fuel, Bus,
  Building2, Sparkles, Filter, CheckCircle2, Info, RefreshCw, X, Radio
} from "lucide-react";
import { api } from "./api.js";

const DEFAULT_CENTER = [16.705, 74.243]; // Kolhapur City Center

// Kolhapur Landmark Quick Picks
const LANDMARKS = [
  { name: "KIT College", pt: [16.6539, 74.2617], tag: "Gokul Shirgaon" },
  { name: "Shivaji University", pt: [16.6775, 74.2546], tag: "Vidyanagar" },
  { name: "Central Bus Stand (CBS)", pt: [16.7042, 74.2435], tag: "Shahupuri" },
  { name: "Railway Station (CSMT)", pt: [16.7028, 74.2405], tag: "Station Rd" },
  { name: "Rankala Lake", pt: [16.6890, 74.2180], tag: "West Kolhapur" },
  { name: "Rajarampuri", pt: [16.6912, 74.2482], tag: "Central Hub" },
  { name: "Cyber Chowk", pt: [16.6820, 74.2508], tag: "University Rd" }
];

// Categories definition
const CATEGORIES = [
  { id: "all", label: "All Safe Facilities", icon: ShieldCheck, color: "#8b5cf6", bg: "rgba(139, 92, 246, 0.15)" },
  { id: "police", label: "Police & Outposts", icon: Shield, color: "#3b82f6", bg: "rgba(59, 130, 246, 0.15)" },
  { id: "women_help", label: "Women Crisis & Shelters", icon: HeartHandshake, color: "#d946ef", bg: "rgba(217, 70, 239, 0.15)" },
  { id: "hospital", label: "24/7 Hospitals & Trauma", icon: Building2, color: "#ef4444", bg: "rgba(239, 68, 68, 0.15)" },
  { id: "pharmacy", label: "Pharmacies & First Aid", icon: Sparkles, color: "#10b981", bg: "rgba(16, 185, 129, 0.15)" },
  { id: "transit", label: "Transit Hubs (Bus/Rail)", icon: Bus, color: "#06b6d4", bg: "rgba(6, 182, 212, 0.15)" },
  { id: "fuel", label: "Lit Havens & Fuel", icon: Fuel, color: "#f59e0b", bg: "rgba(245, 158, 11, 0.15)" },
  { id: "fire", label: "Fire & Rescue", icon: Flame, color: "#f97316", bg: "rgba(249, 115, 22, 0.15)" }
];

// Quick Helplines
const HELPLINES = [
  { num: "112", label: "National Emergency", tag: "Police / Fire / Ambulance", color: "#ef4444" },
  { num: "1091", label: "Women Helpline", tag: "24x7 Mahila Help", color: "#d946ef" },
  { num: "108", label: "Medical Ambulance", tag: "Govt Trauma Care", color: "#10b981" },
  { num: "181", label: "Women in Distress", tag: "Sakhi Crisis Center", color: "#a855f7" },
  { num: "101", label: "Fire Rescue", tag: "Emergency Extraction", color: "#f97316" }
];

// Radius presets (in meters)
const RADIUS_OPTIONS = [
  { label: "1 km", value: 1000, desc: "Walking" },
  { label: "3 km", value: 3000, desc: "Quick Reach" },
  { label: "5 km", value: 5000, desc: "Standard City" },
  { label: "10 km", value: 10000, desc: "Perimeter" },
  { label: "15 km", value: 15000, desc: "Extended" }
];

// Helper: Map view controller for smooth panning & fitting
function MapController({ center, selectedPlace, items }) {
  const map = useMap();
  useEffect(() => {
    if (selectedPlace) {
      map.flyTo([selectedPlace.lat, selectedPlace.lng], 16, { duration: 1.0 });
    }
  }, [selectedPlace, map]);

  useEffect(() => {
    if (!selectedPlace && items?.length && center) {
      const bounds = [center, ...items.slice(0, 10).map(i => [i.lat, i.lng])];
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [center, items, selectedPlace, map]);

  return null;
}

export default function NearbyHelp() {
  const navigate = useNavigate();
  const [userPos, setUserPos] = useState(DEFAULT_CENTER);
  const [searchCenter, setSearchCenter] = useState(DEFAULT_CENTER);
  const [locationLabel, setLocationLabel] = useState("Kolhapur City Center");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [radiusM, setRadiusM] = useState(5000);
  const [items, setItems] = useState([]);
  const [categoryCounts, setCategoryCounts] = useState({});
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [sourceInfo, setSourceInfo] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [cardFilterQuery, setCardFilterQuery] = useState("");
  const [open247Only, setOpen247Only] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [callModalPlace, setCallModalPlace] = useState(null);
  const [toastMessage, setToastMessage] = useState("");

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3200);
  };

  // Fetch nearby items
  const fetchNearby = async (coords, cat = selectedCategory, rad = radiusM) => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await api(`/nearby?lat=${coords[0]}&lng=${coords[1]}&category=${cat}&radius=${rad}`);
      setItems(res.items || []);
      setCategoryCounts(res.counts || {});
      setSourceInfo(res.source || "");
      if (!res.items || res.items.length === 0) {
        setErrorMsg(`No emergency facilities found within ${(rad / 1000).toFixed(0)} km.`);
      }
    } catch (err) {
      setErrorMsg(err.message || "Failed to retrieve nearby emergency facilities.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchNearby(searchCenter, selectedCategory, radiusM);
  }, []);

  // Category switch
  const handleCategorySelect = (catId) => {
    setSelectedCategory(catId);
    fetchNearby(searchCenter, catId, radiusM);
  };

  // Radius switch
  const handleRadiusSelect = (radVal) => {
    setRadiusM(radVal);
    fetchNearby(searchCenter, selectedCategory, radVal);
  };

  // Use live GPS
  const handleUseLiveGPS = () => {
    if (!navigator.geolocation) {
      showToast("Geolocation is not supported by your browser.");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const pt = [pos.coords.latitude, pos.coords.longitude];
        setUserPos(pt);
        setSearchCenter(pt);
        setLocationLabel("Live GPS Location");
        fetchNearby(pt, selectedCategory, radiusM);
        showToast("📍 Located at your current coordinates!");
      },
      (err) => {
        setLoading(false);
        showToast("GPS Permission Denied. Using Kolhapur Default.");
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Pick preset landmark
  const handlePickLandmark = (lm) => {
    setSearchCenter(lm.pt);
    setLocationLabel(lm.name);
    fetchNearby(lm.pt, selectedCategory, radiusM);
    showToast(`📍 Set search center to ${lm.name}`);
  };

  // Manual search address / landmark geocode
  const handleManualSearch = async (e) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const q = searchQuery.toLowerCase().includes("kolhapur") ? searchQuery : `${searchQuery}, Kolhapur`;
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=in&q=${encodeURIComponent(q)}`;
      const res = await (await fetch(url)).json();
      if (res && res[0]) {
        const pt = [+res[0].lat, +res[0].lon];
        setSearchCenter(pt);
        setLocationLabel(res[0].display_name.split(",")[0]);
        fetchNearby(pt, selectedCategory, radiusM);
        showToast(`📍 Located: ${res[0].display_name.split(",")[0]}`);
      } else {
        showToast("Place not found. Try landmark or college name.");
      }
    } catch (err) {
      showToast("Error locating address.");
    } finally {
      setLoading(false);
    }
  };

  // Copy place information
  const handleCopyPlaceInfo = (item) => {
    const text = `🚨 ABHAYA Emergency Facility\nName: ${item.name}\nType: ${item.type_label}\nPhone: ${item.phone}${item.alt_phone ? " / " + item.alt_phone : ""}\nAddress: ${item.address || "Kolhapur"}\nDirections: ${item.directions}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      showToast("📋 Facility info & helpline copied to clipboard!");
    } else {
      showToast(`Phone: ${item.phone}`);
    }
  };

  // Route straight to Live Journey Guardian
  const handleNavigateWithGuardian = (item) => {
    try {
      sessionStorage.setItem("abhaya_guardian_dest", JSON.stringify({
        lat: item.lat,
        lng: item.lng,
        name: item.name,
        address: item.address
      }));
    } catch (_) {}
    navigate("/guardian");
  };

  // Filtered items based on search query in list, open247, and verified
  const displayedItems = useMemo(() => {
    return items.filter(item => {
      if (open247Only && !item.open_247) return false;
      if (verifiedOnly && !item.verified) return false;
      if (cardFilterQuery.trim()) {
        const q = cardFilterQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesType = (item.type_label || "").toLowerCase().includes(q);
        const matchesAddr = (item.address || "").toLowerCase().includes(q);
        const matchesServices = (item.services || []).some(s => s.toLowerCase().includes(q));
        if (!matchesName && !matchesType && !matchesAddr && !matchesServices) return false;
      }
      return true;
    });
  }, [items, open247Only, verifiedOnly, cardFilterQuery]);

  const getCategoryColor = (cat) => {
    const found = CATEGORIES.find(c => c.id === cat);
    return found ? found.color : "#8b5cf6";
  };

  return (
    <div className="nearby-help-page">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="nearby-toast">
          <Info size={18} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="nearby-header-card">
        <div className="nearby-header-main">
          <div className="nearby-title-badge">
            <Radio size={14} className="radar-pulse-icon" />
            <span>24/7 ACTIVE GUARDIAN GRID</span>
          </div>
          <h1>
            Nearby <span className="grad">Emergency & Safe Havens</span>
          </h1>
          <p className="nearby-subtitle">
            Instant 1-tap dial, GPS routing, and verified locations for police chowkis, 24/7 civil trauma centers, women crisis shelters, night chemists, and illuminated transit hubs.
          </p>
        </div>

        {/* Quick Dial Helpline Strip */}
        <div className="helpline-strip">
          <div className="helpline-strip-title">
            <PhoneCall size={16} />
            <span>NATIONAL & STATE EMERGENCY HELPLINES (1-TAP CALL):</span>
          </div>
          <div className="helpline-buttons-row">
            {HELPLINES.map(hl => (
              <a
                key={hl.num}
                href={`tel:${hl.num}`}
                className="helpline-pill"
                style={{ borderColor: hl.color }}
                title={`Call ${hl.label} (${hl.num})`}
              >
                <span className="hl-num" style={{ background: hl.color }}>{hl.num}</span>
                <div className="hl-info">
                  <span className="hl-name">{hl.label}</span>
                  <span className="hl-desc">{hl.tag}</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Control Panel: Location Search & Landmarks */}
      <div className="nearby-controls-bar">
        <div className="location-search-row">
          <button
            className={`btn-location-gps ${loading ? "busy" : ""}`}
            onClick={handleUseLiveGPS}
            title="Locate me with high accuracy GPS"
          >
            <Crosshair size={18} />
            <span>Use My Live Location</span>
          </button>

          <form className="nearby-search-form" onSubmit={handleManualSearch}>
            <Search size={18} className="search-input-icon" />
            <input
              type="text"
              placeholder="Search Kolhapur landmark, area or campus..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit" className="btn-search-go">
              Locate
            </button>
          </form>

          <div className="active-center-pill">
            <MapPin size={15} />
            <span className="active-center-text">{locationLabel}</span>
          </div>
        </div>

        {/* Landmark Quick Chips */}
        <div className="landmarks-quick-row">
          <span className="landmarks-label">Quick City Hubs:</span>
          <div className="landmarks-scroll">
            {LANDMARKS.map(lm => (
              <button
                key={lm.name}
                className={`landmark-chip ${locationLabel === lm.name ? "active" : ""}`}
                onClick={() => handlePickLandmark(lm)}
              >
                <Compass size={13} />
                <span>{lm.name}</span>
                <small>{lm.tag}</small>
              </button>
            ))}
          </div>
        </div>

        {/* Category Pills Selector */}
        <div className="category-chips-section">
          <div className="category-scroll-container">
            {CATEGORIES.map(cat => {
              const IconComp = cat.icon;
              const count = categoryCounts[cat.id] ?? (cat.id === "all" ? items.length : 0);
              const isActive = selectedCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  className={`category-pill ${isActive ? "active" : ""}`}
                  onClick={() => handleCategorySelect(cat.id)}
                  style={{
                    borderColor: isActive ? cat.color : "rgba(255, 255, 255, 0.12)",
                    background: isActive ? cat.bg : "rgba(18, 25, 48, 0.6)"
                  }}
                >
                  <IconComp size={16} style={{ color: cat.color }} />
                  <span className="pill-name">{cat.label}</span>
                  {count > 0 && (
                    <span
                      className="pill-count"
                      style={{
                        background: isActive ? cat.color : "rgba(255, 255, 255, 0.15)",
                        color: isActive ? "#fff" : "var(--tx)"
                      }}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Radius Filter & Distance Chips */}
        <div className="radius-filter-row">
          <div className="radius-filter-left">
            <span className="filter-title">Search Perimeter:</span>
            <div className="radius-chips">
              {RADIUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  className={`radius-chip ${radiusM === opt.value ? "active" : ""}`}
                  onClick={() => handleRadiusSelect(opt.value)}
                >
                  <span className="rad-val">{opt.label}</span>
                  <small className="rad-desc">{opt.desc}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="toggles-right">
            <label className="toggle-chip">
              <input
                type="checkbox"
                checked={open247Only}
                onChange={(e) => setOpen247Only(e.target.checked)}
              />
              <Clock size={14} />
              <span>24/7 Open Only</span>
            </label>

            <label className="toggle-chip">
              <input
                type="checkbox"
                checked={verifiedOnly}
                onChange={(e) => setVerifiedOnly(e.target.checked)}
              />
              <ShieldCheck size={14} />
              <span>Verified Only</span>
            </label>
          </div>
        </div>
      </div>

      {/* Main Split Layout: Directory Cards on Left, Interactive Map on Right */}
      <div className="nearby-main-split">
        {/* Left Column: Place Cards List */}
        <div className="nearby-list-column">
          {/* List Header and Filter Search */}
          <div className="list-status-header">
            <div className="list-counts">
              <span className="highlight-count">{displayedItems.length}</span>
              <span>
                safe facilities found within {(radiusM / 1000).toFixed(0)} km
              </span>
            </div>

            <div className="list-search-box">
              <Filter size={14} />
              <input
                type="text"
                placeholder="Filter results by name or service..."
                value={cardFilterQuery}
                onChange={(e) => setCardFilterQuery(e.target.value)}
              />
            </div>
          </div>

          {sourceInfo && (
            <div className="source-info-bar">
              <ShieldCheck size={14} />
              <span>Data Provider: {sourceInfo}</span>
            </div>
          )}

          {errorMsg && (
            <div className="nearby-error-alert">
              <AlertTriangle size={18} />
              <span>{errorMsg}</span>
            </div>
          )}

          {loading ? (
            <div className="nearby-loading-box">
              <RefreshCw size={26} className="spin-icon" />
              <p>Scanning safety network within {(radiusM / 1000).toFixed(0)} km...</p>
            </div>
          ) : displayedItems.length === 0 ? (
            <div className="nearby-empty-box">
              <Compass size={40} />
              <h3>No facilities matching your filters</h3>
              <p>Try expanding the radius to 10 km or resetting the 24/7 / category filters.</p>
              <button
                className="btn sm"
                onClick={() => {
                  setOpen247Only(false);
                  setVerifiedOnly(false);
                  setCardFilterQuery("");
                  handleRadiusSelect(10000);
                }}
              >
                Expand Search to 10 km
              </button>
            </div>
          ) : (
            <div className="nearby-cards-scroll">
              {displayedItems.map((item) => {
                const catColor = getCategoryColor(item.category);
                const isSelected = selectedPlace?.id === item.id;

                return (
                  <div
                    key={item.id}
                    className={`facility-card ${isSelected ? "selected" : ""}`}
                    style={{ borderLeftColor: catColor }}
                    onClick={() => setSelectedPlace(item)}
                  >
                    {/* Top Row: Category + Badges */}
                    <div className="card-top-row">
                      <div className="category-tag-badge" style={{ color: catColor, background: `${catColor}20` }}>
                        {item.type_label || item.category.replace("_", " ")}
                      </div>

                      <div className="badges-group">
                        {item.open_247 && (
                          <span className="badge-247">
                            <span className="dot-pulse" /> 24/7 OPEN
                          </span>
                        )}
                        {item.verified && (
                          <span className="badge-verified">
                            <ShieldCheck size={12} /> VERIFIED
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Facility Name & Distance */}
                    <div className="card-title-row">
                      <h3 className="facility-name">{item.name}</h3>
                      <div className="distance-pill">
                        <span className="dist-km">{item.distance_km} km</span>
                      </div>
                    </div>

                    {/* Address */}
                    <p className="facility-address">
                      <MapPin size={14} />
                      <span>{item.address || "Kolhapur, Maharashtra"}</span>
                    </p>

                    {/* ETA Indicators */}
                    <div className="eta-badges-row">
                      <span className="eta-badge">
                        🚶 ~{item.walking_mins} min walk
                      </span>
                      <span className="eta-badge">
                        🚗 ~{item.driving_mins} min drive
                      </span>
                    </div>

                    {/* Key Services Tags */}
                    {item.services && item.services.length > 0 && (
                      <div className="services-tags-row">
                        {item.services.slice(0, 4).map((srv, idx) => (
                          <span key={idx} className="service-tag">
                            {srv}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Action Toolbar */}
                    <div className="card-actions-toolbar" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="btn-action call-btn"
                        onClick={() => setCallModalPlace(item)}
                        title={`Call ${item.name}`}
                      >
                        <PhoneCall size={15} />
                        <span>Call</span>
                      </button>

                      <a
                        href={item.directions}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-action dir-btn"
                        title="Open Google Maps Directions"
                      >
                        <Navigation size={15} />
                        <span>Directions</span>
                        <ExternalLink size={12} />
                      </a>

                      <button
                        className="btn-action guard-btn"
                        onClick={() => handleNavigateWithGuardian(item)}
                        title="Route directly with Live Journey Guardian"
                      >
                        <Shield size={14} />
                        <span>Safe Commute</span>
                      </button>

                      <button
                        className="btn-action share-btn"
                        onClick={() => handleCopyPlaceInfo(item)}
                        title="Copy info to share"
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Interactive Leaflet Map */}
        <div className="nearby-map-column">
          <div className="map-wrapper-card">
            <div className="map-floating-overlay">
              <div className="map-legend-pills">
                <span className="legend-item"><span className="legend-dot" style={{ background: "#3b82f6" }} /> Police</span>
                <span className="legend-item"><span className="legend-dot" style={{ background: "#ef4444" }} /> Hospital</span>
                <span className="legend-item"><span className="legend-dot" style={{ background: "#d946ef" }} /> Women Crisis</span>
                <span className="legend-item"><span className="legend-dot" style={{ background: "#10b981" }} /> Pharmacy</span>
                <span className="legend-item"><span className="legend-dot" style={{ background: "#06b6d4" }} /> Transit</span>
                <span className="legend-item"><span className="legend-dot" style={{ background: "#f59e0b" }} /> Safe Haven</span>
              </div>
              <button
                className="map-recenter-btn"
                onClick={() => {
                  setSelectedPlace(null);
                  setSearchCenter([...searchCenter]);
                }}
                title="Reset Map Bounds"
              >
                <Compass size={16} />
                <span>Fit All</span>
              </button>
            </div>

            <MapContainer
              center={searchCenter}
              zoom={13}
              className="nearby-leaflet-map"
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <MapController
                center={searchCenter}
                selectedPlace={selectedPlace}
                items={displayedItems}
              />

              {/* User search center aura */}
              <CircleMarker
                center={searchCenter}
                radius={24}
                pathOptions={{
                  color: "#06b6d4",
                  fillColor: "#06b6d4",
                  fillOpacity: 0.15,
                  weight: 2,
                  dashArray: "4, 4"
                }}
              />
              <CircleMarker
                center={searchCenter}
                radius={8}
                pathOptions={{
                  color: "#ffffff",
                  fillColor: "#06b6d4",
                  fillOpacity: 1,
                  weight: 2.5
                }}
              >
                <Popup>
                  <div className="leaflet-custom-popup">
                    <b>📍 Search Center</b>
                    <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "#64748b" }}>
                      {locationLabel}
                    </p>
                  </div>
                </Popup>
              </CircleMarker>

              {/* Emergency Places Markers */}
              {displayedItems.map((item) => {
                const color = getCategoryColor(item.category);
                const isSelected = selectedPlace?.id === item.id;

                return (
                  <CircleMarker
                    key={item.id}
                    center={[item.lat, item.lng]}
                    radius={isSelected ? 12 : 8}
                    pathOptions={{
                      color: isSelected ? "#ffffff" : color,
                      fillColor: color,
                      fillOpacity: 0.9,
                      weight: isSelected ? 3.5 : 2
                    }}
                    eventHandlers={{
                      click: () => setSelectedPlace(item)
                    }}
                  >
                    <Popup>
                      <div className="leaflet-custom-popup">
                        <div className="popup-category" style={{ color }}>
                          {item.type_label}
                        </div>
                        <h4 className="popup-title">{item.name}</h4>
                        <p className="popup-dist">
                          <b>{item.distance_km} km away</b> • ~{item.walking_mins}m walk
                        </p>
                        {item.address && (
                          <p className="popup-addr">{item.address}</p>
                        )}
                        <div className="popup-actions">
                          <a
                            href={`tel:${item.phone}`}
                            className="popup-btn-call"
                          >
                            <PhoneCall size={13} />
                            <span>Call {item.phone}</span>
                          </a>
                          <a
                            href={item.directions}
                            target="_blank"
                            rel="noreferrer"
                            className="popup-btn-dir"
                          >
                            <Navigation size={13} />
                            <span>Navigate</span>
                          </a>
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          </div>
        </div>
      </div>

      {/* Call Dialog / Modal */}
      {callModalPlace && (
        <div className="nearby-modal-backdrop" onClick={() => setCallModalPlace(null)}>
          <div className="nearby-call-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <PhoneCall size={20} className="modal-phone-icon" />
                <div>
                  <h3>Direct Emergency Call</h3>
                  <p className="modal-subtitle">{callModalPlace.name}</p>
                </div>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setCallModalPlace(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="modal-facility-badge">
                <span className="modal-cat-name" style={{ color: getCategoryColor(callModalPlace.category) }}>
                  {callModalPlace.type_label}
                </span>
                {callModalPlace.open_247 && (
                  <span className="badge-247">
                    <span className="dot-pulse" /> 24/7 OPEN
                  </span>
                )}
              </div>

              <div className="phone-card primary-phone">
                <div className="phone-info">
                  <span className="phone-type">PRIMARY HELPLINE / DISPATCH</span>
                  <span className="phone-number">{callModalPlace.phone}</span>
                </div>
                <a
                  href={`tel:${callModalPlace.phone}`}
                  className="btn-call-trigger"
                >
                  <PhoneCall size={18} />
                  <span>Call Now</span>
                </a>
              </div>

              {callModalPlace.alt_phone && (
                <div className="phone-card alt-phone">
                  <div className="phone-info">
                    <span className="phone-type">SECONDARY / BACKUP NUMBER</span>
                    <span className="phone-number">{callModalPlace.alt_phone}</span>
                  </div>
                  <a
                    href={`tel:${callModalPlace.alt_phone}`}
                    className="btn-call-trigger secondary"
                  >
                    <Phone size={18} />
                    <span>Call Backup</span>
                  </a>
                </div>
              )}

              <div className="modal-safety-notice">
                <ShieldCheck size={16} />
                <span>
                  All calls to 112, 1091, 108, and Sakhi 181 are priority-routed and toll-free across Maharashtra.
                </span>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn ghost sm"
                onClick={() => handleCopyPlaceInfo(callModalPlace)}
              >
                <Copy size={14} />
                <span>Copy Full Info</span>
              </button>
              <button
                className="btn sm"
                onClick={() => setCallModalPlace(null)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

