import re
from functools import wraps
from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from app.models import User

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
PHONE_RE = re.compile(r"^\+?\d{10,15}$")

def clean_phone(p): return re.sub(r"[\s\-()]", "", p or "")
def valid_password(p): return bool(p) and len(p) >= 8 and re.search(r"[A-Za-z]", p) and re.search(r"\d", p)

def current_user():
    u = db_get(User, get_jwt_identity())
    return u

def db_get(model, pk):
    from extensions import db
    return db.session.get(model, int(pk))

def login_required(roles=None):
    """Role is always read from the database, never from the client."""
    def deco(fn):
        @wraps(fn)
        def wrapper(*a, **kw):
            verify_jwt_in_request()
            user = current_user()
            if not user or not user.is_active:
                return jsonify(error="Account unavailable"), 401
            if roles and user.role not in roles:
                return jsonify(error="You do not have permission for this action"), 403
            return fn(user, *a, **kw)
        return wrapper
    return deco
