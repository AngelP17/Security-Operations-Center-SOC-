from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime,
    Float,
    ForeignKey,
    Boolean,
)
from sqlalchemy.sql import func

from apps.api.models.database import Base


class ScanRun(Base):
    __tablename__ = "scan_runs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    scan_uid = Column(String, unique=True, nullable=False)
    mode = Column(String)  # demo, lab
    target_cidr = Column(String)
    profile = Column(String, default="deep_private")
    started_at = Column(DateTime)
    completed_at = Column(DateTime, nullable=True)
    status = Column(
        String, default="queued"
    )  # queued, running, paused, cancel_requested, cancelled, completed, failed, partial
    progress_percent = Column(Integer, default=0)
    assets_discovered = Column(Integer, default=0)
    observations_created = Column(Integer, default=0)
    events_created = Column(Integer, default=0)
    hosts_scanned = Column(Integer, default=0)
    hosts_responsive = Column(Integer, default=0)
    ports_scanned = Column(Integer, default=0)
    ports_open = Column(Integer, default=0)
    initiated_by = Column(String)
    safety_status = Column(String, default="safe")
    authorization_scope_id = Column(Integer, nullable=True)
    error_message = Column(Text, nullable=True)
    metadata_json = Column(Text, default="{}")


class ScanObservation(Base):
    __tablename__ = "scan_observations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    scan_run_id = Column(Integer, nullable=False)
    ip_address = Column(String)
    hostname = Column(String)
    mac_address = Column(String)
    vendor = Column(String)
    open_ports_json = Column(Text, default="[]")
    raw_payload_json = Column(Text, default="{}")
    created_at = Column(DateTime, default=func.now())


class ScanHostResult(Base):
    """Per-host scan evidence for audit replay."""

    __tablename__ = "scan_host_results"

    id = Column(Integer, primary_key=True, autoincrement=True)
    scan_run_id = Column(Integer, ForeignKey("scan_runs.id"), nullable=False)
    ip_address = Column(String, nullable=False)
    hostname = Column(String)
    mac_address = Column(String)
    vendor = Column(String)
    asset_type = Column(String)
    is_responsive = Column(Boolean, default=False)
    discovery_method = Column(String)  # icmp, arp, tcp_ping, all_hosts
    host_latency_ms = Column(Float)
    ports_scanned = Column(Integer, default=0)
    ports_open = Column(Integer, default=0)
    identity_confidence = Column(Float, default=0.0)
    identity_matched_on_json = Column(Text, default="[]")
    scanned_at = Column(DateTime, default=func.now())


class ScanPortResult(Base):
    """Per-port scan evidence for audit replay."""

    __tablename__ = "scan_port_results"

    id = Column(Integer, primary_key=True, autoincrement=True)
    scan_run_id = Column(Integer, ForeignKey("scan_runs.id"), nullable=False)
    host_result_id = Column(Integer, ForeignKey("scan_host_results.id"), nullable=True)
    ip_address = Column(String, nullable=False)
    port = Column(Integer, nullable=False)
    protocol = Column(String, default="tcp")
    state = Column(String)  # open, closed, filtered, timeout, error
    service_guess = Column(String)
    latency_ms = Column(Float)
    banner_hash = Column(String, nullable=True)
    evidence_json = Column(Text, default="{}")  # TLS info, HTTP headers, etc.
    scanned_at = Column(DateTime, default=func.now())


class ScanAuthorizationScope(Base):
    """Approved scan authorization scopes for governance."""

    __tablename__ = "scan_authorization_scopes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    cidr = Column(String, nullable=False)
    site = Column(String)
    environment = Column(String, default="production")
    approved_by = Column(String)
    approval_ticket = Column(String)
    expires_at = Column(DateTime)
    allowed_profiles_json = Column(Text, default="[]")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
