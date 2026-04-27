import datetime
import hashlib
import ipaddress
import json
import uuid

from fastapi import HTTPException
from sqlalchemy.orm import Session

from apps.api.config import settings
from apps.api.models.scan import ScanRun, ScanObservation
from apps.api.models.asset import Asset
from apps.api.models.event import SecurityEvent
from apps.api.models.risk import RiskDecision
from apps.api.models.audit import AuditRecord
from apps.api.services.asset_service import asset_service
from apps.api.services.event_service import event_service
from apps.api.services.risk_engine import risk_engine
from apps.api.services.correlation_engine import correlation_engine
from apps.api.services.replay_service import replay_service
from apps.api.services.network_scanner import scan_network_range, DEFAULT_SCAN_PORTS


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
    def run_demo_scan(self, db: Session) -> ScanRun:
        now = datetime.datetime.utcnow()
        scan_uid = f"scan-demo-{now.strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:6]}"

        scan_run = ScanRun(
            scan_uid=scan_uid,
            mode="demo",
            target_cidr="demo",
            started_at=now,
            status="running",
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
            event = event_service.create_event(
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
        scan_run.status = "completed"
        scan_run.completed_at = completed_at
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

    def run_lab_scan(self, db: Session, target_cidr: str) -> ScanRun:
        if not settings.REAL_SCAN_ENABLED:
            raise HTTPException(
                status_code=403,
                detail="Real network scanning is disabled. Set REAL_SCAN_ENABLED=true to enable.",
            )

        try:
            network = ipaddress.ip_network(target_cidr, strict=False)
        except ValueError:
            raise HTTPException(
                status_code=403,
                detail=f"Invalid CIDR notation: {target_cidr}",
            )

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

        now = datetime.datetime.utcnow()
        scan_uid = f"scan-lab-{now.strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:6]}"

        scan_run = ScanRun(
            scan_uid=scan_uid,
            mode="lab",
            target_cidr=target_cidr,
            started_at=now,
            status="running",
            initiated_by="analyst",
            safety_status="safe",
        )
        db.add(scan_run)
        db.flush()

        replay_service.create_audit_record(
            db,
            entity_type="scan",
            entity_id=scan_run.id,
            event_type="scan_started",
            actor_type="analyst",
            actor_id="manual",
            payload={"mode": "lab", "target_cidr": target_cidr},
        )

        assets_discovered = 0
        observations_created = 0
        events_created = 0

        # --- REAL TCP CONNECT SCANNING ---
        scan_results = scan_network_range(
            network,
            ports=DEFAULT_SCAN_PORTS,
            max_hosts=30,
            host_workers=20,
        )

        for result in scan_results:
            port_info = _build_port_info(result["open_ports"])

            obs = ScanObservation(
                scan_run_id=scan_run.id,
                ip_address=result["ip_address"],
                hostname=result["hostname"],
                mac_address=result["mac_address"],
                vendor=result["vendor"],
                open_ports_json=json.dumps(port_info),
                raw_payload_json=json.dumps(
                    {
                        "scan_type": "tcp_connect",
                        "ports_scanned": len(DEFAULT_SCAN_PORTS),
                        "ports_open": len(result["open_ports"]),
                        "vendor_detected": result["vendor"],
                        "mac_detected": result["mac_address"] is not None,
                    }
                ),
            )
            db.add(obs)
            db.flush()
            observations_created += 1

            # Determine segment heuristically
            segment = "Unknown"
            if result["ip_address"].startswith("192.168."):
                segment = "Production"
            elif result["ip_address"].startswith("10.20."):
                segment = "Servers"
            elif result["ip_address"].startswith("10."):
                segment = "Corporate"

            asset = asset_service.upsert_asset(
                db,
                {
                    "ip_address": result["ip_address"],
                    "mac_address": result["mac_address"],
                    "hostname": result["hostname"],
                    "open_ports": port_info,
                    "vendor": result["vendor"],
                    "site": "Scanned Network",
                    "segment": segment,
                    "asset_type": result["asset_type"],
                    "owner": "Unverified",
                    "authorization_state": "unknown",
                },
            )
            assets_discovered += 1

            event_uid = f"evt-{uuid.uuid4().hex[:10]}"
            event = event_service.create_event(
                db,
                {
                    "event_uid": event_uid,
                    "event_type": "observation_captured",
                    "severity": "low",
                    "asset_id": asset.id,
                    "source": "lab_scan",
                    "description": f"Asset {asset.hostname or asset.ip_address} discovered during lab scan — {len(result['open_ports'])} open ports",
                    "payload": {
                        "scan_uid": scan_uid,
                        "ip": result["ip_address"],
                        "ports": result["open_ports"],
                        "vendor": result["vendor"],
                        "mac": result["mac_address"],
                    },
                    "observed_at": now,
                },
            )
            events_created += 1

        # Run risk engine and correlation on all assets (demo + newly scanned)
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

        scan_run.assets_discovered = assets_discovered
        scan_run.observations_created = observations_created
        scan_run.events_created = events_created
        scan_run.status = "completed"
        scan_run.completed_at = datetime.datetime.utcnow()
        db.commit()
        db.refresh(scan_run)

        replay_service.create_audit_record(
            db,
            entity_type="scan",
            entity_id=scan_run.id,
            event_type="scan_completed",
            actor_type="analyst",
            actor_id="manual",
            payload={
                "assets_discovered": assets_discovered,
                "observations_created": observations_created,
                "events_created": events_created,
                "scan_type": "tcp_connect",
                "real_data": True,
            },
        )

        return scan_run


scan_service = ScanService()
