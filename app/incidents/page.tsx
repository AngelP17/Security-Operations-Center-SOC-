import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { RiskBadge } from "@/components/shared/RiskBadge";
import { incidents } from "@/lib/security-data";

export default function IncidentsPage() {
  return (
    <AppShell>
      <div className="page-head">
        <div>
          <div className="eyebrow">Correlated Security Incidents</div>
          <h1>Centralized case workflow</h1>
        </div>
        <div className="filters">
          <button className="btn">Confirm true positive</button>
          <button className="btn">Mark false positive</button>
          <button className="btn primary">Create report</button>
        </div>
      </div>
      <div className="grid">
        {incidents.map((incident) => (
          <Link className="panel" style={{ textDecoration: "none" }} href={`/incidents/${incident.id}`} key={incident.id}>
            <div className="page-head" style={{ marginBottom: 8 }}>
              <div>
                <span className="mono muted">{incident.id}</span>
                <h2>{incident.title}</h2>
              </div>
              <RiskBadge level={incident.severity} score={incident.risk} />
            </div>
            <p className="muted">{incident.summary}</p>
            <div className="filters" style={{ marginTop: 12 }}>
              <span className="chip">{incident.status}</span>
              <span className="chip">{incident.confidence}% confidence</span>
              <span className="chip">{incident.affectedAssets.length} affected assets</span>
            </div>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
