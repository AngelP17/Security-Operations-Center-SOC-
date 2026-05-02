"use client";

import { useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowRight,
  ArrowLeft,
  Activity,
  Shield,
  ShieldAlert,
  Globe,
  FileText,
  Zap,
  Clock,
  CheckCircle2,
  Circle,
  ChevronRight,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { RiskBadge } from "@/components/shared/RiskBadge";
import { RouteState } from "@/components/shared/RouteState";
import { useAsset, useAssetRisk } from "@/lib/hooks/use-assets";
import { useAssetReplay } from "@/lib/hooks/use-replay";
import { useIncidents, useIncidentEvidence } from "@/lib/hooks/use-incidents";
import { useAssetExposureFindings } from "@/lib/hooks/use-events";
import type { Asset, Incident, EvidenceItem } from "@/lib/types";

gsap.registerPlugin(ScrollTrigger);

function findIncidentForAsset(incidents: Incident[] | undefined, asset: Asset): Incident | null {
  if (!incidents) return null;
  return (
    incidents.find(
      (inc) =>
        inc.affected_assets?.includes(asset.hostname) ||
        inc.affected_assets?.includes(asset.asset_uid)
    ) || null
  );
}

function AetherTimeline({ incident }: { incident: Incident }) {
  const steps = [
    { key: "detected", label: "Detected" },
    { key: "triage", label: "Triage" },
    { key: "investigation", label: "Investigation" },
    { key: "response", label: "Response" },
    { key: "closed", label: "Closed" },
  ];
  const status = incident.status?.toLowerCase() || "open";
  let activeIndex = 0;
  if (status === "triaged" || status === "triage") activeIndex = 1;
  else if (status === "investigating" || status === "investigation") activeIndex = 2;
  else if (status === "response") activeIndex = 3;
  else if (status === "closed" || status === "resolved") activeIndex = 4;

  return (
    <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
      {steps.map((step, idx) => {
        const isComplete = idx < activeIndex;
        const isActive = idx === activeIndex;
        return (
          <div key={step.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 16, height: 16, display: "grid", placeItems: "center" }}>
              {isComplete ? (
                <CheckCircle2 size={14} color="var(--low)" />
              ) : isActive ? (
                <Circle size={14} color="var(--amber)" strokeWidth={3} />
              ) : (
                <Circle size={14} color="var(--muted)" strokeWidth={2} />
              )}
            </div>
            <span
              style={{
                fontSize: 11,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? "var(--amber)" : isComplete ? "var(--text)" : "var(--muted)",
              }}
            >
              {step.label}
            </span>
            {isActive && <span className="chip" style={{ marginLeft: "auto", fontSize: 9 }}>In progress</span>}
          </div>
        );
      })}
    </div>
  );
}

