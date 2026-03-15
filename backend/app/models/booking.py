from datetime import datetime, timezone
import enum
from app import db


class BookingStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"

    # Allowed transitions — the state machine source of truth
    @staticmethod
    def allowed_transitions():
        return {
            BookingStatus.PENDING: {BookingStatus.CONFIRMED, BookingStatus.CANCELLED},
            BookingStatus.CONFIRMED: {BookingStatus.CANCELLED},
            BookingStatus.CANCELLED: set(),  # terminal state
        }

    def can_transition_to(self, new_status: "BookingStatus") -> bool:
        return new_status in BookingStatus.allowed_transitions().get(self, set())


class Booking(db.Model):
    __tablename__ = "bookings"

    id = db.Column(db.Integer, primary_key=True)
    slot_id = db.Column(db.Integer, db.ForeignKey("slots.id"), nullable=False, unique=True)
    client_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    status = db.Column(
        db.Enum(BookingStatus, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=BookingStatus.PENDING,
    )
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    slot = db.relationship("Slot", back_populates="booking")
    client = db.relationship("User", back_populates="bookings", foreign_keys=[client_id])
    audit_logs = db.relationship("AuditLog", back_populates="booking", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "slot_id": self.slot_id,
            "client_id": self.client_id,
            "client_name": self.client.name if self.client else None,
            "status": self.status.value if self.status else None,
            "notes": self.notes,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "slot": self.slot.to_dict() if self.slot else None,
        }

    def __repr__(self):
        return f"<Booking #{self.id} [{self.status}]>"
