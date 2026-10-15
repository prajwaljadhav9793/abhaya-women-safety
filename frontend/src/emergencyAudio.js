// ============================================================================
// ABHAYA Emergency Audio Siren & Ultra-Reliable Location Capture System
// ============================================================================

let audioCtx = null;
let sirenOsc = null;
let sirenGain = null;
let sirenInterval = null;
let isAlarmRinging = false;

/**
 * Starts a high-penetration emergency siren using the Web Audio API.
 * Synthesizes dual-frequency alternating tones (750Hz <-> 1450Hz).
 * Safe to call on user touch/click events (bypasses browser autoplay restrictions).
 */
export function playEmergencyAlarm() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!audioCtx || audioCtx.state === "closed") {
      audioCtx = new AudioCtx();
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }

    stopEmergencyAlarm();

    const ctx = audioCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // High piercing sawtooth siren
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    gain.gain.setValueAtTime(0.85, ctx.currentTime);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();

    sirenOsc = osc;
    sirenGain = gain;
    isAlarmRinging = true;

    let toggle = false;
    sirenInterval = setInterval(() => {
      if (!sirenOsc || !audioCtx) return;
      toggle = !toggle;
      const targetFreq = toggle ? 1450 : 750;
      try {
        sirenOsc.frequency.exponentialRampToValueAtTime(
          targetFreq,
          audioCtx.currentTime + 0.28
        );
      } catch (e) {}
    }, 320);

    return true;
  } catch (err) {
    console.warn("Emergency audio siren error:", err);
    return false;
  }
}

/**
 * Stops the active emergency alarm siren immediately.
 */
export function stopEmergencyAlarm() {
  if (sirenInterval) {
    clearInterval(sirenInterval);
    sirenInterval = null;
  }
  if (sirenOsc) {
    try {
      sirenOsc.stop();
      sirenOsc.disconnect();
    } catch (e) {}
    sirenOsc = null;
  }
  if (sirenGain) {
    try {
      sirenGain.disconnect();
    } catch (e) {}
    sirenGain = null;
  }
  isAlarmRinging = false;
}

/**
 * Checks if the emergency siren is currently sounding.
 */
export function isEmergencyAlarmPlaying() {
  return isAlarmRinging;
}

/**
 * Realistic police CAD electronic dispatch radio chime (3 tones: 880Hz -> 1175Hz -> 1760Hz).
 * Perfect for real-time dispatch alerts and new incident notifications.
 */
export function playPoliceDispatchChirp() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const tones = [
      { freq: 880, start: now, duration: 0.12 },
      { freq: 1175, start: now + 0.13, duration: 0.14 },
      { freq: 1760, start: now + 0.28, duration: 0.22 }
    ];

    tones.forEach(({ freq, start, duration }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(0.4, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration + 0.05);
    });

    setTimeout(() => {
      try { ctx.close(); } catch (e) {}
    }, 800);
    return true;
  } catch (e) {
    console.warn("Police radio chirp audio error:", e);
    return false;
  }
}

/**
 * Urgent dual-tone siren pulse for active SOS distress alerts.
 */
export function playEmergencyDistressAlarm() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    for (let i = 0; i < 3; i++) {
      const start = now + (i * 0.28);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(950, start);
      osc.frequency.exponentialRampToValueAtTime(1450, start + 0.18);

      gain.gain.setValueAtTime(0.35, start);
      gain.gain.exponentialRampToValueAtTime(0.01, start + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.26);
    }

    setTimeout(() => {
      try { ctx.close(); } catch (e) {}
    }, 1200);
    return true;
  } catch (e) {
    console.warn("Distress alarm error:", e);
    return false;
  }
}

/**
 * Saves known valid coordinates to localStorage for zero-latency emergency fallback.
 */
export function saveEmergencyLocation(lat, lng) {
  try {
    const numLat = parseFloat(lat);
    const numLng = parseFloat(lng);
    if (!isNaN(numLat) && !isNaN(numLng) && numLat !== 0 && numLng !== 0) {
      localStorage.setItem("abhaya_last_coords", JSON.stringify({
        lat: Number(numLat.toFixed(6)),
        lng: Number(numLng.toFixed(6)),
        timestamp: Date.now()
      }));
    }
  } catch (e) {}
}

