from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_cors import CORS

from config import config

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()


def create_app(config_name="default"):
    app = Flask(__name__)
    app.config.from_object(config[config_name])

    # Extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # Register blueprints
    from app.api.routes.auth import auth_bp
    from app.api.routes.providers import providers_bp
    from app.api.routes.slots import slots_bp
    from app.api.routes.bookings import bookings_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(providers_bp, url_prefix="/api/providers")
    app.register_blueprint(slots_bp, url_prefix="/api/slots")
    app.register_blueprint(bookings_bp, url_prefix="/api/bookings")

    # Import models so migrations can detect them
    with app.app_context():
        from app.models import user, provider, slot, booking, audit_log  # noqa: F401

    return app
