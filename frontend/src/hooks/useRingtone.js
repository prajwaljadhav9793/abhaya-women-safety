// ---------------------------------------------------------------
// useRingtone.js
// Plays a repeating ringtone using the Web Audio API (no audio files).
// IMPORTANT: browsers block audio until the user interacts with the page,
// so call unlock() inside a click handler (we do it on "Start Fake Call").
// ---------------------------------------------------------------
import { useCallback, useEffect, useRef } from "react";

// Each pattern: list of [frequencyHz, startOffsetSec, durationSec] + repeat cycle length
const PATTERNS = {
  // Old-style phone "brrring-brrring"
  classic: {
    cycle: 3,
    wave: "triangle",
    notes: [
      ...Array.from({ length: 8 }, (_, i) => [i % 2 ? 480 : 440, i * 0.13, 0.12]),
      ...Array.from({ length: 8 }, (_, i) => [i % 2 ? 480 : 440, 1.2 + i * 0.13, 0.12]),
    ],
  },
  // Soft rising melody
  modern: {
    cycle: 2.6,
    wave: "sine",
    notes: [
      [523.25, 0.0, 0.18],
      [659.25, 0.2, 0.18],
      [783.99, 0.4, 0.18],
      [1046.5, 0.6, 0.3],
      [783.99, 1.1, 0.18],
      [659.25, 1.3, 0.18],
      [783.99, 1.5, 0.3],
    ],
  },
};

export default function useRingtone() {
  const ctxRef = useRef(null);
  const gainRef = useRef(null);
  const intervalRef = useRef(null);
  const oscillatorsRef = useRef([]);
  const volumeRef = useRef(0.7);

  // Create / resume the AudioContext. Must be called from a user click.
  const unlock = useCallback(async () => {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try {
      if (!ctxRef.current || ctxRef.current.state === "closed") {
        const ctx = new AC();
        const gain = ctx.createGain();
        gain.gain.value = volumeRef.current;
        gain.connect(ctx.destination);
        ctxRef.current = ctx;
        gainRef.current = gain;
      }
      if (ctxRef.current.state === "suspended") await ctxRef.current.resume();
      return ctxRef.current.state === "running";
    } catch (e) {
      console.warn("Audio unlock failed:", e);
      return false;
    }
  }, []);

  // Schedule one cycle of the pattern
  const playCycle = useCallback((pattern) => {
    const ctx = ctxRef.current;
    if (!ctx || !gainRef.current) return;
    const now = ctx.currentTime;
    pattern.notes.forEach(([freq, offset, dur]) => {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = pattern.wave;
      osc.frequency.value = freq;
      // Short fade in/out to avoid clicking
      env.gain.setValueAtTime(0, now + offset);
      env.gain.linearRampToValueAtTime(1, now + offset + 0.01);
      env.gain.linearRampToValueAtTime(0, now + offset + dur);
      osc.connect(env);
      env.connect(gainRef.current);
      osc.start(now + offset);
      osc.stop(now + offset + dur + 0.02);
      oscillatorsRef.current.push(osc);
      osc.onended = () => {
        oscillatorsRef.current = oscillatorsRef.current.filter((o) => o !== osc);
      };
    });
  }, []);

  // Stop everything immediately (timers + any already-scheduled notes)
  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    oscillatorsRef.current.forEach((o) => {
      try {
        o.stop();
      } catch (e) {
        /* already stopped */
      }
    });
    oscillatorsRef.current = [];
  }, []);

  // Start repeating ringtone. Returns true if audio is actually playing.
  const start = useCallback(
    async (type, volume) => {
      stop(); // prevents overlapping ringtones
      volumeRef.current = volume;
      if (type === "silent" || !PATTERNS[type]) return true;
      const ok = await unlock();
      if (!ok) return false;
      gainRef.current.gain.value = volume;
      const pattern = PATTERNS[type];
      playCycle(pattern);
      intervalRef.current = setInterval(() => playCycle(pattern), pattern.cycle * 1000);
      return true;
    },
    [stop, unlock, playCycle]
  );

  // Change volume while ringing
  const setVolume = useCallback((v) => {
    volumeRef.current = v;
    if (gainRef.current) gainRef.current.gain.value = v;
  }, []);

  // Close audio when the component unmounts
  useEffect(() => {
    return () => {
      stop();
      if (ctxRef.current && ctxRef.current.state !== "closed") {
        ctxRef.current.close().catch(() => {});
      }
      ctxRef.current = null;
    };
  }, [stop]);

  return { unlock, start, stop, setVolume };
}
