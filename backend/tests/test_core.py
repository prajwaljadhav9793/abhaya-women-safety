import sys, os; sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
import pytest
from app import create_app
from extensions import db

@pytest.fixture()
def c(tmp_path):
    app = create_app({"SQLALCHEMY_DATABASE_URI": "sqlite://", "TESTING": True, "UPLOAD_DIR": str(tmp_path)})
    with app.app_context(): db.create_all()
    return app.test_client()

def mk(c, e, ph):
    c.post("/api/auth/register", json=dict(full_name="Test User", email=e, phone=ph, password="Passw0rd1", confirm_password="Passw0rd1"))
    return {"Authorization": "Bearer " + c.post("/api/auth/login", json=dict(identifier=e, password="Passw0rd1")).json["token"]}

def test_duplicate_and_bad_login(c):
    mk(c, "a@x.co", "9876543210")
    assert c.post("/api/auth/register", json=dict(full_name="T U", email="a@x.co", phone="9876543211", password="Passw0rd1", confirm_password="Passw0rd1")).status_code == 409
    assert c.post("/api/auth/login", json=dict(identifier="a@x.co", password="bad")).status_code == 401

def test_isolation_and_admin(c):
    a, b = mk(c, "a@x.co", "9876543210"), mk(c, "b@x.co", "9876543211")
    sid = c.post("/api/sos", json={"lat": 16.7, "lng": 74.2}, headers=a).json["sos"]["id"]
    assert c.get(f"/api/sos/{sid}", headers=b).status_code == 404
    assert c.get("/api/admin/users", headers=a).status_code == 403
    assert c.get("/api/admin/users").status_code == 401

def test_sos_without_location_and_demo(c):
    a = mk(c, "a@x.co", "9876543210"); r = c.post("/api/sos", json={"location_denied": True}, headers=a)
    assert r.status_code == 201 and r.json["sos"]["mode"] == "demo" and r.json["warnings"]

def test_ai_unconfigured(c, monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    assert c.post("/api/ai/chat", json={"message": "hi"}, headers=mk(c, "a@x.co", "9876543210")).status_code == 503
