"use client";

import { useMemo, useState } from "react";
import ReactFlow, { Background, Controls, MiniMap, useReactFlow, type Edge, type Node } from "reactflow";
import "reactflow/dist/style.css";
import Link from "next/link";
import {
  Cpu,
  HardDrive,
  Laptop,
  Network,
  Printer,
  Server,
  Monitor,
  X,
  ShieldCheck,
  ExternalLink,
  Ticket,
  FileText,
  Globe,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Zap,
  ChevronRight,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { RiskBadge } from "@/components/shared/RiskBadge";
import { RouteState } from "@/components/shared/RouteState";
import { useAssets, useAsset, useAssetRisk } from "@/lib/hooks/use-assets";
import { useAssetReplay } from "@/lib/hooks/use-replay";
import { useIncidents, useIncidentEvidence } from "@/lib/hooks/use-incidents";
import type { Asset, Incident } from "@/lib/types";

const assetIconMap: Record<string, React.ComponentType<{ size?: number | string; color?: string }>> = {
  plc: Cpu,
  workstation: Monitor,
  server: Server,
  laptop: Laptop,
  printer: Printer,
  iot: Network,
};

const MAX_NODES_PER_SEGMENT_ROW = 4;
const NODE_WIDTH = 280;
const NODE_HEIGHT = 126;

function NodeCard({ data }: { data: { id: string; label: string; ip?: string; type: string; auth?: string; ports?: string; risk_level?: string; risk_score?: number } }) {
  const Icon = assetIconMap[data.type] || Monitor;
  return (
    <div className={`node-card node-${data.risk_level || "low"}`}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(244,241,234,0.06)", display: "grid", placeItems: "center" }}>
            <Icon size={14} color="var(--amber)" />
          </div>
          <div>
            <strong style={{ display: "block", fontSize: 12 }}>{data.label}</strong>
            <div className="mono muted" style={{ fontSize: 10, marginTop: 1 }}>{data.ip}</div>
          </div>
        </div>
        <RiskBadge level={data.risk_level || "low"} score={data.risk_score || 0} />
      </div>
      <div className="node-meta" style={{ marginTop: 8 }}>
        <span>{data.auth || "unknown"}</span>
        <span>{data.ports || "no ports"}</span>
      </div>
    </div>
  );
}

function SegmentNode({ data }: { data: { label: string; count: number } }) {
  return (
    <div className="segment-node">
      <strong>{data.label}</strong>
      <span className="mono muted">{data.count} assets</span>
    </div>
  );
}

function TopologyControls({ onReset }: { onReset: () => void }) {
  const { fitView } = useReactFlow();
  return (
    <div style={{ position: "absolute", top: 14, left: 14, zIndex: 10, display: "flex", gap: 8 }}>
      <button className="btn" onClick={() => fitView({ padding: 0.2 })}>Fit View</button>
      <button className="btn" onClick={onReset}>Reset Filters</button>
    </div>
  );
}

const nodeTypes = { assetNode: NodeCard, segmentNode: SegmentNode };

function findIncidentForAsset(incidents: Incident[] | undefined, asset: Asset): Incident | null {
  if (!incidents) return null;
  return (
    incidents.find(
      (inc) =>
        inc.affected_assets?.includes(asset.hostname) ||
        inc.affected_assets?.includes(asset.asset_uid)
    ) || null
  );
}

function AetherTimeline({ incident }: { incident: Incident }) {
  const steps = [
    { key: "detected", label: "Detected" },
    { key: "triage", label: "Triage" },
    { key: "investigation", label: "Investigation" },
    { key: "response", label: "Response" },
    { key: "closed", label: "Closed" },
  ];
  const status = incident.status?.toLowerCase() || "open";
  let activeIndex = 0;
  if (status === "triaged" || status === "triage") activeIndex = 1;
  else if (status === "investigating" || status === "investigation") activeIndex = 2;
  else if (status === "response") activeIndex = 3;
  else if (status === "closed" || status === "resolved") activeIndex = 4;

  return (
    <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
      {steps.map((step, idx) => {
        const isComplete = idx < activeIndex;
        const isActive = idx === activeIndex;
        return (
          <div key={step.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 16, height: 16, display: "grid", placeItems: "center" }}>
              {isComplete ? (
                <CheckCircle2 size={14} color="var(--low)" />
              ) : isActive ? (
                <Circle size={14} color="var(--amber)" strokeWidth={3} />
              ) : (
                <Circle size={14} color="var(--muted)" strokeWidth={2} />
              )}
            </div>
            <span style={{ fontSize: 11, fontWeight: isActive ? 700 : 500, color: isActive ? "var(--amber)" : isComplete ? "var(--text)" : "var(--muted)" }}>
              {step.label}
            </span>
            {isActive && <span className="chip" style={{ marginLeft: "auto", fontSize: 9 }}>In progress</span>}
          </div>
        );
      })}
    </div>
  );
}

