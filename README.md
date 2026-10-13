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
  - Geolocation capture, timestamped alert logging, and automated police/contact notifications.
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

## 🚀 Local Development Setup

### 1. Backend Setup
```bash
cd backend

# Create and activate virtual environment
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create environment file
cp .env.example .env

# Run backend (auto-seeds demo data and starts on http://127.0.0.1:5000)
python run.py
```

### 2. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Start Vite development server (starts on http://localhost:5173)
npm run dev
```

### 3. Demo Credentials
- **User Account**: `demo.user@abhaya.test` / `Demo@12345`
- **Admin Account**: `demo.admin@abhaya.test` / `Admin@12345`

---

## 🌐 Production Deployment Guide

Deploying ABHAYA is split into two steps: deploying the **Backend API** and deploying the **Frontend Client**.

### Step 1: Deploy Backend (Render / Railway / Koyeb)

#### Option A: Deploy on [Render](https://render.com) (Recommended Free/Easy)
1. Fork or push this repository to your GitHub account.
2. Log into Render and click **New +** > **Web Service**.
3. Connect your GitHub repository.
4. Set the following build and start configurations:
   - **Root Directory**: `backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn run:app`
5. Add Environment Variables:
   - `SECRET_KEY`: `<generate-a-strong-random-32-char-key>`
   - `JWT_SECRET_KEY`: `<generate-a-strong-random-32-char-key>`
   - `FLASK_ENV`: `production`
   - *(Optional)* `DATABASE_URL`: Add a PostgreSQL database URL if using hosted PostgreSQL. (SQLite is used by default).
   - *(Optional)* `GEMINI_API_KEY`: Your Google Gemini API Key.
   - *(Optional)* `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`: For live SMS alerts.
6. Click **Deploy Web Service**.
7. Note down your backend URL (e.g., `https://abhaya-api.onrender.com`).

---

### Step 2: Deploy Frontend (Vercel / Netlify)

#### Option A: Deploy on [Vercel](https://vercel.com) (Recommended)
1. Go to [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New...** > **Project**.
2. Select your `abhaya` repository.
3. Configure the Project:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click *Edit* and select `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Expand **Environment Variables** and add:
   - `VITE_API_URL`: Set to your deployed backend URL followed by `/api`  
     *(e.g., `https://abhaya-api.onrender.com/api`)*
5. Click **Deploy**. Vercel will build the frontend and provide your live application URL.

#### Option B: Deploy on [Netlify](https://netlify.com)
1. Go to Netlify and click **Add new site** > **Import an existing project**.
2. Select your GitHub repository.
3. Configure settings:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/dist`
4. Add Environment Variable:
   - `VITE_API_URL`: `https://your-backend-domain.com/api`
5. Click **Deploy**.

---

## 🔒 Security & Privacy Notice
- Do not commit `.env` or production API keys to GitHub.
- Live SOS dispatch runs in labeled Demo Mode when Twilio credentials are not configured, preventing unintended SMS charges during evaluation and testing.

---

## 📜 License
This project is developed for women's safety awareness and protection intelligence.
