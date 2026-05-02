"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Play,
  Radar,
  Wifi,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { AssetDetailDrawer } from "@/components/shared/AssetDetailDrawer";
import { RiskBadge } from "@/components/shared/RiskBadge";
import { RouteState } from "@/components/shared/RouteState";
import { useAssets } from "@/lib/hooks/use-assets";
import { useCommandCenter, useRunDemoScan, useRunLabScan, useScanProfiles } from "@/lib/hooks/use-command-center";
import { useEvents } from "@/lib/hooks/use-events";
import { useIncidents } from "@/lib/hooks/use-incidents";
import { useActiveScanRun, useCancelScan, useScanStatus } from "@/lib/hooks/use-scans";
import { useForgeStore } from "@/lib/store";
import type { Asset, CommandSummaryData, Incident, ScanProfile, SecurityEvent } from "@/lib/types";

gsap.registerPlugin(ScrollTrigger);

function formatTimestamp(value?: string | null) {
  return value ? new Date(value).toLocaleString() : "No scan recorded";
}

function getActiveIncident(incidents: Incident[]) {
  return incidents
    .filter((incident) => incident.status !== "Closed" && incident.status !== "Resolved")
    .sort((a, b) => b.risk_score - a.risk_score)[0];
}

function buildSignalDeck({
  command,
  topIncident,
  assets,
  events,
}: {
  command?: CommandSummaryData;
  topIncident?: Incident;
  assets: Asset[];
  events: SecurityEvent[];
}) {
  return [
    {
      quote: topIncident
        ? `“${topIncident.title} is still the loudest thread in the room, and the response path already knows which assets are attached.”`
        : "“The response lane is clear. Run a safe discovery pass to seed the command system with real objects.”",
      label: topIncident?.incident_uid || "Command brief",
      detail: topIncident
        ? `${topIncident.affected_assets.length} affected assets · ${topIncident.confidence_score}% confidence`
        : "No open incident in focus",
      tone: "incident",
    },
    {
      quote:
        `“${command?.kpis?.unauthorized_count || 0} unauthorized objects and ${command?.kpis?.critical_count || 0} critical decisions are shaping the next containment move.”`,
      label: "Risk posture",
      detail: `${assets.length} assets visible · ${events.length} recent events`,
      tone: "risk",
    },
    {
      quote:
        command?.recommended_action
          ? `“${command.recommended_action}”`
          : "“Once the first scan completes, recommended containment language will surface here for the next shift.”",
      label: "Response guidance",
      detail: command?.data_freshness ? `Data freshness: ${command.data_freshness}` : "Run demo scan to hydrate telemetry",
      tone: "response",
    },
  ];
}

function CinematicHero({
  command,
  topIncident,
}: {
  command?: CommandSummaryData;
  topIncident?: Incident;
}) {
  const heroRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    const ctx = gsap.context(() => {
      gsap.from(".command-cinema-copy > *", {
        y: 40,
        opacity: 0,
        duration: 0.9,
        stagger: 0.1,
        ease: "power3.out",
      });

      gsap.from(".command-cinema-figure, .command-cinema-note", {
        y: 60,
        opacity: 0,
        duration: 1,
        stagger: 0.12,
        ease: "power3.out",
        delay: 0.15,
      });
    }, heroRef);
    return () => ctx.revert();
  }, { scope: heroRef });

  return (
    <section ref={heroRef} className="command-cinema">
      <div className="command-cinema-media" />
      <div className="command-cinema-wash" />
      <div className="command-cinema-copy">
        <div className="hero-kicker">ForgeSentinel industrial command system</div>
        <h1 className="command-cinema-title" style={{ maxWidth: "72rem" }}>
          Map the
          {" "}
          <span className="inline-photo inline-photo-signal" aria-hidden="true" />
          {" "}
          blast radius before the plant feels it.
        </h1>
        <p className="command-cinema-body">
          The command layer now centers the response story first: which incident is loudest, which assets are attached,
          what the next recommendation says, and how fast the team can move without opening five disconnected views.
        </p>
        <div className="hero-actions">
          <Link href="/topology" className="taste-btn taste-btn-primary">
            Follow the topology
            <ArrowRight size={17} />
          </Link>
          <Link href="/incidents" className="taste-btn">
            Open incident workbench
            <ArrowUpRight size={17} />
          </Link>
        </div>
      </div>
      <div className="command-cinema-stage">
        <div className="command-cinema-figure">
          <div className="command-cinema-figure-label">Response in focus</div>
          <strong>{topIncident?.incident_uid || "Ready for first incident lead"}</strong>
          <p>
            {topIncident?.title ||
              "Run a safe discovery scan to establish asset context, exposure findings, and the first response thread."}
          </p>
        </div>
        <div className="command-cinema-note">
          <span>{command?.data_freshness ? `Data ${command.data_freshness}` : "Telemetry not hydrated"}</span>
          <strong>{command?.recommended_action || "Recommendation language appears here once the backend correlates the first incident."}</strong>
        </div>
      </div>
    </section>
  );
}

