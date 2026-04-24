"use client";

import { useForgeStore } from "@/lib/store";
import { AppShell } from "@/components/layout/AppShell";

export default function SettingsPage() {
  const { labMode, setLabMode } = useForgeStore();
  return (
    <AppShell>
      <div className="page-head">
        <div>
          <div className="eyebrow">Settings</div>
          <h1>Scanning controls and response governance</h1>
          <p className="muted">Safe demo scanning is always available. Real scanning is restricted to explicit opt-in lab mode.</p>
        </div>
      </div>
      <div className="grid command-grid">
        <section className="panel">
          <div className="page-head">
            <div>
              <div className="eyebrow">Scan Mode</div>
              <h2>Safe demo scanning</h2>
            </div>
            <span className="risk-badge risk-low">enabled</span>
          </div>
          <p className="muted">Demo scans use local scenario data and do not touch real networks.</p>
        </section>
        <section className="panel">
          <div className="page-head">
            <div>
              <div className="eyebrow">Opt-in Lab Mode</div>
              <h2>Real scanning gate</h2>
            </div>
            <button className={`filter ${labMode ? "active" : ""}`} onClick={() => setLabMode(!labMode)}>{labMode ? "Enabled" : "Disabled"}</button>
          </div>
          <p className="muted">When enabled, operators must provide an approved lab CIDR and acknowledge authorization before a real scanner API call can run.</p>
        </section>
      </div>
      <section className="panel" style={{ marginTop: 14 }}>
        <div className="eyebrow">Analyst Actions</div>
        <div className="filters" style={{ marginTop: 12 }}>
          {["Confirm true positive", "Mark false positive", "Accept recommendation", "Override recommendation", "Resolve incident", "Recompute risk", "Create report"].map((action) => (
            <span className="chip" key={action}>{action}</span>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
