import json

from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session

from apps.api.deps import get_db
from apps.api.models.incident import Incident, IncidentAssetLink, Recommendation
from apps.api.models.asset import Asset
from apps.api.models.risk import RiskDecision
from apps.api.models.event import SecurityEvent
from apps.api.schemas.incidents import (
    IncidentResponse,
    IncidentListResponse,
    RecommendationResponse,
    TimelineItem,
    AetherTicketResponse,
)
from apps.api.services.event_service import event_service
from apps.api.services.replay_service import replay_service

router = APIRouter(prefix="/api/incidents", tags=["incidents"])


@router.get("/", response_model=IncidentListResponse)
def list_incidents(db: Session = Depends(get_db)):
    incidents = db.query(Incident).order_by(Incident.created_at.desc()).all()
    total = len(incidents)

    items = []
    for incident in incidents:
        links = (
            db.query(IncidentAssetLink)
            .filter(IncidentAssetLink.incident_id == incident.id)
            .all()
        )
        affected_assets = []
        for link in links:
            asset = db.query(Asset).filter(Asset.id == link.asset_id).first()
            if asset:
                affected_assets.append(asset.hostname or asset.ip_address or "unknown")

        items.append(
            IncidentResponse(
                id=incident.id,
                incident_uid=incident.incident_uid,
                title=incident.title,
                summary=incident.summary,
                severity=incident.severity,
                status=incident.status,
                risk_score=incident.risk_score,
                confidence_score=incident.confidence_score,
                category=incident.category,
                first_observed_at=incident.first_observed_at,
                last_observed_at=incident.last_observed_at,
                assigned_to=incident.assigned_to,
                resolution_notes=incident.resolution_notes,
                affected_assets=affected_assets,
                timeline=[],
                recommendations=[],
                decision_trace=[],
            )
        )

    return IncidentListResponse(items=items, total=total)


@router.get("/{incident_id}", response_model=IncidentResponse)
def get_incident(incident_id: int, db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    links = (
        db.query(IncidentAssetLink)
        .filter(IncidentAssetLink.incident_id == incident_id)
        .all()
    )
    affected_assets = []
    for link in links:
        asset = db.query(Asset).filter(Asset.id == link.asset_id).first()
        if asset:
            affected_assets.append(asset.hostname or asset.ip_address or "unknown")

    timeline_data = event_service.build_incident_timeline(db, incident_id)
    timeline = [TimelineItem(**item) for item in timeline_data]

    recs = (
        db.query(Recommendation)
        .filter(Recommendation.incident_id == incident_id)
        .order_by(Recommendation.rank.asc())
        .all()
    )
    recommendations = [
        RecommendationResponse(
            id=r.id,
            incident_id=r.incident_id,
            rank=r.rank,
            action_type=r.action_type,
            action_label=r.action_label,
            rationale=r.rationale,
            expected_benefit=r.expected_benefit,
            confidence=r.confidence,
            requires_approval=r.requires_approval,
            status=r.status,
            created_at=r.created_at,
            updated_at=r.updated_at,
        )
        for r in recs
    ]

    asset_ids = [link.asset_id for link in links]
    decision_trace = []
    if asset_ids:
        risk_decisions = (
            db.query(RiskDecision).filter(RiskDecision.asset_id.in_(asset_ids)).all()
        )
        for rd in risk_decisions:
            decision_trace.append(
                {
                    "asset_id": rd.asset_id,
                    "risk_score": rd.risk_score,
                    "risk_level": rd.risk_level,
                    "confidence_score": rd.confidence_score,
                    "triggered_rules": json.loads(rd.triggered_rules_json or "[]"),
                    "explanation": json.loads(rd.explanation_json or "[]"),
                }
            )

    return IncidentResponse(
        id=incident.id,
        incident_uid=incident.incident_uid,
        title=incident.title,
        summary=incident.summary,
        severity=incident.severity,
        status=incident.status,
        risk_score=incident.risk_score,
        confidence_score=incident.confidence_score,
        category=incident.category,
        first_observed_at=incident.first_observed_at,
        last_observed_at=incident.last_observed_at,
        assigned_to=incident.assigned_to,
        resolution_notes=incident.resolution_notes,
        affected_assets=affected_assets,
        timeline=timeline,
        recommendations=recommendations,
        decision_trace=decision_trace,
    )


@router.get("/{incident_id}/evidence")
def get_incident_evidence(incident_id: int, db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    events = event_service.get_events_for_incident(db, incident_id)
    result = []
    for event in events:
        result.append(
            {
                "id": event.id,
                "event_uid": event.event_uid,
                "event_type": event.event_type,
                "severity": event.severity,
                "asset_id": event.asset_id,
                "source": event.source,
                "description": event.description,
                "payload": json.loads(event.payload_json or "{}"),
                "observed_at": event.observed_at.isoformat()
                if event.observed_at
                else None,
            }
        )
    return {"items": result, "total": len(result)}


@router.post("/{incident_id}/recommendations/{rec_id}/accept")
def accept_recommendation(
    incident_id: int,
    rec_id: int,
    db: Session = Depends(get_db),
):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    rec = (
        db.query(Recommendation)
        .filter(
            Recommendation.id == rec_id,
            Recommendation.incident_id == incident_id,
        )
        .first()
    )
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")

    rec.status = "accepted"
    db.commit()
    db.refresh(rec)

    replay_service.create_audit_record(
        db,
        entity_type="recommendation",
        entity_id=rec_id,
        event_type="recommendation_accepted",
        actor_type="analyst",
        actor_id="manual",
        payload={
            "incident_id": incident_id,
            "action_type": rec.action_type,
            "action_label": rec.action_label,
        },
    )

    return {"status": "accepted", "recommendation_id": rec_id}


@router.post("/{incident_id}/recommendations/{rec_id}/reject")
def reject_recommendation(
    incident_id: int,
    rec_id: int,
    reason: str = Body(..., embed=True),
    db: Session = Depends(get_db),
):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    rec = (
        db.query(Recommendation)
        .filter(
            Recommendation.id == rec_id,
            Recommendation.incident_id == incident_id,
        )
        .first()
    )
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")

    rec.status = "rejected"
    db.commit()
    db.refresh(rec)

    replay_service.create_audit_record(
        db,
        entity_type="recommendation",
        entity_id=rec_id,
        event_type="recommendation_rejected",
        actor_type="analyst",
        actor_id="manual",
        payload={
            "incident_id": incident_id,
            "action_type": rec.action_type,
            "action_label": rec.action_label,
            "reason": reason,
        },
    )

    return {"status": "rejected", "recommendation_id": rec_id, "reason": reason}
