import {
  Activity,
  AlertTriangle,
  Cpu,
  Factory,
  FileClock,
  Gauge,
  HardDrive,
  Laptop,
  Network,
  Printer,
  Server,
  ShieldCheck
} from "lucide-react";

export type RiskLevel = "low" | "medium" | "high" | "critical";
export type AuthState = "authorized" | "unauthorized" | "unknown";
export type AssetType = "plc" | "workstation" | "server" | "laptop" | "printer" | "iot";
export type Segment = "Production" | "Corporate" | "Guest" | "Servers" | "Printers/IoT" | "Unknown";

export type Asset = {
  id: string;
  hostname: string;
  ip: string;
  mac: string;
  site: string;
  segment: Segment;
  type: AssetType;
  authorization: AuthState;
  owner: string;
  risk: number;
  riskLevel: RiskLevel;
  status: "healthy" | "watch" | "investigate";
  ports: { port: number; service: string; risk: RiskLevel }[];
  lastSeen: string;
  firstSeen: string;
  newSinceLastScan: boolean;
  triggeredRules: string[];
  reason: string;
  recommendation: string;
  evidence: string[];
  scoreBreakdown: { label: string; value: number }[];
  recentEvents: string[];
  audit: string[];
};

export type SecurityIncident = {
  id: string;
  title: string;
  severity: RiskLevel;
  status: "Open" | "Investigating" | "Contained" | "Resolved";
  risk: number;
  confidence: number;
  summary: string;
  affectedAssets: string[];
  timeline: { time: string; actor: string; event: string; summary: string }[];
  recommendations: {
    rank: number;
    action: string;
    rationale: string;
    benefit: string;
    confidence: number;
    approval: string;
  }[];
  decisionTrace: { label: string; value: number }[];
  notes: string[];
};

export const scenario =
  "Scenario: Unknown contractor laptop appeared on production segment and exposed SMB/RDP.";

