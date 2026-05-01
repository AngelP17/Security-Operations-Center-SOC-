import json

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from apps.api.deps import get_db
from apps.api.models.event import SecurityEvent
from apps.api.schemas.events import SecurityEventResponse, EventListResponse

router = APIRouter(prefix="/api/events", tags=["events"])


@router.get("/", response_model=EventListResponse)
def list_events(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    asset_id: int = Query(None, ge=1),
    event_type: str = Query(None),
    severity: str = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(SecurityEvent)

    if asset_id:
        query = query.filter(SecurityEvent.asset_id == asset_id)
    if event_type:
        query = query.filter(SecurityEvent.event_type == event_type)
    if severity:
        query = query.filter(SecurityEvent.severity == severity)

    total = query.count()
    events = (
        query.order_by(SecurityEvent.observed_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    items = []
    for event in events:
        items.append(
            SecurityEventResponse(
                id=event.id,
                event_uid=event.event_uid,
                event_type=event.event_type,
                severity=event.severity,
                asset_id=event.asset_id,
                incident_id=event.incident_id,
                source=event.source,
                description=event.description,
                payload=json.loads(event.payload_json or "{}"),
                observed_at=event.observed_at,
                created_at=event.created_at,
            )
        )

    return EventListResponse(items=items, total=total)
