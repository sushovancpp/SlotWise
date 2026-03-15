import os
from app import create_app, db

app = create_app(os.environ.get("FLASK_ENV", "development"))


@app.cli.command("seed")
def seed():
    """Seed the database with sample providers and slots for development."""
    from datetime import datetime, timezone, timedelta
    from werkzeug.security import generate_password_hash
    from app.models.user import User
    from app.models.provider import Provider
    from app.models.slot import Slot

    with app.app_context():
        db.create_all()

        # Create provider
        if not User.query.filter_by(email="dr.smith@example.com").first():
            provider_user = User(
                email="dr.smith@example.com",
                name="Dr. Smith",
                password_hash=generate_password_hash("password123"),
                role="provider",
            )
            db.session.add(provider_user)
            db.session.flush()

            provider = Provider(
                user_id=provider_user.id,
                service_name="General Consultation",
                description="30-minute general health consultation.",
                slot_duration_mins=30,
            )
            db.session.add(provider)
            db.session.flush()

            # Create future slots
            now = datetime.now(timezone.utc)
            for day_offset in range(1, 8):
                for hour in [9, 10, 14, 15, 16]:
                    start = (now + timedelta(days=day_offset)).replace(
                        hour=hour, minute=0, second=0, microsecond=0
                    )
                    end = start + timedelta(minutes=30)
                    db.session.add(Slot(provider_id=provider.id, start_time=start, end_time=end))

        # Create client
        if not User.query.filter_by(email="client@example.com").first():
            client = User(
                email="client@example.com",
                name="Jane Client",
                password_hash=generate_password_hash("password123"),
                role="client",
            )
            db.session.add(client)

        db.session.commit()
        print("✅ Database seeded.")
        print("   Provider: dr.smith@example.com / password123")
        print("   Client:   client@example.com / password123")


if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=5000)
