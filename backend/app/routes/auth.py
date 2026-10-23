import os
import uuid
from flask import Blueprint, request, jsonify, current_app, send_file
from flask_jwt_extended import create_access_token
from sqlalchemy.exc import IntegrityError
from extensions import db, limiter
from app.models import User, OfficerProfile, UserMedicalProfile
from app.utils import is_valid_email, PHONE_RE, clean_phone, valid_password, login_required

import re

bp = Blueprint("auth", __name__)

def find_user_by_identifier(ident):
    """
    Robust user lookup supporting:
    - Case-insensitive email
    - Cleaned mobile number
    - Multi-format prefixes (+91, 91, 0, or raw 10 digits)
    - 10-digit suffix matching
    """
    ident = (ident or "").strip()
    if not ident:
        return None
        
    ident_lower = ident.lower()
    
    # 1. Fast match: Case-insensitive email
    u = User.query.filter(db.func.lower(User.email) == ident_lower).first()
    if u:
        return u
        
    # 2. Direct cleaned phone
    cleaned = clean_phone(ident)
    if cleaned:
        u = User.query.filter(User.phone == cleaned).first()
        if u:
            return u
            
    # 3. Numeric variations for mobile numbers
    digits = re.sub(r"\D", "", ident)
    if digits:
        candidates = {ident, cleaned, digits}
        if len(digits) >= 10:
            p10 = digits[-10:]
            candidates.update([p10, f"+91{p10}", f"91{p10}", f"0{p10}"])
            
        u = User.query.filter(User.phone.in_(list(candidates))).first()
        if u:
            return u
            
        if len(digits) >= 10:
            p10 = digits[-10:]
            u = User.query.filter(User.phone.endswith(p10)).first()
            if u:
                return u
    return None

@bp.post("/auth/register")
@limiter.limit("20 per hour")
def register():
    d = request.get_json(silent=True) or {}
    if not isinstance(d, dict): d = {}
    raw_name = d.get("full_name")
    raw_email = d.get("email")
    name = raw_name.strip() if isinstance(raw_name, str) else ""
    email = raw_email.strip().lower() if isinstance(raw_email, str) else ""
    raw_phone = d.get("phone")
    phone = raw_phone.strip() if isinstance(raw_phone, str) else ""
    raw_pw = d.get("password") if isinstance(d.get("password"), str) else ""
    confirm_pw = d.get("confirm_password") if isinstance(d.get("confirm_password"), str) else ""

    errors = {}
    if len(name) < 2: errors["full_name"] = "Enter your full name"
    if not is_valid_email(email): errors["email"] = "Enter a valid email address and check the domain spelling"
    if not PHONE_RE.fullmatch(phone): errors["phone"] = "Enter a valid 10-digit mobile number"
    if not valid_password(raw_pw): errors["password"] = "Min 8 characters with letters and numbers"
    if raw_pw != confirm_pw: errors["confirm_password"] = "Passwords do not match"
    if errors: return jsonify(error="Validation failed", fields=errors), 422

    if find_user_by_identifier(email) or find_user_by_identifier(phone):
        return jsonify(error="An account with this email or mobile number already exists"), 409

    u = User(full_name=name, email=email, phone=phone, role="user")  # role never from client
    u.set_password(raw_pw)
    db.session.add(u)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify(error="An account with this email or mobile number already exists"), 409

    token = create_access_token(identity=str(u.id))
    return jsonify(
        token=token,
        user=u.to_dict(),
        message="Account created successfully"
    ), 201

@bp.post("/auth/login")
@limiter.limit("25 per minute")
def login():
    d = request.get_json(silent=True) or {}
    if not isinstance(d, dict): d = {}
    raw_ident = d.get("identifier")
    ident = raw_ident.strip() if isinstance(raw_ident, str) else ""
    raw_pw = d.get("password") if isinstance(d.get("password"), str) else ""
    pw_strip = raw_pw.strip()

    if not ident:
        return jsonify(error="Please enter your email or mobile number"), 422
    if not raw_pw:
        return jsonify(error="Please enter your password"), 422

    u = find_user_by_identifier(ident)
    if not u:
        return jsonify(error="Account not found. Please verify your email or mobile number, or create a new account."), 401

    if not u.check_password(raw_pw) and not u.check_password(pw_strip):
        return jsonify(error="Incorrect password. Please verify your password or use Reset Password below."), 401

    if not u.is_active:
        return jsonify(error="This account is deactivated"), 403

    return jsonify(token=create_access_token(identity=str(u.id)), user=u.to_dict())

