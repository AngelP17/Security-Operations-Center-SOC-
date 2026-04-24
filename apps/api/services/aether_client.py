import datetime
import json

import httpx
from sqlalchemy.orm import Session

from apps.api.config import settings
from apps.api.models.incident import Incident, IncidentAssetLink, Recommendation
from apps.api.models.asset import Asset
from apps.api.models.risk import RiskDecision
from apps.api.models.audit import AetherLink, AuditRecord
from apps.api.services.replay_service import replay_service
from fastapi import HTTPException


class AetherClient:
    def create_ticket(self, db: Session, incident_id: int) -> AetherLink:
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
                affected_assets.append(
                    {
                        "hostname": asset.hostname,
                        "ip_address": asset.ip_address,
                        "mac_address": asset.mac_address,
                        "asset_type": asset.asset_type,
                        "segment": asset.segment,
                    }
                )

        risk_decision = (
            db.query(RiskDecision)
            .filter(RiskDecision.asset_id.in_([l.asset_id for l in links]))
            .first()
        )

        recommendations = (
            db.query(Recommendation)
            .filter(Recommendation.incident_id == incident_id)
            .all()
        )

        priority_map = {"critical": "P1", "high": "P2", "medium": "P3", "low": "P4"}
        priority = priority_map.get(incident.severity, "P3")

        description_parts = [
            incident.summary or "",
            "",
            f"Risk Score: {incident.risk_score}",
            f"Confidence: {incident.confidence_score}%",
            f"Category: {incident.category}",
            "",
            "Affected Assets:",
        ]
        for a in affected_assets:
            description_parts.append(
                f"  - {a['hostname']} ({a['ip_address']}) - {a['asset_type']} in {a['segment']}"
            )

        if recommendations:
            description_parts.append("")
            description_parts.append("Recommended Actions:")
            for rec in recommendations:
                description_parts.append(
                    f"  {rec.rank}. [{rec.action_type}] {rec.action_label} (confidence: {rec.confidence}%)"
                )

        payload = {
            "title": incident.title,
            "priority": priority,
            "request_type": "Security Incident",
            "description": "\n".join(description_parts),
            "affected_assets": affected_assets,
            "risk_score": incident.risk_score,
            "evidence": (
                json.loads(risk_decision.feature_snapshot_json) if risk_decision else {}
            ),
            "recommended_actions": [
                {
                    "rank": r.rank,
                    "action": r.action_label,
                    "confidence": r.confidence,
                }
                for r in recommendations
            ],
            "forgesentinel_incident_id": incident.incident_uid,
        }

        aether_ticket_id = None
        aether_ticket_url = None
        sync_status = "pending"

        if settings.AETHER_ENABLED and settings.AETHER_API_BASE_URL:
            try:
                response = httpx.post(
                    f"{settings.AETHER_API_BASE_URL}/tickets",
                    json=payload,
                    headers={
                        "Authorization": f"Bearer {settings.AETHER_API_TOKEN}",
                        "Content-Type": "application/json",
                    },
                    timeout=30.0,
                )
                if response.status_code in (200, 201):
                    data = response.json()
                    aether_ticket_id = data.get("ticket_id", data.get("id"))
                    aether_ticket_url = data.get("ticket_url", data.get("url"))
                    sync_status = "synced"
                else:
                    sync_status = "error"
            except Exception:
                sync_status = "error"
        else:
            sync_status = "disabled"
            aether_ticket_id = f"pending-{incident_id}"

        aether_link = AetherLink(
            incident_id=incident_id,
            aether_ticket_id=aether_ticket_id,
            aether_ticket_url=aether_ticket_url,
            sync_status=sync_status,
            last_synced_at=datetime.datetime.utcnow()
            if sync_status == "synced"
            else None,
        )
        db.add(aether_link)
        db.commit()
        db.refresh(aether_link)

        replay_service.create_audit_record(
            db,
            entity_type="incident",
            entity_id=incident_id,
            event_type="aether_ticket_created",
            actor_type="system",
            actor_id="aether_client",
            payload={
                "sync_status": sync_status,
                "ticket_id": aether_ticket_id,
            },
        )

        return aether_link


aether_client = AetherClient()
