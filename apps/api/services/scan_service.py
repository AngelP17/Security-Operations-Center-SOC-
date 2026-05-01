"""Scan service for ForgeSentinel.

Orchestrates demo scans and lab scan job creation.
Lab scans run asynchronously via the background worker.
"""

import datetime
import ipaddress
import json
import threading
import uuid

from fastapi import HTTPException
from sqlalchemy.orm import Session

from apps.api.config import settings
from apps.api.models.scan import (
    ScanRun,
    ScanObservation,
    ScanAuthorizationScope,
    ScanHostResult,
    ScanPortResult,
)
from apps.api.models.asset import Asset
from apps.api.models.event import SecurityEvent
from apps.api.models.risk import RiskDecision
from apps.api.services.asset_service import asset_service
from apps.api.services.event_service import event_service
from apps.api.services.risk_engine import risk_engine
from apps.api.services.correlation_engine import correlation_engine
from apps.api.services.replay_service import replay_service
from apps.api.services.scan_profiles import get_profile, list_profiles
from apps.api.services.scan_worker import scan_worker
from apps.api.services.exposure_findings import exposure_engine


PORT_SERVICE_MAP = {
    445: ("SMB", "high"),
    3389: ("RDP", "high"),
    135: ("RPC", "medium"),
    502: ("Modbus", "critical"),
    80: ("HTTP", "low"),
    5900: ("VNC", "high"),
    443: ("HTTPS", "low"),
    1433: ("MSSQL", "medium"),
    9100: ("JetDirect", "medium"),
}

DEMO_FIXTURES = [
    {
        "ip_address": "192.168.40.105",
        "mac_address": "7C:8A:E1:44:19:AF",
        "hostname": "UNKNOWN-LAPTOP-17",
        "ports": [445, 3389, 135],
        "vendor": "Unknown",
        "site": "Detroit Forge Line 2",
        "segment": "Production",
        "asset_type": "laptop",
        "owner": "Unverified",
        "authorization_state": "unauthorized",
    },
    {
        "ip_address": "192.168.40.22",
        "mac_address": "00:1B:1C:0A:44:91",
        "hostname": "PLC-PRESS-04",
        "ports": [502, 80],
        "vendor": "Siemens",
        "site": "Detroit Forge Line 2",
        "segment": "Production",
        "asset_type": "plc",
        "owner": "OT Engineering",
        "authorization_state": "authorized",
    },
    {
        "ip_address": "192.168.40.37",
        "mac_address": "4A:11:7D:EE:29:10",
        "hostname": "HMI-LINE2-07",
        "ports": [5900, 443],
        "vendor": "Allen-Bradley",
        "site": "Detroit Forge Line 2",
        "segment": "Production",
        "asset_type": "workstation",
        "owner": "Line Operations",
        "authorization_state": "authorized",
    },
    {
        "ip_address": "10.20.4.18",
        "mac_address": "1E:9C:22:F1:42:0B",
        "hostname": "SRV-HISTORIAN-01",
        "ports": [443, 1433],
        "vendor": "Dell",
        "site": "Detroit Forge",
        "segment": "Servers",
        "asset_type": "server",
        "owner": "Manufacturing Data",
        "authorization_state": "authorized",
    },
    {
        "ip_address": "192.168.55.43",
        "mac_address": "A0:CE:C8:14:60:B2",
        "hostname": "PRN-LABEL-03",
        "ports": [9100, 80],
        "vendor": "HP",
        "site": "Detroit Forge",
        "segment": "Printers/IoT",
        "asset_type": "printer",
        "owner": "Shipping",
        "authorization_state": "unknown",
    },
    {
        "ip_address": "10.20.8.52",
        "mac_address": "D4:6A:6A:99:12:10",
        "hostname": "ENG-WS-12",
        "ports": [443],
        "vendor": "Lenovo",
        "site": "Detroit Forge",
        "segment": "Corporate",
        "asset_type": "workstation",
        "owner": "Controls Engineering",
        "authorization_state": "authorized",
    },
]


def _build_port_info(port_numbers: list[int]) -> list[dict]:
    result = []
    for p in port_numbers:
        if p in PORT_SERVICE_MAP:
            svc, risk = PORT_SERVICE_MAP[p]
        else:
            svc = f"Unknown-{p}"
            risk = "low"
        result.append({"port": p, "service": svc, "risk": risk})
    return result


