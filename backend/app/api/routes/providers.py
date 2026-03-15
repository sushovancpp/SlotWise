from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required

from app.models.provider import Provider

providers_bp = Blueprint("providers", __name__)


@providers_bp.route("/", methods=["GET"])
def list_providers():
    providers = Provider.query.all()
    return jsonify([p.to_dict() for p in providers]), 200


@providers_bp.route("/<int:provider_id>", methods=["GET"])
def get_provider(provider_id):
    provider = Provider.query.get(provider_id)
    if not provider:
        return jsonify({"error": "Provider not found."}), 404
    return jsonify(provider.to_dict()), 200
