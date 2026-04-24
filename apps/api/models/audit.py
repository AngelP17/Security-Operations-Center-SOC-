from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func

from apps.api.models.database import Base


class AuditRecord(Base):
    __tablename__ = "audit_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    entity_type = Column(String)
    entity_id = Column(Integer)
    event_type = Column(String)
    actor_type = Column(String)
    actor_id = Column(String, nullable=True)
    payload_json = Column(Text, default="{}")
    source_hash = Column(String, nullable=True)
    created_at = Column(DateTime, default=func.now())


class AnalystFeedback(Base):
    __tablename__ = "analyst_feedback"

    id = Column(Integer, primary_key=True, autoincrement=True)
    entity_type = Column(String)
    entity_id = Column(Integer)
    action = Column(String)
    notes = Column(Text, nullable=True)
    actor = Column(String)
    created_at = Column(DateTime, default=func.now())


class AetherLink(Base):
    __tablename__ = "aether_links"

    id = Column(Integer, primary_key=True, autoincrement=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"))
    aether_ticket_id = Column(String, nullable=True)
    aether_ticket_url = Column(String, nullable=True)
    sync_status = Column(String, default="pending")
    last_synced_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now())
