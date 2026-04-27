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
import type { Asset, SecurityEvent, Incident } from "@/lib/types";

const sectionMotion = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: "easeOut" as const },
};

function CommandHero() {
  const heroRef = useRef<HTMLElement>(null);
  const { data } = useCommandCenter();
  const kpis = data?.kpis;

  useGSAP(() => {
    const ctx = gsap.context(() => {
      gsap.from(".hero-title", { y: 14, opacity: 0, duration: 0.35, ease: "power2.out" });
      gsap.from(".hero-stat-item", {
        y: 16,
        opacity: 0,
        duration: 0.32,
        stagger: 0.06,
        ease: "power2.out",
        delay: 0.1,
      });
    }, heroRef);
    return () => ctx.revert();
  }, { scope: heroRef });

  return (
    <section
      ref={heroRef}
      style={{
        position: "relative",
        borderRadius: 22,
        overflow: "hidden",
        minHeight: 260,
        display: "grid",
        alignItems: "end",
        padding: 28,
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
          filter: "grayscale(1) contrast(1.25) brightness(0.38)",
        }}
      />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(8,11,16,0.25) 0%, rgba(8,11,16,0.9) 100%)" }} />
      <div style={{ position: "relative", zIndex: 1 }}>
        <div className="hero-title">
          <div className="eyebrow" style={{ marginBottom: 8, color: "var(--amber)" }}>
            Industrial risk command
          </div>
          <h1
            style={{
              fontSize: "clamp(2.2rem, 4vw, 3.6rem)",
              lineHeight: 1.05,
              letterSpacing: "-0.035em",
              maxWidth: 640,
              fontWeight: 800,
            }}
          >
            Critical assets need action
          </h1>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 10,
            marginTop: 22,
          }}
        >
          {[
            { label: "Critical incidents", value: kpis?.critical_count || 0, color: "var(--critical)" },
            { label: "High risk assets", value: kpis?.high_count || 0, color: "var(--high)" },
            { label: "Active scans", value: kpis?.active_scans || 0, color: "var(--cyan)" },
            { label: "Unacknowledged alerts", value: kpis?.open_incidents || 0, color: "var(--amber)" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="hero-stat-item"
              style={{
                padding: "14px 16px",
                borderRadius: 16,
                border: "1px solid rgba(244,241,234,0.12)",
                background: "rgba(13,17,24,0.82)",
                backdropFilter: "blur(14px)",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <span
                className="muted"
                style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em" }}
              >
                {stat.label}
              </span>
              <span style={{ fontSize: 26, fontWeight: 800, color: stat.color, lineHeight: 1 }}>
                {stat.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function RiskQueue() {
  const { setSelectedAssetId, riskFilter, setRiskFilter } = useForgeStore();
  const { data, isLoading, error } = useAssets();
  const panelRef = useRef<HTMLElement>(null);
  const hasAnimated = useRef(false);

  const items: Asset[] = (data?.items || [])
    .filter((a: Asset) => riskFilter === "all" || (a.risk_level || "low") === riskFilter)
    .sort((a: Asset, b: Asset) => (b.risk_score || 0) - (a.risk_score || 0));

  useEffect(() => {
    if (items.length > 0 && panelRef.current && !hasAnimated.current) {
      hasAnimated.current = true;
      gsap.from(panelRef.current.querySelectorAll("tbody tr"), {
        y: 8,
        opacity: 0,
        duration: 0.28,
        stagger: 0.015,
        ease: "power2.out",
      });
    }
  }, [items.length]);

  if (isLoading) return <RouteState type="loading" title="Loading risk queue..." />;
  if (error) return <RouteState type="error" title="Risk queue unavailable" message="Failed to load assets from API." />;

  return (
    <motion.section
      ref={panelRef}
      className="panel risk-queue-panel"
      style={{ minHeight: 320, minWidth: 0, overflow: "hidden" }}
      {...sectionMotion}
      transition={{ ...sectionMotion.transition, delay: 0.05 }}
    >
      <div className="page-head">
        <div>
          <div className="eyebrow">Prioritized Risk Queue</div>
          <h2>Queue by security risk decision</h2>
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
        <RouteState type="empty" title="No assets in risk queue" message="Run a scan to discover and assess assets." />
      ) : (
        <div className="table-wrap" style={{ maxHeight: 520, overflowX: "auto" }}>
          <table style={{ minWidth: 520 }}>
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
              {items.map((asset: Asset) => (
                <tr key={asset.id} onClick={() => setSelectedAssetId(asset.id)}>
                  <td>
                    <RiskBadge level={asset.risk_level || "low"} score={asset.risk_score} />
                  </td>
                  <td style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    <strong>{asset.hostname}</strong>
                  </td>
                  <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    <span className="mono" style={{ fontSize: 12 }}>
                      {asset.asset_uid}
                    </span>
                    <span className="muted" style={{ fontSize: 11, display: "block", marginTop: 2 }}>
                      {asset.site}
                    </span>
                  </td>
                  <td className="mono" style={{ fontSize: 12 }}>
                    {asset.last_seen ? new Date(asset.last_seen).toLocaleString() : "—"}
                  </td>
                  <td>
                    <span
                      className="chip"
                      style={{
                        fontSize: 11,
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

function EventStream() {
  const { data: eventsData, isLoading } = useEvents(20, 0);
  const { data: assetsData } = useAssets();
  const panelRef = useRef<HTMLElement>(null);
  const hasAnimated = useRef(false);

  const events: SecurityEvent[] = eventsData?.items || [];
  const assetMap = new Map<number, Asset>((assetsData?.items || []).map((a: Asset) => [a.id, a]));

  useEffect(() => {
    if (events.length > 0 && panelRef.current && !hasAnimated.current) {
      hasAnimated.current = true;
      gsap.from(panelRef.current.querySelectorAll("tbody tr"), {
        y: 8,
        opacity: 0,
        duration: 0.28,
        stagger: 0.015,
        ease: "power2.out",
      });
    }
  }, [events.length]);

  if (isLoading) return <RouteState type="loading" title="Loading events..." />;

  return (
    <motion.section
      ref={panelRef}
      className="panel event-stream-panel"
      style={{ minHeight: 280, minWidth: 0, overflow: "hidden" }}
      {...sectionMotion}
      transition={{ ...sectionMotion.transition, delay: 0.1 }}
    >
      <div className="page-head">
        <div>
          <div className="eyebrow">Live Event Stream</div>
          <h2>Security events</h2>
        </div>
        <span className="chip">
          <Wifi size={13} /> live
        </span>
      </div>
      {events.length === 0 ? (
        <p className="muted">No events recorded.</p>
      ) : (
        <div className="table-wrap" style={{ maxHeight: 360, overflow: "auto" }}>
          <table style={{ minWidth: 720 }}>
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
              {events.map((event: SecurityEvent) => (
                <tr key={event.id}>
                  <td>
                    <RiskBadge level={event.severity} />
                  </td>
                  <td className="mono" style={{ fontSize: 12 }}>
                    {new Date(event.observed_at).toLocaleString()}
                  </td>
                  <td>
                    {assetMap.get(event.asset_id || 0)?.hostname || event.asset_id
                      ? `Asset ${event.asset_id}`
                      : "—"}
                  </td>
                  <td>{event.event_type}</td>
                  <td>{event.source}</td>
                  <td>
                    <span className="chip" style={{ fontSize: 11 }}>
                      New
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
    <motion.section
      className="panel"
      style={{ minWidth: 0, overflow: "hidden" }}
      {...sectionMotion}
      transition={{ ...sectionMotion.transition, delay: 0.1 }}
    >
      <div className="eyebrow">Top Exposed Services</div>
      {chartData.length === 0 ? (
        <p className="muted" style={{ marginTop: 10 }}>
          No exposed services discovered yet.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={190}>
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
      )}
    </motion.section>
  );
}

function TopologyPreview() {
  const { setSelectedAssetId } = useForgeStore();
  const { data } = useAssets();
  const assets: Asset[] = (data?.items || []).slice(0, 6);

  return (
    <motion.section
      className="panel"
      style={{ minWidth: 0, overflow: "hidden" }}
      {...sectionMotion}
      transition={{ ...sectionMotion.transition, delay: 0.12 }}
    >
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
                <strong
                  style={{
                    fontSize: 13,
                    display: "block",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {asset.hostname}
                </strong>
                <div className="mono muted" style={{ fontSize: 11 }}>
                  {asset.ip_address}
                </div>
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
      className="panel"
      style={{ minWidth: 0, overflow: "hidden" }}
      {...sectionMotion}
      transition={{ ...sectionMotion.transition, delay: 0.15 }}
    >
      <div className="eyebrow">Run Scan</div>
      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        <div style={{ display: "grid", gap: 6 }}>
          <label
            className="muted"
            style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em" }}
          >
            Profile
          </label>
          <select
            className="filter-select"
            style={{ width: "100%" }}
            value={profile}
            onChange={(e) => {
              setProfile(e.target.value);
              setLabMode(e.target.value === "lab");
            }}
          >
            <option value="demo">Safe demo</option>
            <option value="lab">Lab mode</option>
          </select>
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          <label
            className="muted"
            style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em" }}
          >
            Scope
          </label>
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
          <Play size={15} /> {isPending ? "Scanning..." : "Run scan"}
        </button>
        {isSuccess ? (
          <div
            className="chip"
            style={{
              background: "rgba(34,197,94,.1)",
              borderColor: "rgba(34,197,94,.3)",
              color: "var(--low)",
            }}
          >
            <CheckCircle2 size={13} /> {scanResult?.scan_uid} complete — {scanResult?.assets_discovered} assets discovered
          </div>
        ) : null}
        {isError ? (
          <div
            className="chip"
            style={{
              background: "rgba(239,68,68,.1)",
              borderColor: "rgba(239,68,68,.3)",
              color: "var(--critical)",
            }}
          >
            <XCircle size={13} /> Scan failed
          </div>
        ) : null}
      </div>
    </motion.section>
  );
}

function AetherStatus() {
  const { data: incidentsData } = useIncidents();

  const topIncident = (incidentsData?.items || [])
    .filter((i: Incident) => i.status !== "Closed" && i.status !== "Resolved")
    .sort((a: Incident, b: Incident) => b.risk_score - a.risk_score)[0];

  const syncStatus = topIncident?.aether_sync_status || "offline";
  const isOnline = syncStatus === "synced" || syncStatus === "online";
  const actionCount = topIncident?.recommendations?.length || 0;

  return (
    <motion.section
      className="panel"
      style={{ minWidth: 0, overflow: "hidden" }}
      {...sectionMotion}
      transition={{ ...sectionMotion.transition, delay: 0.18 }}
    >
      <div className="eyebrow">Aether Status</div>
      <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: isOnline ? "var(--low)" : "var(--critical)",
              boxShadow: isOnline
                ? "0 0 0 4px rgba(34,197,94,.18)"
                : "0 0 0 4px rgba(239,68,68,.18)",
              flexShrink: 0,
            }}
          />
          <span style={{ fontWeight: 700, fontSize: 14 }}>{isOnline ? "Online" : "Offline"}</span>
        </div>
        <p className="muted" style={{ fontSize: 13, lineHeight: 1.5, margin: 0 }}>
          {topIncident
            ? `Active response for ${topIncident.incident_uid}: ${topIncident.title}`
            : "No active incident. Aether is standing by."}
        </p>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: 10,
            borderTop: "1px solid var(--border)",
          }}
        >
          <span
            className="muted"
            style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em" }}
          >
            Recommended actions
          </span>
          <strong style={{ fontSize: 20, fontWeight: 800 }}>{actionCount}</strong>
        </div>
      </div>
    </motion.section>
  );
}

function QuickActions() {
  const actions = [
    { label: "Open topology", href: "/topology", icon: Network },
    { label: "Review incidents", href: "/incidents", icon: AlertTriangle },
    { label: "Inspect assets", href: "/assets", icon: Factory },
    { label: "Generate report", href: "/reports", icon: FileText },
  ];

  return (
    <motion.section
      className="panel"
      style={{ minWidth: 0, overflow: "hidden" }}
      {...sectionMotion}
      transition={{ ...sectionMotion.transition, delay: 0.2 }}
    >
      <div className="eyebrow">Quick Actions</div>
      <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
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
                minHeight: 40,
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Icon size={15} /> {action.label}
              </span>
              <ArrowUpRight size={14} className="muted" />
            </Link>
          );
        })}
      </div>
    </motion.section>
  );
}

export default function CommandPage() {
  return (
    <AppShell>
      <main className="taste-command" style={{ padding: "20px clamp(18px, 3vw, 42px)" }}>
        <CommandHero />

        <div className="command-grid">
          <div style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 0.8fr)", gap: 14 }}>
              <RiskQueue />
              <div style={{ display: "grid", gap: 14, alignContent: "start" }}>
                <TopologyPreview />
                <ExposureByPort />
              </div>
            </div>
          </div>
          <div className="right-rail">
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
