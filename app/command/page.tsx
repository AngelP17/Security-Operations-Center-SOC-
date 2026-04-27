"use client";

import Link from "next/link";
import { useRef, useState, useEffect } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { motion } from "framer-motion";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Factory,
  FileText,
  Network,
  Play,
  Wifi,
  XCircle,
  Zap,
  Radar,
  ShieldAlert,
  Activity,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { AssetDetailDrawer } from "@/components/shared/AssetDetailDrawer";
import { RiskBadge } from "@/components/shared/RiskBadge";
import { RouteState } from "@/components/shared/RouteState";
import { useCommandCenter, useRunDemoScan, useRunLabScan } from "@/lib/hooks/use-command-center";
import { useAssets } from "@/lib/hooks/use-assets";
import { useIncidents } from "@/lib/hooks/use-incidents";
import { useEvents } from "@/lib/hooks/use-events";
import { useForgeStore } from "@/lib/store";
import { withDemoData, demoAssets, demoEvents, demoKpis } from "@/lib/demo";
import type { Asset, SecurityEvent, Incident } from "@/lib/types";

const sectionMotion = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, ease: "easeOut" as const },
};

/* ================================================================
   COMMAND HERO — Industrial instrument panel with grouped KPIs
   ================================================================ */
function CommandHero() {
  const heroRef = useRef<HTMLElement>(null);
  const { data, isLoading } = useCommandCenter();
  const kpis = withDemoData(data?.kpis, demoKpis.kpis);

  useGSAP(() => {
    const ctx = gsap.context(() => {
      gsap.from(".hero-stat-item", {
        y: 14,
        opacity: 0,
        duration: 0.3,
        stagger: 0.05,
        ease: "power2.out",
        delay: 0.08,
      });
    }, heroRef);
    return () => ctx.revert();
  }, { scope: heroRef });

  const stats = [
    { label: "Critical incidents", value: kpis?.critical_count ?? 0, color: "var(--critical)", icon: ShieldAlert },
    { label: "High risk assets", value: kpis?.high_count ?? 0, color: "var(--high)", icon: AlertTriangle },
    { label: "Active scans", value: kpis?.active_scans ?? 0, color: "var(--cyan)", icon: Radar },
    { label: "Unacknowledged alerts", value: kpis?.open_incidents ?? 0, color: "var(--amber)", icon: Activity },
  ];

  return (
    <section
      ref={heroRef}
      className="command-surface"
      style={{
        position: "relative",
        overflow: "hidden",
        minHeight: 220,
        display: "grid",
        alignItems: "end",
        padding: 0,
        marginBottom: 14,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "url(https://picsum.photos/seed/forge-command-room/1400/1800)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "grayscale(1) contrast(1.25) brightness(0.32)",
        }}
      />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(8,11,16,0.15) 0%, rgba(8,11,16,0.92) 100%)" }} />
      <div style={{ position: "relative", zIndex: 1, padding: 24 }}>
        <div style={{ marginBottom: 18 }}>
          <div className="eyebrow" style={{ marginBottom: 6 }}>Industrial risk command</div>
          <h1
            style={{
              fontSize: "clamp(1.8rem, 3.4vw, 2.8rem)",
              lineHeight: 1.08,
              letterSpacing: "-0.03em",
              maxWidth: 560,
              fontWeight: 800,
              textWrap: "balance",
            }}
          >
            Respond before production stops
          </h1>
        </div>

        <div
          className="metric-group"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 2,
            background: "rgba(0,0,0,0.35)",
            border: "1px solid rgba(244,241,234,0.1)",
            borderRadius: 14,
            padding: 3,
            backdropFilter: "blur(10px)",
          }}
        >
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="hero-stat-item"
                style={{
                  padding: "14px 16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  borderRadius: 12,
                  background: "rgba(13,17,24,0.55)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Icon size={13} color={stat.color} />
                  <span
                    className="muted"
                    style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em" }}
                  >
                    {stat.label}
                  </span>
                </div>
                <span style={{ fontSize: 28, fontWeight: 800, color: stat.color, lineHeight: 1, fontFamily: "var(--font-mono, 'JetBrains Mono'), monospace" }}>
                  {isLoading ? "—" : stat.value}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   RISK QUEUE — Prioritized asset table with skeleton & empty
   ================================================================ */
function RiskQueue() {
  const { setSelectedAssetId, riskFilter, setRiskFilter } = useForgeStore();
  const { data, isLoading, error } = useAssets();
  const panelRef = useRef<HTMLElement>(null);
  const hasAnimated = useRef(false);

  const rawItems: Asset[] = withDemoData(data?.items, demoAssets);
  const items = rawItems
    .filter((a) => riskFilter === "all" || (a.risk_level || "low") === riskFilter)
    .sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0));

  useEffect(() => {
    if (items.length > 0 && panelRef.current && !hasAnimated.current) {
      hasAnimated.current = true;
      gsap.from(panelRef.current.querySelectorAll("tbody tr"), {
        y: 6,
        opacity: 0,
        duration: 0.24,
        stagger: 0.012,
        ease: "power2.out",
      });
    }
  }, [items.length]);

  if (isLoading) return <RouteState type="loading" skeletonLayout="table" title="Loading risk queue" />;
  if (error) return <RouteState type="error" title="Risk queue unavailable" message="Failed to load assets from API." actionLabel="Retry" onAction={() => window.location.reload()} />;

  return (
    <motion.section
      ref={panelRef}
      className="command-surface"
      style={{ minHeight: 320, minWidth: 0, overflow: "hidden", display: "grid", gridTemplateRows: "auto 1fr" }}
      {...sectionMotion}
      transition={{ ...sectionMotion.transition, delay: 0.05 }}
    >
      <div style={{ padding: "16px 16px 10px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div className="eyebrow">Prioritized Risk Queue</div>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginTop: 4, letterSpacing: "-0.01em" }}>Queue by security risk decision</h2>
        </div>
        <div className="filters">
          {["all", "critical", "high", "medium", "low"].map((level) => (
            <button
              className={`filter ${riskFilter === level ? "active" : ""}`}
              key={level}
              onClick={() => setRiskFilter(level)}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      {items.length === 0 ? (
        <RouteState
          type="empty"
          title="No assets in risk queue"
          message="Run a scan to discover and assess assets."
          actionLabel="Run demo scan"
          onAction={() => {}}
        />
      ) : (
        <div className="table-wrap" style={{ maxHeight: 480, overflowX: "auto", borderRadius: 0, border: 0, borderTop: "1px solid var(--border)" }}>
          <table style={{ minWidth: 560, fontSize: 12 }}>
            <thead>
              <tr>
                <th>Risk</th>
                <th>Title</th>
                <th>Asset / Site</th>
                <th>Detected</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((asset) => (
                <tr key={asset.id} onClick={() => setSelectedAssetId(asset.id)}>
                  <td>
                    <RiskBadge level={asset.risk_level || "low"} score={asset.risk_score} />
                  </td>
                  <td style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    <strong>{asset.hostname}</strong>
                  </td>
                  <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    <span className="mono" style={{ fontSize: 11 }}>{asset.asset_uid}</span>
                    <span className="muted" style={{ fontSize: 10, display: "block", marginTop: 2 }}>{asset.site}</span>
                  </td>
                  <td className="mono" style={{ fontSize: 11 }}>
                    {asset.last_seen ? new Date(asset.last_seen).toLocaleString() : "—"}
                  </td>
                  <td>
                    <span
                      className="chip"
                      style={{
                        fontSize: 10,
                        ...(asset.status === "Online"
                          ? { background: "rgba(34,197,94,.1)", borderColor: "rgba(34,197,94,.3)", color: "var(--low)" }
                          : asset.status === "Offline"
                            ? { background: "rgba(239,68,68,.1)", borderColor: "rgba(239,68,68,.3)", color: "var(--critical)" }
                            : {}),
                      }}
                    >
                      {asset.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.section>
  );
}

/* ================================================================
   EVENT STREAM — Live telemetry with skeleton & empty
   ================================================================ */
function EventStream() {
  const { data: eventsData, isLoading } = useEvents(20, 0);
  const { data: assetsData } = useAssets();
  const panelRef = useRef<HTMLElement>(null);
  const hasAnimated = useRef(false);

  const events: SecurityEvent[] = withDemoData(eventsData?.items, demoEvents);
  const assetMap = new Map<number, Asset>((withDemoData(assetsData?.items, demoAssets)).map((a: Asset) => [a.id, a]));

  useEffect(() => {
    if (events.length > 0 && panelRef.current && !hasAnimated.current) {
      hasAnimated.current = true;
      gsap.from(panelRef.current.querySelectorAll("tbody tr"), {
        y: 6,
        opacity: 0,
        duration: 0.24,
        stagger: 0.012,
        ease: "power2.out",
      });
    }
  }, [events.length]);

  if (isLoading) return <RouteState type="loading" skeletonLayout="events" title="Loading events" />;

  return (
    <motion.section
      ref={panelRef}
      className="command-surface"
      style={{ minHeight: 280, minWidth: 0, overflow: "hidden" }}
      {...sectionMotion}
      transition={{ ...sectionMotion.transition, delay: 0.1 }}
    >
      <div style={{ padding: "16px 16px 10px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div className="eyebrow">Live Event Stream</div>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginTop: 4, letterSpacing: "-0.01em" }}>Security events</h2>
        </div>
        <span className="chip">
          <Wifi size={12} /> live
        </span>
      </div>
      {events.length === 0 ? (
        <RouteState type="empty" title="No events recorded" message="Events appear when scans discover new assets or risks change." />
      ) : (
        <div className="table-wrap" style={{ maxHeight: 340, overflow: "auto", borderRadius: 0, border: 0, borderTop: "1px solid var(--border)" }}>
          <table style={{ minWidth: 720, fontSize: 12 }}>
            <thead>
              <tr>
                <th>Severity</th>
                <th>Time</th>
                <th>Asset</th>
                <th>Event</th>
                <th>Source</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td><RiskBadge level={event.severity} /></td>
                  <td className="mono" style={{ fontSize: 11 }}>{new Date(event.observed_at).toLocaleString()}</td>
                  <td>
                    {assetMap.get(event.asset_id || 0)?.hostname || event.asset_id ? `Asset ${event.asset_id}` : "—"}
                  </td>
                  <td>{event.event_type}</td>
                  <td>{event.source}</td>
                  <td><span className="chip" style={{ fontSize: 10 }}>New</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.section>
  );
}

/* ================================================================
   EXPOSURE BY PORT — Chart with skeleton & empty
   ================================================================ */
function ExposureByPort() {
  const { data } = useAssets();
  const assets: Asset[] = withDemoData(data?.items, demoAssets);

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

  if (!data?.items && !assets.length) {
    return <RouteState type="loading" skeletonLayout="chart" title="Loading exposure data" />;
  }

  return (
    <motion.section
      className="command-surface"
      style={{ minWidth: 0, overflow: "hidden" }}
      {...sectionMotion}
      transition={{ ...sectionMotion.transition, delay: 0.1 }}
    >
      <div style={{ padding: "16px 16px 10px" }}>
        <div className="eyebrow">Top Exposed Services</div>
      </div>
      {chartData.length === 0 ? (
        <div style={{ padding: "0 16px 16px" }}>
          <RouteState type="empty" title="No exposed services" message="Run a scan to discover open ports and services." />
        </div>
      ) : (
        <div style={{ padding: "0 16px 16px" }}>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData}>
              <XAxis dataKey="port" stroke="#8892A3" fontSize={10} angle={-20} textAnchor="end" height={50} />
              <YAxis stroke="#8892A3" fontSize={11} />
              <Tooltip
                contentStyle={{
                  background: "#121824",
                  border: "1px solid rgba(148,163,184,.18)",
                  borderRadius: 14,
                }}
              />
              <Bar dataKey="risk" fill="#D99A2B" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.section>
  );
}

/* ================================================================
   TOPOLOGY PREVIEW — Compact asset list with skeleton & empty
   ================================================================ */
function TopologyPreview() {
  const { setSelectedAssetId } = useForgeStore();
  const { data, isLoading } = useAssets();
  const assets: Asset[] = withDemoData(data?.items, demoAssets).slice(0, 6);

  if (isLoading) return <RouteState type="loading" skeletonLayout="topology" title="Loading topology" />;

  return (
    <motion.section
      className="command-surface"
      style={{ minWidth: 0, overflow: "hidden" }}
      {...sectionMotion}
      transition={{ ...sectionMotion.transition, delay: 0.12 }}
    >
      <div style={{ padding: "16px 16px 10px" }}>
        <div className="eyebrow">Topology Preview</div>
      </div>
      <div style={{ padding: "0 16px 16px", display: "grid", gap: 6 }}>
        {assets.length === 0 ? (
          <RouteState type="empty" title="No topology data" message="Discover assets to build the topology graph." />
        ) : (
          assets.map((asset) => (
            <div
              key={asset.id}
              onClick={() => setSelectedAssetId(asset.id)}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid var(--border)",
                cursor: "pointer",
                background: asset.risk_level === "critical" ? "rgba(239,68,68,.08)" : "rgba(244,241,234,0.02)",
                minWidth: 0,
                overflow: "hidden",
                transition: "background 0.2s ease, border-color 0.2s ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(217,154,43,0.35)";
                (e.currentTarget as HTMLDivElement).style.background = asset.risk_level === "critical" ? "rgba(239,68,68,.12)" : "rgba(244,241,234,0.05)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)";
                (e.currentTarget as HTMLDivElement).style.background = asset.risk_level === "critical" ? "rgba(239,68,68,.08)" : "rgba(244,241,234,0.02)";
              }}
            >
              <div style={{ minWidth: 0, overflow: "hidden" }}>
                <strong style={{ fontSize: 12, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {asset.hostname}
                </strong>
                <div className="mono muted" style={{ fontSize: 10, marginTop: 2 }}>{asset.ip_address}</div>
              </div>
              <RiskBadge level={asset.risk_level || "low"} score={asset.risk_score} />
            </div>
          ))
        )}
      </div>
    </motion.section>
  );
}

/* ================================================================
   SCAN STATUS — Run scan panel
   ================================================================ */
function ScanStatusPanel() {
  const { labMode, setLabMode } = useForgeStore();
  const demoScan = useRunDemoScan();
  const labScan = useRunLabScan();
  const [profile, setProfile] = useState(labMode ? "lab" : "demo");
  const [scope, setScope] = useState("192.168.1.0/24");

  const isPending = demoScan.isPending || labScan.isPending;
  const isSuccess = demoScan.isSuccess || labScan.isSuccess;
  const isError = demoScan.isError || labScan.isError;
  const scanResult = demoScan.data || labScan.data;

  const handleRun = () => {
    if (profile === "lab") {
      labScan.mutate(scope);
    } else {
      demoScan.mutate();
    }
  };

  return (
    <motion.section
      className="command-surface"
      style={{ minWidth: 0, overflow: "hidden" }}
      {...sectionMotion}
      transition={{ ...sectionMotion.transition, delay: 0.15 }}
    >
      <div style={{ padding: "16px 16px 10px" }}>
        <div className="eyebrow">Run Scan</div>
      </div>
      <div style={{ padding: "0 16px 16px", display: "grid", gap: 10 }}>
        <div style={{ display: "grid", gap: 5 }}>
          <label className="muted" style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em" }}>Profile</label>
          <select
            className="filter-select"
            style={{ width: "100%" }}
            value={profile}
            onChange={(e) => { setProfile(e.target.value); setLabMode(e.target.value === "lab"); }}
          >
            <option value="demo">Safe demo</option>
            <option value="lab">Lab mode</option>
          </select>
        </div>
        <div style={{ display: "grid", gap: 5 }}>
          <label className="muted" style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em" }}>Scope</label>
          <select
            className="filter-select"
            style={{ width: "100%" }}
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            disabled={profile === "demo"}
          >
            <option value="192.168.1.0/24">192.168.1.0/24</option>
            <option value="10.0.0.0/8">10.0.0.0/8</option>
            <option value="172.16.0.0/12">172.16.0.0/12</option>
          </select>
        </div>
        <button
          className="btn primary"
          onClick={handleRun}
          disabled={isPending}
          style={{
            width: "100%",
            background: "linear-gradient(180deg, rgba(217,154,43,.85), rgba(217,154,43,.65))",
            color: "#080b10",
            borderColor: "rgba(217,154,43,.9)",
            fontWeight: 800,
          }}
        >
          <Play size={14} /> {isPending ? "Scanning..." : "Run scan"}
        </button>
        {isSuccess ? (
          <div className="chip" style={{ background: "rgba(34,197,94,.1)", borderColor: "rgba(34,197,94,.3)", color: "var(--low)" }}>
            <CheckCircle2 size={12} /> {scanResult?.scan_uid} complete — {scanResult?.assets_discovered} assets discovered
          </div>
        ) : null}
        {isError ? (
          <div className="chip" style={{ background: "rgba(239,68,68,.1)", borderColor: "rgba(239,68,68,.3)", color: "var(--critical)" }}>
            <XCircle size={12} /> Scan failed
          </div>
        ) : null}
      </div>
    </motion.section>
  );
}

/* ================================================================
   AETHER STATUS — Incident sync state
   ================================================================ */
function AetherStatus() {
  const { data: incidentsData } = useIncidents();
  const incidents = incidentsData?.items || [];

  const topIncident = incidents
    .filter((i: Incident) => i.status !== "Closed" && i.status !== "Resolved")
    .sort((a: Incident, b: Incident) => b.risk_score - a.risk_score)[0];

  const syncStatus = topIncident?.aether_sync_status || "offline";
  const isOnline = syncStatus === "synced" || syncStatus === "online";
  const actionCount = topIncident?.recommendations?.length || 0;

  return (
    <motion.section
      className="command-surface"
      style={{ minWidth: 0, overflow: "hidden" }}
      {...sectionMotion}
      transition={{ ...sectionMotion.transition, delay: 0.18 }}
    >
      <div style={{ padding: "16px 16px 10px" }}>
        <div className="eyebrow">Aether Status</div>
      </div>
      <div style={{ padding: "0 16px 16px", display: "grid", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: isOnline ? "var(--low)" : "var(--critical)",
              boxShadow: isOnline ? "0 0 0 4px rgba(34,197,94,.18)" : "0 0 0 4px rgba(239,68,68,.18)",
              flexShrink: 0,
            }}
          />
          <span style={{ fontWeight: 700, fontSize: 13 }}>{isOnline ? "Online" : "Offline"}</span>
        </div>
        <p className="muted" style={{ fontSize: 12, lineHeight: 1.5, margin: 0 }}>
          {topIncident
            ? `Active response for ${topIncident.incident_uid}: ${topIncident.title}`
            : "No active incident. Aether is standing by."}
        </p>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 10, borderTop: "1px solid var(--border)" }}>
          <span className="muted" style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em" }}>Recommended actions</span>
          <strong style={{ fontSize: 20, fontWeight: 800, fontFamily: "var(--font-mono, 'JetBrains Mono'), monospace" }}>{actionCount}</strong>
        </div>
      </div>
    </motion.section>
  );
}

/* ================================================================
   QUICK ACTIONS — Navigation shortcuts
   ================================================================ */
function QuickActions() {
  const actions = [
    { label: "Open topology", href: "/topology", icon: Network },
    { label: "Review incidents", href: "/incidents", icon: AlertTriangle },
    { label: "Inspect assets", href: "/assets", icon: Factory },
    { label: "Generate report", href: "/reports", icon: FileText },
  ];

  return (
    <motion.section
      className="command-surface"
      style={{ minWidth: 0, overflow: "hidden" }}
      {...sectionMotion}
      transition={{ ...sectionMotion.transition, delay: 0.2 }}
    >
      <div style={{ padding: "16px 16px 10px" }}>
        <div className="eyebrow">Quick Actions</div>
      </div>
      <div style={{ padding: "0 16px 16px", display: "grid", gap: 5 }}>
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.label}
              href={action.href}
              className="btn"
              style={{
                justifyContent: "space-between",
                width: "100%",
                textDecoration: "none",
                fontWeight: 600,
                minHeight: 36,
                fontSize: 12,
                borderRadius: 10,
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Icon size={14} /> {action.label}
              </span>
              <ArrowUpRight size={13} className="muted" />
            </Link>
          );
        })}
      </div>
    </motion.section>
  );
}

/* ================================================================
   ACTIVE INCIDENT — Focus panel when incidents exist
   ================================================================ */
function ActiveIncidentPanel() {
  const { data: incidentsData } = useIncidents();
  const incidents = incidentsData?.items || [];
  const active = incidents
    .filter((i: Incident) => i.status !== "Closed" && i.status !== "Resolved")
    .sort((a: Incident, b: Incident) => b.risk_score - a.risk_score)[0];

  if (!active) return null;

  return (
    <motion.section
      className="command-surface"
      style={{ minWidth: 0, overflow: "hidden", borderLeft: "3px solid var(--critical)" }}
      {...sectionMotion}
      transition={{ ...sectionMotion.transition, delay: 0.14 }}
    >
      <div style={{ padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
          <div>
            <div className="eyebrow">Active Incident</div>
            <h2 style={{ fontSize: 14, fontWeight: 700, marginTop: 4, letterSpacing: "-0.01em", maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {active.title}
            </h2>
          </div>
          <RiskBadge level={active.severity} score={active.risk_score} />
        </div>
        <p className="muted" style={{ fontSize: 12, lineHeight: 1.5, margin: 0 }}>{active.summary}</p>
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <Link href={`/incidents/${active.id}`} className="btn primary" style={{ textDecoration: "none", fontSize: 12, minHeight: 32 }}>
            <Zap size={13} /> Open workbench
          </Link>
        </div>
      </div>
    </motion.section>
  );
}

/* ================================================================
   PAGE SHELL
   ================================================================ */
export default function CommandPage() {
  return (
    <AppShell>
      <main className="taste-command" style={{ padding: "20px clamp(18px, 3vw, 42px)" }}>
        <CommandHero />

        <div className="command-grid" style={{ gap: 14 }}>
          <div style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 0.8fr)", gap: 14 }}>
              <RiskQueue />
              <div style={{ display: "grid", gap: 14, alignContent: "start" }}>
                <ActiveIncidentPanel />
                <TopologyPreview />
                <ExposureByPort />
              </div>
            </div>
          </div>
          <div className="right-rail" style={{ gap: 14 }}>
            <ScanStatusPanel />
            <AetherStatus />
            <QuickActions />
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <EventStream />
        </div>
      </main>

      <AssetDetailDrawer />
    </AppShell>
  );
}
