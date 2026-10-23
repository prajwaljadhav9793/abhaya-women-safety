import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap, Circle } from "react-leaflet";
import L from "leaflet";
import {
  Shield,
  Navigation,
  Play,
  Pause,
  RotateCcw,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  MapPin,
  Compass,
  Radio,
  ArrowRight,
  TrendingUp,
  Zap,
  PhoneCall,
  Activity,
  LocateFixed,
  Award,
  ExternalLink,
  Clock,
  Volume2,
  VolumeX,
  BellRing,
  MessageCircle
} from "lucide-react";
import { api, useLoad } from "./api.js";
import { Tag } from "./context/AuthContext.jsx";
import MapLibre3DGuardian from "./components/MapLibre3DGuardian.jsx";
import { captureEmergencyCoordinates, saveEmergencyLocation } from "./emergencyAudio.js";

// Distance helper (Haversine formula in meters)
const hav = (a, b) => {
  if (!a || !b) return 0;
  const R = 6371000;
  const p1 = (a[0] * Math.PI) / 180;
  const p2 = (b[0] * Math.PI) / 180;
  const dp = ((b[0] - a[0]) * Math.PI) / 180;
  const dl = ((b[1] - a[1]) * Math.PI) / 180;
  const x =
    Math.sin(dp / 2) * Math.sin(dp / 2) +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
  return 2 * R * Math.asin(Math.sqrt(x));
};

const kmStr = m => (m / 1000).toFixed(1) + " km";
const minStr = s => Math.round(s / 60) + " min";

// Custom Leaflet Pin Icons
const createPinIcon = color =>
  L.divIcon({
    className: "journey-pin-icon",
    html: `<div style="
      background: ${color};
      width: 26px;
      height: 26px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 2px solid #ffffff;
      box-shadow: 0 0 12px ${color};
      display: flex;
      align-items: center;
      justify-content: center;
    "><div style="width: 8px; height: 8px; background: #fff; border-radius: 50%; transform: rotate(45deg);"></div></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
    popupAnchor: [0, -26]
  });

const originIcon = createPinIcon("#10b981");
const destIcon = createPinIcon("#ef4444");

// Calculate bearing between two GPS coordinates
const calcBearing = (from, to) => {
  if (!from || !to) return 0;
  const lat1 = (from[0] * Math.PI) / 180;
  const lat2 = (to[0] * Math.PI) / 180;
  const dLng = ((to[1] - from[1]) * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(dLng);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
};

// Live Traveler Navigation Marker (Clean, Directional GPS Puck)
const travelerLiveIcon = (heading = 0) =>
  L.divIcon({
    className: "traveler-live-gps-puck",
    html: `
      <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
        <style>
          @keyframes traveler-puck-pulse {
            0% { transform: scale(0.6); opacity: 0.95; }
            100% { transform: scale(2.0); opacity: 0; }
          }
        </style>
        <!-- Outer Live Pulse Ring -->
        <div style="
          position: absolute;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: rgba(59, 130, 246, 0.4);
          animation: traveler-puck-pulse 1.8s infinite ease-out;
        "></div>
        <!-- Inner Navigation Puck with Direction Arrow -->
        <div style="
          position: absolute;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%);
          border: 2.5px solid #ffffff;
          box-shadow: 0 0 14px rgba(59, 130, 246, 0.9), 0 3px 8px rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          transform: rotate(${heading}deg);
          transition: transform 0.25s ease;
        ">
          <!-- Direction pointer arrow pointing forward -->
          <div style="
            width: 0;
            height: 0;
            border-left: 5px solid transparent;
            border-right: 5px solid transparent;
            border-bottom: 10px solid #ffffff;
            margin-top: -2px;
          "></div>
        </div>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22]
  });

const womanTravelerIcon = travelerLiveIcon(0);

// Strict Territorial Bounds of India (Locked exclusively to India)
const INDIA_BOUNDS = [
  [6.5, 68.0],
  [37.5, 97.5]
];

// Curated Indian Smart Safety City Corridors for Quick Navigation
const INDIA_CITIES = [
  { name: "Kolhapur (HQ)", pos: [16.7042, 74.2435] },
  { name: "Mumbai", pos: [18.9220, 72.8347] },
  { name: "Pune", pos: [18.5204, 73.8567] },
  { name: "New Delhi", pos: [28.6139, 77.2090] },
  { name: "Bengaluru", pos: [12.9716, 77.5946] }
];

// Map Viewport Controller (follows traveler, fits route, or flies to Indian cities)
function MapCameraController({ center, coords, followMode, flyToTarget }) {
  const map = useMap();
  const initialFittedRef = useRef(false);

  useEffect(() => {
    if (flyToTarget) {
      map.flyTo(flyToTarget.pos, flyToTarget.zoom || 16, { duration: 1.5 });
    } else if (followMode && center) {
      map.panTo(center, { animate: true, duration: 0.3 });
    } else if (!initialFittedRef.current && coords && coords.length > 0) {
      try {
        const bounds = L.latLngBounds(coords);
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
        initialFittedRef.current = true;
      } catch (e) {
        console.warn(e);
      }
    }
  }, [center, followMode, coords, map, flyToTarget]);

  return null;
}

const ROUTE_MODE_COLORS = {
  safest: "#10b981",   // Emerald green
  fastest: "#06b6d4",  // Cyan / Electric blue
  shortest: "#a855f7"  // Violet / Purple
};

