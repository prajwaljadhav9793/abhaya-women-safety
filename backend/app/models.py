from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from extensions import db

def now(): return datetime.utcnow()

class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(190), unique=True, nullable=False, index=True)
    phone = db.Column(db.String(20), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.Enum("user", "admin"), default="user", nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    location_sharing_enabled = db.Column(db.Boolean, default=True, nullable=False)
    preferred_language = db.Column(db.String(10), default="en")
    created_at = db.Column(db.DateTime, default=now)
    contacts = db.relationship("EmergencyContact", backref="user", cascade="all, delete-orphan")

    def set_password(self, pw): self.password_hash = generate_password_hash(pw)
    def check_password(self, pw): return check_password_hash(self.password_hash, pw)
    def to_dict(self):
        d = dict(id=self.id, full_name=self.full_name, email=self.email, phone=self.phone,
                 role=self.role, is_active=self.is_active, location_sharing_enabled=self.location_sharing_enabled,
                 preferred_language=self.preferred_language, created_at=self.created_at.isoformat())
        if hasattr(self, "officer_profile") and self.officer_profile:
            d["officer_profile"] = self.officer_profile.to_dict()
        if hasattr(self, "medical_profile") and self.medical_profile:
            d["medical_profile"] = self.medical_profile.to_dict()
        return d

class EmergencyContact(db.Model):
    __tablename__ = "emergency_contacts"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = db.Column(db.String(120), nullable=False)
    relationship = db.Column(db.String(60))
    phone = db.Column(db.String(20), nullable=False)
    email = db.Column(db.String(190))
    priority = db.Column(db.Integer, default=1, nullable=False)
    notify_on_sos = db.Column(db.Boolean, default=True, nullable=False)
    notify_on_journey = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=now)
    __table_args__ = (db.UniqueConstraint("user_id", "phone", name="uq_contact_user_phone"),)
    def to_dict(self):
        return dict(id=self.id, name=self.name, relationship=self.relationship, phone=self.phone,
                    email=self.email, priority=self.priority, notify_on_sos=self.notify_on_sos,
                    notify_on_journey=self.notify_on_journey)

class Journey(db.Model):
    __tablename__ = "journeys"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    origin_label = db.Column(db.String(255)); origin_lat = db.Column(db.Float); origin_lng = db.Column(db.Float)
    dest_label = db.Column(db.String(255)); dest_lat = db.Column(db.Float); dest_lng = db.Column(db.Float)
    route_type = db.Column(db.Enum("safest", "fastest", "shortest"), default="safest")
    route_geojson = db.Column(db.Text)
    status = db.Column(db.Enum("active", "completed", "cancelled", "escalated"), default="active", index=True)
    started_at = db.Column(db.DateTime, default=now); ended_at = db.Column(db.DateTime)
    planned_distance_m = db.Column(db.Integer); eta_at = db.Column(db.DateTime)
    deviation_threshold_m = db.Column(db.Integer, default=300)
    inactivity_threshold_s = db.Column(db.Integer, default=300)
    escalation_enabled = db.Column(db.Boolean, default=False)
    shared_contact_id = db.Column(db.Integer, db.ForeignKey("emergency_contacts.id", ondelete="SET NULL"))
    locations = db.relationship("JourneyLocation", backref="journey", cascade="all, delete-orphan")

class JourneyLocation(db.Model):
    __tablename__ = "journey_locations"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    journey_id = db.Column(db.Integer, db.ForeignKey("journeys.id", ondelete="CASCADE"), nullable=False, index=True)
    lat = db.Column(db.Float, nullable=False); lng = db.Column(db.Float, nullable=False)
    accuracy = db.Column(db.Float); recorded_at = db.Column(db.DateTime, default=now)

