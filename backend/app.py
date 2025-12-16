import os
from datetime import timedelta, datetime

from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import (
    JWTManager, create_access_token, jwt_required, get_jwt_identity
)
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)

class Lead(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    full_name = db.Column(db.String(120), nullable=False)
    phone = db.Column(db.String(50))
    email = db.Column(db.String(255))
    address = db.Column(db.String(255))
    city = db.Column(db.String(120))
    state = db.Column(db.String(60))
    stage = db.Column(db.String(60), default="New", nullable=False, index=True)
    estimated_value = db.Column(db.Float, default=0.0)
    appointment_datetime = db.Column(db.String(80))
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

STAGES = ["New", "Contacted", "Booked", "Estimate Sent", "Closed Won", "Closed Lost"]

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

def create_app():
    app = Flask(__name__)
    CORS(app, resources={r"/*": {"origins": "*"}})

    database_url = os.getenv("DATABASE_URL", "sqlite:///contractorconnect.db")
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)

    app.config["SQLALCHEMY_DATABASE_URI"] = database_url
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "dev-change-me")
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(days=3)

    db.init_app(app)
    JWTManager(app)

    with app.app_context():
        db.create_all()

    @app.get("/")
    def home():
        return jsonify({"status": "ok", "message": "ContractorConnect API is running"}), 200

    @app.get("/health")
    def health():
        return "OK", 200

    @app.post("/api/auth/register")
    def register():
        data = request.get_json(silent=True) or {}
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
        data = request.get_json(silent=True) or {}
        email = (data.get("email") or "").strip().lower()
        password = data.get("password") or ""

        user = User.query.filter_by(email=email).first()
        if not user or not check_password_hash(user.password_hash, password):
            return jsonify({"error": "Invalid credentials"}), 401

        token = create_access_token(identity=str(user.id))
        return jsonify({"access_token": token, "user": {"id": user.id, "name": user.name, "email": user.email}}), 200

    @app.get("/api/leads")
    @jwt_required()
    def list_leads():
        uid = int(get_jwt_identity())
        stage = request.args.get("stage")
        q = Lead.query.filter_by(user_id=uid)
        if stage:
            q = q.filter_by(stage=stage)
        leads = q.order_by(Lead.created_at.desc()).all()
        return jsonify([serialize_lead(l) for l in leads]), 200

    @app.post("/api/leads")
    @jwt_required()
    def create_lead():
        uid = int(get_jwt_identity())
        data = request.get_json(silent=True) or {}

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
            appointment_datetime=(data.get("appointment_datetime") or "").strip() or None,
        )
        db.session.add(lead)
        db.session.commit()
        return jsonify(serialize_lead(lead)), 201

    @app.get("/api/leads/<int:lead_id>")
    @jwt_required()
    def get_lead(lead_id: int):
        uid = int(get_jwt_identity())
        lead = Lead.query.filter_by(id=lead_id, user_id=uid).first()
        if not lead:
            return jsonify({"error": "Not found"}), 404
        return jsonify(serialize_lead(lead)), 200

    @app.put("/api/leads/<int:lead_id>")
    @jwt_required()
    def update_lead(lead_id: int):
        uid = int(get_jwt_identity())
        lead = Lead.query.filter_by(id=lead_id, user_id=uid).first()
        if not lead:
            return jsonify({"error": "Not found"}), 404

        data = request.get_json(silent=True) or {}

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
        return jsonify(serialize_lead(lead)), 200

    @app.delete("/api/leads/<int:lead_id>")
    @jwt_required()
    def delete_lead(lead_id: int):
        uid = int(get_jwt_identity())
        lead = Lead.query.filter_by(id=lead_id, user_id=uid).first()
        if not lead:
            return jsonify({"error": "Not found"}), 404
        db.session.delete(lead)
        db.session.commit()
        return jsonify({"message": "Deleted"}), 200

    return app

app = create_app()
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
