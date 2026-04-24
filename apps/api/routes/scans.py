from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from apps.api.deps import get_db
from apps.api.schemas.scans import ScanResponse, LabScanRequest
from apps.api.services.scan_service import scan_service

router = APIRouter(prefix="/api/scans", tags=["scans"])


@router.post("/demo", response_model=ScanResponse)
def run_demo_scan(db: Session = Depends(get_db)):
    scan_run = scan_service.run_demo_scan(db)
    return ScanResponse(
        scan_uid=scan_run.scan_uid,
        mode=scan_run.mode,
        target_cidr=scan_run.target_cidr,
        status=scan_run.status,
        assets_discovered=scan_run.assets_discovered,
        observations_created=scan_run.observations_created,
        events_created=scan_run.events_created,
        safety_status=scan_run.safety_status,
        started_at=scan_run.started_at,
        completed_at=scan_run.completed_at,
    )


@router.post("/lab", response_model=ScanResponse)
def run_lab_scan(body: LabScanRequest, db: Session = Depends(get_db)):
    scan_run = scan_service.run_lab_scan(db, body.target_cidr)
    return ScanResponse(
        scan_uid=scan_run.scan_uid,
        mode=scan_run.mode,
        target_cidr=scan_run.target_cidr,
        status=scan_run.status,
        assets_discovered=scan_run.assets_discovered,
        observations_created=scan_run.observations_created,
        events_created=scan_run.events_created,
        safety_status=scan_run.safety_status,
        started_at=scan_run.started_at,
        completed_at=scan_run.completed_at,
    )
