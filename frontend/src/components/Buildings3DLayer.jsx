import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

/**
 * Procedural & Curated 3D Building Generator
 * Generates realistic urban architecture lining the route corridor and surrounding blocks.
 */
function generateCorridorBuildings(routeCoords, activeJourney, travelerPos) {
  const buildings = [];
  const coords = routeCoords && routeCoords.length > 1 ? routeCoords : [];

  // Seeded pseudo-random generator for consistent city layout
  let seed = 1234567;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  // Helper to convert meter offset to approx lat/lng offset
  const metersToDelta = (meters, lat) => {
    const dLat = meters / 111320;
    const dLng = meters / (111320 * Math.cos((lat * Math.PI) / 180));
    return { dLat, dLng };
  };

  // Landmark types
  const BUILDING_TYPES = [
    { type: "skyscraper", w: 32, d: 28, h: 85, name: "Skyline Corporate Tower" },
    { type: "skyscraper", w: 38, d: 32, h: 95, name: "Metropolitan Tech Center" },
    { type: "commercial", w: 34, d: 26, h: 48, name: "City Commercial Plaza" },
    { type: "residential", w: 28, d: 24, h: 42, name: "Urban Heights Residency" },
    { type: "residential", w: 26, d: 26, h: 36, name: "Greenfield Apartments" },
    { type: "commercial", w: 30, d: 30, h: 52, name: "Grand Central Arcade" }
  ];

  // 1. Generate buildings flanking the journey route on both sides
  if (coords.length > 1) {
    for (let i = 0; i < coords.length - 1; i++) {
      const p1 = coords[i];
      const p2 = coords[i + 1];

      // Segment vector in lat/lng
      const dLat = p2[0] - p1[0];
      const dLng = p2[1] - p1[1];
      const segLen = Math.hypot(dLat, dLng);
      if (segLen === 0) continue;

      // Normal vector (perpendicular to road)
      const nLat = -dLng / segLen;
      const nLng = dLat / segLen;

      // Bearing of road segment
      const angle = Math.atan2(dLng, dLat);

      // Distance in meters along this segment
      const approxDistM = segLen * 111320;
      const steps = Math.max(1, Math.floor(approxDistM / 65)); // Building every ~65m

      for (let s = 0; s < steps; s++) {
        const frac = (s + 0.5) / steps;
        const midLat = p1[0] + dLat * frac;
        const midLng = p1[1] + dLng * frac;

        // Place on Left Side of road (28-42m setback)
        const leftDistM = 28 + rand() * 14;
        const { dLat: lDLat, dLng: lDLng } = metersToDelta(leftDistM, midLat);
        const leftType = BUILDING_TYPES[Math.floor(rand() * BUILDING_TYPES.length)];

        buildings.push({
          id: `b_l_${i}_${s}`,
          lat: midLat + nLat * lDLat,
          lng: midLng + nLng * lDLng,
          w_m: leftType.w + (rand() - 0.5) * 6,
          d_m: leftType.d + (rand() - 0.5) * 6,
          h_m: leftType.h + (rand() - 0.5) * 15,
          angle: angle + (rand() - 0.5) * 0.2,
          type: leftType.type,
          name: leftType.name
        });

        // Place on Right Side of road (28-42m setback)
        const rightDistM = 28 + rand() * 14;
        const { dLat: rDLat, dLng: rDLng } = metersToDelta(rightDistM, midLat);
        const rightType = BUILDING_TYPES[Math.floor(rand() * BUILDING_TYPES.length)];

        buildings.push({
          id: `b_r_${i}_${s}`,
          lat: midLat - nLat * rDLat,
          lng: midLng - nLng * rDLng,
          w_m: rightType.w + (rand() - 0.5) * 6,
          d_m: rightType.d + (rand() - 0.5) * 6,
          h_m: rightType.h + (rand() - 0.5) * 15,
          angle: angle + (rand() - 0.5) * 0.2,
          type: rightType.type,
          name: rightType.name
        });
      }
    }
  }

  // 2. Add Curated Key Landmarks along the route (Police, Hospital, Safe Haven)
  const refCenter = travelerPos || (coords.length > 0 ? coords[0] : [16.69, 74.23]);
  const anchorLat = refCenter[0];
  const anchorLng = refCenter[1];

  // Strategic Landmark 1: Police Command Post
  if (coords.length > 2) {
    const midIdx = Math.floor(coords.length * 0.35);
    const p = coords[midIdx];
    const { dLat, dLng } = metersToDelta(35, p[0]);
    buildings.push({
      id: "landmark_police_hq",
      lat: p[0] + dLat,
      lng: p[1] - dLng,
      w_m: 42,
      d_m: 36,
      h_m: 60,
      angle: 0.1,
      type: "police",
      name: "🛡️ Police Precinct & Security Post",
      badge: "POLICE STATION",
      features: "24/7 Rapid Response Unit & Surveillance Mast"
    });
  } else {
    const { dLat, dLng } = metersToDelta(45, anchorLat);
    buildings.push({
      id: "landmark_police_hq_default",
      lat: anchorLat + dLat,
      lng: anchorLng + dLng,
      w_m: 42,
      d_m: 36,
      h_m: 60,
      angle: 0.1,
      type: "police",
      name: "🛡️ Police Precinct & Security Post",
      badge: "POLICE STATION",
      features: "24/7 Rapid Response Unit & Surveillance Mast"
    });
  }

  // Strategic Landmark 2: Emergency Trauma Hospital (with Rooftop Helipad)
  if (coords.length > 3) {
    const hospIdx = Math.floor(coords.length * 0.7);
    const p = coords[hospIdx];
    const { dLat, dLng } = metersToDelta(40, p[0]);
    buildings.push({
      id: "landmark_hospital",
      lat: p[0] - dLat,
      lng: p[1] + dLng,
      w_m: 48,
      d_m: 40,
      h_m: 72,
      angle: -0.2,
      type: "hospital",
      name: "🏥 Apex Emergency & Trauma Center",
      badge: "24/7 HOSPITAL",
      features: "Emergency Trauma Care & Rooftop Medical Helipad"
    });
  }

  // Strategic Landmark 3: ABHAYA Women's Safe Shelter
  if (coords.length > 1) {
    const safeIdx = Math.floor(coords.length * 0.55);
    const p = coords[safeIdx];
    const { dLat, dLng } = metersToDelta(32, p[0]);
    buildings.push({
      id: "landmark_safe_haven",
      lat: p[0] + dLat,
      lng: p[1] + dLng,
      w_m: 36,
      d_m: 30,
      h_m: 46,
      angle: 0.15,
      type: "safe_haven",
      name: "⚡ ABHAYA Safe Haven Sanctuary",
      badge: "VERIFIED SAFE SHELTER",
      features: "24/7 Guarded Women's Safe Zone & SOS Beacon"
    });
  }

  return buildings;
}

