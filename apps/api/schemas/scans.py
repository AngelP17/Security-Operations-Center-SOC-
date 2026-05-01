from datetime import datetime
from typing import Optional, Any

from pydantic import BaseModel


class ScanResponse(BaseModel):
    id: Optional[int] = None
    scan_uid: str
    mode: str
    target_cidr: Optional[str] = None
    profile: Optional[str] = None
    status: str
    progress_percent: int = 0
    assets_discovered: int = 0
    observations_created: int = 0
    events_created: int = 0
    safety_status: str = "safe"
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ScanStatusResponse(BaseModel):
    id: int
    scan_uid: str
    mode: str
    target_cidr: Optional[str] = None
    profile: Optional[str] = None
    status: str
    progress_percent: int = 0
    assets_discovered: int = 0
    observations_created: int = 0
    events_created: int = 0
    hosts_scanned: int = 0
    hosts_responsive: int = 0
    ports_open: int = 0
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    error_message: Optional[str] = None

    model_config = {"from_attributes": True}


class DemoScanRequest(BaseModel):
    pass


class LabScanRequest(BaseModel):
    target_cidr: str
    profile: Optional[str] = "deep_private"


class ScanRunSummary(BaseModel):
    id: int
    scan_uid: str
    mode: str
    target_cidr: Optional[str] = None
    profile: Optional[str] = None
    status: str
    progress_percent: int = 0
    assets_discovered: int = 0
    observations_created: int = 0
    events_created: int = 0
    hosts_scanned: int = 0
    hosts_responsive: int = 0
    ports_open: int = 0
    safety_status: str = "safe"
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None

    model_config = {"from_attributes": True}


class ScanRunListResponse(BaseModel):
    items: list[ScanRunSummary]
    total: int


class ScanDetailResponse(ScanRunSummary):
    initiated_by: Optional[str] = None
    authorization_scope_id: Optional[int] = None
    metadata: dict[str, Any] = {}


class ScanHostResultResponse(BaseModel):
    id: int
    scan_run_id: int
    ip_address: str
    hostname: Optional[str] = None
    mac_address: Optional[str] = None
    vendor: Optional[str] = None
    asset_type: Optional[str] = None
    is_responsive: bool = False
    discovery_method: Optional[str] = None
    host_latency_ms: Optional[float] = None
    ports_scanned: int = 0
    ports_open: int = 0
    identity_confidence: float = 0.0
    identity_matched_on: list[str] = []
    scanned_at: Optional[datetime] = None


class ScanHostResultListResponse(BaseModel):
    items: list[ScanHostResultResponse]
    total: int


class ScanPortResultResponse(BaseModel):
    id: int
    scan_run_id: int
    host_result_id: Optional[int] = None
    ip_address: str
    port: int
    protocol: str = "tcp"
    state: Optional[str] = None
    service_guess: Optional[str] = None
    latency_ms: Optional[float] = None
    banner_hash: Optional[str] = None
    evidence: dict[str, Any] = {}
    scanned_at: Optional[datetime] = None


class ScanPortResultListResponse(BaseModel):
    items: list[ScanPortResultResponse]
    total: int


class ExposureFindingResponse(BaseModel):
    event_id: int
    asset_id: Optional[int] = None
    severity: str
    title: str
    description: str
    rule_id: Optional[str] = None
    category: Optional[str] = None
    confidence: Optional[float] = None
    affected_ports: list[int] = []
    remediation: Optional[str] = None
    observed_at: Optional[datetime] = None


class ExposureFindingListResponse(BaseModel):
    items: list[ExposureFindingResponse]
    total: int
