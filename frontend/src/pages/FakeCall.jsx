// ---------------------------------------------------------------
// FakeCall.jsx – the Fake Call page (state machine + timers).
//
// phase: "setup"     -> user configures the call
//        "scheduled" -> countdown running (can be cancelled)
//        "ringing"   -> incoming-call screen + ringtone
//        "connected" -> simulated conversation (speech + timer)
//
// This page is completely separate from the real SOS workflow.
// ---------------------------------------------------------------
import React, { useCallback, useEffect, useRef, useState } from "react";
import "../styles/fakecall.css";
import useRingtone from "../hooks/useRingtone";
import useSpeech from "../hooks/useSpeech";
import {
  CALLER_PRESETS,
  LANGUAGES,
  SCRIPTS,
  getScriptText,
} from "../data/fakeCallScripts";
import FakeCallSetup from "../components/fakecall/FakeCallSetup";
import IncomingCallScreen from "../components/fakecall/IncomingCallScreen";
import ActiveCallScreen from "../components/fakecall/ActiveCallScreen";

const STORAGE_KEY = "abhaya_fakecall_config";

const DEFAULT_CONFIG = {
  callerPreset: "Mom",
  customName: "",
  gender: "female",
  lang: "en",
  delay: 30,
  ringtone: "classic",
  ringVolume: 0.7,
  scriptKey: "mom",
  rate: 1,
  speechVolume: 1,
};

// Load saved settings (safe if localStorage is blocked)
function loadConfig() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return { ...DEFAULT_CONFIG, ...(saved || {}) };
  } catch (e) {
    return DEFAULT_CONFIG;
  }
}

