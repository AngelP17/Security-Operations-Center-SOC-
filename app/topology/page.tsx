"use client";

import ReactFlow, { Background, Controls, MiniMap, type Edge, type Node } from "reactflow";
import "reactflow/dist/style.css";
import { AppShell } from "@/components/layout/AppShell";
import { AssetDetailDrawer } from "@/components/shared/AssetDetailDrawer";
import { assets, assetIcon } from "@/lib/security-data";
import { useForgeStore } from "@/lib/store";
import { RiskBadge } from "@/components/shared/RiskBadge";

const positions: Record<string, { x: number; y: number }> = {
  "asset-eng-ws-12": { x: 20, y: 90 },
  "asset-srv-historian": { x: 360, y: 30 },
  "asset-contractor-17": { x: 700, y: 160 },
  "asset-plc-press-04": { x: 1000, y: 80 },
  "asset-hmi-07": { x: 1000, y: 300 },
  "asset-prn-label-03": { x: 360, y: 350 }
};

function NodeCard({ data }: { data: { id: string } }) {
  const asset = assets.find((item) => item.id === data.id)!;
  const Icon = assetIcon[asset.type];
  return (
    <div className={`node-card node-${asset.authorization === "unknown" ? "unknown" : asset.riskLevel}`}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <Icon size={18} color="var(--amber)" />
        <RiskBadge level={asset.riskLevel} score={asset.risk} />
      </div>
      <strong style={{ display: "block", marginTop: 8 }}>{asset.hostname}</strong>
      <div className="mono muted" style={{ fontSize: 12 }}>{asset.ip}</div>
      <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>{asset.type} · {asset.authorization}</div>
    </div>
  );
}

const nodeTypes = { assetNode: NodeCard };

export default function TopologyPage() {
  const { setSelectedAsset } = useForgeStore();
  const nodes: Node[] = assets.map((asset) => ({
    id: asset.id,
    type: "assetNode",
    position: positions[asset.id],
    data: { id: asset.id }
  }));
  const edges: Edge[] = [
    { id: "e1", source: "asset-eng-ws-12", target: "asset-srv-historian", animated: false },
    { id: "e2", source: "asset-srv-historian", target: "asset-contractor-17", animated: true, style: { stroke: "#EF4444" } },
    { id: "e3", source: "asset-contractor-17", target: "asset-plc-press-04", animated: true, style: { stroke: "#EF4444" } },
    { id: "e4", source: "asset-contractor-17", target: "asset-hmi-07", animated: true, style: { stroke: "#F97316" } },
    { id: "e5", source: "asset-prn-label-03", target: "asset-srv-historian", animated: false }
  ];

  return (
    <AppShell>
      <div className="page-head">
        <div>
          <div className="eyebrow">Network Topology</div>
          <h1>Graph-based investigation by segment</h1>
          <p className="muted">Corporate, Production, Servers, Printers/IoT, and Unknown assets with risk rings and authorization state.</p>
        </div>
        <div className="filters">
          <span className="chip">Green healthy</span>
          <span className="chip">Amber medium</span>
          <span className="chip">Orange high</span>
          <span className="chip">Red pulse critical</span>
        </div>
      </div>
      <section className="panel topology" style={{ position: "relative" }}>
        <div className="topology-label" style={{ left: 30, top: 28 }}>Corporate</div>
        <div className="topology-label" style={{ left: 370, top: 28 }}>Servers</div>
        <div className="topology-label" style={{ left: 710, top: 28 }}>Unknown</div>
        <div className="topology-label" style={{ right: 70, top: 28 }}>Production</div>
        <div className="topology-label" style={{ left: 370, bottom: 150 }}>Printers/IoT</div>
        <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView onNodeClick={(_, node) => setSelectedAsset(assets.find((asset) => asset.id === node.id) ?? null)}>
          <Background color="rgba(148,163,184,.18)" gap={22} />
          <MiniMap nodeColor="#D99A2B" maskColor="rgba(8,11,16,.72)" />
          <Controls />
        </ReactFlow>
      </section>
      <AssetDetailDrawer />
    </AppShell>
  );
}
