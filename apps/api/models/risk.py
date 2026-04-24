from sqlalchemy import Column, Integer, String, Text, DateTime, Float, ForeignKey
from sqlalchemy.sql import func

from apps.api.models.database import Base


class RiskDecision(Base):
    __tablename__ = "risk_decisions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    asset_id = Column(Integer, ForeignKey("assets.id"))
    incident_id = Column(Integer, ForeignKey("incidents.id"), nullable=True)
    decision_ts = Column(DateTime, default=func.now())
    exposure_score = Column(Float, default=0)
    authorization_score = Column(Float, default=0)
    asset_criticality_score = Column(Float, default=0)
    event_severity_score = Column(Float, default=0)
    recency_score = Column(Float, default=0)
    correlation_score = Column(Float, default=0)
    uncertainty_penalty = Column(Float, default=0)
    risk_score = Column(Float, default=0)
    risk_level = Column(String)
    confidence_score = Column(Float, default=0)
    feature_snapshot_json = Column(Text, default="{}")
    triggered_rules_json = Column(Text, default="[]")
    explanation_json = Column(Text, default="[]")
    rule_version = Column(String, default="v3.2")
