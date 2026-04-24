"use client";

import { ArrowUpRight, CircuitBoard, Factory, FileClock, Gauge, Network, Play, Shield } from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--root)" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 40px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div className="brand-mark"><Shield size={20} /></div>
          <div>
            <strong style={{ fontSize: 18 }}>ForgeSentinel</strong>
            <div className="muted" style={{ fontSize: 12 }}>Industrial SOC & Asset Risk Intelligence</div>
          </div>
        </div>
        <Link href="/command" className="btn primary"><Gauge size={15} /> Open Command Center</Link>
      </header>

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "80px 40px" }}>
        <div style={{ textAlign: "center", maxWidth: 800, margin: "0 auto" }}>
          <div className="hero-kicker" style={{ marginBottom: 18 }}>ForgeSentinel for manufacturing security teams</div>
          <h1 style={{ fontSize: "clamp(2.5rem, 5vw, 4.5rem)", lineHeight: 1.05, letterSpacing: "-0.03em" }}>
            Industrial risk with evidence attached.
          </h1>
          <p style={{ maxWidth: 620, margin: "24px auto 0", color: "var(--secondary)", fontSize: 18, lineHeight: 1.55 }}>
            Discover unknown assets, explain exposed services, correlate security events, and write response decisions back into an auditable operational record.
          </p>
          <div className="hero-actions" style={{ justifyContent: "center", marginTop: 30 }}>
            <Link href="/command" className="taste-btn taste-btn-primary"><Play size={17} /> Enter command center</Link>
            <Link href="/assets" className="taste-btn"><ArrowUpRight size={17} /> Browse assets</Link>
          </div>
        </div>

        <div className="grid command-grid" style={{ marginTop: 80 }}>
          <div className="panel" style={{ padding: 28 }}>
            <Factory size={24} color="var(--amber)" />
            <h2 style={{ marginTop: 14 }}>Asset Intelligence</h2>
            <p className="muted" style={{ marginTop: 8 }}>Normalize scan observations into an authoritative asset inventory with authorization state, owner, segment, and provenance.</p>
          </div>
          <div className="panel" style={{ padding: 28 }}>
            <CircuitBoard size={24} color="var(--amber)" />
            <h2 style={{ marginTop: 14 }}>Explainable Risk Decisions</h2>
            <p className="muted" style={{ marginTop: 8 }}>Deterministic scoring from exposure, authorization, criticality, events, and correlation — with full feature snapshot and triggered rules.</p>
          </div>
          <div className="panel" style={{ padding: 28 }}>
            <Network size={24} color="var(--amber)" />
            <h2 style={{ marginTop: 14 }}>Correlated Incidents</h2>
            <p className="muted" style={{ marginTop: 8 }}>Pattern-based incident correlation links unauthorized assets, exposed services, and OT exposure into actionable cases.</p>
          </div>
          <div className="panel" style={{ padding: 28 }}>
            <FileClock size={24} color="var(--amber)" />
            <h2 style={{ marginTop: 14 }}>Audit Replay</h2>
            <p className="muted" style={{ marginTop: 8 }}>Every decision is preserved with actor, timestamp, entity, and raw JSON for compliance review and analyst training.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
