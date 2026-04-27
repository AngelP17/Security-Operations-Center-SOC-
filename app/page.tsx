import {
  ArrowRight,
  Boxes,
  Factory,
  Gauge,
  GitBranch,
  Network,
  Radar,
  ShieldCheck,
  TicketCheck,
} from "lucide-react";
import Link from "next/link";

const workstreams = [
  {
    href: "/topology",
    icon: Network,
    title: "Topology investigation",
    text: "Open segmented asset paths with risk, trust state, and incident correlation already attached.",
  },
  {
    href: "/incidents",
    icon: TicketCheck,
    title: "Aether handoff",
    text: "Create a response ticket once, keep the operational link visible, and avoid duplicate incident syncs.",
  },
  {
    href: "/assets",
    icon: Boxes,
    title: "Asset authority",
    text: "Review scan provenance, owners, segments, exposed services, and authorization state in one record.",
  },
];

const topologyPaths = [
  ["Plant floor", "Historian", "Unauth asset"],
  ["DMZ", "VPN edge", "PLC bridge"],
  ["Cloud", "Telemetry API", "Response case"],
];

export default function LandingPage() {
  return (
    <main className="home-page">
      <nav className="home-nav" aria-label="Primary">
        <Link href="/" className="home-brand" aria-label="ForgeSentinel home">
          <span className="home-brand-mark">
            <ShieldCheck size={21} />
          </span>
          <span>
            <strong>ForgeSentinel</strong>
            <small>Industrial SOC intelligence</small>
          </span>
        </Link>
        <div className="home-nav-links">
          <Link href="/topology">Topology</Link>
          <Link href="/assets">Assets</Link>
          <Link href="/incidents">Incidents</Link>
        </div>
        <Link href="/command" className="home-command-link">
          <Gauge size={16} />
          Command
        </Link>
      </nav>

      <section className="home-hero" aria-labelledby="home-title">
        <div className="home-copy">
          <p className="home-kicker">ForgeSentinel for manufacturing security teams</p>
          <h1 id="home-title">
            Industrial risk mapped before downtime.
          </h1>
          <p>
            Discover unknown assets, explain exposed services, correlate plant-floor events, and push response
            decisions into an auditable Aether record.
          </p>
          <div className="home-actions">
            <Link href="/command" className="taste-btn taste-btn-primary">
              Open command center
              <ArrowRight size={17} />
            </Link>
            <Link href="/topology" className="taste-btn">
              Inspect topology
              <GitBranch size={17} />
            </Link>
          </div>
        </div>

        <div className="home-visual" aria-label="ForgeSentinel operational preview">
          <div className="home-media" />
          <div className="home-console">
            <div className="home-console-head">
              <span>
                <Radar size={16} />
                Live investigation
              </span>
              <Link href="/topology">Open graph</Link>
            </div>
            <div className="home-route-map" aria-hidden="true">
              {topologyPaths.map((path) => (
                <div className="home-route" key={path.join("-")}>
                  {path.map((node, index) => (
                    <span key={node} data-hot={index === path.length - 1 || undefined}>
                      {node}
                    </span>
                  ))}
                </div>
              ))}
            </div>
            <div className="home-console-footer">
              <span>
                <Factory size={15} />
                OT evidence retained
              </span>
              <span>Aether ready</span>
            </div>
          </div>
        </div>
      </section>

      <section className="home-workstreams" aria-label="Operational workstreams">
        <div className="home-section-copy">
          <p className="home-kicker">Not a brochure, a working surface</p>
          <h2>Every entry point goes somewhere useful.</h2>
        </div>
        <div className="home-workstream-grid">
          {workstreams.map((item) => {
            const Icon = item.icon;
            return (
              <Link href={item.href} className="home-workstream" key={item.href}>
                <span>
                  <Icon size={20} />
                </span>
                <strong>{item.title}</strong>
                <p>{item.text}</p>
                <small>
                  Open surface
                  <ArrowRight size={14} />
                </small>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="home-action">
        <h2>Start in the command center, then follow the evidence.</h2>
        <div className="home-actions">
          <Link href="/command" className="taste-btn taste-btn-primary">
            Enter command
            <ArrowRight size={17} />
          </Link>
          <Link href="/incidents" className="taste-btn">
            Review incidents
            <TicketCheck size={17} />
          </Link>
        </div>
      </section>
    </main>
  );
}
