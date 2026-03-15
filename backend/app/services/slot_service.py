"""
SlotService — manages slot creation and querying.
"""
from datetime import datetime, timezone

from app import db
from app.models.slot import Slot
from app.models.provider import Provider
from app.domain.validators import (
    ValidationError,
    validate_slot_is_future,
    validate_slot_duration,
)


class SlotService:

    @staticmethod
    def create_slot(provider_id: int, start_time: datetime, end_time: datetime) -> Slot:
        """
        Create a new availability slot for a provider.

        Invariants enforced:
        1. Provider exists
        2. Slot is in the future
        3. Slot duration matches provider's configured duration
        """
        provider = Provider.query.get(provider_id)
        if provider is None:
            raise ValidationError("Provider not found.", field="provider_id")

        # Normalize to UTC-aware
        if start_time.tzinfo is None:
            start_time = start_time.replace(tzinfo=timezone.utc)
        if end_time.tzinfo is None:
            end_time = end_time.replace(tzinfo=timezone.utc)

        validate_slot_is_future(start_time)
        validate_slot_duration(start_time, end_time, provider.slot_duration_mins)

        slot = Slot(
            provider_id=provider_id,
            start_time=start_time,
            end_time=end_time,
            is_available=True,
        )
        db.session.add(slot)
        db.session.commit()
        return slot

    @staticmethod
    def get_available_slots(provider_id: int = None) -> list[Slot]:
        """Return all future available slots, optionally filtered by provider."""
        now = datetime.now(timezone.utc)
        query = Slot.query.filter(
            Slot.is_available == True,
            Slot.start_time > now,
        )
        if provider_id:
            query = query.filter(Slot.provider_id == provider_id)
        return query.order_by(Slot.start_time.asc()).all()

    @staticmethod
    def get_slots_for_provider(provider_id: int) -> list[Slot]:
        """Return all slots (past and future) for a provider."""
        return (
            Slot.query
            .filter_by(provider_id=provider_id)
            .order_by(Slot.start_time.asc())
            .all()
        )