function RiskQueue({
  assets,
  isLoading,
  hasError,
}: {
  assets: Asset[];
  isLoading: boolean;
  hasError: boolean;
}) {
  const { riskFilter, setRiskFilter, setSelectedAssetId } = useForgeStore();
  const filteredAssets = useMemo(
    () => assets
      .filter((asset) => riskFilter === "all" || (asset.risk_level || "low") === riskFilter)
      .sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0)),
    [assets, riskFilter],
  );

  if (isLoading) return <RouteState type="loading" skeletonLayout="table" title="Loading risk queue" />;
  if (hasError) {
    return (
      <RouteState
        type="error"
        title="Risk queue unavailable"
        message="The asset feed could not be loaded from the API."
        actionLabel="Reload"
        onAction={() => window.location.reload()}
      />
    );
  }

  return (
    <section className="command-surface" style={{ minHeight: "100%", overflow: "hidden" }}>
      <div style={{ padding: "22px 22px 14px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
        <div>
          <div className="eyebrow">Priority queue</div>
          <h3 style={{ fontSize: 22, lineHeight: 1.02, letterSpacing: "-0.04em", marginTop: 8 }}>
            Lead with the assets that can actually stop production.
          </h3>
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

      {filteredAssets.length === 0 ? (
        <div style={{ padding: "0 22px 22px" }}>
          <RouteState
            type="empty"
            title="No assets in the queue"
            message="Run a safe demo scan or an authorized lab scan to seed real asset records."
          />
        </div>
      ) : (
        <div className="table-wrap" style={{ maxHeight: 520, overflowX: "auto", borderRadius: 0, border: 0, borderTop: "1px solid var(--border)" }}>
          <table style={{ minWidth: 700, fontSize: 12 }}>
            <thead>
              <tr>
                <th>Risk</th>
                <th>Hostname</th>
                <th>Segment</th>
                <th>Ports</th>
                <th>Observed</th>
                <th>State</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssets.slice(0, 12).map((asset) => (
                <tr key={asset.id} onClick={() => setSelectedAssetId(asset.id)}>
                  <td><RiskBadge level={asset.risk_level || "low"} score={asset.risk_score} /></td>
                  <td>
                    <strong>{asset.hostname}</strong>
                    <span className="muted" style={{ display: "block", marginTop: 3, fontSize: 10 }}>{asset.asset_uid}</span>
                  </td>
                  <td>{asset.segment}</td>
                  <td className="mono" style={{ fontSize: 11 }}>
                    {(asset.open_ports || []).slice(0, 3).map((port) => port.port).join(", ") || "—"}
                  </td>
                  <td className="mono" style={{ fontSize: 11 }}>{formatTimestamp(asset.last_seen)}</td>
                  <td>
                    <span className="chip" style={{ fontSize: 10 }}>{asset.authorization_state}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function ProfileAccordion({
  profiles,
  isLoading,
  hasError,
  activeProfile,
  setActiveProfile,
}: {
  profiles: ScanProfile[];
  isLoading: boolean;
  hasError: boolean;
  activeProfile: string;
  setActiveProfile: (profile: string) => void;
}) {
  const { scanProfile, setScanProfile } = useForgeStore();

  if (isLoading) return <RouteState type="loading" skeletonLayout="cards" title="Loading scan profiles" />;
  if (hasError) {
    return (
      <RouteState
        type="error"
        title="Scan profiles unavailable"
        message="The scanning service profile catalog could not be loaded."
        actionLabel="Reload"
        onAction={() => window.location.reload()}
      />
    );
  }

  if (profiles.length === 0) {
    return (
      <RouteState
        type="empty"
        title="No scan profiles available"
        message="The scanner profile catalog is empty, so no authorized lab scan profiles can be selected."
      />
    );
  }

  return (
    <section className="command-surface" style={{ minHeight: "100%", overflow: "hidden" }}>
      <div style={{ padding: "22px 22px 12px" }}>
        <div className="eyebrow">Horizontal control lanes</div>
        <h3 style={{ fontSize: 22, lineHeight: 1.02, letterSpacing: "-0.04em", marginTop: 8 }}>
          Pick the right scan temperament before the packets move.
        </h3>
      </div>
      <div className="ops-accordion">
        {profiles.map((profile, index) => {
          const isActive = activeProfile === profile.name;
          const isSelected = scanProfile === profile.name;
          return (
            <button
              key={profile.name}
              type="button"
              className={`ops-accordion-panel ${isActive ? "active" : ""}`}
              onMouseEnter={() => setActiveProfile(profile.name)}
              onFocus={() => setActiveProfile(profile.name)}
              onClick={() => {
                setActiveProfile(profile.name);
                setScanProfile(profile.name);
              }}
            >
              <div className="ops-accordion-media" data-profile={profile.name} />
              <div className="ops-accordion-overlay" />
              <div className="ops-accordion-content">
                <span className="ops-accordion-index">{`0${index + 1}`}</span>
                <strong>{profile.name.replace(/_/g, " ")}</strong>
                <p>{profile.description}</p>
                <div className="ops-accordion-meta">
                  <span>{profile.port_count} ports</span>
                  <span>{profile.max_hosts} hosts</span>
                  <span>{profile.rate_limit_per_second}/sec</span>
                </div>
                <div className="ops-accordion-meta">
                  <span>{profile.ot_protocol_probes ? "OT aware" : "IT leaning"}</span>
                  <span>{profile.banner_grab ? "Banner grab" : "No banner grab"}</span>
                </div>
                {isSelected ? <span className="chip" style={{ width: "fit-content", marginTop: 14 }}>Selected for lab mode</span> : null}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function EventLedger({
  events,
  assets,
  isLoading,
  hasError,
}: {
  events: SecurityEvent[];
  assets: Asset[];
  isLoading: boolean;
  hasError: boolean;
}) {
  const assetMap = useMemo(() => new Map<number, Asset>(assets.map((asset) => [asset.id, asset])), [assets]);

  if (isLoading) return <RouteState type="loading" skeletonLayout="events" title="Loading live events" />;
  if (hasError) {
    return (
      <RouteState
        type="error"
        title="Event stream unavailable"
        message="The event ledger could not be loaded from the API."
        actionLabel="Reload"
        onAction={() => window.location.reload()}
      />
    );
  }

  return (
    <section className="command-surface" style={{ minHeight: "100%", overflow: "hidden" }}>
      <div style={{ padding: "22px 22px 12px", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <div>
          <div className="eyebrow">Event ledger</div>
          <h3 style={{ fontSize: 22, lineHeight: 1.02, letterSpacing: "-0.04em", marginTop: 8 }}>
            Read the signal without losing the asset behind it.
          </h3>
        </div>
        <span className="chip">
          <Wifi size={12} />
          Live feed
        </span>
      </div>
      <div style={{ padding: "0 22px 22px", display: "grid", gap: 10 }}>
        {events.length === 0 ? (
          <RouteState type="empty" title="No events recorded yet" message="Events will appear here once the scanner discovers or correlates activity." />
        ) : (
          events.slice(0, 6).map((event) => (
            <div key={event.id} className="taste-event">
              <span className="mono muted">{new Date(event.observed_at).toLocaleTimeString()}</span>
              <strong>{event.event_type}</strong>
              <span>{assetMap.get(event.asset_id || 0)?.hostname || event.source}</span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function ExposureField({
  assets,
  isLoading,
  hasError,
}: {
  assets: Asset[];
  isLoading: boolean;
  hasError: boolean;
}) {
  const chartData = useMemo(() => {
    const counts: Record<string, { count: number; risk: number }> = {};
    for (const asset of assets) {
      for (const port of asset.open_ports || []) {
        const key = `${port.port} ${port.service}`;
        if (!counts[key]) counts[key] = { count: 0, risk: 0 };
        counts[key].count += 1;
        counts[key].risk = Math.max(counts[key].risk, asset.risk_score || 0);
      }
    }
    return Object.entries(counts)
      .map(([port, value]) => ({ port, count: value.count, risk: value.risk }))
      .sort((a, b) => b.risk - a.risk)
      .slice(0, 8);
  }, [assets]);

  if (isLoading) return <RouteState type="loading" skeletonLayout="chart" title="Loading exposure field" />;
  if (hasError) {
    return (
      <RouteState
        type="error"
        title="Exposure field unavailable"
        message="The service exposure data could not be loaded from the API."
        actionLabel="Reload"
        onAction={() => window.location.reload()}
      />
    );
  }

  return (
    <section className="command-surface" style={{ minHeight: "100%", overflow: "hidden" }}>
      <div style={{ padding: "22px 22px 12px" }}>
        <div className="eyebrow">Exposure field</div>
        <h3 style={{ fontSize: 22, lineHeight: 1.02, letterSpacing: "-0.04em", marginTop: 8 }}>
          See which services keep surfacing at the sharpest edge.
        </h3>
      </div>
      {chartData.length === 0 ? (
        <div style={{ padding: "0 22px 22px" }}>
          <RouteState type="empty" title="No exposed services recorded" message="Run a scan to populate port and service evidence." />
        </div>
      ) : (
        <div style={{ padding: "0 22px 22px" }}>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={chartData}>
              <XAxis dataKey="port" stroke="#8892A3" fontSize={10} angle={-20} textAnchor="end" height={56} />
              <YAxis stroke="#8892A3" fontSize={11} />
              <Tooltip
                contentStyle={{
                  background: "#101620",
                  border: "1px solid rgba(148,163,184,.18)",
                  borderRadius: 18,
                }}
              />
              <Bar dataKey="risk" fill="#d99a2b" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

function OperationsControl({
  command,
  topIncident,
}: {
  command?: CommandSummaryData;
  topIncident?: Incident;
}) {
  const {
    labMode,
    scanTargetCidr,
    scanProfile,
    activeScanId,
    setActiveScanId,
    setLabMode,
    setScanTargetCidr,
  } = useForgeStore();
  const demoScan = useRunDemoScan();
  const labScan = useRunLabScan();
  const cancelScan = useCancelScan();
  const { activeScan } = useActiveScanRun();
  const trackedScanId = activeScanId || activeScan?.id || null;
  const statusQuery = useScanStatus(trackedScanId ?? undefined);
  const isPending = demoScan.isPending || labScan.isPending;
  const isSuccess = demoScan.isSuccess || labScan.isSuccess;
  const isError = demoScan.isError || labScan.isError;
  const result = demoScan.data || labScan.data;
  const liveScan = statusQuery.data || activeScan || null;

  // Scan lifecycle toast notifications
  const prevStatusRef = useRef<string | null>(null);
  useEffect(() => {
    const status = liveScan?.status;
    if (!status || status === prevStatusRef.current) return;
    
    if (status === "running" && prevStatusRef.current === null) {
      toast.info(`Scan ${liveScan.scan_uid} started`, {
        description: `${liveScan.profile?.replace(/_/g, " ") || "scan"} against ${liveScan.target_cidr || "demo"}`,
      });
    } else if (status === "completed" && prevStatusRef.current === "running") {
      toast.success(`Scan ${liveScan.scan_uid} completed`, {
        description: `${liveScan.assets_discovered} assets discovered · ${liveScan.ports_open} open ports`,
      });
    } else if (status === "failed" && prevStatusRef.current === "running") {
      toast.error(`Scan ${liveScan.scan_uid} failed`, {
        description: liveScan.error_message || "Check logs for details",
      });
    } else if (status === "cancelled" && prevStatusRef.current === "running") {
      toast.warning(`Scan ${liveScan.scan_uid} cancelled`);
    }
    prevStatusRef.current = status;
  }, [liveScan?.status, liveScan?.scan_uid, liveScan?.assets_discovered, liveScan?.ports_open, liveScan?.error_message, liveScan?.profile, liveScan?.target_cidr]);

  function handleRun() {
    if (labMode) {
      toast.info("Queuing lab scan...", { description: `${scanProfile.replace(/_/g, " ")} · ${scanTargetCidr}` });
      labScan.mutate(
        {
          targetCidr: scanTargetCidr,
          profile: scanProfile,
        },
        {
          onSuccess: (data) => {
            if (data?.id) {
              setActiveScanId(data.id);
              toast.success("Scan queued", { description: `Job ${data.scan_uid} is now ${data.status}` });
            }
          },
          onError: (err: any) => {
            toast.error("Scan failed to queue", { description: err?.response?.data?.detail || err.message });
          },
        },
      );
      return;
    }
    toast.info("Running demo scan...");
    demoScan.mutate(undefined, {
      onSuccess: (data) => {
        if (data?.id) {
          setActiveScanId(data.id);
          toast.success("Demo scan completed", { description: `${data.assets_discovered} assets seeded` });
        }
      },
      onError: (err: any) => {
        toast.error("Demo scan failed", { description: err?.response?.data?.detail || err.message });
      },
    });
  }

  return (
    <section className="command-surface" style={{ minHeight: "100%", overflow: "hidden" }}>
      <div style={{ padding: "22px 22px 12px" }}>
        <div className="eyebrow">Operations control</div>
        <h3 style={{ fontSize: 22, lineHeight: 1.02, letterSpacing: "-0.04em", marginTop: 8 }}>
          Keep the next scan, the current incident, and the response handoff in one lane.
        </h3>
      </div>
      <div style={{ padding: "0 22px 22px", display: "grid", gap: 12 }}>
        <div className="filters">
          <button className={`filter ${!labMode ? "active" : ""}`} onClick={() => setLabMode(false)}>Safe demo</button>
          <button className={`filter ${labMode ? "active" : ""}`} onClick={() => setLabMode(true)}>Authorized lab</button>
        </div>
        <label className="scan-input-group">
          <span className="muted">Target CIDR</span>
          <input
            className="scan-input"
            value={scanTargetCidr}
            onChange={(event) => setScanTargetCidr(event.target.value)}
            disabled={!labMode}
            placeholder="192.168.1.0/24"
          />
        </label>
        <div className="scan-metrics">
          <div>
            <span className="muted">Critical</span>
            <strong>{command?.kpis?.critical_count || 0}</strong>
          </div>
          <div>
            <span className="muted">Open</span>
            <strong>{command?.kpis?.open_incidents || 0}</strong>
          </div>
          <div>
            <span className="muted">Aether</span>
            <strong>{topIncident?.aether_sync_status || "offline"}</strong>
          </div>
        </div>
        <button
          className="btn primary"
          onClick={handleRun}
          disabled={isPending}
          style={{
            width: "100%",
            minHeight: 48,
            justifyContent: "center",
            background: "#f4f1ea",
            color: "#080b10",
            borderColor: "#f4f1ea",
            fontWeight: 800,
          }}
        >
          <Play size={14} />
          {isPending
            ? "Queueing scan"
            : liveScan && !["completed", "failed", "cancelled"].includes(liveScan.status)
              ? `Active ${liveScan.status} · ${liveScan.progress_percent}%`
              : labMode
                ? `Run ${scanProfile.replace(/_/g, " ")} scan`
                : "Seed safe demo data"}
        </button>
        {liveScan && !["completed", "failed", "cancelled"].includes(liveScan.status) ? (
          <div className="chip" style={{ background: "rgba(217,154,43,.1)", borderColor: "rgba(217,154,43,.28)", color: "var(--amber)", justifyContent: "space-between" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <Clock3 size={12} />
              {liveScan.scan_uid} · {liveScan.hosts_responsive} responsive hosts · {liveScan.ports_open} open ports
            </span>
            <button className="btn" style={{ minHeight: 24, padding: "0 8px", fontSize: 10 }} onClick={() => cancelScan.mutate(liveScan.id)}>
              Cancel
            </button>
          </div>
        ) : null}
        {isSuccess ? (
          <div className="chip" style={{ background: "rgba(34,197,94,.1)", borderColor: "rgba(34,197,94,.3)", color: "var(--low)" }}>
            <CheckCircle2 size={12} />
            {result?.scan_uid} {result?.status === "queued" ? "queued" : "completed"}
          </div>
        ) : null}
        {isError ? (
          <div className="chip" style={{ background: "rgba(239,68,68,.1)", borderColor: "rgba(239,68,68,.3)", color: "var(--critical)" }}>
            <XCircle size={12} />
            Scan request failed
          </div>
        ) : null}
        <div className="metric-list" style={{ marginTop: 4 }}>
          <div className="metric-row">
            <span>Profile in queue</span>
            <strong>{scanProfile.replace(/_/g, " ")}</strong>
          </div>
          <div className="metric-row">
            <span>Last scan</span>
            <strong>{formatTimestamp(command?.kpis?.last_scan_at)}</strong>
          </div>
          <div className="metric-row">
            <span>Recommended move</span>
            <strong style={{ maxWidth: 220, textAlign: "right" }}>{command?.recommended_action || "Run demo scan for recommendation"}</strong>
          </div>
        </div>
      </div>
    </section>
  );
}

function ShiftCarousel({
  cards,
}: {
  cards: Array<{ quote: string; label: string; detail: string; tone: string }>;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = cards[activeIndex];

  function cycle(direction: number) {
    setActiveIndex((current) => (current + direction + cards.length) % cards.length);
  }

  return (
    <div className="panel feedback-panel">
      <div className="eyebrow">Shift carousel</div>
      <p className="feedback-quote">{active.quote}</p>
      <div className="feedback-meta">
        <div className="feedback-avatar-row">
          {cards.map((card, index) => (
            <button
              key={card.label}
              type="button"
              aria-label={`Show ${card.label}`}
              className={`feedback-avatar ${index === activeIndex ? "active" : ""}`}
              onClick={() => setActiveIndex(index)}
              data-tone={card.tone}
            />
          ))}
        </div>
        <div>
          <strong>{active.label}</strong>
          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{active.detail}</div>
        </div>
      </div>
      <div className="feedback-actions">
        <button className="taste-btn" type="button" onClick={() => cycle(-1)}>Previous</button>
        <button className="taste-btn taste-btn-primary" type="button" onClick={() => cycle(1)}>Next</button>
      </div>
    </div>
  );
}

export default function CommandPage() {
  const pageRef = useRef<HTMLDivElement>(null);
  const [activeProfile, setActiveProfile] = useState("safe_discovery");
  const { data: command } = useCommandCenter();
  const assetsQuery = useAssets();
  const incidentsQuery = useIncidents();
  const eventsQuery = useEvents(20, 0);
  const profilesQuery = useScanProfiles();

  const assets: Asset[] = assetsQuery.data?.items || [];
  const incidents: Incident[] = incidentsQuery.data?.items || [];
  const events: SecurityEvent[] = eventsQuery.data?.items || [];
  const profiles = profilesQuery.data?.profiles || [];
  const topIncident = getActiveIncident(incidents);
  const signalDeck = buildSignalDeck({ command, topIncident, assets, events });
  const desireNarrative = command?.recommended_action
    || "The command surface should explain why a system matters before the analyst has to explain it back to the interface.";
  const storyCards = [
    {
      label: "Risk posture",
      title: `${command?.kpis?.critical_count || 0} critical decisions are shaping the queue.`,
      body: `${command?.kpis?.unauthorized_count || 0} unauthorized assets and ${command?.kpis?.open_incidents || 0} open incident lanes are already visible without leaving the command surface.`,
    },
    {
      label: "Incident thread",
      title: topIncident?.title || "No incident has taken the lead yet.",
      body: topIncident
        ? `${topIncident.incident_uid} is carrying ${topIncident.affected_assets.length} affected assets with ${topIncident.confidence_score}% confidence.`
        : "Run a discovery pass to give the correlation engine real objects to connect.",
    },
    {
      label: "Response handoff",
      title: topIncident?.aether_sync_status ? `Aether is ${topIncident.aether_sync_status}.` : "Aether is standing by.",
      body: topIncident?.aether_ticket_url
        ? "The ticket lane already has an external destination so the analyst does not need to copy the narrative by hand."
        : "The handoff will stay local until the backend creates a durable Aether ticket.",
    },
  ];

  useGSAP(() => {
    const ctx = gsap.context(() => {
      gsap.set(".scrub-word", { opacity: 0.12 });
      gsap.to(".scrub-word", {
        opacity: 1,
        stagger: 0.08,
        ease: "none",
        scrollTrigger: {
          trigger: ".desire-copy",
          start: "top 78%",
          end: "bottom 34%",
          scrub: true,
        },
      });

      gsap.fromTo(
        ".stack-card",
        { y: 120, opacity: 0.35, scale: 0.96 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          stagger: 0.16,
          ease: "none",
          scrollTrigger: {
            trigger: ".stack-lane",
            start: "top 72%",
            end: "bottom bottom",
            scrub: true,
          },
        },
      );
    }, pageRef);
    return () => ctx.revert();
  }, { scope: pageRef });

  return (
    <AppShell>
      <main ref={pageRef} className="taste-command overflow-x-hidden w-full max-w-full">
        <CinematicHero command={command} topIncident={topIncident} />

        <section className="command-page-marquee" aria-hidden="true">
          <div>
            DETROIT FORGE · COMMAND CENTER · ASSET INTELLIGENCE · INCIDENT RESPONSE · TOPOLOGY MAPPING · RISK CORRELATION · AETHER SYNC · SECURITY OPERATIONS · DETROIT FORGE · COMMAND CENTER · ASSET INTELLIGENCE · INCIDENT RESPONSE · TOPOLOGY MAPPING · RISK CORRELATION · AETHER SYNC · SECURITY OPERATIONS ·
          </div>
        </section>

        <section className="command-interest">
          <div className="section-copy" style={{ marginLeft: 0, maxWidth: 1080 }}>
            <h2>
              One system for the queue, the
              {" "}
              <span className="inline-photo inline-photo-signal" aria-hidden="true" />
              {" "}
              signal, and the handoff.
            </h2>
            <p>
              The interface now treats production risk as a narrative object: visible, connected, and operationally useful
              before anyone needs to translate a dashboard back into an investigation.
            </p>
          </div>

          <div className="command-bento command-bento-v2">
            <div className="bento-card bento-queue">
              <RiskQueue
                assets={assets}
                isLoading={assetsQuery.isLoading}
                hasError={Boolean(assetsQuery.error)}
              />
            </div>
            <div className="bento-card bento-accordion">
              <ProfileAccordion
                profiles={profiles}
                isLoading={profilesQuery.isLoading}
                hasError={Boolean(profilesQuery.error)}
                activeProfile={activeProfile}
                setActiveProfile={setActiveProfile}
              />
            </div>
            <div className="bento-card bento-events-v2">
              <EventLedger
                events={events}
                assets={assets}
                isLoading={eventsQuery.isLoading}
                hasError={Boolean(eventsQuery.error)}
              />
            </div>
            <div className="bento-card bento-exposure">
              <ExposureField
                assets={assets}
                isLoading={assetsQuery.isLoading}
                hasError={Boolean(assetsQuery.error)}
              />
            </div>
            <div className="bento-card bento-control">
              <OperationsControl command={command} topIncident={topIncident} />
            </div>
          </div>
        </section>

        <section className="command-desire">
          <div className="desire-pin">
            <div className="eyebrow">Readable pressure at scroll speed</div>
            <h2>Production-grade control means the interface explains the urgency before the analyst does.</h2>
            <p className="desire-copy">
              {desireNarrative.split(" ").map((word: string, index: number) => (
                <span className="scrub-word" key={`${word}-${index}`}>{word} </span>
              ))}
            </p>
            {topIncident?.aether_ticket_url ? (
              <a href={topIncident.aether_ticket_url} target="_blank" rel="noreferrer" className="taste-btn" style={{ marginTop: 22, textDecoration: "none", width: "fit-content" }}>
                Open Aether ticket
                <ExternalLink size={16} />
              </a>
            ) : null}
          </div>

          <div className="stack-lane">
            {storyCards.map((card) => (
              <article className="stack-card" key={card.title}>
                <div className="eyebrow">{card.label}</div>
                <h3>{card.title}</h3>
                <p>{card.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="command-action">
          <div>
            <div className="eyebrow">Move the next shift faster</div>
            <h2>Keep every decision visible from first discovery to the final response lane.</h2>
            <p>
              The shell stays consistent, the scan controls stay real, and the command surface keeps the next recommended move
              close enough to act on instead of hiding it behind a decorative dashboard.
            </p>
            <div className="hero-actions">
              <Link href="/assets" className="taste-btn taste-btn-primary">
                Open asset intelligence
                <ArrowRight size={17} />
              </Link>
              <Link href="/incidents" className="taste-btn">
                Continue to incidents
                <ArrowUpRight size={17} />
              </Link>
            </div>
            <div className="footer-links">
              <Link href="/topology">Topology</Link>
              <Link href="/reports">Reports</Link>
              <Link href="/settings">Settings</Link>
            </div>
          </div>
          <ShiftCarousel cards={signalDeck} />
        </section>
      </main>

      <AssetDetailDrawer />
    </AppShell>
  );
}
