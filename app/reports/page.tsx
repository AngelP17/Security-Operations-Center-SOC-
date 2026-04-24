"use client";

import { FileText } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { RiskBadge } from "@/components/shared/RiskBadge";
import { RouteState } from "@/components/shared/RouteState";
import { useIncidents } from "@/lib/hooks/use-incidents";

export default function ReportsPage() {
  const { data, isLoading, error } = useIncidents();

  if (isLoading) {
    return (
      <AppShell>
        <RouteState type="loading" title="Loading reports..." />
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <RouteState type="error" title="Failed to load reports" />
      </AppShell>
    );
  }

  const incidents = data?.items || [];

  return (
    <AppShell>
      <div className="page-head">
        <div>
          <div className="eyebrow">Reports</div>
          <h1>Production security evidence packages</h1>
          <p className="muted">Create audit-ready exports from risk decisions, evidence timelines, analyst notes, and response actions.</p>
        </div>
        <button className="btn primary"><FileText size={15} /> Generate executive report</button>
      </div>
      <div className="grid command-grid">
        <section className="panel">
          <div className="eyebrow">Report Queue</div>
          <div className="metric-list" style={{ marginTop: 14 }}>
            {incidents.length === 0 ? (
              <p className="muted">No incidents available for reporting.</p>
            ) : (
              incidents.map((incident: any) => (
                <div className="metric-row" key={incident.id}>
                  <span><strong>{incident.incident_uid}</strong><br /><span className="muted">{incident.title}</span></span>
                  <RiskBadge level={incident.severity} score={incident.risk_score} />
                </div>
              ))
            )}
          </div>
        </section>
        <aside className="right-rail">
          <section className="panel">
            <div className="eyebrow">Included Evidence</div>
            {["Risk score breakdown", "Triggered rules", "Open ports", "Recommendation approvals", "Audit replay JSON", "Analyst actions"].map((item) => (
              <p className="muted" style={{ marginTop: 9 }} key={item}>• {item}</p>
            ))}
          </section>
        </aside>
      </div>
    </AppShell>
  );
}
