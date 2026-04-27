"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, Copy, ExternalLink, MessageSquare, Ticket } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { RiskBadge } from "@/components/shared/RiskBadge";
import { RouteState } from "@/components/shared/RouteState";
import { useIncident } from "@/lib/hooks/use-incidents";
import { useAssets } from "@/lib/hooks/use-assets";
import { acceptRecommendation, createAetherTicket } from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";

function aetherMessage(status?: string | null) {
  if (status === "synced") return "Aether ticket synced";
  if (status === "disabled") return "Aether integration disabled; local pending ticket recorded";
  if (status === "pending") return "Aether ticket pending sync";
  if (status === "error") return "Aether ticket sync failed";
  return "No Aether ticket created";
}

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
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      toast.success("Aether ticket created successfully");
    },
    onError: () => {
      setAetherStatus("error");
      toast.error("Failed to create Aether ticket");
    },
  });

  const recommendationMutation = useMutation({
    mutationFn: (recommendationId: number) => acceptRecommendation(incidentId, recommendationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incident", incidentId] });
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      toast.success("Recommendation accepted");
    },
    onError: () => {
      toast.error("Failed to accept recommendation");
    },
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
  const currentAetherStatus = aetherStatus || incident.aether_sync_status;
  const hasAetherTicket = Boolean(incident.aether_ticket_id || currentAetherStatus);

  return (
    <AppShell>
      <div className="page-head">
        <div style={{ minWidth: 0 }}>
          <div className="eyebrow">Incident Workbench</div>
          <h1>{incident.title}</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            <span className="mono muted">{incident.incident_uid}</span>
            <button
              className="btn"
              style={{ padding: "0 6px", minHeight: 24, fontSize: 11 }}
              onClick={() => {
                navigator.clipboard.writeText(incident.incident_uid || "");
                toast.success("Incident UID copied");
              }}
              title="Copy incident UID"
            >
              <Copy size={12} />
            </button>
          </div>
          <div className="filters" style={{ marginTop: 10, flexWrap: "wrap", gap: 8 }}>
            <RiskBadge level={incident.severity} score={incident.risk_score} />
            <span className="chip">{incident.status}</span>
            <span className="chip">{incident.confidence_score}% confidence</span>
          </div>
        </div>
        <div className="filters" style={{ flexWrap: "wrap", gap: 8 }}>
          <button className="btn" onClick={() => aetherMutation.mutate()} disabled={aetherMutation.isPending || hasAetherTicket}>
            <Ticket size={15} /> {aetherMutation.isPending ? "Creating..." : hasAetherTicket ? "Aether Ticket Recorded" : "Create Aether Ticket"}
          </button>
        </div>
      </div>

      {currentAetherStatus ? (
        <div className={`panel aether-status ${currentAetherStatus === 'error' ? 'aether-error' : currentAetherStatus === 'disabled' ? 'aether-disabled' : 'aether-ok'}`}>
          <span className={currentAetherStatus === "error" ? "risk-critical" : "risk-low"}>
            {aetherMessage(currentAetherStatus)}
          </span>
          {incident.aether_ticket_id ? (
            <span className="chip mono" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              {incident.aether_ticket_id}
              <button
                className="btn"
                style={{ padding: "0 4px", minHeight: 20, fontSize: 10 }}
                onClick={() => {
                  navigator.clipboard.writeText(incident.aether_ticket_id || "");
                  toast.success("Ticket ID copied");
                }}
                title="Copy ticket ID"
              >
                <Copy size={10} />
              </button>
            </span>
          ) : null}
          {incident.aether_ticket_url ? (
            <a className="btn" href={incident.aether_ticket_url} target="_blank" rel="noreferrer">
              Open in Aether <ExternalLink size={14} />
            </a>
          ) : null}
        </div>
      ) : null}

      <div className="split">
        <section className="panel">
          <div className="eyebrow">Evidence Timeline</div>
          <div style={{ marginTop: 16 }}>
            {(incident.timeline || []).map((item: any) => (
              <div className="timeline-item" key={`${item.time}-${item.event}`} style={{ overflowWrap: "break-word" }}>
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
            <p className="muted" style={{ marginTop: 10, overflowWrap: "break-word" }}>{incident.summary}</p>
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
              <p className="muted" style={{ marginTop: 8, overflowWrap: "break-word" }} key={note}>
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
                <div className="card" style={{ padding: 14, overflow: "hidden" }} key={rec.id}>
                  <span className="chip">Rank {rec.rank}</span>
                  <h2 style={{ marginTop: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{rec.action_label}</h2>
                  <p
                    className="muted"
                    style={{
                      marginTop: 8,
                      fontSize: 12,
                      overflow: "hidden",
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    {rec.rationale}
                  </p>
                  <p style={{ marginTop: 8, fontSize: 12, overflowWrap: "break-word" }}>
                    <strong>Benefit:</strong> <span className="muted">{rec.expected_benefit}</span>
                  </p>
                  <div className="filters" style={{ marginTop: 12, flexWrap: "wrap", gap: 8 }}>
                    <span className="chip">{rec.confidence}% confidence</span>
                    {rec.requires_approval ? <span className="chip">Approval required</span> : null}
                  </div>
                  <button
                    className="btn primary"
                    style={{ marginTop: 12, width: "100%" }}
                    disabled={rec.status === "accepted" || recommendationMutation.isPending}
                    onClick={() => recommendationMutation.mutate(rec.id)}
                  >
                    <CheckCircle2 size={15} />
                    {rec.status === "accepted" ? "Accepted" : recommendationMutation.isPending ? "Accepting..." : "Accept recommendation"}
                  </button>
                </div>
              ))}
            </div>
          </section>
          <section className="panel">
            <div className="eyebrow">Audit Trail</div>
            <p className="muted" style={{ marginTop: 8, fontSize: 12, overflowWrap: "break-word" }}>
              Decision writeback preserved: score, evidence, recommendation rank, analyst action, and resolution state.
            </p>
          </section>
        </aside>
      </div>
    </AppShell>
  );
}
