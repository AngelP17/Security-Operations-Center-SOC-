"""Background scan worker for ForgeSentinel.

Runs scans asynchronously with lifecycle control (queued, running, paused,
cancelled, completed, failed).
"""

import datetime
import json
import threading
from typing import Optional

from sqlalchemy.orm import Session

from apps.api.models.scan import (
    ScanRun,
    ScanHostResult,
    ScanPortResult,
    ScanAuthorizationScope,
)
from apps.api.models.asset import Asset
from apps.api.models.risk import RiskDecision
from apps.api.models.database import SessionLocal
from apps.api.config import settings
from apps.api.services.scan_profiles import get_profile
from apps.api.services.network_scanner import ProductionScanner
from apps.api.services.oui_provider import OUIProvider
from apps.api.services.asset_identity import AssetIdentityResolver
from apps.api.services.exposure_findings import exposure_engine
from apps.api.services.asset_service import asset_service
from apps.api.services.event_service import event_service
from apps.api.services.risk_engine import risk_engine
from apps.api.services.correlation_engine import correlation_engine
from apps.api.services.replay_service import replay_service


class ScanWorker:
    """Background worker that executes scan jobs."""

    def __init__(self):
        self._active_jobs: dict[int, ProductionScanner] = {}
        self._lock = threading.Lock()

    def _get_db(self) -> Session:
        return SessionLocal()

    def _validate_authorization(
        self, db: Session, target_cidr: str, profile_name: str
    ) -> Optional[ScanAuthorizationScope]:
        """Check if target CIDR matches an approved authorization scope."""
        import ipaddress

        try:
            network = ipaddress.ip_network(target_cidr, strict=False)
        except ValueError:
            return None

        scopes = (
            db.query(ScanAuthorizationScope)
            .filter(
                ScanAuthorizationScope.is_active.is_(True),
                ScanAuthorizationScope.expires_at > datetime.datetime.utcnow(),
            )
            .all()
        )

        for scope in scopes:
            try:
                scope_net = ipaddress.ip_network(scope.cidr, strict=False)
                if network.overlaps(scope_net):
                    allowed = json.loads(scope.allowed_profiles_json or "[]")
                    if not allowed or profile_name in allowed:
                        return scope
            except ValueError:
                continue

        return None

    def _update_scan_status(
        self,
        db: Session,
        scan_run_id: int,
        status: str,
        progress: int = None,
        error: str = None,
        **kwargs,
    ):
        """Update scan run status and metadata."""
        scan = db.query(ScanRun).filter(ScanRun.id == scan_run_id).first()
        if not scan:
            return
        scan.status = status
        if progress is not None:
            scan.progress_percent = progress
        if error:
            scan.error_message = error
        for key, value in kwargs.items():
            if hasattr(scan, key):
                setattr(scan, key, value)
        db.commit()

    def execute_scan(self, scan_run_id: int, target_cidr: str, profile_name: str):
        """Execute a scan job in the background."""
        db = self._get_db()

        try:
            # Load profile
            profile = get_profile(profile_name)
            if not profile:
                self._update_scan_status(
                    db,
                    scan_run_id,
                    "failed",
                    error=f"Unknown scan profile: {profile_name}",
                )
                return

            # Validate authorization scope
            scope = self._validate_authorization(db, target_cidr, profile_name)
            if settings.REAL_SCAN_ENABLED and not scope:
                self._update_scan_status(
                    db,
                    scan_run_id,
                    "failed",
                    error="No authorized scan scope found for target CIDR",
                )
                return

            # Update to running
            self._update_scan_status(
                db,
                scan_run_id,
                "running",
                progress=5,
                profile=profile_name,
                authorization_scope_id=scope.id if scope else None,
            )

            # Initialize scanner
            scanner = ProductionScanner(profile)
            with self._lock:
                self._active_jobs[scan_run_id] = scanner

            import ipaddress

            network = ipaddress.ip_network(target_cidr, strict=False)

            # Limit hosts by profile
            all_hosts = list(network.hosts())
            total_hosts = len(all_hosts)
            max_hosts = min(profile.max_hosts, settings.SCAN_MAX_HOSTS)

            if total_hosts > max_hosts:
                self._update_scan_status(
                    db,
                    scan_run_id,
                    "failed",
                    error=f"Target range {total_hosts} hosts exceeds max {max_hosts} for profile '{profile_name}'",
                )
                return

            # Progress callback
            def progress_callback(phase, current, total):
                pct = int((current / max(total, 1)) * 40) + 5
                if phase == "scanning":
                    pct = int((current / max(total, 1)) * 50) + 45
                self._update_scan_status(db, scan_run_id, "running", progress=pct)

            # Run scan
            scan_results = scanner.scan_network(
                network, max_hosts=max_hosts, progress_callback=progress_callback
            )

            # Check if cancelled
            scan = db.query(ScanRun).filter(ScanRun.id == scan_run_id).first()
            if scan.status == "cancel_requested":
                self._update_scan_status(db, scan_run_id, "cancelled", progress=100)
                return

            self._update_scan_status(
                db,
                scan_run_id,
                "running",
                progress=55,
                hosts_scanned=total_hosts,
                hosts_responsive=len(scan_results),
            )

            # Process results
            oui = OUIProvider(db)
            identity_resolver = AssetIdentityResolver(db)
            touched_asset_ids = set()

            assets_discovered = 0
            observations_created = 0
            events_created = 0
            ports_open_total = 0

            for host_result in scan_results:
                # Determine segment heuristically
                segment = "Unknown"
                ip = host_result["ip_address"]
                if ip.startswith("192.168."):
                    segment = "Production"
                elif ip.startswith("10.20."):
                    segment = "Servers"
                elif ip.startswith("10."):
                    segment = "Corporate"

                # Vendor lookup
                vendor_info = oui.lookup(host_result["mac_address"])
                vendor = vendor_info["vendor"]

                # Identity resolution
                identity = identity_resolver.get_identity_metadata(
                    ip_address=ip,
                    mac_address=host_result["mac_address"],
                    hostname=host_result["hostname"],
                    vendor=vendor,
                    site="Scanned Network",
                )

                # Persist host result
                host_record = ScanHostResult(
                    scan_run_id=scan_run_id,
                    ip_address=ip,
                    hostname=host_result["hostname"],
                    mac_address=host_result["mac_address"],
                    vendor=vendor,
                    asset_type=host_result.get("asset_type", "unknown"),
                    is_responsive=host_result.get("responsive", True),
                    discovery_method=",".join(
                        host_result.get("discovery_method", ["all_hosts"])
                    ),
                    ports_scanned=len(profile.ports),
                    ports_open=len(host_result["open_ports"]),
                    identity_confidence=identity.get("identity_confidence", 0.0),
                    identity_matched_on_json=json.dumps(identity.get("matched_on", [])),
                )
                db.add(host_record)
                db.flush()

                # Persist port results
                for port_result in host_result.get("port_results", []):
                    port_record = ScanPortResult(
                        scan_run_id=scan_run_id,
                        host_result_id=host_record.id,
                        ip_address=ip,
                        port=port_result["port"],
                        protocol="tcp",
                        state=port_result.get("state", "open"),
                        service_guess=port_result.get("service_guess", ""),
                        latency_ms=port_result.get("latency_ms", 0.0),
                        evidence_json=json.dumps(port_result.get("evidence", {})),
                    )
                    db.add(port_record)

                # Build port info
                port_info = [
                    {"port": p["port"], "service": p["service_guess"], "risk": "medium"}
                    for p in host_result.get("port_results", [])
                ]

                # Upsert asset
                asset = asset_service.upsert_asset(
                    db,
                    {
                        "ip_address": ip,
                        "mac_address": host_result["mac_address"],
                        "hostname": host_result["hostname"],
                        "open_ports": port_info,
                        "vendor": vendor,
                        "site": "Scanned Network",
                        "segment": segment,
                        "asset_type": host_result.get("asset_type", "unknown"),
                        "owner": "Unverified",
                        "authorization_state": "unknown",
                    },
                )
                touched_asset_ids.add(asset.id)
                assets_discovered += 1
                ports_open_total += len(host_result["open_ports"])

                # Create security event
                event_uid = f"evt-{datetime.datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{id(host_result) % 10000:04d}"
                event_service.create_event(
                    db,
                    {
                        "event_uid": event_uid,
                        "event_type": "observation_captured",
                        "severity": "low",
                        "asset_id": asset.id,
                        "source": "lab_scan",
                        "description": f"Asset {asset.hostname or asset.ip_address} discovered during lab scan — {len(host_result['open_ports'])} open ports",
                        "payload": {
                            "scan_run_id": scan_run_id,
                            "ip": ip,
                            "ports": host_result["open_ports"],
                            "vendor": vendor,
                            "mac": host_result["mac_address"],
                            "identity_confidence": identity.get("identity_confidence"),
                        },
                        "observed_at": datetime.datetime.utcnow(),
                    },
                )
                observations_created += 1
                events_created += 1

                # Generate exposure findings
                findings = exposure_engine.analyze(
                    asset_type=host_result.get("asset_type", "unknown"),
                    segment=segment,
                    open_ports=host_result["open_ports"],
                    authorization_state="unknown",
                    owner="Unverified",
                    hostname=host_result["hostname"],
                )

                for finding in findings:
                    finding_event_uid = f"evt-{datetime.datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{id(finding) % 10000:04d}"
                    event_service.create_event(
                        db,
                        {
                            "event_uid": finding_event_uid,
                            "event_type": "exposure_finding",
                            "severity": finding.severity,
                            "asset_id": asset.id,
                            "source": "exposure_engine",
                            "description": f"[{finding.rule_id}] {finding.title}: {finding.description}",
                            "payload": {
                                "scan_run_id": scan_run_id,
                                "rule_id": finding.rule_id,
                                "category": finding.category,
                                "confidence": finding.confidence,
                                "affected_ports": finding.affected_ports,
                                "remediation": finding.remediation,
                            },
                            "observed_at": datetime.datetime.utcnow(),
                        },
                    )
                    events_created += 1

            self._update_scan_status(
                db,
                scan_run_id,
                "running",
                progress=70,
                assets_discovered=assets_discovered,
                observations_created=observations_created,
                events_created=events_created,
                ports_open=ports_open_total,
            )

            # Scoped risk recomputation: only touched assets
            for asset_id in touched_asset_ids:
                asset = db.query(Asset).filter(Asset.id == asset_id).first()
                if not asset:
                    continue

                asset_events = event_service.get_events_for_asset(db, asset.id)
                existing_incidents = []

                risk_result = risk_engine.compute(
                    asset, asset_events, existing_incidents
                )

                risk_decision = RiskDecision(
                    asset_id=asset.id,
                    exposure_score=risk_result["exposure_score"],
                    authorization_score=risk_result["authorization_score"],
                    asset_criticality_score=risk_result["asset_criticality_score"],
                    event_severity_score=risk_result["event_severity_score"],
                    recency_score=risk_result["recency_score"],
                    correlation_score=risk_result["correlation_score"],
                    uncertainty_penalty=risk_result["uncertainty_penalty"],
                    risk_score=risk_result["risk_score"],
                    risk_level=risk_result["risk_level"],
                    confidence_score=risk_result["confidence_score"],
                    feature_snapshot_json=json.dumps(risk_result["feature_snapshot"]),
                    triggered_rules_json=json.dumps(risk_result["triggered_rules"]),
                    explanation_json=json.dumps(risk_result["explanation"]),
                )
                db.add(risk_decision)
                db.flush()

                incidents = correlation_engine.correlate(
                    db, asset, risk_result, asset_events
                )

                for incident in incidents:
                    if incident.risk_score < risk_result["risk_score"]:
                        incident.risk_score = risk_result["risk_score"]
                        incident.confidence_score = risk_result["confidence_score"]
                        incident.severity = risk_result["risk_level"]

                    sev_event_uid = f"evt-{datetime.datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{id(incident) % 10000:04d}"
                    event_service.create_event(
                        db,
                        {
                            "event_uid": sev_event_uid,
                            "event_type": "incident_correlated",
                            "severity": risk_result["risk_level"],
                            "asset_id": asset.id,
                            "incident_id": incident.id,
                            "source": "correlation_engine",
                            "description": f"Asset {asset.hostname or asset.ip_address} correlated to incident {incident.incident_uid}",
                            "payload": {
                                "risk_score": risk_result["risk_score"],
                                "category": incident.category,
                            },
                            "observed_at": datetime.datetime.utcnow(),
                        },
                    )
                    events_created += 1

            # Complete
            self._update_scan_status(
                db,
                scan_run_id,
                "completed",
                progress=100,
                assets_discovered=assets_discovered,
                observations_created=observations_created,
                events_created=events_created,
                ports_open=ports_open_total,
                completed_at=datetime.datetime.utcnow(),
            )

            replay_service.create_audit_record(
                db,
                entity_type="scan",
                entity_id=scan_run_id,
                event_type="scan_completed",
                actor_type="system",
                actor_id="scan_worker",
                payload={
                    "assets_discovered": assets_discovered,
                    "observations_created": observations_created,
                    "events_created": events_created,
                    "ports_open": ports_open_total,
                    "scan_type": "tcp_connect",
                    "profile": profile_name,
                    "real_data": True,
                },
            )

        except Exception as e:
            self._update_scan_status(db, scan_run_id, "failed", error=str(e)[:500])
            replay_service.create_audit_record(
                db,
                entity_type="scan",
                entity_id=scan_run_id,
                event_type="scan_failed",
                actor_type="system",
                actor_id="scan_worker",
                payload={"error": str(e)},
            )
        finally:
            with self._lock:
                self._active_jobs.pop(scan_run_id, None)
            db.close()

    def cancel_scan(self, scan_run_id: int) -> bool:
        """Request cancellation of an active scan."""
        with self._lock:
            scanner = self._active_jobs.get(scan_run_id)
            if scanner:
                scanner.cancel()
                return True
        return False


# Global worker instance
scan_worker = ScanWorker()
