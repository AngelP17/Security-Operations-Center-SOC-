"use client";

import { useState, useRef } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, Copy, ExternalLink, MessageSquare, Ticket, ArrowRight, Activity } from "lucide-react";
import { toast } from "sonner";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { RiskBadge } from "@/components/shared/RiskBadge";
import { RouteState } from "@/components/shared/RouteState";
import { useIncident } from "@/lib/hooks/use-incidents";
import { useAssets } from "@/lib/hooks/use-assets";
import { acceptRecommendation, createAetherTicket, rejectRecommendation } from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Asset, Incident, TimelineItem, RecommendationItem } from "@/lib/types";

gsap.registerPlugin(ScrollTrigger);

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
  const pageRef = useRef<HTMLDivElement>(null);

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
  const rejectMutation = useMutation({
    mutationFn: ({ recommendationId, reason }: { recommendationId: number; reason: string }) =>
      rejectRecommendation(incidentId, recommendationId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incident", incidentId] });
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      toast.success("Recommendation rejected");
    },
    onError: () => {
      toast.error("Failed to reject recommendation");
    },
  });

  useGSAP(() => {
    const ctx = gsap.context(() => {
      gsap.from(".incident-hero > *", {
        y: 36,
        opacity: 0,
        duration: 0.9,
        stagger: 0.1,
        ease: "power3.out",
      });

      gsap.from(".incident-panel", {
        y: 50,
        opacity: 0,
        scale: 0.97,
        duration: 0.8,
        stagger: 0.1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ".incident-body",
          start: "top 80%",
        },
      });
    }, pageRef);
    return () => ctx.revert();
  }, { scope: pageRef });

  if (isLoading) {
    return (
      <AppShell>
        <RouteState type="loading" skeletonLayout="cards" title="Loading incident..." />
      </AppShell>
    );
  }

  if (error || !incident) {
    return (
      <AppShell>
        <RouteState
          type="error"
          title="Incident not found"
          message="Failed to load incident from API. The incident may have been removed or the API is unreachable."
          actionLabel="Retry"
          onAction={() => window.location.reload()}
        />
      </AppShell>
    );
  }

  const allAssets: Asset[] = assetsData?.items || [];
  const affected: Asset[] = (incident.affected_assets || [])
    .map((name: string) => allAssets.find((a: Asset) => a.hostname === name || a.asset_uid === name))
    .filter((a: Asset | undefined): a is Asset => Boolean(a));
  const currentAetherStatus = aetherStatus || incident.aether_sync_status;
  const hasDurableAetherTicket = Boolean(
    incident.aether_ticket_id ||
    currentAetherStatus === "synced" ||
    currentAetherStatus === "pending" ||
    currentAetherStatus === "disabled"
  );

  const timeline: TimelineItem[] = incident.timeline || [];
  const recommendations: RecommendationItem[] = incident.recommendations || [];
  const notes: string[] = incident.notes || [];
  const decisionTrace = incident.decision_trace || [];

  return (
    <AppShell>
      <div ref={pageRef} className="incident-detail-page">
        <section className="incident-hero">
          <div style={{ minWidth: 0 }}>
            <div className="eyebrow">Incident Workbench</div>
            <h1 style={{ fontSize: "clamp(1.7rem, 3.4vw, 2.8rem)", fontWeight: 800, letterSpacing: "-0.03em", textWrap: "balance", marginTop: 8, maxWidth: "22ch", lineHeight: 1.05 }}>
              {incident.title}{" "}
              <span className="inline-photo inline-photo-signal" aria-hidden="true" />
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
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
            <div className="filters" style={{ marginTop: 12, flexWrap: "wrap", gap: 8 }}>
              <RiskBadge level={incident.severity} score={incident.risk_score} />
              <span className="chip">{incident.status}</span>
              <span className="chip">{incident.confidence_score}% confidence</span>
              <span className="chip">{incident.category}</span>
            </div>
          </div>
          <div className="filters" style={{ flexWrap: "wrap", gap: 8 }}>
            <button
              className="btn primary"
              onClick={() => aetherMutation.mutate()}
              disabled={aetherMutation.isPending || hasDurableAetherTicket}
            >
              <Ticket size={15} />
              {aetherMutation.isPending ? "Creating..." : hasDurableAetherTicket ? "Aether Ticket Recorded" : "Create Aether Ticket"}
            </button>
          </div>
        </section>

        {currentAetherStatus ? (
          <div
            className={`command-surface aether-status ${
              currentAetherStatus === "error"
                ? "aether-error"
                : currentAetherStatus === "disabled"
                ? "aether-disabled"
                : "aether-ok"
            }`}
            style={{ marginBottom: 14 }}
          >
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

        <div className="incident-body split">
          <section className="command-surface incident-panel">
            <div style={{ padding: 16 }}>
              <div className="eyebrow">Evidence Timeline</div>
              <div style={{ marginTop: 16 }}>
                {timeline.map((item) => (
                  <div className="timeline-item" key={`${item.time}-${item.event}`} style={{ overflowWrap: "break-word" }}>
                    <span className="mono muted">{item.time} · {item.actor}</span>
                    <h2 style={{ marginTop: 4, fontSize: 14, fontWeight: 700 }}>{item.event}</h2>
                    <p className="muted" style={{ fontSize: 12 }}>{item.summary}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="grid" style={{ gap: 14 }}>
            <div className="command-surface incident-panel">
              <div style={{ padding: 16 }}>
                <div className="eyebrow">Incident Summary</div>
                <p className="muted" style={{ marginTop: 10, overflowWrap: "break-word", fontSize: 13, lineHeight: 1.55 }}>
                  {incident.summary}
                </p>
              </div>
            </div>
            <div className="command-surface incident-panel">
              <div style={{ padding: 16 }}>
                <div className="eyebrow">Affected Assets</div>
                <div className="metric-list" style={{ marginTop: 12 }}>
                  {affected.map((asset) => (
                    <div className="metric-row" key={asset.id}>
                      <span>
                        {asset.hostname}
                        <br />
                        <span className="mono muted">{asset.ip_address}</span>
                      </span>
                      <RiskBadge level={asset.risk_level || "low"} score={asset.risk_score || 0} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="command-surface incident-panel">
              <div style={{ padding: 16 }}>
                <div className="eyebrow">Risk Decision</div>
                <h2 style={{ marginTop: 8, fontSize: 15, fontWeight: 700 }}>
                  Risk score: <span className="mono">{incident.risk_score}</span>{" "}
                  {incident.severity}
                </h2>
                <div className="grid" style={{ marginTop: 12, gap: 10 }}>
                  {decisionTrace.map((item: { label?: string; value?: number }, index: number) => (
                    <div key={`${item.label || "trace"}-${index}`} className="command-surface" style={{ padding: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                        <strong>Asset {item.label || "unknown"}</strong>
                        <RiskBadge level={incident.severity} score={item.value || incident.risk_score} />
                      </div>
                      <p className="muted" style={{ marginTop: 8, fontSize: 12, lineHeight: 1.5 }}>
                        Confidence {item.value || incident.confidence_score}%
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="command-surface incident-panel">
              <div style={{ padding: 16 }}>
                <div className="eyebrow">Analyst Notes</div>
                {notes.map((note) => (
                  <p className="muted" style={{ marginTop: 8, overflowWrap: "break-word", fontSize: 12, lineHeight: 1.5 }} key={note}>
                    <MessageSquare size={13} style={{ display: "inline", marginRight: 6 }} />
                    {note}
                  </p>
                ))}
              </div>
            </div>
          </section>

          <aside className="right-rail">
            <section className="command-surface incident-panel">
              <div style={{ padding: 16 }}>
                <div className="eyebrow">Recommendation Stack</div>
                <div className="grid" style={{ marginTop: 12, gap: 10 }}>
                  {recommendations.map((rec) => (
                    <div className="command-surface" style={{ padding: 14, overflow: "hidden" }} key={rec.id}>
                      <span className="chip" style={{ fontSize: 10 }}>Rank {rec.rank}</span>
                      <h2
                        style={{
                          marginTop: 10,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          fontSize: 14,
                          fontWeight: 700,
                        }}
                      >
                        {rec.action_label}
                      </h2>
                      <p
                        className="muted"
                        style={{
                          marginTop: 8,
                          fontSize: 12,
                          overflow: "hidden",
                          display: "-webkit-box",
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: "vertical",
                          lineHeight: 1.5,
                        }}
                      >
                        {rec.rationale}
                      </p>
                      <p style={{ marginTop: 8, fontSize: 12, overflowWrap: "break-word" }}>
                        <strong>Benefit:</strong>{" "}
                        <span className="muted">{rec.expected_benefit}</span>
                      </p>
                      <div className="filters" style={{ marginTop: 12, flexWrap: "wrap", gap: 8 }}>
                        <span className="chip" style={{ fontSize: 10 }}>{rec.confidence}% confidence</span>
                        {rec.requires_approval ? <span className="chip" style={{ fontSize: 10 }}>Approval required</span> : null}
                      </div>
                      <button
                        className="btn primary"
                        style={{ marginTop: 12, width: "100%" }}
                        disabled={rec.status === "accepted" || recommendationMutation.isPending || rejectMutation.isPending}
                        onClick={() => recommendationMutation.mutate(rec.id)}
                      >
                        <CheckCircle2 size={15} />
                        {rec.status === "accepted" ? "Accepted" : recommendationMutation.isPending ? "Accepting..." : "Accept recommendation"}
                      </button>
                      {rec.status !== "accepted" ? (
                        <button
                          className="btn"
                          style={{ marginTop: 8, width: "100%" }}
                          disabled={recommendationMutation.isPending || rejectMutation.isPending}
                          onClick={() => {
                            const reason = window.prompt("Reason for rejecting this recommendation");
                            if (!reason) return;
                            rejectMutation.mutate({ recommendationId: rec.id, reason });
                          }}
                        >
                          {rejectMutation.isPending ? "Rejecting..." : "Reject recommendation"}
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </section>
            <section className="command-surface incident-panel">
              <div style={{ padding: 16 }}>
                <div className="eyebrow">Audit Trail</div>
                <p className="muted" style={{ marginTop: 8, fontSize: 12, overflowWrap: "break-word", lineHeight: 1.5 }}>
                  Decision writeback preserved: score, evidence, recommendation rank, analyst action, and resolution state.
                </p>
                <Link
                  href={`/replay/inc-${incident.id}`}
                  className="btn"
                  style={{ marginTop: 12, width: "100%", justifyContent: "center" }}
                >
                  View full replay trail <ArrowRight size={14} />
                </Link>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
