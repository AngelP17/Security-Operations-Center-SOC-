from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func

from apps.api.models.database import Base


class SecurityEvent(Base):
    __tablename__ = "security_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    event_uid = Column(String, unique=True, nullable=False)
    event_type = Column(String)
    severity = Column(String)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"), nullable=True)
    source = Column(String)
    description = Column(Text)
    payload_json = Column(Text, default="{}")
    observed_at = Column(DateTime)
    created_at = Column(DateTime, default=func.now())

    @property
    def payload(self):
        import json

        return json.loads(self.payload_json or "{}")

    @payload.setter
    def payload(self, value):
        import json

        self.payload_json = json.dumps(value)
