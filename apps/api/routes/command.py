import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from apps.api.deps import get_db
from apps.api.models.asset import Asset
from apps.api.models.scan import ScanRun
from apps.api.models.incident import Incident, IncidentAssetLink
from apps.api.models.risk import RiskDecision
from apps.api.schemas.command import CommandSummary, CommandKpi

router = APIRouter(prefix="/api/command", tags=["command"])


@router.get("/", response_model=CommandSummary)
def get_command_center(db: Session = Depends(get_db)):
    total_assets = db.query(Asset).count()

    risk_decisions = db.query(RiskDecision).all()
    risk_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    for rd in risk_decisions:
        level = rd.risk_level or "low"
        if level in risk_counts:
            risk_counts[level] += 1

    unauthorized_count = (
        db.query(Asset).filter(Asset.authorization_state == "unauthorized").count()
    )
    unknown_count = (
        db.query(Asset).filter(Asset.authorization_state == "unknown").count()
    )

    open_incidents = db.query(Incident).filter(Incident.status != "Closed").count()
    active_scans = db.query(ScanRun).filter(ScanRun.status == "running").count()

    last_scan = db.query(ScanRun).order_by(ScanRun.started_at.desc()).first()
    last_scan_at = None
    if last_scan and last_scan.started_at:
        last_scan_at = last_scan.started_at.isoformat()

    data_freshness = "stale"
    if last_scan and last_scan.completed_at:
        elapsed = (datetime.datetime.utcnow() - last_scan.completed_at).total_seconds()
        if elapsed < 3600:
            data_freshness = "fresh"
        elif elapsed < 86400:
            data_freshness = "aging"

    kpis = CommandKpi(
        total_assets=total_assets,
        critical_count=risk_counts["critical"],
        high_count=risk_counts["high"],
        medium_count=risk_counts["medium"],
        low_count=risk_counts["low"],
        unauthorized_count=unauthorized_count,
        unknown_count=unknown_count,
        open_incidents=open_incidents,
        active_scans=active_scans,
        last_scan_at=last_scan_at,
    )

    highest_risk_incident = None
    recommended_action = None
    highest = (
        db.query(Incident)
        .filter(Incident.status != "Closed")
        .order_by(Incident.risk_score.desc())
        .first()
    )
    if highest:
        affected = (
            db.query(IncidentAssetLink)
            .filter(IncidentAssetLink.incident_id == highest.id)
            .all()
        )
        asset_names = []
        for link in affected:
            asset = db.query(Asset).filter(Asset.id == link.asset_id).first()
            if asset:
                asset_names.append(asset.hostname or asset.ip_address or "unknown")

        highest_risk_incident = {
            "id": highest.id,
            "incident_uid": highest.incident_uid,
            "title": highest.title,
            "severity": highest.severity,
            "risk_score": highest.risk_score,
            "category": highest.category,
            "affected_assets": asset_names,
        }

        if highest.severity in ("critical", "high"):
            recommended_action = (
                f"Immediate review required for {highest.incident_uid}: {highest.title}. "
                f"Affected assets: {', '.join(asset_names[:3])}."
            )
        else:
            recommended_action = (
                f"Monitor incident {highest.incident_uid}: {highest.title}. "
                f"Risk score: {highest.risk_score}."
            )

    return CommandSummary(
        highest_risk_incident=highest_risk_incident,
        recommended_action=recommended_action,
        data_freshness=data_freshness,
        kpis=kpis,
    )
