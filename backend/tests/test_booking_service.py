"""
Tests for BookingService.

These tests use the real database (SQLite in-memory) and verify that the
service layer correctly enforces domain rules under realistic conditions.
"""
import pytest
from datetime import datetime, timezone, timedelta
from werkzeug.security import generate_password_hash

from app import db
from app.models.user import User
from app.models.provider import Provider
from app.models.slot import Slot
from app.models.booking import Booking, BookingStatus
from app.models.audit_log import AuditLog
from app.services.booking_service import BookingService
from app.domain.validators import ValidationError


def make_user(role, email, name="Test"):
    u = User(email=email, name=name, password_hash=generate_password_hash("pass"), role=role)
    db.session.add(u)
    db.session.flush()
    return u


def make_provider(user, duration=30):
    p = Provider(user_id=user.id, service_name="Test Service", slot_duration_mins=duration)
    db.session.add(p)
    db.session.flush()
    return p


def make_slot(provider_id, offset_hours=48, duration=30):
    start = datetime.now(timezone.utc) + timedelta(hours=offset_hours)
    end = start + timedelta(minutes=duration)
    s = Slot(provider_id=provider_id, start_time=start, end_time=end, is_available=True)
    db.session.add(s)
    db.session.flush()
    return s


class TestCreateBooking:
    def test_successful_booking(self, app, db):
        with app.app_context():
            provider_u = make_user("provider", "p1@test.com")
            provider = make_provider(provider_u)
            client = make_user("client", "c1@test.com")
            slot = make_slot(provider.id)
            db.session.commit()

            booking = BookingService.create_booking(slot.id, client.id)

            assert booking.id is not None
            assert booking.status == BookingStatus.PENDING
            assert booking.slot_id == slot.id
            assert booking.client_id == client.id

            # Slot must now be unavailable
            refreshed_slot = Slot.query.get(slot.id)
            assert refreshed_slot.is_available is False

    def test_audit_log_created_on_booking(self, app, db):
        with app.app_context():
            provider_u = make_user("provider", "p2@test.com")
            provider = make_provider(provider_u)
            client = make_user("client", "c2@test.com")
            slot = make_slot(provider.id)
            db.session.commit()

            booking = BookingService.create_booking(slot.id, client.id)

            logs = AuditLog.query.filter_by(booking_id=booking.id).all()
            assert len(logs) == 1
            assert logs[0].old_status is None
            assert logs[0].new_status == BookingStatus.PENDING.value

    def test_double_booking_raises(self, app, db):
        with app.app_context():
            provider_u = make_user("provider", "p3@test.com")
            provider = make_provider(provider_u)
            client1 = make_user("client", "c3a@test.com")
            client2 = make_user("client", "c3b@test.com")
            slot = make_slot(provider.id)
            db.session.commit()

            BookingService.create_booking(slot.id, client1.id)

            with pytest.raises(ValidationError) as exc:
                BookingService.create_booking(slot.id, client2.id)
            assert exc.value.field == "slot_id"

    def test_overlapping_client_booking_raises(self, app, db):
        with app.app_context():
            provider_u = make_user("provider", "p4@test.com")
            provider = make_provider(provider_u)
            client = make_user("client", "c4@test.com")
            slot1 = make_slot(provider.id, offset_hours=24)
            # Create slot2 that overlaps with slot1 (same time)
            start = slot1.start_time + timedelta(minutes=15)
            end = start + timedelta(minutes=30)
            slot2 = Slot(provider_id=provider.id, start_time=start, end_time=end, is_available=True)
            db.session.add(slot2)
            db.session.commit()

            BookingService.create_booking(slot1.id, client.id)

            with pytest.raises(ValidationError) as exc:
                BookingService.create_booking(slot2.id, client.id)
            assert exc.value.field == "slot_id"

    def test_nonexistent_slot_raises(self, app, db):
        with app.app_context():
            client = make_user("client", "c5@test.com")
            db.session.commit()
            with pytest.raises(ValidationError) as exc:
                BookingService.create_booking(99999, client.id)
            assert exc.value.field == "slot_id"


class TestTransitionStatus:
    def _setup(self, app, db, provider_email, client_email, offset=48):
        provider_u = make_user("provider", provider_email)
        provider = make_provider(provider_u)
        client = make_user("client", client_email)
        slot = make_slot(provider.id, offset_hours=offset)
        db.session.commit()
        booking = BookingService.create_booking(slot.id, client.id)
        return booking, client, provider_u

    def test_confirm_booking(self, app, db):
        with app.app_context():
            booking, client, provider_u = self._setup(app, db, "p6@test.com", "c6@test.com")
            updated = BookingService.transition_status(booking.id, "confirmed", provider_u.id)
            assert updated.status == BookingStatus.CONFIRMED

    def test_cancel_booking_frees_slot(self, app, db):
        with app.app_context():
            booking, client, provider_u = self._setup(app, db, "p7@test.com", "c7@test.com")
            slot_id = booking.slot_id
            BookingService.transition_status(booking.id, "cancelled", client.id)
            slot = Slot.query.get(slot_id)
            assert slot.is_available is True

    def test_invalid_transition_raises(self, app, db):
        with app.app_context():
            booking, client, provider_u = self._setup(app, db, "p8@test.com", "c8@test.com")
            BookingService.transition_status(booking.id, "cancelled", client.id)
            with pytest.raises(ValidationError) as exc:
                BookingService.transition_status(booking.id, "confirmed", provider_u.id)
            assert exc.value.field == "status"

    def test_audit_trail_grows_with_each_transition(self, app, db):
        with app.app_context():
            booking, client, provider_u = self._setup(app, db, "p9@test.com", "c9@test.com")
            BookingService.transition_status(booking.id, "confirmed", provider_u.id)
            BookingService.transition_status(booking.id, "cancelled", client.id)
            logs = AuditLog.query.filter_by(booking_id=booking.id).all()
            # created (pending) + confirmed + cancelled = 3
            assert len(logs) == 3
            statuses = [l.new_status for l in logs]
            assert statuses == ["pending", "confirmed", "cancelled"]
