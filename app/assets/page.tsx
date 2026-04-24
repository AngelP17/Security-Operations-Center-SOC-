"use client";

import { useMemo, useState } from "react";
import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { AppShell } from "@/components/layout/AppShell";
import { AssetDetailDrawer } from "@/components/shared/AssetDetailDrawer";
import { RiskBadge } from "@/components/shared/RiskBadge";
import { assets, type Asset } from "@/lib/security-data";
import { useForgeStore } from "@/lib/store";
import { RouteState } from "@/components/shared/RouteState";

const helper = createColumnHelper<Asset>();

export default function AssetsPage() {
  const [filter, setFilter] = useState("all");
  const { setSelectedAsset } = useForgeStore();
  const data = useMemo(() => assets.filter((asset) => filter === "all" || asset.riskLevel === filter || asset.authorization === filter || asset.segment === filter), [filter]);
  const columns = [
    helper.accessor("risk", { header: "Risk", cell: (info) => <RiskBadge level={info.row.original.riskLevel} score={info.getValue()} /> }),
    helper.accessor("hostname", { header: "Hostname", cell: (info) => <strong>{info.getValue()}</strong> }),
    helper.accessor("ip", { header: "IP", cell: (info) => <span className="mono">{info.getValue()}</span> }),
    helper.accessor("mac", { header: "MAC", cell: (info) => <span className="mono">{info.getValue()}</span> }),
    helper.accessor("authorization", { header: "Auth" }),
    helper.accessor("site", { header: "Site" }),
    helper.accessor("segment", { header: "Segment" }),
    helper.accessor("type", { header: "Type" }),
    helper.accessor("ports", { header: "Open Port", cell: (info) => <span className="mono">{info.getValue().map((p) => p.port).join(", ")}</span> }),
    helper.accessor("lastSeen", { header: "Last Seen", cell: (info) => <span className="mono">{info.getValue()}</span> }),
    helper.accessor("newSinceLastScan", { header: "New", cell: (info) => info.getValue() ? <span className="risk-badge risk-critical">new</span> : <span className="chip">baseline</span> })
  ];
  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() });

  return (
    <AppShell>
      <div className="page-head">
        <div>
          <div className="eyebrow">Asset Intelligence</div>
          <h1>Object-centric asset workflow</h1>
          <p className="muted">Filter by risk, authorization, site, segment, asset type, open port, last seen, and new-since-last-scan state.</p>
        </div>
        <div className="filters">
          {["all", "critical", "high", "medium", "low", "unauthorized", "unknown", "Production", "Servers"].map((item) => (
            <button className={`filter ${filter === item ? "active" : ""}`} key={item} onClick={() => setFilter(item)}>{item}</button>
          ))}
        </div>
      </div>
      {data.length ? (
        <section className="panel">
          <div className="table-wrap">
            <table>
              <thead>
                {table.getHeaderGroups().map((group) => <tr key={group.id}>{group.headers.map((header) => <th key={header.id}>{flexRender(header.column.columnDef.header, header.getContext())}</th>)}</tr>)}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id} onClick={() => setSelectedAsset(row.original)}>
                    {row.getVisibleCells().map((cell) => <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <RouteState type="empty" title="No assets match this operational filter" message="Clear the filter or run the safe demo scan to repopulate the asset intelligence queue." />
      )}
      <AssetDetailDrawer />
    </AppShell>
  );
}