export const assets: Asset[] = [
  {
    id: "asset-contractor-17",
    hostname: "UNKNOWN-LAPTOP-17",
    ip: "192.168.40.105",
    mac: "7C:8A:E1:44:19:AF",
    site: "Detroit Forge Line 2",
    segment: "Production",
    type: "laptop",
    authorization: "unauthorized",
    owner: "Unverified",
    risk: 92,
    riskLevel: "critical",
    status: "investigate",
    ports: [
      { port: 445, service: "SMB", risk: "high" },
      { port: 3389, service: "RDP", risk: "critical" },
      { port: 135, service: "RPC", risk: "high" }
    ],
    lastSeen: "2026-04-24 14:08:22",
    firstSeen: "2026-04-24 13:41:05",
    newSinceLastScan: true,
    triggeredRules: ["UNAUTH_PROD_ASSET", "RDP_PROD_EXPOSURE", "SMB_LATERAL_MOVEMENT"],
    reason: "Unauthorized contractor device on production VLAN exposing remote access and file-sharing services.",
    recommendation: "Isolate asset, verify owner, disable SMB/RDP exposure, and attach evidence to incident INC-2404-001.",
    evidence: ["ARP observation from cell switch SW-FORGE-02", "TCP connect success on 3389 and 445", "No CMDB owner match"],
    scoreBreakdown: [
      { label: "Unauthorized asset", value: 35 },
      { label: "Production segment", value: 20 },
      { label: "RDP exposed", value: 18 },
      { label: "SMB exposed", value: 12 },
      { label: "New since last scan", value: 7 }
    ],
    recentEvents: ["Observation captured", "Ports detected", "Risk decision generated", "Incident correlated"],
    audit: ["demo-scan-984 started", "asset-normalizer matched zero approved records", "risk-decision v3.2 wrote score 92"]
  },
  {
    id: "asset-plc-press-04",
    hostname: "PLC-PRESS-04",
    ip: "192.168.40.22",
    mac: "00:1B:1C:0A:44:91",
    site: "Detroit Forge Line 2",
    segment: "Production",
    type: "plc",
    authorization: "authorized",
    owner: "OT Engineering",
    risk: 78,
    riskLevel: "high",
    status: "investigate",
    ports: [
      { port: 502, service: "Modbus", risk: "high" },
      { port: 80, service: "HTTP", risk: "medium" }
    ],
    lastSeen: "2026-04-24 14:06:10",
    firstSeen: "2025-11-18 08:11:31",
    newSinceLastScan: false,
    triggeredRules: ["PLC_CLEAR_TEXT_CONTROL", "HTTP_CONFIG_UI"],
    reason: "PLC management interface reachable from a broader production subnet than policy allows.",
    recommendation: "Restrict control protocol access to engineering station and schedule firmware review.",
    evidence: ["Modbus open from scan sensor", "HTTP banner: vendor configuration console"],
    scoreBreakdown: [
      { label: "Critical OT asset", value: 24 },
      { label: "Modbus exposed", value: 26 },
      { label: "Broad subnet reachability", value: 18 },
      { label: "Authorized owner", value: -10 }
    ],
    recentEvents: ["Service exposure changed", "Risk recomputed"],
    audit: ["policy-check v2 flagged control-plane exposure", "owner verified from asset register"]
  },
  {
    id: "asset-hmi-07",
    hostname: "HMI-LINE2-07",
    ip: "192.168.40.37",
    mac: "4A:11:7D:EE:29:10",
    site: "Detroit Forge Line 2",
    segment: "Production",
    type: "workstation",
    authorization: "authorized",
    owner: "Line Operations",
    risk: 66,
    riskLevel: "high",
    status: "watch",
    ports: [
      { port: 5900, service: "VNC", risk: "critical" },
      { port: 443, service: "HTTPS", risk: "low" }
    ],
    lastSeen: "2026-04-24 14:03:40",
    firstSeen: "2024-08-03 10:20:00",
    newSinceLastScan: false,
    triggeredRules: ["VNC_EXPOSURE", "HMI_REMOTE_CONTROL"],
    reason: "Remote desktop service discovered on HMI with production process visibility.",
    recommendation: "Disable VNC or restrict to jump host with MFA and session logging.",
    evidence: ["VNC handshake observed", "Asset tagged HMI in CMDB"],
    scoreBreakdown: [
      { label: "HMI asset", value: 18 },
      { label: "VNC exposed", value: 28 },
      { label: "Production segment", value: 20 }
    ],
    recentEvents: ["Open port detected", "Recommendation generated"],
    audit: ["scan sensor detroit-02 captured tcp/5900", "response recommendation queued"]
  },
  {
    id: "asset-srv-historian",
    hostname: "SRV-HISTORIAN-01",
    ip: "10.20.4.18",
    mac: "1E:9C:22:F1:42:0B",
    site: "Detroit Forge",
    segment: "Servers",
    type: "server",
    authorization: "authorized",
    owner: "Manufacturing Data",
    risk: 54,
    riskLevel: "medium",
    status: "watch",
    ports: [
      { port: 443, service: "HTTPS", risk: "low" },
      { port: 1433, service: "MSSQL", risk: "high" }
    ],
    lastSeen: "2026-04-24 14:02:15",
    firstSeen: "2023-04-14 12:05:11",
    newSinceLastScan: false,
    triggeredRules: ["MSSQL_REACHABLE"],
    reason: "Historian database is reachable from more segments than expected.",
    recommendation: "Review firewall scope and require service account rotation evidence.",
    evidence: ["MSSQL service detected", "Server inventory owner verified"],
    scoreBreakdown: [
      { label: "Database service", value: 22 },
      { label: "Cross-segment reachability", value: 18 },
      { label: "Authorized server", value: 14 }
    ],
    recentEvents: ["Exposure chart updated"],
    audit: ["reachability graph added corporate edge", "risk decision wrote medium"]
  },
  {
    id: "asset-prn-label-03",
    hostname: "PRN-LABEL-03",
    ip: "192.168.55.43",
    mac: "A0:CE:C8:14:60:B2",
    site: "Detroit Forge",
    segment: "Printers/IoT",
    type: "printer",
    authorization: "unknown",
    owner: "Shipping",
    risk: 41,
    riskLevel: "medium",
    status: "watch",
    ports: [
      { port: 9100, service: "JetDirect", risk: "medium" },
      { port: 80, service: "HTTP", risk: "low" }
    ],
    lastSeen: "2026-04-24 13:58:02",
    firstSeen: "2026-04-20 09:00:15",
    newSinceLastScan: false,
    triggeredRules: ["UNKNOWN_IOT_OWNER"],
    reason: "Printer identity is not fully reconciled to procurement inventory.",
    recommendation: "Confirm serial number and lock management interface to printer VLAN.",
    evidence: ["MAC vendor printer class", "No serial match in asset registry"],
    scoreBreakdown: [
      { label: "Unknown authorization", value: 18 },
      { label: "IoT device", value: 10 },
      { label: "Raw print service", value: 13 }
    ],
    recentEvents: ["Owner mismatch detected"],
    audit: ["identity resolver marked authorization unknown"]
  },
  {
    id: "asset-eng-ws-12",
    hostname: "ENG-WS-12",
    ip: "10.20.8.52",
    mac: "D4:6A:6A:99:12:10",
    site: "Detroit Forge",
    segment: "Corporate",
    type: "workstation",
    authorization: "authorized",
    owner: "Controls Engineering",
    risk: 18,
    riskLevel: "low",
    status: "healthy",
    ports: [{ port: 443, service: "Agent", risk: "low" }],
    lastSeen: "2026-04-24 14:01:55",
    firstSeen: "2024-02-11 08:18:19",
    newSinceLastScan: false,
    triggeredRules: ["HEALTHY_BASELINE"],
    reason: "Authorized engineering workstation with expected telemetry only.",
    recommendation: "No action. Keep baseline monitoring active.",
    evidence: ["Agent healthy", "No risky services exposed"],
    scoreBreakdown: [{ label: "Expected state", value: 18 }],
    recentEvents: ["Heartbeat received"],
    audit: ["risk decision wrote low"]
  }
];

