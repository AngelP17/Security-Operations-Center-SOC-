"use client";

import ReactFlow, { Background, Controls, MiniMap, type Edge, type Node } from "reactflow";
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

function NodeCard({ data }: { data: { id: string; label: string; type: string; risk_level?: string; risk_score?: number } }) {
  const Icon = assetIcon[data.type] || Network;
  return (
    <div className={`node-card node-${data.risk_level || "low"}`}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <Icon size={18} color="var(--amber)" />
        <RiskBadge level={data.risk_level || "low"} score={data.risk_score || 0} />
      </div>
      <strong style={{ display: "block", marginTop: 8 }}>{data.label}</strong>
    </div>
  );
}

const nodeTypes = { assetNode: NodeCard };

export default function TopologyPage() {
  const { setSelectedAssetId } = useForgeStore();
  const { data: assetsData, isLoading: assetsLoading } = useAssets();
  const { data: incidentsData, isLoading: incidentsLoading } = useIncidents();

  if (assetsLoading || incidentsLoading) {
    return (
      <AppShell>
        <RouteState type="loading" title="Loading topology..." />
      </AppShell>
    );
  }

  const assets = assetsData?.items || [];
  const incidents = incidentsData?.items || [];

  const segMap: Record<string, number> = {};
  let yPos = 30;
  const getSegY = (seg: string) => {
    if (!(seg in segMap)) { segMap[seg] = yPos; yPos += 140; }
    return segMap[seg];
  };

  const nodes: Node[] = assets.map((asset: any, index: number) => ({
    id: String(asset.id),
    type: "assetNode",
    position: { x: 40 + (index % 4) * 260, y: getSegY(asset.segment || "Unknown") },
    data: {
      id: String(asset.id),
      label: asset.hostname || asset.ip_address,
      type: asset.asset_type || "unknown",
      risk_level: asset.risk_level || "low",
      risk_score: asset.risk_score || 0,
    },
  }));

  const edges: Edge[] = [];
  const segAssets: Record<string, string[]> = {};
  for (const a of assets) {
    const seg = a.segment || "Unknown";
    if (!segAssets[seg]) segAssets[seg] = [];
    segAssets[seg].push(String(a.id));
  }
  for (const ids of Object.values(segAssets)) {
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        edges.push({ id: `e-${ids[i]}-${ids[j]}`, source: ids[i], target: ids[j], animated: false });
      }
    }
  }
  for (const inc of incidents) {
    const aff = inc.affected_assets || [];
    const assetIds = aff.map((name: string) => {
      const a = assets.find((x: any) => x.hostname === name || x.asset_uid === name);
      return a ? String(a.id) : null;
    }).filter(Boolean);
    for (let i = 0; i < assetIds.length; i++) {
      for (let j = i + 1; j < assetIds.length; j++) {
        edges.push({
          id: `ei-${inc.id}-${assetIds[i]}-${assetIds[j]}`,
          source: assetIds[i],
          target: assetIds[j],
          animated: true,
          style: { stroke: "#EF4444" },
        });
      }
    }
  }

  return (
    <AppShell>
      <div className="page-head">
        <div>
          <div className="eyebrow">Network Topology</div>
          <h1>Graph-based investigation by segment</h1>
          <p className="muted">Corporate, Production, Servers, Printers/IoT, and Unknown assets with risk rings and authorization state.</p>
        </div>
      </div>
      <section className="panel topology" style={{ position: "relative" }}>
        {Object.entries(segMap).map(([seg, y]) => (
          <div className="topology-label" key={seg} style={{ left: 30, top: y - 10 }}>{seg}</div>
        ))}
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          onNodeClick={(_, node) => setSelectedAssetId(Number(node.id))}
        >
          <Background color="rgba(148,163,184,.18)" gap={22} />
          <MiniMap nodeColor="#D99A2B" maskColor="rgba(8,11,16,.72)" />
          <Controls />
        </ReactFlow>
      </section>
      <AssetDetailDrawer />
    </AppShell>
  );
}
