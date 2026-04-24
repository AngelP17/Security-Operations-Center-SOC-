import json

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from apps.api.deps import get_db
from apps.api.models.asset import Asset
from apps.api.models.risk import RiskDecision
from apps.api.schemas.assets import (
    AssetResponse,
    AssetListResponse,
    AssetRiskResponse,
    RiskBreakdownItem,
)

router = APIRouter(prefix="/api/assets", tags=["assets"])


@router.get("/", response_model=AssetListResponse)
def list_assets(
    segment: str = Query(None),
    authorization: str = Query(None),
    status: str = Query(None),
    db: Session = Depends(get_db),
):
    filters = {}
    if segment:
        filters["segment"] = segment
    if authorization:
        filters["authorization_state"] = authorization
    if status:
        filters["status"] = status

    query = db.query(Asset)
    if filters.get("segment"):
        query = query.filter(Asset.segment == filters["segment"])
    if filters.get("authorization_state"):
        query = query.filter(
            Asset.authorization_state == filters["authorization_state"]
        )
    if filters.get("status"):
        query = query.filter(Asset.status == filters["status"])

    assets = query.order_by(Asset.last_seen.desc()).all()
    total = len(assets)

    items = []
    for asset in assets:
        items.append(
            AssetResponse(
                id=asset.id,
                asset_uid=asset.asset_uid,
                hostname=asset.hostname,
                ip_address=asset.ip_address,
                mac_address=asset.mac_address,
                site=asset.site,
                segment=asset.segment,
                asset_type=asset.asset_type,
                authorization_state=asset.authorization_state,
                owner=asset.owner,
                status=asset.status,
                first_seen=asset.first_seen,
                last_seen=asset.last_seen,
                open_ports=asset.open_ports,
                metadata_=asset.metadata_,
                created_at=asset.created_at,
                updated_at=asset.updated_at,
            )
        )

    return AssetListResponse(items=items, total=total)


@router.get("/{asset_id}", response_model=AssetResponse)
def get_asset(asset_id: int, db: Session = Depends(get_db)):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    return AssetResponse(
        id=asset.id,
        asset_uid=asset.asset_uid,
        hostname=asset.hostname,
        ip_address=asset.ip_address,
        mac_address=asset.mac_address,
        site=asset.site,
        segment=asset.segment,
        asset_type=asset.asset_type,
        authorization_state=asset.authorization_state,
        owner=asset.owner,
        status=asset.status,
        first_seen=asset.first_seen,
        last_seen=asset.last_seen,
        open_ports=asset.open_ports,
        metadata_=asset.metadata_,
        created_at=asset.created_at,
        updated_at=asset.updated_at,
    )


@router.get("/{asset_id}/risk", response_model=AssetRiskResponse)
def get_asset_risk(asset_id: int, db: Session = Depends(get_db)):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    rd = (
        db.query(RiskDecision)
        .filter(RiskDecision.asset_id == asset_id)
        .order_by(RiskDecision.decision_ts.desc())
        .first()
    )
    if not rd:
        raise HTTPException(status_code=404, detail="Risk decision not found for asset")

    feature_snapshot = json.loads(rd.feature_snapshot_json or "{}")
    triggered_rules = json.loads(rd.triggered_rules_json or "[]")
    explanation = json.loads(rd.explanation_json or "[]")

    score_breakdown = []
    if rd.exposure_score > 0:
        score_breakdown.append(
            RiskBreakdownItem(label="Exposure", value=round(rd.exposure_score, 2))
        )
    if rd.authorization_score > 0:
        score_breakdown.append(
            RiskBreakdownItem(
                label="Authorization", value=round(rd.authorization_score, 2)
            )
        )
    if rd.asset_criticality_score > 0:
        score_breakdown.append(
            RiskBreakdownItem(
                label="Asset Criticality", value=round(rd.asset_criticality_score, 2)
            )
        )
    if rd.event_severity_score > 0:
        score_breakdown.append(
            RiskBreakdownItem(
                label="Event Severity", value=round(rd.event_severity_score, 2)
            )
        )
    if rd.recency_score > 0:
        score_breakdown.append(
            RiskBreakdownItem(label="Recency", value=round(rd.recency_score, 2))
        )
    if rd.correlation_score > 0:
        score_breakdown.append(
            RiskBreakdownItem(label="Correlation", value=round(rd.correlation_score, 2))
        )
    if rd.uncertainty_penalty > 0:
        score_breakdown.append(
            RiskBreakdownItem(
                label="Uncertainty Penalty", value=round(-rd.uncertainty_penalty, 2)
            )
        )

    return AssetRiskResponse(
        asset_id=asset_id,
        risk_score=rd.risk_score,
        risk_level=rd.risk_level,
        confidence_score=rd.confidence_score,
        exposure_score=rd.exposure_score,
        authorization_score=rd.authorization_score,
        asset_criticality_score=rd.asset_criticality_score,
        event_severity_score=rd.event_severity_score,
        recency_score=rd.recency_score,
        correlation_score=rd.correlation_score,
        uncertainty_penalty=rd.uncertainty_penalty,
        feature_snapshot=feature_snapshot,
        triggered_rules=triggered_rules,
        explanation=explanation,
        score_breakdown=score_breakdown,
    )
