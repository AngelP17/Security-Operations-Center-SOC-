"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, FileText, MessageSquare, ShieldX, Ticket } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { RiskBadge } from "@/components/shared/RiskBadge";
import { RouteState } from "@/components/shared/RouteState";
import { useIncident } from "@/lib/hooks/use-incidents";
import { useAssets } from "@/lib/hooks/use-assets";
import { createAetherTicket } from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function IncidentWorkbench() {
  const params = useParams();
  const incidentId = Number(params.incidentId);
  const { data: incident, isLoading, error } = useIncident(incidentId);
  const { data: assetsData } = useAssets();
  const queryClient = useQueryClient();
  const [aetherStatus, setAetherStatus] = useState<string | null>(null);

  const aetherMutation = useMutation({
    mutationFn: () => createAetherTicket(incidentId),
    onSuccess: (data) => {
      setAetherStatus(data?.sync_status || "created");
      queryClient.invalidateQueries({ queryKey: ["incident", incidentId] });
    },
    onError: () => setAetherStatus("error"),
  });

  if (isLoading) {
    return (
      <AppShell>
        <RouteState type="loading" title="Loading incident..." />
      </AppShell>
    );
  }

  if (error || !incident) {
    return (
      <AppShell>
        <RouteState type="error" title="Incident not found" message="Failed to load incident from API." />
      </AppShell>
    );
  }

  const allAssets = assetsData?.items || [];
  const affected = (incident.affected_assets || [])
    .map((name: string) => allAssets.find((a: any) => a.hostname === name || a.asset_uid === name))
    .filter(Boolean);

  return (
    <AppShell>
      <div className="page-head">
        <div>
          <div className="eyebrow">Incident Workbench</div>
          <h1>{incident.title}</h1>
          <div className="filters" style={{ marginTop: 10 }}>
            <RiskBadge level={incident.severity} score={incident.risk_score} />
            <span className="chip">{incident.status}</span>
            <span className="chip">{incident.confidence_score}% confidence</span>
          </div>
        </div>
        <div className="filters">
          <button className="btn" onClick={() => aetherMutation.mutate()} disabled={aetherMutation.isPending}>
            <Ticket size={15} /> {aetherMutation.isPending ? "Creating..." : "Create Aether Ticket"}
          </button>
          <button className="btn primary"><FileText size={15} /> Create report</button>
        </div>
      </div>

      {aetherStatus ? (
        <div className="panel" style={{ marginBottom: 14, background: aetherStatus === "error" ? "rgba(239,68,68,.08)" : "rgba(34,197,94,.08)" }}>
          <span className={aetherStatus === "error" ? "risk-critical" : "risk-low"}>
            Aether ticket {aetherStatus === "disabled" ? "recorded as pending (integration disabled)" : `status: ${aetherStatus}`}
          </span>
        </div>
      ) : null}

      <div className="split">
        <section className="panel">
          <div className="eyebrow">Evidence Timeline</div>
          <div style={{ marginTop: 16 }}>
            {(incident.timeline || []).map((item: any) => (
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
              {affected.map((asset: any) => (
                <div className="metric-row" key={asset.id}>
                  <span>{asset.hostname}<br /><span className="mono muted">{asset.ip_address}</span></span>
                  <RiskBadge level={asset.risk_level || "low"} score={asset.risk_score || 0} />
                </div>
              ))}
            </div>
          </div>
          <div className="panel">
            <div className="eyebrow">Risk Decision</div>
            <h2 style={{ marginTop: 8 }}>Risk score: <span className="mono">{incident.risk_score}</span> {incident.severity}</h2>
            <div className="metric-list" style={{ marginTop: 12 }}>
              {(incident.decision_trace || []).map((item: any) => (
                <div className="metric-row" key={item.label}>
                  <span>{item.label}</span>
                  <strong className="mono">+{item.value}</strong>
                </div>
              ))}
            </div>
          </div>
          <div className="panel">
            <div className="eyebrow">Analyst Notes</div>
            {(incident.notes || []).map((note: string) => (
              <p className="muted" style={{ marginTop: 8 }} key={note}>
                <MessageSquare size={13} style={{ display: "inline", marginRight: 6 }} />{note}
              </p>
            ))}
          </div>
        </section>

        <aside className="right-rail">
          <section className="panel">
            <div className="eyebrow">Recommendation Stack</div>
            <div className="grid" style={{ marginTop: 12 }}>
              {(incident.recommendations || []).map((rec: any) => (
                <div className="card" style={{ padding: 14 }} key={rec.id}>
                  <span className="chip">Rank {rec.rank}</span>
                  <h2 style={{ marginTop: 10 }}>{rec.action_label}</h2>
                  <p className="muted" style={{ marginTop: 8, fontSize: 12 }}>{rec.rationale}</p>
                  <p style={{ marginTop: 8, fontSize: 12 }}><strong>Benefit:</strong> <span className="muted">{rec.expected_benefit}</span></p>
                  <div className="filters" style={{ marginTop: 12 }}>
                    <span className="chip">{rec.confidence}% confidence</span>
                    {rec.requires_approval ? <span className="chip">Approval required</span> : null}
                  </div>
                  <button className="btn primary" style={{ marginTop: 12, width: "100%" }}>Accept recommendation</button>
                </div>
              ))}
            </div>
          </section>
          <section className="panel">
            <div className="eyebrow">Audit Trail</div>
            <p className="muted" style={{ marginTop: 8, fontSize: 12 }}>
              Decision writeback preserved: score, evidence, recommendation rank, analyst action, and resolution state.
            </p>
          </section>
        </aside>
      </div>
    </AppShell>
  );
}
