from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class TimelineItem(BaseModel):
    time: str
    actor: str
    event: str
    summary: str


class RecommendationResponse(BaseModel):
    id: int
    incident_id: int
    rank: int
    action_type: str
    action_label: str
    rationale: str
    expected_benefit: str
    confidence: float
    requires_approval: bool
    status: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class IncidentResponse(BaseModel):
    id: int
    incident_uid: str
    title: str
    summary: str
    severity: str
    status: str
    risk_score: float
    confidence_score: float
    category: str
    first_observed_at: Optional[datetime] = None
    last_observed_at: Optional[datetime] = None
    assigned_to: Optional[str] = None
    resolution_notes: Optional[str] = None
    affected_assets: list[str] = []
    timeline: list[TimelineItem] = []
    recommendations: list[RecommendationResponse] = []
    decision_trace: list[dict] = []

    model_config = {"from_attributes": True}


class IncidentListResponse(BaseModel):
    items: list[IncidentResponse] = []
    total: int = 0


class AetherTicketResponse(BaseModel):
    incident_id: int
    aether_ticket_id: Optional[str] = None
    aether_ticket_url: Optional[str] = None
    sync_status: str
