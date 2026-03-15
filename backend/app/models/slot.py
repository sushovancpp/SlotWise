from datetime import datetime, timezone
from app import db


class Slot(db.Model):
    __tablename__ = "slots"

    id = db.Column(db.Integer, primary_key=True)
    provider_id = db.Column(db.Integer, db.ForeignKey("providers.id"), nullable=False, index=True)
    start_time = db.Column(db.DateTime(timezone=True), nullable=False)
    end_time = db.Column(db.DateTime(timezone=True), nullable=False)
    is_available = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    provider = db.relationship("Provider", back_populates="slots")
    booking = db.relationship("Booking", back_populates="slot", uselist=False)

    def to_dict(self):
        return {
            "id": self.id,
            "provider_id": self.provider_id,
            "provider_name": self.provider.user.name if self.provider and self.provider.user else None,
            "service_name": self.provider.service_name if self.provider else None,
            "start_time": self.start_time.isoformat(),
            "end_time": self.end_time.isoformat(),
            "is_available": self.is_available,
            "duration_mins": self.provider.slot_duration_mins if self.provider else None,
        }

    def __repr__(self):
        return f"<Slot {self.start_time} – {self.end_time}>"
