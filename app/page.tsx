"use client";

import { useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  Gauge,
  GitBranch,
  Network,
  Radar,
  ShieldCheck,
  TicketCheck,
} from "lucide-react";
import Link from "next/link";
import { useAssets } from "@/lib/hooks/use-assets";
import { useCommandCenter, useScanProfiles } from "@/lib/hooks/use-command-center";
import { useIncidents } from "@/lib/hooks/use-incidents";
import type { Asset, Incident } from "@/lib/types";

gsap.registerPlugin(ScrollTrigger);

const routeSlices = [
  {
    href: "/command",
    icon: Gauge,
    title: "Command center",
    note: "Lead the queue from incident pressure, not from decorative metrics.",
    body: "The response lane keeps scan posture, queue priority, and the next operational move in the same authored frame.",
    accent: "command",
  },
  {
    href: "/assets",
    icon: Boxes,
    title: "Asset archive",
    note: "Object identity stays attached to risk, ownership, and exposed services.",
    body: "The archive view treats every device like a specimen record instead of flattening the investigation into table fatigue.",
    accent: "assets",
  },
  {
    href: "/incidents",
    icon: TicketCheck,
    title: "Incident board",
    note: "Escalation, confidence, and Aether handoff read like one response story.",
    body: "The incident surface preserves narrative continuity so the responder does not need to reconstruct context from scattered cards.",
    accent: "incidents",
  },
  {
    href: "/topology",
    icon: Network,
    title: "Topology observatory",
    note: "Path context stays readable while the graph remains interactive.",
    body: "The observatory view lets segment relationships, active incident threads, and asset drill-in coexist without utility-tool sprawl.",
    accent: "topology",
  },
];

function getLeadIncident(incidents: Incident[]) {
  return incidents
    .filter((incident) => !["closed", "resolved"].includes((incident.status || "").toLowerCase()))
    .sort((a, b) => b.risk_score - a.risk_score)[0];
}

