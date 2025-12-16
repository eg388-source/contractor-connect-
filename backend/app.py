from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import timedelta

from config import Config
from models import db, User, Lead, Note, Notification
from notifications import try_send_notification

STAGES = ["New", "Contacted", "Booked", "Estimate Sent", "Closed Won", "Closed Lost"]

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    CORS(app)
    db.init_app(app)
    JWTManager(app)

    with app.app_context():
        db.create_all()

    @app.get("/api/health")
    def health():
        return {"status": "ok"}

    # ---------- AUTH ----------
    @app.post("/api/auth/register")
    def register():
        data = request.get_json() or {}
        name = (data.get("name") or "").strip()
        email = (data.get("email") or "").strip().lower()
        password = data.get("password") or ""

        if not name or not email or not password:
            return jsonify({"error": "Missing name/email/password"}), 400
        if User.query.filter_by(email=email).first():
            return jsonify({"error": "Email already in use"}), 409

        user = User(name=name, email=email, password_hash=generate_password_hash(password))
        db.session.add(user)
        db.session.commit()
        return jsonify({"message": "Registered successfully"}), 201

    @app.post("/api/auth/login")
    def login():
        data = request.get_json() or {}
        email = (data.get("email") or "").strip().lower()
        password = data.get("password") or ""

        user = User.query.filter_by(email=email).first()
        if not user or not check_password_hash(user.password_hash, password):
            return jsonify({"error": "Invalid credentials"}), 401

        token = create_access_token(identity=str(user.id), expires_delta=timedelta(days=3))
        return jsonify({"access_token": token, "user": {"id": user.id, "name": user.name, "email": user.email}})

    # ---------- LEADS CRUD ----------
    @app.get("/api/leads")
    @jwt_required()
    def list_leads():
        uid = int(get_jwt_identity())
        stage = request.args.get("stage")
        q = Lead.query.filter_by(user_id=uid)
        if stage:
            q = q.filter_by(stage=stage)
        leads = q.order_by(Lead.created_at.desc()).all()
        return jsonify([serialize_lead(l) for l in leads])

    @app.post("/api/leads")
    @jwt_required()
    def create_lead():
        uid = int(get_jwt_identity())
        data = request.get_json() or {}

        full_name = (data.get("full_name") or "").strip()
        if not full_name:
            return jsonify({"error": "full_name is required"}), 400

        stage = data.get("stage") or "New"
        if stage not in STAGES:
            stage = "New"

        lead = Lead(
            user_id=uid,
            full_name=full_name,
            phone=(data.get("phone") or "").strip() or None,
            email=(data.get("email") or "").strip() or None,
            address=(data.get("address") or "").strip() or None,
            city=(data.get("city") or "").strip() or None,
            state=(data.get("state") or "").strip() or None,
            stage=stage,
            estimated_value=float(data.get("estimated_value") or 0),
            appointment_datetime=(data.get("appointment_datetime") or "").strip() or None
        )
        db.session.add(lead)
        db.session.commit()
        return jsonify(serialize_lead(lead)), 201

    @app.get("/api/leads/<int:lead_id>")
    @jwt_required()
    def get_lead(lead_id):
        uid = int(get_jwt_identity())
        lead = Lead.query.filter_by(id=lead_id, user_id=uid).first()
        if not lead:
            return jsonify({"error": "Not found"}), 404

        notes = Note.query.filter_by(lead_id=lead.id, user_id=uid).order_by(Note.created_at.desc()).all()
        payload = serialize_lead(lead)
        payload["notes"] = [serialize_note(n) for n in notes]
        return jsonify(payload)

    @app.put("/api/leads/<int:lead_id>")
    @jwt_required()
    def update_lead(lead_id):
        uid = int(get_jwt_identity())
        lead = Lead.query.filter_by(id=lead_id, user_id=uid).first()
        if not lead:
            return jsonify({"error": "Not found"}), 404

        data = request.get_json() or {}
        old_stage = lead.stage

        for field in ["full_name", "phone", "email", "address", "city", "state", "appointment_datetime"]:
            if field in data:
                val = (data.get(field) or "").strip()
                setattr(lead, field, val or None)

        if "estimated_value" in data:
            lead.estimated_value = float(data.get("estimated_value") or 0)

        if "stage" in data:
            s = data.get("stage")
            if s in STAGES:
                lead.stage = s

        db.session.commit()

        # Trigger notification when moved to Booked
        if old_stage != "Booked" and lead.stage == "Booked":
            auto_notify_on_booked(uid, lead)

        return jsonify(serialize_lead(lead))

    @app.delete("/api/leads/<int:lead_id>")
    @jwt_required()
    def delete_lead(lead_id):
        uid = int(get_jwt_identity())
        lead = Lead.query.filter_by(id=lead_id, user_id=uid).first()
        if not lead:
            return jsonify({"error": "Not found"}), 404

        Note.query.filter_by(lead_id=lead.id, user_id=uid).delete()
        Notification.query.filter_by(lead_id=lead.id, user_id=uid).delete()
        db.session.delete(lead)
        db.session.commit()
        return jsonify({"message": "Deleted"})

    # ---------- NOTES ----------
    @app.post("/api/leads/<int:lead_id>/notes")
    @jwt_required()
    def add_note(lead_id):
        uid = int(get_jwt_identity())
        lead = Lead.query.filter_by(id=lead_id, user_id=uid).first()
        if not lead:
            return jsonify({"error": "Not found"}), 404

        data = request.get_json() or {}
        text = (data.get("note_text") or "").strip()
        if not text:
            return jsonify({"error": "note_text required"}), 400

        note = Note(lead_id=lead.id, user_id=uid, note_text=text)
        db.session.add(note)
        db.session.commit()
        return jsonify(serialize_note(note)), 201

    # ---------- NOTIFICATIONS (manual send + logs) ----------
    @app.post("/api/notifications/send")
    @jwt_required()
    def send_notification():
        uid = int(get_jwt_identity())
        data = request.get_json() or {}
        channel = (data.get("channel") or "").lower().strip()
        to_value = (data.get("to_value") or "").strip()
        subject = (data.get("subject") or "").strip() or None
        message = (data.get("message") or "").strip()
        lead_id = data.get("lead_id")

        if channel not in ["email", "sms"]:
            return jsonify({"error": "channel must be email or sms"}), 400
        if not to_value or not message:
            return jsonify({"error": "to_value and message are required"}), 400

        status, provider_resp = try_send_notification(app.config, channel, to_value, subject or "ContractorConnect Notification", message)

        notif = Notification(
            user_id=uid,
            lead_id=lead_id,
            channel=channel,
            to_value=to_value,
            subject=subject,
            message=message,
            status=status,
            provider_response=provider_resp
        )
        db.session.add(notif)
        db.session.commit()
        return jsonify(serialize_notification(notif))

    @app.get("/api/notifications")
    @jwt_required()
    def list_notifications():
        uid = int(get_jwt_identity())
        notifs = Notification.query.filter_by(user_id=uid).order_by(Notification.created_at.desc()).limit(100).all()
        return jsonify([serialize_notification(n) for n in notifs])

    # ---------- DASHBOARD ----------
    @app.get("/api/dashboard")
    @jwt_required()
    def dashboard():
        uid = int(get_jwt_identity())
        leads = Lead.query.filter_by(user_id=uid).all()

        total = len(leads)
        pipeline_value = sum((l.estimated_value or 0) for l in leads if l.stage != "Closed Lost")
        by_stage = {s: 0 for s in STAGES}
        for l in leads:
            by_stage[l.stage] = by_stage.get(l.stage, 0) + 1

        upcoming = [serialize_lead(l) for l in leads if l.appointment_datetime]
        upcoming = sorted(upcoming, key=lambda x: x["appointment_datetime"])[:10]

        return jsonify({
            "total_leads": total,
            "pipeline_value": pipeline_value,
            "by_stage": by_stage,
            "upcoming": upcoming
        })

    return app

