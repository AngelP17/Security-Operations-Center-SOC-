"use client";

import { motion } from "framer-motion";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  AlertTriangle,
  Activity,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Factory,
  Gauge,
  Network,
  Play,
  Siren,
  Wifi,
  XCircle,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { AssetDetailDrawer } from "@/components/shared/AssetDetailDrawer";
import { RiskBadge } from "@/components/shared/RiskBadge";
import { RouteState } from "@/components/shared/RouteState";
import { useCommandCenter, useRunDemoScan } from "@/lib/hooks/use-command-center";
import { useAssets } from "@/lib/hooks/use-assets";
import { useIncidents } from "@/lib/hooks/use-incidents";
import { useEvents } from "@/lib/hooks/use-events";
import { useForgeStore } from "@/lib/store";
import type { Asset, SecurityEvent, Incident } from "@/lib/types";

const sectionMotion = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: "easeOut" as const },
};

function CommandSummary() {
  const { data, isLoading, error } = useCommandCenter();
  if (isLoading) return <RouteState type="loading" title="Loading command summary..." />;
  if (error) return <RouteState type="error" title="Command summary unavailable" message="API connection failed." />;
  const summary = data;
  const incident = summary?.highest_risk_incident;

  return (
    <motion.section className="panel summary" {...sectionMotion}>
      <div>
        <div className="eyebrow">Command Summary</div>
        {incident ? (
          <>
            <h2 style={{ marginTop: 6, fontSize: 18 }}>
              {summary.kpis?.critical_count > 0
                ? `${summary.kpis.critical_count} critical asset${summary.kpis.critical_count > 1 ? "s" : ""} need${summary.kpis.critical_count === 1 ? "s" : ""} action.`
                : `${summary.kpis?.high_count || 0} high-risk asset${(summary.kpis?.high_count || 0) > 1 ? "s" : ""} under review.`}
            </h2>
            <p className="muted" style={{ marginTop: 6 }}>
              Highest risk: {incident.incident_uid} — {incident.title} ({incident.risk_score} risk).
              {summary.recommended_action ? ` ${summary.recommended_action}` : ""}
            </p>
          </>
        ) : (
          <>
            <h2 style={{ marginTop: 6, fontSize: 18 }}>No active incidents.</h2>
            <p className="muted" style={{ marginTop: 6 }}>Run a safe demo scan to populate the command center with assets and risk decisions.</p>
          </>
        )}
      </div>
      <div className="filters" style={{ alignItems: "center" }}>
        <span className="chip"><Clock size={13} /> {summary?.data_freshness || "unknown"}</span>
        {summary?.kpis?.last_scan_at ? (
          <span className="chip mono">{new Date(summary.kpis.last_scan_at).toLocaleTimeString()}</span>
        ) : null}
      </div>
    </motion.section>
  );
}

function SecurityKpiGrid() {
  const { data } = useCommandCenter();
  const kpis = data?.kpis;
  if (!kpis) return null;

  const items = [
    { label: "Assets", value: kpis.total_assets || 0, icon: Factory, color: "var(--text)" },
    { label: "Unauthorized", value: kpis.unauthorized_count || 0, icon: XCircle, color: "var(--critical)" },
    { label: "Critical", value: kpis.critical_count || 0, icon: Siren, color: "var(--critical)" },
    { label: "Open Cases", value: kpis.open_incidents || 0, icon: AlertTriangle, color: "var(--amber)" },
    { label: "Active Scans", value: kpis.active_scans || 0, icon: Activity, color: "var(--cyan)" },
    { label: "High", value: kpis.high_count || 0, icon: ArrowUpRight, color: "var(--high)" },
  ];

  return (
    <motion.div className="grid kpi-grid" style={{ marginTop: 14, minWidth: 0, overflow: "hidden" }} {...sectionMotion} transition={{ ...sectionMotion.transition, delay: 0.05 }}>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div className="panel kpi" key={item.label} style={{ minWidth: 0, overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="muted" style={{ fontSize: 12 }}>{item.label}</span>
              <Icon size={16} color={item.color} />
            </div>
            <div className="value" style={{ color: item.color }}>{item.value}</div>
          </div>
        );
      })}
    </motion.div>
  );
}