function SelectedAssetRail({ assetId, onClose }: { assetId: number; onClose: () => void }) {
  const { data: asset, isLoading: assetLoading } = useAsset(assetId);
  const { data: risk, isLoading: riskLoading } = useAssetRisk(assetId);
  const { data: replay, isLoading: replayLoading } = useAssetReplay(assetId);
  const { data: incidentsData } = useIncidents();
  const incidents = incidentsData?.items || [];
  const incident = asset ? findIncidentForAsset(incidents, asset) : null;
  const { data: evidenceData } = useIncidentEvidence(incident?.id);
  const evidence = evidenceData?.items || [];
  const AssetIcon = asset ? assetIconMap[asset.asset_type] || Monitor : Monitor;

  if (assetLoading) return <RouteState type="loading" title="Loading asset..." />;
  if (!asset) return <RouteState type="error" title="Asset not found" />;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, border: "1px solid var(--border)", background: "rgba(244,241,234,0.05)", display: "grid", placeItems: "center", flexShrink: 0 }}>
          <AssetIcon size={18} color="var(--amber)" />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <strong style={{ fontSize: 14 }}>{asset.hostname}</strong>
            {risk && !riskLoading ? <RiskBadge level={risk.risk_level} score={risk.risk_score} /> : null}
          </div>
          <p className="mono muted" style={{ fontSize: 11, marginTop: 1 }}>
            {asset.ip_address} · {asset.metadata?.os_version || asset.asset_type}
          </p>
        </div>
        <button className="btn" onClick={onClose} aria-label="Close" style={{ minHeight: 28, width: 28, padding: 0, justifyContent: "center" }}>
          <X size={14} />
        </button>
      </div>

      {/* Metadata */}
      <section className="panel" style={{ padding: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 10px", fontSize: 11 }}>
          <div>
            <div className="muted" style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 1 }}>Segment</div>
            <strong>{asset.segment}</strong>
          </div>
          <div>
            <div className="muted" style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 1 }}>Asset type</div>
            <strong>{asset.asset_type}</strong>
          </div>
          <div>
            <div className="muted" style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 1 }}>Owner</div>
            <strong>{asset.owner || "—"}</strong>
          </div>
          <div>
            <div className="muted" style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 1 }}>Last seen</div>
            <strong>{asset.last_seen ? new Date(asset.last_seen).toLocaleString() : "—"}</strong>
          </div>
        </div>
        {risk && !riskLoading ? (
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <span className="muted" style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em" }}>Risk score</span>
              <strong className="mono" style={{ fontSize: 12, color: risk.risk_level === "critical" ? "var(--critical)" : risk.risk_level === "high" ? "var(--high)" : "var(--text)" }}>
                {risk.risk_score}
              </strong>
            </div>
            <div style={{ height: 3, background: "rgba(244,241,234,0.08)", borderRadius: 999 }}>
              <div style={{ height: "100%", width: `${Math.min(risk.risk_score, 100)}%`, background: risk.risk_level === "critical" ? "var(--critical)" : risk.risk_level === "high" ? "var(--high)" : risk.risk_level === "medium" ? "var(--medium)" : "var(--low)", borderRadius: 999 }} />
            </div>
          </div>
        ) : null}
      </section>

      {/* Aether Ticket */}
      <section className="panel" style={{ padding: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Ticket size={13} color="var(--amber)" />
            <span className="eyebrow" style={{ fontSize: 9 }}>Aether ticket</span>
          </div>
          {incident?.aether_ticket_url ? (
            <Link href={incident.aether_ticket_url} target="_blank" className="btn" style={{ minHeight: 24, padding: "0 6px", fontSize: 10, gap: 3 }}>
              View <ExternalLink size={10} />
            </Link>
          ) : null}
        </div>
        {incident ? (
          <>
            <h3 style={{ fontSize: 12, marginTop: 6, fontWeight: 700 }}>{incident.incident_uid}</h3>
            <p className="muted" style={{ fontSize: 11, marginTop: 2, lineHeight: 1.4 }}>{incident.summary}</p>
            <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
              <span className="chip" style={{ fontSize: 9, padding: "3px 6px" }}><ShieldCheck size={10} /> {incident.category}</span>
            </div>
            <AetherTimeline incident={incident} />
          </>
        ) : (
          <p className="muted" style={{ fontSize: 11, marginTop: 6 }}>No Aether ticket linked.</p>
        )}
      </section>

      {/* Evidence */}
      <section className="panel" style={{ padding: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
          <FileText size={13} color="var(--amber)" />
          <span className="eyebrow" style={{ fontSize: 9 }}>Evidence</span>
        </div>
        {evidence.length > 0 ? (
          <div style={{ display: "grid", gap: 6 }}>
            {evidence.slice(0, 4).map((item: any, idx: number) => (
              <div key={idx} style={{ display: "grid", gridTemplateColumns: "16px 1fr auto", gap: 6, alignItems: "start", padding: "6px 0", borderBottom: idx < Math.min(evidence.length, 4) - 1 ? "1px solid var(--border)" : undefined }}>
                <div style={{ marginTop: 1 }}>
                  {item.evidence_type?.includes("network") ? <Globe size={12} color="var(--cyan)" /> : item.evidence_type?.includes("file") ? <FileText size={12} color="var(--amber)" /> : item.evidence_type?.includes("process") ? <Zap size={12} color="var(--high)" /> : <Activity size={12} color="var(--muted)" />}
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600 }}>{item.evidence_type || "Event"}</div>
                  <div className="muted" style={{ fontSize: 10, marginTop: 1 }}>{item.description || item.summary || "No description"}</div>
                </div>
                <span className="mono muted" style={{ fontSize: 9 }}>{item.observed_at ? new Date(item.observed_at).toLocaleTimeString() : "—"}</span>
              </div>
            ))}
          </div>
        ) : replay && !replayLoading && replay.steps?.length ? (
          <div style={{ display: "grid", gap: 6 }}>
            {replay.steps.slice(0, 3).map((step: any, idx: number) => (
              <div key={idx} style={{ display: "grid", gridTemplateColumns: "16px 1fr auto", gap: 6, alignItems: "start", padding: "6px 0", borderBottom: idx < Math.min(replay.steps.length, 3) - 1 ? "1px solid var(--border)" : undefined }}>
                <div style={{ marginTop: 1 }}><Activity size={12} color="var(--muted)" /></div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600 }}>{step.event_type}</div>
                  <div className="muted" style={{ fontSize: 10, marginTop: 1 }}>{step.description || step.actor_type}</div>
                </div>
                <span className="mono muted" style={{ fontSize: 9 }}>{new Date(step.timestamp).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted" style={{ fontSize: 11 }}>No evidence recorded.</p>
        )}
      </section>

      {/* Open Ports */}
      <section className="panel" style={{ padding: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <Globe size={13} color="var(--amber)" />
          <span className="eyebrow" style={{ fontSize: 9 }}>Open ports</span>
        </div>
        {(asset.open_ports || []).length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {asset.open_ports.map((port: any) => (
              <div key={port.port} style={{ border: "1px solid var(--border)", background: "rgba(244, 241, 234, 0.04)", borderRadius: 6, padding: "4px 6px", fontSize: 10, display: "flex", alignItems: "center", gap: 4 }}>
                <strong className="mono">{port.port}</strong>
                <span className="muted" style={{ fontSize: 9, textTransform: "uppercase" }}>{port.service}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted" style={{ fontSize: 11 }}>No open ports discovered.</p>
        )}
      </section>

      {/* Risk Decision */}
      <section className="panel" style={{ padding: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <AlertTriangle size={13} color="var(--critical)" />
            <span className="eyebrow" style={{ fontSize: 9 }}>Risk decision</span>
          </div>
          {risk && !riskLoading ? <RiskBadge level={risk.risk_level} score={risk.risk_score} /> : null}
        </div>
        {risk && !riskLoading ? (
          <>
            <p className="muted" style={{ fontSize: 11, lineHeight: 1.45, marginTop: 2 }}>
              {risk.explanation?.[0] || "Risk decision computed from asset features and events."}
            </p>
            {incident ? (
              <Link
                href={`/incidents/${incident.id}`}
                className="btn primary"
                style={{ width: "100%", marginTop: 10, justifyContent: "center", minHeight: 32, fontSize: 11 }}
              >
                Open incident workbench <ChevronRight size={12} />
              </Link>
            ) : null}
          </>
        ) : (
          <RouteState type="loading" title="Loading risk..." />
        )}
      </section>
    </div>
  );
}

export default function TopologyPage() {
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null);
  const { data: assetsData, isLoading: assetsLoading } = useAssets();
  const { data: incidentsData, isLoading: incidentsLoading } = useIncidents();
  const [riskFilter, setRiskFilter] = useState("all");
  const [segmentFilter, setSegmentFilter] = useState("all");

  const assets = assetsData?.items || [];
  const incidents = incidentsData?.items || [];
  const segments = useMemo(
    () => Array.from(new Set<string>(assets.map((asset: any) => asset.segment || "Unknown"))).sort(),
    [assets]
  );

  const visibleAssets = useMemo(() => assets.filter((asset: any) => {
    const riskMatches = riskFilter === "all" || (asset.risk_level || "low") === riskFilter;
    const segmentMatches = segmentFilter === "all" || (asset.segment || "Unknown") === segmentFilter;
    return riskMatches && segmentMatches;
  }), [assets, riskFilter, segmentFilter]);

  const visibleBySegment = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    for (const asset of visibleAssets) {
      const segment = asset.segment || "Unknown";
      if (!grouped[segment]) grouped[segment] = [];
      grouped[segment].push(asset);
    }
    return grouped;
  }, [visibleAssets]);

  const railIncidents = useMemo(() => incidents.slice(0, 3), [incidents]);

  const topologyStats = useMemo(() => {
    const critical = visibleAssets.filter((asset: any) => asset.risk_level === "critical").length;
    const unauthorized = visibleAssets.filter((asset: any) => asset.authorization_state === "unauthorized").length;
    return { critical, unauthorized, visible: visibleAssets.length };
  }, [visibleAssets]);

  const { nodes, edges } = useMemo(() => {
    const nextNodes: Node[] = [];
    const nextEdges: Edge[] = [];
    const visibleIds = new Set(visibleAssets.map((asset: any) => String(asset.id)));

    Object.entries(visibleBySegment).forEach(([segment, segmentAssets], segmentIndex) => {
      const y = 70 + segmentIndex * 210;
      const segmentId = `segment-${segment}`;
      nextNodes.push({
        id: segmentId,
        type: "segmentNode",
        position: { x: 20, y },
        data: { label: segment, count: segmentAssets.length },
        selectable: false,
      });

      segmentAssets
        .sort((a: any, b: any) => (b.risk_score || 0) - (a.risk_score || 0))
        .forEach((asset: any, index: number) => {
          const assetId = String(asset.id);
          nextNodes.push({
            id: assetId,
            type: "assetNode",
            position: { x: 260 + (index % MAX_NODES_PER_SEGMENT_ROW) * NODE_WIDTH, y: y - 22 + Math.floor(index / MAX_NODES_PER_SEGMENT_ROW) * NODE_HEIGHT },
            data: {
              id: assetId,
              label: asset.hostname || asset.ip_address,
              ip: asset.ip_address,
              type: asset.asset_type || "unknown",
              auth: asset.authorization_state,
              ports: (asset.open_ports || []).slice(0, 3).map((port: any) => port.port).join(", "),
              risk_level: asset.risk_level || "low",
              risk_score: asset.risk_score || 0,
            },
          });
          nextEdges.push({
            id: `segment-${segment}-${assetId}`,
            source: segmentId,
            target: assetId,
            type: "smoothstep",
            style: { stroke: "rgba(244,241,234,.12)" },
          });
        });
    });

    for (const inc of incidents) {
      const assetIds = (inc.affected_assets || [])
        .map((name: string) => {
          const asset = assets.find((item: any) => item.hostname === name || item.asset_uid === name);
          return asset ? String(asset.id) : null;
        })
        .filter((id: string | null) => id && visibleIds.has(id)) as string[];
      for (let i = 0; i < assetIds.length; i++) {
        for (let j = i + 1; j < assetIds.length; j++) {
          nextEdges.push({
            id: `incident-${inc.id}-${assetIds[i]}-${assetIds[j]}`,
            source: assetIds[i],
            target: assetIds[j],
            animated: true,
            type: "smoothstep",
            style: { stroke: "#EF4444", strokeWidth: 2 },
            label: inc.incident_uid,
            labelStyle: { fill: '#EF4444', fontSize: 10, fontWeight: 700 },
            labelBgStyle: { fill: '#080b10', opacity: 0.9 },
            labelBgPadding: [4, 4],
          });
        }
      }
    }

    return { nodes: nextNodes, edges: nextEdges };
  }, [assets, incidents, visibleAssets, visibleBySegment]);

  if (assetsLoading || incidentsLoading) {
    return (
      <AppShell>
        <RouteState type="loading" title="Loading topology..." />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="page-head">
        <div>
          <div className="eyebrow">Network Topology</div>
          <h1>Topology investigation</h1>
          <p className="muted">Graph-based investigation by segment with risk rings and incident paths.</p>
        </div>
        <div className="filters">
          {["all", "critical", "high", "medium", "low"].map((level) => (
            <button className={`filter ${riskFilter === level ? "active" : ""}`} key={level} onClick={() => setRiskFilter(level)}>
              {level}
            </button>
          ))}
          <select className="filter-select" value={segmentFilter} onChange={(event) => setSegmentFilter(event.target.value)}>
            <option value="all">All segments</option>
            {segments.map((segment) => <option value={segment} key={segment}>{segment}</option>)}
          </select>
        </div>
      </div>
      <div className="topology-shell">
        <section className="panel topology" style={{ position: "relative", overflow: "hidden", minHeight: 640 }}>
          {nodes.length ? (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              fitView
              style={{ width: "100%", height: "100%" }}
              onNodeClick={(_, node) => {
                if (node.type === "assetNode") setSelectedAssetId(Number(node.id));
              }}
            >
              <TopologyControls onReset={() => { setRiskFilter("all"); setSegmentFilter("all"); setSelectedAssetId(null); }} />
              <Background color="rgba(244,241,234,.08)" gap={22} />
              <MiniMap nodeColor={(node) => node.type === "segmentNode" ? "rgba(244,241,234,0.3)" : "#D99A2B"} maskColor="rgba(8,11,16,.72)" />
              <Controls />
            </ReactFlow>
          ) : (
            <RouteState type="empty" title="No topology nodes match these filters" message="Clear the risk or segment filter to restore graph context." />
          )}
        </section>
        <aside className="topology-rail">
          {selectedAssetId ? (
            <SelectedAssetRail assetId={selectedAssetId} onClose={() => setSelectedAssetId(null)} />
          ) : (
            <>
              <section className="panel">
                <div className="eyebrow">Investigation rail</div>
                <h2 style={{ marginTop: 8, fontSize: 14 }}>Incident path context</h2>
                <div className="topology-stat-grid">
                  <span><strong className="mono">{topologyStats.visible}</strong><small>visible assets</small></span>
                  <span><strong className="mono">{topologyStats.critical}</strong><small>critical</small></span>
                  <span><strong className="mono">{topologyStats.unauthorized}</strong><small>unauthorized</small></span>
                </div>
              </section>
              <section className="panel">
                <div className="eyebrow">Aether handoff</div>
                <p className="muted" style={{ marginTop: 10, fontSize: 12 }}>
                  Select an asset node to inspect its Aether ticket, evidence timeline, and risk decision.
                </p>
              </section>
              <section className="panel">
                <div className="eyebrow">Active incident paths</div>
                <div className="metric-list" style={{ marginTop: 12 }}>
                  {railIncidents.length ? railIncidents.map((incident: any) => (
                    <div className="metric-row" key={incident.id}>
                      <span style={{ minWidth: 0 }}>
                        <strong style={{ fontSize: 12 }}>{incident.incident_uid}</strong>
                        <br />
                        <span className="muted" style={{ fontSize: 11 }}>{incident.title}</span>
                      </span>
                      <RiskBadge level={incident.severity} score={incident.risk_score} />
                    </div>
                  )) : <p className="muted" style={{ fontSize: 12 }}>No incident paths are currently active.</p>}
                </div>
              </section>
            </>
          )}
        </aside>
      </div>
    </AppShell>
  );
}
