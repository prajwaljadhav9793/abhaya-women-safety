// FakeCallSetup.jsx – the configuration form (all controlled inputs).
import React from "react";
import { CALLER_PRESETS, DELAYS, LANGUAGES, RINGTONES, SCRIPTS } from "../../data/fakeCallScripts";

export default function FakeCallSetup({
  config,
  update,
  scriptText,
  onScriptTextChange,
  onPresetChange,
  onScriptKeyChange,
  onLanguageChange,
  onStart,
  onCancel,
  onTestRing,
  onTestVoice,
  phase,
  remaining,
  speechSupported,
  voiceInfo,
  error,
}) {
  const scheduled = phase === "scheduled";
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  return (
    <div className="fc-card">
      <div className="fc-banner">
        🛡️ This is a <strong>simulation</strong>. No real phone call is placed and the real SOS
        feature is never triggered.
      </div>

      {!speechSupported && (
        <div className="fc-warn" role="alert">
          Voice playback (speech synthesis) is not supported in this browser. The dialogue will be
          shown as text only.
        </div>
      )}
      {error && (
        <div className="fc-warn" role="alert">
          {error}
        </div>
      )}

      {scheduled && (
        <div className="fc-status" role="status" aria-live="polite">
          <span className="fc-pulse-dot" /> Call from <strong>{config.displayName}</strong> in{" "}
          <strong className="fc-countdown">
            {mm}:{ss}
          </strong>
        </div>
      )}

      <fieldset className="fc-fieldset" disabled={scheduled}>
        <div className="fc-grid">
          <label className="fc-field">
            <span>Caller</span>
            <select value={config.callerPreset} onChange={(e) => onPresetChange(e.target.value)}>
              {Object.keys(CALLER_PRESETS).map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>

          {config.callerPreset === "Custom" && (
            <label className="fc-field">
              <span>Custom name</span>
              <input
                type="text"
                maxLength={30}
                value={config.customName}
                placeholder="e.g. Priya Didi"
                onChange={(e) => update({ customName: e.target.value })}
              />
            </label>
          )}

          <label className="fc-field">
            <span>Voice</span>
            <select value={config.gender} onChange={(e) => update({ gender: e.target.value })}>
              <option value="female">Female</option>
              <option value="male">Male</option>
            </select>
          </label>

          <label className="fc-field">
            <span>Language</span>
            <select value={config.lang} onChange={(e) => onLanguageChange(e.target.value)}>
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>

          <label className="fc-field">
            <span>Call delay</span>
            <select value={config.delay} onChange={(e) => update({ delay: Number(e.target.value) })}>
              {DELAYS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>

          <label className="fc-field">
            <span>Ringtone</span>
            <select value={config.ringtone} onChange={(e) => update({ ringtone: e.target.value })}>
              {RINGTONES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>

          <label className="fc-field">
            <span>Ringtone volume: {Math.round(config.ringVolume * 100)}%</span>
            <input
              type="range"
              min="0.05"
              max="1"
              step="0.05"
              value={config.ringVolume}
              onChange={(e) => update({ ringVolume: Number(e.target.value) })}
            />
          </label>
        </div>

        <h3 className="fc-h3">Conversation</h3>
        <div className="fc-grid">
          <label className="fc-field">
            <span>Script</span>
            <select value={config.scriptKey} onChange={(e) => onScriptKeyChange(e.target.value)}>
              {Object.entries(SCRIPTS).map(([key, s]) => (
                <option key={key} value={key}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="fc-field">
            <span>Voice speed: {config.rate.toFixed(1)}x</span>
            <input
              type="range"
              min="0.6"
              max="1.4"
              step="0.1"
              value={config.rate}
              onChange={(e) => update({ rate: Number(e.target.value) })}
            />
          </label>
          <label className="fc-field">
            <span>Voice volume: {Math.round(config.speechVolume * 100)}%</span>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.1"
              value={config.speechVolume}
              onChange={(e) => update({ speechVolume: Number(e.target.value) })}
            />
          </label>
        </div>

        <label className="fc-field">
          <span>Dialogue (you can edit it)</span>
          <textarea
            rows={4}
            maxLength={600}
            value={scriptText}
            placeholder="Type what the caller should say…"
            onChange={(e) => onScriptTextChange(e.target.value)}
          />
        </label>
      </fieldset>

      <div className="fc-actions">
        <button type="button" className="fc-btn fc-btn-primary" onClick={onStart} disabled={scheduled}>
          📞 Start Fake Call
        </button>
        <button type="button" className="fc-btn fc-btn-danger" onClick={onCancel} disabled={!scheduled}>
          Cancel Scheduled Call
        </button>
      </div>
      <div className="fc-actions">
        <button type="button" className="fc-btn fc-btn-ghost" onClick={onTestRing}>
          🔔 Test ringtone (3s)
        </button>
        <button type="button" className="fc-btn fc-btn-ghost" onClick={onTestVoice} disabled={!speechSupported}>
          🔊 Test voice
        </button>
      </div>
      {voiceInfo && (
        <p className="fc-hint">
          Voice used: <strong>{voiceInfo.name}</strong>
          {!voiceInfo.languageMatched && " (no voice for this language on your device – closest used)"}
          {voiceInfo.languageMatched && !voiceInfo.genderMatched &&
            " (no matching male/female voice found – pitch adjusted)"}
        </p>
      )}
    </div>
  );
}