export default function LandingPage() {
  const pageRef = useRef<HTMLElement>(null);
  const [activeSlice, setActiveSlice] = useState(routeSlices[0].href);
  const { data: command } = useCommandCenter();
  const { data: assetsData } = useAssets();
  const { data: incidentsData } = useIncidents();
  const { data: profilesData } = useScanProfiles();

  const assets: Asset[] = assetsData?.items || [];
  const incidents: Incident[] = incidentsData?.items || [];
  const profiles = profilesData?.profiles || [];
  const leadIncident = useMemo(() => getLeadIncident(incidents), [incidents]);
  const activeRoute = useMemo(
    () => routeSlices.find((slice) => slice.href === activeSlice) || routeSlices[0],
    [activeSlice],
  );

  const telemetry = useMemo(() => [
    {
      label: "Visible assets",
      value: `${command?.kpis?.total_assets ?? assets.length}`,
      detail: `${new Set(assets.map((asset) => asset.segment)).size} active segments`,
    },
    {
      label: "Open incidents",
      value: `${command?.kpis?.open_incidents ?? incidents.length}`,
      detail: leadIncident ? `${leadIncident.incident_uid} in focus` : "No incident leading",
    },
    {
      label: "Unauthorized",
      value: `${command?.kpis?.unauthorized_count ?? assets.filter((asset) => asset.authorization_state === "unauthorized").length}`,
      detail: "Objects outside approved state",
    },
    {
      label: "Scan profiles",
      value: `${profiles.length}`,
      detail: profiles.length ? "Authorized scan temperaments loaded" : "Profile catalog unavailable",
    },
  ], [assets, command, incidents.length, leadIncident, profiles.length]);

  const segmentNarratives = useMemo(() => {
    const counts = new Map<string, { total: number; highRisk: number }>();
    for (const asset of assets) {
      const key = asset.segment || "Unknown";
      const current = counts.get(key) || { total: 0, highRisk: 0 };
      current.total += 1;
      if (["critical", "high"].includes(asset.risk_level || "")) current.highRisk += 1;
      counts.set(key, current);
    }
    return Array.from(counts.entries())
      .map(([segment, value]) => ({
        segment,
        total: value.total,
        highRisk: value.highRisk,
      }))
      .sort((a, b) => b.highRisk - a.highRisk || b.total - a.total)
      .slice(0, 4);
  }, [assets]);

  const proofFrames = useMemo(() => [
    {
      eyebrow: "Command narrative",
      title: leadIncident?.title || "Response language stays ready even before the first incident leads.",
      detail: leadIncident
        ? `${leadIncident.incident_uid} carries ${leadIncident.affected_assets.length} affected assets with ${leadIncident.confidence_score}% confidence and a ${leadIncident.severity} severity label.`
        : "Once incidents arrive, the system should preserve the why, the scope, and the next move in one lane.",
      accent: "incident",
    },
    {
      eyebrow: "Plant object model",
      title: assets.length
        ? `${assets.filter((asset) => asset.authorization_state === "unauthorized").length} assets are already outside authorization policy.`
        : "The object archive is ready for the first credible device record.",
      detail: assets.length
        ? `${assets.filter((asset) => (asset.open_ports || []).length > 0).length} discovered objects already carry live port evidence and authorization state alongside identity.`
        : "When discovery runs, the archive should preserve identity, ownership, services, and consequence together.",
      accent: "assets",
    },
    {
      eyebrow: "Observability depth",
      title: segmentNarratives[0]
        ? `${segmentNarratives[0].segment} is the sharpest segment in the current graph.`
        : "Topology becomes useful when the graph preserves investigation context.",
      detail: segmentNarratives[0]
        ? `${segmentNarratives[0].highRisk} high-risk assets are visible there across ${segmentNarratives[0].total} currently mapped objects.`
        : "The observatory keeps segment pressure, graph relations, and asset drill-in aligned in the same chamber.",
      accent: "topology",
    },
  ], [assets, leadIncident, segmentNarratives]);

  useGSAP(() => {
    const ctx = gsap.context(() => {
      // Hero entrance with enhanced stagger
      gsap.from(".landing-hero-copy > *", {
        y: 42,
        opacity: 0,
        duration: 1,
        stagger: 0.12,
        ease: "power3.out",
      });

      gsap.from(".landing-stage, .landing-terminal-note", {
        x: 50,
        opacity: 0,
        duration: 1.05,
        stagger: 0.14,
        ease: "power3.out",
        delay: 0.2,
      });

      // Route cards scroll reveal with scale physics
      gsap.from(".landing-route-panel", {
        y: 80,
        opacity: 0,
        scale: 0.96,
        duration: 0.85,
        stagger: 0.1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ".landing-route-rails",
          start: "top 78%",
        },
      });

      // Proof cards with enhanced stagger
      gsap.from(".landing-proof-card", {
        y: 70,
        opacity: 0,
        duration: 0.85,
        stagger: 0.14,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ".landing-proof-rail",
          start: "top 76%",
        },
      });

      // Pin the proof copy while rail scrolls
      ScrollTrigger.create({
        trigger: ".landing-proof-copy",
        start: "top 140px",
        endTrigger: ".landing-proof-rail",
        end: "bottom bottom",
        pin: true,
      });

      // Action section fade up
      gsap.from(".landing-action-copy > *", {
        y: 40,
        opacity: 0,
        duration: 0.9,
        stagger: 0.1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ".landing-action-v2",
          start: "top 80%",
        },
      });

      gsap.from(".landing-directory-row", {
        x: 30,
        opacity: 0,
        duration: 0.7,
        stagger: 0.08,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ".landing-action-directory",
          start: "top 85%",
        },
      });

      // Footer reveal
      gsap.from(".landing-footer-grid > *", {
        y: 30,
        opacity: 0,
        duration: 0.7,
        stagger: 0.08,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ".landing-footer",
          start: "top 90%",
        },
      });
    }, pageRef);

    return () => ctx.revert();
  }, { scope: pageRef });

  return (
    <main ref={pageRef} className="landing-page-v2">
      <nav className="landing-nav" aria-label="Primary">
        <Link href="/" className="home-brand" aria-label="ForgeSentinel home">
          <span className="home-brand-mark">
            <ShieldCheck size={20} />
          </span>
          <span>
            <strong>ForgeSentinel</strong>
            <small>Industrial operational intelligence</small>
          </span>
        </Link>
        <div className="landing-nav-links">
          <Link href="/command">Command</Link>
          <Link href="/assets">Assets</Link>
          <Link href="/incidents">Incidents</Link>
          <Link href="/topology">Topology</Link>
        </div>
        <Link href="/command" className="taste-btn taste-btn-primary landing-nav-cta">
          Open workspace
          <ArrowRight size={16} />
        </Link>
      </nav>

      <section className="landing-hero-v2" aria-labelledby="landing-title">
        <div className="landing-hero-copy">
          <div className="hero-kicker">Premium operational intelligence for manufacturing infrastructure</div>
          <h1 id="landing-title" className="landing-hero-title">
            A command surface for the engineer who needs
            {" "}
            <span className="inline-photo inline-photo-signal" aria-hidden="true" />
            {" "}
            credible system behavior, not dashboard theater.
          </h1>
          <p className="landing-hero-body">
            ForgeSentinel is shaped for industrial cybersecurity, platform reliability, and infrastructure investigation.
            It connects discovery, asset evidence, incident escalation, topology context, and response handoff into one
            operationally believable interface.
          </p>
          <div className="hero-actions">
            <Link href="/command" className="taste-btn taste-btn-primary">
              Enter command center
              <ArrowRight size={17} />
            </Link>
            <Link href="/topology" className="taste-btn">
              Inspect topology
              <GitBranch size={17} />
            </Link>
          </div>
        </div>

        <div className="landing-hero-stage">
          <section className="landing-stage" aria-label="System overview">
            <div className="landing-stage-head">
              <div>
                <span className="landing-stage-kicker">Live workspace posture</span>
                <strong>{command?.data_freshness || "Telemetry waiting for first backend signal"}</strong>
              </div>
              <span className="chip">
                <Radar size={12} />
                {leadIncident ? leadIncident.incident_uid : "No active lead"}
              </span>
            </div>

            <div className="landing-stage-routes">
              {routeSlices.map((slice) => {
                const Icon = slice.icon;
                const isActive = slice.href === activeRoute.href;
                return (
                  <button
                    key={slice.href}
                    type="button"
                    className={`landing-stage-route ${isActive ? "active" : ""}`}
                    onMouseEnter={() => setActiveSlice(slice.href)}
                    onFocus={() => setActiveSlice(slice.href)}
                    onClick={() => setActiveSlice(slice.href)}
                  >
                    <span className={`landing-stage-swatch tone-${slice.accent}`} aria-hidden="true" />
                    <div>
                      <span className="landing-stage-route-label">
                        <Icon size={14} />
                        {slice.title}
                      </span>
                      <strong>{slice.note}</strong>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="landing-stage-telemetry">
              {telemetry.map((item) => (
                <article key={item.label} className="landing-stage-stat">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                  <small>{item.detail}</small>
                </article>
              ))}
            </div>
          </section>

          <div className="landing-terminal-note">
            <span>{activeRoute.title}</span>
            <strong>{activeRoute.body}</strong>
          </div>
        </div>
      </section>

      <section className="landing-marquee" aria-label="ForgeSentinel capabilities">
        <div>command narrative / asset evidence / incident escalation / topology observatory / aether handoff / operational credibility</div>
        <div aria-hidden="true">command narrative / asset evidence / incident escalation / topology observatory / aether handoff / operational credibility</div>
      </section>

      <section className="landing-routes-v2">
        <div className="section-copy landing-section-copy">
          <div className="eyebrow">Visual direction</div>
          <h2>Each route behaves like a different chamber of the same command machine.</h2>
          <p>
            The system should not repeat one safe dashboard pattern. Command, assets, incidents, and topology each need their
            own visual rhythm while still reading as one product family.
          </p>
        </div>

        <div className="landing-route-rails" role="tablist" aria-label="ForgeSentinel route previews">
          {routeSlices.map((slice, index) => {
            const Icon = slice.icon;
            const isActive = slice.href === activeRoute.href;
            return (
              <Link
                key={slice.href}
                href={slice.href}
                className={`landing-route-panel ${isActive ? "active" : ""}`}
                onMouseEnter={() => setActiveSlice(slice.href)}
                onFocus={() => setActiveSlice(slice.href)}
              >
                <div className={`landing-route-panel-media tone-${slice.accent}`} aria-hidden="true" />
                <div className="landing-route-panel-copy">
                  <span className="landing-route-panel-index">{`0${index + 1}`}</span>
                  <div className="landing-route-panel-title">
                    <Icon size={18} />
                    <strong>{slice.title}</strong>
                  </div>
                  <p>{slice.body}</p>
                  <small>{slice.note}</small>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="landing-proof-v2">
        <div className="landing-proof-copy">
          <div className="eyebrow">Operational proof</div>
          <h2>A premium interface earns trust by preserving consequence, not by hiding it behind polish.</h2>
          <p>
            The frontend should feel authored, but the credibility comes from how clearly it carries real system state:
            unauthorized objects, active incidents, mapped segments, and the next durable response move.
          </p>
          <div className="landing-proof-flags">
            <span className="chip">
              <AlertTriangle size={12} />
              {command?.kpis?.critical_count || 0} critical decisions
            </span>
            <span className="chip">
              <Boxes size={12} />
              {assets.length} archived objects
            </span>
          </div>
        </div>

        <div className="landing-proof-rail">
          {proofFrames.map((frame) => (
            <article key={frame.eyebrow} className="landing-proof-card">
              <div className={`landing-proof-card-figure tone-${frame.accent}`} aria-hidden="true" />
              <div className="eyebrow">{frame.eyebrow}</div>
              <h3>{frame.title}</h3>
              <p>{frame.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-action-v2">
        <div className="landing-action-copy">
          <div className="eyebrow">System entry</div>
          <h2>Open the route that matches the job, not the template pattern.</h2>
          <p>
            The command surface leads with priority, the asset archive preserves object identity, the incident board clarifies
            escalation, and the observatory keeps path context readable during drill-in.
          </p>
        </div>

        <div className="landing-action-directory">
          {routeSlices.map((slice) => (
            <Link key={slice.href} href={slice.href} className="landing-directory-row">
              <strong>{slice.title}</strong>
              <span>{slice.note}</span>
              <ArrowRight size={16} />
            </Link>
          ))}
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-grid">
          <div className="landing-footer-brand">
            <strong>ForgeSentinel</strong>
            <small>Industrial operational intelligence for manufacturing infrastructure, DevOps, and cybersecurity teams.</small>
          </div>
          <div className="landing-footer-col">
            <span>Operations</span>
            <Link href="/command">Command Center</Link>
            <Link href="/assets">Asset Archive</Link>
            <Link href="/incidents">Incident Board</Link>
          </div>
          <div className="landing-footer-col">
            <span>Investigation</span>
            <Link href="/topology">Topology Observatory</Link>
            <Link href="/reports">Reports</Link>
            <Link href="/settings">Settings</Link>
          </div>
          <div className="landing-footer-col">
            <span>System</span>
            <Link href="/command">Run Demo Scan</Link>
            <Link href="/settings">Lab Mode</Link>
            <Link href="/command">Shift Overview</Link>
          </div>
        </div>
        <div className="landing-footer-base">
          <span>ForgeSentinel Industrial Command System</span>
          <span>Detroit Forge Facility</span>
        </div>
      </footer>
    </main>
  );
}
