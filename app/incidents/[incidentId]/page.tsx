import { CheckCircle2, FileText, MessageSquare, ShieldX } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { RiskBadge } from "@/components/shared/RiskBadge";
import { assets, getIncident } from "@/lib/security-data";

export default function IncidentWorkbench({ params }: { params: { incidentId: string } }) {
  const incident = getIncident(params.incidentId);
  const affected = incident.affectedAssets.map((id) => assets.find((asset) => asset.id === id)).filter(Boolean);

  return (
    <AppShell>
      <div className="page-head">
        <div>
          <div className="eyebrow">Incident Workbench</div>
          <h1>{incident.title}</h1>
          <div className="filters" style={{ marginTop: 10 }}>
            <RiskBadge level={incident.severity} score={incident.risk} />
            <span className="chip">{incident.status}</span>
            <span className="chip">{incident.confidence}% confidence</span>
          </div>
        </div>
        <div className="filters">
          <button className="btn"><CheckCircle2 size={15} /> Resolve incident</button>
          <button className="btn"><ShieldX size={15} /> Override recommendation</button>
          <button className="btn primary"><FileText size={15} /> Create report</button>
        </div>
      </div>
      <div className="split">
        <section className="panel">
          <div className="eyebrow">Evidence Timeline</div>
          <div style={{ marginTop: 16 }}>
            {incident.timeline.map((item) => (
              <div className="timeline-item" key={`${item.time}-${item.event}`}>
                <span className="mono muted">{item.time} · {item.actor}</span>
                <h2 style={{ marginTop: 4 }}>{item.event}</h2>
                <p className="muted">{item.summary}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="grid">
          <div className="panel">
            <div className="eyebrow">Incident Summary</div>
            <p className="muted" style={{ marginTop: 10 }}>{incident.summary}</p>
          </div>
          <div className="panel">
            <div className="eyebrow">Affected Assets</div>
            <div className="metric-list" style={{ marginTop: 12 }}>
              {affected.map((asset) => asset ? (
                <div className="metric-row" key={asset.id}>
                  <span>{asset.hostname}<br /><span className="mono muted">{asset.ip}</span></span>
                  <RiskBadge level={asset.riskLevel} score={asset.risk} />
                </div>
              ) : null)}
            </div>
          </div>
          <div className="panel">
            <div className="eyebrow">Risk Decision</div>
            <h2 style={{ marginTop: 8 }}>Risk score: <span className="mono">{incident.risk}</span> {incident.severity}</h2>
            <div className="metric-list" style={{ marginTop: 12 }}>
              {incident.decisionTrace.map((item) => <div className="metric-row" key={item.label}><span>{item.label}</span><strong className="mono">+{item.value}</strong></div>)}
            </div>
          </div>
          <div className="panel">
            <div className="eyebrow">Analyst Notes</div>
            {incident.notes.map((note) => <p className="muted" style={{ marginTop: 8 }} key={note}><MessageSquare size={13} style={{ display: "inline", marginRight: 6 }} />{note}</p>)}
          </div>
        </section>
        <aside className="right-rail">
          <section className="panel">
            <div className="eyebrow">Recommendation Stack</div>
            <div className="grid" style={{ marginTop: 12 }}>
              {incident.recommendations.map((rec) => (
                <div className="card" style={{ padding: 14 }} key={rec.rank}>
                  <span className="chip">Rank {rec.rank}</span>
                  <h2 style={{ marginTop: 10 }}>{rec.action}</h2>
                  <p className="muted" style={{ marginTop: 8 }}>{rec.rationale}</p>
                  <p style={{ marginTop: 8 }}><strong>Benefit:</strong> <span className="muted">{rec.benefit}</span></p>
                  <div className="filters" style={{ marginTop: 12 }}>
                    <span className="chip">{rec.confidence}% confidence</span>
                    <span className="chip">{rec.approval}</span>
                  </div>
                  <button className="btn primary" style={{ marginTop: 12 }}>Accept recommendation</button>
                </div>
              ))}
            </div>
          </section>
          <section className="panel">
            <div className="eyebrow">Audit Trail</div>
            <p className="muted" style={{ marginTop: 8 }}>Decision writeback preserved: score, evidence, recommendation rank, analyst action, and resolution state.</p>
          </section>
        </aside>
      </div>
    </AppShell>
  );
}