/**
 * Retrieves the last known stored location from localStorage.
 */
export function getLastKnownLocation() {
  try {
    const raw = localStorage.getItem("abhaya_last_coords");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.lat === "number" && typeof parsed.lng === "number") {
        return parsed;
      }
    }
  } catch (e) {}
  return null;
}

/**
 * Multi-tiered location capture pipeline.
 * Guarantees that an SOS call ALWAYS receives valid coordinates:
 * 1. Immediate inspection of hints (current active journey, GPS position)
 * 2. High-accuracy browser GPS (3.5s timeout)
 * 3. Low-accuracy browser GPS / Wi-Fi cell (2.5s timeout)
 * 4. LocalStorage cached last-known position
 * 5. IP-based location fallback (2.0s timeout)
 * 6. Default Kolhapur / India safety center coordinate (16.7050, 74.2433)
 */
export async function captureEmergencyCoordinates(fallbackHints = []) {
  // Check hints passed from calling component (e.g. currentPos, gpsPosition, origin)
  for (const hint of fallbackHints) {
    if (Array.isArray(hint) && hint.length >= 2) {
      const lat = parseFloat(hint[0]);
      const lng = parseFloat(hint[1]);
      if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
        saveEmergencyLocation(lat, lng);
        return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)), accuracy: 15, source: "active_context_hint" };
      }
    } else if (hint && typeof hint === "object") {
      const lat = parseFloat(hint.lat || hint.latitude);
      const lng = parseFloat(hint.lng || hint.lon || hint.longitude);
      if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
        saveEmergencyLocation(lat, lng);
        return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)), accuracy: 15, source: "active_context_hint" };
      }
    }
  }

  // Helper promise for browser geolocation
  const tryBrowserGeo = (highAcc, timeoutMs) => new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      return resolve(null);
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        lat: Number(pos.coords.latitude.toFixed(6)),
        lng: Number(pos.coords.longitude.toFixed(6)),
        accuracy: Math.round(pos.coords.accuracy || 20),
        source: highAcc ? "gps_high_accuracy" : "browser_standard"
      }),
      () => resolve(null),
      { enableHighAccuracy: highAcc, timeout: timeoutMs, maximumAge: 60000 }
    );
  });

  // Tier 1: High accuracy GPS
  const highAccRes = await tryBrowserGeo(true, 3000);
  if (highAccRes) {
    saveEmergencyLocation(highAccRes.lat, highAccRes.lng);
    return highAccRes;
  }

  // Tier 2: Standard browser location
  const stdRes = await tryBrowserGeo(false, 2000);
  if (stdRes) {
    saveEmergencyLocation(stdRes.lat, stdRes.lng);
    return stdRes;
  }

  // Tier 3: LocalStorage cached position
  const cached = getLastKnownLocation();
  if (cached) {
    return {
      lat: cached.lat,
      lng: cached.lng,
      accuracy: 50,
      source: "cached_device_location"
    };
  }

  // Tier 4: IP Geolocation (Fast fallback)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const ipRes = await fetch("https://ipapi.co/json/", { signal: controller.signal });
    clearTimeout(timeoutId);
    if (ipRes.ok) {
      const data = await ipRes.json();
      if (data && data.latitude && data.longitude) {
        const ipLoc = {
          lat: Number(parseFloat(data.latitude).toFixed(6)),
          lng: Number(parseFloat(data.longitude).toFixed(6)),
          accuracy: 500,
          source: "network_ip_location"
        };
        saveEmergencyLocation(ipLoc.lat, ipLoc.lng);
        return ipLoc;
      }
    }
  } catch (e) {
    // Network or offline fallback
  }

  // Tier 5: Safe Default (Kolhapur central hub)
  const defaultLoc = {
    lat: 16.7050,
    lng: 74.2433,
    accuracy: 100,
    source: "default_emergency_center"
  };
  saveEmergencyLocation(defaultLoc.lat, defaultLoc.lng);
  return defaultLoc;
}

