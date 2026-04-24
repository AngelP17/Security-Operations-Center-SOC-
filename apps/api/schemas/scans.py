from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ScanResponse(BaseModel):
    scan_uid: str
    mode: str
    target_cidr: Optional[str] = None
    status: str
    assets_discovered: int = 0
    observations_created: int = 0
    events_created: int = 0
    safety_status: str = "safe"
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class DemoScanRequest(BaseModel):
    pass


class LabScanRequest(BaseModel):
    target_cidr: str