class SosEvent(db.Model):
    __tablename__ = "sos_events"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    journey_id = db.Column(db.Integer, db.ForeignKey("journeys.id", ondelete="SET NULL"))
    lat = db.Column(db.Float); lng = db.Column(db.Float); accuracy = db.Column(db.Float)
    location_status = db.Column(db.String(40), default="unavailable")  # captured / unavailable / denied
    map_url = db.Column(db.String(255)); note = db.Column(db.String(500))
    mode = db.Column(db.Enum("demo", "live"), default="demo", nullable=False)
    status = db.Column(db.Enum("active", "resolved", "cancelled", "under_review"), default="active", index=True)
    patrol_unit = db.Column(db.String(100))
    dispatch_note = db.Column(db.String(500))
    created_at = db.Column(db.DateTime, default=now); resolved_at = db.Column(db.DateTime)
    
    user = db.relationship("User", backref=db.backref("sos_events", cascade="all, delete-orphan"))
    notifications = db.relationship("NotificationLog", backref="sos_event", cascade="all, delete-orphan")

    def to_dict(self, with_logs=True):
        d = dict(id=self.id, user_id=self.user_id, lat=self.lat, lng=self.lng, accuracy=self.accuracy,
                 location_status=self.location_status, map_url=self.map_url, note=self.note,
                 mode=self.mode, status=self.status,
                 patrol_unit=self.patrol_unit, dispatch_note=self.dispatch_note,
                 created_at=self.created_at.isoformat(),
                 resolved_at=self.resolved_at.isoformat() if self.resolved_at else None)
        if hasattr(self, "user") and self.user:
            d["user_name"] = self.user.full_name
            d["user_phone"] = self.user.phone
            d["user_email"] = self.user.email
            if hasattr(self.user, "medical_profile") and self.user.medical_profile:
                d["medical_profile"] = self.user.medical_profile.to_dict()
        if with_logs: d["notifications"] = [n.to_dict() for n in self.notifications]
        return d

class NotificationLog(db.Model):
    __tablename__ = "notification_logs"
    id = db.Column(db.Integer, primary_key=True)
    sos_event_id = db.Column(db.Integer, db.ForeignKey("sos_events.id", ondelete="CASCADE"), index=True)
    contact_id = db.Column(db.Integer, db.ForeignKey("emergency_contacts.id", ondelete="SET NULL"))
    channel = db.Column(db.String(20), nullable=False)       # sms / email / push
    recipient = db.Column(db.String(190), nullable=False)
    # demo_simulated | submitted_to_provider | provider_confirmed | failed | not_configured
    status = db.Column(db.String(30), nullable=False)
    provider_ref = db.Column(db.String(100)); error = db.Column(db.String(300))
    attempted_at = db.Column(db.DateTime, default=now)
    def to_dict(self):
        return dict(id=self.id, channel=self.channel, recipient=self.recipient, status=self.status,
                    error=self.error, attempted_at=self.attempted_at.isoformat())

class IncidentReport(db.Model):
    __tablename__ = "incident_reports"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    category = db.Column(db.String(60), nullable=False, index=True)
    description = db.Column(db.Text, nullable=False)
    incident_time = db.Column(db.DateTime, nullable=False)
    lat = db.Column(db.Float); lng = db.Column(db.Float); location_label = db.Column(db.String(255))
    severity = db.Column(db.Integer, default=2)
    status = db.Column(db.Enum("pending", "under_review", "verified", "rejected", "needs_info"),
                       default="pending", nullable=False, index=True)
    is_demo = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=now); updated_at = db.Column(db.DateTime, default=now, onupdate=now)
    evidence = db.relationship("IncidentEvidence", backref="report", cascade="all, delete-orphan")

