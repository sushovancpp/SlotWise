from app.api.routes.auth import auth_bp
from app.api.routes.providers import providers_bp
from app.api.routes.slots import slots_bp
from app.api.routes.bookings import bookings_bp

__all__ = ["auth_bp", "providers_bp", "slots_bp", "bookings_bp"]
