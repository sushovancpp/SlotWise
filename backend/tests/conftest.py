import pytest
from datetime import datetime, timezone, timedelta
from werkzeug.security import generate_password_hash

from app import create_app, db as _db
from app.models.user import User
from app.models.provider import Provider
from app.models.slot import Slot


@pytest.fixture(scope="session")
def app():
    app = create_app("testing")
    with app.app_context():
        _db.create_all()
        yield app
        _db.drop_all()


@pytest.fixture(scope="function")
def db(app):
    with app.app_context():
        yield _db
        _db.session.rollback()
        # Clean all tables between tests
        for table in reversed(_db.metadata.sorted_tables):
            _db.session.execute(table.delete())
        _db.session.commit()


@pytest.fixture
def client(app):
    return app.test_client()


def _make_user(db, email, name, role, password="password123"):
    user = User(
        email=email,
        name=name,
        password_hash=generate_password_hash(password),
        role=role,
    )
    db.session.add(user)
    db.session.flush()
    return user


def _make_provider(db, user, service_name="Consultation", slot_duration_mins=30):
    provider = Provider(
        user_id=user.id,
        service_name=service_name,
        slot_duration_mins=slot_duration_mins,
    )
    db.session.add(provider)
    db.session.flush()
    return provider


def _make_slot(db, provider, offset_hours=24, duration_mins=30):
    start = datetime.now(timezone.utc) + timedelta(hours=offset_hours)
    end = start + timedelta(minutes=duration_mins)
    slot = Slot(provider_id=provider.id, start_time=start, end_time=end)
    db.session.add(slot)
    db.session.flush()
    return slot


@pytest.fixture
def provider_user(db):
    user = _make_user(db, "provider@test.com", "Test Provider", "provider")
    _make_provider(db, user)
    db.session.commit()
    return user


@pytest.fixture
def client_user(db):
    user = _make_user(db, "client@test.com", "Test Client", "client")
    db.session.commit()
    return user


@pytest.fixture
def future_slot(db, provider_user):
    slot = _make_slot(db, provider_user.provider_profile, offset_hours=48)
    db.session.commit()
    return slot
