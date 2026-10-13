import os
from dotenv import load_dotenv
load_dotenv()

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "abhaya-development-secret-key-32chars-min")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "abhaya-development-jwt-key-32chars-min")
    _default_db = os.path.join(os.path.dirname(os.path.abspath(__file__)), "abhaya.db").replace("\\", "/")
    _raw_db = os.getenv("DATABASE_URL", f"sqlite:///{_default_db}")
    if _raw_db.startswith("postgres://"):
        _raw_db = _raw_db.replace("postgres://", "postgresql://", 1)
    SQLALCHEMY_DATABASE_URI = _raw_db
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True}
    CORS_ORIGINS = "*"
    UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), os.getenv("UPLOAD_DIR", "../uploads")))
    MAX_CONTENT_LENGTH = 25 * 1024 * 1024
    JWT_ACCESS_TOKEN_EXPIRES = 60 * 60 * 8

def integration_status():
    """Which integrations are really configured vs. demo."""
    e = os.getenv
    return {
        "gemini": bool(e("GEMINI_API_KEY")),
        "sms_twilio": all(e(k) for k in ("TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM_NUMBER")),
        "routing": bool(e("ROUTING_PROVIDER_KEY")),
        "places": bool(e("PLACES_PROVIDER_KEY")),
    }