@bp.post("/auth/reset-password")
@limiter.limit("10 per hour")
def reset_password():
    d = request.get_json(silent=True) or {}
    if not isinstance(d, dict): d = {}
    raw_ident = d.get("identifier")
    ident = raw_ident.strip() if isinstance(raw_ident, str) else ""
    new_pw = d.get("new_password") if isinstance(d.get("new_password"), str) else ""
    confirm_pw = d.get("confirm_password", new_pw)
    if not isinstance(confirm_pw, str): confirm_pw = ""

    if not ident:
        return jsonify(error="Please provide your registered email or mobile number"), 422
    if not valid_password(new_pw):
        return jsonify(error="Password must be at least 8 characters with letters and numbers"), 422
    if new_pw != confirm_pw:
        return jsonify(error="Passwords do not match"), 422

    u = find_user_by_identifier(ident)
    if not u:
        return jsonify(error="No account found with this email or mobile number"), 404

    u.set_password(new_pw)
    db.session.commit()

    token = create_access_token(identity=str(u.id))
    return jsonify(
        token=token,
        user=u.to_dict(),
        message="Password updated successfully. You are now logged in."
    ), 200

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
        raw_phone = d["phone"]
        p = raw_phone.strip() if isinstance(raw_phone, str) else ""
        if p == user.phone:
            p = ""
        elif not PHONE_RE.fullmatch(p):
            return jsonify(error="Enter a valid 10-digit mobile number"), 422
        if p and p != user.phone:
            existing = User.query.filter(User.phone == p, User.id != user.id).first()
            if existing:
                return jsonify(error="This mobile number is already registered to another account"), 409
            user.phone = p
    if "location_sharing_enabled" in d:
        user.location_sharing_enabled = bool(d["location_sharing_enabled"])
    if d.get("preferred_language") in ("en", "hi", "mr"):
        user.preferred_language = d["preferred_language"]

    # Also sync ICE / Medical emergency profile if passed
    med_keys = ["blood_group", "allergies", "medical_notes", "home_city", "emergency_hospital", "emergency_contact_phone", "auto_siren_enabled", "auto_whatsapp_enabled"]
    if any(k in d for k in med_keys):
        med = UserMedicalProfile.query.filter_by(user_id=user.id).first()
        if not med:
            med = UserMedicalProfile(user_id=user.id)
            db.session.add(med)
        if "blood_group" in d: med.blood_group = (d["blood_group"] or "B+")[:10]
        if "allergies" in d: med.allergies = (d["allergies"] or "")[:255]
        if "medical_notes" in d: med.medical_notes = d["medical_notes"] or ""
        if "home_city" in d: med.home_city = (d["home_city"] or "")[:120]
        if "emergency_hospital" in d: med.emergency_hospital = (d["emergency_hospital"] or "")[:150]
        if "emergency_contact_phone" in d: med.emergency_contact_phone = (d["emergency_contact_phone"] or "")[:20]
        if "auto_siren_enabled" in d: med.auto_siren_enabled = bool(d["auto_siren_enabled"])
        if "auto_whatsapp_enabled" in d: med.auto_whatsapp_enabled = bool(d["auto_whatsapp_enabled"])

    db.session.commit()
    return jsonify(user=user.to_dict())

@bp.get("/user/medical-profile")
@login_required()
def get_medical_profile(user):
    prof = UserMedicalProfile.query.filter_by(user_id=user.id).first()
    if not prof:
        prof = UserMedicalProfile(user_id=user.id)
        db.session.add(prof)
        db.session.commit()
    return jsonify(medical_profile=prof.to_dict())

@bp.put("/user/medical-profile")
@login_required()
def update_medical_profile(user):
    d = request.get_json(silent=True) or {}
    prof = UserMedicalProfile.query.filter_by(user_id=user.id).first()
    if not prof:
        prof = UserMedicalProfile(user_id=user.id)
        db.session.add(prof)
    if "blood_group" in d: prof.blood_group = (d["blood_group"] or "B+")[:10]
    if "allergies" in d: prof.allergies = (d["allergies"] or "")[:255]
    if "medical_notes" in d: prof.medical_notes = d["medical_notes"] or ""
    if "home_city" in d: prof.home_city = (d["home_city"] or "")[:120]
    if "emergency_hospital" in d: prof.emergency_hospital = (d["emergency_hospital"] or "")[:150]
    if "emergency_contact_phone" in d: prof.emergency_contact_phone = (d["emergency_contact_phone"] or "")[:20]
    if "auto_siren_enabled" in d: prof.auto_siren_enabled = bool(d["auto_siren_enabled"])
    if "auto_whatsapp_enabled" in d: prof.auto_whatsapp_enabled = bool(d["auto_whatsapp_enabled"])
    db.session.commit()
    return jsonify(medical_profile=prof.to_dict(), user=user.to_dict())

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
    raw_phone = d.get("phone")
    phone = raw_phone.strip() if isinstance(raw_phone, str) else ""
    password = d.get("password") or ""
    confirm_pw = d.get("confirm_password") or password
    
    badge_number = (d.get("badge_number") or "").strip()
    id_proof_type = (d.get("id_proof_type") or "Police Warrant Card / Service ID").strip()
    id_proof_number = (d.get("id_proof_number") or "").strip()
    department = (d.get("department") or "Jurisdictional Police Precinct").strip()
    designation = (d.get("designation") or "Duty Police Officer").strip()

    errors = {}
    if len(name) < 2: errors["full_name"] = "Enter officer full name"
    if not is_valid_email(email): errors["email"] = "Enter a valid official email and check the domain spelling"
    if not PHONE_RE.fullmatch(phone): errors["phone"] = "Enter a valid 10-digit mobile number"
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
