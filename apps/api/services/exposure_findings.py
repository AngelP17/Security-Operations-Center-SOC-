"""Exposure findings engine — deterministic security findings from scan evidence.

Generates actionable exposure findings without claiming CVE scanning.
Findings are explainable, auditable, and mapped to risk rules.
"""

from dataclasses import dataclass
from typing import Optional


@dataclass
class ExposureFinding:
    rule_id: str
    category: str
    severity: str  # critical, high, medium, low
    title: str
    description: str
    remediation: str
    evidence: dict
    confidence: float
    affected_ports: list[int]


class ExposureFindingEngine:
    """Generates exposure findings from scan evidence."""

    # Risky port categories
    REMOTE_ACCESS_PORTS = {3389, 5900, 22, 23}  # RDP, VNC, SSH, Telnet
    FILE_SHARE_PORTS = {445, 139}  # SMB, NetBIOS
    DATABASE_PORTS = {
        1433,
        3306,
        5432,
        1521,
        27017,
        9200,
    }  # MSSQL, MySQL, PostgreSQL, Oracle, MongoDB, Elasticsearch
    OT_CONTROL_PORTS = {
        502,
        44818,
        102,
        20000,
        47808,
        2404,
    }  # Modbus, Ethernet/IP, S7, DNP3, BACnet, IEC 60870-5-104
    PRINTER_PORTS = {9100, 631, 515}  # JetDirect, IPP, LPD
    WEB_ADMIN_PORTS = {80, 443, 8080, 8443}  # HTTP/HTTPS management
    DOMAIN_PORTS = {53, 88, 389, 636}  # DNS, Kerberos, LDAP

    def analyze(
        self,
        asset_type: str,
        segment: str,
        open_ports: list[int],
        authorization_state: str,
        owner: str,
        hostname: str = "",
        tls_evidence: Optional[dict] = None,
    ) -> list[ExposureFinding]:
        """Analyze an asset's open ports and metadata for exposure findings."""
        findings = []
        ports_set = set(open_ports)

        # Finding 1: Insecure remote administration exposed
        remote_admin = ports_set & self.REMOTE_ACCESS_PORTS
        if remote_admin:
            # Higher severity if unauthorized or unknown
            sev = (
                "critical"
                if authorization_state in ("unauthorized", "unknown")
                else "high"
            )
            findings.append(
                ExposureFinding(
                    rule_id="EXPOSURE-001",
                    category="remote_admin_exposed",
                    severity=sev,
                    title="Remote administration service exposed",
                    description=f"Remote access services detected on ports {sorted(remote_admin)}. Unauthorized access could compromise this asset.",
                    remediation="Restrict remote admin to bastion hosts or VPN. Disable unnecessary services. Enable MFA.",
                    evidence={
                        "open_ports": sorted(remote_admin),
                        "authorization": authorization_state,
                    },
                    confidence=0.95,
                    affected_ports=sorted(remote_admin),
                )
            )

        # Finding 2: File sharing exposed
        file_share = ports_set & self.FILE_SHARE_PORTS
        if file_share:
            sev = "critical" if authorization_state == "unauthorized" else "high"
            findings.append(
                ExposureFinding(
                    rule_id="EXPOSURE-002",
                    category="file_share_exposed",
                    severity=sev,
                    title="File sharing service exposed",
                    description=f"SMB/NetBIOS detected on ports {sorted(file_share)}. May expose sensitive files or permit lateral movement.",
                    remediation="Disable SMBv1. Restrict to authorized subnets. Monitor for unauthorized shares.",
                    evidence={
                        "open_ports": sorted(file_share),
                        "authorization": authorization_state,
                    },
                    confidence=0.90,
                    affected_ports=sorted(file_share),
                )
            )

        # Finding 3: OT control protocol exposed
        ot_ports = ports_set & self.OT_CONTROL_PORTS
        if ot_ports:
            sev = "critical"  # OT protocols should never be exposed
            findings.append(
                ExposureFinding(
                    rule_id="EXPOSURE-003",
                    category="ot_control_exposed",
                    severity=sev,
                    title="Industrial control protocol exposed",
                    description=f"OT control protocol detected on ports {sorted(ot_ports)}. Production network exposure is a critical risk.",
                    remediation="Segment OT traffic to dedicated VLAN. Deploy industrial firewall. Monitor with ICS-specific IDS.",
                    evidence={
                        "open_ports": sorted(ot_ports),
                        "asset_type": asset_type,
                        "segment": segment,
                    },
                    confidence=0.95,
                    affected_ports=sorted(ot_ports),
                )
            )

        # Finding 4: Database exposed
        db_ports = ports_set & self.DATABASE_PORTS
        if db_ports:
            sev = (
                "critical"
                if authorization_state in ("unauthorized", "unknown")
                else "high"
            )
            findings.append(
                ExposureFinding(
                    rule_id="EXPOSURE-004",
                    category="database_exposed",
                    severity=sev,
                    title="Database service exposed",
                    description=f"Database service detected on ports {sorted(db_ports)}. Direct exposure risks data breach.",
                    remediation="Restrict database access to application tier. Enable TLS. Audit database permissions.",
                    evidence={
                        "open_ports": sorted(db_ports),
                        "authorization": authorization_state,
                    },
                    confidence=0.90,
                    affected_ports=sorted(db_ports),
                )
            )

        # Finding 5: Printer/IoT exposure
        printer_ports = ports_set & self.PRINTER_PORTS
        if printer_ports:
            findings.append(
                ExposureFinding(
                    rule_id="EXPOSURE-005",
                    category="printer_iot_exposed",
                    severity="medium",
                    title="Printer/IoT device exposed",
                    description=f"Printer or IoT management port detected on {sorted(printer_ports)}. May leak documents or be compromised.",
                    remediation="Disable unused management interfaces. Update firmware. Segment IoT devices.",
                    evidence={
                        "open_ports": sorted(printer_ports),
                        "asset_type": asset_type,
                    },
                    confidence=0.85,
                    affected_ports=sorted(printer_ports),
                )
            )

        # Finding 6: Web admin interface exposed
        web_ports = ports_set & self.WEB_ADMIN_PORTS
        if web_ports and asset_type in ("plc", "hmi", "printer", "camera", "network"):
            findings.append(
                ExposureFinding(
                    rule_id="EXPOSURE-006",
                    category="web_admin_exposed",
                    severity="high",
                    title="Web management interface exposed",
                    description=f"Web admin interface on ports {sorted(web_ports)} for {asset_type}. Default credentials are common.",
                    remediation="Change default credentials. Enable HTTPS. Restrict admin access to management VLAN.",
                    evidence={
                        "open_ports": sorted(web_ports),
                        "asset_type": asset_type,
                    },
                    confidence=0.85,
                    affected_ports=sorted(web_ports),
                )
            )

        # Finding 7: Unknown asset in production
        if authorization_state in ("unknown", "unauthorized") and segment.lower() in (
            "production",
            "ot",
            "manufacturing",
        ):
            findings.append(
                ExposureFinding(
                    rule_id="EXPOSURE-007",
                    category="unknown_asset_production",
                    severity="high",
                    title="Unverified asset in production segment",
                    description=f"Asset with {authorization_state} authorization state found in {segment}. Requires investigation.",
                    remediation="Verify asset ownership. Update asset inventory. Apply authorization classification.",
                    evidence={
                        "authorization": authorization_state,
                        "segment": segment,
                        "owner": owner,
                    },
                    confidence=0.80,
                    affected_ports=sorted(ports_set),
                )
            )

        # Finding 8: Expired TLS certificate
        if tls_evidence and tls_evidence.get("expired"):
            findings.append(
                ExposureFinding(
                    rule_id="EXPOSURE-008",
                    category="expired_tls_certificate",
                    severity="medium",
                    title="Expired TLS certificate detected",
                    description=f"TLS certificate expired on {tls_evidence.get('expired_at')}. Clients may reject connections.",
                    remediation="Renew certificate. Automate certificate rotation. Monitor expiration dates.",
                    evidence=tls_evidence,
                    confidence=0.90,
                    affected_ports=[443, 8443],
                )
            )

        # Finding 9: Telnet specifically (always bad)
        if 23 in ports_set:
            findings.append(
                ExposureFinding(
                    rule_id="EXPOSURE-009",
                    category="telnet_exposed",
                    severity="critical",
                    title="Telnet service exposed — cleartext authentication",
                    description="Telnet (port 23) transmits credentials in cleartext. Immediate remediation required.",
                    remediation="Replace Telnet with SSH. Disable Telnet service entirely.",
                    evidence={"open_ports": [23]},
                    confidence=0.99,
                    affected_ports=[23],
                )
            )

        # Finding 10: Multi-service exposure (attack surface)
        if len(open_ports) >= 8:
            findings.append(
                ExposureFinding(
                    rule_id="EXPOSURE-010",
                    category="large_attack_surface",
                    severity="medium",
                    title="Large exposed service surface",
                    description=f"Asset exposes {len(open_ports)} services. Broad attack surface increases compromise probability.",
                    remediation="Disable unnecessary services. Apply host-based firewall rules. Regular service audit.",
                    evidence={
                        "open_port_count": len(open_ports),
                        "ports": sorted(open_ports)[:10],
                    },
                    confidence=0.75,
                    affected_ports=sorted(open_ports),
                )
            )

        return findings


exposure_engine = ExposureFindingEngine()