export default function AssetDetailPage() {
  const params = useParams();
  const assetId = Number(params.assetId);
  const pageRef = useRef<HTMLDivElement>(null);

  const { data: asset, isLoading: assetLoading, error: assetError } = useAsset(assetId);
  const { data: risk, isLoading: riskLoading } = useAssetRisk(assetId);
  const { data: replay, isLoading: replayLoading } = useAssetReplay(assetId);
  const { data: incidentsData } = useIncidents();
  const { data: exposureData, isLoading: exposureLoading } = useAssetExposureFindings(assetId);
  const incidents = incidentsData?.items || [];
  const incident = asset ? findIncidentForAsset(incidents, asset) : null;
  const { data: evidenceData } = useIncidentEvidence(incident?.id);
  const evidence = evidenceData?.items || [];

  useGSAP(() => {
    const ctx = gsap.context(() => {
      gsap.from(".asset-detail-hero > *", {
        y: 36,
        opacity: 0,
        duration: 0.9,
        stagger: 0.1,
        ease: "power3.out",
      });

      gsap.from(".asset-detail-panel", {
        y: 50,
        opacity: 0,
        scale: 0.97,
        duration: 0.8,
        stagger: 0.1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ".asset-detail-body",
          start: "top 80%",
        },
      });
    }, pageRef);
    return () => ctx.revert();
  }, { scope: pageRef });

  if (assetLoading) {
    return (
      <AppShell>
        <RouteState type="loading" skeletonLayout="cards" title="Loading asset..." />
      </AppShell>
    );
  }

  if (assetError || !asset) {
    return (
      <AppShell>
        <RouteState
          type="error"
          title="Asset not found"
          message="The requested asset could not be loaded from the API."
          actionLabel="Back to assets"
          onAction={() => window.history.back()}
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div ref={pageRef} className="asset-detail-page overflow-x-hidden w-full max-w-full">
        <section className="asset-detail-hero">
          <div>
            <div className="eyebrow">Asset intelligence</div>
            <h1 style={{ fontSize: "clamp(1.8rem, 3.4vw, 2.8rem)", fontWeight: 800, letterSpacing: "-0.03em", textWrap: "balance", marginTop: 8, maxWidth: "28ch", lineHeight: 1.05 }}>
              {asset.hostname}
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              <span className="mono muted">{asset.asset_uid}</span>
              <button
                className="btn"
                style={{ padding: "0 6px", minHeight: 24, fontSize: 11 }}
                onClick={() => {
                  navigator.clipboard.writeText(asset.asset_uid || "");
                  toast.success("Asset UID copied");
                }}
                title="Copy asset UID"
              >
                <Copy size={12} />
              </button>
            </div>
            <div className="filters" style={{ marginTop: 12, flexWrap: "wrap", gap: 8 }}>
              <RiskBadge level={asset.risk_level || "low"} score={asset.risk_score || 0} />
              <span className="chip">{asset.authorization_state}</span>
              <span className="chip">{asset.asset_type}</span>
              <span className="chip">{asset.segment}</span>
            </div>
          </div>
          <div className="filters" style={{ flexWrap: "wrap", gap: 8 }}>
            <Link href="/assets" className="btn" style={{ textDecoration: "none" }}>
              <ArrowLeft size={15} /> Back to archive
            </Link>
          </div>
        </section>

        <div className="asset-detail-body split">
          <section className="command-surface asset-detail-panel">
            <div style={{ padding: 16 }}>
              <div className="eyebrow">Identity</div>
              <div className="asset-specimen-grid" style={{ marginTop: 12 }}>
                <article>
                  <span>IP address</span>
                  <strong className="mono">{asset.ip_address}</strong>
                </article>
                <article>
                  <span>MAC address</span>
                  <strong className="mono">{asset.mac_address}</strong>
                </article>
                <article>
                  <span>Asset type</span>
                  <strong>{asset.asset_type}</strong>
                </article>
                <article>
                  <span>Owner</span>
                  <strong>{asset.owner || "Unassigned"}</strong>
                </article>
                <article>
                  <span>Segment</span>
                  <strong>{asset.segment}</strong>
                </article>
                <article>
                  <span>Site</span>
                  <strong>{asset.site}</strong>
                </article>
                <article>
                  <span>First seen</span>
                  <strong>{asset.first_seen ? new Date(asset.first_seen).toLocaleString() : "—"}</strong>
                </article>
                <article>
                  <span>Last seen</span>
                  <strong>{asset.last_seen ? new Date(asset.last_seen).toLocaleString() : "—"}</strong>
                </article>
              </div>
            </div>
          </section>

          <section className="command-surface asset-detail-panel">
            <div style={{ padding: 16 }}>
              <div className="eyebrow">Risk decision</div>
              {risk && !riskLoading ? (
                <>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
                    <strong className="mono" style={{ fontSize: 28 }}>{risk.risk_score}</strong>
                    <RiskBadge level={risk.risk_level} score={risk.risk_score} />
                  </div>
                  <div style={{ height: 4, background: "rgba(244,241,234,0.08)", borderRadius: 999, marginTop: 10 }}>
                    <div style={{ height: "100%", width: `${Math.min(risk.risk_score, 100)}%`, background: risk.risk_level === "critical" ? "var(--critical)" : risk.risk_level === "high" ? "var(--high)" : risk.risk_level === "medium" ? "var(--medium)" : "var(--low)", borderRadius: 999 }} />
                  </div>
                  <p className="muted" style={{ fontSize: 12, lineHeight: 1.5, marginTop: 10 }}>
                    {risk.explanation?.[0] || "Risk decision computed from asset features and events."}
                  </p>
                  <div className="metric-list" style={{ marginTop: 12, gap: 6 }}>
                    {(risk.score_breakdown || []).slice(0, 5).map((item: { label: string; value: number }) => (
                      <div className="metric-row" key={item.label} style={{ paddingBottom: 6 }}>
                        <span style={{ fontSize: 11 }}>{item.label}</span>
                        <strong className="mono" style={{ fontSize: 11 }}>{item.value > 0 ? "+" : ""}{item.value}</strong>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <RouteState type="loading" title="Loading risk..." />
              )}
            </div>
          </section>

          <section className="command-surface asset-detail-panel">
            <div style={{ padding: 16 }}>
              <div className="eyebrow">Open ports</div>
              {(asset.open_ports || []).length > 0 ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                  {asset.open_ports.map((port: { port: number; service: string }) => (
                    <div key={port.port} style={{ border: "1px solid var(--border)", background: "rgba(244, 241, 234, 0.04)", borderRadius: 8, padding: "5px 8px", fontSize: 11, display: "flex", alignItems: "center", gap: 6 }}>
                      <Globe size={12} color="var(--cyan)" />
                      <strong className="mono">{port.port}</strong>
                      <span className="muted" style={{ fontSize: 10, textTransform: "uppercase" }}>{port.service}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>No open ports discovered.</p>
              )}
            </div>
          </section>

          <section className="command-surface asset-detail-panel">
            <div style={{ padding: 16 }}>
              <div className="eyebrow">Exposure findings</div>
              {exposureLoading ? (
                <RouteState type="loading" title="Loading exposure findings..." />
              ) : exposureData?.items?.length ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
                  {exposureData.items.map((finding: any) => (
                    <div key={finding.id} style={{ fontSize: 12, lineHeight: 1.5, padding: "8px 0", borderTop: "1px solid var(--border)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <ShieldAlert size={12} color={finding.severity === "critical" ? "var(--critical)" : finding.severity === "high" ? "var(--high)" : "var(--amber)"} />
                        <strong style={{ color: finding.severity === "critical" ? "var(--critical)" : finding.severity === "high" ? "var(--high)" : "var(--text)" }}>
                          {finding.payload?.rule_id || "Finding"}
                        </strong>
                        <span className="chip" style={{ fontSize: 9, marginLeft: "auto" }}>{finding.severity}</span>
                      </div>
                      <p className="muted">{finding.description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>No exposure findings for this asset.</p>
              )}
            </div>
          </section>

          <section className="command-surface asset-detail-panel">
            <div style={{ padding: 16 }}>
              <div className="eyebrow">Linked incident</div>
              {incident ? (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                    <strong style={{ fontSize: 14 }}>{incident.incident_uid}</strong>
                    <RiskBadge level={incident.severity} score={incident.risk_score} />
                    <span className="chip" style={{ fontSize: 10 }}>{incident.status}</span>
                  </div>
                  <p className="muted" style={{ fontSize: 12, marginTop: 6, lineHeight: 1.45 }}>{incident.summary}</p>
                  <AetherTimeline incident={incident} />
                  <Link href={`/incidents/${incident.id}`} className="btn primary" style={{ width: "100%", marginTop: 14, justifyContent: "center", minHeight: 36, fontSize: 12, textDecoration: "none" }}>
                    Open incident workbench <ChevronRight size={14} />
                  </Link>
                </>
              ) : (
                <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>No incident linked to this asset.</p>
              )}
            </div>
          </section>

          <section className="command-surface asset-detail-panel">
            <div style={{ padding: 16 }}>
              <div className="eyebrow">Evidence</div>
              {evidence.length > 0 ? (
                <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                    {evidence.slice(0, 5).map((item: EvidenceItem, idx: number) => (
                    <div key={idx} style={{ display: "grid", gridTemplateColumns: "20px 1fr auto", gap: 8, alignItems: "start", padding: "8px 0", borderBottom: idx < Math.min(evidence.length, 5) - 1 ? "1px solid var(--border)" : undefined }}>
                      <div style={{ marginTop: 2 }}>
                        {item.evidence_type?.includes("network") ? <Globe size={14} color="var(--cyan)" /> : item.evidence_type?.includes("file") ? <FileText size={14} color="var(--amber)" /> : item.evidence_type?.includes("process") ? <Zap size={14} color="var(--high)" /> : <Activity size={14} color="var(--muted)" />}
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{item.evidence_type || "Event"}</div>
                        <div className="muted" style={{ fontSize: 11, marginTop: 1 }}>{item.description || item.summary || "No description"}</div>
                      </div>
                      <span className="mono muted" style={{ fontSize: 10 }}>{item.observed_at ? new Date(item.observed_at).toLocaleTimeString() : "—"}</span>
                    </div>
                  ))}
                </div>
              ) : replay && !replayLoading && replay.steps?.length ? (
                <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                  {replay.steps.slice(0, 4).map((step: any, idx: number) => (
                    <div key={idx} style={{ display: "grid", gridTemplateColumns: "20px 1fr auto", gap: 8, alignItems: "start", padding: "8px 0", borderBottom: idx < Math.min(replay.steps.length, 4) - 1 ? "1px solid var(--border)" : undefined }}>
                      <div style={{ marginTop: 2 }}><Activity size={14} color="var(--muted)" /></div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{step.event_type}</div>
                        <div className="muted" style={{ fontSize: 11, marginTop: 1 }}>{step.description || step.actor_type}</div>
                      </div>
                      <span className="mono muted" style={{ fontSize: 10 }}>{new Date(step.timestamp).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>No evidence recorded.</p>
              )}
            </div>
          </section>
        </div>

        <section className="command-action" style={{ borderTop: "1px solid rgba(244,241,234,0.08)", marginTop: 40, padding: "clamp(56px, 8vw, 112px) 0" }}>
          <div>
            <div className="eyebrow">Continue investigation</div>
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
    </AppShell>
  );
}