export const incidents: SecurityIncident[] = [
  {
    id: "INC-2404-001",
    title: "Unauthorized contractor laptop exposing SMB/RDP on production segment",
    severity: "critical",
    status: "Investigating",
    risk: 92,
    confidence: 94,
    summary:
      "ForgeSentinel correlated a newly observed unauthorized laptop with remote access exposure on the production segment. Lateral movement risk is elevated because SMB and RDP are reachable from the same cell network as PLC-PRESS-04.",
    affectedAssets: ["asset-contractor-17", "asset-plc-press-04"],
    timeline: [
      { time: "13:41:05", actor: "demo scanner", event: "Observation captured", summary: "MAC 7C:8A:E1:44:19:AF appeared on production VLAN." },
      { time: "13:43:18", actor: "service probe", event: "Ports detected", summary: "SMB, RPC, and RDP accepted TCP connections." },
      { time: "13:44:02", actor: "risk engine", event: "Risk decision generated", summary: "Score 92 critical from unauthorized status and remote services." },
      { time: "13:45:30", actor: "correlator", event: "Incident correlated", summary: "Linked contractor laptop with PLC exposure in same segment." }
    ],
    decisionTrace: [
      { label: "Unauthorized asset", value: 35 },
      { label: "Production segment", value: 20 },
      { label: "RDP exposed", value: 18 },
      { label: "SMB exposed", value: 12 },
      { label: "New since last scan", value: 7 }
    ],
    recommendations: [
      {
        rank: 1,
        action: "Isolate asset at switch port",
        rationale: "The device is unauthorized and exposes remote access services inside production.",
        benefit: "Stops lateral movement path while preserving evidence.",
        confidence: 96,
        approval: "OT lead approval required"
      },
      {
        rank: 2,
        action: "Verify owner and maintenance window",
        rationale: "Contractor activity may be legitimate but must be reconciled before restoration.",
        benefit: "Reduces false-positive closure and improves asset registry.",
        confidence: 88,
        approval: "SOC analyst can initiate"
      },
      {
        rank: 3,
        action: "Attach packet/service evidence to case",
        rationale: "Auditability requires raw observation trace for high-risk decisions.",
        benefit: "Creates production-grade incident history for compliance review.",
        confidence: 91,
        approval: "No approval required"
      }
    ],
    notes: ["Awaiting OT supervisor confirmation.", "Switch port candidate: SW-FORGE-02 gi1/0/17."]
  },
  {
    id: "INC-2404-002",
    title: "Remote access exposure detected on HMI workstation",
    severity: "high",
    status: "Open",
    risk: 66,
    confidence: 89,
    summary: "VNC is reachable on an authorized HMI. The service creates process visibility and remote-control risk.",
    affectedAssets: ["asset-hmi-07"],
    timeline: [
      { time: "12:12:20", actor: "scan sensor", event: "Service observed", summary: "VNC handshake detected on tcp/5900." },
      { time: "12:13:07", actor: "risk engine", event: "Risk recomputed", summary: "HMI remote-control feature elevated score to 66." }
    ],
    decisionTrace: [
      { label: "HMI asset", value: 18 },
      { label: "VNC exposed", value: 28 },
      { label: "Production segment", value: 20 }
    ],
    recommendations: [
      {
        rank: 1,
        action: "Restrict VNC to jump host",
        rationale: "Remote control should never be broadly reachable inside production.",
        benefit: "Reduces unauthorized operator access path.",
        confidence: 90,
        approval: "OT lead approval required"
      }
    ],
    notes: ["No active session observed."]
  }
];

