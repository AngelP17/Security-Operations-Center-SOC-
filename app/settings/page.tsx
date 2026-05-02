"use client";

import { useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowRight,
  Shield,
  Zap,
  Activity,
  Users,
  ScanLine,
  Globe,
  Bell,
  Lock,
  Monitor,
  FlaskConical,
  CheckCircle2,
  AlertTriangle,
  ClipboardCopy,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { useForgeStore } from "@/lib/store";
import { useCommandCenter, useScanProfiles } from "@/lib/hooks/use-command-center";
import { useAssets } from "@/lib/hooks/use-assets";
import { useIncidents } from "@/lib/hooks/use-incidents";

gsap.registerPlugin(ScrollTrigger);

interface ToggleProps {
  active: boolean;
  onChange: () => void;
  label: string;
  description?: string;
}

function ToggleRow({ active, onChange, label, description }: ToggleProps) {
  return (
    <button type="button" className="settings-control-row" onClick={onChange} style={{ textAlign: "left" }}>
      <span style={{ minWidth: 0 }}>
        <strong style={{ display: "block", fontSize: 14 }}>{label}</strong>
        {description ? <span style={{ display: "block", marginTop: 3, color: "rgba(244,241,234,0.55)", fontSize: 12 }}>{description}</span> : null}
      </span>
      <span className={`settings-toggle ${active ? "active" : ""}`} aria-checked={active} role="switch" />
    </button>
  );
}

function exportDiagnostics({
  assets,
  incidents,
  profiles,
  labMode,
  commandData,
  notificationsEnabled,
  autoScanEnabled,
  strictAuthAlerts,
  highContrastMode,
}: {
  assets: any[];
  incidents: any[];
  profiles: any[];
  labMode: boolean;
  commandData: any;
  notificationsEnabled: boolean;
  autoScanEnabled: boolean;
  strictAuthAlerts: boolean;
  highContrastMode: boolean;
}) {
  const payload = {
    generated_at: new Date().toISOString(),
    site: "Detroit Forge",
    analyst: "Primary console",
    mode: labMode ? "Lab" : "Demo",
    counts: {
      assets: assets.length,
      incidents: incidents.length,
      profiles: profiles.length,
      open_incidents: incidents.filter((i) => !["closed", "resolved"].includes((i.status || "").toLowerCase())).length,
      critical_assets: assets.filter((a) => ["critical", "high"].includes(a.risk_level || "")).length,
    },
    toggles: {
      notificationsEnabled,
      autoScanEnabled,
      strictAuthAlerts,
      highContrastMode,
    },
    data_freshness: commandData?.data_freshness || "Unknown",
    last_scan_at: commandData?.kpis?.last_scan_at || null,
  };
  navigator.clipboard.writeText(JSON.stringify(payload, null, 2)).then(() => {
    toast.success("Diagnostics copied to clipboard");
  }).catch(() => {
    toast.error("Failed to copy diagnostics");
  });
}

export default function SettingsPage() {
  const pageRef = useRef<HTMLDivElement>(null);
  const { labMode, setLabMode } = useForgeStore();
  const { data: commandData } = useCommandCenter();
  const { data: profilesData } = useScanProfiles();
  const { data: assetsData } = useAssets();
  const { data: incidentsData } = useIncidents();

  const {
    notificationsEnabled,
    autoScanEnabled,
    strictAuthAlerts,
    highContrastMode,
    setNotificationsEnabled,
    setAutoScanEnabled,
    setStrictAuthAlerts,
    setHighContrastMode,
  } = useForgeStore();

  const assets = assetsData?.items || [];
  const incidents = incidentsData?.items || [];
  const profiles = profilesData?.profiles || [];

  const stats = useMemo(() => ({
    assets: assets.length,
    incidents: incidents.length,
    profiles: profiles.length,
    mode: labMode ? "Lab" : "Demo",
  }), [assets.length, incidents.length, profiles.length, labMode]);

  useGSAP(() => {
    const ctx = gsap.context(() => {
      gsap.from(".settings-hero > *", {
        y: 36,
        opacity: 0,
        duration: 0.9,
        stagger: 0.1,
        ease: "power3.out",
      });

      gsap.from(".settings-bento-card", {
        y: 60,
        opacity: 0,
        scale: 0.97,
        duration: 0.8,
        stagger: 0.1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ".settings-bento",
          start: "top 80%",
        },
      });
    }, pageRef);
    return () => ctx.revert();
  }, { scope: pageRef });

  return (
    <AppShell>
      <div ref={pageRef} className="settings-page overflow-x-hidden w-full max-w-full">
        <section className="settings-hero">
          <div className="settings-copy">
            <div className="eyebrow">Settings</div>
            <h1>
              Scanning controls and{" "}
              <span className="inline-photo inline-photo-signal" aria-hidden="true" />
              {" "}
              response governance
            </h1>
            <p>
              Safe demo scanning is always available. Real scanning is restricted to explicit opt-in lab mode.
              Configure the controls that govern how the command surface behaves under pressure.
            </p>
          </div>
          <div className="settings-overview">
            <article>
              <span>System mode</span>
              <strong style={{ color: labMode ? "var(--high)" : "var(--low)" }}>{stats.mode}</strong>
              <small>{labMode ? "Real scanning enabled" : "Safe demo environment"}</small>
            </article>
            <article>
              <span>Assets tracked</span>
              <strong>{stats.assets}</strong>
              <small>Objects in archive</small>
            </article>
            <article>
              <span>Incidents</span>
              <strong>{stats.incidents}</strong>
              <small>Total recorded cases</small>
            </article>
            <article>
              <span>Scan profiles</span>
              <strong>{stats.profiles}</strong>
              <small>Authorized temperaments</small>
            </article>
          </div>
        </section>

        <div className="settings-bento">
          <section className="settings-bento-card settings-bento-scan">
            <div className="eyebrow">Scan governance</div>
            <h3 style={{ fontSize: 20, lineHeight: 1.08, letterSpacing: "-0.03em", marginTop: 10 }}>
              Control how discovery behaves across the plant network.
            </h3>
            <div className="settings-control-list">
              <ToggleRow
                active={!labMode}
                onChange={() => setLabMode(false)}
                label="Safe demo scanning"
                description="Use local scenario data. No real network traffic."
              />
              <ToggleRow
                active={labMode}
                onChange={() => setLabMode(true)}
                label="Authorized lab mode"
                description="Enable real scanning with approved CIDR and profile."
              />
              <ToggleRow
                active={autoScanEnabled}
                onChange={() => setAutoScanEnabled(!autoScanEnabled)}
                label="Auto-discovery"
                description="Run periodic scans when data freshness expires."
              />
            </div>
            <div style={{ marginTop: 16, padding: 14, borderRadius: 18, border: "1px solid rgba(244,241,234,0.08)", background: "rgba(244,241,234,0.03)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--muted)" }}>
                {labMode ? <AlertTriangle size={13} color="var(--high)" /> : <CheckCircle2 size={13} color="var(--low)" />}
                {labMode
                  ? "Lab mode requires explicit CIDR authorization. All scans are logged."
                  : "Demo mode is completely safe. No network packets leave the browser."}
              </div>
            </div>
          </section>

          <section className="settings-bento-card settings-bento-governance">
            <div className="eyebrow">Analyst governance</div>
            <h3 style={{ fontSize: 20, lineHeight: 1.08, letterSpacing: "-0.03em", marginTop: 10 }}>
              Permissions that shape the response workflow.
            </h3>
            <div className="settings-governance-grid" style={{ marginTop: 16 }}>
              <Link href="/incidents" className="settings-governance-card" style={{ textDecoration: "none", color: "inherit" }}>
                <span>Action</span>
                <strong style={{ marginTop: 12 }}>Confirm true positive</strong>
                <small>Validate incident severity and lock decision</small>
              </Link>
              <Link href="/incidents" className="settings-governance-card" style={{ textDecoration: "none", color: "inherit" }}>
                <span>Action</span>
                <strong style={{ marginTop: 12 }}>Mark false positive</strong>
                <small>Override correlation and archive reasoning</small>
              </Link>
              <Link href="/incidents" className="settings-governance-card" style={{ textDecoration: "none", color: "inherit" }}>
                <span>Action</span>
                <strong style={{ marginTop: 12 }}>Accept recommendation</strong>
                <small>Apply suggested containment to affected assets</small>
              </Link>
              <button type="button" className="settings-governance-card" style={{ textAlign: "left", background: "transparent", border: "none", cursor: "pointer" }} onClick={() => toast.info("Risk override requires incident workbench access", { description: "Open an incident to manually override risk scores." })}>
                <span>Action</span>
                <strong style={{ marginTop: 12 }}>Override decision</strong>
                <small>Manual risk score with analyst attribution</small>
              </button>
              <Link href="/incidents" className="settings-governance-card" style={{ textDecoration: "none", color: "inherit" }}>
                <span>Action</span>
                <strong style={{ marginTop: 12 }}>Resolve incident</strong>
                <small>Close thread and trigger Aether sync</small>
              </Link>
              <button type="button" className="settings-governance-card" style={{ textAlign: "left", background: "transparent", border: "none", cursor: "pointer" }} onClick={() => toast.info("Recompute triggered", { description: "The next scan will refresh all risk models with latest evidence." })}>
                <span>Action</span>
                <strong style={{ marginTop: 12 }}>Recompute risk</strong>
                <small>Force model refresh with latest evidence</small>
              </button>
            </div>
          </section>

          <section className="settings-bento-card settings-bento-actions">
            <div className="eyebrow">Notifications</div>
            <h3 style={{ fontSize: 18, lineHeight: 1.08, letterSpacing: "-0.03em", marginTop: 10 }}>
              Alert routing
            </h3>
            <div className="settings-control-list" style={{ marginTop: 14 }}>
              <ToggleRow
                active={notificationsEnabled}
                onChange={() => setNotificationsEnabled(!notificationsEnabled)}
                label="Critical alerts"
                description="Push on new critical incidents"
              />
              <ToggleRow
                active={strictAuthAlerts}
                onChange={() => setStrictAuthAlerts(!strictAuthAlerts)}
                label="Unauthorized objects"
                description="Alert when assets leave approved state"
              />
            </div>
          </section>

          <section className="settings-bento-card settings-bento-preferences">
            <div className="eyebrow">Display</div>
            <h3 style={{ fontSize: 18, lineHeight: 1.08, letterSpacing: "-0.03em", marginTop: 10 }}>
              Interface preferences
            </h3>
            <div className="settings-control-list" style={{ marginTop: 14 }}>
              <ToggleRow
                active={highContrastMode}
                onChange={() => setHighContrastMode(!highContrastMode)}
                label="High contrast mode"
                description="Increase border and text contrast for low-light environments"
              />
            </div>
          </section>

          <section className="settings-bento-card settings-bento-system">
            <div className="eyebrow">System</div>
            <h3 style={{ fontSize: 18, lineHeight: 1.08, letterSpacing: "-0.03em", marginTop: 10 }}>
              Status
            </h3>
            <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, fontSize: 12 }}>
                <span style={{ color: "rgba(244,241,234,0.68)" }}>Data freshness</span>
                <span className="chip">{commandData?.data_freshness || "Telemetry not hydrated"}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, fontSize: 12 }}>
                <span style={{ color: "rgba(244,241,234,0.68)" }}>Last scan</span>
                <span className="chip">
                  {commandData?.kpis?.last_scan_at
                    ? new Date(commandData.kpis.last_scan_at).toLocaleString()
                    : "No scan recorded"}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, fontSize: 12 }}>
                <span style={{ color: "rgba(244,241,234,0.68)" }}>Site</span>
                <span className="chip">Detroit Forge</span>
              </div>
            </div>
            <button
              type="button"
              className="btn primary"
              style={{ width: "100%", marginTop: 16, justifyContent: "center", minHeight: 40 }}
              onClick={() =>
                exportDiagnostics({
                  assets,
                  incidents,
                  profiles,
                  labMode,
                  commandData,
                  notificationsEnabled,
                  autoScanEnabled,
                  strictAuthAlerts,
                  highContrastMode,
                })
              }
            >
              <ClipboardCopy size={14} /> Export diagnostics
            </button>
          </section>
        </div>

        <section className="command-action" style={{ borderTop: "1px solid rgba(244,241,234,0.08)", marginTop: 40, padding: "clamp(56px, 8vw, 112px) 0" }}>
          <div>
            <div className="eyebrow">Back to operations</div>
            <h2>Configuration changes apply immediately to the active workspace.</h2>
            <p style={{ maxWidth: 600, marginTop: 16, color: "rgba(244,241,234,0.68)", lineHeight: 1.6 }}>
              Return to the command center to see how these settings affect scan behavior, incident routing, and the response lane.
            </p>
            <div className="hero-actions" style={{ marginTop: 28 }}>
              <Link href="/command" className="taste-btn taste-btn-primary">
                Return to command
                <ArrowRight size={17} />
              </Link>
              <Link href="/assets" className="taste-btn">
                Review assets
                <Shield size={17} />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
