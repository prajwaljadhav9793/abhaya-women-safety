from flask import Blueprint, request, jsonify
from extensions import db
from app.models import EmergencyContact
from app.utils import is_valid_email, PHONE_RE, login_required

bp = Blueprint("contacts", __name__)
MAX_CONTACTS = 5

def _own(user, cid):  # ownership check: object is looked up by id AND user
    return EmergencyContact.query.filter_by(id=cid, user_id=user.id).first()

def _apply(c, d, partial=False):
    errors = {}
    if not partial or "name" in d:
        name = d.get("name")
        if not isinstance(name, str) or len(name.strip()) < 2: errors["name"] = "Name required"
        else: c.name = name.strip()
    if not partial or "phone" in d:
        raw_phone = d.get("phone")
        p = raw_phone.strip() if isinstance(raw_phone, str) else ""
        if not PHONE_RE.fullmatch(p): errors["phone"] = "Enter a valid 10-digit mobile number"
        else: c.phone = p
    email = d.get("email")
    if email not in (None, ""):
        if not is_valid_email(email): errors["email"] = "Invalid email or email domain spelling"
        else: c.email = email.strip().lower()
    for f in ("relationship",):
        if f in d:
            value = d[f]
            if value is not None and not isinstance(value, str):
                errors[f] = "Relationship must be text"
            else:
                setattr(c, f, (value or "")[:60])
    for f in ("notify_on_sos", "notify_on_journey"):
        if f in d:
            if not isinstance(d[f], bool): errors[f] = "Value must be true or false"
            else: setattr(c, f, d[f])
    if "priority" in d:
        try:
            if isinstance(d["priority"], bool): raise ValueError
            priority = int(d["priority"])
            if isinstance(d["priority"], float) and d["priority"] != priority: raise ValueError
            c.priority = max(1, min(priority, 10))
        except (TypeError, ValueError): errors["priority"] = "Priority must be a number"
    return errors

@bp.get("/contacts")
@login_required()
def list_contacts(user):
    cs = EmergencyContact.query.filter_by(user_id=user.id).order_by(EmergencyContact.priority).all()
    return jsonify(contacts=[c.to_dict() for c in cs])

@bp.post("/contacts")
@login_required()
def add_contact(user):
    if EmergencyContact.query.filter_by(user_id=user.id).count() >= MAX_CONTACTS:
        return jsonify(error=f"You can add up to {MAX_CONTACTS} contacts"), 400
    c = EmergencyContact(user_id=user.id)
    data = request.get_json(silent=True) or {}
    if not isinstance(data, dict):
        return jsonify(error="Expected a JSON object"), 422
    errors = _apply(c, data)
    if errors: return jsonify(error="Validation failed", fields=errors), 422
    if EmergencyContact.query.filter_by(user_id=user.id, phone=c.phone).first():
        return jsonify(error="This number is already a contact"), 409
    db.session.add(c); db.session.commit()
    return jsonify(contact=c.to_dict()), 201

@bp.put("/contacts/<int:cid>")
@login_required()
def edit_contact(user, cid):
    c = _own(user, cid)
    if not c: return jsonify(error="Contact not found"), 404
    data = request.get_json(silent=True) or {}
    if not isinstance(data, dict):
        return jsonify(error="Expected a JSON object"), 422
    errors = _apply(c, data, partial=True)
    if errors: return jsonify(error="Validation failed", fields=errors), 422
    db.session.commit(); return jsonify(contact=c.to_dict())

@bp.delete("/contacts/<int:cid>")
@login_required()
def delete_contact(user, cid):
    c = _own(user, cid)
    if not c: return jsonify(error="Contact not found"), 404
    db.session.delete(c); db.session.commit()
    return jsonify(message="Contact deleted")
