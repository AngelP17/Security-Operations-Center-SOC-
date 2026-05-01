import datetime
import json

from sqlalchemy.orm import Session

from apps.api.models.asset import Asset
from apps.api.models.incident import Incident, IncidentAssetLink
from apps.api.models.audit import AuditRecord
from apps.api.services.recommendation_engine import recommendation_engine


class CorrelationEngine:
    def correlate(
        self,
        db: Session,
        asset: Asset,
        risk_decision: dict,
        events: list,
    ) -> list[Incident]:
        incidents = []
        now = datetime.datetime.utcnow()
        auth = (asset.authorization_state or "").lower()
        ports = asset.open_ports or []
        port_numbers = [p.get("port", p) if isinstance(p, dict) else p for p in ports]
        atype = (asset.asset_type or "").lower()
        seg = (asset.segment or "").lower()

        patterns = []

        if auth == "unauthorized":
            has_rdp = 3389 in port_numbers
            has_smb = 445 in port_numbers
            if has_rdp or has_smb:
                svc = "RDP" if has_rdp else "SMB"
                patterns.append(
                    {
                        "category": "exposed_remote_access",
                        "title": f"Unauthorized asset exposing remote access ({svc})",
                        "severity": "high",
                        "summary": f"Asset {asset.hostname or asset.ip_address} is unauthorized and exposing {svc} service. "
                        f"This represents a significant risk of unauthorized remote control or file access.",
                    }
                )

        if auth == "unauthorized" and "production" in seg:
            patterns.append(
                {
                    "category": "unauthorized_production_asset",
                    "title": "Unauthorized asset on production network",
                    "severity": "critical",
                    "summary": f"Asset {asset.hostname or asset.ip_address} is unauthorized and operating on the production "
                    f"network segment '{asset.segment}'. This requires immediate investigation.",
                }
            )

        is_ot = atype in ("plc", "hmi", "workstation") and "production" in seg
        has_control = 502 in port_numbers
        has_remote = 5900 in port_numbers or 3389 in port_numbers
        if is_ot and (has_control or has_remote):
            svc_name = (
                "Modbus" if has_control else ("VNC" if 5900 in port_numbers else "RDP")
            )
            patterns.append(
                {
                    "category": "ot_exposure",
                    "title": f"OT asset exposing control/remote service ({svc_name})",
                    "severity": "critical",
                    "summary": f"OT asset {asset.hostname or asset.ip_address} (type: {asset.asset_type}) "
                    f"is exposing {svc_name} on the production network. "
                    f"This could allow unauthorized control of manufacturing processes.",
                }
            )

        for pattern in patterns:
            existing = (
                db.query(Incident)
                .filter(
                    Incident.category == pattern["category"],
                    Incident.status != "Closed",
                    Incident.id.in_(
                        db.query(IncidentAssetLink.incident_id).filter(
                            IncidentAssetLink.asset_id == asset.id
                        )
                    ),
                )
                .first()
            )

            if existing:
                existing.last_observed_at = now
                existing.updated_at = now
                if risk_decision.get("risk_score", 0) > existing.risk_score:
                    existing.risk_score = risk_decision.get("risk_score", 0)
                    existing.severity = risk_decision.get(
                        "risk_level", existing.severity
                    )
                link_exists = (
                    db.query(IncidentAssetLink)
                    .filter(
                        IncidentAssetLink.incident_id == existing.id,
                        IncidentAssetLink.asset_id == asset.id,
                    )
                    .first()
                )
                if not link_exists:
                    link = IncidentAssetLink(
                        incident_id=existing.id,
                        asset_id=asset.id,
                    )
                    db.add(link)
                db.commit()
                db.refresh(existing)
                incidents.append(existing)
                continue

            seq = db.query(Incident).count() + 1
            incident_uid = f"INC-{now.strftime('%y%m')}-{seq:04d}"

            incident = Incident(
                incident_uid=incident_uid,
                title=pattern["title"],
                summary=pattern["summary"],
                severity=pattern["severity"],
                status="Open",
                risk_score=risk_decision.get("risk_score", 0),
                confidence_score=risk_decision.get("confidence_score", 0),
                category=pattern["category"],
                first_observed_at=now,
                last_observed_at=now,
                assigned_to=None,
            )
            db.add(incident)
            db.flush()

            link = IncidentAssetLink(
                incident_id=incident.id,
                asset_id=asset.id,
            )
            db.add(link)

            recommendation_engine.generate(db, incident, risk_decision)

            audit = AuditRecord(
                entity_type="incident",
                entity_id=incident.id,
                event_type="incident_created",
                actor_type="system",
                actor_id="correlation_engine",
                payload_json=json.dumps(
                    {
                        "category": pattern["category"],
                        "asset_id": asset.id,
                        "risk_score": risk_decision.get("risk_score", 0),
                    }
                ),
            )
            db.add(audit)

            db.commit()
            db.refresh(incident)
            incidents.append(incident)

        return incidents


correlation_engine = CorrelationEngine()