export default function LiveJourneyGuardian() {
  const navigate = useNavigate();
  const { data, reload } = useLoad("/journeys");

  const activeJourney = data?.active;
  const rawCoords =
    activeJourney?.coords && activeJourney.coords.length > 1
      ? activeJourney.coords
      : activeJourney?.origin && activeJourney?.dest
      ? [activeJourney.origin, activeJourney.dest]
      : [];

  // =========================================================================
  // TWO MODES:
  // 1. "gps"        -> Real-Time GPS Tracking (Primary Default Production Mode)
  // 2. "simulation" -> Simulation Mode
  // =========================================================================
  const [trackingMode, setTrackingMode] = useState("gps");

  // GPS Live State
  const [gpsPosition, setGpsPosition] = useState(null);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [gpsSpeedKmh, setGpsSpeedKmh] = useState(0);
  const [gpsStatus, setGpsStatus] = useState("Acquiring Satellite GPS...");
  const [gpsError, setGpsError] = useState("");

  // Simulation State
  const [simPlaying, setSimPlaying] = useState(true);
  const [simSpeed, setSimSpeed] = useState(2); // 1x, 2x, 5x, 10x
  const [simProgress, setSimProgress] = useState(0); // 0 to rawCoords.length - 1
  const [isSimulatedDeviation, setIsSimulatedDeviation] = useState(false);

  // Map Basemap & 3D WebGL State
  const [mapDimension, setMapDimension] = useState("3d"); // "3d" (62 deg native pitch) | "2d" (flat)
  const [mapLayerMode, setMapLayerMode] = useState("satellite"); // "satellite" | "streets"
  const [showLabels, setShowLabels] = useState(true); // "SHOW LABELS" toggle
  const [flyToTarget, setFlyToTarget] = useState(null);
  const [currentPos, setCurrentPos] = useState(null);
  const [followTraveler, setFollowTraveler] = useState(true);
  const [isArrived, setIsArrived] = useState(false);

  // Bearing of the traveler for directional heading pointer
  const travelerBearing = useMemo(() => {
    if (trackingMode === "simulation" && rawCoords.length > 1) {
      const baseIdx = Math.min(Math.floor(simProgress), rawCoords.length - 2);
      const p1 = rawCoords[baseIdx] || rawCoords[0];
      const p2 = rawCoords[Math.min(rawCoords.length - 1, baseIdx + 1)] || p1;
      return calcBearing(p1, p2);
    }
    if (rawCoords.length > 1) {
      return calcBearing(rawCoords[0], rawCoords[1]);
    }
    return 0;
  }, [trackingMode, simProgress, rawCoords]);
  const [sosStatus, setSosStatus] = useState("");
  const [sosLoading, setSosLoading] = useState(false);
  const [sosResult, setSosResult] = useState(null); // Real SOS dispatch result with contacts and WhatsApp links
  const [journeySosSendingAll, setJourneySosSendingAll] = useState(false);
  const [journeySosSendAllFeedback, setJourneySosSendAllFeedback] = useState(null);
  const [journeySosSentAllSuccess, setJourneySosSentAllSuccess] = useState(false);
  const [safeCheckinMsg, setSafeCheckinMsg] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [deviationPrompt, setDeviationPrompt] = useState(0); // Countdown in seconds if deviation

  // ETA & Overdue Safeguard State (3-Minute Safety Check Response Window)
  const [etaExtensionSec, setEtaExtensionSec] = useState(0);
  const [customTargetEtaMs, setCustomTargetEtaMs] = useState(null);
  const snoozeOverdueUntilRef = useRef(0); // Timestamp until which overdue popups are completely silenced
  const [showEtaCheckPrompt, setShowEtaCheckPrompt] = useState(false);
  const [etaPromptCountdown, setEtaPromptCountdown] = useState(180); // 3 minutes (180s) response window
  const [elapsedJourneySec, setElapsedJourneySec] = useState(0); // Live ticking journey time
  const [isSimulatedOverdue, setIsSimulatedOverdue] = useState(false);
  const [alarmRinging, setAlarmRinging] = useState(false);
  const [secondsUntilTargetEta, setSecondsUntilTargetEta] = useState(600);
  const etaPromptTriggeredRef = useRef(false);

  // Web Audio API Siren Synthesizer
  const audioCtxRef = useRef(null);
  const sirenOscRef = useRef(null);
  const sirenGainRef = useRef(null);
  const sirenIntervalRef = useRef(null);

  const startLoudSiren = () => {
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        audioCtxRef.current = new AudioCtx();
      }
      if (audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume();
      }

      if (sirenIntervalRef.current) clearInterval(sirenIntervalRef.current);
      if (sirenOscRef.current) {
        try { sirenOscRef.current.stop(); } catch (e) {}
      }

      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sawtooth"; // High-piercing alarm tone
      osc.frequency.setValueAtTime(700, ctx.currentTime);
      gain.gain.setValueAtTime(0.85, ctx.currentTime);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();

      sirenOscRef.current = osc;
      sirenGainRef.current = gain;
      setAlarmRinging(true);

      let high = false;
      sirenIntervalRef.current = setInterval(() => {
        if (!sirenOscRef.current || !audioCtxRef.current) return;
        high = !high;
        const targetFreq = high ? 1300 : 650;
        try {
          sirenOscRef.current.frequency.exponentialRampToValueAtTime(
            targetFreq,
            audioCtxRef.current.currentTime + 0.35
          );
        } catch (e) {}
      }, 400);
    } catch (err) {
      console.warn("Audio siren error:", err);
    }
  };

  const stopLoudSiren = () => {
    if (sirenIntervalRef.current) {
      clearInterval(sirenIntervalRef.current);
      sirenIntervalRef.current = null;
    }
    if (sirenOscRef.current) {
      try {
        sirenOscRef.current.stop();
        sirenOscRef.current.disconnect();
      } catch (e) {}
      sirenOscRef.current = null;
    }
    setAlarmRinging(false);
  };

  const watchGpsRef = useRef(null);
  const simIntervalRef = useRef(null);
  const lastLocationSyncRef = useRef(0);

  // Auto-SOS Escalation countdown timer
  useEffect(() => {
    if (!deviationPrompt || deviationPrompt <= 0) return;
    const timer = setTimeout(() => {
      if (deviationPrompt === 1) {
        // Auto-escalate to emergency contacts with real SOS alert
        handleTriggerEmergencySos();
        setDeviationPrompt(0);
      } else {
        setDeviationPrompt(prev => prev - 1);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [deviationPrompt, activeJourney?.id, currentPos]);

  // Clean up all timers and audio siren on unmount
  useEffect(() => {
    return () => {
      if (watchGpsRef.current) navigator.geolocation?.clearWatch(watchGpsRef.current);
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
      stopLoudSiren();
      if (audioCtxRef.current) {
        try { audioCtxRef.current.close(); } catch (e) {}
      }
    };
  }, []);

  // -------------------------------------------------------------------------
  // MODE 1: REAL-TIME DEVICE GPS TRACKING (PRIMARY)
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!activeJourney || trackingMode !== "gps") {
      if (watchGpsRef.current) {
        navigator.geolocation?.clearWatch(watchGpsRef.current);
        watchGpsRef.current = null;
      }
      return;
    }

    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by your browser. Please switch to Simulation.");
      setGpsStatus("GPS Unsupported");
      return;
    }

    setGpsStatus("📡 Acquiring Live Satellite Coordinates...");
    setGpsError("");

    watchGpsRef.current = navigator.geolocation.watchPosition(
      pos => {
        const pt = [pos.coords.latitude, pos.coords.longitude];
        const acc = Math.round(pos.coords.accuracy || 10);
        const speed = pos.coords.speed !== null && pos.coords.speed >= 0 ? Math.round(pos.coords.speed * 3.6) : 0;

        saveEmergencyLocation(pos.coords.latitude, pos.coords.longitude);
        setGpsPosition(pt);
        setCurrentPos(pt);
        setGpsAccuracy(acc);
        setGpsSpeedKmh(speed);
        setGpsStatus(`🟢 Live GPS Active (±${acc}m accuracy)`);
        setGpsError("");

        // Check if arrived at destination (within 60 meters)
        if (activeJourney?.dest) {
          const dToDest = hav(pt, activeJourney.dest);
          if (dToDest < 60) {
            setIsArrived(true);
          }
        }

        // Check deviation against route corridor
        if (rawCoords.length > 0) {
          const minDev = Math.min(...rawCoords.map(c => hav(pt, c)));
          if (minDev > (activeJourney.deviation_threshold_m || 300) && deviationPrompt === 0 && !isArrived) {
            setDeviationPrompt(15);
          }
        }

        // Sync live GPS position to backend every 6 seconds
        const now = Date.now();
        if (now - lastLocationSyncRef.current > 6000) {
          lastLocationSyncRef.current = now;
          api(`/journeys/${activeJourney.id}/location`, {
            method: "POST",
            body: { lat: pt[0], lng: pt[1], accuracy: acc }
          }).catch(console.warn);
        }
      },
      err => {
        let msg = "GPS unavailable.";
        if (err.code === 1) msg = "GPS permission denied. Please allow location access or switch to Simulation.";
        else if (err.code === 2) msg = "GPS signal weak or position unavailable indoors. Switch to Simulation.";
        else if (err.code === 3) msg = "GPS request timed out.";
        setGpsError(msg);
        setGpsStatus("⚠️ GPS Offline");
        // Fallback initial position to origin if GPS not yet available
        if (!currentPos && rawCoords.length > 0) {
          setCurrentPos(rawCoords[0]);
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 3000 }
    );

    return () => {
      if (watchGpsRef.current) {
        navigator.geolocation?.clearWatch(watchGpsRef.current);
        watchGpsRef.current = null;
      }
    };
  }, [activeJourney?.id, trackingMode, rawCoords]);

  // -------------------------------------------------------------------------
  // MODE 2: SIMULATION ENGINE
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!activeJourney || trackingMode !== "simulation" || rawCoords.length < 2) {
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
      return;
    }

    if (!simPlaying || isArrived) {
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
      return;
    }

    const intervalMs = 120; // 8.3 fps smooth update

    simIntervalRef.current = setInterval(() => {
      setSimProgress(prev => {
        const increment = 0.09 * simSpeed;
        const next = prev + increment;

        if (next >= rawCoords.length - 1) {
          // Reached Destination!
          clearInterval(simIntervalRef.current);
          const finalPt = rawCoords[rawCoords.length - 1];
          setCurrentPos(finalPt);
          setIsArrived(true);
          setSimPlaying(false);

          // Mark completed on server
          api(`/journeys/${activeJourney.id}/end`, { method: "POST" })
            .then(() => reload())
            .catch(console.warn);

          return rawCoords.length - 1;
        }

        const baseIdx = Math.floor(next);
        const frac = next - baseIdx;
        const p1 = rawCoords[baseIdx];
        const p2 = rawCoords[Math.min(rawCoords.length - 1, baseIdx + 1)];

        let lat = p1[0] + (p2[0] - p1[0]) * frac;
        let lng = p1[1] + (p2[1] - p1[1]) * frac;

        // If off-route deviation simulation is activated, shift marker 350m off route
        if (isSimulatedDeviation) {
          lat += 0.0035;
          lng += 0.0035;
        }

        const pos = [lat, lng];
        setCurrentPos(pos);

        // Periodically sync live simulated location to backend
        const now = Date.now();
        if (now - lastLocationSyncRef.current > 6000) {
          lastLocationSyncRef.current = now;
          api(`/journeys/${activeJourney.id}/location`, {
            method: "POST",
            body: { lat, lng, accuracy: 5 }
          }).catch(console.warn);
        }

        return next;
      });
    }, intervalMs);

    return () => clearInterval(simIntervalRef.current);
  }, [activeJourney?.id, trackingMode, rawCoords, simPlaying, simSpeed, isArrived, isSimulatedDeviation]);

  // Handle Mode Switch between GPS and Simulation
  const handleSwitchMode = newMode => {
    setTrackingMode(newMode);
    setErrorMessage("");
    if (newMode === "gps") {
      setSimPlaying(false);
      setIsSimulatedDeviation(false);
      setDeviationPrompt(0);
      if (gpsPosition) setCurrentPos(gpsPosition);
    } else {
      // Switched to Simulation Mode
      setSimPlaying(true);
      setIsArrived(false);
      if (rawCoords.length > 0) {
        if (!currentPos) setCurrentPos(rawCoords[0]);
      }
    }
  };

  // Simulate Deviation to test Auto-SOS Warning
  const handleSimulateDeviationAlert = () => {
    setIsSimulatedDeviation(true);
    setDeviationPrompt(15);
  };

  const handleClearDeviation = () => {
    setIsSimulatedDeviation(false);
    setDeviationPrompt(0);
  };

  // Safety check-in: mark traveler as safe and clear warnings
  const handleImSafe = () => {
    setIsSimulatedDeviation(false);
    setDeviationPrompt(0);
    setShowEtaCheckPrompt(false);
    stopLoudSiren();
    const now = Date.now();
    const newTarget = Math.max(now, customTargetEtaMs || targetEtaMs) + (5 * 60 * 1000);
    setCustomTargetEtaMs(newTarget);
    snoozeOverdueUntilRef.current = newTarget;
    etaPromptTriggeredRef.current = false;
    setSafeCheckinMsg("🟢 Safety Check-in Confirmed: You marked yourself safe. Overdue checks paused for 5 minutes.");
    setTimeout(() => setSafeCheckinMsg(""), 6000);
  };

  // Actions
  const handleEndJourney = async () => {
    if (!activeJourney) return;
    stopLoudSiren();
    try {
      await api(`/journeys/${activeJourney.id}/end`, { method: "POST" });
      reload();
    } catch (err) {
      setErrorMessage(err.message || "Failed to end journey.");
    }
  };

  const handleRestartSimulation = () => {
    setSimProgress(0);
    if (rawCoords.length > 0) setCurrentPos(rawCoords[0]);
    setIsArrived(false);
    setSimPlaying(true);
    setIsSimulatedDeviation(false);
    setDeviationPrompt(0);
    setShowEtaCheckPrompt(false);
    setIsSimulatedOverdue(false);
    etaPromptTriggeredRef.current = false;
    snoozeOverdueUntilRef.current = 0;
    setCustomTargetEtaMs(null);
    stopLoudSiren();
  };

  const handleTriggerEmergencySos = async () => {
    setSosLoading(true);
    setSosStatus("");
    setErrorMessage("");

    // 1. Immediately sound the piercing emergency siren!
    startLoudSiren();

    try {
      // 2. Guaranteed multi-tier location capture (live position -> GPS -> active origin -> Wi-Fi/IP -> cache)
      const coords = await captureEmergencyCoordinates([
        currentPos,
        gpsPosition,
        activeJourney?.origin
      ]);

      const lat = coords?.lat;
      const lng = coords?.lng;

      const data = await api("/sos", {
        method: "POST",
        body: {
          lat,
          lng,
          accuracy: coords?.accuracy,
          note: `🚨 Emergency SOS from ABHAYA Journey Guardian (#${activeJourney?.id || "Live"}) en route to ${activeJourney?.dest_label?.split(",")[0] || "Destination"} (Source: ${coords?.source || "GPS"})`,
          journey_id: activeJourney?.id
        }
      });
      setSosResult(data);

      const primary = data?.contacts?.[0];
      if (primary && primary.wa_url && !primary.phone?.includes("000000099")) {
        if (!data?.has_real_gateway) {
          // If no cloud SMS/WhatsApp API key in backend .env, launch pre-filled WhatsApp so user's phone receives the SOS!
          window.open(primary.wa_url, "_blank");
          setSosStatus(`📲 WhatsApp pre-filled & launched for ${primary.name || "contact"}! Tap 'Send' in WhatsApp.`);
        } else {
          setSosStatus("⚡ Emergency SOS dispatched automatically via real Cloud Gateway directly to your emergency contacts!");
        }
      } else {
        setSosStatus("⚡ Emergency SOS recorded. Alerts dispatched in real-time.");
      }
    } catch (err) {
      setErrorMessage("Could not send SOS: " + (err.message || err));
    } finally {
      setSosLoading(false);
    }
  };

  const handleJourneySosSendAll = async () => {
    const sosId = sosResult?.sos?.id;
    if (!sosId || journeySosSendingAll) return;
    setJourneySosSendingAll(true);
    setJourneySosSendAllFeedback(null);

    const contactList = (sosResult.contacts && sosResult.contacts.length > 0) ? sosResult.contacts : [];

    try {
      const result = await api(`/sos/${sosId}/send-all`, { method: "POST" });
      if (result?.sos) {
        setSosResult((prev) => ({
          ...prev,
          sos: { ...prev.sos, ...result.sos },
          contacts: result.contacts || prev.contacts
        }));
      } else if (result?.contacts) {
        setSosResult((prev) => ({
          ...prev,
          contacts: result.contacts
        }));
      }

      setJourneySosSentAllSuccess(Boolean(result.success));
      setJourneySosSendAllFeedback({
        type: result.success ? "success" : "error",
        message: result.message || `Emergency alerts submitted for ${result.submitted_count || 0} of ${contactList.length} contacts.`
      });
    } catch (e) {
      setJourneySosSendAllFeedback({
        type: "error",
        message: e.message || "Failed to dispatch alerts to all contacts. Please try individual backup buttons."
      });
    } finally {
      setJourneySosSendingAll(false);
    }
  };

  const handleJourneySosSendAllWhatsApp = () => {
    const contactList = (sosResult?.contacts && sosResult.contacts.length > 0) ? sosResult.contacts : [];
    if (!contactList.length) return;

    const locStr = sosResult?.sos?.map_url || (currentPos ? `https://www.google.com/maps?q=${currentPos[0]},${currentPos[1]}` : "Location unavailable");
    const sosText = encodeURIComponent(
      `🚨 ABHAYA EMERGENCY SOS! I need immediate help! Live Location: ${locStr} ` +
      (sosResult?.evidence_pdf_url ? `SOS evidence PDF (link expires in 7 days): ${sosResult.evidence_pdf_url}` : "")
    );

    setJourneySosSendAllFeedback({
      type: "info",
      message: `📲 Launching WhatsApp for all ${contactList.length} contacts... (Please allow popups if prompted)`
    });

    contactList.forEach((c, idx) => {
      const cleanP = (c.phone || "").replace(/\D/g, "");
      let waNum = cleanP;
      if (waNum.length === 10 && "6789".includes(waNum[0])) waNum = "91" + waNum;
      else if (waNum.length === 11 && waNum.startsWith("0")) waNum = "91" + waNum.slice(1);
      const url = c.wa_url || (waNum ? `https://wa.me/${waNum}?text=${sosText}` : null);
      if (url) {
        setTimeout(() => {
          window.open(url, `_blank_wa_${idx}`);
        }, idx * 450);
      }
    });
  };

  // -------------------------------------------------------------------------
  // -------------------------------------------------------------------------
  // TIME & ETA OVERDUE SAFEGUARD LOGIC (3-MINUTE AUTO-SOS)
  // -------------------------------------------------------------------------
  const journeyStartMs = activeJourney?.started_at
    ? new Date(activeJourney.started_at.endsWith("Z") ? activeJourney.started_at : activeJourney.started_at + "Z").getTime()
    : Date.now();
  const journeyStartFormatted = new Date(journeyStartMs).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const formatTimeElapsed = sec => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;
    if (hrs > 0) {
      return `${hrs}h ${mins.toString().padStart(2, "0")}m ${secs.toString().padStart(2, "0")}s`;
    }
    return `${mins}m ${secs.toString().padStart(2, "0")}s`;
  };

  const formatCountdown = sec => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Target arrival timestamp (base ETA from server + user safety extensions)
  const baseEtaMs = activeJourney?.eta_at
    ? new Date(activeJourney.eta_at.endsWith("Z") ? activeJourney.eta_at : activeJourney.eta_at + "Z").getTime()
    : activeJourney?.started_at
    ? new Date(activeJourney.started_at.endsWith("Z") ? activeJourney.started_at : activeJourney.started_at + "Z").getTime() + (activeJourney.planned_duration_s || 600) * 1000
    : Date.now() + 600000;

  const targetEtaMs = customTargetEtaMs || (baseEtaMs + (etaExtensionSec * 1000));
  const targetEtaDate = new Date(targetEtaMs);
  const targetEtaFormatted = targetEtaDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  // Live ticker tracking girl's journey time & seconds until target ETA
  useEffect(() => {
    const ticker = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.max(0, Math.floor((now - journeyStartMs) / 1000));
      setElapsedJourneySec(elapsed);

      const remainingSec = Math.round((targetEtaMs - now) / 1000);
      setSecondsUntilTargetEta(remainingSec);

      // Check if user is currently snoozed / in grace period after marking herself safe
      const isSnoozed = now < snoozeOverdueUntilRef.current;

      // If ETA has passed, user is NOT arrived, NOT snoozed, and prompt not already open
      if (
        !isSnoozed &&
        (remainingSec <= 0 || isSimulatedOverdue) &&
        !isArrived &&
        !etaPromptTriggeredRef.current &&
        !showEtaCheckPrompt
      ) {
        etaPromptTriggeredRef.current = true;
        setShowEtaCheckPrompt(true);
        setEtaPromptCountdown(180); // 3-Minute safety response window
        startLoudSiren();
      }
    }, 1000);

    return () => clearInterval(ticker);
  }, [targetEtaMs, journeyStartMs, isArrived, isSimulatedOverdue, showEtaCheckPrompt]);

  // 3-Minute (180s) safety check countdown
  useEffect(() => {
    if (!showEtaCheckPrompt || etaPromptCountdown <= 0) return;
    const timer = setTimeout(() => {
      if (etaPromptCountdown === 1) {
        // 3 Minutes Expired without response from girl: Automatically trigger SOS & sound loud siren alarm!
        setShowEtaCheckPrompt(false);
        setEtaPromptCountdown(0);
        triggerOverdueSosAndAlarm();
      } else {
        setEtaPromptCountdown(prev => prev - 1);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [showEtaCheckPrompt, etaPromptCountdown]);

  const triggerOverdueSosAndAlarm = async () => {
    startLoudSiren();
    setSosStatus("🚨 AUTOMATIC OVERDUE SOS DISPATCHED! 3-minute safety response window expired without reply. Live GPS coordinates dispatched to emergency contacts via SMS & WhatsApp.");
    await handleTriggerEmergencySos();
  };

  // Handle girl confirming she is safe (replies before 3 min: extends ETA by addedMinutes, guarantees NO popup for that duration)
  const handleConfirmSafeAndExtend = async (addedMinutes = 5) => {
    setShowEtaCheckPrompt(false);
    setEtaPromptCountdown(180);
    setIsSimulatedOverdue(false);
    stopLoudSiren();

    const now = Date.now();
    const addedSec = addedMinutes * 60;

    // Ensure the new target ETA is at least now + addedSec, in the future!
    const newTargetEtaMs = Math.max(now, targetEtaMs) + (addedSec * 1000);
    setCustomTargetEtaMs(newTargetEtaMs);
    snoozeOverdueUntilRef.current = newTargetEtaMs; // Will NOT show again for the given minutes!
    etaPromptTriggeredRef.current = false;
    setEtaExtensionSec(prev => prev + addedSec);

    const nextCheckTimeStr = new Date(newTargetEtaMs).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setSafeCheckinMsg(`🟢 Safety Confirmed: Traveler replied within 3 minutes! Everything is okay. Safety alert paused for ${addedMinutes} min (Next check at ${nextCheckTimeStr}). Journey monitoring continues.`);
    setTimeout(() => setSafeCheckinMsg(""), 9000);

    if (activeJourney?.id) {
      try {
        const resp = await api(`/journeys/${activeJourney.id}/extend_eta`, {
          method: "POST",
          body: { seconds: addedSec }
        });
        if (resp?.journey?.eta_at) {
          const srvEtaMs = new Date(resp.journey.eta_at.endsWith("Z") ? resp.journey.eta_at : resp.journey.eta_at + "Z").getTime();
          setCustomTargetEtaMs(srvEtaMs);
          snoozeOverdueUntilRef.current = srvEtaMs;
        }
      } catch (e) {
        console.warn("Could not sync ETA extension:", e);
      }
    }
  };

  // Handle girl clicking "No, I Need Help!"
  const handleEmergencyNo = async () => {
    setShowEtaCheckPrompt(false);
    setIsSimulatedOverdue(false);
    etaPromptTriggeredRef.current = true;
    startLoudSiren();
    setSosStatus("🚨 EMERGENCY SOS DISPATCHED: Traveler confirmed NOT safe! Siren alarm ringing & contacts alerted.");
    await handleTriggerEmergencySos();
  };

  // Allow testing ETA overdue check immediately
  const handleTestOverdueCheck = () => {
    snoozeOverdueUntilRef.current = 0; // Clear snooze for immediate testing
    setIsSimulatedOverdue(true);
    etaPromptTriggeredRef.current = false;
    setShowEtaCheckPrompt(true);
    setEtaPromptCountdown(180); // 3-Minute countdown starts
    startLoudSiren();
  };

  // Fast-forward countdown for fast testing (jump to 5 seconds)
  const handleFastForwardCountdown = () => {
    setEtaPromptCountdown(5);
  };

  // Handlers for Interactive Journey Progress Bar (Click & Seek & Drag Scrubbing)
  const [isScrubbing, setIsScrubbing] = useState(false);

  const handleSeekProgress = targetPercent => {
    if (rawCoords.length < 2) return;
    const clamped = Math.max(0, Math.min(100, targetPercent));
    const targetIdx = (clamped / 100) * (rawCoords.length - 1);
    setSimProgress(targetIdx);
    const baseIdx = Math.floor(targetIdx);
    const frac = targetIdx - baseIdx;
    const p1 = rawCoords[baseIdx];
    const p2 = rawCoords[Math.min(rawCoords.length - 1, baseIdx + 1)];
    const lat = p1[0] + (p2[0] - p1[0]) * frac;
    const lng = p1[1] + (p2[1] - p1[1]) * frac;
    setCurrentPos([lat, lng]);

    if (clamped >= 100) {
      setIsArrived(true);
      setSimPlaying(false);
    } else {
      setIsArrived(false);
    }

    if (trackingMode !== "simulation") {
      setTrackingMode("simulation");
      setSimPlaying(true);
    }
  };

  const handleBarClick = e => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newRatio = Math.max(0, Math.min(1, clickX / rect.width));
    handleSeekProgress(Math.round(newRatio * 100));
  };

  const handleBarPointerDown = e => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) {}
    setIsScrubbing(true);
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newRatio = Math.max(0, Math.min(1, clickX / rect.width));
    handleSeekProgress(Math.round(newRatio * 100));
  };

  const handleBarPointerMove = e => {
    if (!isScrubbing) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newRatio = Math.max(0, Math.min(1, clickX / rect.width));
    handleSeekProgress(Math.round(newRatio * 100));
  };

  const handleBarPointerUp = e => {
    setIsScrubbing(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_) {}
  };

  // Calculations for Telemetry
  const totalPlannedDist = activeJourney?.planned_distance_m || 1000;
  let distTravelledM = 0;
  let distRemainingM = totalPlannedDist;
  let percentCompleted = 0;
  let currentSpeedDisplay = 0;

  if (isArrived) {
    percentCompleted = 100;
    distTravelledM = totalPlannedDist;
    distRemainingM = 0;
    currentSpeedDisplay = 0;
  } else if (trackingMode === "simulation") {
    const progressRatio = Math.min(1.0, Math.max(0.0, rawCoords.length > 1 ? simProgress / (rawCoords.length - 1) : 0));
    distTravelledM = Math.round(totalPlannedDist * progressRatio);
    distRemainingM = Math.max(0, totalPlannedDist - distTravelledM);
    percentCompleted = Math.min(100, Math.round(progressRatio * 100));
    currentSpeedDisplay = simPlaying ? Math.round(24 + simSpeed * 12) : 0;
  } else {
    // GPS Mode live calculations - project onto rawCoords for true route progress
    if (currentPos && rawCoords.length > 1) {
      let closestIdx = 0;
      let minD = Infinity;
      for (let i = 0; i < rawCoords.length; i++) {
        const d = hav(currentPos, rawCoords[i]);
        if (d < minD) {
          minD = d;
          closestIdx = i;
        }
      }
      const ratio = closestIdx / (rawCoords.length - 1);
      percentCompleted = Math.min(100, Math.max(0, Math.round(ratio * 100)));
      distTravelledM = Math.round(totalPlannedDist * (percentCompleted / 100));
      distRemainingM = Math.max(0, totalPlannedDist - distTravelledM);
      currentSpeedDisplay = gpsSpeedKmh || 0;
    } else if (currentPos && activeJourney?.dest) {
      const dToDest = hav(currentPos, activeJourney.dest);
      const dFromOrig = activeJourney.origin ? hav(currentPos, activeJourney.origin) : 0;
      const sumD = dToDest + dFromOrig || totalPlannedDist;
      const ratio = Math.min(1.0, Math.max(0.0, dFromOrig / sumD));
      percentCompleted = Math.min(100, Math.round(ratio * 100));
      distTravelledM = Math.round(totalPlannedDist * (percentCompleted / 100));
      distRemainingM = Math.max(0, totalPlannedDist - distTravelledM);
      currentSpeedDisplay = gpsSpeedKmh || 0;
    }
  }

  const remainingEtaSec =
    currentSpeedDisplay > 0
      ? distRemainingM / ((currentSpeedDisplay * 1000) / 3600)
      : Math.round((distRemainingM / 1000) * 120);

  // Live deviation in meters
  const liveDeviationM =
    currentPos && rawCoords.length > 0
      ? isSimulatedDeviation
        ? 350
        : Math.round(Math.min(...rawCoords.map(c => hav(currentPos, c))))
      : 0;

  const isOffRoute = liveDeviationM > (activeJourney?.deviation_threshold_m || 300);
  const routeColor = ROUTE_MODE_COLORS[activeJourney?.route_type] || "#10b981";

  if (!data) {
    return (
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 20px", textAlign: "center" }}>
        <p className="mut">Connecting to ABHAYA Journey Guardian...</p>
      </div>
    );
  }

  // If no active journey exists
  if (!activeJourney) {
    return (
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "20px 0" }}>
        <div
          className="card"
          style={{
            textAlign: "center",
            padding: "50px 20px",
            background: "linear-gradient(135deg, rgba(30, 27, 75, 0.6), rgba(15, 23, 42, 0.75))",
            border: "1px solid rgba(99, 102, 241, 0.25)",
            borderRadius: 16
          }}
        >
          <div
            style={{
              width: 68,
              height: 68,
              borderRadius: "50%",
              background: "rgba(99, 102, 241, 0.15)",
              color: "#818cf8",
              display: "grid",
              placeItems: "center",
              margin: "0 auto 16px"
            }}
          >
            <Compass size={36} />
          </div>
          <h2 style={{ color: "#fff", marginBottom: 8 }}>No Active Journey Running</h2>
          <p className="mut" style={{ maxWidth: 500, margin: "0 auto 24px", lineHeight: 1.5 }}>
            To activate Live Journey Guardian with Real-Time GPS Tracking, choose your route in
            Safe Route Intelligence and tap <b>"Start Journey"</b>.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginTop: 8 }}>
            <Link
              to="/routes"
              className="btn"
              style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 24px", background: "linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)" }}
            >
              <Navigation size={18} /> Select Safe Route &amp; Start Journey
            </Link>
          </div>
        </div>

        {/* Previous Journey History Table */}
        <div style={{ marginTop: 30 }}>
          <h3 style={{ fontSize: "1.1rem", marginBottom: 12 }}>Previous Journey History</h3>
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.03)", textAlign: "left", fontSize: "0.82rem" }}>
                  <th style={{ padding: "12px 16px" }}>Started At</th>
                  <th style={{ padding: "12px 16px" }}>Destination</th>
                  <th style={{ padding: "12px 16px" }}>Distance</th>
                  <th style={{ padding: "12px 16px" }}>Route Mode</th>
                  <th style={{ padding: "12px 16px" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.items && data.items.length > 0 ? (
                  data.items.map(x => (
                    <tr key={x.id} style={{ borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: "0.85rem" }}>
                      <td style={{ padding: "12px 16px" }}>{new Date(x.started_at + "Z").toLocaleString()}</td>
                      <td style={{ padding: "12px 16px", fontWeight: 600 }}>{x.dest_label?.split(",")[0]}</td>
                      <td style={{ padding: "12px 16px" }}>{kmStr(x.planned_distance_m || 0)}</td>
                      <td style={{ padding: "12px 16px", textTransform: "capitalize" }}>{x.route_type}</td>
                      <td style={{ padding: "12px 16px" }}><Tag s={x.status} /></td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} style={{ padding: "20px", textAlign: "center" }} className="mut">
                      No previous journeys recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // ACTIVE JOURNEY GUARDIAN INTERFACE
  // =========================================================================
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "10px 0" }}>
      {/* 1. Header Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(30, 27, 75, 0.85), rgba(15, 23, 42, 0.95))",
          border: `1px solid ${routeColor}`,
          borderRadius: 16,
          padding: "18px 24px",
          marginBottom: 16,
          boxShadow: `0 8px 30px rgba(0, 0, 0, 0.5), 0 0 15px ${routeColor}22`
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span
                style={{
                  background: routeColor,
                  color: "#000",
                  padding: "2px 8px",
                  borderRadius: 12,
                  fontSize: "0.75rem",
                  fontWeight: 800,
                  textTransform: "uppercase"
                }}
              >
                {activeJourney.route_type} GUARDIAN
              </span>
              <span className="badge b-verified" style={{ fontSize: "0.75rem" }}>
                <Radio size={12} style={{ marginRight: 4, verticalAlign: "middle" }} className="spin" />
                {trackingMode === "gps" ? "LIVE REAL-TIME GPS" : "SIMULATION"}
              </span>
            </div>
            <h2 style={{ margin: "4px 0", color: "#fff", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span>{activeJourney.origin_label?.split(",")[0] || "Origin"}</span>
              <ArrowRight size={20} color={routeColor} />
              <span>{activeJourney.dest_label?.split(",")[0] || "Destination"}</span>
            </h2>
            <div className="mut" style={{ fontSize: "0.82rem" }}>
              Active Journey #{activeJourney.id} &bull; Started {journeyStartFormatted} &bull; Deviation Corridor: {activeJourney.deviation_threshold_m || 300}m
            </div>

            {/* Prominent Girl's Journey Time & Calculated ETA Status Bar */}
            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{
                background: "rgba(236, 72, 153, 0.16)",
                border: "1px solid rgba(236, 72, 153, 0.45)",
                color: "#f472b6",
                padding: "4px 12px",
                borderRadius: 8,
                fontSize: "0.85rem",
                fontWeight: 800,
                display: "inline-flex",
                alignItems: "center",
                gap: 6
              }}>
                <Clock size={15} /> Girl's Journey Time: {formatTimeElapsed(elapsedJourneySec)}
              </span>

              <span style={{
                background: "rgba(56, 189, 248, 0.15)",
                border: "1px solid rgba(56, 189, 248, 0.4)",
                color: "#38bdf8",
                padding: "4px 12px",
                borderRadius: 8,
                fontSize: "0.85rem",
                fontWeight: 800,
                display: "inline-flex",
                alignItems: "center",
                gap: 6
              }}>
                <MapPin size={15} /> Calculated ETA: {targetEtaFormatted}
              </span>

              <span style={{
                background: isArrived
                  ? "rgba(16, 185, 129, 0.2)"
                  : secondsUntilTargetEta > 0
                  ? "rgba(16, 185, 129, 0.15)"
                  : "rgba(239, 68, 68, 0.22)",
                border: `1px solid ${
                  isArrived
                    ? "#10b981"
                    : secondsUntilTargetEta > 0
                    ? "#10b981"
                    : "#ef4444"
                }`,
                color: isArrived
                  ? "#34d399"
                  : secondsUntilTargetEta > 0
                  ? "#34d399"
                  : "#fca5a5",
                padding: "4px 12px",
                borderRadius: 8,
                fontSize: "0.85rem",
                fontWeight: 800,
                display: "inline-flex",
                alignItems: "center",
                gap: 6
              }}>
                {isArrived ? (
                  <>🎉 Arrived Safely</>
                ) : secondsUntilTargetEta > 0 ? (
                  <>🟢 On Schedule ({minStr(secondsUntilTargetEta)} remaining)</>
                ) : (
                  <>🚨 Overdue ({minStr(Math.abs(secondsUntilTargetEta))} past ETA — 3m Check Active)</>
                )}
              </span>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button
              onClick={handleTriggerEmergencySos}
              disabled={sosLoading}
              className="btn"
              style={{
                background: "linear-gradient(135deg, #ef4444, #dc2626)",
                borderColor: "#b91c1c",
                color: "#fff",
                fontWeight: "bold",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                boxShadow: "0 0 14px rgba(239, 68, 68, 0.5)"
              }}
            >
              <PhoneCall size={16} /> {sosLoading ? "Dispatching SOS..." : "Emergency SOS"}
            </button>
            <button
              onClick={handleEndJourney}
              className="btn ghost sm"
              style={{ borderColor: "rgba(255,255,255,0.2)" }}
            >
              End Journey
            </button>
          </div>
        </div>

        {/* 2. THE TWO DEDICATED TRACKING MODE OPTIONS (SEGMENTED TABS) */}
        <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <div>
              <span className="mut" style={{ fontSize: "0.78rem", marginRight: 8 }}>TRACKING ENGINE:</span>
              <div
                style={{
                  display: "inline-flex",
                  background: "rgba(0, 0, 0, 0.35)",
                  padding: 4,
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.12)",
                  gap: 4
                }}
              >
                {/* Mode 1: Primary Real-Time GPS Tracking */}
                <button
                  type="button"
                  onClick={() => handleSwitchMode("gps")}
                  className="btn sm"
                  style={{
                    background: trackingMode === "gps" ? "linear-gradient(90deg, #10b981, #059669)" : "transparent",
                    color: trackingMode === "gps" ? "#fff" : "#94a3b8",
                    borderColor: trackingMode === "gps" ? "#10b981" : "transparent",
                    fontWeight: 700,
                    padding: "6px 14px",
                    fontSize: "0.82rem",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6
                  }}
                >
                  <LocateFixed size={15} /> 📡 Real-Time GPS Tracking (Primary)
                </button>

                {/* Mode 2: Simulation Mode */}
                <button
                  type="button"
                  onClick={() => handleSwitchMode("simulation")}
                  className="btn sm"
                  style={{
                    background: trackingMode === "simulation" ? "linear-gradient(90deg, #6366f1, #8b5cf6)" : "transparent",
                    color: trackingMode === "simulation" ? "#fff" : "#94a3b8",
                    borderColor: trackingMode === "simulation" ? "#818cf8" : "transparent",
                    fontWeight: 700,
                    padding: "6px 14px",
                    fontSize: "0.82rem",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6
                  }}
                >
                  <Zap size={15} /> ⚡ Simulation
                </button>
              </div>
            </div>

            {/* Live Mode Indicator Tag */}
            <div>
              {trackingMode === "gps" ? (
                <span
                  style={{
                    fontSize: "0.78rem",
                    color: gpsError ? "#f87171" : "#34d399",
                    fontWeight: 600,
                    background: gpsError ? "rgba(239, 68, 68, 0.15)" : "rgba(16, 185, 129, 0.15)",
                    padding: "4px 10px",
                    borderRadius: 8,
                    border: `1px solid ${gpsError ? "#ef4444" : "#10b981"}`
                  }}
                >
                  {gpsStatus}
                </span>
              ) : (
                <span
                  style={{
                    fontSize: "0.78rem",
                    color: "#a5b4fc",
                    fontWeight: 600,
                    background: "rgba(99, 102, 241, 0.15)",
                    padding: "4px 10px",
                    borderRadius: 8,
                    border: "1px solid #6366f1"
                  }}
                >
                  ⚡ Simulation Active ({simSpeed}x Speed)
                </span>
              )}
            </div>
          </div>

          {/* Mode Guidance Note */}
          <div style={{ marginTop: 8, fontSize: "0.78rem", color: "#94a3b8" }}>
            {trackingMode === "gps" ? (
              <span>
                📡 <b>Primary Real-Time GPS Tracking</b> monitors the traveler's physical device location via satellite in real time.
                If testing indoors or demonstrating route movement, switch to <b>"Simulation"</b> to preview forward transit along the road.
              </span>
            ) : (
              <span>
                ⚡ <b>Simulation Mode</b> allows you to preview the traveler moving forward along the planned road, verify route corridor compliance, and test emergency safeguards.
              </span>
            )}
          </div>
        </div>

        {/* Interactive Live Journey Progress Bar & Route Controller */}
        <div
          style={{
            marginTop: 18,
            padding: "16px 18px",
            background: "rgba(15, 23, 42, 0.65)",
            border: "1px solid rgba(99, 102, 241, 0.25)",
            borderRadius: 14,
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)"
          }}
        >
          {/* Header Row: Metrics & Quick Help */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 10
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 10px",
                  background: isArrived
                    ? "rgba(16, 185, 129, 0.2)"
                    : isOffRoute
                    ? "rgba(239, 68, 68, 0.2)"
                    : "rgba(99, 102, 241, 0.2)",
                  border: `1px solid ${isArrived ? "#10b981" : isOffRoute ? "#ef4444" : "#6366f1"}`,
                  borderRadius: 20,
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  color: isArrived ? "#10b981" : isOffRoute ? "#ef4444" : "#a5b4fc"
                }}
              >
                {isArrived ? (
                  <>
                    <CheckCircle size={14} /> Reached Destination (100%)
                  </>
                ) : isOffRoute ? (
                  <>
                    <AlertTriangle size={14} /> Off-Route ({liveDeviationM}m)
                  </>
                ) : (
                  <>
                    <Navigation size={14} className="spin" style={{ animationDuration: "6s" }} />
                    En Route: {percentCompleted}% Completed
                  </>
                )}
              </div>

              <span style={{ fontSize: "0.82rem", color: "#94a3b8" }}>
                <b>{kmStr(distTravelledM)}</b> covered of <b>{kmStr(totalPlannedDist)}</b>
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: "0.82rem" }}>
              <span style={{ color: "#cbd5e1" }}>
                ⏱️ Remaining:{" "}
                <b style={{ color: "#38bdf8" }}>
                  {isArrived ? "0 min" : minStr(remainingEtaSec)}
                </b>{" "}
                ({kmStr(distRemainingM)})
              </span>
              <span
                style={{
                  color: "#94a3b8",
                  fontSize: "0.75rem",
                  background: "rgba(255, 255, 255, 0.06)",
                  padding: "2px 8px",
                  borderRadius: 6
                }}
              >
                👆 Click or drag bar to jump along route
              </span>
            </div>
          </div>

          {/* Interactive Progress Track with Scrubbing and Moving Traveler Pin */}
          <div
            role="slider"
            aria-valuenow={percentCompleted}
            aria-valuemin="0"
            aria-valuemax="100"
            tabIndex={0}
            onPointerDown={handleBarPointerDown}
            onPointerMove={handleBarPointerMove}
            onPointerUp={handleBarPointerUp}
            onClick={handleBarClick}
            style={{
              position: "relative",
              width: "100%",
              height: 24,
              background: "rgba(30, 41, 59, 0.8)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: 12,
              cursor: "pointer",
              userSelect: "none",
              touchAction: "none",
              padding: 2,
              boxShadow: "inset 0 2px 6px rgba(0, 0, 0, 0.6)"
            }}
            title="Click or drag to scrub traveler position along the route"
          >
            {/* Filled Progress Gradient Bar */}
            <div
              style={{
                width: `${Math.max(1, percentCompleted)}%`,
                height: "100%",
                background: `linear-gradient(90deg, #6366f1 0%, ${routeColor} 100%)`,
                borderRadius: 10,
                transition: isScrubbing ? "none" : "width 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                boxShadow: `0 0 12px ${routeColor}`,
                position: "relative",
                overflow: "hidden"
              }}
            >
              {/* Shimmer animation strip */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundImage:
                    "linear-gradient(45deg, rgba(255,255,255,0.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.15) 75%, transparent 75%, transparent)",
                  backgroundSize: "20px 20px",
                  opacity: simPlaying ? 0.6 : 0.2
                }}
              />
            </div>

            {/* Waypoint Ticks at 25%, 50%, 75% */}
            {[25, 50, 75].map(pct => (
              <div
                key={pct}
                style={{
                  position: "absolute",
                  left: `${pct}%`,
                  top: 4,
                  bottom: 4,
                  width: 2,
                  background:
                    percentCompleted >= pct
                      ? "rgba(255, 255, 255, 0.7)"
                      : "rgba(255, 255, 255, 0.2)",
                  transform: "translateX(-50%)",
                  pointerEvents: "none",
                  zIndex: 2
                }}
              />
            ))}

            {/* Floating Traveler Avatar Pin */}
            <div
              style={{
                position: "absolute",
                left: `calc(${percentCompleted}% - 15px)`,
                top: -6,
                width: 30,
                height: 30,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #ec4899, #8b5cf6)",
                border: "2px solid #ffffff",
                boxShadow: "0 0 14px rgba(236, 72, 153, 0.95), 0 3px 6px rgba(0,0,0,0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "15px",
                zIndex: 10,
                pointerEvents: "none",
                transition: isScrubbing ? "none" : "left 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                transform: isScrubbing ? "scale(1.2)" : "scale(1)"
              }}
            >
              👩
            </div>
          </div>

          {/* Milestone Quick Jump Buttons & Simulation Controls */}
          <div
            style={{
              marginTop: 12,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 8
            }}
          >
            {/* Milestone Jump Chips */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.74rem", color: "#94a3b8", fontWeight: 600 }}>
                Milestones:
              </span>
              {[
                { label: "🏁 0% Start", pct: 0 },
                { label: "📍 25%", pct: 25 },
                { label: "📍 50% Mid", pct: 50 },
                { label: "📍 75%", pct: 75 },
                { label: "🎉 100% Dest", pct: 100 }
              ].map(m => {
                const isActive = Math.abs(percentCompleted - m.pct) <= 3;
                return (
                  <button
                    key={m.pct}
                    type="button"
                    onClick={() => handleSeekProgress(m.pct)}
                    className="btn sm"
                    style={{
                      padding: "3px 8px",
                      fontSize: "0.74rem",
                      background: isActive
                        ? "linear-gradient(90deg, #6366f1, #8b5cf6)"
                        : "rgba(255, 255, 255, 0.05)",
                      borderColor: isActive ? "#818cf8" : "rgba(255, 255, 255, 0.12)",
                      color: isActive ? "#fff" : "#cbd5e1",
                      borderRadius: 8,
                      fontWeight: isActive ? 700 : 500
                    }}
                    title={`Jump traveler to ${m.pct}% along the route`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>

            {/* Quick Simulation Bar Controls */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                type="button"
                onClick={() => {
                  if (trackingMode !== "simulation") {
                    setTrackingMode("simulation");
                    setSimPlaying(true);
                  } else {
                    setSimPlaying(!simPlaying);
                  }
                }}
                className="btn sm"
                style={{
                  padding: "4px 10px",
                  fontSize: "0.76rem",
                  background:
                    trackingMode === "simulation" && simPlaying
                      ? "rgba(239, 68, 68, 0.2)"
                      : "rgba(16, 185, 129, 0.2)",
                  borderColor:
                    trackingMode === "simulation" && simPlaying ? "#ef4444" : "#10b981",
                  color: "#fff",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5
                }}
              >
                {trackingMode === "simulation" && simPlaying ? (
                  <>
                    <Pause size={12} /> Pause
                  </>
                ) : (
                  <>
                    <Play size={12} /> {trackingMode === "simulation" ? "Play" : "Start Sim"}
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleRestartSimulation}
                className="btn sm ghost"
                style={{ padding: "4px 8px", fontSize: "0.76rem" }}
                title="Restart simulation from start"
              >
                <RotateCcw size={12} /> Reset
              </button>

              {/* Speed Buttons */}
              <div
                style={{
                  display: "inline-flex",
                  background: "rgba(0,0,0,0.3)",
                  borderRadius: 6,
                  padding: 2,
                  border: "1px solid rgba(255,255,255,0.08)"
                }}
              >
                {[1, 2, 5].map(spd => (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => {
                      setSimSpeed(spd);
                      if (trackingMode !== "simulation") setTrackingMode("simulation");
                      setSimPlaying(true);
                    }}
                    style={{
                      background:
                        simSpeed === spd && trackingMode === "simulation"
                          ? "#6366f1"
                          : "transparent",
                      color:
                        simSpeed === spd && trackingMode === "simulation"
                          ? "#fff"
                          : "#94a3b8",
                      border: "none",
                      borderRadius: 4,
                      padding: "2px 6px",
                      fontSize: "0.72rem",
                      cursor: "pointer",
                      fontWeight: 700
                    }}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Off-Route Deviation Auto-SOS Warning Modal */}
      {deviationPrompt > 0 && (
        <div
          style={{
            padding: "16px 20px",
            background: "rgba(239, 68, 68, 0.2)",
            border: "2px solid #ef4444",
            borderRadius: 14,
            marginBottom: 16,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#ef4444", color: "#fff", display: "grid", placeItems: "center" }}>
              <AlertTriangle size={24} />
            </div>
            <div>
              <b style={{ color: "#ef4444", fontSize: "1.05rem" }}>
                ⚠️ Route Deviation Detected! ({liveDeviationM}m off planned route)
              </b>
              <div className="mut" style={{ fontSize: "0.82rem" }}>
                Automatic SOS alert will dispatch to trusted emergency contacts in <b>{deviationPrompt}s</b> unless you confirm safety.
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="btn sm"
              onClick={handleClearDeviation}
              style={{ background: "#10b981", color: "#fff", fontWeight: "bold" }}
            >
              <CheckCircle size={14} /> I Am Safe (Cancel Alarm)
            </button>
            <button
              className="btn sm"
              onClick={handleTriggerEmergencySos}
              style={{ background: "#ef4444", color: "#fff" }}
            >
              Dispatch SOS Now
            </button>
          </div>
        </div>
      )}

      {/* Arrival Celebration Banner */}
      {isArrived && (
        <div
          style={{
            padding: "16px 20px",
            background: "rgba(16, 185, 129, 0.15)",
            border: "2px solid #10b981",
            borderRadius: 14,
            marginBottom: 16,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#10b981", color: "#000", display: "grid", placeItems: "center" }}>
              <CheckCircle size={24} />
            </div>
            <div>
              <b style={{ color: "#10b981", fontSize: "1.05rem" }}>🎉 Destination Reached Safely!</b>
              <div className="mut" style={{ fontSize: "0.82rem" }}>
                The traveler has arrived at {activeJourney.dest_label?.split(",")[0]}. Safe Journey Complete.
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {trackingMode === "simulation" && (
              <button className="btn sm ghost" onClick={handleRestartSimulation}>
                <RotateCcw size={14} /> Replay Simulation
              </button>
            )}
            <button className="btn sm" onClick={handleEndJourney} style={{ background: "#10b981" }}>
              Complete & Archive
            </button>
          </div>
        </div>
      )}

      {/* Safe Check-in Toast Banner */}
      {safeCheckinMsg && (
        <div style={{ padding: "12px 16px", background: "rgba(16, 185, 129, 0.2)", border: "1px solid #10b981", borderRadius: 8, color: "#6ee7b7", marginBottom: 16, display: "flex", gap: 8, alignItems: "center" }}>
          <CheckCircle size={18} />
          <span style={{ fontWeight: 600 }}>{safeCheckinMsg}</span>
        </div>
      )}

      {/* Loud Siren Alarm Active Banner */}
      {alarmRinging && (
        <div
          style={{
            padding: "16px 20px",
            background: "linear-gradient(135deg, #ef4444, #b91c1c)",
            border: "2px solid #ffffff",
            borderRadius: 14,
            marginBottom: 16,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
            boxShadow: "0 0 30px rgba(239, 68, 68, 0.9)",
            color: "#fff"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#fff", color: "#ef4444", display: "grid", placeItems: "center" }}>
              <Volume2 size={26} className="spin" />
            </div>
            <div>
              <b style={{ fontSize: "1.1rem", display: "block" }}>
                🚨 LOUD EMERGENCY SIREN ALARM RINGING!
              </b>
              <div style={{ fontSize: "0.85rem", opacity: 0.95 }}>
                High-volume distress sound is sounding to deter threats and alert bystanders.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={stopLoudSiren}
            className="btn"
            style={{ background: "#fff", color: "#b91c1c", fontWeight: 800, border: "none", display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <VolumeX size={16} /> Silence Siren Alarm
          </button>
        </div>
      )}

      {/* OVERDUE SAFETY CHECK PROMPT MODAL (3-Minute Countdown & Auto-SOS Escalation) */}
      {showEtaCheckPrompt && (
        <div className="modal" style={{ zIndex: 10000, background: "rgba(0, 0, 0, 0.85)", backdropFilter: "blur(8px)" }}>
          <div
            className="card"
            style={{
              maxWidth: 540,
              width: "92%",
              border: "3px solid #ef4444",
              background: "linear-gradient(135deg, #2a0815, #0f172a)",
              boxShadow: "0 0 50px rgba(239, 68, 68, 0.55)",
              borderRadius: 20,
              padding: "28px 24px",
              textAlign: "center"
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "rgba(239, 68, 68, 0.2)",
                color: "#ef4444",
                display: "grid",
                placeItems: "center",
                margin: "0 auto 16px",
                border: "2px solid #ef4444",
                boxShadow: "0 0 20px rgba(239, 68, 68, 0.6)"
              }}
            >
              <Clock size={36} />
            </div>

            <h2 style={{ color: "#fff", margin: "0 0 8px", fontSize: "1.4rem", fontWeight: 800 }}>
              🚨 Safety Check: Journey Time Exceeded ETA!
            </h2>

            <p style={{ color: "#cbd5e1", fontSize: "0.95rem", lineHeight: 1.5, margin: "0 0 16px" }}>
              Your journey time to <b style={{ color: "#fff" }}>{activeJourney.dest_label?.split(",")[0] || "Destination"}</b> has exceeded your estimated arrival time (ETA of <b style={{ color: "#38bdf8" }}>{targetEtaFormatted}</b>).
            </p>

            {/* Journey Stats Bar inside Modal */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 12,
              padding: "10px 14px",
              marginBottom: 16
            }}>
              <div>
                <span className="mut" style={{ fontSize: "0.72rem" }}>TOTAL JOURNEY TIME</span>
                <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#f472b6" }}>
                  ⏱️ {formatTimeElapsed(elapsedJourneySec)}
                </div>
              </div>
              <div>
                <span className="mut" style={{ fontSize: "0.72rem" }}>OVERDUE DURATION</span>
                <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#f87171" }}>
                  ⚠️ {minStr(Math.abs(secondsUntilTargetEta))} past ETA
                </div>
              </div>
            </div>

            {/* 3-Minute Countdown Warning Box */}
            <div
              style={{
                background: "rgba(239, 68, 68, 0.18)",
                border: "2px solid #ef4444",
                borderRadius: 14,
                padding: "14px 18px",
                marginBottom: 20
              }}
            >
              <div style={{ color: "#fca5a5", fontSize: "0.85rem", fontWeight: 600, marginBottom: 6 }}>
                ⚠️ Are you safe? Please reply within 3 minutes:
              </div>
              <div style={{ fontSize: "1.9rem", fontWeight: 900, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, letterSpacing: 1 }}>
                <BellRing size={26} color="#ef4444" className="spin" />
                <span>Auto-SOS in: <span style={{ color: "#ef4444" }}>{formatCountdown(etaPromptCountdown)}</span></span>
              </div>
              <div style={{ fontSize: "0.75rem", color: "#fca5a5", marginTop: 6, lineHeight: 1.4 }}>
                If you do not reply before the 3-minute timer reaches <b>00:00</b>, ABHAYA will automatically activate <b>Emergency SOS</b>, ring the loud siren, and dispatch your live GPS location to your emergency circle via SMS & WhatsApp!
              </div>

              {/* Countdown Progress Bar (180 seconds) */}
              <div style={{ width: "100%", height: 6, background: "rgba(0,0,0,0.4)", borderRadius: 3, marginTop: 10, overflow: "hidden" }}>
                <div style={{
                  width: `${(etaPromptCountdown / 180) * 100}%`,
                  height: "100%",
                  background: "linear-gradient(90deg, #ef4444, #f59e0b)",
                  transition: "width 1s linear"
                }} />
              </div>
            </div>

            {/* User Choice Response Buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Option 1: Yes, I Am Safe (Reply within 3 min) */}
              <button
                type="button"
                onClick={() => handleConfirmSafeAndExtend(5)}
                className="btn"
                style={{
                  background: "linear-gradient(135deg, #10b981, #059669)",
                  borderColor: "#10b981",
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: "1.05rem",
                  padding: "14px 20px",
                  justifyContent: "center",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  boxShadow: "0 0 20px rgba(16, 185, 129, 0.45)"
                }}
              >
                <CheckCircle size={22} /> 🟢 Yes, I Am Safe — Pause Alert for 5 Minutes
              </button>

              <div style={{ fontSize: "0.76rem", color: "#6ee7b7", textAlign: "center", marginTop: -4 }}>
                ✓ Immediately silences alert and will not pop up again for 5 minutes
              </div>

              <button
                type="button"
                onClick={() => handleConfirmSafeAndExtend(10)}
                className="btn ghost sm"
                style={{ color: "#cbd5e1", fontSize: "0.85rem", borderColor: "rgba(255,255,255,0.2)" }}
              >
                Delayed in traffic, but I am safe (Pause alert for 10 min)
              </button>

              {/* Option 2: Arrived Safely */}
              <button
                type="button"
                onClick={handleEndJourney}
                className="btn ghost sm"
                style={{ color: "#38bdf8", fontSize: "0.85rem", borderColor: "rgba(56, 189, 248, 0.3)" }}
              >
                📍 I Have Reached My Destination Safely
              </button>

              {/* Option 3: Immediate Danger */}
              <button
                type="button"
                onClick={handleEmergencyNo}
                className="btn sm"
                style={{
                  background: "rgba(239, 68, 68, 0.2)",
                  borderColor: "#ef4444",
                  color: "#fca5a5",
                  fontWeight: 700,
                  fontSize: "0.9rem",
                  padding: "10px 16px",
                  justifyContent: "center",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 6
                }}
              >
                <PhoneCall size={16} /> 🚨 No, I Am in Danger! (Trigger SOS Immediately)
              </button>

              {/* Fast Demonstration Test Button */}
              <div style={{ marginTop: 8, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                <button
                  type="button"
                  onClick={handleFastForwardCountdown}
                  className="btn ghost sm"
                  style={{
                    fontSize: "0.75rem",
                    color: "#fcd34d",
                    borderColor: "rgba(252, 211, 77, 0.3)",
                    width: "100%",
                    justifyContent: "center"
                  }}
                  title="Fast-forward countdown to 5 seconds to test automatic SOS dispatch"
                >
                  ⚡ Fast-Forward Timer to 5s (Test Automatic SOS Dispatch)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SOS Toast Message */}
      {sosStatus && (
        <div style={{ padding: "12px 16px", background: "rgba(239, 68, 68, 0.2)", border: "1px solid #ef4444", borderRadius: 8, color: "#fca5a5", marginBottom: 16, display: "flex", gap: 8, alignItems: "center" }}>
          <AlertTriangle size={18} />
          <span>{sosStatus}</span>
        </div>
      )}

      {errorMessage && (
        <div style={{ padding: "12px 16px", background: "rgba(239, 68, 68, 0.2)", border: "1px solid #ef4444", borderRadius: 8, color: "#fca5a5", marginBottom: 16, display: "flex", gap: 8, alignItems: "center" }}>
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 3. Main Content: Map (Left) & Telemetry / Safeguards (Right) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16 }}>
        {/* Left Side: Interactive Live Navigation Map */}
        <div>
          <div className="card" style={{ padding: 10, position: "relative" }}>
            {/* Map Header Status Bar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 8px 10px", flexWrap: "wrap", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span className="badge" style={{ borderColor: routeColor, color: routeColor }}>
                  <Navigation size={13} style={{ marginRight: 4, verticalAlign: "middle" }} />
                  {trackingMode === "gps" ? "Satellite GPS Navigation" : "Route Simulation"}
                </span>
                <span className="mut" style={{ fontSize: "0.8rem" }}>
                  Traveler: <b>{trackingMode === "gps" ? "Tracking Girl's GPS Live 📡" : simPlaying ? "Moving Forward ▶" : "Simulation Paused ⏸"}</b>
                </span>
              </div>

              {/* 3D vs 2D Basemap Switcher */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div style={{ display: "inline-flex", background: "#0B1020", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: 2 }}>
                  <button
                    type="button"
                    onClick={() => setMapDimension("3d")}
                    className="btn sm"
                    style={{
                      fontSize: "0.75rem",
                      padding: "4px 12px",
                      borderRadius: 6,
                      background: mapDimension === "3d" ? "linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)" : "transparent",
                      color: "#fff",
                      border: "none",
                      fontWeight: mapDimension === "3d" ? 700 : 500,
                      boxShadow: mapDimension === "3d" ? "0 0 12px rgba(59,130,246,0.45)" : "none",
                      cursor: "pointer"
                    }}
                  >
                    🌐 3D Photorealistic View (India)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMapDimension("2d")}
                    className="btn sm"
                    style={{
                      fontSize: "0.75rem",
                      padding: "4px 10px",
                      borderRadius: 6,
                      background: mapDimension === "2d" ? "#3B82F6" : "transparent",
                      color: mapDimension === "2d" ? "#fff" : "#94A3B8",
                      border: "none",
                      fontWeight: mapDimension === "2d" ? 700 : 500,
                      cursor: "pointer"
                    }}
                  >
                    🗺️ 2D Tactical View
                  </button>
                </div>

                {/* India Exclusive Boundary Badge */}
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    background: "rgba(16, 185, 129, 0.15)",
                    border: "1px solid #10b981",
                    borderRadius: 6,
                    padding: "3px 8px",
                    fontSize: "0.72rem",
                    color: "#34d399",
                    fontWeight: 700
                  }}
                  title="Map boundaries strictly confined to Indian territory"
                >
                  <span>🇮🇳 INDIA EXCLUSIVE 3D MAP</span>
                </div>

                <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.8rem", cursor: "pointer", margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={followTraveler}
                    onChange={e => setFollowTraveler(e.target.checked)}
                    style={{ width: "auto", margin: 0 }}
                  />
                  <span>Auto-Center Map on Traveler</span>
                </label>
              </div>
            </div>

            {/* High-Resolution Map Viewport */}
            <div
              style={{
                height: 540,
                borderRadius: 14,
                overflow: "hidden",
                position: "relative",
                background: "#080d1a",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                boxShadow: "0 8px 30px rgba(0, 0, 0, 0.45)"
              }}
            >
              {/* Floating 'SHOW LABELS' Toggle Switch (Exact Google 3D Maps Style) */}
              <div
                style={{
                  position: "absolute",
                  top: 14,
                  left: "50%",
                  transform: "translateX(-50%)",
                  zIndex: 1001,
                  background: "#ffffff",
                  color: "#0f172a",
                  padding: "6px 16px",
                  borderRadius: 24,
                  boxShadow: "0 6px 20px rgba(0, 0, 0, 0.45), 0 0 1px rgba(0,0,0,0.3)",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  fontWeight: 800,
                  fontSize: "0.78rem",
                  letterSpacing: "0.6px",
                  userSelect: "none",
                  pointerEvents: "auto"
                }}
              >
                <span style={{ color: "#334155" }}>SHOW LABELS</span>
                <button
                  type="button"
                  onClick={() => setShowLabels(!showLabels)}
                  style={{
                    width: 44,
                    height: 24,
                    borderRadius: 12,
                    background: showLabels ? "#2563eb" : "#cbd5e1",
                    border: "none",
                    cursor: "pointer",
                    position: "relative",
                    transition: "background 0.2s ease",
                    padding: 2
                  }}
                  title="Toggle Street Names and Landmark Labels on Map"
                >
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      background: "#ffffff",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.25)",
                      transform: showLabels ? "translateX(20px)" : "translateX(0px)",
                      transition: "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
                    }}
                  />
                </button>
              </div>

              {/* Indian Safe Cities Quick Jump Bar (Bottom Left Overlay) */}
              <div
                style={{
                  position: "absolute",
                  bottom: 12,
                  left: 12,
                  zIndex: 1000,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: "rgba(15, 23, 42, 0.9)",
                  backdropFilter: "blur(6px)",
                  border: "1px solid rgba(255,255,255,0.18)",
                  borderRadius: 10,
                  padding: "5px 10px",
                  fontSize: "0.72rem",
                  boxShadow: "0 4px 15px rgba(0,0,0,0.5)"
                }}
              >
                <span style={{ color: "#94a3b8", fontWeight: 700 }}>🇮🇳 Safe Cities:</span>
                {INDIA_CITIES.map(c => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => {
                      setFollowTraveler(false);
                      setFlyToTarget({ pos: c.pos, zoom: 16 });
                    }}
                    style={{
                      background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.15)",
                      borderRadius: 6,
                      color: "#38bdf8",
                      padding: "2px 7px",
                      fontSize: "0.7rem",
                      cursor: "pointer",
                      fontWeight: 600
                    }}
                    title={`Jump map to ${c.name} in India`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>

              {/* MapLibre GL Native WebGL 3D Map (True 3D Pitch, Camera Orbit, Google Satellite, India Locked) */}
              <MapLibre3DGuardian
                coords={rawCoords}
                currentPos={currentPos}
                travelerBearing={travelerBearing}
                origin={activeJourney.origin}
                originLabel={activeJourney.origin_label}
                dest={activeJourney.dest}
                destLabel={activeJourney.dest_label}
                routeColor={routeColor}
                mapDimension={mapDimension}
                showLabels={showLabels}
                followTraveler={followTraveler}
                flyToTarget={flyToTarget}
              />
            </div>

              {/* Bottom Controls Bar depending on selected Mode */}
              <div
              style={{
                marginTop: 10,
                padding: "10px 14px",
                background: "rgba(255,255,255,0.02)",
                borderRadius: 10,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 10
              }}
            >
              {trackingMode === "gps" ? (
                /* GPS Mode Controls */
                <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 8px #10b981" }} />
                    <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#fff" }}>
                      Live GPS Stream: {gpsPosition ? `${gpsPosition[0].toFixed(5)}, ${gpsPosition[1].toFixed(5)}` : "Acquiring satellites..."}
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      className="btn sm ghost"
                      onClick={() => {
                        if (navigator.geolocation) {
                          navigator.geolocation.getCurrentPosition(
                            p => {
                              const pt = [p.coords.latitude, p.coords.longitude];
                              setGpsPosition(pt);
                              setCurrentPos(pt);
                            },
                            null,
                            { enableHighAccuracy: true }
                          );
                        }
                      }}
                      style={{ fontSize: "0.78rem" }}
                    >
                      <LocateFixed size={14} /> Refresh GPS Fix
                    </button>
                    <button
                      type="button"
                      className="btn sm"
                      onClick={() => handleSwitchMode("simulation")}
                      style={{ fontSize: "0.78rem", background: "rgba(99, 102, 241, 0.2)", borderColor: "#818cf8" }}
                    >
                      Switch to Simulation &rarr;
                    </button>
                  </div>
                </div>
              ) : (
                /* Simulation Mode Controls */
                <>
                  {/* Play / Pause / Restart */}
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <button
                      className="btn sm"
                      onClick={() => setSimPlaying(!simPlaying)}
                      style={{
                        background: simPlaying ? "rgba(239, 68, 68, 0.2)" : "rgba(16, 185, 129, 0.2)",
                        borderColor: simPlaying ? "#ef4444" : "#10b981",
                        color: "#fff"
                      }}
                    >
                      {simPlaying ? (
                        <>
                          <Pause size={14} /> Pause
                        </>
                      ) : (
                        <>
                          <Play size={14} /> Resume Forward
                        </>
                      )}
                    </button>

                    <button
                      className="btn ghost sm"
                      onClick={handleRestartSimulation}
                      title="Restart simulation from start"
                    >
                      <RotateCcw size={14} /> Restart
                    </button>
                  </div>

                  {/* Speed Selector */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.8rem" }}>
                    <span className="mut">Speed:</span>
                    {[1, 2, 5, 10].map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSimSpeed(s)}
                        className="btn sm ghost"
                        style={{
                          padding: "2px 8px",
                          fontSize: "0.75rem",
                          background: simSpeed === s ? "rgba(99, 102, 241, 0.3)" : "transparent",
                          borderColor: simSpeed === s ? "#818cf8" : "rgba(255,255,255,0.1)",
                          color: simSpeed === s ? "#c7d2fe" : "#94a3b8"
                        }}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>

                  {/* Action Buttons: I'm Safe & Emergency SOS & Alarm Test */}
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    {/* 🟢 I'm Safe Button */}
                    <button
                      type="button"
                      onClick={handleImSafe}
                      className="btn sm"
                      style={{
                        background: "rgba(16, 185, 129, 0.2)",
                        borderColor: "#10b981",
                        color: "#34d399",
                        fontWeight: 700,
                        fontSize: "0.78rem",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5
                      }}
                      title="Confirm you are safe and reset alerts"
                    >
                      <CheckCircle size={14} /> I'm Safe
                    </button>

                    {/* 🚨 Emergency SOS Button */}
                    <button
                      type="button"
                      onClick={handleTriggerEmergencySos}
                      disabled={sosLoading}
                      className="btn sm"
                      style={{
                        background: "linear-gradient(135deg, #ef4444, #dc2626)",
                        borderColor: "#b91c1c",
                        color: "#fff",
                        fontWeight: "bold",
                        fontSize: "0.78rem",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        boxShadow: "0 0 10px rgba(239, 68, 68, 0.4)"
                      }}
                      title="Trigger Real Emergency SOS Alert"
                    >
                      <PhoneCall size={14} /> {sosLoading ? "Sending SOS..." : "SOS"}
                    </button>

                    {/* Off-Route Alarm Test */}
                    {!isSimulatedDeviation ? (
                      <button
                        type="button"
                        onClick={handleSimulateDeviationAlert}
                        className="btn sm ghost"
                        style={{
                          fontSize: "0.75rem",
                          borderColor: "#f59e0b",
                          color: "#fcd34d"
                        }}
                        title="Test off-route deviation alarm and auto-SOS countdown"
                      >
                        <AlertTriangle size={13} /> Off-Route Test
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleClearDeviation}
                        className="btn sm"
                        style={{ fontSize: "0.75rem", background: "#10b981" }}
                      >
                        <CheckCircle size={13} /> Back on Route
                      </button>
                    )}

                    {/* Test ETA Overdue Button */}
                    <button
                      type="button"
                      onClick={handleTestOverdueCheck}
                      className="btn sm ghost"
                      style={{
                        fontSize: "0.75rem",
                        borderColor: "#ec4899",
                        color: "#f472b6",
                        fontWeight: 700
                      }}
                      title="Test ETA overdue safety check (Are you safe? 3-min countdown & loud alarm)"
                    >
                      <Clock size={13} /> ⏰ Test ETA Overdue (3-Min Auto-SOS)
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Live Telemetry & Safeguards Dashboard */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Live Telemetry Card */}
          <div className="card">
            <h3 style={{ fontSize: "1rem", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
              <TrendingUp size={16} color={routeColor} /> Live Trip Telemetry
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              {/* Primary Tile 1: Girl's Journey Elapsed Time */}
              <div style={{
                background: "rgba(236, 72, 153, 0.12)",
                border: "1px solid rgba(236, 72, 153, 0.35)",
                padding: "10px 12px",
                borderRadius: 10
              }}>
                <span className="mut" style={{ fontSize: "0.72rem", color: "#f472b6", fontWeight: 700 }}>
                  ⏱️ GIRL'S JOURNEY TIME
                </span>
                <div style={{ fontSize: "1.2rem", fontWeight: 900, color: "#fff", marginTop: 2 }}>
                  {formatTimeElapsed(elapsedJourneySec)}
                </div>
              </div>

              {/* Primary Tile 2: Target Calculated ETA */}
              <div style={{
                background: "rgba(56, 189, 248, 0.12)",
                border: "1px solid rgba(56, 189, 248, 0.35)",
                padding: "10px 12px",
                borderRadius: 10
              }}>
                <span className="mut" style={{ fontSize: "0.72rem", color: "#38bdf8", fontWeight: 700 }}>
                  🏁 CALCULATED ETA (CLOCK)
                </span>
                <div style={{ fontSize: "1.2rem", fontWeight: 900, color: "#38bdf8", marginTop: 2 }}>
                  {targetEtaFormatted}
                </div>
              </div>

              <div style={{ background: "rgba(255,255,255,0.03)", padding: "10px 12px", borderRadius: 10 }}>
                <span className="mut" style={{ fontSize: "0.72rem" }}>EST. TIME REMAINING</span>
                <div style={{ fontSize: "1.1rem", fontWeight: 800, color: isArrived ? "#10b981" : secondsUntilTargetEta > 0 ? "#fff" : "#f87171" }}>
                  {isArrived
                    ? "Arrived 🎉"
                    : secondsUntilTargetEta > 0
                    ? minStr(secondsUntilTargetEta)
                    : `⚠️ Overdue (${minStr(Math.abs(secondsUntilTargetEta))})`}
                </div>
              </div>

              <div style={{ background: "rgba(255,255,255,0.03)", padding: "10px 12px", borderRadius: 10 }}>
                <span className="mut" style={{ fontSize: "0.72rem" }}>TRANSIT SPEED</span>
                <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#fbbf24" }}>
                  {currentSpeedDisplay} km/h
                </div>
              </div>

              <div style={{ background: "rgba(255,255,255,0.03)", padding: "10px 12px", borderRadius: 10 }}>
                <span className="mut" style={{ fontSize: "0.72rem" }}>DISTANCE COVERED</span>
                <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#fff" }}>
                  {kmStr(distTravelledM)}
                </div>
              </div>

              <div style={{ background: "rgba(255,255,255,0.03)", padding: "10px 12px", borderRadius: 10 }}>
                <span className="mut" style={{ fontSize: "0.72rem" }}>DISTANCE REMAINING</span>
                <div style={{ fontSize: "1.1rem", fontWeight: 800, color: routeColor }}>
                  {kmStr(distRemainingM)}
                </div>
              </div>
            </div>

            {/* Transit Speed & Schedule Indicator */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 12px",
                background: "rgba(255,255,255,0.03)",
                borderRadius: 8,
                marginBottom: 10,
                fontSize: "0.78rem"
              }}
            >
              <span className="mut">Speed: <b>{currentSpeedDisplay} km/h</b></span>
              <span
                style={{
                  color: isArrived ? "#10b981" : secondsUntilTargetEta > 0 ? "#34d399" : "#f87171",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: 4
                }}
              >
                <Clock size={13} />
                {isArrived
                  ? "Arrived Safely"
                  : secondsUntilTargetEta > 0
                  ? `On Schedule (ETA in ${minStr(secondsUntilTargetEta)})`
                  : `ETA Exceeded (${minStr(Math.abs(secondsUntilTargetEta))} overdue)`}
              </span>
            </div>

            {/* Deviation Status Pill */}
            <div
              style={{
                padding: "8px 12px",
                background: isOffRoute ? "rgba(239, 68, 68, 0.15)" : "rgba(16, 185, 129, 0.1)",
                border: `1px solid ${isOffRoute ? "#ef4444" : "rgba(16, 185, 129, 0.3)"}`,
                borderRadius: 8,
                fontSize: "0.8rem",
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: isOffRoute ? "#fca5a5" : "#6ee7b7"
              }}
            >
              {isOffRoute ? <AlertTriangle size={15} /> : <CheckCircle size={15} />}
              <span>
                {isOffRoute
                  ? `Route Deviation Alert: ${liveDeviationM} m away from corridor!`
                  : `Safe on Planned Corridor (${liveDeviationM} m deviation)`}
              </span>
            </div>
          </div>

          {/* Safety Guardian & Emergency Escalation Card */}
          <div className="card" style={{ background: "rgba(30, 27, 75, 0.4)", borderColor: "rgba(99, 102, 241, 0.3)" }}>
            <h3 style={{ fontSize: "1rem", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
              <Shield size={16} color="#818cf8" /> Guardian Protection
            </h3>

            <div style={{ fontSize: "0.8rem", lineHeight: 1.5, color: "#cbd5e1", marginBottom: 12 }}>
              ABHAYA actively monitors route compliance, arrival ETA, and inactivity. If you do not arrive on time or stop unexpectedly, an automatic safety check activates.
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: "0.78rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span className="mut">ETA Overdue Check:</span>
                <span style={{ color: "#38bdf8", fontWeight: 600 }}>Active (1m Auto-SOS & Siren)</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span className="mut">Auto-SOS Escalation:</span>
                <span style={{ color: "#10b981", fontWeight: 600 }}>Active (15s prompt)</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span className="mut">Deviation Threshold:</span>
                <span style={{ color: "#fff" }}>{activeJourney.deviation_threshold_m} meters</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span className="mut">Inactivity Timeout:</span>
                <span style={{ color: "#fff" }}>{activeJourney.inactivity_threshold_s} seconds</span>
              </div>
            </div>
          </div>

          {/* Emergency SOS Quick Dispatch */}
          <div
            className="card"
            style={{
              background: "rgba(239, 68, 68, 0.08)",
              borderColor: "rgba(239, 68, 68, 0.35)",
              textAlign: "center"
            }}
          >
            <div style={{ fontWeight: 700, color: "#fca5a5", fontSize: "0.9rem", marginBottom: 4 }}>
              Need Urgent Help?
            </div>
            <p className="mut" style={{ fontSize: "0.75rem", margin: "0 0 10px" }}>
              Instantly sends high-priority SMS & WhatsApp alert with your exact coordinates to emergency contacts.
            </p>
            <button
              onClick={handleTriggerEmergencySos}
              disabled={sosLoading}
              className="btn"
              style={{
                width: "100%",
                justifyContent: "center",
                background: "linear-gradient(135deg, #ef4444, #dc2626)",
                borderColor: "#b91c1c",
                fontWeight: "bold"
              }}
            >
              <PhoneCall size={16} /> {sosLoading ? "Dispatching SOS..." : "1-Tap Emergency SOS"}
            </button>
          </div>
        </div>
      </div>

      {/* 4. Active Emergency SOS Dispatched Modal */}
      {sosResult && (
        <div className="modal" style={{ zIndex: 9999, background: "rgba(0, 0, 0, 0.75)", backdropFilter: "blur(4px)" }}>
          <div
            className="card"
            style={{
              maxWidth: 580,
              width: "92%",
              border: "2px solid #ef4444",
              maxHeight: "90vh",
              overflowY: "auto",
              background: "linear-gradient(135deg, #1e1329, #0f172a)",
              boxShadow: "0 0 35px rgba(239, 68, 68, 0.5)",
              borderRadius: 16,
              padding: 24
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ color: "#ef4444", margin: 0, display: "flex", alignItems: "center", gap: 8, fontSize: "1.25rem" }}>
                <PhoneCall size={22} className="spin" /> 🚨 Emergency SOS Active
              </h3>
              <span className="badge b-verified" style={{ background: "#ef4444", color: "#fff", fontWeight: "bold" }}>
                LIVE ALERT DISPATCHED
              </span>
            </div>

            <p className="mut" style={{ margin: "2px 0 12px", fontSize: "0.85rem" }}>
              Event #{sosResult.sos?.id} &bull; {new Date(sosResult.sos?.created_at + "Z").toLocaleTimeString()} &bull; Journey #{activeJourney.id}
            </p>

            {/* Live Location Box with Google Maps Link */}
            <div
              style={{
                background: "rgba(239, 68, 68, 0.12)",
                border: "1px solid rgba(239, 68, 68, 0.35)",
                borderRadius: 8,
                padding: "10px 14px",
                marginBottom: 16
              }}
            >
              <div style={{ fontWeight: 700, color: "#fca5a5", marginBottom: 4, display: "flex", alignItems: "center", gap: 6, fontSize: "0.9rem" }}>
                <MapPin size={16} /> Exact Live Coordinates Dispatched:
              </div>
              {sosResult.sos?.map_url ? (
                <a
                  href={sosResult.sos.map_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "#38bdf8", textDecoration: "underline", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  📍 Open Live Pin on Google Maps ({sosResult.sos.lat?.toFixed(5)}, {sosResult.sos.lng?.toFixed(5)}) <ExternalLink size={13} />
                </a>
              ) : (
                <span className="mut">Location unavailable</span>
              )}
            </div>

            {/* Primary WhatsApp Dispatch Action Card */}
            {sosResult.contacts?.[0] && (
              <div
                style={{
                  background: sosResult.has_real_gateway ? "rgba(16, 185, 129, 0.12)" : "rgba(37, 211, 102, 0.12)",
                  border: `1px solid ${sosResult.has_real_gateway ? "#10b981" : "#25D366"}`,
                  borderRadius: 12,
                  padding: "14px 16px",
                  marginBottom: 16
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div style={{ fontWeight: 700, color: sosResult.has_real_gateway ? "#34d399" : "#25D366", fontSize: "0.95rem", display: "flex", alignItems: "center", gap: 8 }}>
                    <MessageCircle size={18} /> WhatsApp Emergency Alert
                  </div>
                  <span
                    className="badge"
                    style={{
                      background: sosResult.has_real_gateway ? "#10b981" : "#25D366",
                      color: "#000",
                      fontWeight: 700,
                      fontSize: "0.75rem",
                      padding: "2px 8px"
                    }}
                  >
                    {sosResult.has_real_gateway ? "CLOUD AUTO-SENT" : "PRE-FILLED READY"}
                  </span>
                </div>

                <p style={{ margin: "0 0 10px", fontSize: "0.82rem", color: "#e2e8f0", lineHeight: 1.4 }}>
                  {sosResult.has_real_gateway ? (
                    `Real emergency alert was dispatched directly to ${sosResult.contacts[0].name} (${sosResult.contacts[0].phone}) via Cloud Gateway.`
                  ) : (
                    `Emergency message with live GPS coordinates and Google Maps pin is pre-filled for ${sosResult.contacts[0].name} (${sosResult.contacts[0].phone}). Tap below to send instantly on WhatsApp:`
                  )}
                </p>

                {sosResult.contacts[0].wa_url && (
                  <a
                    href={sosResult.contacts[0].wa_url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn"
                    style={{
                      background: "#25D366",
                      color: "#fff",
                      fontWeight: 700,
                      textDecoration: "none",
                      fontSize: "0.9rem",
                      padding: "10px 18px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      borderRadius: 8,
                      boxShadow: "0 4px 14px rgba(37, 211, 102, 0.4)"
                    }}
                  >
                    📲 Open & Send on WhatsApp (+91 {sosResult.contacts[0].phone})
                  </a>
                )}

                {!sosResult.has_real_gateway && (
                  <div style={{ marginTop: 8, fontSize: "0.74rem", color: "#94a3b8" }}>
                    🔒 <i>Meta Security Note: WhatsApp requires 1 tap on 'Send' to prevent third-party sites from secretly messaging. For 100% silent automated background dispatch, configure Fast2SMS or Twilio in backend/.env.</i>
                  </div>
                )}
              </div>
            )}

            {/* Direct Send to Emergency Contacts */}
            {(() => {
              const journeyContactList = sosResult.contacts || [];
              const journeyCleanPhones = journeyContactList
                .map((c) => (c.phone || "").replace(/\D/g, ""))
                .filter(Boolean);
              const isIOSClient = typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);
              const journeyGroupSmsDelimiter = isIOSClient ? ";" : ",";
              const journeyLocStr = sosResult.sos?.map_url || (currentPos ? `https://www.google.com/maps?q=${currentPos[0]},${currentPos[1]}` : "Location unavailable");
              const journeySosText = encodeURIComponent(
                `🚨 ABHAYA EMERGENCY SOS! I need immediate help! Live Location: ${journeyLocStr} ` +
                (sosResult.evidence_pdf_url ? `SOS evidence PDF (link expires in 7 days): ${sosResult.evidence_pdf_url}` : "")
              );
              const journeyGroupSmsUrl = journeyCleanPhones.length > 0
                ? `sms:${journeyCleanPhones.join(journeyGroupSmsDelimiter)}${isIOSClient ? "&" : "?"}body=${journeySosText}`
                : null;

              return (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div style={{ fontWeight: 700, color: "#fff", fontSize: "0.95rem", display: "flex", alignItems: "center", gap: 6 }}>
                      ⚡ All Emergency Contacts:
                    </div>
                    <span className="badge b-verified" style={{ background: (sosResult.has_real_gateway || journeySosSentAllSuccess) ? "#10b981" : "#3b82f6", color: "#fff", fontSize: "0.75rem", padding: "3px 8px", fontWeight: "bold" }}>
                      {journeySosSentAllSuccess ? "SUBMITTED TO PROVIDER" : sosResult.has_real_gateway ? "AUTO-DISPATCHED" : "REGISTERED"}
                    </span>
                  </div>

                  {/* PROMINENT SEND ALL CONTACTS ACTION CARD */}
                  <div
                    style={{
                      background: journeySosSentAllSuccess ? "rgba(16, 185, 129, 0.15)" : "linear-gradient(135deg, rgba(239, 68, 68, 0.16) 0%, rgba(185, 28, 28, 0.22) 100%)",
                      border: `1.5px solid ${journeySosSentAllSuccess ? "#10b981" : "#ef4444"}`,
                      borderRadius: 8,
                      padding: "12px 14px",
                      marginBottom: 12
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 6 }}>
                      <div>
                        <b style={{ color: journeySosSentAllSuccess ? "#34d399" : "#fff", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: 6 }}>
                          📢 Send SOS Alert to All Contacts ({journeyContactList.length})
                        </b>
                        <div style={{ fontSize: "0.76rem", color: journeySosSentAllSuccess ? "#a7f3d0" : "#fca5a5", marginTop: 2 }}>
                          One tap to send the distress message with live location & evidence link to everyone.
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: "0.7rem",
                          padding: "2px 6px",
                          borderRadius: 4,
                          fontWeight: "bold",
                          background: journeySosSentAllSuccess ? "#10b981" : "#ef4444",
                          color: "#fff"
                        }}
                      >
                        {journeySosSentAllSuccess ? "✅ ALL SUBMITTED" : "ONE-CLICK MULTI-SEND"}
                      </span>
                    </div>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <button
                        type="button"
                        className="btn sm"
                        onClick={handleJourneySosSendAll}
                        disabled={journeySosSendingAll || journeyContactList.length === 0}
                        style={{
                          background: journeySosSentAllSuccess ? "#059669" : "#ef4444",
                          color: "#fff",
                          fontWeight: 700,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "7px 14px",
                          fontSize: "0.82rem",
                          border: "none",
                          cursor: (journeySosSendingAll || journeyContactList.length === 0) ? "not-allowed" : "pointer",
                          boxShadow: "0 2px 6px rgba(239,68,68,0.3)"
                        }}
                      >
                        {journeySosSendingAll ? "⏳ Dispatching to All..." : journeySosSentAllSuccess ? "⚡ Re-Send to All" : "⚡ Send to All Contacts"}
                      </button>

                      {journeyGroupSmsUrl && (
                        <a
                          href={journeyGroupSmsUrl}
                          className="btn sm"
                          style={{
                            background: "#2563eb",
                            color: "#fff",
                            textDecoration: "none",
                            fontSize: "0.82rem",
                            fontWeight: 700,
                            padding: "7px 12px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5
                          }}
                          title="Send via native device SMS to all numbers at once"
                        >
                          📱 Send All via SMS ({journeyCleanPhones.length})
                        </a>
                      )}

                      <button
                        type="button"
                        className="btn sm"
                        onClick={handleJourneySosSendAllWhatsApp}
                        disabled={journeyContactList.length === 0}
                        style={{
                          background: "#25D366",
                          color: "#fff",
                          fontWeight: 700,
                          fontSize: "0.82rem",
                          padding: "7px 12px",
                          border: "none",
                          cursor: journeyContactList.length === 0 ? "not-allowed" : "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5
                        }}
                        title="Open WhatsApp chat for each contact"
                      >
                        💬 Send All via WhatsApp
                      </button>
                    </div>

                    {journeySosSendAllFeedback && (
                      <div
                        style={{
                          marginTop: 10,
                          padding: "7px 10px",
                          borderRadius: 6,
                          background: journeySosSendAllFeedback.type === "success" ? "rgba(16, 185, 129, 0.2)" : journeySosSendAllFeedback.type === "info" ? "rgba(59, 130, 246, 0.2)" : "rgba(239, 68, 68, 0.2)",
                          border: `1px solid ${journeySosSendAllFeedback.type === "success" ? "#10b981" : journeySosSendAllFeedback.type === "info" ? "#3b82f6" : "#ef4444"}`,
                          color: journeySosSendAllFeedback.type === "success" ? "#34d399" : journeySosSendAllFeedback.type === "info" ? "#93c5fd" : "#fca5a5",
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          display: "flex",
                          alignItems: "center",
                          gap: 6
                        }}
                      >
                        {journeySosSendAllFeedback.type === "success" ? "✅" : journeySosSendAllFeedback.type === "info" ? "📲" : "⚠️"} {journeySosSendAllFeedback.message}
                      </div>
                    )}
                  </div>

                  <p className="mut" style={{ fontSize: "0.82rem", margin: "0 0 10px", lineHeight: 1.4 }}>
                    Emergency notifications with your exact live GPS link were automatically sent via server gateway to all your registered contacts. Direct backups:
                  </p>

                  {journeyContactList.length > 0 ? (
                    journeyContactList.map((c) => {
                      const name = c.name || "Emergency Contact";
                      const phone = c.phone || "";
                      const cleanP = (phone || "").replace(/\D/g, "");
                      const dispatchStatus = c.dispatch_status || "unknown";
                      const dispatchLabel = dispatchStatus === "provider_confirmed"
                        ? "Delivered"
                        : dispatchStatus === "submitted_to_provider"
                        ? "Submitted to provider"
                        : dispatchStatus === "demo_simulated"
                        ? "Not sent (demo mode)"
                        : dispatchStatus === "failed"
                        ? "Failed"
                        : dispatchStatus;
                      const waUrl = c.wa_url || (cleanP ? `https://wa.me/${cleanP}?text=${journeySosText}` : null);
                      const smsUrl = c.sms_url || (cleanP ? `sms:${cleanP}?body=${journeySosText}` : null);

                      return (
                        <div
                          key={c.id || phone}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            background: journeySosSentAllSuccess ? "rgba(16, 185, 129, 0.14)" : "rgba(16, 185, 129, 0.08)",
                            padding: "10px 14px",
                            borderRadius: 8,
                            marginBottom: 8,
                            border: `1px solid ${journeySosSentAllSuccess ? "#10b981" : "rgba(16, 185, 129, 0.3)"}`,
                            flexWrap: "wrap",
                            gap: 8
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 600, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
                              {name} {c.relationship ? <span className="mut" style={{ fontSize: "0.75rem", fontWeight: "normal" }}>({c.relationship})</span> : null}
                              <span style={{
                                fontSize: "0.7rem",
                                background: dispatchStatus === "failed" || dispatchStatus === "demo_simulated" ? "rgba(239, 68, 68, 0.2)" : "rgba(16, 185, 129, 0.2)",
                                color: dispatchStatus === "failed" || dispatchStatus === "demo_simulated" ? "#fca5a5" : "#34d399",
                                padding: "2px 6px",
                                borderRadius: 4,
                                fontWeight: "bold"
                              }}>
                                {dispatchLabel}
                              </span>
                            </div>
                            <div className="mut" style={{ fontSize: "0.8rem", marginTop: 2 }}>{phone} &bull; <span style={{ color: dispatchStatus === "failed" || dispatchStatus === "demo_simulated" ? "#fca5a5" : "#34d399" }}>{dispatchLabel}</span></div>
                          </div>

                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {waUrl && (
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="btn sm"
                                title="Optional backup WhatsApp message"
                                style={{ background: "#25D366", color: "#fff", textDecoration: "none", fontSize: "0.8rem", padding: "5px 10px", display: "inline-flex", alignItems: "center", gap: 4 }}
                              >
                                💬 WhatsApp
                              </a>
                            )}
                            {smsUrl && (
                              <a
                                href={smsUrl}
                                className="btn sm ghost"
                                title="Optional backup device SMS"
                                style={{ textDecoration: "none", fontSize: "0.8rem", padding: "5px 10px", display: "inline-flex", alignItems: "center", gap: 4 }}
                              >
                                📱 SMS
                              </a>
                            )}
                            {phone && (
                              <a
                                href={`tel:${phone}`}
                                className="btn sm red"
                                style={{ textDecoration: "none", fontSize: "0.8rem", padding: "5px 10px", display: "inline-flex", alignItems: "center", gap: 4 }}
                              >
                                📞 Direct Call
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ padding: "10px 14px", background: "rgba(245, 158, 11, 0.1)", border: "1px solid #f59e0b", borderRadius: 8, color: "#fcd34d", fontSize: "0.85rem" }}>
                      ⚠️ No emergency contacts registered with SOS alerts enabled. Please add your trusted contacts in the Contacts module.
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Emergency Helpline Direct Dials */}
            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              <a
                href="tel:112"
                className="btn sm"
                style={{ flex: 1, justifyContent: "center", background: "linear-gradient(135deg, #ef4444, #dc2626)", color: "#fff", textDecoration: "none", fontWeight: 700 }}
              >
                🚨 Dial Police / 112
              </a>
              <a
                href="tel:1091"
                className="btn sm ghost"
                style={{ flex: 1, justifyContent: "center", borderColor: "rgba(255,255,255,0.3)", color: "#fff", textDecoration: "none" }}
              >
                📞 Women Helpline 1091
              </a>
            </div>

            {/* Dispatch Logs Table */}
            {sosResult.sos?.notifications && sosResult.sos.notifications.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <b style={{ fontSize: "0.85rem", color: "#94a3b8" }}>📡 System Dispatch Logs:</b>
                <table style={{ width: "100%", margin: "6px 0", fontSize: "0.8rem" }}>
                  <tbody>
                    {sosResult.sos.notifications.map(n => (
                      <tr key={n.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        <td style={{ padding: "4px 8px" }}>{n.channel?.toUpperCase()} {n.recipient}</td>
                        <td style={{ padding: "4px 8px" }}><Tag s={n.status} /></td>
                        <td style={{ padding: "4px 8px" }} className="mut">{n.error || "Dispatched successfully"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Loud Siren Active in SOS Modal */}
            {alarmRinging && (
              <div style={{ background: "rgba(239, 68, 68, 0.2)", border: "1px solid #ef4444", borderRadius: 8, padding: "8px 12px", marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#fca5a5", fontSize: "0.85rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                  <Volume2 size={16} className="spin" /> Loud siren alarm is sounding!
                </span>
                <button
                  type="button"
                  onClick={stopLoudSiren}
                  className="btn sm"
                  style={{ background: "#ef4444", color: "#fff", border: "none", fontSize: "0.78rem" }}
                >
                  <VolumeX size={14} /> Silence Siren
                </button>
              </div>
            )}

            {/* Modal Actions */}
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 14, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
              <button
                className="btn ghost sm"
                onClick={() => {
                  stopLoudSiren();
                  setSosResult(null);
                  setJourneySosSendingAll(false);
                  setJourneySosSendAllFeedback(null);
                  setJourneySosSentAllSuccess(false);
                }}
              >
                Close Dialog (Keep Monitoring)
              </button>

              <button
                className="btn sm"
                style={{ background: "#10b981", color: "#fff", fontWeight: 700 }}
                onClick={async () => {
                  stopLoudSiren();
                  setJourneySosSendingAll(false);
                  setJourneySosSendAllFeedback(null);
                  setJourneySosSentAllSuccess(false);
                  try {
                    if (sosResult.sos?.id) {
                      await api(`/sos/${sosResult.sos.id}/resolve`, { method: "POST" });
                    }
                    setSosResult(null);
                    setSosStatus("✅ SOS Emergency marked resolved.");
                  } catch (e) {
                    setSosResult(null);
                  }
                }}
              >
                Resolve Emergency
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
