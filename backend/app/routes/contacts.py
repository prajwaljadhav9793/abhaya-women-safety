from flask import Blueprint, request, jsonify
from extensions import db
from app.models import EmergencyContact
from app.utils import EMAIL_RE, PHONE_RE, clean_phone, login_required

bp = Blueprint("contacts", __name__)
MAX_CONTACTS = 5

def _own(user, cid):  # ownership check: object is looked up by id AND user
    return EmergencyContact.query.filter_by(id=cid, user_id=user.id).first()

def _apply(c, d, partial=False):
    errors = {}
    if not partial or "name" in d:
        if len((d.get("name") or "").strip()) < 2: errors["name"] = "Name required"
        else: c.name = d["name"].strip()
    if not partial or "phone" in d:
        p = clean_phone(d.get("phone"))
        if not PHONE_RE.match(p): errors["phone"] = "Invalid phone number"
        else: c.phone = p
    if d.get("email"):
        if not EMAIL_RE.match(d["email"]): errors["email"] = "Invalid email"
        else: c.email = d["email"].strip().lower()
    for f in ("relationship",):
        if f in d: setattr(c, f, (d[f] or "")[:60])
    for f in ("notify_on_sos", "notify_on_journey"):
        if f in d: setattr(c, f, bool(d[f]))
    if "priority" in d:
        try: c.priority = max(1, min(int(d["priority"]), 10))
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
    errors = _apply(c, request.get_json(silent=True) or {})
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
    errors = _apply(c, request.get_json(silent=True) or {}, partial=True)
    if errors: return jsonify(error="Validation failed", fields=errors), 422
    db.session.commit(); return jsonify(contact=c.to_dict())

@bp.delete("/contacts/<int:cid>")
@login_required()
def delete_contact(user, cid):
    c = _own(user, cid)
    if not c: return jsonify(error="Contact not found"), 404
    db.session.delete(c); db.session.commit()
    return jsonify(message="Contact deleted")