export const eventStream = [
  { time: "14:08:22", severity: "critical" as RiskLevel, event: "Risk decision", entity: "UNKNOWN-LAPTOP-17", summary: "Critical risk 92 written to asset record." },
  { time: "14:07:41", severity: "high" as RiskLevel, event: "Recommendation", entity: "INC-2404-001", summary: "Isolate asset ranked as primary response." },
  { time: "14:06:10", severity: "high" as RiskLevel, event: "Exposure", entity: "PLC-PRESS-04", summary: "Modbus reachable from production scan sensor." },
  { time: "14:03:40", severity: "medium" as RiskLevel, event: "Telemetry", entity: "SRV-HISTORIAN-01", summary: "MSSQL exposure scope changed." },
  { time: "13:58:02", severity: "medium" as RiskLevel, event: "Identity", entity: "PRN-LABEL-03", summary: "Authorization remains unknown." }
];

export const replaySteps = [
  "Scan started",
  "Observation captured",
  "Asset normalized",
  "Ports detected",
  "Risk features extracted",
  "Risk decision generated",
  "Incident correlated",
  "Recommendations generated",
  "Analyst action recorded",
  "Resolution completed"
].map((event, index) => ({
  timestamp: `2026-04-24 13:${String(40 + index).padStart(2, "0")}:${String(index * 5 + 3).padStart(2, "0")}`,
  actor: index < 8 ? "ForgeSentinel automation" : "SOC analyst",
  event,
  entity: index < 6 ? "asset-contractor-17" : "INC-2404-001",
  summary:
    index === 9
      ? "Resolution pending in demo scenario."
      : `${event} for unauthorized contractor laptop investigation.`,
  raw: {
    event,
    risk_model: "risk-decision-v3.2",
    demo_safe_scan: true,
    lab_scan_opt_in: false,
    entity: index < 6 ? "asset-contractor-17" : "INC-2404-001"
  }
}));

export const exposureByPort = [
  { port: "3389 RDP", count: 1, risk: 92 },
  { port: "445 SMB", count: 1, risk: 84 },
  { port: "502 Modbus", count: 1, risk: 78 },
  { port: "5900 VNC", count: 1, risk: 66 },
  { port: "1433 MSSQL", count: 1, risk: 54 }
];

export const riskBySegment = [
  { segment: "Production", critical: 1, high: 2, medium: 0, low: 0 },
  { segment: "Servers", critical: 0, high: 0, medium: 1, low: 0 },
  { segment: "Printers/IoT", critical: 0, high: 0, medium: 1, low: 0 },
  { segment: "Corporate", critical: 0, high: 0, medium: 0, low: 1 }
];

export const assetIcon = {
  plc: Cpu,
  workstation: HardDrive,
  server: Server,
  laptop: Laptop,
  printer: Printer,
  iot: Network
};

export const navGroups = [
  {
    label: "Operations",
    items: [
      { href: "/command", label: "Command", icon: Gauge },
      { href: "/assets", label: "Assets", icon: Factory },
      { href: "/incidents", label: "Incidents", icon: AlertTriangle }
    ]
  },
  {
    label: "Investigation",
    items: [
      { href: "/topology", label: "Topology", icon: Network },
      { href: "/replay/asset-contractor-17", label: "Replay", icon: FileClock }
    ]
  },
  {
    label: "Output",
    items: [
      { href: "/reports", label: "Reports", icon: Activity },
      { href: "/settings", label: "Settings", icon: ShieldCheck }
    ]
  }
];

export function getAsset(id: string) {
  return assets.find((asset) => asset.id === id) ?? assets[0];
}

export function getIncident(id: string) {
  return incidents.find((incident) => incident.id === id) ?? incidents[0];
}

export function riskClass(level: RiskLevel) {
  return `risk-${level}`;
}