class IncidentEvidence(db.Model):
    __tablename__ = "incident_evidence"
    id = db.Column(db.Integer, primary_key=True)
    report_id = db.Column(db.Integer, db.ForeignKey("incident_reports.id", ondelete="CASCADE"), index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    stored_name = db.Column(db.String(100), nullable=False)   # random name, never public
    original_name = db.Column(db.String(255)); mime_type = db.Column(db.String(80))
    size_bytes = db.Column(db.Integer); uploaded_at = db.Column(db.DateTime, default=now)
    sha256_hash = db.Column(db.String(64))
    is_sealed = db.Column(db.Boolean, default=True)

    def to_dict(self):
        return {
            "id": self.id,
            "report_id": self.report_id,
            "user_id": self.user_id,
            "original_name": self.original_name,
            "mime_type": self.mime_type,
            "size_bytes": self.size_bytes,
            "sha256_hash": self.sha256_hash,
            "is_sealed": self.is_sealed,
            "uploaded_at": self.uploaded_at.isoformat() if self.uploaded_at else None
        }

class AdminAction(db.Model):
    __tablename__ = "admin_actions"
    id = db.Column(db.Integer, primary_key=True)
    admin_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    action = db.Column(db.String(60), nullable=False)
    target_type = db.Column(db.String(40)); target_id = db.Column(db.Integer)
    old_value = db.Column(db.String(60)); new_value = db.Column(db.String(60))
    reason = db.Column(db.String(500)); created_at = db.Column(db.DateTime, default=now)

class UserNotification(db.Model):
    __tablename__ = "user_notifications"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title = db.Column(db.String(120)); body = db.Column(db.String(500))
    is_read = db.Column(db.Boolean, default=False); created_at = db.Column(db.DateTime, default=now)

class AppSetting(db.Model):
    __tablename__ = "application_settings"
    key = db.Column(db.String(80), primary_key=True); value = db.Column(db.String(500))

class OfficerProfile(db.Model):
    __tablename__ = "officer_profiles"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    badge_number = db.Column(db.String(80), nullable=False)
    id_proof_type = db.Column(db.String(80), nullable=False) # Police Service ID, Warrant Card, Govt Identity Card
    id_proof_number = db.Column(db.String(100), nullable=False)
    id_proof_filename = db.Column(db.String(255))
    id_proof_original_name = db.Column(db.String(255))
    department = db.Column(db.String(120), nullable=False) # e.g. Cyber Crime Cell, Shahupuri Precinct
    designation = db.Column(db.String(100), nullable=False) # e.g. Police Sub-Inspector, DSP
    verified = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=now)

    user = db.relationship("User", backref=db.backref("officer_profile", uselist=False, cascade="all, delete-orphan"))

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "badge_number": self.badge_number,
            "id_proof_type": self.id_proof_type,
            "id_proof_number": self.id_proof_number,
            "id_proof_filename": self.id_proof_filename,
            "id_proof_original_name": self.id_proof_original_name,
            "department": self.department,
            "designation": self.designation,
            "verified": self.verified,
            "created_at": self.created_at.isoformat()
        }

class UserMedicalProfile(db.Model):
    __tablename__ = "user_medical_profiles"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    blood_group = db.Column(db.String(10), default="B+")
    allergies = db.Column(db.String(255), default="None reported")
    medical_notes = db.Column(db.Text, default="No known chronic conditions or medication dependencies")
    home_city = db.Column(db.String(120), default="Kolhapur, Maharashtra")
    emergency_hospital = db.Column(db.String(150), default="Chhatrapati Pramila Raje (CPR) Civil Hospital")
    emergency_contact_phone = db.Column(db.String(20))
    auto_siren_enabled = db.Column(db.Boolean, default=True)
    auto_whatsapp_enabled = db.Column(db.Boolean, default=True)
    updated_at = db.Column(db.DateTime, default=now, onupdate=now)

    user = db.relationship("User", backref=db.backref("medical_profile", uselist=False, cascade="all, delete-orphan"))

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "blood_group": self.blood_group,
            "allergies": self.allergies,
            "medical_notes": self.medical_notes,
            "home_city": self.home_city,
            "emergency_hospital": self.emergency_hospital,
            "emergency_contact_phone": self.emergency_contact_phone,
            "auto_siren_enabled": self.auto_siren_enabled,
            "auto_whatsapp_enabled": self.auto_whatsapp_enabled,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }

