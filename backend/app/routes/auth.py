from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token
from sqlalchemy.exc import IntegrityError
from extensions import db, limiter
from app.models import User
from app.utils import EMAIL_RE, PHONE_RE, clean_phone, valid_password, login_required

bp = Blueprint("auth", __name__)

@bp.post("/auth/register")
@limiter.limit("10 per hour")
def register():
    d = request.get_json(silent=True) or {}
    name = (d.get("full_name") or "").strip()
    email = (d.get("email") or "").strip().lower()
    phone = clean_phone(d.get("phone"))
    errors = {}
    if len(name) < 2: errors["full_name"] = "Enter your full name"
    if not EMAIL_RE.match(email): errors["email"] = "Enter a valid email"
    if not PHONE_RE.match(phone): errors["phone"] = "Enter a valid mobile number (10-15 digits)"
    if not valid_password(d.get("password")): errors["password"] = "Min 8 characters with letters and numbers"
    if d.get("password") != d.get("confirm_password"): errors["confirm_password"] = "Passwords do not match"
    if errors: return jsonify(error="Validation failed", fields=errors), 422
    if User.query.filter((User.email == email) | (User.phone == phone)).first():
        return jsonify(error="An account with this email or phone already exists"), 409
    u = User(full_name=name, email=email, phone=phone, role="user")  # role never from client
    u.set_password(d["password"])
    db.session.add(u)
    try: db.session.commit()
    except IntegrityError:
        db.session.rollback(); return jsonify(error="Account already exists"), 409
    return jsonify(user=u.to_dict()), 201

@bp.post("/auth/login")
@limiter.limit("15 per minute")
def login():
    d = request.get_json(silent=True) or {}
    ident = (d.get("identifier") or "").strip().lower()
    u = User.query.filter((User.email == ident) | (User.phone == clean_phone(ident))).first()
    if not u or not u.check_password(d.get("password") or ""):
        return jsonify(error="Invalid credentials"), 401
    if not u.is_active: return jsonify(error="This account is deactivated"), 403
    return jsonify(token=create_access_token(identity=str(u.id)), user=u.to_dict())

@bp.get("/auth/me")
@login_required()
def me(user): return jsonify(user=user.to_dict())

@bp.put("/auth/profile")
@login_required()
def update_profile(user):
    d = request.get_json(silent=True) or {}
    if "full_name" in d and len(d["full_name"].strip()) >= 2: user.full_name = d["full_name"].strip()
    if "location_sharing_enabled" in d: user.location_sharing_enabled = bool(d["location_sharing_enabled"])
    if d.get("preferred_language") in ("en", "hi", "mr"): user.preferred_language = d["preferred_language"]
    db.session.commit()
    return jsonify(user=user.to_dict())

@bp.post("/auth/change-password")
@login_required()
@limiter.limit("5 per hour")
def change_password(user):
    d = request.get_json(silent=True) or {}
    if not user.check_password(d.get("current_password") or ""):
        return jsonify(error="Current password is incorrect"), 403
    if not valid_password(d.get("new_password")):
        return jsonify(error="Min 8 characters with letters and numbers"), 422
    user.set_password(d["new_password"]); db.session.commit()
    return jsonify(message="Password updated")
