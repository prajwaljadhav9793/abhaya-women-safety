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
    mk(c, "a@x.com", "9876543210")
    assert c.post("/api/auth/register", json=dict(full_name="T U", email="a@x.com", phone="9876543211", password="Passw0rd1", confirm_password="Passw0rd1")).status_code == 409
    assert c.post("/api/auth/login", json=dict(identifier="a@x.com", password="bad")).status_code == 401

def test_isolation_and_admin(c):
    a, b = mk(c, "a@x.com", "9876543210"), mk(c, "b@x.com", "9876543211")
    sid = c.post("/api/sos", json={"lat": 16.7, "lng": 74.2}, headers=a).json["sos"]["id"]
    assert c.get(f"/api/sos/{sid}", headers=b).status_code == 404
    assert c.get("/api/admin/users", headers=a).status_code == 403
    assert c.get("/api/admin/users").status_code == 401

def test_sos_without_location_and_demo(c):
    a = mk(c, "a@x.com", "9876543210"); r = c.post("/api/sos", json={"location_denied": True}, headers=a)
    assert r.status_code == 201 and r.json["sos"]["mode"] == "demo" and r.json["warnings"]

def test_sos_shares_expiring_evidence_pdf_with_contacts(c, monkeypatch):
    import app.routes.sos as sos_routes

    a = mk(c, "sos@x.com", "9876543210")
    contact = c.post("/api/contacts", json={
        "name": "Trusted Contact", "phone": "9876543211", "email": "contact@example.com"
    }, headers=a)
    assert contact.status_code == 201

    sent_messages = []
    monkeypatch.setattr(sos_routes, "send_sms", lambda phone, body: (
        sent_messages.append((phone, body)) or {"status": "demo_simulated"}
    ))
    result = c.post("/api/sos", json={"lat": 16.7, "lng": 74.2}, headers=a)

    assert result.status_code == 201
    pdf_url = result.json["evidence_pdf_url"]
    assert pdf_url in result.json["alert_message"]
    assert pdf_url in sent_messages[0][1]
    assert result.json["evidence_pdf_expires_in"] == 7 * 24 * 60 * 60

    from urllib.parse import urlsplit
    pdf_response = c.get(urlsplit(pdf_url).path)
    assert pdf_response.status_code == 200
    assert pdf_response.mimetype == "application/pdf"
    assert pdf_response.data.startswith(b"%PDF")

    invalid_response = c.get(urlsplit(pdf_url).path.rsplit("/", 1)[0] + "/invalid.pdf")
    assert invalid_response.status_code == 404

def test_flexible_phone_and_casing_login(c):
    mk(c, "priya.sharma@example.com", "9876543210")
    # 1. Login with uppercase email
    res1 = c.post("/api/auth/login", json=dict(identifier="PRIYA.SHARMA@EXAMPLE.COM", password="Passw0rd1"))
    assert res1.status_code == 200 and "token" in res1.json
    # 2. Login with 10-digit phone
    res2 = c.post("/api/auth/login", json=dict(identifier="9876543210", password="Passw0rd1"))
    assert res2.status_code == 200
    # 3. Login with +91 country code and spaces
    res3 = c.post("/api/auth/login", json=dict(identifier="+91 98765 43210", password="Passw0rd1"))
    assert res3.status_code == 200
    # 4. Trailing space password resilience
    res4 = c.post("/api/auth/login", json=dict(identifier="9876543210", password="Passw0rd1 "))
    assert res4.status_code == 200

def test_ai_unconfigured(c, monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    # AI endpoint gracefully falls back with 200 and intelligent guidance
    assert c.post("/api/ai/chat", json={"message": "hi"}, headers=mk(c, "a@x.com", "9876543210")).status_code == 200
