from typing import Optional

from pydantic import BaseModel


class CommandKpi(BaseModel):
    total_assets: int = 0
    critical_count: int = 0
    high_count: int = 0
    medium_count: int = 0
    low_count: int = 0
    unauthorized_count: int = 0
    unknown_count: int = 0
    open_incidents: int = 0
    active_scans: int = 0
    last_scan_at: Optional[str] = None


class CommandSummary(BaseModel):
    highest_risk_incident: Optional[dict] = None
    recommended_action: Optional[str] = None
    data_freshness: str = "stale"
    kpis: CommandKpi


class TopologyNode(BaseModel):
    id: str
    label: str
    segment: str
    risk: str
    status: str


class TopologyEdge(BaseModel):
    source: str
    target: str
    relationship: str


class TopologyResponse(BaseModel):
    nodes: list[TopologyNode] = []
    edges: list[TopologyEdge] = []
