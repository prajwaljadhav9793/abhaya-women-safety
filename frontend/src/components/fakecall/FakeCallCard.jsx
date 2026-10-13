// FakeCallCard.jsx – the dashboard card. Drop it next to your other feature cards.
// Uses react-router-dom <Link>. If your project uses a different router,
// replace <Link to="/fake-call"> with your own navigation.
import React from "react";
import { Link } from "react-router-dom";
import "../../styles/fakecall.css";

export default function FakeCallCard({ to = "/fake-call", className = "" }) {
  return (
    <Link to={to} className={`fc-dash-card ${className}`}>
      <span className="fc-dash-icon" aria-hidden="true">📞</span>
      <h3>Fake Call</h3>
      <p>Schedule a realistic simulated call to help you leave an uncomfortable situation.</p>
      <span className="fc-dash-cta">Open →</span>
    </Link>
  );
}
