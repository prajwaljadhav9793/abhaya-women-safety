import io
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app import create_app
from extensions import db


PASSWORD = "SafetyPass9"


@pytest.fixture()
def client(tmp_path):
    app = create_app({
        "SQLALCHEMY_DATABASE_URI": "sqlite://",
        "TESTING": True,
        "UPLOAD_DIR": str(tmp_path),
    })
    with app.app_context():
        db.create_all()
    return app.test_client()


def register(client, email="input.test@example.com", phone="9876543210"):
    response = client.post("/api/auth/register", json={
        "full_name": "Input Test",
        "email": email,
        "phone": phone,
        "password": PASSWORD,
        "confirm_password": PASSWORD,
    })
    assert response.status_code == 201
    return {"Authorization": f"Bearer {response.json['token']}"}


def test_registration_rejects_invalid_fields_and_non_object_payload(client):
    response = client.post("/api/auth/register", json={
        "full_name": [],
        "email": "not-an-email",
        "phone": 12345,
        "password": "short",
        "confirm_password": "different",
    })

    assert response.status_code == 422
    assert set(response.json["fields"]) == {
        "full_name", "email", "phone", "password", "confirm_password",
    }
    assert client.post("/api/auth/register", json=["not", "an", "object"]).status_code == 422


def test_registration_rejects_email_with_one_character_domain_suffix(client):
    for email in (
        "ssdsdsdswp@gmail.c",
        "person@example.org",
        "person@gmaail.com",
        "person@gmial.com",
        "raj@gmail.com.com",
        "raj@gmailcom.com",
        "raj@gmailgmial.com",
    ):
        response = client.post("/api/auth/register", json={
            "full_name": "Input Test",
            "email": email,
            "phone": "9876543210",
            "password": PASSWORD,
            "confirm_password": PASSWORD,
        })
        assert response.status_code == 422
        assert "email" in response.json["fields"]


def test_registration_accepts_correct_popular_and_custom_com_domains(client):
    for index, email in enumerate(("person@gmail.com", "person@mycompany.com", "Person2@GMAIL.com")):
        response = client.post("/api/auth/register", json={
            "full_name": "Input Test",
            "email": email,
            "phone": f"987654321{index}",
            "password": PASSWORD,
            "confirm_password": PASSWORD,
        })
        assert response.status_code == 201
        assert response.json["user"]["email"] == email.lower()


def test_registration_requires_exactly_ten_mobile_digits(client):
    for phone in ("987654321", "98765432101", "+919876543210", "98765 43210"):
        response = client.post("/api/auth/register", json={
            "full_name": "Input Test",
            "email": "input.test@example.com",
            "phone": phone,
            "password": PASSWORD,
            "confirm_password": PASSWORD,
        })
        assert response.status_code == 422
        assert response.json["fields"]["phone"] == "Enter a valid 10-digit mobile number"


def test_login_and_password_reset_reject_missing_and_malformed_inputs(client):
    login = client.post("/api/auth/login", json=["invalid"])
    reset = client.post("/api/auth/reset-password", json={
        "identifier": [],
        "new_password": 123,
        "confirm_password": {},
    })

    assert login.status_code == 422
    assert reset.status_code == 422

    register(client)
    valid_reset = client.post("/api/auth/reset-password", json={
        "identifier": "input.test@example.com",
        "new_password": "UpdatedPass8",
        "confirm_password": "UpdatedPass8",
    })
    assert valid_reset.status_code == 200
    assert client.post("/api/auth/login", json={
        "identifier": "input.test@example.com",
        "password": "UpdatedPass8",
    }).status_code == 200


