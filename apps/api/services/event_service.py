from sqlalchemy.orm import Session

from apps.api.models.event import SecurityEvent
from apps.api.models.audit import AuditRecord


class EventService:
    def create_event(self, db: Session, event_data: dict) -> SecurityEvent:
        import json

        event = SecurityEvent(
            event_uid=event_data.get("event_uid", ""),
            event_type=event_data.get("event_type", ""),
            severity=event_data.get("severity", "low"),
            asset_id=event_data.get("asset_id"),
            incident_id=event_data.get("incident_id"),
            source=event_data.get("source", "system"),
            description=event_data.get("description", ""),
            payload_json=json.dumps(event_data.get("payload", {})),
            observed_at=event_data.get("observed_at"),
        )
        db.add(event)
        db.commit()
        db.refresh(event)
        return event

    def get_events(
        self, db: Session, limit: int = 50, offset: int = 0
    ) -> list[SecurityEvent]:
        return (
            db.query(SecurityEvent)
            .order_by(SecurityEvent.observed_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )

    def get_events_for_asset(self, db: Session, asset_id: int) -> list[SecurityEvent]:
        return (
            db.query(SecurityEvent)
            .filter(SecurityEvent.asset_id == asset_id)
            .order_by(SecurityEvent.observed_at.desc())
            .all()
        )

    def get_events_for_incident(
        self, db: Session, incident_id: int
    ) -> list[SecurityEvent]:
        return (
            db.query(SecurityEvent)
            .filter(SecurityEvent.incident_id == incident_id)
            .order_by(SecurityEvent.observed_at.desc())
            .all()
        )

    def build_incident_timeline(self, db: Session, incident_id: int) -> list[dict]:
        events = (
            db.query(SecurityEvent)
            .filter(SecurityEvent.incident_id == incident_id)
            .order_by(SecurityEvent.observed_at.asc())
            .all()
        )
        audit_records = (
            db.query(AuditRecord)
            .filter(
                AuditRecord.entity_type == "incident",
                AuditRecord.entity_id == incident_id,
            )
            .order_by(AuditRecord.created_at.asc())
            .all()
        )

        timeline = []
        for event in events:
            timeline.append(
                {
                    "time": event.observed_at.isoformat() if event.observed_at else "",
                    "actor": event.source or "system",
                    "event": event.event_type,
                    "summary": event.description or "",
                }
            )

        for record in audit_records:
            timeline.append(
                {
                    "time": record.created_at.isoformat() if record.created_at else "",
                    "actor": f"{record.actor_type}:{record.actor_id or 'unknown'}",
                    "event": record.event_type,
                    "summary": f"{record.event_type} by {record.actor_type}",
                }
            )

        timeline.sort(key=lambda x: x["time"])
        return timeline


event_service = EventService()
