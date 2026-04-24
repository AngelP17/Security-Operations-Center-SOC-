from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from apps.api.deps import get_db
from apps.api.schemas.replay import ReplayStep, ReplayResponse
from apps.api.services.replay_service import replay_service

router = APIRouter(prefix="/api/replay", tags=["replay"])


@router.get("/assets/{asset_id}", response_model=ReplayResponse)
def get_asset_replay(asset_id: int, db: Session = Depends(get_db)):
    records = replay_service.get_replay(db, "asset", asset_id)
    steps = []
    for record in records:
        import json

        steps.append(
            ReplayStep(
                id=record.id,
                timestamp=record.created_at,
                actor_type=record.actor_type,
                actor_id=record.actor_id,
                event_type=record.event_type,
                entity_type=record.entity_type,
                entity_id=record.entity_id,
                description=f"{record.event_type} by {record.actor_type}",
                payload=json.loads(record.payload_json or "{}"),
            )
        )
    return ReplayResponse(entity_type="asset", entity_id=asset_id, steps=steps)


@router.get("/incidents/{incident_id}", response_model=ReplayResponse)
def get_incident_replay(incident_id: int, db: Session = Depends(get_db)):
    records = replay_service.get_replay(db, "incident", incident_id)
    steps = []
    for record in records:
        import json

        steps.append(
            ReplayStep(
                id=record.id,
                timestamp=record.created_at,
                actor_type=record.actor_type,
                actor_id=record.actor_id,
                event_type=record.event_type,
                entity_type=record.entity_type,
                entity_id=record.entity_id,
                description=f"{record.event_type} by {record.actor_type}",
                payload=json.loads(record.payload_json or "{}"),
            )
        )
    return ReplayResponse(entity_type="incident", entity_id=incident_id, steps=steps)
