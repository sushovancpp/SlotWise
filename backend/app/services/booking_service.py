"""
BookingService — the only place bookings are created or status-changed.

Flask routes are thin: they parse HTTP, call a service method, and return JSON.
All domain rules are enforced here before any DB write.
"""
from flask import current_app

from app import db
from app.models.booking import Booking, BookingStatus
from app.models.slot import Slot
from app.models.audit_log import AuditLog
from app.domain.validators import (
    ValidationError,
    validate_slot_is_available,
    validate_no_client_overlap,
    validate_cancellation_window,
    validate_status_transition,
)


class BookingService:

    @staticmethod
    def create_booking(slot_id: int, client_id: int, notes: str = "") -> Booking:
        """
        Create a new booking.

        Invariants enforced (in order):
        1. Slot exists
        2. Slot is available (not already booked)
        3. Client has no overlapping active bookings
        """
        slot = Slot.query.get(slot_id)
        if slot is None:
            raise ValidationError("Slot not found.", field="slot_id")

        # Rule 1 — slot must be available
        validate_slot_is_available(slot.is_available)

        # Rule 2 — no client overlap with active (non-cancelled) bookings
        from app.models.booking import BookingStatus
        active_bookings = (
            Booking.query
            .filter(
                Booking.client_id == client_id,
                Booking.status != BookingStatus.CANCELLED,
                Booking.slot_id != slot_id,
            )
            .all()
        )
        validate_no_client_overlap(active_bookings, slot.start_time, slot.end_time)

        # All rules passed — persist
        booking = Booking(
            slot_id=slot_id,
            client_id=client_id,
            status=BookingStatus.PENDING,
            notes=notes,
        )
        slot.is_available = False

        db.session.add(booking)
        db.session.flush()  # get booking.id before audit log

        audit = AuditLog(
            booking_id=booking.id,
            old_status=None,
            new_status=BookingStatus.PENDING.value,
            changed_by=client_id,
            reason="Booking created",
        )
        db.session.add(audit)
        db.session.commit()
        return booking

    @staticmethod
    def transition_status(
        booking_id: int,
        new_status_value: str,
        actor_id: int,
        reason: str = "",
    ) -> Booking:
        """
        Transition a booking to a new status.

        Invariants enforced:
        1. Booking exists
        2. Transition is valid per state machine
        3. Cancellation respects the configured window
        """
        booking = Booking.query.get(booking_id)
        if booking is None:
            raise ValidationError("Booking not found.")

        # Rule 1 — valid state machine transition
        validate_status_transition(booking.status, new_status_value)

        new_status = BookingStatus(new_status_value)

        # Rule 2 — cancellation window
        if new_status == BookingStatus.CANCELLED:
            window = current_app.config.get("CANCELLATION_WINDOW_HOURS", 24)
            validate_cancellation_window(booking.slot.start_time, window)

            # Free the slot only on cancellation
            booking.slot.is_available = True

        old_status = booking.status
        booking.status = new_status

        audit = AuditLog(
            booking_id=booking.id,
            old_status=old_status.value,
            new_status=new_status.value,
            changed_by=actor_id,
            reason=reason or f"Status changed to {new_status.value}",
        )
        db.session.add(audit)
        db.session.commit()
        return booking

    @staticmethod
    def get_bookings_for_client(client_id: int) -> list[Booking]:
        return (
            Booking.query
            .filter_by(client_id=client_id)
            .order_by(Booking.created_at.desc())
            .all()
        )

    @staticmethod
    def get_bookings_for_provider(provider_id: int) -> list[Booking]:
        from app.models.slot import Slot
        return (
            Booking.query
            .join(Slot)
            .filter(Slot.provider_id == provider_id)
            .order_by(Booking.created_at.desc())
            .all()
        )
