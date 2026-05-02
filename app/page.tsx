"use client";

import { useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
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
    title: "Command",
    note: "Incident pressure, scan posture, queue priority, and response moves stay in one authored lane.",
    image: "https://picsum.photos/seed/industrial-command-room/1200/900",
    tone: "command",
  },
  {
    href: "/assets",
    icon: Boxes,
    title: "Assets",
    note: "Every device keeps identity, ownership, authorization state, service evidence, and risk rationale attached.",
    image: "https://picsum.photos/seed/manufacturing-asset-ledger/1200/900",
    tone: "assets",
  },
  {
    href: "/incidents",
    icon: TicketCheck,
    title: "Incidents",
    note: "Escalation reads as a response story with confidence, evidence, recommendations, and Aether handoff.",
    image: "https://picsum.photos/seed/security-incident-board/1200/900",
    tone: "incidents",
  },
  {
    href: "/topology",
    icon: Network,
    title: "Topology",
    note: "Segment relationships remain inspectable while the analyst drills from graph context into real objects.",
    image: "https://picsum.photos/seed/industrial-network-topology/1200/900",
    tone: "topology",
  },
];

const capabilityCards = [
  {
    className: "landing-bento-wide",
    title: "Risk decisions carry their evidence.",
    body: "Ports, authorization state, asset criticality, triggered rules, and incident correlations remain readable instead of being flattened into a decorative score.",
    image: "https://picsum.photos/seed/risk-evidence-console/1400/900",
  },
  {
    className: "landing-bento-small",
    title: "Real scan posture",
    body: "Safe demo runs and authorized lab scans are separated by governance.",
    image: "https://picsum.photos/seed/tcp-scan-lab/900/900",
  },
  {
    className: "landing-bento-small",
    title: "Aether-ready handoff",
    body: "Local response records can become operational tickets without losing audit context.",
    image: "https://picsum.photos/seed/operations-handoff/900/900",
  },
  {
    className: "landing-bento-third",
    title: "Audit replay",
    body: "Every recommendation can be traced back to the observations that made it credible.",
    image: "https://picsum.photos/seed/audit-replay-ledger/900/900",
  },
  {
    className: "landing-bento-third",
    title: "OT aware",
    body: "Industrial protocols and conservative profiles are treated as first-class operating constraints.",
    image: "https://picsum.photos/seed/industrial-control-system/900/900",
  },
  {
    className: "landing-bento-third",
    title: "Segment clarity",
    body: "Topology, incidents, and object records share one mental model.",
    image: "https://picsum.photos/seed/network-segment-map/900/900",
  },
];

function getLeadIncident(incidents: Incident[]) {
  return incidents
    .filter((incident) => !["closed", "resolved"].includes((incident.status || "").toLowerCase()))
    .sort((a, b) => b.risk_score - a.risk_score)[0];
}

function getHighRiskAssets(assets: Asset[]) {
  return assets.filter((asset) => ["critical", "high"].includes(asset.risk_level || ""));
}

