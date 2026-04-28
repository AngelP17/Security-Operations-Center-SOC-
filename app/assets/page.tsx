"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Copy, Search, Shield, Waypoints, ArrowRight, Activity } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { AssetDetailDrawer } from "@/components/shared/AssetDetailDrawer";
import { RiskBadge } from "@/components/shared/RiskBadge";
import { RouteState } from "@/components/shared/RouteState";
import { useAssets } from "@/lib/hooks/use-assets";
import { useForgeStore } from "@/lib/store";
import type { Asset } from "@/lib/types";

gsap.registerPlugin(ScrollTrigger);

const helper = createColumnHelper<Asset>();

function CopyButton({ value }: { value: string }) {
  return (
    <button
      className="btn"
      style={{ padding: "0 6px", minHeight: 24, marginLeft: 4, fontSize: 11 }}
      onClick={(event) => {
        event.stopPropagation();
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
  const pageRef = useRef<HTMLDivElement>(null);
  const [riskFilter, setRiskFilter] = useState("all");
  const [authFilter, setAuthFilter] = useState("all");
  const [segmentFilter, setSegmentFilter] = useState("all");
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
    const timer = setTimeout(() => setQuery(rawQuery), 250);
    return () => clearTimeout(timer);
  }, [rawQuery]);

  const normalizedQuery = query.toLowerCase();
  const segments = useMemo(
    () => Array.from(new Set(allAssets.map((asset) => asset.segment || "Unknown"))).sort(),
    [allAssets],
  );
  const authorizationStates = useMemo(
    () => Array.from(new Set(allAssets.map((asset) => asset.authorization_state || "unknown"))).sort(),
    [allAssets],
  );

  const filtered = useMemo(() => {
    return allAssets.filter((asset) => {
      const matchesRisk = riskFilter === "all" || (asset.risk_level || "low") === riskFilter;
      const matchesAuth = authFilter === "all" || (asset.authorization_state || "unknown") === authFilter;
      const matchesSegment = segmentFilter === "all" || (asset.segment || "Unknown") === segmentFilter;
      const haystack = [
        asset.hostname,
        asset.ip_address,
        asset.mac_address,
        asset.asset_uid,
        asset.authorization_state,
        asset.segment,
        asset.asset_type,
        asset.owner,
        ...(asset.open_ports || []).map((port) => `${port.port} ${port.service}`),
      ].join(" ").toLowerCase();
      const matchesQuery = !normalizedQuery || haystack.includes(normalizedQuery);
      return matchesRisk && matchesAuth && matchesSegment && matchesQuery;
    });
  }, [allAssets, authFilter, normalizedQuery, riskFilter, segmentFilter]);

  const sortedFiltered = useMemo(
    () => [...filtered].sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0)),
    [filtered],
  );
  const featuredAsset = sortedFiltered[0];
  const watchlist = sortedFiltered.slice(1, 5);
  const segmentSnapshot = useMemo(() => {
    const counts = new Map<string, { total: number; critical: number }>();
    for (const asset of allAssets) {
      const key = asset.segment || "Unknown";
      const current = counts.get(key) || { total: 0, critical: 0 };
      current.total += 1;
      if (["critical", "high"].includes(asset.risk_level || "")) current.critical += 1;
      counts.set(key, current);
    }
    return Array.from(counts.entries())
      .map(([segment, value]) => ({ segment, ...value }))
      .sort((a, b) => b.critical - a.critical || b.total - a.total)
      .slice(0, 4);
  }, [allAssets]);

  const overview = useMemo(() => ({
    total: allAssets.length,
    unauthorized: allAssets.filter((asset) => asset.authorization_state === "unauthorized").length,
    critical: allAssets.filter((asset) => ["critical", "high"].includes(asset.risk_level || "")).length,
    segments: segments.length,
  }), [allAssets, segments.length]);

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
    helper.accessor("authorization_state", { header: "Authorization" }),
    helper.accessor("segment", { header: "Segment" }),
    helper.accessor("asset_type", { header: "Type" }),
    helper.accessor("open_ports", {
      header: "Ports",
      cell: (info) => (
        <span className="mono">
          {(info.getValue() || []).slice(0, 4).map((port: { port: number }) => port.port).join(", ") || "—"}
        </span>
      ),
    }),
    helper.accessor("owner", {
      header: "Owner",
      cell: (info) => info.getValue() || "—",
    }),
    helper.accessor("last_seen", {
      header: "Observed",
      cell: (info) => (
        <span className="mono">
          {info.getValue() ? new Date(info.getValue() as string).toLocaleString() : "—"}
        </span>
      ),
    }),
  ], []);

  const table = useReactTable({ data: sortedFiltered, columns, getCoreRowModel: getCoreRowModel() });

  useGSAP(() => {
    const ctx = gsap.context(() => {
      gsap.from(".asset-archive-hero > *", {
        y: 40,
        opacity: 0,
        duration: 0.9,
        stagger: 0.1,
        ease: "power3.out",
      });

      gsap.from(".asset-archive-rail > *", {
        x: -30,
        opacity: 0,
        duration: 0.8,
        stagger: 0.12,
        ease: "power3.out",
        delay: 0.2,
      });

      gsap.from(".asset-specimen", {
        y: 50,
        opacity: 0,
        scale: 0.97,
        duration: 0.85,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ".asset-specimen",
          start: "top 85%",
        },
      });

      gsap.from(".asset-watch-card", {
        y: 40,
        opacity: 0,
        scale: 0.96,
        duration: 0.7,
        stagger: 0.08,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ".asset-watchlist-grid",
          start: "top 88%",
        },
      });

      gsap.from(".asset-ledger", {
        y: 50,
        opacity: 0,
        duration: 0.85,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ".asset-ledger",
          start: "top 88%",
        },
      });
    }, pageRef);
    return () => ctx.revert();
  }, { scope: pageRef });

  if (isLoading) {
    return (
      <AppShell>
        <RouteState type="loading" skeletonLayout="table" title="Loading asset archive..." />
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <RouteState
          type="error"
          title="Failed to load asset archive"
          message="The API could not return the current object catalog."
          actionLabel="Retry"
          onAction={() => window.location.reload()}
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div ref={pageRef} className="asset-archive-page">
        <section className="asset-archive-hero">
          <div className="asset-archive-copy">
            <div className="eyebrow">Asset archive</div>
            <h1>
              Object identity should stay attached to
              {" "}
              <span className="inline-photo inline-photo-signal" aria-hidden="true" />
              {" "}
              exposure proof, ownership, and authorization state.
            </h1>
            <p>
              This route treats the inventory like an industrial specimen room. High-risk objects surface first, search stays
              operational, and the deeper ledger remains available without becoming the whole design.
            </p>
          </div>

          <div className="asset-archive-overview">
            <article>
              <span>Visible objects</span>
              <strong>{overview.total}</strong>
              <small>Current archive volume</small>
            </article>
            <article>
              <span>Unauthorized</span>
              <strong>{overview.unauthorized}</strong>
              <small>Outside approved state</small>
            </article>
            <article>
              <span>Elevated risk</span>
              <strong>{overview.critical}</strong>
              <small>Critical or high objects</small>
            </article>
            <article>
              <span>Mapped segments</span>
              <strong>{overview.segments}</strong>
              <small>Distinct network contexts</small>
            </article>
          </div>
        </section>

        <div className="asset-archive-shell">
          <aside className="asset-archive-rail">
            <section className="command-surface asset-archive-panel">
              <div className="eyebrow">Filter rail</div>
              <div className="search asset-search">
                <Search size={16} />
                <input
                  aria-label="Filter assets"
                  placeholder="Hostname, IP, MAC, owner, port, segment..."
                  value={rawQuery}
                  onChange={(event) => setRawQuery(event.target.value)}
                />
              </div>

              <div className="asset-filter-group">
                <span>Risk posture</span>
                <div className="filters asset-filters">
                  {["all", "critical", "high", "medium", "low"].map((item) => (
                    <button className={`filter ${riskFilter === item ? "active" : ""}`} key={item} onClick={() => setRiskFilter(item)}>
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="asset-filter-group">
                <span>Authorization</span>
                <div className="filters asset-filters">
                  <button className={`filter ${authFilter === "all" ? "active" : ""}`} onClick={() => setAuthFilter("all")}>
                    all
                  </button>
                  {authorizationStates.slice(0, 4).map((item) => (
                    <button className={`filter ${authFilter === item ? "active" : ""}`} key={item} onClick={() => setAuthFilter(item)}>
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="asset-filter-group">
                <span>Segment focus</span>
                <select className="filter-select" value={segmentFilter} onChange={(event) => setSegmentFilter(event.target.value)}>
                  <option value="all">All segments</option>
                  {segments.map((segment) => (
                    <option value={segment} key={segment}>
                      {segment}
                    </option>
                  ))}
                </select>
              </div>
            </section>

            <section className="command-surface asset-archive-panel">
              <div className="eyebrow">Segment pressure</div>
              <div className="asset-segment-list">
                {segmentSnapshot.map((segment) => (
                  <button
                    type="button"
                    key={segment.segment}
                    className={`asset-segment-row ${segmentFilter === segment.segment ? "active" : ""}`}
                    onClick={() => setSegmentFilter(segment.segment)}
                  >
                    <div>
                      <strong>{segment.segment}</strong>
                      <small>{segment.total} objects in archive</small>
                    </div>
                    <span>{segment.critical} elevated</span>
                  </button>
                ))}
              </div>
            </section>
          </aside>

          <section className="asset-archive-main">
            {sortedFiltered.length === 0 ? (
              <RouteState
                type="empty"
                title="No assets match this archive query"
                message="Clear the search or relax the risk and authorization filters to restore object context."
              />
            ) : (
              <>
                {featuredAsset ? (
                  <button type="button" className="asset-specimen" onClick={() => setSelectedAssetId(featuredAsset.id)}>
                    <div className="asset-specimen-copy">
                      <div className="asset-specimen-head">
                        <div>
                          <span className="eyebrow">Lead object</span>
                          <h2>{featuredAsset.hostname}</h2>
                        </div>
                        <RiskBadge level={featuredAsset.risk_level || "low"} score={featuredAsset.risk_score || 0} />
                      </div>
                      <p>
                        {featuredAsset.authorization_state === "unauthorized"
                          ? "This object is operating outside approved authorization state and should be reviewed before it quietly normalizes."
                          : "This object is currently the sharpest specimen in the filtered archive and deserves first investigation."}
                      </p>
                      <div className="asset-specimen-meta">
                        <span><Shield size={12} /> {featuredAsset.authorization_state}</span>
                        <span><Waypoints size={12} /> {featuredAsset.segment}</span>
                        <span>{featuredAsset.site}</span>
                        <span>{(featuredAsset.open_ports || []).length} open ports</span>
                      </div>
                    </div>
                    <div className="asset-specimen-grid">
                      <article>
                        <span>IP address</span>
                        <strong className="mono">{featuredAsset.ip_address}</strong>
                      </article>
                      <article>
                        <span>MAC address</span>
                        <strong className="mono">{featuredAsset.mac_address}</strong>
                      </article>
                      <article>
                        <span>Asset type</span>
                        <strong>{featuredAsset.asset_type}</strong>
                      </article>
                      <article>
                        <span>Owner</span>
                        <strong>{featuredAsset.owner || "Unassigned"}</strong>
                      </article>
                    </div>
                  </button>
                ) : null}

                {watchlist.length > 0 ? (
                  <section className="asset-watchlist">
                    <div className="asset-watchlist-head">
                      <div className="eyebrow">Watchlist</div>
                      <p>The next objects to inspect if the lead specimen does not explain the plant-level pressure.</p>
                    </div>
                    <div className="asset-watchlist-grid">
                      {watchlist.map((asset, index) => (
                        <motion.button
                          key={asset.id}
                          type="button"
                          className="asset-watch-card"
                          onClick={() => setSelectedAssetId(asset.id)}
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.04, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        >
                          <div>
                            <span className="mono">{asset.asset_uid}</span>
                            <strong>{asset.hostname}</strong>
                          </div>
                          <RiskBadge level={asset.risk_level || "low"} score={asset.risk_score || 0} />
                          <small>{asset.segment} · {asset.authorization_state}</small>
                        </motion.button>
                      ))}
                    </div>
                  </section>
                ) : null}

                <section className="command-surface asset-ledger">
                  <div className="asset-ledger-head">
                    <div>
                      <div className="eyebrow">Deep archive ledger</div>
                      <h3>Every filtered object, still readable at operational speed.</h3>
                    </div>
                    <span className="chip">
                      {sortedFiltered.length} result{sortedFiltered.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="table-wrap" style={{ maxHeight: 580, overflow: "auto", borderRadius: 0, border: 0, borderTop: "1px solid var(--border)" }}>
                    <table className="table-hover-physics" style={{ minWidth: 980, fontSize: 12 }}>
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
                        {table.getRowModel().rows.map((row, index) => (
                          <motion.tr
                            key={row.id}
                            onClick={() => setSelectedAssetId(row.original.id)}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: Math.min(index * 0.01, 0.3), duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
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
              </>
            )}
          </section>
        </div>

        {allAssets.length === 0 ? (
          <section className="command-surface asset-archive-panel">
            <div className="route-state-guidance">
              <span>Archive is empty because the backend has not produced device records yet.</span>
              <span>Use the command route to run a scan and seed believable object state.</span>
            </div>
          </section>
        ) : null}

        <section className="command-action" style={{ borderTop: "1px solid rgba(244,241,234,0.08)", marginTop: 40, padding: "clamp(56px, 8vw, 112px) 0" }}>
          <div>
            <div className="eyebrow">Continue operations</div>
            <h2>Assets are only useful when they stay connected to the response lane.</h2>
            <p style={{ maxWidth: 600, marginTop: 16, color: "rgba(244,241,234,0.68)", lineHeight: 1.6 }}>
              Return to the command center to correlate asset state with active incidents, or inspect the topology to see how segment relationships map to real network pressure.
            </p>
            <div className="hero-actions" style={{ marginTop: 28 }}>
              <Link href="/command" className="taste-btn taste-btn-primary">
                Return to command
                <ArrowRight size={17} />
              </Link>
              <Link href="/topology" className="taste-btn">
                Inspect topology
                <Activity size={17} />
              </Link>
            </div>
          </div>
        </section>
      </div>
      <AssetDetailDrawer />
    </AppShell>
  );
}