export default function FakeCall() {
  const [config, setConfig] = useState(loadConfig);
  const [scriptText, setScriptText] = useState(() => {
    const c = loadConfig();
    return getScriptText(c.scriptKey, c.lang);
  });
  const [phase, setPhase] = useState("setup");
  const [remaining, setRemaining] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const { unlock, start: startRing, stop: stopRing } = useRingtone();
  const speech = useSpeech();

  // Refs hold the *latest* values so timers/effects never use stale data
  const configRef = useRef(config);
  const scriptRef = useRef(scriptText);
  const mutedRef = useRef(false);
  const speakRef = useRef(speech.speak);
  const countdownRef = useRef(null);
  const testTimeoutRef = useRef(null);
  const wakeLockRef = useRef(null);
  configRef.current = config;
  scriptRef.current = scriptText;
  speakRef.current = speech.speak;
  const stopSpeech = speech.stop;

  const displayName =
    config.callerPreset === "Custom" ? config.customName.trim() || "Unknown" : config.callerPreset;

  // ---------- helpers ----------
  const update = useCallback((patch) => setConfig((c) => ({ ...c, ...patch })), []);

  // Save settings whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (e) {
      /* ignore */
    }
  }, [config]);

  const clearCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  // Speak the current dialogue using the selected voice settings
  const playDialogue = useCallback(() => {
    if (mutedRef.current) return;
    const c = configRef.current;
    const langInfo = LANGUAGES.find((l) => l.value === c.lang) || LANGUAGES[0];
    speakRef.current(scriptRef.current, {
      gender: c.gender,
      lang: c.lang,
      speechLang: langInfo.speechLang,
      rate: c.rate,
      volume: c.speechVolume,
    });
  }, []);

  // ---------- form handlers ----------
  const onPresetChange = (preset) => {
    const key = CALLER_PRESETS[preset];
    update({ callerPreset: preset, scriptKey: key, gender: SCRIPTS[key].gender });
    setScriptText(getScriptText(key, config.lang));
  };
  const onScriptKeyChange = (key) => {
    update({ scriptKey: key, gender: SCRIPTS[key].gender });
    setScriptText(getScriptText(key, config.lang));
  };
  const onLanguageChange = (lang) => {
    update({ lang });
    if (config.scriptKey !== "custom") setScriptText(getScriptText(config.scriptKey, lang));
  };

  // ---------- main actions ----------
  const handleStart = async () => {
    if (phase !== "setup" || countdownRef.current) return; // no duplicate countdowns
    setError("");
    setNotice("");
    if (config.callerPreset === "Custom" && !config.customName.trim()) {
      setError("Please enter a custom caller name.");
      return;
    }
    if (!scriptText.trim()) {
      setError("Please enter or select some dialogue for the caller.");
      return;
    }
    // This click is the "user interaction" browsers require before audio can play.
    await unlock();
    if (countdownRef.current) return; // double-click guard

    const endAt = Date.now() + config.delay * 1000;
    setRemaining(config.delay);
    setPhase("scheduled");
    countdownRef.current = setInterval(() => {
      const left = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) {
        clearCountdown();
        setPhase("ringing");
      }
    }, 250);
  };

  const handleCancel = () => {
    clearCountdown();
    setPhase("setup");
    setNotice("Scheduled call cancelled.");
  };

  const handleAnswer = () => {
    mutedRef.current = false;
    setMuted(false);
    setPhase("connected"); // ringtone is stopped by the ringing-effect cleanup
  };

  const handleDecline = () => {
    setPhase("setup");
    setNotice("Call declined.");
  };

  const handleEnd = () => {
    setPhase("setup"); // speech + duration timer stopped by the connected-effect cleanup
    setNotice("Simulated call ended.");
  };

  const handleMute = () => {
    const next = !muted;
    mutedRef.current = next;
    setMuted(next);
    if (next) stopSpeech();
  };

  const handleReplay = () => {
    mutedRef.current = false;
    setMuted(false);
    playDialogue(); // speak() cancels earlier speech first -> no overlap
  };

  const handleTestRing = async () => {
    setError("");
    const ok = await startRing(config.ringtone, config.ringVolume);
    if (!ok && config.ringtone !== "silent") {
      setError("Your browser blocked audio. Please tap the page and try again.");
    }
    clearTimeout(testTimeoutRef.current);
    testTimeoutRef.current = setTimeout(stopRing, 3000);
  };

  const handleTestVoice = () => {
    mutedRef.current = false;
    playDialogue();
  };

  // ---------- effects tied to phases ----------

  // RINGING: play ringtone repeatedly + vibrate. Cleanup stops everything.
  useEffect(() => {
    if (phase !== "ringing") return undefined;
    let cancelled = false;
    clearTimeout(testTimeoutRef.current);
    setAudioBlocked(false);
    startRing(configRef.current.ringtone, configRef.current.ringVolume).then((ok) => {
      if (cancelled) {
        stopRing(); // answered/declined while audio was starting
      } else {
        setAudioBlocked(!ok);
      }
    });
    const buzz = () => navigator.vibrate && navigator.vibrate([600, 400, 600]);
    buzz();
    const vibrateTimer = setInterval(buzz, 2500);
    return () => {
      cancelled = true;
      stopRing();
      clearInterval(vibrateTimer);
      if (navigator.vibrate) navigator.vibrate(0);
    };
  }, [phase, startRing, stopRing]);

  // CONNECTED: duration timer + speak dialogue. Cleanup stops both.
  useEffect(() => {
    if (phase !== "connected") return undefined;
    const startedAt = Date.now();
    setSeconds(0);
    const timer = setInterval(() => setSeconds(Math.floor((Date.now() - startedAt) / 1000)), 500);
    playDialogue();
    return () => {
      clearInterval(timer);
      stopSpeech();
    };
  }, [phase, playDialogue, stopSpeech]);

  // Keep the screen awake while waiting (where supported)
  useEffect(() => {
    const waiting = phase === "scheduled" || phase === "ringing";
    if (!waiting || !("wakeLock" in navigator)) return undefined;
    let released = false;
    navigator.wakeLock
      .request("screen")
      .then((lock) => {
        if (released) lock.release().catch(() => {});
        else wakeLockRef.current = lock;
      })
      .catch(() => {});
    return () => {
      released = true;
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, [phase]);

  // UNMOUNT: clear every timer/audio/speech so nothing keeps running
  useEffect(() => {
    return () => {
      clearCountdown();
      clearTimeout(testTimeoutRef.current);
      stopRing();
      stopSpeech();
    };
  }, [clearCountdown, stopRing, stopSpeech]);

  return (
    <div className="fc-page">
      <header className="fc-header">
        <h1>📞 Fake Call</h1>
        <p>Schedule a simulated incoming call to help you step away from an uncomfortable situation.</p>
      </header>

      {notice && phase === "setup" && (
        <div className="fc-notice" role="status">
          {notice}
        </div>
      )}

      <FakeCallSetup
        config={{ ...config, displayName }}
        update={update}
        scriptText={scriptText}
        onScriptTextChange={setScriptText}
        onPresetChange={onPresetChange}
        onScriptKeyChange={onScriptKeyChange}
        onLanguageChange={onLanguageChange}
        onStart={handleStart}
        onCancel={handleCancel}
        onTestRing={handleTestRing}
        onTestVoice={handleTestVoice}
        phase={phase}
        remaining={remaining}
        speechSupported={speech.supported}
        voiceInfo={speech.voiceInfo}
        error={error}
      />

      {phase === "ringing" && (
        <IncomingCallScreen
          name={displayName}
          onAnswer={handleAnswer}
          onDecline={handleDecline}
          audioBlocked={audioBlocked}
        />
      )}

      {phase === "connected" && (
        <ActiveCallScreen
          name={displayName}
          seconds={seconds}
          muted={muted}
          speaking={speech.speaking}
          dialogue={scriptText}
          speechSupported={speech.supported}
          onMute={handleMute}
          onReplay={handleReplay}
          onEnd={handleEnd}
        />
      )}
    </div>
  );
}