export default function LandingPage() {
  const pageRef = useRef<HTMLElement>(null);
  const [activeSlice, setActiveSlice] = useState(routeSlices[0]);
  const { data: command } = useCommandCenter();
  const { data: assetsData } = useAssets();
  const { data: incidentsData } = useIncidents();
  const { data: profilesData } = useScanProfiles();

  const assets: Asset[] = assetsData?.items || [];
  const incidents: Incident[] = incidentsData?.items || [];
  const profiles = profilesData?.profiles || [];
  const leadIncident = useMemo(() => getLeadIncident(incidents), [incidents]);
  const highRiskAssets = useMemo(() => getHighRiskAssets(assets), [assets]);

  const proofFrames = useMemo(
    () => [
      {
        title: leadIncident?.title || "Response posture stays ready before the first incident leads.",
        body: leadIncident
          ? `${leadIncident.incident_uid} carries ${leadIncident.affected_assets.length} affected assets, ${leadIncident.confidence_score}% confidence, and a ${leadIncident.severity} severity path.`
          : "When incidents arrive, the workspace preserves why it matters, what is affected, and what action follows.",
      },
      {
        title: `${command?.kpis?.total_assets ?? assets.length} assets can resolve into object evidence.`,
        body: assets.length
          ? `${highRiskAssets.length} objects are already high or critical, with services and authorization state visible to the analyst.`
          : "Discovery records are ready to carry owner, segment, service, and risk decisions together.",
      },
      {
        title: `${profiles.length || "Governed"} scan profiles keep discovery intentional.`,
        body: profiles.length
          ? "Profile choice can reflect safe discovery, OT visibility, conservative OT, Windows exposure, or deeper private review."
          : "The interface leaves room for profile governance even when the backend has not returned the catalog yet.",
      },
    ],
    [assets.length, command?.kpis?.total_assets, highRiskAssets.length, leadIncident, profiles.length],
  );

  useGSAP(
    () => {
      const ctx = gsap.context(() => {
        gsap.from(".taste-hero-enter > *", {
          y: 34,
          opacity: 0,
          duration: 0.9,
          stagger: 0.09,
          ease: "power3.out",
        });

        gsap.to(".landing-bento-card", {
          y: -8,
          duration: 0.8,
          stagger: 0.06,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ".landing-bento-grid",
            start: "top 82%",
            toggleActions: "play none none reverse",
          },
        });

        gsap.utils.toArray<HTMLElement>(".scrub-word").forEach((word, index) => {
          gsap.to(word, {
            opacity: 1,
            y: 0,
            ease: "none",
            scrollTrigger: {
              trigger: ".landing-scrub-copy",
              start: `top+=${index * 8} 74%`,
              end: `top+=${index * 8 + 120} 42%`,
              scrub: true,
            },
          });
        });

        gsap.utils.toArray<HTMLElement>(".landing-stack-card").forEach((card, index) => {
          gsap.to(card, {
            y: index * -18,
            scale: 1 - index * 0.018,
            ease: "none",
            scrollTrigger: {
              trigger: card,
              start: "top 86%",
              end: "top 36%",
              scrub: true,
            },
          });
        });

        ScrollTrigger.create({
          trigger: ".landing-desire",
          start: "top top",
          end: "bottom bottom",
          pin: ".landing-desire-copy",
          pinSpacing: false,
        });
      }, pageRef);

      return () => ctx.revert();
    },
    { scope: pageRef },
  );

  const scrubText =
    "ForgeSentinel feels premium because it refuses to separate beauty from consequence: asset identity, incident pressure, scan governance, and response handoff all remain visible while the operator moves.";

  return (
    <main ref={pageRef} className="landing-page-v3 overflow-x-hidden w-full max-w-full">
      <nav className="taste-nav" aria-label="Primary">
        <Link href="/" className="taste-brand" aria-label="ForgeSentinel home">
          <span className="taste-brand-mark">
            <ShieldCheck size={19} />
          </span>
          <span>
            <strong>ForgeSentinel</strong>
            <small>Industrial operational intelligence</small>
          </span>
        </Link>
        <div className="taste-nav-links">
          {routeSlices.map((slice) => (
            <Link key={slice.href} href={slice.href}>
              {slice.title}
            </Link>
          ))}
        </div>
        <Link href="/command" className="taste-button taste-button-light">
          Open workspace
          <ArrowRight size={16} />
        </Link>
      </nav>

      <section className="taste-hero taste-hero-enter" aria-labelledby="landing-title">
        <div className="taste-hero-bg" aria-hidden="true" />
        <p className="taste-kicker">Manufacturing SOC and asset risk intelligence</p>
        <h1 id="landing-title" className="taste-hero-title">
          Credible command for industrial security.
        </h1>
        <p className="taste-hero-copy">
          ForgeSentinel connects discovery, asset evidence, incident escalation, topology context, and response handoff
          into one operationally believable workspace.
        </p>
        <div className="taste-hero-actions">
          <Link href="/command" className="taste-button taste-button-light">
            Enter command
            <ArrowRight size={17} />
          </Link>
          <Link href="/topology" className="taste-button taste-button-dark">
            Inspect topology
            <GitBranch size={17} />
          </Link>
        </div>
        <div className="taste-live-panel">
          <span>
            <Radar size={14} />
            {command?.data_freshness || "Connect API or run demo scan"}
          </span>
          <strong>{leadIncident ? leadIncident.incident_uid : "Ready for first lead"}</strong>
        </div>
      </section>

      <section className="landing-bento-section">
        <div className="landing-section-header">
          <p className="taste-kicker">Evidence architecture</p>
          <h2>
            The product makes risk
            <span
              className="inline-photo inline-photo-forge"
              aria-hidden="true"
            />
            inspectable.
          </h2>
          <p>
            This pass treats the homepage as a working product entry, not a marketing wrapper. The capabilities below
            match the operational modules already implemented in the app.
          </p>
        </div>

        <div className="landing-bento-grid">
          {capabilityCards.map((card) => (
            <article key={card.title} className={`landing-bento-card group ${card.className}`}>
              <div className="landing-bento-image">
                <img src={card.image} alt="" />
              </div>
              <div>
                <h3>{card.title}</h3>
                <p>{card.body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="taste-marquee" aria-label="ForgeSentinel operating model">
        <div>
          asset evidence / incident escalation / topology context / audit replay / governed scans / Aether handoff /
        </div>
        <div aria-hidden="true">
          asset evidence / incident escalation / topology context / audit replay / governed scans / Aether handoff /
        </div>
      </section>

      <section className="landing-accordion-section">
        <div className="landing-section-header compact">
          <p className="taste-kicker">Route personality</p>
          <h2>Each workspace carries its own pressure.</h2>
        </div>
        <div className="landing-accordion" aria-label="Workspace route previews">
          {routeSlices.map((slice) => {
            const Icon = slice.icon;
            return (
              <Link
                key={slice.href}
                href={slice.href}
                className={`landing-accordion-item tone-${slice.tone}`}
                onMouseEnter={() => setActiveSlice(slice)}
                onFocus={() => setActiveSlice(slice)}
              >
                <img src={slice.image} alt="" />
                <div>
                  <Icon size={18} />
                  <strong>{slice.title}</strong>
                  <p>{slice.note}</p>
                </div>
              </Link>
            );
          })}
        </div>
        <p className="landing-active-note">{activeSlice.note}</p>
      </section>

      <section className="landing-desire">
        <div className="landing-desire-copy">
          <p className="taste-kicker">Operational clarity</p>
          <h2>The interface earns trust by keeping consequence in frame.</h2>
        </div>
        <div className="landing-desire-rail">
          <p className="landing-scrub-copy">
            {scrubText.split(" ").map((word, index) => (
              <span className="scrub-word" key={`${word}-${index}`}>
                {word}{" "}
              </span>
            ))}
          </p>
          <div className="landing-stack">
            {proofFrames.map((frame) => (
              <article key={frame.title} className="landing-stack-card">
                <h3>{frame.title}</h3>
                <p>{frame.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-final-cta">
        <div>
          <p className="taste-kicker">Start in the command lane</p>
          <h2>Open the workspace and operate from live system state.</h2>
        </div>
        <Link href="/command" className="taste-button taste-button-light">
          Open command center
          <ArrowRight size={18} />
        </Link>
      </section>

      <footer className="taste-footer">
        <div>
          <strong>ForgeSentinel</strong>
          <span>Industrial command system for credible security operations.</span>
        </div>
        <nav aria-label="Footer">
          <Link href="/command">Command</Link>
          <Link href="/assets">Assets</Link>
          <Link href="/incidents">Incidents</Link>
          <Link href="/topology">Topology</Link>
          <Link href="/reports">Reports</Link>
          <Link href="/settings">Settings</Link>
        </nav>
      </footer>
    </main>
  );
}
