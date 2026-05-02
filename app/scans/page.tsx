"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Play,
  Radar,
  ScanLine,
  Shield,
  Square,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { RouteState } from "@/components/shared/RouteState";
import { useCommandCenter, useRunDemoScan, useRunLabScan, useScanProfiles } from "@/lib/hooks/use-command-center";
import { useActiveScanRun, useCancelScan, useScanFindings, useScanStatus, useScans } from "@/lib/hooks/use-scans";
import { useForgeStore } from "@/lib/store";
import type { ExposureFinding, ScanDetail, ScanRunSummary } from "@/lib/types";

gsap.registerPlugin(ScrollTrigger);

function formatDateTime(value?: string | null) {
  return value ? new Date(value).toLocaleString() : "No timestamp";
}

function terminalLabel(scan?: Pick<ScanRunSummary, "status" | "completed_at"> | null) {
  if (!scan) return "No scan completed yet";
  if (scan.status === "completed") return `Completed ${formatDateTime(scan.completed_at)}`;
  if (scan.status === "failed") return "Failed";
  if (scan.status === "cancelled") return "Cancelled";
  return scan.status;
}

function SeverityStrip({ findings }: { findings: ExposureFinding[] }) {
  const grouped = useMemo(() => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const finding of findings) {
      const key = (finding.severity || "low") as keyof typeof counts;
      if (key in counts) counts[key] += 1;
    }
    return counts;
  }, [findings]);

  return (
    <div className="scan-severity-strip">
      {Object.entries(grouped).map(([severity, count]) => (
        <article key={severity} className={`scan-severity-chip severity-${severity}`}>
          <span>{severity}</span>
          <strong>{count}</strong>
        </article>
      ))}
    </div>
  );
}

