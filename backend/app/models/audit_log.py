from datetime import datetime, timezone
from app import db


class AuditLog(db.Model):
    """
    Immutable record of every booking status transition.
    Provides full observability into booking lifecycle.
    """
    __tablename__ = "audit_logs"

    id = db.Column(db.Integer, primary_key=True)
    booking_id = db.Column(db.Integer, db.ForeignKey("bookings.id"), nullable=False, index=True)
    old_status = db.Column(db.String(20))
    new_status = db.Column(db.String(20), nullable=False)
    changed_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    reason = db.Column(db.Text)
    changed_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    booking = db.relationship("Booking", back_populates="audit_logs")
    actor = db.relationship("User", foreign_keys=[changed_by])

    def to_dict(self):
        return {
            "id": self.id,
            "booking_id": self.booking_id,
            "old_status": self.old_status,
            "new_status": self.new_status,
            "changed_by": self.changed_by,
            "actor_name": self.actor.name if self.actor else None,
            "reason": self.reason,
            "changed_at": self.changed_at.isoformat(),
        }

    def __repr__(self):
        return f"<AuditLog booking#{self.booking_id}: {self.old_status} → {self.new_status}>"
