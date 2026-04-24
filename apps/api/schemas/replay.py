from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ReplayStep(BaseModel):
    id: int
    timestamp: datetime
    actor_type: str
    actor_id: Optional[str] = None
    event_type: str
    entity_type: str
    entity_id: int
    description: str
    payload: dict = {}

    model_config = {"from_attributes": True}


class ReplayResponse(BaseModel):
    entity_type: str
    entity_id: int
    steps: list[ReplayStep] = []
