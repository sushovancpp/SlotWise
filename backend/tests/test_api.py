"""
API integration tests.

Tests the full HTTP request/response cycle through Flask,
verifying correct status codes and that the domain rules
are enforced at the API boundary.
"""
import json
import pytest
from datetime import datetime, timezone, timedelta
from werkzeug.security import generate_password_hash

from app import db
from app.models.user import User
from app.models.provider import Provider
from app.models.slot import Slot


def _register(client, email, name, role, password="password123", **kwargs):
    payload = {"email": email, "name": name, "role": role, "password": password, **kwargs}
    return client.post("/api/auth/register", json=payload)


def _login(client, email, password="password123"):
    return client.post("/api/auth/login", json={"email": email, "password": password})


def _token(client, email, role, **kwargs):
    _register(client, email, f"User {email}", role, **kwargs)
    r = _login(client, email)
    return json.loads(r.data)["token"]


class TestAuthEndpoints:
    def test_register_client_success(self, client, app):
        with app.app_context():
            r = _register(client, "new@test.com", "New User", "client")
            assert r.status_code == 201
            data = json.loads(r.data)
            assert "token" in data
            assert data["user"]["role"] == "client"

    def test_register_duplicate_email_returns_409(self, client, app):
        with app.app_context():
            _register(client, "dup@test.com", "User", "client")
            r = _register(client, "dup@test.com", "User2", "client")
            assert r.status_code == 409

    def test_register_missing_fields_returns_422(self, client, app):
        with app.app_context():
            r = client.post("/api/auth/register", json={"email": "x@test.com"})
            assert r.status_code == 422

    def test_login_success(self, client, app):
        with app.app_context():
            _register(client, "login@test.com", "Login User", "client")
            r = _login(client, "login@test.com")
            assert r.status_code == 200
            assert "token" in json.loads(r.data)

    def test_login_wrong_password_returns_401(self, client, app):
        with app.app_context():
            _register(client, "wrong@test.com", "Wrong", "client")
            r = _login(client, "wrong@test.com", password="badpassword")
            assert r.status_code == 401

    def test_register_provider_requires_service_name(self, client, app):
        with app.app_context():
            r = _register(client, "prov@test.com", "Provider", "provider")
            assert r.status_code == 422


class TestSlotEndpoints:
    def test_client_cannot_create_slot(self, client, app):
        with app.app_context():
            token = _token(client, "slotclient@test.com", "client")
            start = (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
            end = (datetime.now(timezone.utc) + timedelta(hours=24, minutes=30)).isoformat()
            r = client.post(
                "/api/slots/",
                json={"start_time": start, "end_time": end},
                headers={"Authorization": f"Bearer {token}"},
            )
            assert r.status_code == 403

    def test_provider_creates_slot(self, client, app):
        with app.app_context():
            token = _token(
                client, "slotprov@test.com", "provider",
                service_name="Test", slot_duration_mins=30
            )
            start = (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
            end = (datetime.now(timezone.utc) + timedelta(hours=24, minutes=30)).isoformat()
            r = client.post(
                "/api/slots/",
                json={"start_time": start, "end_time": end},
                headers={"Authorization": f"Bearer {token}"},
            )
            assert r.status_code == 201

    def test_past_slot_returns_422(self, client, app):
        with app.app_context():
            token = _token(
                client, "pastprov@test.com", "provider",
                service_name="Test", slot_duration_mins=30
            )
            start = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
            end = (datetime.now(timezone.utc) - timedelta(minutes=30)).isoformat()
            r = client.post(
                "/api/slots/",
                json={"start_time": start, "end_time": end},
                headers={"Authorization": f"Bearer {token}"},
            )
            assert r.status_code == 422

    def test_wrong_duration_returns_422(self, client, app):
        with app.app_context():
            token = _token(
                client, "durationprov@test.com", "provider",
                service_name="Test", slot_duration_mins=30
            )
            start = (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
            end = (datetime.now(timezone.utc) + timedelta(hours=24, minutes=60)).isoformat()
            r = client.post(
                "/api/slots/",
                json={"start_time": start, "end_time": end},
                headers={"Authorization": f"Bearer {token}"},
            )
            assert r.status_code == 422

    def test_list_slots_unauthenticated(self, client, app):
        with app.app_context():
            r = client.get("/api/slots/")
            assert r.status_code == 200


class TestBookingEndpoints:
    def _create_slot_for_provider(self, app_db, provider_id, offset_hours=72):
        start = datetime.now(timezone.utc) + timedelta(hours=offset_hours)
        end = start + timedelta(minutes=30)
        slot = Slot(provider_id=provider_id, start_time=start, end_time=end, is_available=True)
        app_db.session.add(slot)
        app_db.session.commit()
        return slot

    def test_client_books_slot(self, client, app):
        with app.app_context():
            p_token = _token(
                client, "bookprov@test.com", "provider",
                service_name="Test", slot_duration_mins=30
            )
            from app.models.user import User
            prov_user = User.query.filter_by(email="bookprov@test.com").first()
            slot = self._create_slot_for_provider(db, prov_user.provider_profile.id)

            c_token = _token(client, "bookclient@test.com", "client")
            r = client.post(
                "/api/bookings/",
                json={"slot_id": slot.id},
                headers={"Authorization": f"Bearer {c_token}"},
            )
            assert r.status_code == 201
            assert json.loads(r.data)["status"] == "pending"

    def test_double_booking_returns_422(self, client, app):
        with app.app_context():
            _token(client, "doubleprov@test.com", "provider", service_name="Test", slot_duration_mins=30)
            prov_user = User.query.filter_by(email="doubleprov@test.com").first()
            slot = self._create_slot_for_provider(db, prov_user.provider_profile.id)

            c1_token = _token(client, "doublec1@test.com", "client")
            c2_token = _token(client, "doublec2@test.com", "client")

            client.post("/api/bookings/", json={"slot_id": slot.id},
                       headers={"Authorization": f"Bearer {c1_token}"})
            r = client.post("/api/bookings/", json={"slot_id": slot.id},
                           headers={"Authorization": f"Bearer {c2_token}"})
            assert r.status_code == 422

    def test_provider_cannot_book(self, client, app):
        with app.app_context():
            p_token = _token(
                client, "onlyprov@test.com", "provider",
                service_name="Test", slot_duration_mins=30
            )
            prov_user = User.query.filter_by(email="onlyprov@test.com").first()
            slot = self._create_slot_for_provider(db, prov_user.provider_profile.id)

            r = client.post(
                "/api/bookings/",
                json={"slot_id": slot.id},
                headers={"Authorization": f"Bearer {p_token}"},
            )
            assert r.status_code == 403

    def test_status_transition_via_api(self, client, app):
        with app.app_context():
            p_token = _token(
                client, "statusprov@test.com", "provider",
                service_name="Test", slot_duration_mins=30
            )
            prov_user = User.query.filter_by(email="statusprov@test.com").first()
            slot = self._create_slot_for_provider(db, prov_user.provider_profile.id)

            c_token = _token(client, "statusclient@test.com", "client")
            book_r = client.post(
                "/api/bookings/",
                json={"slot_id": slot.id},
                headers={"Authorization": f"Bearer {c_token}"},
            )
            booking_id = json.loads(book_r.data)["id"]

            confirm_r = client.patch(
                f"/api/bookings/{booking_id}/status",
                json={"status": "confirmed"},
                headers={"Authorization": f"Bearer {p_token}"},
            )
            assert confirm_r.status_code == 200
            assert json.loads(confirm_r.data)["status"] == "confirmed"
