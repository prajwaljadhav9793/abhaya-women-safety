import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Compass,
  Navigation,
  Eye,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Shield,
  Zap,
  MapPin,
  Clock,
  Activity,
  Layers,
  Sun,
  Moon,
  Video,
  ChevronUp,
  ChevronDown,
  RotateCw
} from "lucide-react";

// Haversine distance helper
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

export default function Journey3DMap({
  currentPos,
  rawCoords = [],
  activeJourney,
  simProgress = 0,
  isWalking = true,
  travelerSpeed = 18,
  distRemainingM = 1200,
  targetEtaFormatted = "--:--",
  elapsedJourneySec = 0,
  routeColor = "#10b981",
  trackingMode = "simulation"
}) {
  // 3D Camera Controls
  const [cameraMode, setCameraMode] = useState("follow"); // "follow" | "drone" | "street"
  const [pitch, setPitch] = useState(55); // 25deg to 75deg tilt
  const [orbitAngle, setOrbitAngle] = useState(0); // -180deg to 180deg manual camera orbit
  const [zoom, setZoom] = useState(1.05); // 0.6x to 2.0x
  const [lightingMode, setLightingMode] = useState("night"); // "night" | "day"
  const [showShield, setShowShield] = useState(true);

  // Normalize path coordinates to local 3D meter plane (origin at rawCoords[0] or currentPos)
  const origin = useMemo(() => {
    if (rawCoords.length > 0) return rawCoords[0];
    if (currentPos) return currentPos;
    return [16.705, 74.243]; // Kolhapur default
  }, [rawCoords, currentPos]);

  // Convert GPS coordinates to local X/Y meter coordinates
  const pathPoints = useMemo(() => {
    if (!rawCoords || rawCoords.length < 2) {
      // Default sample corridor in Kolhapur: CBS -> Station Road -> Rajarampuri
      return [
        { lat: 16.703, lng: 74.241, x: 0, y: 0 },
        { lat: 16.701, lng: 74.245, x: 120, y: -60 },
        { lat: 16.698, lng: 74.249, x: 260, y: -140 },
        { lat: 16.695, lng: 74.252, x: 420, y: -220 },
        { lat: 16.692, lng: 74.256, x: 580, y: -310 },
        { lat: 16.689, lng: 74.260, x: 740, y: -410 }
      ];
    }

    const cosLat = Math.cos((origin[0] * Math.PI) / 180);
    return rawCoords.map(pt => {
      const dLat = (pt[0] - origin[0]) * 110540;
      const dLng = (pt[1] - origin[1]) * 111320 * cosLat;
      return {
        lat: pt[0],
        lng: pt[1],
        x: dLng,
        y: -dLat // negative so North is Up
      };
    });
  }, [rawCoords, origin]);

  // Calculate bounding box and scale to fit nicely in 3D viewport
  const { scaleFactor, offsetX, offsetY } = useMemo(() => {
    if (pathPoints.length === 0) return { scaleFactor: 1, offsetX: 0, offsetY: 0 };
    const xs = pathPoints.map(p => p.x);
    const ys = pathPoints.map(p => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const spanX = Math.max(maxX - minX, 100);
    const spanY = Math.max(maxY - minY, 100);
    const maxSpan = Math.max(spanX, spanY);

    // Map into ~700px 3D world space
    const targetSpan = 650;
    const factor = targetSpan / maxSpan;

    return {
      scaleFactor: factor,
      offsetX: -(minX + maxX) / 2 * factor,
      offsetY: -(minY + maxY) / 2 * factor
    };
  }, [pathPoints]);

  // Projected 3D Path scaled points
  const projectedPoints = useMemo(() => {
    return pathPoints.map(p => ({
      ...p,
      px: p.x * scaleFactor + offsetX,
      py: p.y * scaleFactor + offsetY
    }));
  }, [pathPoints, scaleFactor, offsetX, offsetY]);

  // Calculate Traveler's current 3D position and heading angle
  const { traveler3DPos, travelerHeading } = useMemo(() => {
    if (projectedPoints.length < 2) {
      return { traveler3DPos: { x: 0, y: 0 }, travelerHeading: 45 };
    }

    // Determine current index along path
    let baseIdx = 0;
    let frac = 0;

    if (trackingMode === "simulation") {
      baseIdx = Math.min(Math.floor(simProgress), projectedPoints.length - 2);
      frac = Math.max(0, Math.min(1, simProgress - baseIdx));
    } else if (currentPos) {
      // Find closest segment in GPS mode
      let minDist = Infinity;
      let closestIdx = 0;
      for (let i = 0; i < pathPoints.length; i++) {
        const d = hav(currentPos, [pathPoints[i].lat, pathPoints[i].lng]);
        if (d < minDist) {
          minDist = d;
          closestIdx = i;
        }
      }
      baseIdx = Math.min(closestIdx, projectedPoints.length - 2);
      frac = 0.5;
    }

    const p1 = projectedPoints[baseIdx] || projectedPoints[0];
    const p2 = projectedPoints[Math.min(baseIdx + 1, projectedPoints.length - 1)] || p1;

    const curX = p1.px + (p2.px - p1.px) * frac;
    const curY = p1.py + (p2.py - p1.py) * frac;

    // Heading angle in degrees (screen space)
    const dx = p2.px - p1.px;
    const dy = p2.py - p1.py;
    const angleRad = Math.atan2(dy, dx);
    const angleDeg = (angleRad * 180) / Math.PI + 90;

    return {
      traveler3DPos: { x: curX, y: curY },
      travelerHeading: angleDeg
    };
  }, [projectedPoints, pathPoints, simProgress, trackingMode, currentPos]);

  // SVG Path String for the 3D Road
  const svgPathD = useMemo(() => {
    if (projectedPoints.length === 0) return "";
    return projectedPoints.reduce((acc, pt, idx) => {
      return idx === 0 ? `M ${pt.px} ${pt.py}` : `${acc} L ${pt.px} ${pt.py}`;
    }, "");
  }, [projectedPoints]);

  // Traveled portion of SVG Path (Green completed safe segment)
  const traveledPathD = useMemo(() => {
    if (projectedPoints.length === 0) return "";
    const baseIdx = Math.min(Math.floor(simProgress), projectedPoints.length - 1);
    const pts = projectedPoints.slice(0, baseIdx + 1);
    let d = pts.reduce((acc, pt, idx) => {
      return idx === 0 ? `M ${pt.px} ${pt.py}` : `${acc} L ${pt.px} ${pt.py}`;
    }, "");
    d += ` L ${traveler3DPos.x} ${traveler3DPos.y}`;
    return d;
  }, [projectedPoints, simProgress, traveler3DPos]);

  // Camera translation depending on Camera Mode
  const cameraTransform = useMemo(() => {
    if (cameraMode === "follow") {
      // Third-person camera tracking right behind the girl
      return `translate(${-traveler3DPos.x}px, ${-traveler3DPos.y + 120}px)`;
    } else if (cameraMode === "street") {
      // Ground-level forward perspective
      return `translate(${-traveler3DPos.x}px, ${-traveler3DPos.y + 180}px)`;
    } else {
      // Drone isometric overview
      return `translate(0px, 0px)`;
    }
  }, [cameraMode, traveler3DPos]);

  // Dynamic Camera Pitch & Orbit
  const effectivePitch = cameraMode === "street" ? Math.max(pitch, 68) : pitch;
  const effectiveOrbit = cameraMode === "follow" ? orbitAngle : orbitAngle;

  return (
    <div
      style={{
        position: "relative",
        height: 520,
        borderRadius: 14,
        overflow: "hidden",
        background:
          lightingMode === "night"
            ? "radial-gradient(ellipse at 50% 30%, #1e1145 0%, #060919 70%, #02040a 100%)"
            : "radial-gradient(ellipse at 50% 30%, #1e3a8a 0%, #0f172a 70%, #090d16 100%)",
        border: "1px solid rgba(255, 255, 255, 0.12)",
        userSelect: "none"
      }}
    >
      {/* ----------------------------------------------------------------- */}
      {/* CSS 3D STYLES & WALKING ANIMATIONS                                 */}
      {/* ----------------------------------------------------------------- */}
      <style>{`
        @keyframes walk-left-leg {
          0% { transform: rotateX(-30deg); }
          50% { transform: rotateX(30deg); }
          100% { transform: rotateX(-30deg); }
        }
        @keyframes walk-right-leg {
          0% { transform: rotateX(30deg); }
          50% { transform: rotateX(-30deg); }
          100% { transform: rotateX(30deg); }
        }
        @keyframes walk-left-arm {
          0% { transform: rotateX(25deg); }
          50% { transform: rotateX(-25deg); }
          100% { transform: rotateX(25deg); }
        }
        @keyframes walk-right-arm {
          0% { transform: rotateX(-25deg); }
          50% { transform: rotateX(25deg); }
          100% { transform: rotateX(-25deg); }
        }
        @keyframes walk-torso-bob {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }
        @keyframes footstep-pulse-ring {
          0% { transform: scale(0.4); opacity: 0.9; }
          100% { transform: scale(2.4); opacity: 0; }
        }
        @keyframes shield-sphere-breathe {
          0% { transform: scale(0.97); opacity: 0.65; box-shadow: 0 0 20px rgba(236,72,153,0.5), inset 0 0 15px rgba(139,92,246,0.3); }
          50% { transform: scale(1.04); opacity: 0.95; box-shadow: 0 0 35px rgba(236,72,153,0.85), inset 0 0 25px rgba(139,92,246,0.6); }
          100% { transform: scale(0.97); opacity: 0.65; box-shadow: 0 0 20px rgba(236,72,153,0.5), inset 0 0 15px rgba(139,92,246,0.3); }
        }
        @keyframes radar-orbit-ring {
          0% { transform: rotateX(72deg) rotateZ(0deg); }
          100% { transform: rotateX(72deg) rotateZ(360deg); }
        }
        @keyframes road-neon-flow {
          0% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -40; }
        }
        @keyframes beacon-beam-glow {
          0%, 100% { opacity: 0.7; transform: scaleX(1); }
          50% { opacity: 1; transform: scaleX(1.3); }
        }
      `}</style>

      {/* ----------------------------------------------------------------- */}
      {/* 3D SCENE PERSPECTIVE VIEWPORT                                     */}
      {/* ----------------------------------------------------------------- */}
      <div
        style={{
          width: "100%",
          height: "100%",
          perspective: 1100,
          perspectiveOrigin: "50% 55%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden"
        }}
      >
        {/* 3D Transform World Container */}
        <div
          style={{
            position: "relative",
            width: 800,
            height: 800,
            transformStyle: "preserve-3d",
            transform: `rotateX(${effectivePitch}deg) rotateZ(${effectiveOrbit}deg) scale(${zoom}) ${cameraTransform}`,
            transition: "transform 0.25s cubic-bezier(0.2, 0.8, 0.3, 1)"
          }}
        >
          {/* Ground Grid & Terrain Surface */}
          <div
            style={{
              position: "absolute",
              width: 1600,
              height: 1600,
              left: -400,
              top: -400,
              backgroundImage:
                lightingMode === "night"
                  ? "linear-gradient(rgba(139, 92, 246, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(139, 92, 246, 0.08) 1px, transparent 1px)"
                  : "linear-gradient(rgba(59, 130, 246, 0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.12) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
              borderRadius: "50%",
              pointerEvents: "none"
            }}
          />

          {/* 3D Urban Cityscape / Environment Blocks (Kolhapur Street Layout) */}
          <div style={{ position: "absolute", width: "100%", height: "100%", pointerEvents: "none" }}>
            {[
              { x: -160, y: -80, w: 90, h: 140, name: "CBS Complex" },
              { x: 180, y: -40, w: 110, h: 100, name: "Shahupuri Market" },
              { x: 340, y: -260, w: 120, h: 160, name: "Station Plaza" },
              { x: -90, y: 150, w: 100, h: 120, name: "Collector Office" },
              { x: 500, y: -180, w: 140, h: 110, name: "Rajarampuri Arcade" },
              { x: 620, y: -460, w: 130, h: 150, name: "City Hub" }
            ].map((b, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: 400 + b.x,
                  top: 400 + b.y,
                  width: b.w,
                  height: b.h,
                  background:
                    lightingMode === "night"
                      ? "linear-gradient(135deg, rgba(20, 27, 54, 0.85), rgba(10, 15, 30, 0.95))"
                      : "linear-gradient(135deg, rgba(30, 41, 59, 0.85), rgba(15, 23, 42, 0.95))",
                  border: "1px solid rgba(139, 92, 246, 0.25)",
                  borderRadius: 8,
                  boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  padding: 8,
                  transform: "translateZ(0px)"
                }}
              >
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {[...Array(8)].map((_, wi) => (
                    <div
                      key={wi}
                      style={{
                        width: 8,
                        height: 10,
                        background:
                          (i + wi) % 3 === 0
                            ? "#fef08a"
                            : (i + wi) % 2 === 0
                            ? "#38bdf8"
                            : "rgba(255,255,255,0.1)",
                        borderRadius: 2,
                        boxShadow: (i + wi) % 3 === 0 ? "0 0 6px #fef08a" : "none"
                      }}
                    />
                  ))}
                </div>
                <div style={{ fontSize: "0.65rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
                  🏢 {b.name}
                </div>
              </div>
            ))}
          </div>

          {/* 3D Road Mesh (SVG Canvas with Lighting and Depth) */}
          <svg
            style={{
              position: "absolute",
              width: "100%",
              height: "100%",
              overflow: "visible",
              pointerEvents: "none"
            }}
            viewBox="0 0 800 800"
          >
            <defs>
              {/* Route Glow Filters */}
              <filter id="routeGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              <linearGradient id="roadBaseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1e1b4b" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>
            </defs>

            {/* 1. Road Bed (Dark Asphalt with Curb Glow) */}
            {svgPathD && (
              <>
                {/* Outer Glow Curb */}
                <path
                  d={svgPathD}
                  fill="none"
                  stroke={routeColor}
                  strokeWidth="38"
                  strokeOpacity="0.22"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#routeGlow)"
                />
                {/* Main Asphalt Corridor */}
                <path
                  d={svgPathD}
                  fill="none"
                  stroke="#161b2e"
                  strokeWidth="30"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Neon Curb Edge Left */}
                <path
                  d={svgPathD}
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.25)"
                  strokeWidth="30"
                  strokeDasharray="1, 10"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Remaining Route Ahead (Cyan / Route color) */}
                <path
                  d={svgPathD}
                  fill="none"
                  stroke={routeColor}
                  strokeWidth="6"
                  strokeOpacity="0.5"
                  strokeDasharray="12, 10"
                  style={{ animation: isWalking ? "road-neon-flow 1.2s linear infinite" : "none" }}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </>
            )}

            {/* 2. Traveled Safe Segment (Bright Solid Emerald Glow) */}
            {traveledPathD && (
              <path
                d={traveledPathD}
                fill="none"
                stroke="#10b981"
                strokeWidth="10"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#routeGlow)"
              />
            )}

            {/* 3. Street Light Illumination Cones along Route */}
            {projectedPoints.map((pt, idx) => (
              <g key={idx} transform={`translate(${pt.px}, ${pt.py})`}>
                <circle
                  r="28"
                  fill="radial-gradient(circle, rgba(254, 240, 138, 0.25) 0%, transparent 70%)"
                  opacity="0.6"
                />
                {/* Street Light Post */}
                <circle r="3" fill="#fef08a" />
              </g>
            ))}
          </svg>

          {/* 3D Origin Beacon (CBS Kolhapur) */}
          {projectedPoints.length > 0 && (
            <div
              style={{
                position: "absolute",
                left: projectedPoints[0].px,
                top: projectedPoints[0].py,
                transform: "translate(-50%, -50%)",
                transformStyle: "preserve-3d"
              }}
            >
              {/* Vertical Laser Light Beam */}
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: "50%",
                  width: 3,
                  height: 140,
                  background: "linear-gradient(to top, rgba(16, 185, 129, 0.9), transparent)",
                  transform: "translateX(-50%) rotateX(-90deg)",
                  transformOrigin: "bottom center",
                  boxShadow: "0 0 15px #10b981",
                  animation: "beacon-beam-glow 2s infinite ease-in-out"
                }}
              />
              {/* Origin Ground Marker Pin */}
              <div
                style={{
                  background: "#10b981",
                  color: "#fff",
                  padding: "4px 8px",
                  borderRadius: 6,
                  fontSize: "0.72rem",
                  fontWeight: 800,
                  whiteSpace: "nowrap",
                  boxShadow: "0 0 15px rgba(16,185,129,0.8)",
                  border: "1.5px solid #fff",
                  transform: "translateY(-16px) rotateX(-55deg)"
                }}
              >
                🟢 Start: {activeJourney?.origin_label?.split(",")[0] || "CBS Kolhapur"}
              </div>
            </div>
          )}

          {/* 3D Destination Beacon (Rajarampuri) */}
          {projectedPoints.length > 1 && (
            <div
              style={{
                position: "absolute",
                left: projectedPoints[projectedPoints.length - 1].px,
                top: projectedPoints[projectedPoints.length - 1].py,
                transform: "translate(-50%, -50%)",
                transformStyle: "preserve-3d"
              }}
            >
              {/* Vertical Laser Light Beam */}
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: "50%",
                  width: 4,
                  height: 160,
                  background: "linear-gradient(to top, rgba(239, 68, 68, 0.9), transparent)",
                  transform: "translateX(-50%) rotateX(-90deg)",
                  transformOrigin: "bottom center",
                  boxShadow: "0 0 20px #ef4444",
                  animation: "beacon-beam-glow 1.8s infinite ease-in-out"
                }}
              />
              {/* Destination Ground Marker Pin */}
              <div
                style={{
                  background: "#ef4444",
                  color: "#fff",
                  padding: "4px 10px",
                  borderRadius: 6,
                  fontSize: "0.72rem",
                  fontWeight: 800,
                  whiteSpace: "nowrap",
                  boxShadow: "0 0 20px rgba(239,68,68,0.9)",
                  border: "1.5px solid #fff",
                  transform: "translateY(-16px) rotateX(-55deg)"
                }}
              >
                🏁 Dest: {activeJourney?.dest_label?.split(",")[0] || "Destination"} &bull; {targetEtaFormatted}
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* THE 3D ANIMATED WALKING GIRL CHARACTER (REALISTIC GAIT)        */}
          {/* ============================================================= */}
          <div
            style={{
              position: "absolute",
              left: traveler3DPos.x,
              top: traveler3DPos.y,
              transform: `translate(-50%, -50%)`,
              transformStyle: "preserve-3d",
              zIndex: 100
            }}
          >
            {/* Ground Footstep Ripple Ring */}
            {isWalking && (
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  width: 36,
                  height: 36,
                  marginLeft: -18,
                  marginTop: -18,
                  borderRadius: "50%",
                  border: "2px solid #ec4899",
                  animation: "footstep-pulse-ring 1.1s infinite ease-out"
                }}
              />
            )}

            {/* Ground Contact Shadow */}
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: 32,
                height: 18,
                marginLeft: -16,
                marginTop: -9,
                borderRadius: "50%",
                background: "rgba(0, 0, 0, 0.65)",
                filter: "blur(2px)",
                transform: `rotate(${travelerHeading}deg)`
              }}
            />

            {/* ABHAYA Holographic Protective Shield Sphere */}
            {showShield && (
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  width: 70,
                  height: 70,
                  marginLeft: -35,
                  marginTop: -55,
                  borderRadius: "50%",
                  border: "1.5px solid rgba(236, 72, 153, 0.8)",
                  animation: "shield-sphere-breathe 2.2s infinite ease-in-out",
                  pointerEvents: "none",
                  transform: "rotateX(-55deg)"
                }}
              >
                {/* Revolving Orbiting Radar Ring */}
                <div
                  style={{
                    position: "absolute",
                    inset: -4,
                    borderRadius: "50%",
                    border: "1px dashed rgba(6, 182, 212, 0.7)",
                    animation: "radar-orbit-ring 3s linear infinite"
                  }}
                />
              </div>
            )}

            {/* 3D Character Model (Rotated towards path heading) */}
            <div
              style={{
                position: "relative",
                width: 44,
                height: 74,
                transformStyle: "preserve-3d",
                transform: `rotateX(-${effectivePitch}deg) rotateY(${travelerHeading}deg)`,
                animation: isWalking ? "walk-torso-bob 0.5s ease-in-out infinite" : "none",
                transformOrigin: "bottom center"
              }}
            >
              {/* Floating Status Tag Above Head */}
              <div
                style={{
                  position: "absolute",
                  bottom: 78,
                  left: "50%",
                  transform: "translateX(-50%)",
                  whiteSpace: "nowrap",
                  background: "rgba(15, 23, 42, 0.92)",
                  border: "1px solid #ec4899",
                  boxShadow: "0 0 12px rgba(236, 72, 153, 0.6)",
                  borderRadius: 12,
                  padding: "3px 9px",
                  fontSize: "0.68rem",
                  fontWeight: 800,
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  gap: 5
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 6px #10b981" }} />
                <span>👩 Traveler &bull; {travelerSpeed} km/h</span>
              </div>

              {/* Head & Hair with Ponytail */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: "50%",
                  width: 18,
                  height: 20,
                  marginLeft: -9,
                  borderRadius: "50% 50% 45% 45%",
                  background: "#fbcfe8",
                  border: "1.5px solid #831843",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                  zIndex: 4
                }}
              >
                {/* Hair Top / Bangs */}
                <div
                  style={{
                    position: "absolute",
                    top: -2,
                    left: -2,
                    right: -2,
                    height: 12,
                    background: "#451a03",
                    borderRadius: "50% 50% 20% 20%"
                  }}
                />
                {/* Ponytail Bobbing */}
                <div
                  style={{
                    position: "absolute",
                    top: 2,
                    right: -7,
                    width: 8,
                    height: 14,
                    background: "#451a03",
                    borderRadius: "0 50% 50% 0",
                    animation: isWalking ? "walk-ponytail 0.5s ease-in-out infinite" : "none"
                  }}
                />
                {/* Safety Earphone Headset */}
                <div
                  style={{
                    position: "absolute",
                    top: 8,
                    left: -2,
                    width: 3,
                    height: 5,
                    background: "#06b6d4",
                    borderRadius: 2
                  }}
                />
              </div>

              {/* Torso & ABHAYA Safety Jacket */}
              <div
                style={{
                  position: "absolute",
                  top: 20,
                  left: "50%",
                  width: 20,
                  height: 24,
                  marginLeft: -10,
                  borderRadius: "6px 6px 4px 4px",
                  background: "linear-gradient(135deg, #ec4899, #8b5cf6)",
                  boxShadow: "0 0 10px rgba(236, 72, 153, 0.4)",
                  border: "1px solid rgba(255,255,255,0.4)",
                  zIndex: 3
                }}
              >
                {/* Cross-body Safety Satchel / Bag */}
                <div
                  style={{
                    position: "absolute",
                    top: 2,
                    left: 2,
                    right: 2,
                    height: 2,
                    background: "#fef08a",
                    transform: "rotate(35deg)"
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    bottom: 2,
                    right: -3,
                    width: 8,
                    height: 10,
                    background: "#312e81",
                    borderRadius: 3,
                    border: "1px solid #818cf8"
                  }}
                />
              </div>

              {/* Left Arm (Alternating Swing) */}
              <div
                style={{
                  position: "absolute",
                  top: 22,
                  left: 3,
                  width: 5,
                  height: 18,
                  borderRadius: 3,
                  background: "#be185d",
                  transformOrigin: "top center",
                  animation: isWalking ? "walk-left-arm 0.5s linear infinite" : "none",
                  zIndex: 2
                }}
              />

              {/* Right Arm (Alternating Swing with Smartwatch) */}
              <div
                style={{
                  position: "absolute",
                  top: 22,
                  right: 3,
                  width: 5,
                  height: 18,
                  borderRadius: 3,
                  background: "#be185d",
                  transformOrigin: "top center",
                  animation: isWalking ? "walk-right-arm 0.5s linear infinite" : "none",
                  zIndex: 2
                }}
              >
                {/* Smartwatch with Pulse indicator */}
                <div
                  style={{
                    position: "absolute",
                    bottom: 3,
                    left: 0,
                    right: 0,
                    height: 3,
                    background: "#06b6d4"
                  }}
                />
              </div>

              {/* Left Leg (Alternating Walking Gait) */}
              <div
                style={{
                  position: "absolute",
                  top: 44,
                  left: 13,
                  width: 7,
                  height: 26,
                  transformOrigin: "top center",
                  animation: isWalking ? "walk-left-leg 0.5s linear infinite" : "none",
                  zIndex: 2
                }}
              >
                {/* Pants */}
                <div style={{ width: "100%", height: 20, background: "#1e293b", borderRadius: 2 }} />
                {/* Sneaker Shoe */}
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: -1,
                    width: 9,
                    height: 6,
                    background: "#ffffff",
                    borderRadius: "2px 5px 2px 2px",
                    borderBottom: "2px solid #06b6d4"
                  }}
                />
              </div>

              {/* Right Leg (Alternating Walking Gait) */}
              <div
                style={{
                  position: "absolute",
                  top: 44,
                  right: 13,
                  width: 7,
                  height: 26,
                  transformOrigin: "top center",
                  animation: isWalking ? "walk-right-leg 0.5s linear infinite" : "none",
                  zIndex: 2
                }}
              >
                {/* Pants */}
                <div style={{ width: "100%", height: 20, background: "#1e293b", borderRadius: 2 }} />
                {/* Sneaker Shoe */}
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: -1,
                    width: 9,
                    height: 6,
                    background: "#ffffff",
                    borderRadius: "2px 5px 2px 2px",
                    borderBottom: "2px solid #06b6d4"
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* 3D MAP HUD OVERLAYS & CAMERA CONTROLS                             */}
      {/* ----------------------------------------------------------------- */}

      {/* Top Left: 3D Camera Mode Switcher Pills */}
      <div
        style={{
          position: "absolute",
          top: 14,
          left: 14,
          display: "flex",
          gap: 6,
          background: "rgba(15, 23, 42, 0.85)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: 10,
          padding: 3,
          zIndex: 10
        }}
      >
        {[
          { id: "follow", label: "🎥 3rd-Person Follow", desc: "Tracks behind walking girl" },
          { id: "drone", label: "🚁 3D Drone Overview", desc: "Isometric bird's-eye angle" },
          { id: "street", label: "🚶 Street Level", desc: "Forward path perspective" }
        ].map(m => (
          <button
            key={m.id}
            onClick={() => setCameraMode(m.id)}
            title={m.desc}
            className="btn sm"
            style={{
              fontSize: "0.74rem",
              padding: "5px 11px",
              borderRadius: 7,
              background: cameraMode === m.id ? "linear-gradient(135deg, #8B5CF6, #6D28D9)" : "transparent",
              color: cameraMode === m.id ? "#fff" : "#94A3B8",
              border: "none",
              fontWeight: cameraMode === m.id ? 700 : 500
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Top Right: Live 3D Telemetry HUD Pill */}
      <div
        style={{
          position: "absolute",
          top: 14,
          right: 14,
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "rgba(15, 23, 42, 0.85)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: 10,
          padding: "6px 12px",
          fontSize: "0.78rem",
          zIndex: 10
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 8px #10b981" }} />
        <span style={{ color: "#E2E8F0", fontWeight: 600 }}>
          3D Walking Live &bull; <b>{travelerSpeed} km/h</b>
        </span>
        <button
          onClick={() => setLightingMode(prev => (prev === "night" ? "day" : "night"))}
          className="btn ghost sm"
          title="Toggle Day / Night lighting"
          style={{ padding: "2px 6px", fontSize: "0.72rem", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6 }}
        >
          {lightingMode === "night" ? <Moon size={12} color="#a78bfa" /> : <Sun size={12} color="#f59e0b" />}
        </button>
      </div>

      {/* Bottom Left: Safety Shield & Orbit Indicators */}
      <div
        style={{
          position: "absolute",
          bottom: 14,
          left: 14,
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "rgba(15, 23, 42, 0.85)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: 10,
          padding: "6px 12px",
          zIndex: 10
        }}
      >
        <button
          onClick={() => setShowShield(!showShield)}
          className="btn sm"
          style={{
            fontSize: "0.72rem",
            padding: "3px 8px",
            borderRadius: 6,
            background: showShield ? "rgba(236, 72, 153, 0.2)" : "transparent",
            color: showShield ? "#ec4899" : "#64748b",
            border: `1px solid ${showShield ? "rgba(236,72,153,0.4)" : "rgba(255,255,255,0.1)"}`,
            display: "flex",
            alignItems: "center",
            gap: 4
          }}
        >
          <Shield size={12} /> {showShield ? "Shield Visible" : "Shield Hidden"}
        </button>

        <span style={{ fontSize: "0.74rem", color: "#94a3b8" }}>
          Remaining: <b style={{ color: "#38bdf8" }}>{(distRemainingM / 1000).toFixed(1)} km</b>
        </span>
      </div>

      {/* Bottom Right: Interactive 3D Camera Gimbal Controls */}
      <div
        style={{
          position: "absolute",
          bottom: 14,
          right: 14,
          display: "flex",
          alignItems: "center",
          gap: 5,
          background: "rgba(15, 23, 42, 0.9)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: 10,
          padding: 4,
          zIndex: 10
        }}
      >
        {/* Tilt Up */}
        <button
          onClick={() => setPitch(p => Math.min(75, p + 5))}
          className="btn ghost sm"
          title="Tilt Camera Up (Higher Angle)"
          style={{ padding: 5, borderRadius: 6, color: "#cbd5e1" }}
        >
          <ChevronUp size={15} />
        </button>

        {/* Tilt Down */}
        <button
          onClick={() => setPitch(p => Math.max(30, p - 5))}
          className="btn ghost sm"
          title="Tilt Camera Down (Ground Level)"
          style={{ padding: 5, borderRadius: 6, color: "#cbd5e1" }}
        >
          <ChevronDown size={15} />
        </button>

        {/* Rotate Left */}
        <button
          onClick={() => setOrbitAngle(a => a - 25)}
          className="btn ghost sm"
          title="Rotate Camera Left"
          style={{ padding: 5, borderRadius: 6, color: "#cbd5e1" }}
        >
          <RotateCcw size={14} />
        </button>

        {/* Rotate Right */}
        <button
          onClick={() => setOrbitAngle(a => a + 25)}
          className="btn ghost sm"
          title="Rotate Camera Right"
          style={{ padding: 5, borderRadius: 6, color: "#cbd5e1" }}
        >
          <RotateCw size={14} />
        </button>

        {/* Zoom In */}
        <button
          onClick={() => setZoom(z => Math.min(2.0, z + 0.15))}
          className="btn ghost sm"
          title="Zoom In"
          style={{ padding: 5, borderRadius: 6, color: "#cbd5e1" }}
        >
          <ZoomIn size={14} />
        </button>

        {/* Zoom Out */}
        <button
          onClick={() => setZoom(z => Math.max(0.65, z - 0.15))}
          className="btn ghost sm"
          title="Zoom Out"
          style={{ padding: 5, borderRadius: 6, color: "#cbd5e1" }}
        >
          <ZoomOut size={14} />
        </button>

        {/* Reset Camera to Default */}
        <button
          onClick={() => {
            setPitch(55);
            setOrbitAngle(0);
            setZoom(1.05);
            setCameraMode("follow");
          }}
          className="btn ghost sm"
          title="Reset Camera Angle & Zoom"
          style={{ padding: "4px 8px", fontSize: "0.7rem", borderRadius: 6, color: "#818cf8" }}
        >
          Reset
        </button>
      </div>
    </div>
  );
}

