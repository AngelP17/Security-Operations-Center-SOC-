"use client";

import { useMemo, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowRight,
  Download,
  FileText,
  Shield,
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle2,
  FileBarChart,
  FileClock,
  Users,
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { AppShell } from "@/components/layout/AppShell";
import { RiskBadge } from "@/components/shared/RiskBadge";
import { RouteState } from "@/components/shared/RouteState";
import { useIncidents } from "@/lib/hooks/use-incidents";
import { useAssets } from "@/lib/hooks/use-assets";
import { useCommandCenter } from "@/lib/hooks/use-command-center";
import { useEvents } from "@/lib/hooks/use-events";
import type { Incident, Asset, SecurityEvent } from "@/lib/types";
import {
  exportExecutiveSummary,
  exportTechnicalEvidence,
  exportAuditReplay,
  exportCompliancePackage,
  exportAll,
} from "@/lib/export-utils";

gsap.registerPlugin(ScrollTrigger);

const reportTypes = [
  {
    id: "executive",
    label: "Executive summary",
    description: "High-level risk posture, incident trends, and recommended board actions.",
    icon: FileBarChart,
    format: "PDF",
  },
  {
    id: "technical",
    label: "Technical evidence",
    description: "Full asset inventory, exposure findings, port evidence, and correlation logic.",
    icon: FileText,
    format: "JSON + PDF",
  },
  {
    id: "audit",
    label: "Audit replay",
    description: "Timeline of analyst actions, risk decisions, and Aether handoff history.",
    icon: FileClock,
    format: "PDF",
  },
  {
    id: "compliance",
    label: "Compliance package",
    description: "Segment coverage, authorization state, and policy deviation mapping.",
    icon: Shield,
    format: "PDF + XLSX",
  },
];

const evidenceTypes = [
  "Risk score breakdown",
  "Triggered rules",
  "Open ports & services",
  "Recommendation approvals",
  "Audit replay JSON",
  "Analyst action log",
  "Asset provenance chain",
  "Incident correlation map",
];

export default function ReportsPage() {
  const pageRef = useRef<HTMLDivElement>(null);
  const { data, isLoading, error } = useIncidents();
  const { data: assetsData } = useAssets();
  const { data: commandData } = useCommandCenter();
  const { data: eventsData } = useEvents(100, 0);

  const incidents: Incident[] = data?.items || [];
  const assets: Asset[] = assetsData?.items || [];
  const events: SecurityEvent[] = eventsData?.items || [];

  const stats = useMemo(() => {
    const open = incidents.filter((i) => !["closed", "resolved"].includes((i.status || "").toLowerCase()));
    const critical = incidents.filter((i) => i.severity === "critical");
    const affected = incidents.reduce((sum, i) => sum + (i.affected_assets?.length || 0), 0);
    return {
      total: incidents.length,
      open: open.length,
      critical: critical.length,
      affected,
      exported: commandData?.kpis?.last_scan_at ? 12 : 0,
    };
  }, [incidents, commandData]);

  const timeline = useMemo(() => {
    return incidents
      .slice(0, 5)
      .map((i) => ({
        time: i.first_observed_at ? new Date(i.first_observed_at).toLocaleDateString() : "—",
        title: i.title,
        uid: i.incident_uid,
        severity: i.severity,
      }));
  }, [incidents]);

  useGSAP(() => {
    const ctx = gsap.context(() => {
      gsap.from(".reports-hero > *", {
        y: 36,
        opacity: 0,
        duration: 0.9,
        stagger: 0.1,
        ease: "power3.out",
      });

      gsap.from(".reports-bento-card", {
        y: 60,
        opacity: 0,
        scale: 0.97,
        duration: 0.8,
        stagger: 0.1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ".reports-bento",
          start: "top 80%",
        },
      });

      gsap.from(".reports-timeline-item", {
        x: 24,
        opacity: 0,
        duration: 0.6,
        stagger: 0.08,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ".reports-timeline",
          start: "top 85%",
        },
      });
    }, pageRef);
    return () => ctx.revert();
  }, { scope: pageRef });

  if (isLoading) {
    return (
      <AppShell>
        <RouteState type="loading" skeletonLayout="cards" title="Loading reports..." />
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <RouteState
          type="error"
          title="Failed to load reports"
          message="The report service could not retrieve incident and asset data."
          actionLabel="Retry"
          onAction={() => window.location.reload()}
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div ref={pageRef} className="reports-page">
        <section className="reports-hero">
          <div className="reports-copy">
            <div className="eyebrow">Reports</div>
            <h1>
              Production security{" "}
              <span className="inline-photo inline-photo-signal" aria-hidden="true" />
              {" "}
              evidence packages
            </h1>
            <p>
              Create audit-ready exports from risk decisions, evidence timelines, analyst notes, and response actions.
              Every report carries operational credibility, not template filler.
            </p>
          </div>
          <div className="reports-overview">
            <article>
              <span>Total incidents</span>
              <strong>{stats.total}</strong>
              <small>Available for reporting</small>
            </article>
            <article>
              <span>Open cases</span>
              <strong>{stats.open}</strong>
              <small>Active response lanes</small>
            </article>
            <article>
              <span>Critical</span>
              <strong>{stats.critical}</strong>
              <small>Highest priority tier</small>
            </article>
            <article>
              <span>Affected assets</span>
              <strong>{stats.affected}</strong>
              <small>Named impact objects</small>
            </article>
          </div>
        </section>

        <div className="reports-bento">
          <section className="reports-bento-card reports-bento-main">
            <div className="eyebrow">Report queue</div>
            <h3 style={{ fontSize: 22, lineHeight: 1.02, letterSpacing: "-0.04em", marginTop: 10 }}>
              Select the package that matches the audience, not the default template.
            </h3>
            <div className="reports-export-list" style={{ marginTop: 20 }}>
              {reportTypes.map((report) => {
                const Icon = report.icon;
                return (
                  <motion.button
                    key={report.id}
                    type="button"
                    className="reports-export-row"
                    whileHover={{ x: 6 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      if (report.id === "executive") {
                        exportExecutiveSummary({ incidents, assets, command: commandData });
                      } else if (report.id === "technical") {
                        exportTechnicalEvidence({ incidents, assets, events });
                      } else if (report.id === "audit") {
                        exportAuditReplay({ incidents, command: commandData });
                      } else if (report.id === "compliance") {
                        exportCompliancePackage({ incidents, assets });
                      }
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                      <span style={{ width: 36, height: 36, borderRadius: 12, background: "rgba(244,241,234,0.05)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                        <Icon size={16} color="var(--amber)" />
                      </span>
                      <span style={{ minWidth: 0 }}>
                        <strong style={{ display: "block", fontSize: 14 }}>{report.label}</strong>
                        <span style={{ display: "block", marginTop: 2, color: "rgba(244,241,234,0.58)", fontSize: 12, lineHeight: 1.45 }}>{report.description}</span>
                      </span>
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      <span className="chip" style={{ fontSize: 10 }}>{report.format}</span>
                      <Download size={14} color="var(--amber)" />
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </section>

          <section className="reports-bento-card reports-bento-export">
            <div className="eyebrow">Quick export</div>
            <h3 style={{ fontSize: 22, lineHeight: 1.02, letterSpacing: "-0.04em", marginTop: 10 }}>
              Generate the current operational snapshot.
            </h3>
            <div style={{ display: "grid", gap: 10, marginTop: 20 }}>
              <button type="button" className="btn primary" style={{ width: "100%", justifyContent: "center", minHeight: 48 }} onClick={() => exportExecutiveSummary({ incidents, assets, command: commandData })}>
                <FileBarChart size={14} /> Export executive summary
              </button>
              <button type="button" className="btn" style={{ width: "100%", justifyContent: "center", minHeight: 48 }} onClick={() => exportTechnicalEvidence({ incidents, assets, events })}>
                <FileText size={14} /> Export technical evidence
              </button>
              <button type="button" className="btn" style={{ width: "100%", justifyContent: "center", minHeight: 48 }} onClick={() => exportAuditReplay({ incidents, command: commandData })}>
                <FileClock size={14} /> Export audit replay
              </button>
              <button type="button" className="btn" style={{ width: "100%", justifyContent: "center", minHeight: 48 }} onClick={() => exportCompliancePackage({ incidents, assets })}>
                <Shield size={14} /> Export compliance package
              </button>
              <button type="button" className="btn" style={{ width: "100%", justifyContent: "center", minHeight: 48, borderStyle: "dashed" }} onClick={() => exportAll({ incidents, assets, events, command: commandData })}>
                <Download size={14} /> Export everything
              </button>
            </div>
            <div style={{ marginTop: 18, paddingTop: 18, borderTop: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--muted)" }}>
                <Clock size={12} />
                Last export: {commandData?.kpis?.last_scan_at ? new Date(commandData.kpis.last_scan_at).toLocaleDateString() : "No exports yet"}
              </div>
            </div>
          </section>

          <section className="reports-bento-card reports-bento-evidence">
            <div className="eyebrow">Included evidence</div>
            <h3 style={{ fontSize: 18, lineHeight: 1.08, letterSpacing: "-0.03em", marginTop: 10 }}>
              Every package contains the full chain of trust.
            </h3>
            <div style={{ display: "grid", gap: 8, marginTop: 16 }}>
              {evidenceTypes.map((item) => (
                <div key={item} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "rgba(244,241,234,0.78)" }}>
                  <CheckCircle2 size={13} color="var(--low)" />
                  {item}
                </div>
              ))}
            </div>
          </section>

          <section className="reports-bento-card reports-bento-timeline">
            <div className="eyebrow">Incident timeline</div>
            <h3 style={{ fontSize: 18, lineHeight: 1.08, letterSpacing: "-0.03em", marginTop: 10 }}>
              Recent events eligible for report inclusion.
            </h3>
            {timeline.length === 0 ? (
              <div style={{ marginTop: 20 }}>
                <RouteState type="empty" title="No incidents recorded" message="Run a scan to generate incident records for reporting." />
              </div>
            ) : (
              <div className="reports-timeline">
                {timeline.map((item, index) => (
                  <div key={index} className="reports-timeline-item">
                    <span className="reports-timeline-time">{item.time}</span>
                    <div className="reports-timeline-content">
                      <strong>{item.uid}</strong>
                      <span>{item.title}</span>
                    </div>
                    <RiskBadge level={item.severity || "low"} score={0} />
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <section className="command-action" style={{ borderTop: "1px solid rgba(244,241,234,0.08)", marginTop: 40, padding: "clamp(56px, 8vw, 112px) 0" }}>
          <div>
            <div className="eyebrow">Continue investigation</div>
            <h2>Reports are only as credible as the data behind them.</h2>
            <p style={{ maxWidth: 600, marginTop: 16, color: "rgba(244,241,234,0.68)", lineHeight: 1.6 }}>
              Keep the incident board current, the asset archive complete, and the topology observatory mapped so every export carries full operational context.
            </p>
            <div className="hero-actions" style={{ marginTop: 28 }}>
              <Link href="/incidents" className="taste-btn taste-btn-primary">
                Open incident workbench
                <ArrowRight size={17} />
              </Link>
              <Link href="/assets" className="taste-btn">
                Review asset archive
                <Activity size={17} />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
