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
        return dict(id=self.id, full_name=self.full_name, email=self.email, phone=self.phone,
                    role=self.role, location_sharing_enabled=self.location_sharing_enabled,
                    preferred_language=self.preferred_language, created_at=self.created_at.isoformat())

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
    status = db.Column(db.Enum("active", "resolved", "cancelled"), default="active", index=True)
    created_at = db.Column(db.DateTime, default=now); resolved_at = db.Column(db.DateTime)
    notifications = db.relationship("NotificationLog", backref="sos_event", cascade="all, delete-orphan")
    def to_dict(self, with_logs=True):
        d = dict(id=self.id, lat=self.lat, lng=self.lng, accuracy=self.accuracy,
                 location_status=self.location_status, map_url=self.map_url, note=self.note,
                 mode=self.mode, status=self.status, created_at=self.created_at.isoformat(),
                 resolved_at=self.resolved_at.isoformat() if self.resolved_at else None)
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
