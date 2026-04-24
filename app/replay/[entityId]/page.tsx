"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { replaySteps } from "@/lib/security-data";

export default function ReplayPage({ params }: { params: { entityId: string } }) {
  const [open, setOpen] = useState<string | null>("Risk decision generated");

  return (
    <AppShell>
      <div className="page-head">
        <div>
          <div className="eyebrow">Asset / Incident Audit Replay</div>
          <h1>Explainability trail for <span className="mono">{params.entityId}</span></h1>
          <p className="muted">Replay proves how an observation became an asset, a risk decision, a correlated incident, and a recommendation.</p>
        </div>
        <div className="filters">
          <button className="btn">Export JSON</button>
          <button className="btn primary">Create report</button>
        </div>
      </div>
      <section className="panel">
        {replaySteps.map((step) => {
          const expanded = open === step.event;
          return (
            <div className="timeline-item" key={step.event}>
              <button className="btn" style={{ width: "100%", justifyContent: "space-between" }} onClick={() => setOpen(expanded ? null : step.event)}>
                <span><span className="mono muted">{step.timestamp}</span> · {step.event}</span>
                {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
              </button>
              <div style={{ padding: "10px 0 0 4px" }}>
                <div className="filters">
                  <span className="chip">{step.actor}</span>
                  <span className="chip">{step.entity}</span>
                </div>
                <p className="muted" style={{ marginTop: 8 }}>{step.summary}</p>
                {expanded ? <pre className="json mono" style={{ marginTop: 10 }}>{JSON.stringify(step.raw, null, 2)}</pre> : null}
              </div>
            </div>
          );
        })}
      </section>
    </AppShell>
  );
}
