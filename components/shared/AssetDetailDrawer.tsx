"use client";

import Link from "next/link";
import {
  X,
  Monitor,
  Cpu,
  Server,
  Laptop,
  Printer,
  Network,
  ShieldCheck,
  ExternalLink,
  Ticket,
  Clock,
  FileText,
  Globe,
  User,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Zap,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useForgeStore } from "@/lib/store";
import { RiskBadge } from "./RiskBadge";
import { RouteState } from "./RouteState";
import { useAsset, useAssetRisk } from "@/lib/hooks/use-assets";
import { useAssetReplay } from "@/lib/hooks/use-replay";
import { useIncidents, useIncidentEvidence } from "@/lib/hooks/use-incidents";
import type { Asset, Incident } from "@/lib/types";

const sectionVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const assetIconMap: Record<string, React.ComponentType<{ size?: number | string; color?: string }>> = {
  plc: Cpu,
  workstation: Monitor,
  server: Server,
  laptop: Laptop,
  printer: Printer,
  iot: Network,
};

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
    <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
      {steps.map((step, idx) => {
        const isComplete = idx < activeIndex;
        const isActive = idx === activeIndex;
        return (
          <div key={step.key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 18, height: 18, display: "grid", placeItems: "center" }}>
              {isComplete ? (
                <CheckCircle2 size={16} color="var(--low)" />
              ) : isActive ? (
                <Circle size={16} color="var(--amber)" strokeWidth={3} />
              ) : (
                <Circle size={16} color="var(--muted)" strokeWidth={2} />
              )}
            </div>
            <span
              style={{
                fontSize: 12,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? "var(--amber)" : isComplete ? "var(--text)" : "var(--muted)",
              }}
            >
              {step.label}
            </span>
            {isActive && (
              <span className="chip" style={{ marginLeft: "auto", fontSize: 10 }}>
                In progress
              </span>
            )}
            {isComplete && (
              <span className="mono muted" style={{ marginLeft: "auto", fontSize: 10 }}>
                {new Date(incident.first_observed_at || Date.now()).toLocaleDateString()}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function AssetDetailDrawer() {
  const { selectedAssetId, setSelectedAssetId } = useForgeStore();
  const { data: asset, isLoading: assetLoading } = useAsset(selectedAssetId || undefined);
  const { data: risk, isLoading: riskLoading } = useAssetRisk(selectedAssetId || undefined);
  const { data: replay, isLoading: replayLoading } = useAssetReplay(selectedAssetId || undefined);
  const { data: incidentsData } = useIncidents();
  const incidents = incidentsData?.items || [];

  const incident = asset ? findIncidentForAsset(incidents, asset) : null;
  const { data: evidenceData } = useIncidentEvidence(incident?.id);
  const evidence = evidenceData?.items || [];

  const AssetIcon = asset ? assetIconMap[asset.asset_type] || Monitor : Monitor;

  return (
    <AnimatePresence>
      {selectedAssetId ? (
        <>
          <motion.div
            className="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedAssetId(null)}
          />
          <motion.aside
            className="drawer"
            initial={{ x: 440 }}
            animate={{ x: 0 }}
            exit={{ x: 440 }}
            transition={{ type: "spring", damping: 30, stiffness: 280 }}
          >
            {/* Header */}
            <div className="page-head" style={{ marginBottom: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    border: "1px solid var(--border)",
                    background: "rgba(244, 241, 234, 0.05)",
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                  }}
                >
                  <AssetIcon size={22} color="var(--amber)" />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    {assetLoading ? (
                      <h1 style={{ fontSize: 18 }}>Loading...</h1>
                    ) : asset ? (
                      <>
                        <h1 style={{ fontSize: 18, letterSpacing: "-0.02em" }}>{asset.hostname}</h1>
                        {risk && !riskLoading ? (
                          <RiskBadge level={risk.risk_level} score={risk.risk_score} />
                        ) : null}
                      </>
                    ) : (
                      <h1 style={{ fontSize: 18 }}>Asset not found</h1>
                    )}
                  </div>
                  {asset ? (
                    <p className="mono muted" style={{ fontSize: 12, marginTop: 2 }}>
                      {asset.ip_address} · {asset.metadata?.os_version || asset.asset_type}
                    </p>
                  ) : null}
                </div>
              </div>
              <button className="btn" onClick={() => setSelectedAssetId(null)} aria-label="Close drawer">
                <X size={16} />
              </button>
            </div>

            {asset && !assetLoading ? (
              <div className="grid" style={{ gap: 14 }}>
                {/* Metadata */}
                <motion.section
                  className="panel"
                  custom={0}
                  initial="hidden"
                  animate="visible"
                  variants={sectionVariants}
                  style={{ padding: 14 }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "10px 16px",
                      fontSize: 12,
                    }}
                  >
                    <div>
                      <div className="muted" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>
                        Segment
                      </div>
                      <strong>{asset.segment}</strong>
                    </div>
                    <div>
                      <div className="muted" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>
                        Asset type
                      </div>
                      <strong>{asset.asset_type}</strong>
                    </div>
                    <div>
                      <div className="muted" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>
                        Owner
                      </div>
                      <strong>{asset.owner || "—"}</strong>
                    </div>
                    <div>
                      <div className="muted" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>
                        Last seen
                      </div>
                      <strong>{asset.last_seen ? new Date(asset.last_seen).toLocaleString() : "—"}</strong>
                    </div>
                  </div>
                  {risk && !riskLoading ? (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                        <span className="muted" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                          Risk score
                        </span>
                        <strong className="mono" style={{ color: risk.risk_level === "critical" ? "var(--critical)" : risk.risk_level === "high" ? "var(--high)" : "var(--text)" }}>
                          {risk.risk_score}
                        </strong>
                      </div>
                      <div style={{ height: 4, background: "rgba(244,241,234,0.08)", borderRadius: 999 }}>
                        <div
                          style={{
                            height: "100%",
                            width: `${Math.min(risk.risk_score, 100)}%`,
                            background:
                              risk.risk_level === "critical"
                                ? "var(--critical)"
                                : risk.risk_level === "high"
                                ? "var(--high)"
                                : risk.risk_level === "medium"
                                ? "var(--medium)"
                                : "var(--low)",
                            borderRadius: 999,
                          }}
                        />
                      </div>
                    </div>
                  ) : null}
                </motion.section>

                {/* Aether Ticket */}
                <motion.section
                  className="panel"
                  custom={1}
                  initial="hidden"
                  animate="visible"
                  variants={sectionVariants}
                  style={{ padding: 14 }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Ticket size={15} color="var(--amber)" />
                      <span className="eyebrow" style={{ fontSize: 10 }}>
                        Aether ticket
                      </span>
                    </div>
                    {incident?.aether_ticket_url ? (
                      <Link
                        href={incident.aether_ticket_url}
                        target="_blank"
                        className="btn"
                        style={{ minHeight: 28, padding: "0 8px", fontSize: 11, gap: 4 }}
                      >
                        View in Aether <ExternalLink size={11} />
                      </Link>
                    ) : null}
                  </div>

                  {incident ? (
                    <>
                      <h3 style={{ fontSize: 13, marginTop: 8, fontWeight: 700 }}>
                        {incident.incident_uid}
                      </h3>
                      <p className="muted" style={{ fontSize: 12, marginTop: 4, lineHeight: 1.45 }}>
                        {incident.summary}
                      </p>
                      <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <span className="chip" style={{ fontSize: 10 }}>
                          <ShieldCheck size={11} /> {incident.category}
                        </span>
                        <span className="chip" style={{ fontSize: 10 }}>
                          <User size={11} /> {incident.assigned_to || "Unassigned"}
                        </span>
                      </div>
                      <AetherTimeline incident={incident} />
                    </>
                  ) : (
                    <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
                      No Aether ticket linked to this asset. Open an incident workbench to create one.
                    </p>
                  )}
                </motion.section>

                {/* Evidence */}
                <motion.section
                  className="panel"
                  custom={2}
                  initial="hidden"
                  animate="visible"
                  variants={sectionVariants}
                  style={{ padding: 14 }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <FileText size={15} color="var(--amber)" />
                      <span className="eyebrow" style={{ fontSize: 10 }}>
                        Evidence
                      </span>
                    </div>
                  </div>
                  {evidence.length > 0 ? (
                    <div style={{ display: "grid", gap: 8 }}>
                      {evidence.map((item: any, idx: number) => (
                        <div
                          key={idx}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "20px 1fr auto",
                            gap: 8,
                            alignItems: "start",
                            padding: "8px 0",
                            borderBottom: idx < evidence.length - 1 ? "1px solid var(--border)" : undefined,
                          }}
                        >
                          <div style={{ marginTop: 2 }}>
                            {item.evidence_type?.includes("network") ? (
                              <Globe size={14} color="var(--cyan)" />
                            ) : item.evidence_type?.includes("file") ? (
                              <FileText size={14} color="var(--amber)" />
                            ) : item.evidence_type?.includes("process") ? (
                              <Zap size={14} color="var(--high)" />
                            ) : (
                              <Activity size={14} color="var(--muted)" />
                            )}
                          </div>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600 }}>{item.evidence_type || "Event"}</div>
                            <div className="muted" style={{ fontSize: 11, marginTop: 1 }}>
                              {item.description || item.summary || "No description"}
                            </div>
                          </div>
                          <span className="mono muted" style={{ fontSize: 10 }}>
                            {item.observed_at ? new Date(item.observed_at).toLocaleTimeString() : "—"}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : replay && !replayLoading && replay.steps?.length ? (
                    <div style={{ display: "grid", gap: 8 }}>
                      {replay.steps.slice(0, 5).map((step: any, idx: number) => (
                        <div
                          key={idx}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "20px 1fr auto",
                            gap: 8,
                            alignItems: "start",
                            padding: "8px 0",
                            borderBottom: idx < Math.min(replay.steps.length, 5) - 1 ? "1px solid var(--border)" : undefined,
                          }}
                        >
                          <div style={{ marginTop: 2 }}>
                            <Activity size={14} color="var(--muted)" />
                          </div>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600 }}>{step.event_type}</div>
                            <div className="muted" style={{ fontSize: 11, marginTop: 1 }}>
                              {step.description || step.actor_type}
                            </div>
                          </div>
                          <span className="mono muted" style={{ fontSize: 10 }}>
                            {new Date(step.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                      No evidence recorded for this asset.
                    </p>
                  )}
                </motion.section>

                {/* Open Ports */}
                <motion.section
                  className="panel"
                  custom={3}
                  initial="hidden"
                  animate="visible"
                  variants={sectionVariants}
                  style={{ padding: 14 }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <Globe size={15} color="var(--amber)" />
                    <span className="eyebrow" style={{ fontSize: 10 }}>
                      Open ports
                    </span>
                  </div>
                  {(asset.open_ports || []).length > 0 ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {asset.open_ports.map((port: any) => (
                        <div
                          key={port.port}
                          style={{
                            border: "1px solid var(--border)",
                            background: "rgba(244, 241, 234, 0.04)",
                            borderRadius: 8,
                            padding: "5px 8px",
                            fontSize: 11,
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <strong className="mono">{port.port}</strong>
                          <span className="muted" style={{ fontSize: 10, textTransform: "uppercase" }}>
                            {port.service}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="muted" style={{ fontSize: 12 }}>
                      No open ports discovered.
                    </p>
                  )}
                </motion.section>

                {/* Risk Decision */}
                <motion.section
                  className="panel"
                  custom={4}
                  initial="hidden"
                  animate="visible"
                  variants={sectionVariants}
                  style={{ padding: 14 }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <AlertTriangle size={15} color="var(--critical)" />
                      <span className="eyebrow" style={{ fontSize: 10 }}>
                        Risk decision
                      </span>
                    </div>
                    {risk && !riskLoading ? <RiskBadge level={risk.risk_level} score={risk.risk_score} /> : null}
                  </div>
                  {risk && !riskLoading ? (
                    <>
                      <p className="muted" style={{ fontSize: 12, lineHeight: 1.5, marginTop: 4 }}>
                        {risk.explanation?.[0] || "Risk decision computed from asset features and events."}
                      </p>
                      <div className="metric-list" style={{ marginTop: 10, gap: 6 }}>
                        {(risk.score_breakdown || []).slice(0, 4).map((item: any) => (
                          <div className="metric-row" key={item.label} style={{ paddingBottom: 6 }}>
                            <span style={{ fontSize: 11 }}>{item.label}</span>
                            <strong className="mono" style={{ fontSize: 11 }}>
                              {item.value > 0 ? "+" : ""}
                              {item.value}
                            </strong>
                          </div>
                        ))}
                      </div>
                      {incident ? (
                        <Link
                          href={`/incidents/${incident.id}`}
                          className="btn primary"
                          style={{ width: "100%", marginTop: 10, justifyContent: "center", minHeight: 36, fontSize: 12 }}
                        >
                          Open incident workbench <ChevronRight size={14} />
                        </Link>
                      ) : null}
                    </>
                  ) : (
                    <RouteState type="loading" title="Loading risk..." />
                  )}
                </motion.section>
              </div>
            ) : (
              <RouteState type="loading" title="Loading asset..." />
            )}
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