class ScanService:
    def _serialize_scan_run(self, scan: ScanRun) -> dict:
        metadata = {}
        try:
            metadata = json.loads(scan.metadata_json or "{}")
        except json.JSONDecodeError:
            metadata = {}

        return {
            "id": scan.id,
            "scan_uid": scan.scan_uid,
            "mode": scan.mode,
            "target_cidr": scan.target_cidr,
            "profile": scan.profile,
            "status": scan.status,
            "progress_percent": scan.progress_percent,
            "assets_discovered": scan.assets_discovered,
            "observations_created": scan.observations_created,
            "events_created": scan.events_created,
            "hosts_scanned": scan.hosts_scanned,
            "hosts_responsive": scan.hosts_responsive,
            "ports_open": scan.ports_open,
            "safety_status": scan.safety_status,
            "started_at": scan.started_at,
            "completed_at": scan.completed_at,
            "error_message": scan.error_message,
            "initiated_by": scan.initiated_by,
            "authorization_scope_id": scan.authorization_scope_id,
            "metadata": metadata,
        }

    def list_scan_profiles(self) -> list[dict]:
        return list_profiles()

    def list_scans(self, db: Session, limit: int = 50, offset: int = 0) -> dict:
        query = db.query(ScanRun).order_by(ScanRun.started_at.desc(), ScanRun.id.desc())
        total = query.count()
        scans = query.offset(offset).limit(limit).all()
        return {
            "items": [self._serialize_scan_run(scan) for scan in scans],
            "total": total,
        }

    def get_scan(self, db: Session, scan_run_id: int) -> dict:
        scan = db.query(ScanRun).filter(ScanRun.id == scan_run_id).first()
        if not scan:
            raise HTTPException(status_code=404, detail="Scan not found")
        return self._serialize_scan_run(scan)

    def get_scan_hosts(self, db: Session, scan_run_id: int) -> dict:
        scan = db.query(ScanRun).filter(ScanRun.id == scan_run_id).first()
        if not scan:
            raise HTTPException(status_code=404, detail="Scan not found")

        items = (
            db.query(ScanHostResult)
            .filter(ScanHostResult.scan_run_id == scan_run_id)
            .order_by(
                ScanHostResult.ports_open.desc(),
                ScanHostResult.identity_confidence.desc(),
                ScanHostResult.ip_address.asc(),
            )
            .all()
        )

        results = []
        for item in items:
            try:
                matched_on = json.loads(item.identity_matched_on_json or "[]")
            except json.JSONDecodeError:
                matched_on = []
            results.append(
                {
                    "id": item.id,
                    "scan_run_id": item.scan_run_id,
                    "ip_address": item.ip_address,
                    "hostname": item.hostname,
                    "mac_address": item.mac_address,
                    "vendor": item.vendor,
                    "asset_type": item.asset_type,
                    "is_responsive": item.is_responsive,
                    "discovery_method": item.discovery_method,
                    "host_latency_ms": item.host_latency_ms,
                    "ports_scanned": item.ports_scanned,
                    "ports_open": item.ports_open,
                    "identity_confidence": item.identity_confidence,
                    "identity_matched_on": matched_on,
                    "scanned_at": item.scanned_at,
                }
            )

        return {"items": results, "total": len(results)}

    def get_scan_ports(self, db: Session, scan_run_id: int) -> dict:
        scan = db.query(ScanRun).filter(ScanRun.id == scan_run_id).first()
        if not scan:
            raise HTTPException(status_code=404, detail="Scan not found")

        items = (
            db.query(ScanPortResult)
            .filter(ScanPortResult.scan_run_id == scan_run_id)
            .order_by(ScanPortResult.ip_address.asc(), ScanPortResult.port.asc())
            .all()
        )

        results = []
        for item in items:
            try:
                evidence = json.loads(item.evidence_json or "{}")
            except json.JSONDecodeError:
                evidence = {}
            results.append(
                {
                    "id": item.id,
                    "scan_run_id": item.scan_run_id,
                    "host_result_id": item.host_result_id,
                    "ip_address": item.ip_address,
                    "port": item.port,
                    "protocol": item.protocol,
                    "state": item.state,
                    "service_guess": item.service_guess,
                    "latency_ms": item.latency_ms,
                    "banner_hash": item.banner_hash,
                    "evidence": evidence,
                    "scanned_at": item.scanned_at,
                }
            )

        return {"items": results, "total": len(results)}

    def get_scan_findings(self, db: Session, scan_run_id: int) -> dict:
        scan = db.query(ScanRun).filter(ScanRun.id == scan_run_id).first()
        if not scan:
            raise HTTPException(status_code=404, detail="Scan not found")

        host_results = (
            db.query(ScanHostResult)
            .filter(ScanHostResult.scan_run_id == scan_run_id)
            .all()
        )
        host_ips = {item.ip_address for item in host_results}
        candidate_assets = (
            db.query(Asset).filter(Asset.ip_address.in_(host_ips)).all()
            if host_ips
            else []
        )
        asset_ids = {asset.id for asset in candidate_assets}

        query = db.query(SecurityEvent).filter(
            SecurityEvent.source == "exposure_engine"
        )
        if asset_ids:
            query = query.filter(SecurityEvent.asset_id.in_(asset_ids))
        if scan.started_at:
            query = query.filter(SecurityEvent.observed_at >= scan.started_at)
        if scan.completed_at:
            query = query.filter(SecurityEvent.observed_at <= scan.completed_at)

        findings = []
        for event in query.order_by(SecurityEvent.observed_at.desc()).all():
            payload = event.payload or {}
            payload_scan_id = payload.get("scan_run_id")
            if payload_scan_id is not None and payload_scan_id != scan_run_id:
                continue
            title = event.description or "Exposure finding"
            if payload.get("rule_id") and ": " in title:
                title = title.split(": ", 1)[0].split("] ", 1)[-1]
            findings.append(
                {
                    "event_id": event.id,
                    "asset_id": event.asset_id,
                    "severity": event.severity or "low",
                    "title": title,
                    "description": event.description or "",
                    "rule_id": payload.get("rule_id"),
                    "category": payload.get("category"),
                    "confidence": payload.get("confidence"),
                    "affected_ports": payload.get("affected_ports", []),
                    "remediation": payload.get("remediation"),
                    "observed_at": event.observed_at,
                }
            )

        return {"items": findings, "total": len(findings)}

    def run_demo_scan(self, db: Session) -> ScanRun:
        now = datetime.datetime.utcnow()
        scan_uid = f"scan-demo-{now.strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:6]}"

        scan_run = ScanRun(
            scan_uid=scan_uid,
            mode="demo",
            target_cidr="demo",
            profile="demo",
            started_at=now,
            status="completed",
            initiated_by="system",
            safety_status="safe",
        )
        db.add(scan_run)
        db.flush()

        replay_service.create_audit_record(
            db,
            entity_type="scan",
            entity_id=scan_run.id,
            event_type="scan_started",
            actor_type="system",
            actor_id="scan_service",
            payload={"mode": "demo", "scan_uid": scan_uid},
        )

        assets_discovered = 0
        observations_created = 0
        events_created = 0

        for fixture in DEMO_FIXTURES:
            port_info = _build_port_info(fixture["ports"])

            obs = ScanObservation(
                scan_run_id=scan_run.id,
                ip_address=fixture["ip_address"],
                hostname=fixture["hostname"],
                mac_address=fixture["mac_address"],
                vendor=fixture["vendor"],
                open_ports_json=json.dumps(port_info),
                raw_payload_json=json.dumps(
                    {
                        "vendor": fixture["vendor"],
                        "site": fixture["site"],
                        "segment": fixture["segment"],
                    }
                ),
            )
            db.add(obs)
            db.flush()
            observations_created += 1

            asset = asset_service.upsert_asset(
                db,
                {
                    "ip_address": fixture["ip_address"],
                    "mac_address": fixture["mac_address"],
                    "hostname": fixture["hostname"],
                    "open_ports": port_info,
                    "vendor": fixture["vendor"],
                    "site": fixture["site"],
                    "segment": fixture["segment"],
                    "asset_type": fixture["asset_type"],
                    "owner": fixture["owner"],
                    "authorization_state": fixture["authorization_state"],
                },
            )
            assets_discovered += 1

            event_uid = f"evt-{uuid.uuid4().hex[:10]}"
            event_service.create_event(
                db,
                {
                    "event_uid": event_uid,
                    "event_type": "observation_captured",
                    "severity": "low",
                    "asset_id": asset.id,
                    "source": "demo_scan",
                    "description": f"Asset {asset.hostname or asset.ip_address} discovered during demo scan",
                    "payload": {
                        "scan_uid": scan_uid,
                        "ip": fixture["ip_address"],
                        "ports": [p["port"] for p in port_info],
                    },
                    "observed_at": now,
                },
            )
            events_created += 1

            findings = exposure_engine.analyze(
                asset_type=fixture["asset_type"],
                segment=fixture["segment"],
                open_ports=fixture["ports"],
                authorization_state=fixture["authorization_state"],
                owner=fixture["owner"],
                hostname=fixture["hostname"],
            )

            for finding in findings:
                finding_event_uid = f"evt-{uuid.uuid4().hex[:10]}"
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
                            "scan_run_id": scan_run.id,
                            "rule_id": finding.rule_id,
                            "category": finding.category,
                            "confidence": finding.confidence,
                            "affected_ports": finding.affected_ports,
                            "remediation": finding.remediation,
                        },
                        "observed_at": now,
                    },
                )
                events_created += 1

        all_assets = db.query(Asset).all()
        for asset in all_assets:
            asset_events = event_service.get_events_for_asset(db, asset.id)
            existing_incidents = []

            risk_result = risk_engine.compute(asset, asset_events, existing_incidents)

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

                sev_event_uid = f"evt-{uuid.uuid4().hex[:10]}"
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
                        "observed_at": now,
                    },
                )
                events_created += 1

        completed_at = datetime.datetime.utcnow()
        scan_run.assets_discovered = assets_discovered
        scan_run.observations_created = observations_created
        scan_run.events_created = events_created
        scan_run.completed_at = completed_at
        scan_run.progress_percent = 100
        db.commit()
        db.refresh(scan_run)

        replay_service.create_audit_record(
            db,
            entity_type="scan",
            entity_id=scan_run.id,
            event_type="scan_completed",
            actor_type="system",
            actor_id="scan_service",
            payload={
                "assets_discovered": assets_discovered,
                "observations_created": observations_created,
                "events_created": events_created,
            },
        )

        return scan_run

    def run_lab_scan(
        self, db: Session, target_cidr: str, profile: str = "deep_private"
    ) -> ScanRun:
        if not settings.REAL_SCAN_ENABLED:
            raise HTTPException(
                status_code=403,
                detail="Real network scanning is disabled. Set REAL_SCAN_ENABLED=true to enable.",
            )

        # Validate CIDR
        try:
            network = ipaddress.ip_network(target_cidr, strict=False)
        except ValueError:
            raise HTTPException(
                status_code=403,
                detail=f"Invalid CIDR notation: {target_cidr}",
            )

        # Private range check
        private_ranges = [
            ipaddress.ip_network("10.0.0.0/8"),
            ipaddress.ip_network("172.16.0.0/12"),
            ipaddress.ip_network("192.168.0.0/16"),
        ]
        is_private = any(network.overlaps(pr) for pr in private_ranges)
        if not is_private:
            raise HTTPException(
                status_code=403,
                detail="Only private network ranges are allowed for scanning.",
            )

        # Allowed CIDR check
        allowed_cidrs = [c.strip() for c in settings.SCAN_ALLOWED_CIDRS.split(",")]
        cidr_allowed = False
        for allowed in allowed_cidrs:
            try:
                allowed_net = ipaddress.ip_network(allowed, strict=False)
                if network.overlaps(allowed_net):
                    cidr_allowed = True
                    break
            except ValueError:
                continue
        if not cidr_allowed:
            raise HTTPException(
                status_code=403,
                detail=f"Target CIDR {target_cidr} is not in the allowed scan ranges.",
            )

        # Validate profile
        scan_profile = get_profile(profile)
        if not scan_profile:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown scan profile: {profile}. Available: {[p['name'] for p in list_profiles()]}",
            )

        # Check host count against profile limit
        total_hosts = len(list(network.hosts()))
        max_hosts = min(scan_profile.max_hosts, settings.SCAN_MAX_HOSTS)
        if total_hosts > max_hosts:
            raise HTTPException(
                status_code=403,
                detail=f"Target range {total_hosts} hosts exceeds max {max_hosts} for profile '{profile}'",
            )

        # Create scan job record
        now = datetime.datetime.utcnow()
        scan_uid = f"scan-lab-{now.strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:6]}"

        scan_run = ScanRun(
            scan_uid=scan_uid,
            mode="lab",
            target_cidr=target_cidr,
            profile=profile,
            started_at=now,
            status="queued",
            initiated_by="analyst",
            safety_status="safe",
            progress_percent=0,
        )
        db.add(scan_run)
        db.flush()

        replay_service.create_audit_record(
            db,
            entity_type="scan",
            entity_id=scan_run.id,
            event_type="scan_queued",
            actor_type="analyst",
            actor_id="manual",
            payload={"mode": "lab", "target_cidr": target_cidr, "profile": profile},
        )

        # Start background worker
        thread = threading.Thread(
            target=scan_worker.execute_scan,
            args=(scan_run.id, target_cidr, profile),
            daemon=True,
        )
        thread.start()

        return scan_run

    def cancel_scan(self, db: Session, scan_run_id: int) -> dict:
        """Request cancellation of a running scan."""
        scan = db.query(ScanRun).filter(ScanRun.id == scan_run_id).first()
        if not scan:
            raise HTTPException(status_code=404, detail="Scan not found")

        if scan.status not in ("queued", "running"):
            raise HTTPException(
                status_code=400,
                detail=f"Cannot cancel scan in '{scan.status}' state",
            )

        scan.status = "cancel_requested"
        db.commit()

        # Signal worker
        scan_worker.cancel_scan(scan_run_id)

        return {"scan_id": scan_run_id, "status": "cancel_requested"}

    def get_scan_status(self, db: Session, scan_run_id: int) -> dict:
        """Get scan status with progress."""
        scan = db.query(ScanRun).filter(ScanRun.id == scan_run_id).first()
        if not scan:
            raise HTTPException(status_code=404, detail="Scan not found")

        return {
            "id": scan.id,
            "scan_uid": scan.scan_uid,
            "mode": scan.mode,
            "target_cidr": scan.target_cidr,
            "profile": scan.profile,
            "status": scan.status,
            "progress_percent": scan.progress_percent,
            "assets_discovered": scan.assets_discovered,
            "observations_created": scan.observations_created,
            "events_created": scan.events_created,
            "hosts_scanned": scan.hosts_scanned,
            "hosts_responsive": scan.hosts_responsive,
            "ports_open": scan.ports_open,
            "started_at": scan.started_at.isoformat() if scan.started_at else None,
            "completed_at": scan.completed_at.isoformat()
            if scan.completed_at
            else None,
            "error_message": scan.error_message,
        }

    # --- Scan Authorization Scopes ---

    def create_scan_scope(self, db: Session, data: dict) -> dict:
        """Create a new scan authorization scope."""
        import ipaddress

        try:
            ipaddress.ip_network(data["cidr"], strict=False)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid CIDR: {data['cidr']}")

        scope = ScanAuthorizationScope(
            cidr=data["cidr"],
            site=data.get("site", ""),
            environment=data.get("environment", "production"),
            approved_by=data.get("approved_by", ""),
            approval_ticket=data.get("approval_ticket", ""),
            expires_at=datetime.datetime.fromisoformat(data["expires_at"])
            if data.get("expires_at")
            else None,
            allowed_profiles_json=json.dumps(data.get("allowed_profiles", [])),
            is_active=data.get("is_active", True),
        )
        db.add(scope)
        db.commit()
        db.refresh(scope)
        return {
            "id": scope.id,
            "cidr": scope.cidr,
            "site": scope.site,
            "environment": scope.environment,
            "approved_by": scope.approved_by,
            "expires_at": scope.expires_at.isoformat() if scope.expires_at else None,
            "allowed_profiles": json.loads(scope.allowed_profiles_json or "[]"),
            "is_active": scope.is_active,
            "created_at": scope.created_at.isoformat() if scope.created_at else None,
        }

    def list_scan_scopes(self, db: Session) -> dict:
        """List all scan authorization scopes."""
        scopes = (
            db.query(ScanAuthorizationScope)
            .order_by(ScanAuthorizationScope.created_at.desc())
            .all()
        )
        return {
            "items": [
                {
                    "id": s.id,
                    "cidr": s.cidr,
                    "site": s.site,
                    "environment": s.environment,
                    "approved_by": s.approved_by,
                    "approval_ticket": s.approval_ticket,
                    "expires_at": s.expires_at.isoformat() if s.expires_at else None,
                    "allowed_profiles": json.loads(s.allowed_profiles_json or "[]"),
                    "is_active": s.is_active,
                    "created_at": s.created_at.isoformat() if s.created_at else None,
                }
                for s in scopes
            ],
            "total": len(scopes),
        }

    def delete_scan_scope(self, db: Session, scope_id: int) -> dict:
        """Delete a scan authorization scope."""
        scope = (
            db.query(ScanAuthorizationScope)
            .filter(ScanAuthorizationScope.id == scope_id)
            .first()
        )
        if not scope:
            raise HTTPException(status_code=404, detail="Scope not found")
        db.delete(scope)
        db.commit()
        return {"id": scope_id, "deleted": True}

    # --- Evidence Export ---

    def export_scan_json(self, db: Session, scan_run_id: int) -> dict:
        """Export full scan evidence as JSON package."""
        scan = db.query(ScanRun).filter(ScanRun.id == scan_run_id).first()
        if not scan:
            raise HTTPException(status_code=404, detail="Scan not found")

        hosts = (
            db.query(ScanHostResult)
            .filter(ScanHostResult.scan_run_id == scan_run_id)
            .all()
        )
        ports = (
            db.query(ScanPortResult)
            .filter(ScanPortResult.scan_run_id == scan_run_id)
            .all()
        )
        findings = self.get_scan_findings(db, scan_run_id)

        return {
            "scan": {
                "scan_uid": scan.scan_uid,
                "mode": scan.mode,
                "target_cidr": scan.target_cidr,
                "profile": scan.profile,
                "status": scan.status,
                "started_at": scan.started_at.isoformat() if scan.started_at else None,
                "completed_at": scan.completed_at.isoformat()
                if scan.completed_at
                else None,
            },
            "hosts": [
                {
                    "ip_address": h.ip_address,
                    "hostname": h.hostname,
                    "mac_address": h.mac_address,
                    "vendor": h.vendor,
                    "asset_type": h.asset_type,
                    "discovery_method": h.discovery_method,
                    "ports_open": h.ports_open,
                    "identity_confidence": h.identity_confidence,
                }
                for h in hosts
            ],
            "ports": [
                {
                    "ip_address": p.ip_address,
                    "port": p.port,
                    "protocol": p.protocol,
                    "state": p.state,
                    "service_guess": p.service_guess,
                    "latency_ms": p.latency_ms,
                    "evidence": json.loads(p.evidence_json or "{}"),
                }
                for p in ports
            ],
            "findings": findings.get("items", []),
            "exported_at": datetime.datetime.utcnow().isoformat(),
        }

    def export_scan_csv(self, db: Session, scan_run_id: int) -> str:
        """Export scan host results as CSV."""
        import csv
        import io

        scan = db.query(ScanRun).filter(ScanRun.id == scan_run_id).first()
        if not scan:
            raise HTTPException(status_code=404, detail="Scan not found")

        hosts = (
            db.query(ScanHostResult)
            .filter(ScanHostResult.scan_run_id == scan_run_id)
            .all()
        )
        ports = (
            db.query(ScanPortResult)
            .filter(ScanPortResult.scan_run_id == scan_run_id)
            .all()
        )

        port_map = {}
        for p in ports:
            if p.ip_address not in port_map:
                port_map[p.ip_address] = []
            port_map[p.ip_address].append(f"{p.port}/{p.protocol}={p.state}")

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(
            [
                "scan_uid",
                "ip_address",
                "hostname",
                "mac_address",
                "vendor",
                "asset_type",
                "discovery_method",
                "ports_open_count",
                "open_ports_detail",
                "identity_confidence",
            ]
        )
        for h in hosts:
            writer.writerow(
                [
                    scan.scan_uid,
                    h.ip_address,
                    h.hostname,
                    h.mac_address,
                    h.vendor,
                    h.asset_type,
                    h.discovery_method,
                    h.ports_open,
                    "; ".join(port_map.get(h.ip_address, [])),
                    h.identity_confidence,
                ]
            )

        return output.getvalue()


scan_service = ScanService()
