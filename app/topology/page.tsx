"use client";

import { useMemo, useState } from "react";
import ReactFlow, { Background, Controls, MiniMap, useReactFlow, type Edge, type Node } from "reactflow";
import "reactflow/dist/style.css";
import { AppShell } from "@/components/layout/AppShell";
import { AssetDetailDrawer } from "@/components/shared/AssetDetailDrawer";
import { RiskBadge } from "@/components/shared/RiskBadge";
import { RouteState } from "@/components/shared/RouteState";
import { useAssets } from "@/lib/hooks/use-assets";
import { useIncidents } from "@/lib/hooks/use-incidents";
import { useForgeStore } from "@/lib/store";
import { Cpu, HardDrive, Laptop, Network, Printer, Server } from "lucide-react";

const assetIcon: Record<string, React.ComponentType<{ size?: number | string; color?: string }>> = {
  plc: Cpu,
  workstation: HardDrive,
  server: Server,
  laptop: Laptop,
  printer: Printer,
  iot: Network,
};

const MAX_NODES_PER_SEGMENT_ROW = 4;
const NODE_WIDTH = 280;
const NODE_HEIGHT = 126;

function NodeCard({ data }: { data: { id: string; label: string; ip?: string; type: string; auth?: string; ports?: string; risk_level?: string; risk_score?: number } }) {
  const Icon = assetIcon[data.type] || Network;
  return (
    <div className={`node-card node-${data.risk_level || "low"}`}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <Icon size={18} color="var(--amber)" />
        <RiskBadge level={data.risk_level || "low"} score={data.risk_score || 0} />
      </div>
      <strong style={{ display: "block", marginTop: 8 }}>{data.label}</strong>
      <div className="mono muted" style={{ marginTop: 4, fontSize: 11 }}>{data.ip}</div>
      <div className="node-meta">
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
    <div style={{ position: "absolute", top: 10, left: 10, zIndex: 10, display: "flex", gap: 8 }}>
      <button className="btn" onClick={() => fitView({ padding: 0.2 })}>Fit View</button>
      <button className="btn" onClick={onReset}>Reset Filters</button>
    </div>
  );
}

const nodeTypes = { assetNode: NodeCard, segmentNode: SegmentNode };

export default function TopologyPage() {
  const { setSelectedAssetId } = useForgeStore();
  const { data: assetsData, isLoading: assetsLoading } = useAssets();
  const { data: incidentsData, isLoading: incidentsLoading } = useIncidents();
  const [riskFilter, setRiskFilter] = useState("all");
  const [segmentFilter, setSegmentFilter] = useState("all");

  if (assetsLoading || incidentsLoading) {
    return (
      <AppShell>
        <RouteState type="loading" title="Loading topology..." />
      </AppShell>
    );
  }

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
            style: { stroke: "rgba(148,163,184,.32)" },
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

  return (
    <AppShell>
      <div className="page-head">
        <div>
          <div className="eyebrow">Network Topology</div>
          <h1>Graph-based investigation by segment</h1>
          <p className="muted">Corporate, Production, Servers, Printers/IoT, and Unknown assets with risk rings and authorization state.</p>
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
            <TopologyControls onReset={() => { setRiskFilter("all"); setSegmentFilter("all"); }} />
            <Background color="rgba(148,163,184,.18)" gap={22} />
            <MiniMap nodeColor={(node) => node.type === "segmentNode" ? "#38BDF8" : "#D99A2B"} maskColor="rgba(8,11,16,.72)" />
            <Controls />
          </ReactFlow>
        ) : (
          <RouteState type="empty" title="No topology nodes match these filters" message="Clear the risk or segment filter to restore graph context." />
        )}
      </section>
      <AssetDetailDrawer />
    </AppShell>
  );
}
