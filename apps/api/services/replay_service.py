import json

from sqlalchemy.orm import Session

from apps.api.models.audit import AuditRecord


class ReplayService:
    def get_replay(
        self, db: Session, entity_type: str, entity_id: int
    ) -> list[AuditRecord]:
        records = (
            db.query(AuditRecord)
            .filter(
                AuditRecord.entity_type == entity_type,
                AuditRecord.entity_id == entity_id,
            )
            .order_by(AuditRecord.created_at.asc())
            .all()
        )
        return records

    def create_audit_record(
        self,
        db: Session,
        entity_type: str,
        entity_id: int,
        event_type: str,
        actor_type: str,
        actor_id: str = None,
        payload: dict = None,
        source_hash: str = None,
    ) -> AuditRecord:
        record = AuditRecord(
            entity_type=entity_type,
            entity_id=entity_id,
            event_type=event_type,
            actor_type=actor_type,
            actor_id=actor_id,
            payload_json=json.dumps(payload or {}),
            source_hash=source_hash,
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        return record


replay_service = ReplayService()