export default function ScansPage() {
  const pageRef = useRef<HTMLDivElement>(null);
  const {
    labMode,
    scanTargetCidr,
    scanProfile,
    activeScanId,
    setActiveScanId,
    setLabMode,
    setScanTargetCidr,
    setScanProfile,
  } = useForgeStore();
  const { data: command } = useCommandCenter();
  const scansQuery = useScans(24, 0);
  const activeScanQuery = useActiveScanRun();
  const profilesQuery = useScanProfiles();
  const demoScan = useRunDemoScan();
  const labScan = useRunLabScan();
  const cancelScan = useCancelScan();

  const activeScan = activeScanQuery.activeScan;
  const trackedScanId = activeScanId || activeScan?.id || null;
  const activeStatusQuery = useScanStatus(trackedScanId ?? undefined);
  const recentScans = scansQuery.data?.items || [];
  const latestCompletedScan = recentScans.find((scan) => scan.status === "completed") || null;
  const findingsQuery = useScanFindings(latestCompletedScan?.id ?? undefined);
  const profiles = profilesQuery.data?.profiles || [];
  const visibleScan = (activeStatusQuery.data as ScanDetail | undefined)
    || (recentScans.find((scan) => scan.id === trackedScanId) as ScanDetail | undefined)
    || undefined;
  const latestFindings = findingsQuery.data?.items || [];
  const isPending = demoScan.isPending || labScan.isPending;
  const criticalFindings = latestFindings.filter((finding) => ["critical", "high"].includes(finding.severity)).slice(0, 4);

  // Scan lifecycle toast notifications
  const prevStatusRef = useRef<string | null>(null);
  useEffect(() => {
    const status = visibleScan?.status;
    if (!status || status === prevStatusRef.current) return;
    
    if (status === "running" && prevStatusRef.current === null) {
      toast.info(`Scan ${visibleScan.scan_uid} started`, {
        description: `${visibleScan.profile?.replace(/_/g, " ") || "scan"} against ${visibleScan.target_cidr || "demo"}`,
      });
    } else if (status === "completed" && prevStatusRef.current === "running") {
      toast.success(`Scan ${visibleScan.scan_uid} completed`, {
        description: `${visibleScan.assets_discovered} assets discovered · ${visibleScan.ports_open} open ports`,
      });
    } else if (status === "failed" && prevStatusRef.current === "running") {
      toast.error(`Scan ${visibleScan.scan_uid} failed`, {
        description: visibleScan.error_message || "Check logs for details",
      });
    } else if (status === "cancelled" && prevStatusRef.current === "running") {
      toast.warning(`Scan ${visibleScan.scan_uid} cancelled`);
    }
    prevStatusRef.current = status;
  }, [visibleScan?.status, visibleScan?.scan_uid, visibleScan?.assets_discovered, visibleScan?.ports_open, visibleScan?.error_message, visibleScan?.profile, visibleScan?.target_cidr]);

  useGSAP(() => {
    const ctx = gsap.context(() => {
      gsap.from(".scans-hero-copy > *", {
        y: 34,
        opacity: 0,
        duration: 0.85,
        stagger: 0.1,
        ease: "power3.out",
      });

      gsap.from(".scans-hero-stage, .scan-chapter-card", {
        y: 48,
        opacity: 0,
        duration: 0.9,
        stagger: 0.12,
        ease: "power3.out",
      });

      ScrollTrigger.create({
        trigger: ".scan-history-copy",
        start: "top 120px",
        endTrigger: ".scan-history-rail",
        end: "bottom bottom",
        pin: true,
      });
    }, pageRef);

    return () => ctx.revert();
  }, { scope: pageRef });

  function handleRunScan() {
    if (labMode) {
      toast.info("Queuing lab scan...", { description: `${scanProfile.replace(/_/g, " ")} · ${scanTargetCidr}` });
      labScan.mutate(
        { targetCidr: scanTargetCidr, profile: scanProfile },
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

  const chapterStats = [
    {
      label: "Active scans",
      value: `${command?.kpis?.active_scans || recentScans.filter((scan) => !["completed", "failed", "cancelled"].includes(scan.status)).length}`,
      detail: visibleScan ? `${visibleScan.scan_uid} in motion` : "No live run",
    },
    {
      label: "Last completed",
      value: latestCompletedScan?.profile?.replace(/_/g, " ") || "none",
      detail: terminalLabel(latestCompletedScan),
    },
    {
      label: "Findings retained",
      value: `${findingsQuery.data?.total || 0}`,
      detail: latestCompletedScan ? `From ${latestCompletedScan.scan_uid}` : "Run a demo scan to create evidence",
    },
    {
      label: "Profiles loaded",
      value: `${profiles.length}`,
      detail: "Authorized scan temperaments",
    },
  ];

  return (
    <AppShell>
      <div ref={pageRef} className="scans-page">
        <section className="scans-hero">
          <div className="scans-hero-copy">
            <div className="eyebrow">Operational intelligence console</div>
            <h1>
              Turn scanning into a visible
              {" "}
              <span className="inline-photo inline-photo-signal" aria-hidden="true" />
              {" "}
              system workflow, not a hidden background action.
            </h1>
            <p>
              The scan floor is where authorization, runtime progress, host evidence, service exposure, and response consequences
              stay connected. Every block here maps to a real scan run or a persisted evidence trail.
            </p>
            <div className="hero-actions">
              <button className="taste-btn taste-btn-primary" type="button" onClick={handleRunScan} disabled={isPending}>
                <Play size={16} />
                {isPending ? "Queueing scan" : labMode ? "Start authorized lab scan" : "Run safe demo scan"}
              </button>
              {visibleScan ? (
                <Link href={`/scans/${visibleScan.id}`} className="taste-btn">
                  Open live run
                  <ArrowRight size={16} />
                </Link>
              ) : (
                <Link href="/command" className="taste-btn">
                  Open command route
                  <ArrowRight size={16} />
                </Link>
              )}
            </div>
          </div>

          <div className="scans-hero-stage">
            <section className="scan-stage-panel scans-hero-stage-main">
              <div className="scan-stage-header">
                <div>
                  <span>Current lifecycle</span>
                  <strong>{visibleScan?.scan_uid || "No live scan in progress"}</strong>
                </div>
                <span className="chip">
                  <Radar size={12} />
                  {visibleScan?.status || "idle"}
                </span>
              </div>
              <div className="scan-progress-shell">
                <div className="scan-progress-bar">
                  <div
                    className="scan-progress-value"
                    style={{ width: `${Math.max(visibleScan?.progress_percent || 0, 6)}%` }}
                  />
                </div>
                <div className="scan-progress-meta">
                  <span>{visibleScan?.progress_percent || 0}%</span>
                  <span>{visibleScan?.profile?.replace(/_/g, " ") || (labMode ? scanProfile.replace(/_/g, " ") : "demo")}</span>
                </div>
              </div>
              <div className="scan-stage-metrics">
                <article>
                  <span>Hosts scanned</span>
                  <strong>{visibleScan?.hosts_scanned || 0}</strong>
                </article>
                <article>
                  <span>Responsive</span>
                  <strong>{visibleScan?.hosts_responsive || 0}</strong>
                </article>
                <article>
                  <span>Ports open</span>
                  <strong>{visibleScan?.ports_open || 0}</strong>
                </article>
                <article>
                  <span>Assets touched</span>
                  <strong>{visibleScan?.assets_discovered || 0}</strong>
                </article>
              </div>
              {visibleScan && !["completed", "failed", "cancelled"].includes(visibleScan.status) ? (
                <div className="scan-stage-actions">
                  <button
                    type="button"
                    className="btn"
                    onClick={() => cancelScan.mutate(visibleScan.id)}
                    disabled={cancelScan.isPending}
                  >
                    <Square size={14} />
                    {cancelScan.isPending ? "Requesting cancel" : "Cancel run"}
                  </button>
                  <Link href={`/scans/${visibleScan.id}`} className="btn primary" style={{ textDecoration: "none" }}>
                    <ScanLine size={14} />
                    Inspect evidence
                  </Link>
                </div>
              ) : (
                <div className="scan-stage-note">
                  <Clock3 size={14} />
                  <span>{terminalLabel(latestCompletedScan)}</span>
                </div>
              )}
            </section>

            <section className="scan-stage-panel scans-hero-stage-side">
              <div className="eyebrow">Run posture</div>
              <div className="scan-mode-toggle">
                <button className={`filter ${!labMode ? "active" : ""}`} onClick={() => setLabMode(false)}>
                  Safe demo
                </button>
                <button className={`filter ${labMode ? "active" : ""}`} onClick={() => setLabMode(true)}>
                  Authorized lab
                </button>
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
              <div className="scan-profile-list">
                {profiles.slice(0, 4).map((profile) => (
                  <button
                    key={profile.name}
                    type="button"
                    className={`scan-profile-row ${scanProfile === profile.name ? "active" : ""}`}
                    onClick={() => setScanProfile(profile.name)}
                  >
                    <div>
                      <strong>{profile.name.replace(/_/g, " ")}</strong>
                      <small>{profile.port_count} ports · {profile.max_hosts} hosts</small>
                    </div>
                    <span>{profile.rate_limit_per_second}/sec</span>
                  </button>
                ))}
              </div>
            </section>
          </div>
        </section>

        <section className="scan-chapter-grid">
          {chapterStats.map((item) => (
            <article key={item.label} className="scan-chapter-card">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <small>{item.detail}</small>
            </article>
          ))}
        </section>

        <section className="scan-history-shell">
          <div className="scan-history-copy">
            <div className="eyebrow">History ledger</div>
            <h2>Every scan run should stay readable as a governed operational chapter.</h2>
            <p>
              This history rail is the durable memory of the engine: which profile ran, what range it touched, how far it got,
              and whether it yielded actionable evidence.
            </p>
            {latestFindings.length ? <SeverityStrip findings={latestFindings} /> : null}
          </div>

          <div className="scan-history-rail">
            {scansQuery.isLoading ? (
              <RouteState type="loading" skeletonLayout="cards" title="Loading scan history..." />
            ) : recentScans.length === 0 ? (
              <RouteState
                type="empty"
                title="No scans recorded"
                message="Start a scan from this route to generate a governed job history and evidence trail."
              />
            ) : (
              recentScans.map((scan) => (
                <Link href={`/scans/${scan.id}`} key={scan.id} className="scan-history-card">
                  <div className="scan-history-head">
                    <div>
                      <span className="mono">{scan.scan_uid}</span>
                      <h3>{scan.profile?.replace(/_/g, " ") || scan.mode}</h3>
                    </div>
                    <span className={`chip risk-${scan.status === "failed" ? "critical" : scan.status === "completed" ? "low" : "medium"}`}>
                      {scan.status}
                    </span>
                  </div>
                  <p>{scan.target_cidr || "demo"} · {scan.mode} mode · {scan.assets_discovered} assets discovered</p>
                  <div className="scan-history-metrics">
                    <span>{scan.progress_percent}% progress</span>
                    <span>{scan.hosts_responsive} responsive hosts</span>
                    <span>{scan.ports_open} open ports</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        <section className="scan-findings-shell">
          <div className="scan-findings-copy">
            <div className="eyebrow">Latest retained findings</div>
            <h2>Exposure findings should read like actionable consequences, not decorative alert badges.</h2>
            <p>
              Findings here are generated from persisted evidence. They summarize the last completed scan so the analyst can move
              from host discovery into exposure reasoning without opening raw port logs first.
            </p>
          </div>
          <div className="scan-findings-grid">
            {findingsQuery.isLoading ? (
              <RouteState type="loading" skeletonLayout="cards" title="Loading findings..." />
            ) : criticalFindings.length ? (
              criticalFindings.map((finding) => (
                <article key={finding.event_id} className={`scan-finding-card severity-${finding.severity}`}>
                  <span>{finding.rule_id || "Exposure finding"}</span>
                  <h3>{finding.title}</h3>
                  <p>{finding.description}</p>
                  <small>{finding.remediation}</small>
                </article>
              ))
            ) : (
              <RouteState
                type="empty"
                title="No exposure findings retained yet"
                message="Complete a real or demo scan with host evidence to populate the finding posture."
              />
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
