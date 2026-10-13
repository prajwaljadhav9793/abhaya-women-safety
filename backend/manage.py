"""Usage:  python manage.py init-db   |   python manage.py seed-demo"""
import os, sys
from app import create_app
from extensions import db
from app.models import User, EmergencyContact

app = create_app()
def init_db():
    with app.app_context():
        db.create_all(); print("Tables created.")
def seed():
    with app.app_context():
        for email, phone, name, role, pw in [
            ("demo.user@abhaya.test", "+919000000001", "Demo User", "user", os.getenv("DEMO_USER_PASSWORD", "Demo@12345")),
            ("demo.admin@abhaya.test", "+919000000002", "Demo Admin", "admin", os.getenv("DEMO_ADMIN_PASSWORD", "Admin@12345"))]:
            if not User.query.filter_by(email=email).first():
                u = User(full_name=name, email=email, phone=phone, role=role); u.set_password(pw); db.session.add(u)
        db.session.commit()
        du = User.query.filter_by(email="demo.user@abhaya.test").first()
        if not EmergencyContact.query.filter_by(user_id=du.id).first():
            db.session.add(EmergencyContact(user_id=du.id, name="Demo Contact (fake number)",
                                            relationship="Friend", phone="+919000000099", priority=1))
            db.session.commit()
        print("Demo accounts ready (fake numbers; development only).")
if __name__ == "__main__":
    {"init-db": init_db, "seed-demo": seed}.get(sys.argv[1] if len(sys.argv) > 1 else "", lambda: print(__doc__))()
