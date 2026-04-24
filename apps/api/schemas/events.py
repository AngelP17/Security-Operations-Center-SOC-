from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class SecurityEventResponse(BaseModel):
    id: int
    event_uid: str
    event_type: str
    severity: str
    asset_id: Optional[int] = None
    incident_id: Optional[int] = None
    source: str
    description: str
    payload: dict = {}
    observed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class EventListResponse(BaseModel):
    items: list[SecurityEventResponse] = []
    total: int = 0
