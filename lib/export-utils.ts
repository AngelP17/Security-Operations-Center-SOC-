"use client";

import type { Asset, Incident, CommandSummaryData, SecurityEvent, ScanResult } from "@/lib/types";

function downloadBlob(content: BlobPart, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function formatDate(d?: string | null) {
  return d ? new Date(d).toISOString() : "—";
}

export function exportExecutiveSummary({
  incidents,
  assets,
  command,
}: {
  incidents: Incident[];
  assets: Asset[];
  command?: CommandSummaryData;
}) {
  const open = incidents.filter((i) => !["closed", "resolved"].includes((i.status || "").toLowerCase()));
  const critical = incidents.filter((i) => i.severity === "critical");
  const high = incidents.filter((i) => i.severity === "high");
  const unauthorized = assets.filter((a) => a.authorization_state === "unauthorized");

  const lines = [
    "FORGESENTINEL EXECUTIVE SUMMARY",
    "================================",
    `Generated: ${new Date().toISOString()}`,
    `Site: Detroit Forge`,
    `Data freshness: ${command?.data_freshness || "Unknown"}`,
    "",
    "RISK POSTURE",
    "------------",
    `Total incidents: ${incidents.length}`,
    `Open incidents: ${open.length}`,
    `Critical incidents: ${critical.length}`,
    `High incidents: ${high.length}`,
    `Total assets: ${assets.length}`,
    `Unauthorized assets: ${unauthorized.length}`,
    "",
    "LEAD INCIDENT",
    "-------------",
    command?.highest_risk_incident
      ? `UID: ${command.highest_risk_incident.incident_uid}`
      : "No active lead incident",
    command?.highest_risk_incident ? `Title: ${command.highest_risk_incident.title}` : "",
    command?.highest_risk_incident ? `Severity: ${command.highest_risk_incident.severity}` : "",
    command?.highest_risk_incident ? `Risk score: ${command.highest_risk_incident.risk_score}` : "",
    "",
    "RECOMMENDED ACTION",
    "------------------",
    command?.recommended_action || "Awaiting first recommendation",
    "",
    "OPEN INCIDENTS",
    "--------------",
    ...open.map((i) => `- [${i.severity.toUpperCase()}] ${i.incident_uid}: ${i.title} (${i.confidence_score}% confidence)`),
    "",
    "END OF REPORT",
  ];

  downloadBlob(lines.join("\n"), `forgesentinel-executive-summary-${Date.now()}.txt`, "text/plain");
}

export function exportTechnicalEvidence({
  incidents,
  assets,
  events,
}: {
  incidents: Incident[];
  assets: Asset[];
  events: SecurityEvent[];
}) {
  const payload = {
    generated_at: new Date().toISOString(),
    site: "Detroit Forge",
    summary: {
      total_incidents: incidents.length,
      total_assets: assets.length,
      total_events: events.length,
    },
    incidents: incidents.map((i) => ({
      uid: i.incident_uid,
      title: i.title,
      severity: i.severity,
      status: i.status,
      risk_score: i.risk_score,
      confidence_score: i.confidence_score,
      category: i.category,
      affected_assets: i.affected_assets,
      recommendations: i.recommendations.map((r) => ({
        action: r.action_label,
        rationale: r.rationale,
        confidence: r.confidence,
      })),
    })),
    assets: assets.map((a) => ({
      uid: a.asset_uid,
      hostname: a.hostname,
      ip: a.ip_address,
      mac: a.mac_address,
      segment: a.segment,
      type: a.asset_type,
      authorization: a.authorization_state,
      risk_level: a.risk_level,
      risk_score: a.risk_score,
      ports: a.open_ports.map((p) => ({ port: p.port, service: p.service })),
      owner: a.owner,
      last_seen: a.last_seen,
    })),
    events: events.slice(0, 50).map((e) => ({
      uid: e.event_uid,
      type: e.event_type,
      severity: e.severity,
      source: e.source,
      description: e.description,
      observed_at: e.observed_at,
    })),
  };

  downloadBlob(JSON.stringify(payload, null, 2), `forgesentinel-technical-evidence-${Date.now()}.json`, "application/json");
}

export function exportAuditReplay({
  incidents,
  command,
}: {
  incidents: Incident[];
  command?: CommandSummaryData;
}) {
  const lines = [
    "FORGESENTINEL AUDIT REPLAY",
    "==========================",
    `Generated: ${new Date().toISOString()}`,
    `Site: Detroit Forge`,
    `Data freshness: ${command?.data_freshness || "Unknown"}`,
    `Last scan: ${formatDate(command?.kpis?.last_scan_at)}`,
    "",
    "INCIDENT TIMELINE",
    "-----------------",
    ...incidents.flatMap((i) => [
      `UID: ${i.incident_uid}`,
      `  Title: ${i.title}`,
      `  Severity: ${i.severity}`,
      `  Status: ${i.status}`,
      `  Risk score: ${i.risk_score}`,
      `  Confidence: ${i.confidence_score}%`,
      `  Affected assets: ${i.affected_assets.join(", ") || "None"}`,
      `  Timeline:`,
      ...i.timeline.map((t) => `    [${t.time}] ${t.actor}: ${t.event} — ${t.summary}`),
      `  Recommendations:`,
      ...i.recommendations.map((r) => `    [${r.rank}] ${r.action_label} (${r.confidence}% confidence) — ${r.rationale}`),
      "",
    ]),
    "END OF AUDIT",
  ];

  downloadBlob(lines.join("\n"), `forgesentinel-audit-replay-${Date.now()}.txt`, "text/plain");
}

export function exportCompliancePackage({
  incidents,
  assets,
}: {
  incidents: Incident[];
  assets: Asset[];
}) {
  // CSV format for compliance
  const assetHeaders = ["asset_uid", "hostname", "ip_address", "segment", "asset_type", "authorization_state", "risk_level", "risk_score", "owner", "last_seen"];
  const assetRows = assets.map((a) => [
    a.asset_uid,
    a.hostname,
    a.ip_address,
    a.segment,
    a.asset_type,
    a.authorization_state,
    a.risk_level || "unknown",
    String(a.risk_score || 0),
    a.owner || "",
    a.last_seen || "",
  ]);

  const incidentHeaders = ["incident_uid", "title", "severity", "status", "risk_score", "confidence_score", "category", "affected_assets"];
  const incidentRows = incidents.map((i) => [
    i.incident_uid,
    i.title,
    i.severity,
    i.status,
    String(i.risk_score),
    String(i.confidence_score),
    i.category,
    i.affected_assets.join(";"),
  ]);

  const csvLines = [
    "# ForgeSentinel Compliance Export",
    `# Generated: ${new Date().toISOString()}`,
    "",
    "## ASSETS",
    assetHeaders.join(","),
    ...assetRows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
    "",
    "## INCIDENTS",
    incidentHeaders.join(","),
    ...incidentRows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
  ];

  downloadBlob(csvLines.join("\n"), `forgesentinel-compliance-${Date.now()}.csv`, "text/csv");
}

export function exportAll({
  incidents,
  assets,
  events,
  command,
}: {
  incidents: Incident[];
  assets: Asset[];
  events: SecurityEvent[];
  command?: CommandSummaryData;
}) {
  const payload = {
    generated_at: new Date().toISOString(),
    site: "Detroit Forge",
    command_summary: command,
    incidents,
    assets,
    events: events.slice(0, 100),
  };
  downloadBlob(JSON.stringify(payload, null, 2), `forgesentinel-full-export-${Date.now()}.json`, "application/json");
}
