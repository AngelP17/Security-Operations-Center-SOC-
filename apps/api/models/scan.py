from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func

from apps.api.models.database import Base


class ScanRun(Base):
    __tablename__ = "scan_runs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    scan_uid = Column(String, unique=True, nullable=False)
    mode = Column(String)
    target_cidr = Column(String)
    started_at = Column(DateTime)
    completed_at = Column(DateTime, nullable=True)
    status = Column(String, default="running")
    assets_discovered = Column(Integer, default=0)
    observations_created = Column(Integer, default=0)
    events_created = Column(Integer, default=0)
    initiated_by = Column(String)
    safety_status = Column(String, default="safe")
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
