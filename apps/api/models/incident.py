from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime,
    Float,
    Boolean,
    ForeignKey,
)
from sqlalchemy.sql import func

from apps.api.models.database import Base


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, autoincrement=True)
    incident_uid = Column(String, unique=True, nullable=False)
    title = Column(String)
    summary = Column(Text)
    severity = Column(String)
    status = Column(String, default="Open")
    risk_score = Column(Float, default=0)
    confidence_score = Column(Float, default=0)
    category = Column(String)
    first_observed_at = Column(DateTime)
    last_observed_at = Column(DateTime)
    assigned_to = Column(String, nullable=True)
    resolution_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


class IncidentAssetLink(Base):
    __tablename__ = "incident_asset_links"

    id = Column(Integer, primary_key=True, autoincrement=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"))
    asset_id = Column(Integer, ForeignKey("assets.id"))


class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"))
    risk_decision_id = Column(Integer, ForeignKey("risk_decisions.id"), nullable=True)
    rank = Column(Integer)
    action_type = Column(String)
    action_label = Column(String)
    rationale = Column(Text)
    expected_benefit = Column(Text)
    confidence = Column(Float, default=0)
    requires_approval = Column(Boolean, default=True)
    status = Column(String, default="pending")
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
