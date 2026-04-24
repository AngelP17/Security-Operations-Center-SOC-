"use client";

import { useMemo, useState } from "react";
import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { AppShell } from "@/components/layout/AppShell";
import { AssetDetailDrawer } from "@/components/shared/AssetDetailDrawer";
import { RiskBadge } from "@/components/shared/RiskBadge";
import { RouteState } from "@/components/shared/RouteState";
import { useAssets } from "@/lib/hooks/use-assets";
import { useForgeStore } from "@/lib/store";
import type { Asset } from "@/lib/types";

const helper = createColumnHelper<Asset>();

export default function AssetsPage() {
  const [filter, setFilter] = useState("all");
  const { setSelectedAssetId } = useForgeStore();
  const { data, isLoading, error } = useAssets();

  const allAssets: Asset[] = data?.items || [];

  const filtered = useMemo(() => {
    if (filter === "all") return allAssets;
    return allAssets.filter((asset) =>
      (asset.risk_level || "low") === filter ||
      asset.authorization_state === filter ||
      asset.segment === filter
    );
  }, [allAssets, filter]);

  const columns = useMemo(() => [
    helper.accessor("risk_score", {
      header: "Risk",
      cell: (info) => <RiskBadge level={info.row.original.risk_level || "low"} score={info.getValue() || 0} />,
    }),
    helper.accessor("hostname", { header: "Hostname", cell: (info) => <strong>{info.getValue()}</strong> }),
    helper.accessor("ip_address", { header: "IP", cell: (info) => <span className="mono">{info.getValue()}</span> }),
    helper.accessor("mac_address", { header: "MAC", cell: (info) => <span className="mono">{info.getValue()}</span> }),
    helper.accessor("authorization_state", { header: "Auth" }),
    helper.accessor("site", { header: "Site" }),
    helper.accessor("segment", { header: "Segment" }),
    helper.accessor("asset_type", { header: "Type" }),
    helper.accessor("open_ports", {
      header: "Open Ports",
      cell: (info) => <span className="mono">{(info.getValue() || []).map((p: any) => p.port).join(", ")}</span>,
    }),
    helper.accessor("last_seen", {
      header: "Last Seen",
      cell: (info) => <span className="mono">{info.getValue() ? new Date(info.getValue() as string).toLocaleTimeString() : "—"}</span>,
    }),
  ], []);

  const table = useReactTable({ data: filtered, columns, getCoreRowModel: getCoreRowModel() });

  if (isLoading) {
    return (
      <AppShell>
        <RouteState type="loading" title="Loading assets..." />
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <RouteState type="error" title="Failed to load assets" message="API connection failed." />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="page-head">
        <div>
          <div className="eyebrow">Asset Intelligence</div>
          <h1>Object-centric asset workflow</h1>
          <p className="muted">API-backed asset inventory with risk scores, authorization state, and scan provenance.</p>
        </div>
        <div className="filters">
          {["all", "critical", "high", "medium", "low", "unauthorized", "unknown", "Production", "Servers"].map((item) => (
            <button className={`filter ${filter === item ? "active" : ""}`} key={item} onClick={() => setFilter(item)}>
              {item}
            </button>
          ))}
        </div>
      </div>
      {filtered.length ? (
        <section className="panel">
          <div className="table-wrap">
            <table>
              <thead>
                {table.getHeaderGroups().map((group) => (
                  <tr key={group.id}>
                    {group.headers.map((header) => (
                      <th key={header.id}>{flexRender(header.column.columnDef.header, header.getContext())}</th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id} onClick={() => setSelectedAssetId(row.original.id)}>
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <RouteState
          type="empty"
          title="No assets match this operational filter"
          message="Clear the filter or run the safe demo scan to repopulate the asset intelligence queue."
          actionLabel="Run demo scan"
          onAction={() => window.location.reload()}
        />
      )}
      <AssetDetailDrawer />
    </AppShell>
  );
}
