// ActiveCallScreen.jsx – shown after Answer: timer, captions, Mute / Replay / End.
import React from "react";

function formatTime(total) {
  const m = String(Math.floor(total / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${m}:${s}`;
}

export default function ActiveCallScreen({
  name,
  seconds,
  muted,
  speaking,
  dialogue,
  speechSupported,
  onMute,
  onReplay,
  onEnd,
}) {
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  return (
    <div className="fc-screen" role="dialog" aria-label={`Call with ${name}`}>
      <div className="fc-screen-top">
        <p className="fc-sim-tag">Call Connected – Simulation</p>
        <div className="fc-avatar fc-avatar-sm">{initial}</div>
        <h2 className="fc-caller">{name}</h2>
        <p className="fc-timer" aria-live="off">
          {formatTime(seconds)}
        </p>
        {speaking && <p className="fc-sub">🔊 Speaking…</p>}
        {muted && <p className="fc-sub">🔇 Muted</p>}

        <div className="fc-captions">
          {!speechSupported && (
            <p className="fc-warn">Speech synthesis is unavailable here, so the dialogue is shown as text.</p>
          )}
          <p>{dialogue || "(No dialogue entered)"}</p>
        </div>
      </div>

      <div className="fc-screen-bottom fc-screen-bottom-3">
        <div className="fc-call-btn-col">
          <button
            type="button"
            className={`fc-round fc-round-grey ${muted ? "fc-active" : ""}`}
            onClick={onMute}
            aria-pressed={muted}
            aria-label="Mute"
          >
            {muted ? "🔇" : "🎤"}
          </button>
          <span>{muted ? "Unmute" : "Mute"}</span>
        </div>
        <div className="fc-call-btn-col">
          <button type="button" className="fc-round fc-round-grey" onClick={onReplay} aria-label="Replay dialogue">
            🔁
          </button>
          <span>Replay</span>
        </div>
        <div className="fc-call-btn-col">
          <button type="button" className="fc-round fc-round-red" onClick={onEnd} aria-label="End call">
            📵
          </button>
          <span>End Call</span>
        </div>
      </div>
    </div>
  );
}
