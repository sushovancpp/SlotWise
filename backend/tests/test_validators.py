"""
Tests for domain/validators.py

These tests require NO Flask app or database.
They verify the invariants that protect system correctness.
"""
import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import MagicMock

from app.domain.validators import (
    ValidationError,
    validate_slot_is_future,
    validate_slot_duration,
    validate_slot_is_available,
    validate_no_client_overlap,
    validate_cancellation_window,
    validate_status_transition,
)


# ─── validate_slot_is_future ───────────────────────────────────────────────

class TestSlotIsFuture:
    def test_future_slot_passes(self):
        future = datetime.now(timezone.utc) + timedelta(hours=2)
        validate_slot_is_future(future)  # no exception

    def test_past_slot_raises(self):
        past = datetime.now(timezone.utc) - timedelta(minutes=1)
        with pytest.raises(ValidationError) as exc:
            validate_slot_is_future(past)
        assert exc.value.field == "start_time"

    def test_now_raises(self):
        now = datetime.now(timezone.utc)
        with pytest.raises(ValidationError):
            validate_slot_is_future(now)

    def test_naive_datetime_treated_as_utc(self):
        future_naive = datetime.utcnow() + timedelta(hours=1)
        validate_slot_is_future(future_naive)  # should not raise


# ─── validate_slot_duration ────────────────────────────────────────────────

class TestSlotDuration:
    def test_correct_duration_passes(self):
        start = datetime.now(timezone.utc) + timedelta(hours=1)
        end = start + timedelta(minutes=30)
        validate_slot_duration(start, end, 30)  # no exception

    def test_wrong_duration_raises(self):
        start = datetime.now(timezone.utc) + timedelta(hours=1)
        end = start + timedelta(minutes=45)
        with pytest.raises(ValidationError) as exc:
            validate_slot_duration(start, end, 30)
        assert exc.value.field == "end_time"
        assert "30 minutes" in exc.value.message

    def test_end_before_start_raises(self):
        start = datetime.now(timezone.utc) + timedelta(hours=2)
        end = start - timedelta(minutes=10)
        with pytest.raises(ValidationError) as exc:
            validate_slot_duration(start, end, 30)
        assert exc.value.field == "end_time"

    def test_different_duration_configs(self):
        start = datetime.now(timezone.utc) + timedelta(hours=1)
        for mins in [15, 30, 45, 60]:
            end = start + timedelta(minutes=mins)
            validate_slot_duration(start, end, mins)  # should not raise


# ─── validate_slot_is_available ───────────────────────────────────────────

class TestSlotAvailability:
    def test_available_slot_passes(self):
        validate_slot_is_available(True)

    def test_unavailable_slot_raises(self):
        with pytest.raises(ValidationError) as exc:
            validate_slot_is_available(False)
        assert exc.value.field == "slot_id"


# ─── validate_no_client_overlap ───────────────────────────────────────────

class TestClientOverlap:
    def _make_booking(self, start_offset_hours, duration_mins=30):
        start = datetime.now(timezone.utc) + timedelta(hours=start_offset_hours)
        end = start + timedelta(minutes=duration_mins)
        slot = MagicMock()
        slot.start_time = start
        slot.end_time = end
        booking = MagicMock()
        booking.slot = slot
        return booking

    def test_no_existing_bookings_passes(self):
        new_start = datetime.now(timezone.utc) + timedelta(hours=5)
        new_end = new_start + timedelta(minutes=30)
        validate_no_client_overlap([], new_start, new_end)

    def test_non_overlapping_booking_passes(self):
        existing = [self._make_booking(start_offset_hours=10)]
        new_start = datetime.now(timezone.utc) + timedelta(hours=5)
        new_end = new_start + timedelta(minutes=30)
        validate_no_client_overlap(existing, new_start, new_end)

    def test_exact_overlap_raises(self):
        existing = [self._make_booking(start_offset_hours=5)]
        new_start = datetime.now(timezone.utc) + timedelta(hours=5)
        new_end = new_start + timedelta(minutes=30)
        with pytest.raises(ValidationError) as exc:
            validate_no_client_overlap(existing, new_start, new_end)
        assert exc.value.field == "slot_id"

    def test_partial_overlap_raises(self):
        existing = [self._make_booking(start_offset_hours=5)]
        new_start = datetime.now(timezone.utc) + timedelta(hours=5, minutes=15)
        new_end = new_start + timedelta(minutes=30)
        with pytest.raises(ValidationError):
            validate_no_client_overlap(existing, new_start, new_end)

    def test_adjacent_slots_do_not_overlap(self):
        existing = [self._make_booking(start_offset_hours=5, duration_mins=30)]
        new_start = datetime.now(timezone.utc) + timedelta(hours=5, minutes=30)
        new_end = new_start + timedelta(minutes=30)
        validate_no_client_overlap(existing, new_start, new_end)  # should not raise


# ─── validate_cancellation_window ─────────────────────────────────────────

class TestCancellationWindow:
    def test_outside_window_passes(self):
        slot_start = datetime.now(timezone.utc) + timedelta(hours=48)
        validate_cancellation_window(slot_start, window_hours=24)

    def test_inside_window_raises(self):
        slot_start = datetime.now(timezone.utc) + timedelta(hours=2)
        with pytest.raises(ValidationError) as exc:
            validate_cancellation_window(slot_start, window_hours=24)
        assert exc.value.field == "status"
        assert "24 hours" in exc.value.message

    def test_zero_window_always_passes(self):
        slot_start = datetime.now(timezone.utc) + timedelta(minutes=1)
        validate_cancellation_window(slot_start, window_hours=0)

    def test_exact_boundary_raises(self):
        slot_start = datetime.now(timezone.utc) + timedelta(hours=23, minutes=59)
        with pytest.raises(ValidationError):
            validate_cancellation_window(slot_start, window_hours=24)


# ─── validate_status_transition ───────────────────────────────────────────

class TestStatusTransition:
    def test_pending_to_confirmed_passes(self):
        validate_status_transition("pending", "confirmed")

    def test_pending_to_cancelled_passes(self):
        validate_status_transition("pending", "cancelled")

    def test_confirmed_to_cancelled_passes(self):
        validate_status_transition("confirmed", "cancelled")

    def test_cancelled_to_anything_raises(self):
        for target in ["pending", "confirmed"]:
            with pytest.raises(ValidationError) as exc:
                validate_status_transition("cancelled", target)
            assert exc.value.field == "status"

    def test_confirmed_to_pending_raises(self):
        with pytest.raises(ValidationError):
            validate_status_transition("confirmed", "pending")

    def test_invalid_status_raises(self):
        with pytest.raises(ValidationError):
            validate_status_transition("pending", "unknown_status")
