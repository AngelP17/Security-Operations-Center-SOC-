export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface PortInfo {
  port: number;
  service: string;
  risk: string;
}

export interface Asset {
  id: number;
  asset_uid: string;
  hostname: string;
  ip_address: string;
  mac_address: string;
  site: string;
  segment: string;
  asset_type: string;
  authorization_state: string;
  owner: string;
  status: string;
  first_seen?: string;
  last_seen?: string;
  open_ports: PortInfo[];
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  risk_score?: number;
  risk_level?: string;
}

export interface RecommendationItem {
  id: number;
  incident_id: number;
  rank: number;
  action_type: string;
  action_label: string;
  rationale: string;
  expected_benefit: string;
  confidence: number;
  requires_approval: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface TimelineItem {
  time: string;
  actor: string;
  event: string;
  summary: string;
}

export interface Incident {
  id: number;
  incident_uid: string;
  title: string;
  summary: string;
  severity: RiskLevel;
  status: string;
  risk_score: number;
  confidence_score: number;
  category: string;
  first_observed_at?: string;
  last_observed_at?: string;
  assigned_to?: string;
  resolution_notes?: string;
  affected_assets: string[];
  timeline: TimelineItem[];
  recommendations: RecommendationItem[];
  decision_trace: { label: string; value: number }[];
  notes: string[];
  aether_ticket_id?: string | null;
  aether_ticket_url?: string | null;
  aether_sync_status?: string | null;
}

export interface SecurityEvent {
  id: number;
  event_uid: string;
  event_type: string;
  severity: RiskLevel;
  asset_id?: number;
  incident_id?: number;
  source: string;
  description: string;
  payload: Record<string, any>;
  observed_at: string;
  created_at: string;
}

export interface CommandKpi {
  total_assets: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  unauthorized_count: number;
  unknown_count: number;
  open_incidents: number;
  active_scans: number;
  last_scan_at: string | null;
}

export interface CommandSummaryData {
  highest_risk_incident: {
    id: number;
    incident_uid: string;
    title: string;
    severity: RiskLevel;
    risk_score: number;
    category: string;
    affected_assets: string[];
  } | null;
  recommended_action: string | null;
  data_freshness: string;
  kpis: CommandKpi;
}

export interface AssetRiskData {
  asset_id: number;
  risk_score: number;
  risk_level: RiskLevel;
  confidence_score: number;
  exposure_score: number;
  authorization_score: number;
  asset_criticality_score: number;
  event_severity_score: number;
  recency_score: number;
  correlation_score: number;
  uncertainty_penalty: number;
  feature_snapshot: Record<string, any>;
  triggered_rules: string[];
  explanation: string[];
  score_breakdown: { label: string; value: number }[];
}

export interface ReplayStep {
  id: number;
  timestamp: string;
  actor_type: string;
  actor_id?: string;
  event_type: string;
  entity_type: string;
  entity_id: number;
  description: string;
  payload: Record<string, any>;
}

export interface ScanResult {
  id?: number;
  scan_uid: string;
  mode: string;
  target_cidr: string;
  profile?: string;
  status: string;
  progress_percent?: number;
  assets_discovered: number;
  observations_created: number;
  events_created: number;
  safety_status: string;
  started_at: string;
  completed_at?: string;
}

export interface ScanRunSummary {
  id: number;
  scan_uid: string;
  mode: string;
  target_cidr?: string | null;
  profile?: string | null;
  status: string;
  progress_percent: number;
  assets_discovered: number;
  observations_created: number;
  events_created: number;
  hosts_scanned: number;
  hosts_responsive: number;
  ports_open: number;
  safety_status: string;
  started_at?: string | null;
  completed_at?: string | null;
  error_message?: string | null;
}

export interface ScanDetail extends ScanRunSummary {
  initiated_by?: string | null;
  authorization_scope_id?: number | null;
  metadata: Record<string, any>;
}

export interface ScanHostResult {
  id: number;
  scan_run_id: number;
  ip_address: string;
  hostname?: string | null;
  mac_address?: string | null;
  vendor?: string | null;
  asset_type?: string | null;
  is_responsive: boolean;
  discovery_method?: string | null;
  host_latency_ms?: number | null;
  ports_scanned: number;
  ports_open: number;
  identity_confidence: number;
  identity_matched_on: string[];
  scanned_at?: string | null;
}

export interface ScanPortResult {
  id: number;
  scan_run_id: number;
  host_result_id?: number | null;
  ip_address: string;
  port: number;
  protocol: string;
  state?: string | null;
  service_guess?: string | null;
  latency_ms?: number | null;
  banner_hash?: string | null;
  evidence: Record<string, any>;
  scanned_at?: string | null;
}

export interface ExposureFinding {
  event_id: number;
  asset_id?: number | null;
  severity: string;
  title: string;
  description: string;
  rule_id?: string | null;
  category?: string | null;
  confidence?: number | null;
  affected_ports: number[];
  remediation?: string | null;
  observed_at?: string | null;
}

export interface ScanProfile {
  name: string;
  description: string;
  max_hosts: number;
  timeout: number;
  delay_between_hosts_ms: number;
  banner_grab: boolean;
  ot_protocol_probes: boolean;
  port_count: number;
  max_concurrent_hosts: number;
  rate_limit_per_second: number;
}

export interface EvidenceItem {
  id: number;
  incident_id: number;
  evidence_type: string;
  description?: string;
  summary?: string;
  source?: string;
  observed_at?: string;
  created_at?: string;
  asset_id?: number;
}

export function riskClass(level?: string) {
  return `risk-${level || "low"}`;
}
