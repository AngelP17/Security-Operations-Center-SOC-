from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from apps.api.deps import get_db
from apps.api.schemas.scans import ScanResponse, LabScanRequest, ScanStatusResponse
from apps.api.services.scan_service import scan_service

router = APIRouter(prefix="/api/scans", tags=["scans"])


@router.get("/profiles")
def list_profiles():
    return {"profiles": scan_service.list_scan_profiles()}


@router.post("/demo", response_model=ScanResponse)
def run_demo_scan(db: Session = Depends(get_db)):
    scan_run = scan_service.run_demo_scan(db)
    return ScanResponse(
        scan_uid=scan_run.scan_uid,
        mode=scan_run.mode,
        target_cidr=scan_run.target_cidr,
        profile=scan_run.profile,
        status=scan_run.status,
        progress_percent=scan_run.progress_percent,
        assets_discovered=scan_run.assets_discovered,
        observations_created=scan_run.observations_created,
        events_created=scan_run.events_created,
        safety_status=scan_run.safety_status,
        started_at=scan_run.started_at,
        completed_at=scan_run.completed_at,
    )


@router.post("/lab", response_model=ScanResponse)
def run_lab_scan(body: LabScanRequest, db: Session = Depends(get_db)):
    profile = body.profile or "deep_private"
    scan_run = scan_service.run_lab_scan(db, body.target_cidr, profile=profile)
    return ScanResponse(
        scan_uid=scan_run.scan_uid,
        mode=scan_run.mode,
        target_cidr=scan_run.target_cidr,
        profile=scan_run.profile,
        status=scan_run.status,
        progress_percent=scan_run.progress_percent,
        assets_discovered=scan_run.assets_discovered,
        observations_created=scan_run.observations_created,
        events_created=scan_run.events_created,
        safety_status=scan_run.safety_status,
        started_at=scan_run.started_at,
        completed_at=scan_run.completed_at,
    )


@router.get("/{scan_run_id}/status", response_model=ScanStatusResponse)
def get_scan_status(scan_run_id: int, db: Session = Depends(get_db)):
    return scan_service.get_scan_status(db, scan_run_id)


@router.post("/{scan_run_id}/cancel")
def cancel_scan(scan_run_id: int, db: Session = Depends(get_db)):
    return scan_service.cancel_scan(db, scan_run_id)