class SafetyZone(db.Model):
    __tablename__ = "safety_zones"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    zone_type = db.Column(db.String(50), default="patrol_zone")  # high_risk, patrol_zone, safe_haven, alert_area
    risk_level = db.Column(db.String(20), default="medium")       # low, medium, high, critical
    lat = db.Column(db.Float, nullable=False)
    lng = db.Column(db.Float, nullable=False)
    radius_m = db.Column(db.Integer, default=500)
    description = db.Column(db.Text)
    patrol_unit = db.Column(db.String(100), default="Precinct Patrol Unit")
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=now)
    updated_at = db.Column(db.DateTime, default=now, onupdate=now)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "zone_type": self.zone_type,
            "risk_level": self.risk_level,
            "lat": self.lat,
            "lng": self.lng,
            "radius_m": self.radius_m,
            "description": self.description,
            "patrol_unit": self.patrol_unit,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

class EvidenceVaultLog(db.Model):
    __tablename__ = "evidence_vault_logs"
    id = db.Column(db.Integer, primary_key=True)
    evidence_id = db.Column(db.Integer, db.ForeignKey("incident_evidence.id", ondelete="CASCADE"), nullable=False, index=True)
    officer_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    action = db.Column(db.String(60), nullable=False) # accessed, verified, exported_for_court, sealed, integrity_checked
    sha256_hash = db.Column(db.String(64))            # Cryptographic SHA-256 seal for evidentiary tamper protection
    officer_notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=now)

    evidence = db.relationship("IncidentEvidence", backref="vault_logs")
    officer = db.relationship("User", foreign_keys=[officer_id])

    def to_dict(self):
        return {
            "id": self.id,
            "evidence_id": self.evidence_id,
            "officer_id": self.officer_id,
            "officer_name": self.officer.full_name if self.officer else "Authorized Officer",
            "action": self.action,
            "sha256_hash": self.sha256_hash,
            "officer_notes": self.officer_notes,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

class FakeCallLog(db.Model):
    __tablename__ = "fake_call_logs"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    caller_name = db.Column(db.String(100), default="Dad")
    caller_number = db.Column(db.String(30), default="+91 98220 12345")
    scenario = db.Column(db.String(80), default="urgent_pickup")
    duration_seconds = db.Column(db.Integer, default=0)
    triggered_at = db.Column(db.DateTime, default=now)

    user = db.relationship("User", backref="fake_calls")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "caller_name": self.caller_name,
            "caller_number": self.caller_number,
            "scenario": self.scenario,
            "duration_seconds": self.duration_seconds,
            "triggered_at": self.triggered_at.isoformat() if self.triggered_at else None
        }

class SafetyChatMessage(db.Model):
    __tablename__ = "safety_chat_messages"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    sender = db.Column(db.Enum("user", "assistant"), nullable=False)
    message = db.Column(db.Text, nullable=False)
    intent = db.Column(db.String(60), default="general_safety")
    is_emergency = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=now)

    user = db.relationship("User", backref="ai_chats")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "sender": self.sender,
            "message": self.message,
            "intent": self.intent,
            "is_emergency": self.is_emergency,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

class SafePlace(db.Model):
    __tablename__ = "safe_places"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    place_type = db.Column(db.String(50), nullable=False) # police_station, hospital, women_safety_desk, pink_booth
    address = db.Column(db.String(255))
    lat = db.Column(db.Float, nullable=False)
    lng = db.Column(db.Float, nullable=False)
    phone = db.Column(db.String(50))
    is_verified = db.Column(db.Boolean, default=True)
    is_24x7 = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=now)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "place_type": self.place_type,
            "address": self.address,
            "lat": self.lat,
            "lng": self.lng,
            "phone": self.phone,
            "is_verified": self.is_verified,
            "is_24x7": self.is_24x7,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

