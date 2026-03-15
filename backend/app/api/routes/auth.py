from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token
from werkzeug.security import generate_password_hash, check_password_hash

from app import db
from app.models.user import User
from app.models.provider import Provider

auth_bp = Blueprint("auth", __name__)

VALID_ROLES = {"client", "provider"}


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    errors = {}

    email = (data.get("email") or "").strip().lower()
    name = (data.get("name") or "").strip()
    password = data.get("password") or ""
    role = (data.get("role") or "").strip().lower()
    service_name = (data.get("service_name") or "").strip()
    slot_duration_mins = data.get("slot_duration_mins")

    if not email:
        errors["email"] = "Email is required."
    if not name:
        errors["name"] = "Name is required."
    if len(password) < 6:
        errors["password"] = "Password must be at least 6 characters."
    if role not in VALID_ROLES:
        errors["role"] = f"Role must be one of: {', '.join(VALID_ROLES)}."
    if role == "provider":
        if not service_name:
            errors["service_name"] = "Service name is required for providers."
        if slot_duration_mins is None:
            slot_duration_mins = 30
        try:
            slot_duration_mins = int(slot_duration_mins)
            if slot_duration_mins <= 0:
                errors["slot_duration_mins"] = "Slot duration must be positive."
        except (ValueError, TypeError):
            errors["slot_duration_mins"] = "Slot duration must be an integer."

    if errors:
        return jsonify({"errors": errors}), 422

    if User.query.filter_by(email=email).first():
        return jsonify({"errors": {"email": "Email already registered."}}), 409

    user = User(
        email=email,
        name=name,
        password_hash=generate_password_hash(password),
        role=role,
    )
    db.session.add(user)
    db.session.flush()

    if role == "provider":
        provider = Provider(
            user_id=user.id,
            service_name=service_name,
            slot_duration_mins=slot_duration_mins,
        )
        db.session.add(provider)

    db.session.commit()
    token = create_access_token(identity=str(user.id))
    return jsonify({"token": token, "user": user.to_dict()}), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    user = User.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({"error": "Invalid email or password."}), 401

    token = create_access_token(identity=str(user.id))
    return jsonify({"token": token, "user": user.to_dict()}), 200


@auth_bp.route("/me", methods=["GET"])
def me():
    from flask_jwt_extended import jwt_required, get_jwt_identity
    @jwt_required()
    def inner():
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "User not found."}), 404
        data = user.to_dict()
        if user.provider_profile:
            data["provider"] = user.provider_profile.to_dict()
        return jsonify(data), 200
    return inner()
