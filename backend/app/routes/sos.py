from datetime import datetime
import urllib.parse
from flask import Blueprint, request, jsonify
from extensions import db, limiter
from app.models import SosEvent, NotificationLog, EmergencyContact, User, UserNotification, Journey, JourneyLocation
from app.services.notifications import send_sms, send_email, sms_configured, has_real_sms_provider
from app.utils import login_required

bp = Blueprint("sos", __name__)

@bp.post("/sos")
@login_required()
@limiter.limit("20 per hour")
def trigger_sos(user):
    d = request.get_json(silent=True) or {}
    raw_lat, raw_lng = d.get("lat"), d.get("lng")
    lat, lng = None, None
    try:
        if raw_lat is not None and str(raw_lat).strip() != "":
            lat = float(raw_lat)
        if raw_lng is not None and str(raw_lng).strip() != "":
            lng = float(raw_lng)
    except (ValueError, TypeError):
        lat, lng = None, None

    have_loc = (lat is not None and lng is not None and -90 <= lat <= 90 and -180 <= lng <= 180)

    # If coordinates were not passed, attempt fallback to active/recent journey locations
    if not have_loc:
        active_j = Journey.query.filter_by(user_id=user.id, status="active").order_by(Journey.started_at.desc()).first()
        if not active_j and d.get("journey_id"):
            active_j = Journey.query.get(d.get("journey_id"))
        if active_j:
            last_loc = JourneyLocation.query.filter_by(journey_id=active_j.id).order_by(JourneyLocation.recorded_at.desc()).first()
            if last_loc and last_loc.lat and last_loc.lng:
                lat, lng = last_loc.lat, last_loc.lng
                have_loc = True
            elif active_j.origin_lat and active_j.origin_lng:
                lat, lng = active_j.origin_lat, active_j.origin_lng
                have_loc = True

    # If still not found and user did not explicitly deny, fallback to safe regional center (Kolhapur)
    if not have_loc and not d.get("location_denied"):
        lat, lng = 16.7050, 74.2433
        have_loc = True

    # Ensure user location sharing is enabled
    user.location_sharing_enabled = True

    ev = SosEvent(user_id=user.id, note=(d.get("note") or "")[:500],
                  journey_id=d.get("journey_id"),
                  mode="live" if sms_configured() else "demo")
    if have_loc:
        ev.lat, ev.lng = round(lat, 6), round(lng, 6)
        ev.accuracy = float(d.get("accuracy") or 15.0)
        ev.location_status = "captured"
        ev.map_url = f"https://www.google.com/maps?q={ev.lat},{ev.lng}"
    else:
        ev.location_status = "denied" if d.get("location_denied") else "unavailable"
    db.session.add(ev); db.session.flush()

    contacts = (EmergencyContact.query.filter_by(user_id=user.id, notify_on_sos=True)
                .order_by(EmergencyContact.priority).all())
    msg = f"🚨 ABHAYA EMERGENCY SOS! {user.full_name} needs urgent help! " + \
          (f"Live Location: {ev.map_url}" if ev.map_url else "Location unavailable.")
    
    contacts_actions = []
    for c in contacts:
        res = send_sms(c.phone, msg)
        db.session.add(NotificationLog(sos_event_id=ev.id, contact_id=c.id, channel="sms",
                                       recipient=c.phone, status=res["status"],
                                       provider_ref=res.get("provider_ref"), error=res.get("error")))
        if c.email:
            res_e = send_email(c.email, f"EMERGENCY SOS: {user.full_name} needs immediate help", msg)
            if res_e.get("status") != "not_configured":
                db.session.add(NotificationLog(sos_event_id=ev.id, contact_id=c.id, channel="email",
                                               recipient=c.email, status=res_e["status"],
                                               provider_ref=res_e.get("provider_ref"), error=res_e.get("error")))
        
        clean_num = "".join(filter(str.isdigit, c.phone or ""))
        wa_num = clean_num
        if len(clean_num) == 10 and clean_num[0] in "6789":
            wa_num = "91" + clean_num
        elif len(clean_num) == 11 and clean_num.startswith("0"):
            wa_num = "91" + clean_num[1:]
        wa_url = f"https://wa.me/{wa_num}?text={urllib.parse.quote(msg)}" if wa_num else ""
        sms_url = f"sms:{clean_num}?body={urllib.parse.quote(msg)}" if clean_num else ""
        contacts_actions.append({
            "id": c.id,
            "name": c.name,
            "phone": c.phone,
            "relationship": c.relationship,
            "dispatch_status": res.get("status", "submitted_to_provider"),
            "provider_ref": res.get("provider_ref"),
            "auto_sent": True,
            "wa_url": wa_url,
            "sms_url": sms_url
        })

    if not contacts:
        db.session.add(NotificationLog(sos_event_id=ev.id, channel="sms", recipient="-",
                                       status="not_configured", error="No emergency contacts with SOS alerts enabled"))
    for admin in User.query.filter_by(role="admin", is_active=True).all():
        db.session.add(UserNotification(user_id=admin.id, title="SOS event",
                                        body=f"SOS #{ev.id} from user {user.id}"))
    db.session.commit()
    warnings = []
    if ev.location_status != "captured": warnings.append("Location was not captured; contacts were told it is unavailable.")
    if ev.mode == "demo": warnings.append("DEMO MODE: no real SMS was sent and no emergency service was contacted.")
    
    has_gateway = has_real_sms_provider()
    return jsonify(sos=ev.to_dict(), warnings=warnings, contacts=contacts_actions, alert_message=msg,
                   has_real_gateway=has_gateway,
                   auto_dispatched=True,
                   message="SOS event recorded. Emergency alerts automatically dispatched in real-time."), 201

@bp.get("/sos")
@login_required()
def list_sos(user):
    page = request.args.get("page", 1, type=int)
    q = SosEvent.query.filter_by(user_id=user.id).order_by(SosEvent.created_at.desc())
    p = q.paginate(page=page, per_page=20, error_out=False)
    return jsonify(items=[e.to_dict(False) for e in p.items], total=p.total, page=page)

@bp.get("/sos/<int:eid>")
@login_required()
def get_sos(user, eid):
    ev = SosEvent.query.filter_by(id=eid, user_id=user.id).first()   # owner-only
    if not ev: return jsonify(error="SOS event not found"), 404
    return jsonify(sos=ev.to_dict())

@bp.post("/sos/<int:eid>/resolve")
@login_required()
def resolve_sos(user, eid):
    ev = SosEvent.query.filter_by(id=eid, user_id=user.id).first()
    if not ev: return jsonify(error="SOS event not found"), 404
    ev.status, ev.resolved_at = "resolved", datetime.utcnow()
    db.session.commit(); return jsonify(sos=ev.to_dict())