def auto_notify_on_booked(uid: int, lead: Lead):
    # Automatic notification is logged; will send for real only if providers configured
    # Prefer email if lead email exists, else SMS if phone exists, else just log to "email" with placeholder
    if lead.email and "@" in lead.email:
        channel = "email"
        to_value = lead.email
        subject = "Appointment booked"
        message = f"Hi {lead.full_name}, your appointment has been booked. We'll follow up soon."
    elif lead.phone:
        channel = "sms"
        to_value = lead.phone
        subject = None
        message = f"{lead.full_name}, your appointment is booked. Reply if you need to reschedule."
    else:
        channel = "email"
        to_value = "no-recipient@example.com"
        subject = "Appointment booked (logged)"
        message = f"Lead {lead.full_name} moved to Booked; no email/phone on file. Logged only."

    # config isn't accessible outside app context easily, so this is called inside request with app context.
    # We'll send/log using current app config.
    from flask import current_app
    status, provider_resp = try_send_notification(current_app.config, channel, to_value, subject or "ContractorConnect", message)

    notif = Notification(
        user_id=uid,
        lead_id=lead.id,
        channel=channel,
        to_value=to_value,
        subject=subject,
        message=message,
        status=status,
        provider_response=provider_resp
    )
    db.session.add(notif)
    db.session.commit()

def serialize_lead(l: Lead):
    return {
        "id": l.id,
        "full_name": l.full_name,
        "phone": l.phone,
        "email": l.email,
        "address": l.address,
        "city": l.city,
        "state": l.state,
        "stage": l.stage,
        "estimated_value": l.estimated_value,
        "appointment_datetime": l.appointment_datetime,
        "created_at": l.created_at.isoformat() if l.created_at else None,
        "updated_at": l.updated_at.isoformat() if l.updated_at else None,
    }

def serialize_note(n: Note):
    return {
        "id": n.id,
        "lead_id": n.lead_id,
        "note_text": n.note_text,
        "created_at": n.created_at.isoformat() if n.created_at else None,
    }

def serialize_notification(n: Notification):
    return {
        "id": n.id,
        "lead_id": n.lead_id,
        "channel": n.channel,
        "to_value": n.to_value,
        "subject": n.subject,
        "message": n.message,
        "status": n.status,
        "provider_response": n.provider_response,
        "created_at": n.created_at.isoformat() if n.created_at else None,
    }

app = create_app()

if __name__ == "__main__":
    app.run(debug=True)
