"""
Domain validation rules — pure Python with no framework dependency.

All business invariants live here. These can be tested without a running
Flask app or database connection, which keeps the test suite fast.
"""
from datetime import datetime, timezone
from typing import Optional


class ValidationError(Exception):
    """Raised when a domain rule is violated."""
    def __init__(self, message: str, field: Optional[str] = None):
        super().__init__(message)
        self.message = message
        self.field = field

    def to_dict(self):
        return {"error": self.message, "field": self.field}


def validate_slot_is_future(start_time: datetime) -> None:
    """Slots must be in the future."""
    now = datetime.now(timezone.utc)
    # Normalize naive datetimes for comparison
    if start_time.tzinfo is None:
        start_time = start_time.replace(tzinfo=timezone.utc)
    if start_time <= now:
        raise ValidationError(
            "Slot start time must be in the future.",
            field="start_time",
        )


def validate_slot_duration(start_time: datetime, end_time: datetime, expected_minutes: int) -> None:
    """Slot duration must exactly match the provider's configured duration."""
    if start_time.tzinfo is None:
        start_time = start_time.replace(tzinfo=timezone.utc)
    if end_time.tzinfo is None:
        end_time = end_time.replace(tzinfo=timezone.utc)

    if end_time <= start_time:
        raise ValidationError("end_time must be after start_time.", field="end_time")

    actual_minutes = int((end_time - start_time).total_seconds() / 60)
    if actual_minutes != expected_minutes:
        raise ValidationError(
            f"Slot duration must be {expected_minutes} minutes, got {actual_minutes}.",
            field="end_time",
        )


def validate_slot_is_available(slot_is_available: bool) -> None:
    """A slot must be available before it can be booked."""
    if not slot_is_available:
        raise ValidationError("This slot is already booked.", field="slot_id")


def validate_no_client_overlap(client_bookings: list, new_start: datetime, new_end: datetime) -> None:
    """
    A client must not have two overlapping active bookings.
    Overlap: two ranges [A_start, A_end) and [B_start, B_end) overlap if
    A_start < B_end and B_start < A_end.
    """
    def to_utc(dt):
        return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt

    new_start = to_utc(new_start)
    new_end = to_utc(new_end)

    for booking in client_bookings:
        slot = booking.slot
        if slot is None:
            continue
        existing_start = to_utc(slot.start_time)
        existing_end = to_utc(slot.end_time)

        if new_start < existing_end and existing_start < new_end:
            raise ValidationError(
                "You already have a booking that overlaps with this time slot.",
                field="slot_id",
            )


def validate_cancellation_window(slot_start: datetime, window_hours: int) -> None:
    """Cancellation is only allowed before the cancellation window."""
    if window_hours <= 0:
        return
    now = datetime.now(timezone.utc)
    if slot_start.tzinfo is None:
        slot_start = slot_start.replace(tzinfo=timezone.utc)
    hours_until = (slot_start - now).total_seconds() / 3600
    if hours_until < window_hours:
        raise ValidationError(
            f"Cancellations must be made at least {window_hours} hours before the appointment.",
            field="status",
        )


def validate_status_transition(current_status, new_status) -> None:
    """Delegate to the BookingStatus state machine — imported here to keep validators pure."""
    from app.models.booking import BookingStatus

    try:
        current = BookingStatus(current_status) if isinstance(current_status, str) else current_status
        new = BookingStatus(new_status) if isinstance(new_status, str) else new_status
    except ValueError:
        raise ValidationError(f"Invalid booking status: {new_status}.", field="status")

    if not current.can_transition_to(new):
        raise ValidationError(
            f"Cannot transition booking from '{current.value}' to '{new.value}'.",
            field="status",
        )
