from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class PortInfo(BaseModel):
    port: int
    service: str
    risk: str


class AssetResponse(BaseModel):
    id: int
    asset_uid: str
    hostname: Optional[str] = None
    ip_address: Optional[str] = None
    mac_address: Optional[str] = None
    site: Optional[str] = None
    segment: Optional[str] = None
    asset_type: Optional[str] = None
    authorization_state: Optional[str] = None
    owner: Optional[str] = None
    status: Optional[str] = None
    first_seen: Optional[datetime] = None
    last_seen: Optional[datetime] = None
    open_ports: list[PortInfo] = []
    metadata_: dict = Field(default={}, alias="metadata")
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True, "populate_by_name": True}


class AssetListResponse(BaseModel):
    items: list[AssetResponse] = []
    total: int = 0


class RiskBreakdownItem(BaseModel):
    label: str
    value: float


class AssetRiskResponse(BaseModel):
    asset_id: int
    risk_score: float
    risk_level: str
    confidence_score: float
    exposure_score: float
    authorization_score: float
    asset_criticality_score: float
    event_severity_score: float
    recency_score: float
    correlation_score: float
    uncertainty_penalty: float
    feature_snapshot: dict = {}
    triggered_rules: list[str] = []
    explanation: list[str] = []
    score_breakdown: list[RiskBreakdownItem] = []
