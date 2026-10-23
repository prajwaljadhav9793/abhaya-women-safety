# 🛡️ ABHAYA — Women Safety Intelligence Platform

> **Real-Time Safety Intelligence, Live Journey Guardian with Native WebGL 3D, Route Risk Scoring, and Automated SOS Emergency Dispatch**

---

## 🌟 Key Highlights & Features

- **🌐 Live Journey Guardian with Dual 2D & Native WebGL 3D Map**:
  - Interactive switch between standard Leaflet 2D and high-altitude 3D WebGL satellite view (powered by MapLibre GL).
  - 62° tilted perspective camera with real-time route extrusion, live tracking markers, and India-exclusive bounding.
  - Optional toggle for street labels and landmark overlays.
  - Real-time battery, speed, and GPS drift awareness.
- **🚨 Emergency SOS Dispatch & Evidence Locker**:
  - Instant one-tap SOS trigger with automated SMS dispatch (Twilio integration with labelled Demo Fallback).
  - Geolocation capture, timestamped alert logging, and automated police/contact notifications, including a signed SOS PDF link for emergency contacts (expires after 7 days).
  - Multi-media evidence vault with secure cloud upload and downloadable incident audit dossiers.
- **🧭 Safe Route Intelligence & Risk Routing**:
  - Dynamic route calculation with safety penalty weights (lighting, past incident reports, time-of-day, proximity to verified safe zones).
  - Identification of safe havens along route (police stations, 24/7 pharmacies, hospitals).
- **⚠️ Community Hazard & Incident Reporting**:
  - Verified citizen reporting system with image attachments and severity classification.
  - Automated report verification and risk clustering.
- **📊 Real-time Safety Analytics & Admin Command Center**:
  - Spatial heatmaps of city safety, pending reports triage, and incident resolution tracking.

---

## 🏗️ Technology Architecture

| Tier | Technologies |
|---|---|
| **Frontend** | React 18, Vite, MapLibre GL 3D (WebGL), Leaflet & React-Leaflet, Lucide React, Tailwind CSS |
| **Backend** | Python 3.10+, Flask, Flask-SQLAlchemy, Flask-JWT-Extended, Flask-Cors, Flask-Limiter, Gunicorn |
| **Database** | SQLite (development/default) / MySQL / PostgreSQL (production ready) |
| **Integrations** | OpenStreetMap / OSRM, Google Satellite HD Tiles, Twilio SMS API, Google Gemini AI (safety advice) |

---

## 📁 Repository Structure

```text
├── backend/
│   ├── app/
│   │   ├── models/         # SQLAlchemy DB models (User, IncidentReport, EmergencyContact, etc.)
│   │   ├── routes/         # REST API endpoints (auth, contacts, sos, modules)
│   │   └── services/       # SMS, Safety Scoring, Geocoding, AI assistants
│   ├── config.py           # Configuration & database URL normalization
│   ├── run.py              # Application entrypoint & auto-bootstrap
│   ├── requirements.txt    # Python dependencies (includes Gunicorn)
│   ├── Procfile            # Cloud WSGI process definition
│   └── .env.example        # Environment variable template
├── frontend/
│   ├── src/
│   │   ├── components/     # MapLibre3DGuardian, Navigation, Modals
│   │   ├── pages/          # LiveJourneyGuardian, SafetyIntelligenceDashboard, ReportHazard, NearbyHelp
│   │   ├── api.js          # Unified API client with automatic token attachment
│   │   └── App.jsx         # Root router & layout
│   ├── public/             # Static assets & _redirects for Netlify
│   ├── vercel.json         # SPA rewrite rule for Vercel
│   ├── package.json        # Frontend dependencies & build scripts
│   └── vite.config.js      # Vite build configuration
├── database/               # Seed scripts & database schemas
├── Procfile                # Root Procfile for unified cloud platforms
└── README.md
```
---

## 🔒 Security & Privacy Notice
- Do not commit `.env` or production API keys to GitHub.
- Live SOS dispatch runs in labeled Demo Mode when Twilio credentials are not configured, preventing unintended SMS charges during evaluation and testing.
- Set the backend `PUBLIC_BASE_URL` environment variable to the public backend origin (for example, `https://your-api.example.com`) so shared SOS PDF links work correctly behind reverse proxies. Links are signed, expire after 7 days, and grant access only to the dossier for that SOS event.

## 🧪 Backend Tests

Install the backend development dependencies and run the API regression suite from the repository root:

```bash
python -m pip install -r backend/requirements-dev.txt
python -m pytest backend/tests
```

The input-validation tests cover account registration and password flows, emergency contacts, journey coordinates, and incident reports, including malformed input and valid submissions.

---

## 📜 License
This project is developed for women's safety awareness and protection intelligence.