/**
 * 3D Building Extrusion Canvas Engine
 * Renders high-performance isometric & perspective 3D buildings directly onto Leaflet.
 */
export default function Buildings3DLayer({
  routeCoords = [],
  travelerPos = null,
  activeJourney = null,
  enabled = true,
  tiltAngle = 54, // 0 for flat, 35 for low, 54 for 3D, 67.5 for photorealistic
  mapDimension = "3d",
  buildingTheme = "cyber",
  heightScale = 1.0,
  showLabels = true,
  isSatellite = true
}) {
  const map = useMap();
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const buildingsDataRef = useRef([]);
  const hoveredBuildingRef = useRef(null);
  const [tooltipInfo, setTooltipInfo] = useState(null);

  // Generate / Cache buildings whenever route or journey changes
  const buildings = useMemo(() => {
    return generateCorridorBuildings(routeCoords, activeJourney, travelerPos);
  }, [routeCoords, activeJourney?.id, travelerPos ? `${travelerPos[0].toFixed(3)},${travelerPos[1].toFixed(3)}` : ""]);

  useEffect(() => {
    buildingsDataRef.current = buildings;
  }, [buildings]);

  // Main Render Routine for 3D Building Engine
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !map) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    if (!enabled) return;

    const zoom = map.getZoom();
    if (zoom < 13) return; // Hide buildings at far zoom to keep map clean

    // Compute pixel per meter at current center latitude
    const center = map.getCenter();
    const latRad = (center.lat * Math.PI) / 180;
    const metersPerPixel = (156543.03392 * Math.cos(latRad)) / Math.pow(2, zoom);
    const pxPerMeter = 1 / Math.max(0.001, metersPerPixel);

    // Dynamic tilt extrusion factor
    const is3D = mapDimension === "3d" && tiltAngle > 0;
    const effectiveTilt = is3D ? tiltAngle : 0;
    const extrusionFactor = is3D ? (Math.sin((effectiveTilt * Math.PI) / 180) * 1.5 * heightScale) : 0;

    const vpX = width / 2;
    const vpY = height * 0.85;

    // Time for animated beacons and warning strobes
    const now = Date.now();
    const redStrobe = Math.sin(now / 220) > 0.3;
    const blueStrobe = Math.sin(now / 150) > 0;
    const greenPulse = (Math.sin(now / 400) + 1) / 2;

    const bList = buildingsDataRef.current;
    const visibleBuildings = [];

    // Project each building to container coordinates
    for (let i = 0; i < bList.length; i++) {
      const b = bList[i];
      const basePt = map.latLngToContainerPoint([b.lat, b.lng]);

      // Viewport culling (with margin for high-rises)
      if (
        basePt.x < -120 ||
        basePt.x > width + 120 ||
        basePt.y < -200 ||
        basePt.y > height + 100
      ) {
        continue;
      }

      // Base footprint dimensions in pixels
      const wPx = Math.max(12, b.w_m * pxPerMeter);
      const dPx = Math.max(10, b.d_m * pxPerMeter);
      const hPx = is3D ? Math.max(16, b.h_m * pxPerMeter * extrusionFactor) : 0;

      // Base corner points rotated by angle
      const cosA = Math.cos(b.angle || 0);
      const sinA = Math.sin(b.angle || 0);
      const hw = wPx / 2;
      const hd = dPx / 2;

      // Ground vertices B0..B3
      const B0 = {
        x: basePt.x + (-hw * cosA - -hd * sinA),
        y: basePt.y + (-hw * sinA + -hd * cosA)
      };
      const B1 = {
        x: basePt.x + (hw * cosA - -hd * sinA),
        y: basePt.y + (hw * sinA + -hd * cosA)
      };
      const B2 = {
        x: basePt.x + (hw * cosA - hd * sinA),
        y: basePt.y + (hw * sinA + hd * cosA)
      };
      const B3 = {
        x: basePt.x + (-hw * cosA - hd * sinA),
        y: basePt.y + (-hw * sinA + hd * cosA)
      };

      // Roof vertices R0..R3 with perspective vanishing point convergence
      const roofPerspX = (basePt.x - vpX) * (hPx / 1800);
      const R0 = { x: B0.x - roofPerspX, y: B0.y - hPx };
      const R1 = { x: B1.x - roofPerspX, y: B1.y - hPx };
      const R2 = { x: B2.x - roofPerspX, y: B2.y - hPx };
      const R3 = { x: B3.x - roofPerspX, y: B3.y - hPx };

      visibleBuildings.push({
        ...b,
        basePt,
        wPx,
        dPx,
        hPx,
        B: [B0, B1, B2, B3],
        R: [R0, R1, R2, R3],
        sortY: basePt.y // For depth-sorting painter's algorithm
      });
    }

    // Depth Sorting: Draw from back (top of screen) to front (bottom of screen)
    visibleBuildings.sort((a, b) => a.sortY - b.sortY);

    // =========================================================================
    // DRAW 3D BUILDINGS
    // =========================================================================
    for (let i = 0; i < visibleBuildings.length; i++) {
      const b = visibleBuildings[i];
      const { B, R, hPx, type } = b;
      const isHovered = hoveredBuildingRef.current?.id === b.id;

      // --- 1. Ground Drop Shadow (3D Depth Occlusion) ---
      if (is3D && hPx > 8) {
        ctx.beginPath();
        const sOffX = hPx * 0.35;
        const sOffY = hPx * 0.18;
        ctx.moveTo(B[0].x + sOffX, B[0].y + sOffY);
        ctx.lineTo(B[1].x + sOffX, B[1].y + sOffY);
        ctx.lineTo(B[2].x + sOffX, B[2].y + sOffY);
        ctx.lineTo(B[3].x + sOffX, B[3].y + sOffY);
        ctx.closePath();
        ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
        ctx.fill();
      }

      // --- 2. Vertical Wall Facades (Extruded 3D Sides) ---
      if (is3D && hPx > 2) {
        const wallIndices = [
          [0, 1],
          [1, 2],
          [2, 3],
          [3, 0]
        ];

        for (let w = 0; w < 4; w++) {
          const [i1, i2] = wallIndices[w];
          const b1 = B[i1];
          const b2 = B[i2];
          const r1 = R[i1];
          const r2 = R[i2];

          // 2D Normal / Cross Product to check if wall faces viewer
          const cross = (b2.x - b1.x) * (r1.y - b1.y) - (b2.y - b1.y) * (r1.x - b1.x);
          if (cross > 0) {
            // Front-facing visible wall!
            ctx.beginPath();
            ctx.moveTo(b1.x, b1.y);
            ctx.lineTo(b2.x, b2.y);
            ctx.lineTo(r2.x, r2.y);
            ctx.lineTo(r1.x, r1.y);
            ctx.closePath();

            // Wall Styling based on Building Type
            if (type === "police") {
              const wallGrad = ctx.createLinearGradient(b1.x, b1.y, r1.x, r1.y);
              wallGrad.addColorStop(0, "#0f172a");
              wallGrad.addColorStop(1, "#1e3a8a");
              ctx.fillStyle = wallGrad;
            } else if (type === "hospital") {
              const wallGrad = ctx.createLinearGradient(b1.x, b1.y, r1.x, r1.y);
              wallGrad.addColorStop(0, "#1e293b");
              wallGrad.addColorStop(1, "#334155");
              ctx.fillStyle = wallGrad;
            } else if (type === "safe_haven") {
              const wallGrad = ctx.createLinearGradient(b1.x, b1.y, r1.x, r1.y);
              wallGrad.addColorStop(0, "#064e3b");
              wallGrad.addColorStop(1, "#047857");
              ctx.fillStyle = wallGrad;
            } else if (type === "skyscraper") {
              const wallGrad = ctx.createLinearGradient(b1.x, b1.y, r1.x, r1.y);
              wallGrad.addColorStop(0, "#090d16");
              wallGrad.addColorStop(1, w % 2 === 0 ? "#1e293b" : "#0f172a");
              ctx.fillStyle = wallGrad;
            } else {
              ctx.fillStyle = w % 2 === 0 ? "#1e293b" : "#172033";
            }
            ctx.fill();

            // Architectural Wall Edge Bevel
            ctx.strokeStyle = isHovered ? "#38bdf8" : "rgba(255, 255, 255, 0.15)";
            ctx.lineWidth = isHovered ? 1.5 : 0.7;
            ctx.stroke();

            // Window Matrix Pattern on Visible Walls
            const wallH = Math.hypot(r1.x - b1.x, r1.y - b1.y);
            const wallW = Math.hypot(b2.x - b1.x, b2.y - b1.y);

            if (wallH > 18 && wallW > 14) {
              const floors = Math.min(18, Math.max(3, Math.floor(wallH / 6)));
              const cols = Math.min(8, Math.max(2, Math.floor(wallW / 8)));

              for (let f = 1; f < floors; f++) {
                const fy = f / floors;
                for (let c = 1; c < cols; c++) {
                  const cx = c / cols;

                  // Interpolate window center point
                  const wx = b1.x + (b2.x - b1.x) * cx + (r1.x - b1.x) * fy;
                  const wy = b1.y + (b2.y - b1.y) * cx + (r1.y - b1.y) * fy;

                  // Window light color
                  const hash = (i * 37 + w * 17 + f * 11 + c * 7) % 10;
                  if (hash > 2) {
                    ctx.fillStyle =
                      type === "police"
                        ? "rgba(147, 197, 253, 0.75)"
                        : type === "safe_haven"
                        ? "rgba(110, 231, 183, 0.75)"
                        : hash > 6
                        ? "rgba(254, 240, 138, 0.75)" // Warm golden window
                        : "rgba(56, 189, 248, 0.65)"; // Cool cyan window
                    ctx.fillRect(wx - 1.2, wy - 1.2, 2.4, 2.4);
                  }
                }
              }
            }
          }
        }
      }

      // --- 3. Roof Cap (Top Elevated Polygon) ---
      const topPts = is3D && hPx > 2 ? R : B;
      ctx.beginPath();
      ctx.moveTo(topPts[0].x, topPts[0].y);
      ctx.lineTo(topPts[1].x, topPts[1].y);
      ctx.lineTo(topPts[2].x, topPts[2].y);
      ctx.lineTo(topPts[3].x, topPts[3].y);
      ctx.closePath();

      // Roof surface fill
      if (type === "police") {
        ctx.fillStyle = "#1e3a8a";
      } else if (type === "hospital") {
        ctx.fillStyle = "#334155";
      } else if (type === "safe_haven") {
        ctx.fillStyle = "#047857";
      } else if (type === "skyscraper") {
        ctx.fillStyle = isHovered ? "#3b82f6" : "#253347";
      } else {
        ctx.fillStyle = "#1e293b";
      }
      ctx.fill();

      // Roof Perimeter Glowing Accent
      ctx.strokeStyle =
        type === "police"
          ? "#60a5fa"
          : type === "hospital"
          ? "#f87171"
          : type === "safe_haven"
          ? "#34d399"
          : isHovered
          ? "#38bdf8"
          : "#64748b";
      ctx.lineWidth = isHovered ? 2 : 1.2;
      ctx.stroke();

      // Roof Center Coordinate
      const roofCenterX = (topPts[0].x + topPts[1].x + topPts[2].x + topPts[3].x) / 4;
      const roofCenterY = (topPts[0].y + topPts[1].y + topPts[2].y + topPts[3].y) / 4;

      // --- 4. Rooftop Architectural Details ---
      if (is3D && hPx > 16) {
        // Helipad for Hospitals & Police HQs
        if (type === "hospital" || (type === "police" && b.wPx > 30)) {
          ctx.beginPath();
          ctx.arc(roofCenterX, roofCenterY, 8, 0, Math.PI * 2);
          ctx.strokeStyle = type === "hospital" ? "#ef4444" : "#facc15";
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 8px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("H", roofCenterX, roofCenterY);
        }

        // Tall Communications Antenna Spire on Skyscrapers
        if (type === "skyscraper" && b.hPx > 35) {
          const spireHeight = 18;
          ctx.beginPath();
          ctx.moveTo(roofCenterX, roofCenterY);
          ctx.lineTo(roofCenterX, roofCenterY - spireHeight);
          ctx.strokeStyle = "#94a3b8";
          ctx.lineWidth = 1.2;
          ctx.stroke();

          // Blinking Red Aircraft Obstruction Strobe
          if (redStrobe) {
            ctx.beginPath();
            ctx.arc(roofCenterX, roofCenterY - spireHeight, 3.5, 0, Math.PI * 2);
            ctx.fillStyle = "#ef4444";
            ctx.shadowColor = "#ef4444";
            ctx.shadowBlur = 8;
            ctx.fill();
            ctx.shadowBlur = 0; // Reset
          }
        }

        // Flashing Blue Emergency Beacon for Police HQ
        if (type === "police") {
          ctx.beginPath();
          ctx.arc(roofCenterX, roofCenterY - 4, 4, 0, Math.PI * 2);
          ctx.fillStyle = blueStrobe ? "#3b82f6" : "#60a5fa";
          ctx.shadowColor = "#3b82f6";
          ctx.shadowBlur = 12;
          ctx.fill();
          ctx.shadowBlur = 0;
        }

        // Pulsing Emerald Halo for ABHAYA Safe Haven
        if (type === "safe_haven") {
          ctx.beginPath();
          ctx.arc(roofCenterX, roofCenterY - 3, 5 + greenPulse * 3, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(16, 185, 129, 0.85)";
          ctx.lineWidth = 1.5;
          ctx.shadowColor = "#10b981";
          ctx.shadowBlur = 10;
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      }

      // --- 5. Floating Landmark Hologram Badges ---
      if (b.badge && is3D && hPx > 20 && showLabels) {
        const badgeY = roofCenterY - (type === "skyscraper" ? 28 : 16);
        ctx.font = "bold 9px sans-serif";
        const txtWidth = ctx.measureText(b.badge).width;
        const padX = 6;
        const bW = txtWidth + padX * 2;
        const bH = 14;

        // Badge Pill Background
        ctx.fillStyle =
          type === "police"
            ? "rgba(30, 58, 138, 0.9)"
            : type === "hospital"
            ? "rgba(153, 27, 27, 0.9)"
            : "rgba(6, 78, 59, 0.9)";
        ctx.strokeStyle =
          type === "police" ? "#60a5fa" : type === "hospital" ? "#f87171" : "#34d399";
        ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.roundRect(roofCenterX - bW / 2, badgeY - bH / 2, bW, bH, 6);
        ctx.fill();
        ctx.stroke();

        // Badge Text
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(b.badge, roofCenterX, badgeY);
      }
    }
  }, [map, enabled, mapDimension, tiltAngle, heightScale, showLabels, isSatellite]);

  // Handle Canvas Resizing to Match Leaflet Map Dimensions
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !map) return;

    const handleResize = () => {
      const container = map.getContainer();
      if (!container) return;
      canvas.width = container.offsetWidth;
      canvas.height = container.offsetHeight;
      render();
    };

    handleResize();

    map.on("move", render);
    map.on("zoom", render);
    map.on("viewreset", render);
    map.on("resize", handleResize);

    // Animation Loop for Beacon Strobes & Pulsing Lights
    const loop = () => {
      render();
      animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      map.off("move", render);
      map.off("zoom", render);
      map.off("viewreset", render);
      map.off("resize", handleResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [map, render]);

  // Interactive Mouse Move for Hover Tooltips
  const handleMouseMove = e => {
    const canvas = canvasRef.current;
    if (!canvas || !map) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const bList = buildingsDataRef.current;
    let found = null;

    for (let i = bList.length - 1; i >= 0; i--) {
      const b = bList[i];
      const basePt = map.latLngToContainerPoint([b.lat, b.lng]);
      const dist = Math.hypot(x - basePt.x, y - (basePt.y - (b.h_m || 40) * 0.5));
      if (dist < 28) {
        found = b;
        break;
      }
    }

    if (found !== hoveredBuildingRef.current) {
      hoveredBuildingRef.current = found;
      if (found) {
        setTooltipInfo({
          x: x + 12,
          y: y - 30,
          name: found.name,
          height: `${Math.round(found.h_m)}m (${Math.round(found.h_m / 3)} Floors)`,
          type: found.type,
          features: found.features || "Commercial / Urban Structure"
        });
      } else {
        setTooltipInfo(null);
      }
    }
  };

  const handleMouseLeave = () => {
    hoveredBuildingRef.current = null;
    setTooltipInfo(null);
  };

  return (
    <>
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: 420, // Above map tiles and route polyline, under traveler GPS puck
          pointerEvents: enabled ? "auto" : "none"
        }}
      />

      {/* Interactive Cyber HUD Hover Tooltip */}
      {tooltipInfo && (
        <div
          style={{
            position: "absolute",
            left: tooltipInfo.x,
            top: tooltipInfo.y,
            transform: "translateY(-100%)",
            background: "rgba(15, 23, 42, 0.92)",
            border: "1px solid #38bdf8",
            borderRadius: 8,
            padding: "8px 12px",
            color: "#fff",
            fontSize: "0.78rem",
            pointerEvents: "none",
            zIndex: 1000,
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.6), 0 0 12px rgba(56, 189, 248, 0.4)",
            maxWidth: 240
          }}
        >
          <div style={{ fontWeight: 800, color: "#38bdf8", marginBottom: 2 }}>
            {tooltipInfo.name}
          </div>
          <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
            📐 Height: <b style={{ color: "#fff" }}>{tooltipInfo.height}</b>
          </div>
          <div style={{ fontSize: "0.7rem", color: "#cbd5e1", marginTop: 4 }}>
            {tooltipInfo.features}
          </div>
        </div>
      )}
    </>
  );
}

