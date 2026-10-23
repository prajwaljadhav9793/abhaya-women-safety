import React, { useEffect, useRef, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, CircleMarker, Polyline, Popup, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import {
  Shield, ShieldCheck, ShieldAlert, Navigation, MapPin, Clock,
  ArrowLeftRight, AlertTriangle, AlertCircle, Info, RefreshCw,
  Crosshair, ExternalLink, Sparkles, Building2, Layers, Search, X, Check, Compass
} from "lucide-react";
import { api } from "./api.js";
import { MAP_TILE_ATTRIBUTION, MAP_TILE_URL } from "./mapTiles.js";

// Clean custom Leaflet pin icons
const createPinIcon = (color, label = "") => L.divIcon({
  className: "custom-map-pin",
  html: `<div style="
    background: ${color};
    width: 24px;
    height: 24px;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    border: 2px solid #fff;
    box-shadow: 0 0 10px ${color};
    display: flex;
    align-items: center;
    justify-content: center;
  "><div style="width: 7px; height: 7px; background: #fff; border-radius: 50%; transform: rotate(45deg);"></div></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 24],
  popupAnchor: [0, -24]
});

const originIcon = createPinIcon("#10b981");
const destIcon = createPinIcon("#ef4444");

// Map bounds auto-fit controller
function MapBoundsController({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords && coords.length > 0) {
      try {
        const bounds = L.latLngBounds(coords);
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
      } catch (err) {
        console.warn("Could not fit bounds:", err);
      }
    }
  }, [coords, map]);
  return null;
}

// Geographic bounding box for India (mainland + islands: ~6.0N-37.5N, 68.0E-97.5E)
export const isWithinIndia = (lat, lng) => {
  return lat >= 6.0 && lat <= 37.5 && lng >= 68.0 && lng <= 97.5;
};

// Curated Kolhapur Places Gazetteer (Instant 0ms matching for local colleges, stations & landmarks)
export const KOLHAPUR_LOCAL_PLACES = [
  {
    label: "KIT's College of Engineering (KITCoEK), Gokul Shirgaon, Kolhapur, Maharashtra, India",
    name: "KIT's College of Engineering (KITCoEK)",
    city: "Kolhapur", state: "Maharashtra", lat: 16.6539242, lng: 74.2617245, type: "college",
    keywords: ["kit", "kit college", "kitcoek", "kit college of engineering", "kit engineering", "kit kolhapur", "kit's college", "gokul shirgaon kit", "engineering college kolhapur"]
  },
  {
    label: "Shivaji University (SUK), Vidyanagar, Kolhapur, Maharashtra, India",
    name: "Shivaji University (SUK)",
    city: "Kolhapur", state: "Maharashtra", lat: 16.6775, lng: 74.2546, type: "university",
    keywords: ["shivaji university", "suk", "university", "vidyanagar kolhapur", "shivaji university kolhapur"]
  },
  {
    label: "D.Y. Patil College of Engineering & Technology (DYPCET), Kasaba Bawada, Kolhapur, Maharashtra, India",
    name: "D.Y. Patil College of Engineering (DYPCET)",
    city: "Kolhapur", state: "Maharashtra", lat: 16.7265, lng: 74.2492, type: "college",
    keywords: ["dy patil", "dypcet", "dy patil college", "bawada college", "dypcet kolhapur", "dy patil engineering", "dyp"]
  },
  {
    label: "Bharati Vidyapeeth College of Engineering, Morewadi, Kolhapur, Maharashtra, India",
    name: "Bharati Vidyapeeth College of Engineering",
    city: "Kolhapur", state: "Maharashtra", lat: 16.6720, lng: 74.2415, type: "college",
    keywords: ["bharati vidyapeeth", "bvcoek", "morewadi college", "bharati vidyapeeth kolhapur"]
  },
  {
    label: "Rajaram College, Sagreshwar, Kolhapur, Maharashtra, India",
    name: "Rajaram College",
    city: "Kolhapur", state: "Maharashtra", lat: 16.6853, lng: 74.2570, type: "college",
    keywords: ["rajaram college", "rajaram", "sagreshwar", "rajaram college kolhapur"]
  },
  {
    label: "Government Polytechnic, University Road, Kolhapur, Maharashtra, India",
    name: "Government Polytechnic (GPK)",
    city: "Kolhapur", state: "Maharashtra", lat: 16.6830, lng: 74.2520, type: "college",
    keywords: ["government polytechnic", "gp kolhapur", "gpk", "polytechnic kolhapur"]
  },
  {
    label: "Vivekanand College, Tarabai Park, Kolhapur, Maharashtra, India",
    name: "Vivekanand College",
    city: "Kolhapur", state: "Maharashtra", lat: 16.7118, lng: 74.2372, type: "college",
    keywords: ["vivekanand college", "vivekanand", "tarabai park college", "vivekanand kolhapur"]
  },
  {
    label: "The New College, Shivaji Peth, Kolhapur, Maharashtra, India",
    name: "The New College",
    city: "Kolhapur", state: "Maharashtra", lat: 16.6920, lng: 74.2230, type: "college",
    keywords: ["new college", "the new college", "shivaji peth college", "new college kolhapur"]
  },
  {
    label: "CSIBER (Chhatrapati Shahu Institute), Cyber Chowk, Kolhapur, Maharashtra, India",
    name: "CSIBER Institute",
    city: "Kolhapur", state: "Maharashtra", lat: 16.6816, lng: 74.2505, type: "college",
    keywords: ["csiber", "cyber", "cyber college", "cyber chowk", "csiber kolhapur"]
  },
  {
    label: "RCSM Govt Medical College & CPR Hospital, Kolhapur, Maharashtra, India",
    name: "RCSM Govt Medical College & CPR Hospital",
    city: "Kolhapur", state: "Maharashtra", lat: 16.6975, lng: 74.2341, type: "hospital",
    keywords: ["cpr", "cpr hospital", "medical college kolhapur", "civil hospital", "rcsm", "cpr kolhapur"]
  },
  {
    label: "Kolhapur Railway Station (CSMT), Station Road, Kolhapur, Maharashtra, India",
    name: "Kolhapur Railway Station (CSMT)",
    city: "Kolhapur", state: "Maharashtra", lat: 16.7028, lng: 74.2405, type: "station",
    keywords: ["railway station", "kolhapur station", "station", "train station", "csmt kolhapur", "kolhapur railway station"]
  },
  {
    label: "Central Bus Stand (CBS), Shahupuri, Kolhapur, Maharashtra, India",
    name: "Central Bus Stand (CBS)",
    city: "Kolhapur", state: "Maharashtra", lat: 16.7042, lng: 74.2435, type: "station",
    keywords: ["cbs", "bus stand", "kolhapur bus stand", "central bus stand", "cbs kolhapur", "st stand kolhapur"]
  },
  {
    label: "Rankala Lake & Chaupati, Kolhapur, Maharashtra, India",
    name: "Rankala Lake & Chaupati",
    city: "Kolhapur", state: "Maharashtra", lat: 16.6886, lng: 74.2111, type: "lake",
    keywords: ["rankala", "rankala lake", "rankala chaupati", "rankala tower", "lake kolhapur"]
  },
  {
    label: "Shri Mahalaxmi (Ambabai) Temple, B Ward, Kolhapur, Maharashtra, India",
    name: "Shri Mahalaxmi (Ambabai) Temple",
    city: "Kolhapur", state: "Maharashtra", lat: 16.6946, lng: 74.2241, type: "temple",
    keywords: ["mahalaxmi temple", "ambabai mandir", "ambabai temple", "mahalaxmi mandir", "kolhapur temple", "ambabai"]
  },
  {
    label: "New Palace (Chhatrapati Shahu Museum), Kolhapur, Maharashtra, India",
    name: "New Palace (Chhatrapati Shahu Museum)",
    city: "Kolhapur", state: "Maharashtra", lat: 16.7196, lng: 74.2312, type: "landmark",
    keywords: ["new palace", "shahu museum", "new palace museum", "chhatrapati shahu palace"]
  },
  {
    label: "Bhavani Mandap, B Ward, Kolhapur, Maharashtra, India",
    name: "Bhavani Mandap",
    city: "Kolhapur", state: "Maharashtra", lat: 16.6953, lng: 74.2255, type: "landmark",
    keywords: ["bhavani mandap", "bhavani mandap kolhapur"]
  },
  {
    label: "Kawala Naka Chowk, Kolhapur, Maharashtra, India",
    name: "Kawala Naka Chowk",
    city: "Kolhapur", state: "Maharashtra", lat: 16.7088, lng: 74.2542, type: "junction",
    keywords: ["kawala naka", "kavala naka", "kawala naka chowk", "highway chowk kolhapur"]
  },
  {
    label: "Cyber Chowk, University Road, Kolhapur, Maharashtra, India",
    name: "Cyber Chowk",
    city: "Kolhapur", state: "Maharashtra", lat: 16.6820, lng: 74.2512, type: "junction",
    keywords: ["cyber chowk", "csiber chowk", "university road cyber chowk"]
  },
  {
    label: "Dabholkar Corner, Shahupuri, Kolhapur, Maharashtra, India",
    name: "Dabholkar Corner",
    city: "Kolhapur", state: "Maharashtra", lat: 16.7031, lng: 74.2428, type: "junction",
    keywords: ["dabholkar corner", "dabholkar chowk", "dabholkar"]
  },
  {
    label: "Rajarampuri, Kolhapur, Maharashtra, India",
    name: "Rajarampuri",
    city: "Kolhapur", state: "Maharashtra", lat: 16.6908, lng: 74.2492, type: "area",
    keywords: ["rajarampuri", "rajarampuri janta bazar", "rajarampuri main road"]
  },
  {
    label: "Tarabai Park, Kolhapur, Maharashtra, India",
    name: "Tarabai Park",
    city: "Kolhapur", state: "Maharashtra", lat: 16.7125, lng: 74.2365, type: "area",
    keywords: ["tarabai park", "tarabai park kolhapur"]
  },
  {
    label: "Gokul Shirgaon MIDC, Kolhapur, Maharashtra, India",
    name: "Gokul Shirgaon MIDC",
    city: "Kolhapur", state: "Maharashtra", lat: 16.6450, lng: 74.2710, type: "industrial",
    keywords: ["gokul shirgaon", "gokul shirgaon midc", "midc gokul"]
  },
  {
    label: "Kolhapur Airport, Ujalaiwadi, Kolhapur, Maharashtra, India",
    name: "Kolhapur Airport (Ujalaiwadi)",
    city: "Kolhapur", state: "Maharashtra", lat: 16.6644, lng: 74.2811, type: "airport",
    keywords: ["kolhapur airport", "airport", "ujalaiwadi airport"]
  },
  {
    label: "Panhala Fort, Panhala, Kolhapur District, Maharashtra, India",
    name: "Panhala Fort",
    city: "Kolhapur", state: "Maharashtra", lat: 16.8123, lng: 74.1084, type: "fort",
    keywords: ["panhala", "panhala fort", "panhalgad"]
  },
  {
    label: "DYP City Mall, Kawala Naka, Kolhapur, Maharashtra, India",
    name: "DYP City Mall",
    city: "Kolhapur", state: "Maharashtra", lat: 16.7095, lng: 74.2535, type: "mall",
    keywords: ["dyp mall", "dyp city mall", "kolhapur mall"]
  }
];

export const matchLocalKolhapurPlaces = (q) => {
  if (!q || q.trim().length < 2) return [];
  const query = q.toLowerCase().trim();
  const words = query.replace(/,/g, " ").split(" ").filter(w => w.length > 1);
  return KOLHAPUR_LOCAL_PLACES.filter(item => {
    if (item.keywords.some(k => k === query || k.startsWith(query) || query.startsWith(k) || k.includes(query))) return true;
    if (words.length > 0 && words.every(w => item.keywords.some(k => k.includes(w)) || item.name.toLowerCase().includes(w) || item.label.toLowerCase().includes(w))) return true;
    if (item.name.toLowerCase().includes(query)) return true;
    return false;
  }).slice(0, 6);
};

const kmFormat = m => (m / 1000).toFixed(1) + " km";
const minFormat = s => Math.round(s / 60) + " min";

const MODE_COLORS = {
  safest: "#10b981",   // Emerald green
  fastest: "#06b6d4",  // Cyan / Electric blue
  shortest: "#a855f7"  // Violet / Purple
};

export default function SafeRouteIntelligence() {
  const navigate = useNavigate();

  // Search states
  const [originInput, setOriginInput] = useState("");
  const [destInput, setDestInput] = useState("");
  const [originPoint, setOriginPoint] = useState(null); // { pt: [lat, lng], label: "" }
  const [destPoint, setDestPoint] = useState(null);     // { pt: [lat, lng], label: "" }
  
  // Autocomplete suggestions
  const [originSuggestions, setOriginSuggestions] = useState([]);
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [isSearchingOrigin, setIsSearchingOrigin] = useState(false);
  const [isSearchingDest, setIsSearchingDest] = useState(false);

  // Routing state
  const [routeData, setRouteData] = useState(null);
  const [selectedMode, setSelectedMode] = useState("safest");
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  
  // Layer toggles
  const [showIncidents, setShowIncidents] = useState(true);
  const [showNearbyHelp, setShowNearbyHelp] = useState(false);
  const [nearbyPlaces, setNearbyPlaces] = useState([]);
  const [isLoadingNearby, setIsLoadingNearby] = useState(false);

  // Debounced search helper
  const debounceTimerRef = useRef(null);

  const fetchGeocode = async (query, isOrigin) => {
    if (!query || query.trim().length < 2) {
      if (isOrigin) setOriginSuggestions([]);
      else setDestSuggestions([]);
      return;
    }

    // 1. Instant local Kolhapur match
    const localMatches = matchLocalKolhapurPlaces(query);
    if (localMatches.length > 0) {
      if (isOrigin) setOriginSuggestions(localMatches);
      else setDestSuggestions(localMatches);
    }

    if (isOrigin) setIsSearchingOrigin(true);
    else setIsSearchingDest(true);

    try {
      const res = await api(`/routes/geocode?q=${encodeURIComponent(query)}`);
      const combined = res.items || [];
      // If we got results from server, use them (they already prioritize Kolhapur gazetteer)
      if (combined.length > 0) {
        if (isOrigin) setOriginSuggestions(combined);
        else setDestSuggestions(combined);
      }
    } catch {
      // Fallback direct nominatim restricted strictly to India
      try {
        const direct = await (await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=8&addressdetails=1&countrycodes=in`)).json();
        const items = direct
          .filter(x => isWithinIndia(+x.lat, +x.lon))
          .map(x => ({
            label: x.display_name,
            name: x.name || x.display_name.split(",")[0].trim(),
            city: x.address?.city || x.address?.town || x.address?.state_district || "",
            state: x.address?.state || "",
            lat: +x.lat,
            lng: +x.lon
          }));
        const merged = [...localMatches, ...items];
        if (isOrigin) setOriginSuggestions(merged.slice(0, 8));
        else setDestSuggestions(merged.slice(0, 8));
      } catch {}
    } finally {
      if (isOrigin) setIsSearchingOrigin(false);
      else setIsSearchingDest(false);
    }
  };

  const handleOriginChange = e => {
    const val = e.target.value;
    setOriginInput(val);
    setOriginPoint(null);
    // Instant 0ms local match
    const instant = matchLocalKolhapurPlaces(val);
    if (instant.length > 0) {
      setOriginSuggestions(instant);
    }
    clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => fetchGeocode(val, true), 300);
  };

  const handleDestChange = e => {
    const val = e.target.value;
    setDestInput(val);
    setDestPoint(null);
    // Instant 0ms local match
    const instant = matchLocalKolhapurPlaces(val);
    if (instant.length > 0) {
      setDestSuggestions(instant);
    }
    clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => fetchGeocode(val, false), 300);
  };

  // Select suggestion
  const selectOrigin = item => {
    setOriginPoint({ pt: [item.lat, item.lng], label: item.label });
    setOriginInput(item.name || item.label.split(",").slice(0, 2).join(", "));
    setOriginSuggestions([]);
  };

  const selectDest = item => {
    setDestPoint({ pt: [item.lat, item.lng], label: item.label });
    setDestInput(item.name || item.label.split(",").slice(0, 2).join(", "));
    setDestSuggestions([]);
  };

  // Use GPS location (with India validation)
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setErrorMessage("Geolocation is not supported by your browser.");
      return;
    }
    setGpsLoading(true);
    setErrorMessage("");
    navigator.geolocation.getCurrentPosition(
      pos => {
        const pt = [pos.coords.latitude, pos.coords.longitude];
        try { localStorage.setItem("abhaya_last_coords", JSON.stringify({ lat: pt[0], lng: pt[1], timestamp: Date.now() })); } catch (e) {}
        if (!isWithinIndia(pt[0], pt[1])) {
          setGpsLoading(false);
          setErrorMessage(
            `Detected GPS location (${pt[0].toFixed(4)}, ${pt[1].toFixed(4)}) is outside India. ABHAYA Safe Route Intelligence is configured exclusively for Indian locations. Please search for an Indian place manually.`
          );
          return;
        }
        setOriginPoint({ pt, label: `My Current Location [India] (${pt[0].toFixed(4)}, ${pt[1].toFixed(4)})` });
        setOriginInput("My Current Location (GPS - India)");
        setOriginSuggestions([]);
        setGpsLoading(false);
      },
      err => {
        setGpsLoading(false);
        setErrorMessage("GPS location denied or unavailable. Please type your starting location manually.");
      },
      { timeout: 9000, enableHighAccuracy: true }
    );
  };

  // Swap Origin and Destination
  const handleSwap = () => {
    const prevOInput = originInput;
    const prevOPoint = originPoint;
    setOriginInput(destInput);
    setOriginPoint(destPoint);
    setDestInput(prevOInput);
    setDestPoint(prevOPoint);
  };

  // Reset form
  const handleReset = () => {
    setOriginInput("");
    setDestInput("");
    setOriginPoint(null);
    setDestPoint(null);
    setRouteData(null);
    setErrorMessage("");
    setNearbyPlaces([]);
  };

  // Fetch routes
  const handleSearchRoutes = async () => {
    setErrorMessage("");
    let o = originPoint;
    let t = destPoint;

    // Resolve unselected text
    if (!o && originInput.trim()) {
      const localO = matchLocalKolhapurPlaces(originInput);
      if (localO.length > 0) {
        o = { pt: [localO[0].lat, localO[0].lng], label: localO[0].label };
        setOriginPoint(o);
      } else {
        try {
          const geoO = await api(`/routes/geocode?q=${encodeURIComponent(originInput)}`);
          if (geoO.items && geoO.items.length > 0) {
            o = { pt: [geoO.items[0].lat, geoO.items[0].lng], label: geoO.items[0].label };
            setOriginPoint(o);
          } else {
            setErrorMessage(`Starting place not found: "${originInput}". Please choose from suggestions.`);
            return;
          }
        } catch {
          setErrorMessage("Could not resolve starting location. Please check your connection.");
          return;
        }
      }
    }

    if (!t && destInput.trim()) {
      const localT = matchLocalKolhapurPlaces(destInput);
      if (localT.length > 0) {
        t = { pt: [localT[0].lat, localT[0].lng], label: localT[0].label };
        setDestPoint(t);
      } else {
        try {
          const geoT = await api(`/routes/geocode?q=${encodeURIComponent(destInput)}`);
          if (geoT.items && geoT.items.length > 0) {
            t = { pt: [geoT.items[0].lat, geoT.items[0].lng], label: geoT.items[0].label };
            setDestPoint(t);
          } else {
            setErrorMessage(`Destination not found: "${destInput}". Please choose from suggestions.`);
            return;
          }
        } catch {
          setErrorMessage("Could not resolve destination. Please check your connection.");
          return;
        }
      }
    }

    if (!o || !t) {
      setErrorMessage("Please specify both a starting point and a destination.");
      return;
    }

    if (!isWithinIndia(o.pt[0], o.pt[1]) || !isWithinIndia(t.pt[0], t.pt[1])) {
      setErrorMessage("Both starting point and destination must be located within India. ABHAYA Safe Route Intelligence is configured exclusively for Indian locations.");
      return;
    }

    setIsLoadingRoutes(true);
    setRouteData(null);

    try {
      const res = await api("/routes/suggest", {
        method: "POST",
        body: { origin: o.pt, dest: t.pt }
      });
      setRouteData(res);
      // Default to safest
      setSelectedMode("safest");

      // Pre-load nearby help stations if enabled
      if (showNearbyHelp) {
        fetchNearbyFacilities(t.pt[0], t.pt[1]);
      }
    } catch (err) {
      setErrorMessage(err.message || "Failed to retrieve route suggestions. Please try again.");
    } finally {
      setIsLoadingRoutes(false);
    }
  };

  // Fetch Nearby help centers along destination
  const fetchNearbyFacilities = async (lat, lng) => {
    setIsLoadingNearby(true);
    try {
      const res = await api(`/nearby?lat=${lat}&lng=${lng}&category=all`);
      setNearbyPlaces(res.items || []);
    } catch (e) {
      console.warn("Nearby help lookup failed:", e);
    } finally {
      setIsLoadingNearby(false);
    }
  };

  const toggleNearbyHelp = () => {
    const next = !showNearbyHelp;
    setShowNearbyHelp(next);
    if (next && routeData && destPoint) {
      fetchNearbyFacilities(destPoint.pt[0], destPoint.pt[1]);
    }
  };

  // Start Journey via Live Journey Guardian
  const handleStartJourney = async () => {
    if (!routeData || !currentRouteOption || !originPoint || !destPoint) return;
    try {
      await api("/journeys", {
        method: "POST",
        body: {
          origin: originPoint.pt,
          dest: destPoint.pt,
          origin_label: originPoint.label || originInput,
          dest_label: destPoint.label || destInput,
          route_type: currentRouteOption.type,
          coords: currentRouteOption.coords,
          distance_m: currentRouteOption.distance_m,
          duration_s: currentRouteOption.duration_s,
          escalation_enabled: true
        }
      });
      navigate("/journey");
    } catch (err) {
      setErrorMessage("Could not start journey: " + err.message);
    }
  };

  // Current active route object
  const currentRouteOption = routeData?.options?.find(o => o.type === selectedMode) || routeData?.options?.[0];

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "10px 0" }}>
      {/* 1. Header Banner */}
      <div style={{
        background: "linear-gradient(135deg, rgba(30, 27, 75, 0.75), rgba(15, 23, 42, 0.85))",
        border: "1px solid rgba(99, 102, 241, 0.3)",
        borderRadius: 16,
        padding: "20px 24px",
        marginBottom: 20,
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.35)",
        backdropFilter: "blur(12px)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <span style={{
                background: "linear-gradient(135deg, #6366f1, #d946ef)",
                padding: "6px 12px",
                borderRadius: 8,
                fontWeight: 800,
                fontSize: "0.85rem",
                letterSpacing: 1.2
              }}>
                ABHAYA
              </span>
              <span className="badge" style={{ borderColor: "#10b981", color: "#10b981", background: "rgba(16, 185, 129, 0.1)" }}>
                PROTECT &bull; PREVENT &bull; EMPOWER
              </span>
            </div>
            <h1 className="grad" style={{ fontSize: "1.85rem", margin: "6px 0 2px" }}>
              Safe Route Intelligence
            </h1>
            <p className="mut" style={{ margin: 0, fontSize: "0.95rem" }}>
              Choose a route with greater awareness. Compare alternatives by verified community safety, travel time, and distance.
            </p>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <Link to="/nearby" className="btn ghost sm" style={{ textDecoration: "none" }}>
              <Building2 size={15} /> Nearby Help
            </Link>
            <Link to="/reports" className="btn ghost sm" style={{ textDecoration: "none" }}>
              <ShieldAlert size={15} /> Report Hazard
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Main Work Area: Search Panel & Interactive Map */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
        gap: 20,
        alignItems: "start"
      }}>
        {/* Left Side: Route Search & Options */}
        <div>
          {/* Search Card */}
          <div className="card" style={{ position: "relative", marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <b style={{ fontSize: "1.05rem", display: "flex", alignItems: "center", gap: 8 }}>
                <Navigation size={18} color="#6366f1" /> Plan Your Route
              </b>
              <button
                className="btn ghost sm"
                onClick={handleReset}
                title="Reset search"
                style={{ padding: "4px 8px", fontSize: "0.75rem" }}
              >
                Clear
              </button>
            </div>

            {/* India Exclusive Notice Banner */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 10px",
              background: "rgba(16, 185, 129, 0.1)",
              border: "1px solid rgba(16, 185, 129, 0.25)",
              borderRadius: 8,
              fontSize: "0.78rem",
              color: "#34d399",
              marginBottom: 12
            }}>
              <span style={{ fontSize: "1rem" }}>🇮🇳</span>
              <div>
                <b>India Exclusive:</b> All routing & searches are restricted strictly within Indian borders.
              </div>
            </div>

            {/* Origin Input */}
            <div style={{ position: "relative", marginBottom: 12 }}>
              <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Starting Location (India):</span>
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={gpsLoading}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#38bdf8",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: 0
                  }}
                >
                  <Crosshair size={13} />
                  {gpsLoading ? "Locating..." : "Use My GPS Location"}
                </button>
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  placeholder="e.g. Kolhapur Railway Station, Pune, MG Road..."
                  value={originInput}
                  onChange={handleOriginChange}
                  style={{ paddingLeft: 34 }}
                />
                <span style={{ position: "absolute", left: 10, top: 13, color: "#10b981" }}>
                  <MapPin size={17} />
                </span>
                {isSearchingOrigin && (
                  <span style={{ position: "absolute", right: 10, top: 14, color: "#9aa3c7", fontSize: "0.75rem" }}>
                    Searching India...
                  </span>
                )}
              </div>

              {/* Origin Autocomplete List */}
              {originSuggestions.length > 0 && (
                <div style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: "100%",
                  zIndex: 2000,
                  background: "#0d1330",
                  border: "1px solid #10b981",
                  borderRadius: 8,
                  boxShadow: "0 10px 25px rgba(0,0,0,0.7)",
                  maxHeight: 220,
                  overflowY: "auto"
                }}>
                  {originSuggestions.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => selectOrigin(item)}
                      style={{
                        padding: "8px 12px",
                        borderBottom: "1px solid rgba(255,255,255,0.06)",
                        cursor: "pointer",
                        fontSize: "0.85rem"
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(16, 185, 129, 0.18)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ fontWeight: 600, color: "#fff", display: "flex", alignItems: "center", gap: 6 }}>
                          <span>🇮🇳</span>
                          <span>{item.name || item.label.split(",")[0]}</span>
                        </div>
                        {item.state && (
                          <span className="badge" style={{ fontSize: "0.68rem", padding: "1px 6px", background: "rgba(99,102,241,0.2)", borderColor: "#6366f1" }}>
                            {item.state}
                          </span>
                        )}
                      </div>
                      <div className="mut" style={{ fontSize: "0.74rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 2 }}>
                        {item.label}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Swap Button */}
            <div style={{ display: "flex", justifyContent: "center", margin: "-6px 0 6px" }}>
              <button
                type="button"
                className="btn ghost sm"
                onClick={handleSwap}
                title="Swap starting point and destination"
                style={{ borderRadius: "50%", width: 32, height: 32, padding: 0, display: "grid", placeItems: "center" }}
              >
                <ArrowLeftRight size={14} />
              </button>
            </div>

            {/* Destination Input */}
            <div style={{ position: "relative", marginBottom: 16 }}>
              <label>Destination Location (India):</label>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  placeholder="e.g. Rankala Lake, Shivaji University, Bus Stand..."
                  value={destInput}
                  onChange={handleDestChange}
                  style={{ paddingLeft: 34 }}
                />
                <span style={{ position: "absolute", left: 10, top: 13, color: "#ef4444" }}>
                  <MapPin size={17} />
                </span>
                {isSearchingDest && (
                  <span style={{ position: "absolute", right: 10, top: 14, color: "#9aa3c7", fontSize: "0.75rem" }}>
                    Searching India...
                  </span>
                )}
              </div>

              {/* Destination Autocomplete List */}
              {destSuggestions.length > 0 && (
                <div style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: "100%",
                  zIndex: 2000,
                  background: "#0d1330",
                  border: "1px solid #ef4444",
                  borderRadius: 8,
                  boxShadow: "0 10px 25px rgba(0,0,0,0.7)",
                  maxHeight: 220,
                  overflowY: "auto"
                }}>
                  {destSuggestions.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => selectDest(item)}
                      style={{
                        padding: "8px 12px",
                        borderBottom: "1px solid rgba(255,255,255,0.06)",
                        cursor: "pointer",
                        fontSize: "0.85rem"
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(239, 68, 68, 0.18)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ fontWeight: 600, color: "#fff", display: "flex", alignItems: "center", gap: 6 }}>
                          <span>🇮🇳</span>
                          <span>{item.name || item.label.split(",")[0]}</span>
                        </div>
                        {item.state && (
                          <span className="badge" style={{ fontSize: "0.68rem", padding: "1px 6px", background: "rgba(99,102,241,0.2)", borderColor: "#6366f1" }}>
                            {item.state}
                          </span>
                        )}
                      </div>
                      <div className="mut" style={{ fontSize: "0.74rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 2 }}>
                        {item.label}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Destination Chips */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span className="mut" style={{ fontSize: "0.8rem" }}>📍 Popular Kolhapur Destinations:</span>
                <span style={{ fontSize: "0.72rem", color: "#10b981", fontWeight: 600 }}>1-Tap Route</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {[
                  ["🎓 KIT College (KITCoEK)", [16.6539242, 74.2617245], "KIT's College of Engineering (KITCoEK), Gokul Shirgaon, Kolhapur"],
                  ["🚆 Kolhapur Station", [16.7028, 74.2405], "Kolhapur Railway Station (CSMT), Station Road, Kolhapur"],
                  ["🌊 Rankala Lake", [16.6886, 74.2111], "Rankala Lake & Chaupati, Kolhapur"],
                  ["🚌 Central Bus Stand (CBS)", [16.7042, 74.2435], "Central Bus Stand (CBS), Shahupuri, Kolhapur"],
                  ["🏛️ Shivaji University", [16.6775, 74.2546], "Shivaji University (SUK), Vidyanagar, Kolhapur"],
                  ["🛕 Mahalaxmi Temple", [16.6946, 74.2241], "Shri Mahalaxmi (Ambabai) Temple, B Ward, Kolhapur"],
                  ["🏥 CPR Hospital", [16.6975, 74.2341], "RCSM Govt Medical College & CPR Hospital, Kolhapur"],
                  ["🏫 DY Patil College", [16.7265, 74.2492], "D.Y. Patil College of Engineering (DYPCET), Kasaba Bawada, Kolhapur"],
                  ["🛍️ DYP City Mall", [16.7095, 74.2535], "DYP City Mall, Kawala Naka, Kolhapur"]
                ].map(([name, coords, fullLabel]) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      setDestInput(name);
                      setDestPoint({ pt: coords, label: fullLabel });
                      setDestSuggestions([]);
                    }}
                    className="btn ghost sm"
                    style={{
                      padding: "4px 9px",
                      fontSize: "0.76rem",
                      background: name.includes("KIT") ? "rgba(99, 102, 241, 0.25)" : "rgba(255,255,255,0.04)",
                      borderColor: name.includes("KIT") ? "#818cf8" : "rgba(255,255,255,0.12)",
                      color: name.includes("KIT") ? "#c7d2fe" : "#e2e8f0"
                    }}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Routes Action Button */}
            <button
              className="btn"
              onClick={handleSearchRoutes}
              disabled={isLoadingRoutes || (!originInput && !originPoint) || (!destInput && !destPoint)}
              style={{ width: "100%", justifyContent: "center", padding: "12px", fontSize: "1rem" }}
            >
              {isLoadingRoutes ? (
                <>
                  <RefreshCw size={16} className="spin" /> Analyzing Safety & Routing...
                </>
              ) : (
                <>
                  <Compass size={18} /> Find Safe Route Alternatives
                </>
              )}
            </button>

            {errorMessage && (
              <div style={{ marginTop: 12, padding: "10px 12px", background: "rgba(239, 68, 68, 0.15)", border: "1px solid #ef4444", borderRadius: 8, color: "#fca5a5", fontSize: "0.85rem", display: "flex", gap: 8, alignItems: "center" }}>
                <AlertCircle size={16} />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>

          {/* 3. The Three Route Mode Selector Cards (Visible when routes found) */}
          {routeData && routeData.options && (
            <div>
              <h3 style={{ fontSize: "1.1rem", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
                <Layers size={18} color="#22d3ee" /> Route Comparison ({routeData.alternatives_found} Alternative{routeData.alternatives_found > 1 ? "s" : ""})
              </h3>

              <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
                {routeData.options.map(opt => {
                  const isSelected = selectedMode === opt.type;
                  const modeColor = MODE_COLORS[opt.type] || "#6366f1";

                  return (
                    <div
                      key={opt.type}
                      onClick={() => setSelectedMode(opt.type)}
                      style={{
                        background: isSelected ? "rgba(99, 102, 241, 0.15)" : "rgba(255, 255, 255, 0.03)",
                        border: `2px solid ${isSelected ? modeColor : "rgba(255,255,255,0.08)"}`,
                        borderRadius: 14,
                        padding: "14px 16px",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        position: "relative"
                      }}
                    >
                      {/* Top Mode Header */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            background: modeColor,
                            boxShadow: `0 0 8px ${modeColor}`
                          }} />
                          <b style={{ color: modeColor, textTransform: "uppercase", letterSpacing: 0.8, fontSize: "0.95rem" }}>
                            {opt.type === "safest" && "🛡️ SAFEST ROUTE"}
                            {opt.type === "fastest" && "⚡ FASTEST ROUTE"}
                            {opt.type === "shortest" && "📏 SHORTEST ROUTE"}
                          </b>
                        </div>

                        {isSelected && (
                          <span className="badge" style={{ background: modeColor, color: "#000", fontWeight: "bold", fontSize: "0.75rem" }}>
                            SELECTED
                          </span>
                        )}
                      </div>

                      {/* Metrics: Distance, Duration, Safety Score */}
                      <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
                        <div>
                          <span className="mut" style={{ fontSize: "0.75rem" }}>EST. TIME:</span>
                          <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>{minFormat(opt.duration_s)}</div>
                        </div>
                        <div>
                          <span className="mut" style={{ fontSize: "0.75rem" }}>DISTANCE:</span>
                          <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>{kmFormat(opt.distance_m)}</div>
                        </div>
                        <div>
                          <span className="mut" style={{ fontSize: "0.75rem" }}>SAFETY EVALUATION:</span>
                          <div>
                            {opt.safety_score !== null && opt.safety_score !== undefined ? (
                              <span style={{ fontWeight: 800, color: opt.safety_score >= 80 ? "#10b981" : opt.safety_score >= 60 ? "#fbbf24" : "#ef4444" }}>
                                {opt.safety_score}/100 &bull; {opt.score_label || opt.confidence}
                              </span>
                            ) : (
                              <span className="mut" style={{ fontSize: "0.85rem" }}>
                                Limited Incident Data
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Explanation */}
                      <p className="mut" style={{ fontSize: "0.83rem", margin: "4px 0 0", lineHeight: 1.4 }}>
                        {opt.explanation}
                      </p>

                      {opt.same_as && opt.same_as.length > 0 && (
                        <div style={{ fontSize: "0.75rem", color: "#fbbf24", marginTop: 4 }}>
                          &bull; Note: Identical physical route to {opt.same_as.join(", ")} (network did not yield another path).
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Selected Route Action Bar */}
              {currentRouteOption && (
                <div className="card" style={{ background: "rgba(16, 185, 129, 0.08)", borderColor: "#10b981" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                    <div>
                      <b style={{ color: "#10b981" }}>Ready to navigate?</b>
                      <div className="mut" style={{ fontSize: "0.8rem" }}>
                        Activate live route tracking, deviation detection, and emergency escalation.
                      </div>
                    </div>
                    <button
                      className="btn"
                      onClick={handleStartJourney}
                      style={{ background: "linear-gradient(90deg, #10b981, #059669)", whiteSpace: "nowrap" }}
                    >
                      <Navigation size={16} /> Start Journey on {selectedMode.toUpperCase()}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Interactive Leaflet Map & Legend */}
        <div>
          <div className="card" style={{ padding: 10, position: "relative" }}>
            {/* Map Header Controls */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 6px 10px", flexWrap: "wrap", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="badge" style={{ borderColor: "#6366f1" }}>
                  <Layers size={13} style={{ marginRight: 4, verticalAlign: "middle" }} />
                  Live Map View
                </span>
                {routeData?.demo && (
                  <span className="badge b-pending" style={{ fontSize: "0.7rem" }}>
                    Demo Fallback Geometry
                  </span>
                )}
              </div>

              {/* Layer Toggles */}
              <div style={{ display: "flex", gap: 12, alignItems: "center", fontSize: "0.8rem" }}>
                <label style={{ display: "inline-flex", alignItems: "center", gap: 4, cursor: "pointer", margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={showIncidents}
                    onChange={e => setShowIncidents(e.target.checked)}
                    style={{ width: "auto", margin: 0 }}
                  />
                  <span>Show Incidents</span>
                </label>
                <label style={{ display: "inline-flex", alignItems: "center", gap: 4, cursor: "pointer", margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={showNearbyHelp}
                    onChange={toggleNearbyHelp}
                    style={{ width: "auto", margin: 0 }}
                  />
                  <span>Nearby Help</span>
                </label>
              </div>
            </div>

            {/* Leaflet Map Container */}
            <div style={{ height: 480, borderRadius: 12, overflow: "hidden", position: "relative" }}>
              <MapContainer
                center={originPoint?.pt || [16.705, 74.243]}
                zoom={13}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  attribution={MAP_TILE_ATTRIBUTION}
                  url={MAP_TILE_URL}
                  subdomains="abcd"
                />

                {/* Auto Bounds Controller */}
                {currentRouteOption && (
                  <MapBoundsController coords={currentRouteOption.coords} />
                )}

                {/* Origin Marker */}
                {originPoint && (
                  <Marker position={originPoint.pt} icon={originIcon}>
                    <Popup>
                      <b>🟢 Starting Point</b>
                      <div style={{ fontSize: "0.8rem" }}>{originPoint.label}</div>
                    </Popup>
                  </Marker>
                )}

                {/* Destination Marker */}
                {destPoint && (
                  <Marker position={destPoint.pt} icon={destIcon}>
                    <Popup>
                      <b>🔴 Destination</b>
                      <div style={{ fontSize: "0.8rem" }}>{destPoint.label}</div>
                    </Popup>
                  </Marker>
                )}

                {/* Route Polylines */}
                {routeData?.options?.map(opt => {
                  const isCurrent = opt.type === selectedMode;
                  const color = MODE_COLORS[opt.type] || "#6366f1";

                  return (
                    <Polyline
                      key={opt.type}
                      positions={opt.coords}
                      pathOptions={{
                        color: color,
                        weight: isCurrent ? 7 : 4,
                        opacity: isCurrent ? 1.0 : 0.45,
                        dashArray: isCurrent ? null : "6, 8"
                      }}
                      eventHandlers={{
                        click: () => setSelectedMode(opt.type)
                      }}
                    />
                  );
                })}

                {/* Incident Markers on Active Route */}
                {showIncidents && currentRouteOption?.nearby_reports?.map(inc => {
                  const isVerified = inc.status === "verified";
                  const color = isVerified ? "#ef4444" : "#f59e0b";

                  return (
                    <CircleMarker
                      key={inc.id}
                      center={[inc.lat, inc.lng]}
                      radius={isVerified ? 9 : 7}
                      pathOptions={{
                        color: color,
                        fillColor: color,
                        fillOpacity: 0.85,
                        weight: 2
                      }}
                    >
                      <Popup>
                        <div style={{ fontSize: "0.85rem", color: "#1e1b4b" }}>
                          <b>{isVerified ? "🚨 Verified Incident" : "⚠️ Reported Concern"}</b>
                          <div style={{ margin: "2px 0" }}>Category: <b>{inc.category}</b></div>
                          <div>Status: <span style={{ textTransform: "capitalize" }}>{inc.status}</span></div>
                          <div>Distance from route: <b>{inc.distance_m} m</b></div>
                          {inc.when && <div style={{ fontSize: "0.75rem", color: "#666" }}>Date: {new Date(inc.when).toLocaleDateString()}</div>}
                        </div>
                      </Popup>
                    </CircleMarker>
                  );
                })}

                {/* Nearby Help Markers */}
                {showNearbyHelp && nearbyPlaces.map((place, idx) => {
                  const isPolice = place.category === "police";
                  const isHospital = place.category === "hospital";
                  const pColor = isPolice ? "#3b82f6" : isHospital ? "#ef4444" : "#ec4899";

                  return (
                    <CircleMarker
                      key={idx}
                      center={[place.lat, place.lng]}
                      radius={6}
                      pathOptions={{ color: pColor, fillColor: pColor, fillOpacity: 0.9 }}
                    >
                      <Popup>
                        <div style={{ fontSize: "0.85rem", color: "#1e1b4b" }}>
                          <b>{place.name}</b>
                          <div>Type: <span style={{ textTransform: "capitalize" }}>{place.category.replace("_", " ")}</span></div>
                          <div>Distance: <b>{place.distance_m} m</b></div>
                          {place.directions && (
                            <a href={place.directions} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 4, color: "#2563eb" }}>
                              Directions <ExternalLink size={12} />
                            </a>
                          )}
                        </div>
                      </Popup>
                    </CircleMarker>
                  );
                })}
              </MapContainer>
            </div>

            {/* Map Legend & Disclaimer Footer */}
            <div style={{ marginTop: 12, padding: "10px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 10, fontSize: "0.8rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 14, height: 4, background: MODE_COLORS.safest, borderRadius: 2 }}></span> Safest
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 14, height: 4, background: MODE_COLORS.fastest, borderRadius: 2 }}></span> Fastest
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 14, height: 4, background: MODE_COLORS.shortest, borderRadius: 2 }}></span> Shortest
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444" }}></span> Verified Hazard
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b" }}></span> Under Review
                  </span>
                </div>
              </div>

              {routeData?.disclaimer && (
                <p className="mut" style={{ margin: "8px 0 0", fontSize: "0.75rem", fontStyle: "italic" }}>
                  &bull; {routeData.disclaimer}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
