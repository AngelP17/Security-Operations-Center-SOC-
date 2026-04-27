"use client";

import { useEffect, useMemo, useState } from "react";
import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Copy, Search, SearchX } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { AssetDetailDrawer } from "@/components/shared/AssetDetailDrawer";
import { RiskBadge } from "@/components/shared/RiskBadge";
import { RouteState } from "@/components/shared/RouteState";
import { useAssets } from "@/lib/hooks/use-assets";
import { useForgeStore } from "@/lib/store";
import type { Asset } from "@/lib/types";

const helper = createColumnHelper<Asset>();

function CopyButton({ value }: { value: string }) {
  return (
    <button
      className="btn"
      style={{ padding: "0 6px", minHeight: 24, marginLeft: 4, fontSize: 11 }}
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(value);
        toast.success("Copied to clipboard");
      }}
      title="Copy to clipboard"
    >
      <Copy size={12} />
    </button>
  );
}

export default function AssetsPage() {
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [rawQuery, setRawQuery] = useState("");
  const { setSelectedAssetId } = useForgeStore();
  const { data, isLoading, error } = useAssets();

  const allAssets: Asset[] = data?.items || [];

  useEffect(() => {
    const initial = new URLSearchParams(window.location.search).get("query") || "";
    setQuery(initial);
    setRawQuery(initial);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(rawQuery), 300);
    return () => clearTimeout(timer);
  }, [rawQuery]);

  const normalizedQuery = query.toLowerCase();

  const filtered = useMemo(() => {
    const filteredByChip = filter === "all" ? allAssets : allAssets.filter((asset) =>
      (asset.risk_level || "low") === filter ||
      asset.authorization_state === filter ||
      asset.segment === filter
    );
    if (!normalizedQuery) return filteredByChip;
    return filteredByChip.filter((asset) => {
      const haystack = [
        asset.hostname,
        asset.ip_address,
        asset.mac_address,
        asset.asset_uid,
        asset.authorization_state,
        asset.segment,
        asset.asset_type,
        ...(asset.open_ports || []).map((port) => `${port.port} ${port.service}`),
      ].join(" ").toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [allAssets, filter, normalizedQuery]);

  const columns = useMemo(() => [
    helper.accessor("risk_score", {
      header: "Risk",
      cell: (info) => <RiskBadge level={info.row.original.risk_level || "low"} score={info.getValue() || 0} />,
    }),
    helper.accessor("hostname", {
      header: "Hostname",
      cell: (info) => <strong className="truncate-cell">{info.getValue()}</strong>,
    }),
    helper.accessor("ip_address", {
      header: "IP",
      cell: (info) => (
        <span className="mono truncate-cell" style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {info.getValue()}
          <CopyButton value={info.getValue() || ""} />
        </span>
      ),
    }),
    helper.accessor("mac_address", {
      header: "MAC",
      cell: (info) => (
        <span className="mono truncate-cell" style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {info.getValue()}
          <CopyButton value={info.getValue() || ""} />
        </span>
      ),
    }),
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
          <p className="muted">
            {query ? `Showing search results for "${query}".` : "API-backed asset inventory with risk scores, authorization state, and scan provenance."}
          </p>
        </div>
        <div className="filters" style={{ flexWrap: "wrap", gap: 8 }}>
          {["all", "critical", "high", "medium", "low", "unauthorized", "unknown", "Production", "Servers"].map((item) => (
            <button className={`filter ${filter === item ? "active" : ""}`} key={item} onClick={() => setFilter(item)}>
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="search" style={{ marginBottom: 16, maxWidth: 480 }}>
        <Search size={16} />
        <input
          aria-label="Filter assets"
          placeholder="Filter by hostname, IP, MAC, type, segment..."
          value={rawQuery}
          onChange={(e) => setRawQuery(e.target.value)}
        />
      </div>

      {filtered.length ? (
        <section className="panel" style={{ overflow: "hidden" }}>
          <div style={{ overflowX: "auto", maxWidth: "100%" }}>
            <table style={{ minWidth: 1100 }}>
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
                {table.getRowModel().rows.map((row, i) => (
                  <motion.tr
                    key={row.id}
                    onClick={() => setSelectedAssetId(row.original.id)}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                    ))}
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <div className="panel" style={{ minHeight: 320, display: "grid", placeItems: "center" }}>
          <div style={{ textAlign: "center", maxWidth: 480 }}>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <SearchX size={48} style={{ margin: "0 auto 16px", color: "var(--amber)" }} />
            </motion.div>
            <h2>No assets match this operational filter</h2>
            <p className="muted" style={{ marginTop: 10 }}>
              Clear the filter or run the safe demo scan to repopulate the asset intelligence queue.
            </p>
            <button
              className="btn primary"
              onClick={() => { setFilter("all"); setRawQuery(""); }}
              style={{ marginTop: 18 }}
            >
              Clear filter
            </button>
          </div>
        </div>
      )}
      <AssetDetailDrawer />
    </AppShell>
  );
}
