from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.domain.validators import ValidationError
from app.services.slot_service import SlotService
from app.services.ai_service import AIService
from app.models.user import User

slots_bp = Blueprint("slots", __name__)


def _parse_dt(value: str, field: str) -> datetime:
    """Parse ISO 8601 datetime string or raise ValidationError."""
    if not value:
        raise ValidationError(f"{field} is required.", field=field)
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except (ValueError, TypeError):
        raise ValidationError(f"{field} must be a valid ISO 8601 datetime.", field=field)


@slots_bp.route("/", methods=["GET"])
def list_available_slots():
    """Return all future available slots, optionally filtered by provider."""
    provider_id = request.args.get("provider_id", type=int)
    slots = SlotService.get_available_slots(provider_id=provider_id)
    return jsonify([s.to_dict() for s in slots]), 200


@slots_bp.route("/search", methods=["POST"])
def ai_search_slots():
    """Natural language slot search powered by AI."""
    data = request.get_json(silent=True) or {}
    query = (data.get("query") or "").strip()
    if not query:
        return jsonify({"error": "query is required."}), 422

    provider_id = data.get("provider_id")
    all_available = SlotService.get_available_slots(provider_id=provider_id)

    result = AIService.parse_slot_search_intent(query, all_available)

    filtered_ids = result.get("filtered_slot_ids")
    if filtered_ids is None:
        # AI unavailable — return all slots
        slots = all_available
    else:
        id_set = set(filtered_ids)
        slots = [s for s in all_available if s.id in id_set]

    return jsonify({
        "slots": [s.to_dict() for s in slots],
        "explanation": result.get("explanation", ""),
    }), 200


@slots_bp.route("/", methods=["POST"])
@jwt_required()
def create_slot():
    """Provider creates a new availability slot."""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or user.role != "provider":
        return jsonify({"error": "Only providers can create slots."}), 403

    provider = user.provider_profile
    if not provider:
        return jsonify({"error": "Provider profile not found."}), 404

    data = request.get_json(silent=True) or {}
    try:
        start_time = _parse_dt(data.get("start_time"), "start_time")
        end_time = _parse_dt(data.get("end_time"), "end_time")
        slot = SlotService.create_slot(provider.id, start_time, end_time)
    except ValidationError as exc:
        return jsonify(exc.to_dict()), 422

    return jsonify(slot.to_dict()), 201


@slots_bp.route("/mine", methods=["GET"])
@jwt_required()
def my_slots():
    """Provider views all their slots."""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or user.role != "provider":
        return jsonify({"error": "Only providers can view their slots."}), 403

    provider = user.provider_profile
    slots = SlotService.get_slots_for_provider(provider.id)
    return jsonify([s.to_dict() for s in slots]), 200
