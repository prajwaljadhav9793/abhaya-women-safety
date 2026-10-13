"""Adds clearly-flagged DEMO incident reports (is_demo=True). Run after manage.py seed-demo."""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))
from datetime import datetime, timedelta
from app import create_app
from extensions import db
from app.models import User, IncidentReport
app = create_app()
with app.app_context():
    u = User.query.filter_by(email="demo.user@abhaya.test").first()
    if not u: sys.exit("Run: python manage.py seed-demo first")
    if not IncidentReport.query.filter_by(is_demo=True).first():
        for i, (c, st, dla, dlo) in enumerate([("Poor lighting","verified",.002,.001),("Harassment","verified",.004,.003),("Poor lighting","pending",.0025,.0012),
            ("Suspicious activity","verified",.0035,.002),("Unsafe street or area","under_review",-.003,.004),("Transport-related concern","pending",.006,-.002)]*2):
            db.session.add(IncidentReport(user_id=u.id, category=c, status=st, description="DEMO record - not a real incident.", severity=2 + i % 2, is_demo=True,
                incident_time=datetime.utcnow() - timedelta(days=5 + i * 9), lat=16.705 + dla, lng=74.243 + dlo, location_label="Demo area"))
        db.session.commit()
    print("Demo reports ready (flagged is_demo).")
