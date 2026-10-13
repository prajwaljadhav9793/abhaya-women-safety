import os
from datetime import datetime, timedelta
from app import create_app
from extensions import db
from app.models import User, EmergencyContact, IncidentReport

app = create_app()

def bootstrap():
    with app.app_context():
        db.create_all()
        # Seed demo user & admin if not already present
        for email, phone, name, role, pw in [
            ("demo.user@abhaya.test", "+919000000001", "Demo User", "user", os.getenv("DEMO_USER_PASSWORD", "Demo@12345")),
            ("demo.admin@abhaya.test", "+919000000002", "Demo Admin", "admin", os.getenv("DEMO_ADMIN_PASSWORD", "Admin@12345"))
        ]:
            if not User.query.filter_by(email=email).first():
                u = User(full_name=name, email=email, phone=phone, role=role)
                u.set_password(pw)
                db.session.add(u)
        db.session.commit()

        # Seed demo emergency contact
        du = User.query.filter_by(email="demo.user@abhaya.test").first()
        if du and not EmergencyContact.query.filter_by(user_id=du.id).first():
            db.session.add(EmergencyContact(
                user_id=du.id,
                name="Demo Contact (fake number)",
                relationship="Friend",
                phone="+919000000099",
                priority=1
            ))
            db.session.commit()

        # Seed demo incident reports
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
            print("Database initialized and demo data seeded successfully.")

# Automatically initialize database schema and demo records on startup (Gunicorn/WSGI compatible)
with app.app_context():
    try:
        bootstrap()
    except Exception as e:
        print(f"[ABHAYA Bootstrap Note] {e}")

if __name__ == "__main__":
    print("Starting ABHAYA Backend server at http://127.0.0.1:5000 ...")
    app.run(host="127.0.0.1", port=5000, debug=True, threaded=True)