function RiskQueue() {
  const { setSelectedAssetId, riskFilter, setRiskFilter } = useForgeStore();
  const { data, isLoading, error } = useAssets();

  if (isLoading) return <RouteState type="loading" title="Loading risk queue..." />;
  if (error) return <RouteState type="error" title="Risk queue unavailable" message="Failed to load assets from API." />;

  const items: Asset[] = (data?.items || [])
    .filter((a: Asset) => riskFilter === "all" || (a.risk_level || "low") === riskFilter)
    .sort((a: Asset, b: Asset) => (b.risk_score || 0) - (a.risk_score || 0));

  return (
    <motion.section className="panel" style={{ minHeight: 320, minWidth: 0, overflow: "hidden" }} {...sectionMotion} transition={{ ...sectionMotion.transition, delay: 0.1 }}>
      <div className="page-head">
        <div>
          <div className="eyebrow">Prioritized Risk Queue</div>
          <h2>Queue by security risk decision</h2>
        </div>
        <div className="filters">
          {["all", "critical", "high", "medium", "low"].map((level) => (
            <button className={`filter ${riskFilter === level ? "active" : ""}`} key={level} onClick={() => setRiskFilter(level)}>
              {level}
            </button>
          ))}
        </div>
      </div>
      {items.length === 0 ? (
        <RouteState type="empty" title="No assets in risk queue" message="Run a scan to discover and assess assets." />
      ) : (
        <div className="table-wrap" style={{ maxHeight: 420, overflowX: "auto" }}>
          <table style={{ minWidth: 600 }}>
            <thead>
              <tr>
                <th>Risk</th>
                <th>Asset</th>
                <th>IP</th>
                <th>Segment</th>
                <th>Auth</th>
                <th>Ports</th>
                <th>Last Seen</th>
              </tr>
            </thead>
            <tbody>
              {items.map((asset: Asset) => (
                <tr key={asset.id} onClick={() => setSelectedAssetId(asset.id)}>
                  <td><RiskBadge level={asset.risk_level || "low"} score={asset.risk_score} /></td>
                  <td style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    <strong>{asset.hostname}</strong>
                  </td>
                  <td className="mono">{asset.ip_address}</td>
                  <td>{asset.segment}</td>
                  <td>{asset.authorization_state}</td>
                  <td className="mono">{asset.open_ports?.map((p) => p.port).join(", ")}</td>
                  <td className="mono">{asset.last_seen ? new Date(asset.last_seen).toLocaleTimeString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.section>
  );
}

function ActiveIncidentPanel() {
  const { setSelectedIncidentId } = useForgeStore();
  const { data, isLoading, error } = useIncidents();

  if (isLoading) return <RouteState type="loading" title="Loading incidents..." />;
  if (error) return <RouteState type="error" title="Incidents unavailable" />;

  const openIncidents: Incident[] = (data?.items || []).filter(
    (i: Incident) => i.status !== "Closed" && i.status !== "Resolved"
  );
  const top = openIncidents.sort((a: Incident, b: Incident) => b.risk_score - a.risk_score)[0];

  if (!top) {
    return (
      <motion.section className="panel" {...sectionMotion} transition={{ ...sectionMotion.transition, delay: 0.1 }}>
        <div className="eyebrow">Active Incident</div>
        <p className="muted" style={{ marginTop: 10 }}>No open incidents. Run a scan to generate correlated incidents.</p>
      </motion.section>
    );
  }

  return (
    <motion.section className="panel" {...sectionMotion} transition={{ ...sectionMotion.transition, delay: 0.1 }}>
      <div className="page-head" style={{ marginBottom: 8 }}>
        <div>
          <div className="eyebrow">Active Incident</div>
          <h2 style={{ marginTop: 4 }}>{top.title}</h2>
        </div>
        <RiskBadge level={top.severity} score={top.risk_score} />
      </div>
      <p className="muted" style={{ marginTop: 8 }}>{top.summary}</p>
      <div className="metric-list" style={{ marginTop: 12 }}>
        <div className="metric-row"><span>Confidence</span><strong className="mono">{top.confidence_score}%</strong></div>
        <div className="metric-row"><span>Category</span><strong>{top.category}</strong></div>
        <div className="metric-row"><span>Affected Assets</span><strong>{top.affected_assets?.length || 0}</strong></div>
      </div>
      {top.recommendations?.slice(0, 2).map((rec) => (
        <div key={rec.id} className="panel" style={{ marginTop: 10, padding: 12, background: "rgba(217,154,43,.06)", overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <strong style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>#{rec.rank} {rec.action_label}</strong>
            <span className="chip" style={{ flexShrink: 0 }}>{rec.confidence}% confidence</span>
          </div>
          <p className="muted" style={{ marginTop: 6, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{rec.rationale}</p>
        </div>
      ))}
      <button className="btn primary" style={{ marginTop: 12, width: "100%" }} onClick={() => setSelectedIncidentId(top.id)}>
        Open Incident Workbench
      </button>
    </motion.section>
  );
}

function EventStream() {
  const { data, isLoading } = useEvents(20, 0);
  if (isLoading) return <RouteState type="loading" title="Loading events..." />;

  const events: SecurityEvent[] = data?.items || [];

  return (
    <motion.section className="panel" style={{ minHeight: 320, minWidth: 0, overflow: "hidden" }} {...sectionMotion} transition={{ ...sectionMotion.transition, delay: 0.15 }}>
      <div className="page-head">
        <div>
          <div className="eyebrow">Live Event Stream</div>
          <h2>Security events</h2>
        </div>
        <span className="chip"><Wifi size={13} /> live</span>
      </div>
      <div style={{ marginTop: 10, maxHeight: 380, overflow: "auto" }}>
        {events.length === 0 ? (
          <p className="muted">No events recorded.</p>
        ) : (
          events.map((event: SecurityEvent) => (
            <div className="event" key={event.id}>
              <span className="mono muted">{new Date(event.observed_at).toLocaleTimeString()}</span>
              <div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <RiskBadge level={event.severity} />
                  <strong>{event.event_type}</strong>
                </div>
                <p className="muted" style={{ fontSize: 12, marginTop: 2 }}>{event.description}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </motion.section>
  );
}

function ExposureByPort() {
  const { data } = useAssets();
  const assets: Asset[] = data?.items || [];

  const portCounts: Record<string, { count: number; risk: number }> = {};
  for (const asset of assets) {
    for (const port of asset.open_ports || []) {
      const key = `${port.port} ${port.service}`;
      if (!portCounts[key]) portCounts[key] = { count: 0, risk: 0 };
      portCounts[key].count += 1;
      const r = asset.risk_score || 0;
      if (r > portCounts[key].risk) portCounts[key].risk = r;
    }
  }
  const chartData = Object.entries(portCounts)
    .map(([port, { count, risk }]) => ({ port, count, risk }))
    .sort((a, b) => b.risk - a.risk)
    .slice(0, 8);

  return (
    <motion.section className="panel" style={{ minWidth: 0, overflow: "hidden" }} {...sectionMotion} transition={{ ...sectionMotion.transition, delay: 0.15 }}>
      <div className="eyebrow">Top Exposed Services</div>
      {chartData.length === 0 ? (
        <p className="muted" style={{ marginTop: 10 }}>No exposed services discovered yet.</p>
      ) : (
        <ResponsiveContainer width="100%" height={190}>
          <BarChart data={chartData}>
            <XAxis dataKey="port" stroke="#8892A3" fontSize={10} angle={-20} textAnchor="end" height={50} />
            <YAxis stroke="#8892A3" fontSize={11} />
            <Tooltip contentStyle={{ background: "#121824", border: "1px solid rgba(148,163,184,.18)", borderRadius: 14 }} />
            <Bar dataKey="risk" fill="#D99A2B" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </motion.section>
  );
}

function RiskBySegment() {
  const { data } = useAssets();
  const assets: Asset[] = data?.items || [];

  const segMap: Record<string, { critical: number; high: number; medium: number; low: number }> = {};
  for (const asset of assets) {
    const seg = asset.segment || "Unknown";
    if (!segMap[seg]) segMap[seg] = { critical: 0, high: 0, medium: 0, low: 0 };
    const level = (asset.risk_level || "low") as string;
    if (level in segMap[seg]) {
      segMap[seg][level as "critical" | "high" | "medium" | "low"] += 1;
    }
  }

  return (
    <motion.section className="panel" style={{ minWidth: 0, overflow: "hidden" }} {...sectionMotion} transition={{ ...sectionMotion.transition, delay: 0.2 }}>
      <div className="eyebrow">Risk by Segment</div>
      <div className="table-wrap" style={{ marginTop: 10, overflowX: "auto" }}>
        <table style={{ minWidth: 300 }}>
          <thead>
            <tr><th>Segment</th><th>Critical</th><th>High</th><th>Medium</th><th>Low</th></tr>
          </thead>
          <tbody>
            {Object.entries(segMap).map(([seg, counts]) => (
              <tr key={seg}>
                <td>{seg}</td>
                <td>{counts.critical}</td>
                <td>{counts.high}</td>
                <td>{counts.medium}</td>
                <td>{counts.low}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.section>
  );
}

function TopologyPreview() {
  const { setSelectedAssetId } = useForgeStore();
  const { data } = useAssets();
  const assets: Asset[] = (data?.items || []).slice(0, 6);

  return (
    <motion.section className="panel" style={{ minWidth: 0, overflow: "hidden" }} {...sectionMotion} transition={{ ...sectionMotion.transition, delay: 0.2 }}>
      <div className="eyebrow">Topology Preview</div>
      <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
        {assets.length === 0 ? (
          <p className="muted">No topology data.</p>
        ) : (
          assets.map((asset: Asset) => (
            <div
              key={asset.id}
              onClick={() => setSelectedAssetId(asset.id)}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: 10,
                borderRadius: 10,
                border: "1px solid var(--border)",
                cursor: "pointer",
                background: asset.risk_level === "critical" ? "rgba(239,68,68,.08)" : "transparent",
                minWidth: 0,
                overflow: "hidden",
              }}
            >
              <div style={{ minWidth: 0, overflow: "hidden" }}>
                <strong style={{ fontSize: 13, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{asset.hostname}</strong>
                <div className="mono muted" style={{ fontSize: 11 }}>{asset.ip_address}</div>
              </div>
              <RiskBadge level={asset.risk_level || "low"} score={asset.risk_score} />
            </div>
          ))
        )}
      </div>
    </motion.section>
  );
}

function ScanStatusPanel() {
  const { labMode } = useForgeStore();
  const demoScan = useRunDemoScan();

  return (
    <motion.section className="panel" style={{ minWidth: 0, overflow: "hidden" }} {...sectionMotion} transition={{ ...sectionMotion.transition, delay: 0.25 }}>
      <div className="eyebrow">Scan Status</div>
      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="muted">Mode</span>
          <span className={`chip ${labMode ? "risk-high" : "risk-low"}`}>{labMode ? "Lab mode" : "Safe demo"}</span>
        </div>
        <button
          className="btn primary"
          onClick={() => demoScan.mutate()}
          disabled={demoScan.isPending}
          style={{ width: "100%" }}
        >
          <Play size={15} /> {demoScan.isPending ? "Scanning..." : "Run safe demo scan"}
        </button>
        {demoScan.isSuccess ? (
          <div className="chip" style={{ background: "rgba(34,197,94,.1)", borderColor: "rgba(34,197,94,.3)", color: "var(--low)" }}>
            <CheckCircle2 size={13} /> {demoScan.data?.scan_uid} complete — {demoScan.data?.assets_discovered} assets discovered
          </div>
        ) : null}
        {demoScan.isError ? (
          <div className="chip" style={{ background: "rgba(239,68,68,.1)", borderColor: "rgba(239,68,68,.3)", color: "var(--critical)" }}>
            <XCircle size={13} /> Scan failed
          </div>
        ) : null}
      </div>
    </motion.section>
  );
}

export default function CommandPage() {
  return (
    <AppShell>
      <CommandSummary />
      <SecurityKpiGrid />

      <div className="grid command-grid" style={{ marginTop: 14, minWidth: 0, overflow: "hidden" }}>
        <div style={{ display: "grid", gap: 14, minWidth: 0, overflow: "hidden" }}>
          <RiskQueue />
          <div className="grid" style={{ gridTemplateColumns: "repeat(2, 1fr)", minWidth: 0, overflow: "hidden" }}>
            <ExposureByPort />
            <RiskBySegment />
          </div>
        </div>
        <div style={{ display: "grid", gap: 14, alignContent: "start", minWidth: 0, overflow: "hidden" }}>
          <ActiveIncidentPanel />
          <EventStream />
          <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", minWidth: 0, overflow: "hidden" }}>
            <TopologyPreview />
            <ScanStatusPanel />
          </div>
        </div>
      </div>

      <AssetDetailDrawer />
    </AppShell>
  );
}
