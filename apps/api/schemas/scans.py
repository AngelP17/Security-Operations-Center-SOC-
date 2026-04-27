from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ScanResponse(BaseModel):
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
