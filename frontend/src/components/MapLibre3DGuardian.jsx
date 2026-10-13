import React, { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// Strict Territorial Bounds of India ([minLng, minLat], [maxLng, maxLat])
const INDIA_BOUNDS_MAPLIBRE = [
  [68.0, 6.5],
  [97.5, 37.5]
];

export default function MapLibre3DGuardian({
  coords = [],
  currentPos = null,
  travelerBearing = 0,
  origin = null,
  originLabel = "",
  dest = null,
  destLabel = "",
  routeColor = "#10b981",
  mapDimension = "3d", // "3d" or "2d"
  showLabels = true,
  followTraveler = true,
  flyToTarget = null
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const travelerMarkerRef = useRef(null);
  const originMarkerRef = useRef(null);
  const destMarkerRef = useRef(null);
  const initialFittedRef = useRef(false);

  // Generate Tile Style Definition for Google Aerial Satellite & Hybrid
  const getStyle = isLabelsOn => ({
    version: 8,
    sources: {
      "google-satellite": {
        type: "raster",
        tiles: [
          isLabelsOn
            ? "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
            : "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
        ],
        tileSize: 256,
        attribution: "&copy; Google Maps Satellite Imagery &bull; Photorealistic 3D India"
      }
    },
    layers: [
      {
        id: "satellite-layer",
        type: "raster",
        source: "google-satellite",
        minzoom: 0,
        maxzoom: 20
      }
    ]
  });

  // Initialize MapLibre GL Native WebGL 3D Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const startPos = currentPos || origin || [16.7042, 74.2435];
    const initialCenter = [startPos[1], startPos[0]]; // [lng, lat]

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: getStyle(showLabels),
      center: initialCenter,
      zoom: mapDimension === "3d" ? 16 : 14.5,
      pitch: mapDimension === "3d" ? 62 : 0, // Native 3D camera pitch
      bearing: 0,
      maxBounds: INDIA_BOUNDS_MAPLIBRE, // Strictly locked to India
      minZoom: 5,
      maxZoom: 19,
      attributionControl: false
    });

    mapRef.current = map;

    // Add Navigation & 3D Pitch / Compass Controls
    map.addControl(
      new maplibregl.NavigationControl({
        visualizePitch: true,
        showCompass: true,
        showZoom: true
      }),
      "bottom-right"
    );

    // Add Attribution in bottom-left
    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      "bottom-left"
    );

    map.on("load", () => {
      // 1. Add Planned Journey Route Polyline (Glow + Solid Line)
      if (coords && coords.length > 0) {
        const lineCoords = coords.map(c => [c[1], c[0]]);

        map.addSource("journey-route", {
          type: "geojson",
          data: {
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: lineCoords
            }
          }
        });

        // Outer glow
        map.addLayer({
          id: "journey-route-glow",
          type: "line",
          source: "journey-route",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: {
            "line-color": routeColor,
            "line-width": 10,
            "line-opacity": 0.45,
            "line-blur": 3
          }
        });

        // Inner solid route line
        map.addLayer({
          id: "journey-route-line",
          type: "line",
          source: "journey-route",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: {
            "line-color": routeColor,
            "line-width": 5,
            "line-opacity": 1.0
          }
        });

        // Auto-fit bounds on initial load if route exists
        if (!initialFittedRef.current && lineCoords.length > 1) {
          const bounds = lineCoords.reduce(
            (b, coord) => b.extend(coord),
            new maplibregl.LngLatBounds(lineCoords[0], lineCoords[0])
          );
          map.fitBounds(bounds, { padding: 50, maxZoom: 16 });
          initialFittedRef.current = true;
        }
      }

      // 2. Add Origin Pin
      if (origin) {
        const origEl = document.createElement("div");
        origEl.className = "maplibre-pin-orig";
        origEl.innerHTML = `
          <div style="
            background: #10b981;
            width: 26px;
            height: 26px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 2px solid #ffffff;
            box-shadow: 0 0 14px #10b981;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
          "><div style="width: 8px; height: 8px; background: #fff; border-radius: 50%; transform: rotate(45deg);"></div></div>
        `;
        const popup = new maplibregl.Popup({ offset: 25 }).setHTML(`
          <div style="color: #0f172a; padding: 4px;">
            <b>🟢 Starting Point</b>
            <div style="font-size: 0.8rem; margin-top: 2px;">${originLabel || "Origin"}</div>
          </div>
        `);
        originMarkerRef.current = new maplibregl.Marker({ element: origEl, anchor: "bottom" })
          .setLngLat([origin[1], origin[0]])
          .setPopup(popup)
          .addTo(map);
      }

      // 3. Add Destination Pin
      if (dest) {
        const destEl = document.createElement("div");
        destEl.className = "maplibre-pin-dest";
        destEl.innerHTML = `
          <div style="
            background: #ef4444;
            width: 26px;
            height: 26px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 2px solid #ffffff;
            box-shadow: 0 0 14px #ef4444;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
          "><div style="width: 8px; height: 8px; background: #fff; border-radius: 50%; transform: rotate(45deg);"></div></div>
        `;
        const popup = new maplibregl.Popup({ offset: 25 }).setHTML(`
          <div style="color: #0f172a; padding: 4px;">
            <b>🔴 Destination</b>
            <div style="font-size: 0.8rem; margin-top: 2px;">${destLabel || "Destination"}</div>
          </div>
        `);
        destMarkerRef.current = new maplibregl.Marker({ element: destEl, anchor: "bottom" })
          .setLngLat([dest[1], dest[0]])
          .setPopup(popup)
          .addTo(map);
      }

      // 4. Add Live GPS Traveler Navigation Puck with Directional Heading Arrow
      const cur = currentPos || origin;
      if (cur) {
        const puckEl = document.createElement("div");
        puckEl.className = "maplibre-traveler-puck";
        puckEl.style.width = "48px";
        puckEl.style.height = "48px";
        puckEl.style.position = "relative";
        puckEl.style.display = "flex";
        puckEl.style.alignItems = "center";
        puckEl.style.justifyContent = "center";

        puckEl.innerHTML = `
          <div style="
            position: absolute;
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background: rgba(59, 130, 246, 0.35);
            animation: maplibre-puck-pulse 1.8s infinite ease-out;
          "></div>
          <div id="traveler-heading-rotator" style="
            position: absolute;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%);
            border: 2.5px solid #ffffff;
            box-shadow: 0 0 16px rgba(59, 130, 246, 0.95), 0 3px 8px rgba(0,0,0,0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            transform: rotate(${travelerBearing}deg);
            transition: transform 0.25s ease;
          ">
            <div style="
              width: 0;
              height: 0;
              border-left: 5px solid transparent;
              border-right: 5px solid transparent;
              border-bottom: 10px solid #ffffff;
              margin-top: -2px;
            "></div>
          </div>
        `;

        travelerMarkerRef.current = new maplibregl.Marker({ element: puckEl, anchor: "center" })
          .setLngLat([cur[1], cur[0]])
          .addTo(map);
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []); // Run once on mount

  // Update Tile Style when showLabels changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    try {
      map.setStyle(getStyle(showLabels));
    } catch (e) {
      console.warn("Could not update style:", e);
    }
  }, [showLabels]);

  // Update 3D Pitch & Camera Angle when mapDimension changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.easeTo({
      pitch: mapDimension === "3d" ? 62 : 0,
      duration: 1000
    });
  }, [mapDimension]);

  // Update Traveler Position and Heading Bearing in Real-Time
  useEffect(() => {
    if (!travelerMarkerRef.current || !currentPos) return;

    // Update marker coordinates [lng, lat]
    travelerMarkerRef.current.setLngLat([currentPos[1], currentPos[0]]);

    // Update heading rotation
    const rotator = document.getElementById("traveler-heading-rotator");
    if (rotator) {
      rotator.style.transform = `rotate(${travelerBearing}deg)`;
    }

    // Follow traveler with smooth camera motion
    if (followTraveler && mapRef.current) {
      mapRef.current.easeTo({
        center: [currentPos[1], currentPos[0]],
        duration: 400
      });
    }
  }, [currentPos, travelerBearing, followTraveler]);

  // Update Route Polyline when coords change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getSource("journey-route")) return;

    if (coords && coords.length > 0) {
      const lineCoords = coords.map(c => [c[1], c[0]]);
      map.getSource("journey-route").setData({
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: lineCoords
        }
      });
    }
  }, [coords]);

  // Handle City Fly-To Navigation
  useEffect(() => {
    if (!flyToTarget || !mapRef.current) return;
    mapRef.current.flyTo({
      center: [flyToTarget.pos[1], flyToTarget.pos[0]],
      zoom: flyToTarget.zoom || 16,
      pitch: mapDimension === "3d" ? 62 : 0,
      duration: 2000
    });
  }, [flyToTarget, mapDimension]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {/* Keyframe animation for pulse ring */}
      <style>{`
        @keyframes maplibre-puck-pulse {
          0% { transform: scale(0.6); opacity: 0.95; }
          100% { transform: scale(2.2); opacity: 0; }
        }
      `}</style>
      <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
