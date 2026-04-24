"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { ChevronDown, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { RouteState } from "@/components/shared/RouteState";
import { useAssetReplay, useIncidentReplay } from "@/lib/hooks/use-replay";

export default function ReplayPage() {
  const params = useParams();
  const entityId = params.entityId as string;
  const [open, setOpen] = useState<string | null>(null);

  const assetId = entityId.startsWith("asset-") ? Number(entityId.replace("asset-", "")) : undefined;
  const incidentId = entityId.startsWith("inc-") ? Number(entityId.replace("inc-", "")) : undefined;

  const assetReplay = useAssetReplay(assetId);
  const incidentReplay = useIncidentReplay(incidentId);

  const loading = assetReplay.isLoading || incidentReplay.isLoading;
  const error = assetReplay.error || incidentReplay.error;

  let steps: any[] = [];
  let entityType = "unknown";
  if (assetReplay.data?.steps) {
    steps = assetReplay.data.steps;
    entityType = "asset";
  } else if (incidentReplay.data?.steps) {
    steps = incidentReplay.data.steps;
    entityType = "incident";
  }

  if (loading) {
    return (
      <AppShell>
        <RouteState type="loading" title="Loading replay..." />
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <RouteState type="error" title="Replay unavailable" message="API connection failed." />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="page-head">
        <div>
          <div className="eyebrow">Asset / Incident Audit Replay</div>
          <h1>Explainability trail for <span className="mono">{params.entityId}</span></h1>
          <p className="muted">Replay proves how an observation became an asset, a risk decision, a correlated incident, and a recommendation.</p>
        </div>
      </div>
      <section className="panel">
        {steps.length === 0 ? (
          <RouteState type="empty" title="No replay steps recorded" message="Audit records will be generated after scans and risk decisions are processed." />
        ) : (
          steps.map((step: any) => {
            const key = `${step.timestamp}-${step.event_type}`;
            const expanded = open === key;
            return (
              <div className="timeline-item" key={key}>
                <button className="btn" style={{ width: "100%", justifyContent: "space-between" }} onClick={() => setOpen(expanded ? null : key)}>
                  <span>
                    <span className="mono muted">{new Date(step.timestamp).toLocaleTimeString()}</span>
                    {" "}· {step.event_type}
                  </span>
                  {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                </button>
                <div style={{ padding: "10px 0 0 4px" }}>
                  <div className="filters">
                    <span className="chip">{step.actor_type}</span>
                    <span className="chip">{step.entity_type} #{step.entity_id}</span>
                  </div>
                  <p className="muted" style={{ marginTop: 8 }}>{step.description}</p>
                  {expanded ? (
                    <pre className="json mono" style={{ marginTop: 10 }}>{JSON.stringify(step.payload, null, 2)}</pre>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </section>
    </AppShell>
  );
}
