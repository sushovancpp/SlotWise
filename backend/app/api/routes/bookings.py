from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.domain.validators import ValidationError
from app.services.booking_service import BookingService
from app.models.user import User
from app.models.booking import Booking
from app.models.audit_log import AuditLog

bookings_bp = Blueprint("bookings", __name__)


@bookings_bp.route("/", methods=["POST"])
@jwt_required()
def create_booking():
    """Client books an available slot."""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or user.role != "client":
        return jsonify({"error": "Only clients can create bookings."}), 403

    data = request.get_json(silent=True) or {}
    slot_id = data.get("slot_id")
    if not slot_id:
        return jsonify({"error": "slot_id is required.", "field": "slot_id"}), 422

    try:
        slot_id = int(slot_id)
    except (ValueError, TypeError):
        return jsonify({"error": "slot_id must be an integer.", "field": "slot_id"}), 422

    try:
        booking = BookingService.create_booking(
            slot_id=slot_id,
            client_id=user_id,
            notes=data.get("notes", ""),
        )
    except ValidationError as exc:
        return jsonify(exc.to_dict()), 422

    return jsonify(booking.to_dict()), 201


@bookings_bp.route("/mine", methods=["GET"])
@jwt_required()
def my_bookings():
    """Client views their own bookings."""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or user.role != "client":
        return jsonify({"error": "Only clients can view their bookings."}), 403

    bookings = BookingService.get_bookings_for_client(user_id)
    return jsonify([b.to_dict() for b in bookings]), 200


@bookings_bp.route("/provider", methods=["GET"])
@jwt_required()
def provider_bookings():
    """Provider views all bookings for their slots."""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or user.role != "provider":
        return jsonify({"error": "Only providers can view provider bookings."}), 403

    provider = user.provider_profile
    if not provider:
        return jsonify({"error": "Provider profile not found."}), 404

    bookings = BookingService.get_bookings_for_provider(provider.id)
    return jsonify([b.to_dict() for b in bookings]), 200


@bookings_bp.route("/<int:booking_id>/status", methods=["PATCH"])
@jwt_required()
def update_status(booking_id):
    """
    Transition a booking status.
    - Client can cancel their own booking.
    - Provider can confirm or cancel bookings on their slots.
    """
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found."}), 404

    booking = Booking.query.get(booking_id)
    if not booking:
        return jsonify({"error": "Booking not found."}), 404

    # Authorization check
    is_owner = booking.client_id == user_id
    is_provider = (
        user.role == "provider"
        and user.provider_profile
        and booking.slot.provider_id == user.provider_profile.id
    )

    if not (is_owner or is_provider):
        return jsonify({"error": "You are not authorized to update this booking."}), 403

    data = request.get_json(silent=True) or {}
    new_status = (data.get("status") or "").strip().lower()
    reason = data.get("reason", "")

    if not new_status:
        return jsonify({"error": "status is required.", "field": "status"}), 422

    # Clients can only cancel
    if user.role == "client" and new_status != "cancelled":
        return jsonify({"error": "Clients may only cancel bookings.", "field": "status"}), 403

    try:
        booking = BookingService.transition_status(
            booking_id=booking_id,
            new_status_value=new_status,
            actor_id=user_id,
            reason=reason,
        )
    except ValidationError as exc:
        return jsonify(exc.to_dict()), 422

    return jsonify(booking.to_dict()), 200


@bookings_bp.route("/<int:booking_id>/audit", methods=["GET"])
@jwt_required()
def booking_audit(booking_id):
    """Return the full audit trail for a booking."""
    user_id = int(get_jwt_identity())
    booking = Booking.query.get(booking_id)
    if not booking:
        return jsonify({"error": "Booking not found."}), 404

    user = User.query.get(user_id)
    is_owner = booking.client_id == user_id
    is_provider = (
        user
        and user.role == "provider"
        and user.provider_profile
        and booking.slot.provider_id == user.provider_profile.id
    )

    if not (is_owner or is_provider):
        return jsonify({"error": "Not authorized."}), 403

    logs = (
        AuditLog.query
        .filter_by(booking_id=booking_id)
        .order_by(AuditLog.changed_at.asc())
        .all()
    )
    return jsonify([l.to_dict() for l in logs]), 200
