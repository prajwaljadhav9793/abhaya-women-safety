import re
from functools import wraps
from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from app.models import User

EMAIL_RE = re.compile(
    r"^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*"
    r"@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+com$",
    re.IGNORECASE,
)
PHONE_RE = re.compile(r"^\d{10}$")
COMMON_EMAIL_DOMAINS = (
    "gmail.com",
    "yahoo.com",
    "outlook.com",
    "hotmail.com",
    "icloud.com",
    "live.com",
    "protonmail.com",
)

def clean_phone(p): return re.sub(r"[\s\-()]", "", p) if isinstance(p, str) else ""
def valid_password(p): return isinstance(p, str) and len(p) >= 8 and re.search(r"[A-Za-z]", p) and re.search(r"\d", p)

def _within_one_domain_typo(value, expected):
    if abs(len(value) - len(expected)) > 1:
        return False

    i = j = edits = 0
    while i < len(value) and j < len(expected):
        if value[i] == expected[j]:
            i += 1
            j += 1
            continue

        edits += 1
        if edits > 1:
            return False
        if (i + 1 < len(value) and j + 1 < len(expected)
                and value[i] == expected[j + 1] and value[i + 1] == expected[j]):
            i += 2
            j += 2
        elif len(value) == len(expected):
            i += 1
            j += 1
        elif len(value) > len(expected):
            i += 1
        else:
            j += 1

    return edits + (len(value) - i) + (len(expected) - j) <= 1

def is_valid_email(value):
    if not isinstance(value, str) or not EMAIL_RE.fullmatch(value.strip()):
        return False
    domain = value.strip().rsplit("@", 1)[1].lower()
    if domain.endswith(".com.com") or any(
        known_domain[:-4] in domain
        for known_domain in COMMON_EMAIL_DOMAINS
        if domain != known_domain
    ):
        return False
    return not any(
        domain != known_domain and _within_one_domain_typo(domain, known_domain)
        for known_domain in COMMON_EMAIL_DOMAINS
    )

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
