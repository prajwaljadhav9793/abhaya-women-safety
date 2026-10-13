import os
import uuid
from flask import Blueprint, request, jsonify, current_app, send_file
from flask_jwt_extended import create_access_token
from sqlalchemy.exc import IntegrityError
from extensions import db, limiter
from app.models import User, OfficerProfile
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
    if "full_name" in d and len(d["full_name"].strip()) >= 2:
        user.full_name = d["full_name"].strip()
    if "phone" in d:
        p = clean_phone(d["phone"])
        if p and p != user.phone:
            existing = User.query.filter(User.phone == p, User.id != user.id).first()
            if existing:
                return jsonify(error="This mobile number is already registered to another account"), 409
            user.phone = p
    if "location_sharing_enabled" in d:
        user.location_sharing_enabled = bool(d["location_sharing_enabled"])
    if d.get("preferred_language") in ("en", "hi", "mr"):
        user.preferred_language = d["preferred_language"]
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

@bp.post("/auth/register-officer")
@bp.post("/admin/register-officer")
@limiter.limit("15 per hour")
def register_officer():
    # Support both multipart form data (with file upload) and json
    if request.content_type and "multipart/form-data" in request.content_type:
        d = request.form
        file = request.files.get("id_proof_file")
    else:
        d = request.get_json(silent=True) or {}
        file = None

    name = (d.get("full_name") or "").strip()
    email = (d.get("email") or "").strip().lower()
    phone = clean_phone(d.get("phone"))
    password = d.get("password") or ""
    confirm_pw = d.get("confirm_password") or password
    
    badge_number = (d.get("badge_number") or "").strip()
    id_proof_type = (d.get("id_proof_type") or "Police Warrant Card / Service ID").strip()
    id_proof_number = (d.get("id_proof_number") or "").strip()
    department = (d.get("department") or "Jurisdictional Police Precinct").strip()
    designation = (d.get("designation") or "Duty Police Officer").strip()

    errors = {}
    if len(name) < 2: errors["full_name"] = "Enter officer full name"
    if not EMAIL_RE.match(email): errors["email"] = "Enter a valid official email"
    if not PHONE_RE.match(phone): errors["phone"] = "Enter a valid mobile number (10-15 digits)"
    if not valid_password(password): errors["password"] = "Min 8 characters with letters & numbers"
    if password != confirm_pw: errors["confirm_password"] = "Passwords do not match"

    # Strict ID Proof requirements
    if len(badge_number) < 2: errors["badge_number"] = "Officer badge or service ID number is required"
    if len(id_proof_number) < 3: errors["id_proof_number"] = "Official ID proof credential number is required"
    if len(department) < 2: errors["department"] = "Department or police precinct name is required"

    # Validate uploaded ID proof file if provided
    stored_filename = None
    orig_filename = None
    if file and file.filename:
        ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
        if ext not in ("pdf", "png", "jpg", "jpeg", "webp"):
            errors["id_proof_file"] = "Allowed ID proof formats: PDF, PNG, JPG, JPEG"
        else:
            file_data = file.read()
            if len(file_data) > 10 * 1024 * 1024:
                errors["id_proof_file"] = "File size must be under 10 MB"
            else:
                stored_filename = f"officer_id_{uuid.uuid4().hex[:12]}.{ext}"
                upload_dir = current_app.config.get("UPLOAD_DIR", "uploads")
                os.makedirs(upload_dir, exist_ok=True)
                with open(os.path.join(upload_dir, stored_filename), "wb") as f_out:
                    f_out.write(file_data)
                orig_filename = file.filename[:255]

    if errors:
        return jsonify(error="Validation failed", fields=errors), 422

    if User.query.filter((User.email == email) | (User.phone == phone)).first():
        return jsonify(error="An account with this email or phone already exists"), 409

    # Create authorized officer user
    u = User(full_name=name, email=email, phone=phone, role="admin", is_active=True)
    u.set_password(password)
    db.session.add(u)
    db.session.flush()

    prof = OfficerProfile(
        user_id=u.id,
        badge_number=badge_number,
        id_proof_type=id_proof_type,
        id_proof_number=id_proof_number,
        id_proof_filename=stored_filename,
        id_proof_original_name=orig_filename,
        department=department,
        designation=designation,
        verified=True
    )
    db.session.add(prof)

    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify(error="An account with these credentials already exists"), 409

    token = create_access_token(identity=str(u.id))
    return jsonify(
        token=token,
        user=u.to_dict(),
        message="Official law enforcement account successfully provisioned with ID proof."
    ), 201

@bp.get("/admin/officers/<int:uid>/id-proof")
@login_required(["admin"])
def view_officer_id_proof(admin_user, uid):
    prof = OfficerProfile.query.filter_by(user_id=uid).first()
    if not prof or not prof.id_proof_filename:
        return jsonify(error="No physical ID proof document uploaded for this officer profile"), 404
    upload_dir = current_app.config.get("UPLOAD_DIR", "uploads")
    file_path = os.path.join(upload_dir, prof.id_proof_filename)
    if not os.path.exists(file_path):
        return jsonify(error="ID proof file not found in repository"), 404
    return send_file(file_path, download_name=prof.id_proof_original_name or "officer_id_proof", as_attachment=False)