def test_emergency_contact_validates_string_and_contact_fields(client):
    headers = register(client)
    invalid = client.post("/api/contacts", headers=headers, json={
        "name": ["Not", "text"],
        "phone": 9876543211,
        "email": 123,
        "relationship": {"kind": "friend"},
        "priority": True,
        "notify_on_sos": "false",
    })

    assert invalid.status_code == 422
    assert set(invalid.json["fields"]) == {
        "name", "phone", "email", "relationship", "priority", "notify_on_sos",
    }

    invalid_email = client.post("/api/contacts", headers=headers, json={
        "name": "Alternate Contact",
        "phone": "9876543212",
        "email": "person@gmaail.com",
    })
    assert invalid_email.status_code == 422
    assert "email" in invalid_email.json["fields"]

    valid = client.post("/api/contacts", headers=headers, json={
        "name": "Trusted Contact",
        "phone": "9876543211",
        "email": "CONTACT@example.com",
    })
    assert valid.status_code == 201
    assert valid.json["contact"]["phone"] == "9876543211"
    assert valid.json["contact"]["email"] == "contact@example.com"

    for phone in ("987654321", "98765432101", "+919876543212"):
        invalid_phone = client.post("/api/contacts", headers=headers, json={
            "name": "Alternate Contact",
            "phone": phone,
        })
        assert invalid_phone.status_code == 422
        assert "phone" in invalid_phone.json["fields"]


def test_profile_requires_exactly_ten_digits_when_mobile_is_changed(client):
    headers = register(client)
    for phone in ("987654321", "98765432101", "+919876543211"):
        invalid = client.put("/api/auth/profile", headers=headers, json={"phone": phone})
        assert invalid.status_code == 422

    valid = client.put("/api/auth/profile", headers=headers, json={"phone": "9876543211"})
    assert valid.status_code == 200
    assert valid.json["user"]["phone"] == "9876543211"


def test_officer_registration_enforces_com_email_and_ten_digit_mobile(client):
    for email, phone, invalid_field in (
        ("officer@example.org", "9876543210", "email"),
        ("officer@example.com", "98765432101", "phone"),
    ):
        response = client.post("/api/auth/register-officer", json={
            "full_name": "Officer Test",
            "email": email,
            "phone": phone,
            "password": PASSWORD,
            "confirm_password": PASSWORD,
            "badge_number": "B-123",
            "id_proof_number": "ID-123",
            "department": "Police Department",
        })

        assert response.status_code == 422
        assert invalid_field in response.json["fields"]


def test_journey_rejects_malformed_and_out_of_region_coordinates(client):
    headers = register(client)
    invalid_pairs = [
        {"origin": [16.7], "dest": [16.8, 74.2]},
        {"origin": {"lat": 16.7, "lng": 74.2}, "dest": [16.8, 74.2]},
        {"origin": ["north", 74.2], "dest": [16.8, 74.2]},
        {"origin": [16.7, 74.2], "dest": [48.8, 2.3]},
    ]

    for payload in invalid_pairs:
        response = client.post("/api/journeys", headers=headers, json=payload)
        assert response.status_code == 422

    valid = client.post("/api/journeys", headers=headers, json={
        "origin": [16.7, 74.2],
        "dest": [16.8, 74.3],
    })
    assert valid.status_code == 201
    assert valid.json["journey"]["origin"] == [16.7, 74.2]


def test_incident_report_validates_fields_severity_and_upload_extension(client):
    headers = register(client)
    invalid = client.post("/api/reports", headers=headers, json={
        "category": "Not a supported category",
        "description": "too short",
        "incident_time": "not-a-date",
        "severity": "urgent",
    })

    assert invalid.status_code == 422
    assert set(invalid.json["fields"]) == {
        "category", "description", "incident_time", "severity",
    }

    valid = client.post("/api/reports", headers=headers, json={
        "category": "Poor lighting",
        "description": "The streetlights have been out for several days.",
        "incident_time": "2026-10-23T09:00:00",
        "severity": "3",
    })
    assert valid.status_code == 201
    assert valid.json["report"]["severity"] == 3

    invalid_file = client.post("/api/reports", headers=headers, data={
        "category": "Poor lighting",
        "description": "The streetlights have been out for several days.",
        "incident_time": "2026-10-23T09:00:00",
        "files": (io.BytesIO(b"not an allowed upload"), "payload.exe"),
    }, content_type="multipart/form-data")
    assert invalid_file.status_code == 422
    assert "files" in invalid_file.json["fields"]
