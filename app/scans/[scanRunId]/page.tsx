"use client";

import { useMemo, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Network,
  ScanLine,
  Shield,
  Square,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { RouteState } from "@/components/shared/RouteState";
import { useCancelScan, useScan, useScanFindings, useScanHosts, useScanPorts, useScanStatus } from "@/lib/hooks/use-scans";
import type { ExposureFinding, ScanDetail, ScanHostResult, ScanPortResult } from "@/lib/types";

gsap.registerPlugin(ScrollTrigger);

function formatDateTime(value?: string | null) {
  return value ? new Date(value).toLocaleString() : "No timestamp";
}

function formatPercent(value?: number | null) {
  return `${value || 0}%`;
}

function summarizePortEvidence(port: ScanPortResult) {
  const entries = Object.entries(port.evidence || {}).slice(0, 3);
  if (!entries.length) return "No additional evidence retained";
  return entries.map(([key, value]) => `${key}: ${String(value)}`).join(" · ");
}

function HostLane({ hosts }: { hosts: ScanHostResult[] }) {
  return (
    <div className="scan-detail-host-grid">
      {hosts.map((host) => (
        <article key={host.id} className="scan-detail-host-card">
          <div className="scan-detail-host-head">
            <div>
              <span className="mono">{host.ip_address}</span>
              <h3>{host.hostname || "Unresolved host identity"}</h3>
            </div>
            <span className="chip">{host.ports_open} open</span>
          </div>
          <div className="scan-detail-host-meta">
            <span>{host.asset_type || "unknown"}</span>
            <span>{host.vendor || "Vendor unresolved"}</span>
            <span>{host.discovery_method || "discovery unavailable"}</span>
            <span>{Math.round((host.identity_confidence || 0) * 100)}% identity confidence</span>
          </div>
          <p>
            {host.identity_matched_on.length
              ? `Matched on ${host.identity_matched_on.join(", ")} while scanning ${host.ports_scanned} target ports.`
              : `Scanned ${host.ports_scanned} target ports with no durable prior identity match.`}
          </p>
        </article>
      ))}
    </div>
  );
}

function PortLedger({ ports }: { ports: ScanPortResult[] }) {
  return (
    <div className="scan-detail-ledger">
      <table style={{ minWidth: 980, fontSize: 12 }}>
        <thead>
          <tr>
            <th>IP</th>
            <th>Port</th>
            <th>Service</th>
            <th>State</th>
            <th>Latency</th>
            <th>Evidence</th>
          </tr>
        </thead>
        <tbody>
          {ports.map((port) => (
            <tr key={port.id}>
              <td className="mono">{port.ip_address}</td>
              <td className="mono">{port.port}/{port.protocol}</td>
              <td>{port.service_guess || "unknown"}</td>
              <td>{port.state || "n/a"}</td>
              <td className="mono">{port.latency_ms ? `${port.latency_ms.toFixed(1)} ms` : "—"}</td>
              <td>{summarizePortEvidence(port)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FindingsGrid({ findings }: { findings: ExposureFinding[] }) {
  return (
    <div className="scan-detail-findings-grid">
      {findings.map((finding) => (
        <article key={finding.event_id} className={`scan-finding-card severity-${finding.severity}`}>
          <span>{finding.rule_id || "Exposure finding"}</span>
          <h3>{finding.title}</h3>
          <p>{finding.description}</p>
          <div className="scan-detail-finding-meta">
            <small>{finding.category || "uncategorized"}</small>
            <small>{finding.confidence ? `${Math.round(finding.confidence * 100)}% confidence` : "confidence unavailable"}</small>
          </div>
          <small>{finding.remediation}</small>
        </article>
      ))}
    </div>
  );
}

export default function ScanDetailPage() {
  const params = useParams<{ scanRunId: string }>();
  const scanRunId = Number(params.scanRunId);
  const pageRef = useRef<HTMLDivElement>(null);
  const detailQuery = useScan(scanRunId);
  const statusQuery = useScanStatus(scanRunId);
  const hostsQuery = useScanHosts(scanRunId);
  const portsQuery = useScanPorts(scanRunId);
  const findingsQuery = useScanFindings(scanRunId);
  const cancelScan = useCancelScan();

  const scan = (statusQuery.data as ScanDetail | undefined) || detailQuery.data;
  const hosts = hostsQuery.data?.items || [];
  const ports = portsQuery.data?.items || [];
  const findings = findingsQuery.data?.items || [];
  const openPortRatio = useMemo(() => {
    if (!scan?.hosts_scanned) return 0;
    return Math.min(100, Math.round((scan.ports_open / Math.max(scan.hosts_scanned, 1)) * 10));
  }, [scan?.hosts_scanned, scan?.ports_open]);

  useGSAP(() => {
    const ctx = gsap.context(() => {
      gsap.from(".scan-detail-hero > *", {
        y: 36,
        opacity: 0,
        duration: 0.85,
        stagger: 0.08,
        ease: "power3.out",
      });

      ScrollTrigger.create({
        trigger: ".scan-detail-pin",
        start: "top 120px",
        endTrigger: ".scan-detail-scroll",
        end: "bottom bottom",
        pin: true,
      });
    }, pageRef);

    return () => ctx.revert();
  }, { scope: pageRef });

  if (detailQuery.isLoading && statusQuery.isLoading) {
    return (
      <AppShell>
        <RouteState type="loading" skeletonLayout="cards" title="Loading scan evidence..." />
      </AppShell>
    );
  }

  if (!scan) {
    return (
      <AppShell>
        <RouteState type="error" title="Scan not found" message="The requested scan run could not be loaded." />
      </AppShell>
    );
  }

  const terminal = ["completed", "failed", "cancelled"].includes(scan.status);

  return (
    <AppShell>
      <div ref={pageRef} className="scan-detail-page">
        <section className="scan-detail-hero">
          <div>
            <div className="eyebrow">Scan evidence theater</div>
            <h1>{scan.scan_uid}</h1>
            <p>
              This route keeps the scan job, host evidence, port evidence, and exposure findings in one operational thread so
              analysts can move from runtime status into durable proof without leaving the system.
            </p>
          </div>
          <div className="scan-detail-hero-metrics">
            <article>
              <span>Status</span>
              <strong>{scan.status}</strong>
              <small>{scan.profile?.replace(/_/g, " ") || scan.mode}</small>
            </article>
            <article>
              <span>Progress</span>
              <strong>{formatPercent(scan.progress_percent)}</strong>
              <small>{scan.target_cidr || "demo target"}</small>
            </article>
            <article>
              <span>Hosts responsive</span>
              <strong>{scan.hosts_responsive}</strong>
              <small>{scan.hosts_scanned} scanned</small>
            </article>
            <article>
              <span>Findings</span>
              <strong>{findings.length}</strong>
              <small>{scan.events_created} events created</small>
            </article>
          </div>
        </section>

        <div className="scan-detail-shell">
          <aside className="scan-detail-pin">
            <section className="command-surface scan-detail-pin-card">
              <div className="eyebrow">Lifecycle</div>
              <div className="scan-progress-shell" style={{ marginTop: 14 }}>
                <div className="scan-progress-bar">
                  <div className="scan-progress-value" style={{ width: `${Math.max(scan.progress_percent || 0, 6)}%` }} />
                </div>
                <div className="scan-progress-meta">
                  <span>{formatPercent(scan.progress_percent)}</span>
                  <span>{scan.status}</span>
                </div>
              </div>
              <div className="scan-detail-meta-list">
                <div className="metric-row"><span>Started</span><strong>{formatDateTime(scan.started_at)}</strong></div>
                <div className="metric-row"><span>Completed</span><strong>{formatDateTime(scan.completed_at)}</strong></div>
                <div className="metric-row"><span>Assets touched</span><strong>{scan.assets_discovered}</strong></div>
                <div className="metric-row"><span>Ports open</span><strong>{scan.ports_open}</strong></div>
                <div className="metric-row"><span>Open-port density</span><strong>{openPortRatio}%</strong></div>
              </div>
              {!terminal ? (
                <button
                  type="button"
                  className="btn"
                  style={{ marginTop: 16, width: "100%" }}
                  onClick={() => cancelScan.mutate(scan.id)}
                  disabled={cancelScan.isPending}
                >
                  <Square size={14} />
                  {cancelScan.isPending ? "Requesting cancel" : "Cancel scan"}
                </button>
              ) : null}
            </section>

            <section className="command-surface scan-detail-pin-card">
              <div className="eyebrow">Action lanes</div>
              <div className="scan-detail-cta-list">
                <Link href="/scans" className="btn primary" style={{ textDecoration: "none", justifyContent: "center" }}>
                  <ScanLine size={14} /> Back to scan floor
                </Link>
                <Link href="/command" className="btn" style={{ textDecoration: "none", justifyContent: "center" }}>
                  <ArrowRight size={14} /> Open command route
                </Link>
              </div>
              {scan.error_message ? (
                <div className="scan-detail-warning">
                  <AlertTriangle size={14} />
                  <span>{scan.error_message}</span>
                </div>
              ) : (
                <div className="scan-detail-warning ok">
                  <CheckCircle2 size={14} />
                  <span>Evidence retained for host, port, and finding review.</span>
                </div>
              )}
            </section>
          </aside>

          <div className="scan-detail-scroll">
            <section className="command-surface scan-detail-section">
              <div className="scan-detail-section-head">
                <div>
                  <div className="eyebrow">Host evidence</div>
                  <h2>Identity, responsiveness, and discovery posture by host</h2>
                </div>
                <span className="chip">{hosts.length} hosts</span>
              </div>
              {hostsQuery.isLoading ? (
                <RouteState type="loading" skeletonLayout="cards" title="Loading host evidence..." />
              ) : hosts.length ? (
                <HostLane hosts={hosts} />
              ) : (
                <RouteState type="empty" title="No host evidence retained" message="This scan has not produced persisted host results yet." />
              )}
            </section>

            <section className="command-surface scan-detail-section">
              <div className="scan-detail-section-head">
                <div>
                  <div className="eyebrow">Port ledger</div>
                  <h2>Service-level evidence, latency, and collected protocol detail</h2>
                </div>
                <span className="chip">{ports.length} port records</span>
              </div>
              {portsQuery.isLoading ? (
                <RouteState type="loading" skeletonLayout="table" title="Loading port ledger..." />
              ) : ports.length ? (
                <PortLedger ports={ports} />
              ) : (
                <RouteState type="empty" title="No port evidence retained" message="This scan has not produced persisted per-port records yet." />
              )}
            </section>

            <section className="command-surface scan-detail-section">
              <div className="scan-detail-section-head">
                <div>
                  <div className="eyebrow">Exposure findings</div>
                  <h2>Deterministic findings generated from the scan evidence</h2>
                </div>
                <span className="chip">{findings.length} findings</span>
              </div>
              {findingsQuery.isLoading ? (
                <RouteState type="loading" skeletonLayout="cards" title="Loading findings..." />
              ) : findings.length ? (
                <FindingsGrid findings={findings} />
              ) : (
                <RouteState type="empty" title="No findings generated" message="No deterministic exposure findings were produced for this run." />
              )}
            </section>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
