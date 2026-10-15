import os
from datetime import datetime, timedelta
from sqlalchemy import text
from app import create_app
from extensions import db
from app.models import (User, EmergencyContact, IncidentReport, OfficerProfile,
                        UserMedicalProfile, SafetyZone, EvidenceVaultLog, FakeCallLog,
                        SafetyChatMessage, SafePlace)

app = create_app()

def bootstrap():
    with app.app_context():
        # 1. Create all missing tables in SQLAlchemy database
        db.create_all()

        # 2. Resilient column migrations for existing tables across SQLite and PostgreSQL
        for sql in [
            "ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT TRUE",
            "ALTER TABLE incident_evidence ADD COLUMN sha256_hash VARCHAR(64)",
            "ALTER TABLE incident_evidence ADD COLUMN is_sealed BOOLEAN DEFAULT TRUE",
            "ALTER TABLE sos_events ADD COLUMN patrol_unit VARCHAR(100)",
            "ALTER TABLE sos_events ADD COLUMN dispatch_note VARCHAR(500)",
            "ALTER TABLE incident_reports ADD COLUMN assigned_officer_id INTEGER"
        ]:
            try:
                db.session.execute(text(sql))
                db.session.commit()
            except Exception:
                db.session.rollback()

        # 3. Seed demo user & admin if not already present
        for email, phone, name, role, pw in [
            ("demo.user@abhaya.test", "+919000000001", "Demo User", "user", os.getenv("DEMO_USER_PASSWORD", "Demo@12345")),
            ("demo.admin@abhaya.test", "+919000000002", "Demo Admin", "admin", os.getenv("DEMO_ADMIN_PASSWORD", "Admin@12345"))
        ]:
            if not User.query.filter_by(email=email).first():
                u = User(full_name=name, email=email, phone=phone, role=role)
                u.set_password(pw)
                db.session.add(u)
        db.session.commit()

        # 4. Seed official officer profile for demo admin
        da = User.query.filter_by(email="demo.admin@abhaya.test").first()
        if da and not OfficerProfile.query.filter_by(user_id=da.id).first():
            db.session.add(OfficerProfile(
                user_id=da.id,
                badge_number="MH-POL-44120",
                id_proof_type="Police Warrant Card / Service ID",
                id_proof_number="WARR 09 444",
                department="Shahupuri Police Precinct, Kolhapur",
                designation="Police Sub-Inspector (PSI)",
                verified=True
            ))
            db.session.commit()

        # 5. Seed demo medical profile for demo user
        du = User.query.filter_by(email="demo.user@abhaya.test").first()
        if du and not UserMedicalProfile.query.filter_by(user_id=du.id).first():
            db.session.add(UserMedicalProfile(
                user_id=du.id,
                blood_group="B+",
                allergies="Penicillin allergy",
                medical_notes="Asthma inhaler carried in emergency kit. Contact family physician on distress.",
                home_city="Kolhapur, Maharashtra",
                emergency_hospital="Chhatrapati Pramila Raje (CPR) Civil Hospital",
                emergency_contact_phone="+919000000099",
                auto_siren_enabled=True,
                auto_whatsapp_enabled=True
            ))
            db.session.commit()

        # 6. Seed demo emergency contact
        if du and not EmergencyContact.query.filter_by(user_id=du.id).first():
            db.session.add(EmergencyContact(
                user_id=du.id,
                name="Demo Contact (fake number)",
                relationship="Friend",
                phone="+919000000099",
                priority=1
            ))
            db.session.commit()

        # 7. Seed demo incident reports
        if du and not IncidentReport.query.filter_by(is_demo=True).first():
            demo_items = [
                ("Poor lighting", "verified", .002, .001),
                ("Harassment", "verified", .004, .003),
                ("Poor lighting", "pending", .0025, .0012),
                ("Suspicious activity", "verified", .0035, .002),
                ("Unsafe street or area", "under_review", -.003, .004),
                ("Transport-related concern", "pending", .006, -.002)
            ] * 2
            for i, (c, st, dla, dlo) in enumerate(demo_items):
                db.session.add(IncidentReport(
                    user_id=du.id,
                    category=c,
                    status=st,
                    description="DEMO record - not a real incident.",
                    severity=2 + i % 2,
                    is_demo=True,
                    incident_time=datetime.utcnow() - timedelta(days=5 + i * 9),
                    lat=16.705 + dla,
                    lng=74.243 + dlo,
                    location_label="Demo area"
                ))
            db.session.commit()

        # 8. Seed default safety zones if table is empty
        if SafetyZone.query.count() == 0:
            default_zones = [
                ("Shahupuri High Density Surveillance Zone", "patrol_zone", "high", 16.7035, 74.2428, 450,
                 "24/7 CCTV monitoring with direct precinct police hotline & continuous motorized patrol coverage.", "Shahupuri Police Mobile-01"),
                ("Rankala Lake Promenade Safe Corridor", "safe_haven", "low", 16.6859, 74.2084, 600,
                 "Illuminated jogging and walkway corridor with emergency pink safety booths and regular beat wardens.", "Pink Beat Patrol Unit-04"),
                ("Central Bus Stand (CBS) Women Safety Zone", "patrol_zone", "medium", 16.7042, 74.2435, 350,
                 "Transit hub zone with dedicated Women Help Outpost, luggage assistance, and verified taxi desk.", "CBS Transit Police Post"),
                ("Shivaji University Campus Safety Perimeter", "safe_haven", "low", 16.6780, 74.2550, 700,
                 "University night corridor with emergency solar lighting and verified security checkposts.", "University Security Mobile")
            ]
            for name, ztype, rlevel, lat, lng, rad, desc, unit in default_zones:
                db.session.add(SafetyZone(
                    name=name, zone_type=ztype, risk_level=rlevel,
                    lat=lat, lng=lng, radius_m=rad, description=desc,
                    patrol_unit=unit, is_active=True
                ))
            db.session.commit()

        # 9. Seed curated safe places if table is empty
        if SafePlace.query.count() == 0:
            default_places = [
                ("Kolhapur Police Control Room & SP Office", "police_station", "Kasaba Bawada Road, Near Collector Office, Kolhapur", 16.7082, 74.2462, "0231-2653960"),
                ("Shahupuri Police Station", "police_station", "Station Road, Near Central Bus Stand, Shahupuri, Kolhapur", 16.7035, 74.2428, "0231-2651033"),
                ("Rajarampuri Police Station", "police_station", "1st Lane, Rajarampuri, Kolhapur", 16.6912, 74.2482, "0231-2524333"),
                ("Juna Rajwada Police Station & Women Desk", "women_safety_desk", "Near Mahalaxmi Temple, Old Palace Area, Kolhapur", 16.6942, 74.2235, "0231-2540333"),
                ("Chhatrapati Pramila Raje (CPR) Civil Hospital", "hospital", "Bhausingji Road, Mangalwar Peth, Kolhapur", 16.6975, 74.2255, "0231-2641555"),
                ("Rankala Lake Emergency Help Post", "pink_booth", "Rankala Chaupati Promenade, Kolhapur", 16.6859, 74.2084, "112")
            ]
            for pname, ptype, addr, plat, plng, pphone in default_places:
                db.session.add(SafePlace(
                    name=pname, place_type=ptype, address=addr,
                    lat=plat, lng=plng, phone=pphone, is_verified=True, is_24x7=True
                ))
            db.session.commit()

        print("Database initialized, schema verified, and all module tables created successfully.")

# Automatically initialize database schema and demo records on startup (Gunicorn/WSGI compatible)
with app.app_context():
    try:
        bootstrap()
    except Exception as e:
        print(f"[ABHAYA Bootstrap Note] {e}")

if __name__ == "__main__":
    print("Starting ABHAYA Backend server at http://127.0.0.1:5000 ...")
    app.run(host="127.0.0.1", port=5000, debug=True, threaded=True)