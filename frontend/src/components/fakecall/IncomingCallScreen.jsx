// IncomingCallScreen.jsx – full-screen "ringing" overlay with Answer / Decline.
import React from "react";

export default function IncomingCallScreen({ name, onAnswer, onDecline, audioBlocked }) {
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  return (
    <div className="fc-screen" role="dialog" aria-label={`Incoming call from ${name}`}>
      <div className="fc-screen-top">
        <p className="fc-sim-tag">Simulated call</p>
        <p className="fc-incoming">Incoming Call</p>
        <div className="fc-avatar-wrap">
          <span className="fc-ring fc-ring-1" />
          <span className="fc-ring fc-ring-2" />
          <span className="fc-ring fc-ring-3" />
          <div className="fc-avatar">{initial}</div>
        </div>
        <h2 className="fc-caller">{name}</h2>
        <p className="fc-sub">Mobile</p>
        {audioBlocked && (
          <p className="fc-hint fc-hint-light">
            Your browser blocked the ringtone sound. Tap Answer to continue.
          </p>
        )}
      </div>
      <div className="fc-screen-bottom">
        <div className="fc-call-btn-col">
          <button type="button" className="fc-round fc-round-red" onClick={onDecline} aria-label="Decline call">
            ✖
          </button>
          <span>Decline</span>
        </div>
        <div className="fc-call-btn-col">
          <button type="button" className="fc-round fc-round-green fc-wiggle" onClick={onAnswer} aria-label="Answer call">
            📞
          </button>
          <span>Answer</span>
        </div>
      </div>
    </div>
  );
}
