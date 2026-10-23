import os
from dotenv import load_dotenv
load_dotenv()


def normalize_database_url(database_url):
    if database_url.startswith("postgres://"):
        return database_url.replace("postgres://", "postgresql+psycopg://", 1)
    if database_url.startswith("postgresql://"):
        return database_url.replace("postgresql://", "postgresql+psycopg://", 1)
    return database_url


def configured_database_url(environment=None):
    environment = os.environ if environment is None else environment
    default_db = os.path.join(os.path.dirname(os.path.abspath(__file__)), "abhaya.db").replace("\\", "/")
    database_url = environment.get("DATABASE_URL", f"sqlite:///{default_db}")
    return normalize_database_url(database_url)


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "abhaya-development-secret-key-32chars-min")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "abhaya-development-jwt-key-32chars-min")
    SQLALCHEMY_DATABASE_URI = configured_database_url()
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True}
    CORS_ORIGINS = "*"
    PUBLIC_BASE_URL = os.getenv("PUBLIC_BASE_URL", "").rstrip("/")
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
