from app import db


class Provider(db.Model):
    __tablename__ = "providers"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, unique=True)
    service_name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    slot_duration_mins = db.Column(db.Integer, nullable=False, default=30)

    # Relationships
    user = db.relationship("User", back_populates="provider_profile")
    slots = db.relationship("Slot", back_populates="provider", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.user.name if self.user else None,
            "service_name": self.service_name,
            "description": self.description,
            "slot_duration_mins": self.slot_duration_mins,
        }

    def __repr__(self):
        return f"<Provider {self.service_name}>"
