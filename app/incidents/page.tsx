"use client";

import { useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { AppShell } from "@/components/layout/AppShell";
import { RiskBadge } from "@/components/shared/RiskBadge";
import { RouteState } from "@/components/shared/RouteState";
import { useIncidents } from "@/lib/hooks/use-incidents";
import type { Incident, RiskLevel } from "@/lib/types";

gsap.registerPlugin(ScrollTrigger);

const severityOrder: RiskLevel[] = ["critical", "high", "medium", "low"];

function isOpenIncident(incident: Incident) {
  return !["closed", "resolved"].includes((incident.status || "").toLowerCase());
}

export default function IncidentsPage() {
  const pageRef = useRef<HTMLDivElement>(null);
  const { data, isLoading, error } = useIncidents();

  useGSAP(() => {
    const ctx = gsap.context(() => {
      gsap.from(".incident-board-hero > *", {
        y: 40,
        opacity: 0,
        duration: 0.9,
        stagger: 0.1,
        ease: "power3.out",
      });

      gsap.from(".incident-board-brief > *", {
        x: -30,
        opacity: 0,
        duration: 0.8,
        stagger: 0.12,
        ease: "power3.out",
        delay: 0.2,
      });

      gsap.from(".incident-lane", {
        y: 60,
        opacity: 0,
        scale: 0.97,
        duration: 0.85,
        stagger: 0.14,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ".incident-board-main",
          start: "top 85%",
        },
      });

      gsap.from(".incident-card", {
        y: 30,
        opacity: 0,
        duration: 0.6,
        stagger: 0.06,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ".incident-lane-cards",
          start: "top 88%",
        },
      });
    }, pageRef);
    return () => ctx.revert();
  }, { scope: pageRef });

  if (isLoading) {
    return (
      <AppShell>
        <RouteState type="loading" skeletonLayout="cards" title="Loading incident board..." />
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <RouteState
          type="error"
          title="Failed to load incident board"
          message="The API could not return the current incident ledger."
          actionLabel="Retry"
          onAction={() => window.location.reload()}
        />
      </AppShell>
    );
  }

  const incidents: Incident[] = data?.items || [];
  const openIncidents = incidents.filter(isOpenIncident);
  const resolvedIncidents = incidents.length - openIncidents.length;
  const leadIncident = [...openIncidents].sort((a, b) => b.risk_score - a.risk_score)[0] || incidents[0];
  const lanes = severityOrder
    .map((severity) => ({
      severity,
      items: incidents.filter((incident) => incident.severity === severity),
    }))
    .filter((lane) => lane.items.length > 0);

  return (
    <AppShell>
      <div ref={pageRef} className="incident-board-page overflow-x-hidden w-full max-w-full">
        <section className="incident-board-hero">
          <div className="incident-board-copy">
            <div className="eyebrow">Incident board</div>
            <h1>
              Escalation should feel like a{" "}
              <span className="inline-photo inline-photo-signal" aria-hidden="true" />
              {" "}
              response theater, not a pile of disconnected alert cards.
            </h1>
            <p>
              This route keeps severity, confidence, affected systems, and Aether readiness visible in the same frame so a
              responder can move from triage to handoff without rebuilding the story.
            </p>
          </div>

          <div className="incident-board-overview">
            <article>
              <span>Open incidents</span>
              <strong>{openIncidents.length}</strong>
              <small>Active response lanes</small>
            </article>
            <article>
              <span>Resolved</span>
              <strong>{resolvedIncidents}</strong>
              <small>Closed or resolved cases</small>
            </article>
            <article>
              <span>Lead severity</span>
              <strong>{leadIncident?.severity || "none"}</strong>
              <small>Highest current pressure</small>
            </article>
            <article>
              <span>Affected assets</span>
              <strong>{incidents.reduce((sum, incident) => sum + incident.affected_assets.length, 0)}</strong>
              <small>Total named impact objects</small>
            </article>
          </div>
        </section>

        {incidents.length === 0 ? (
          <RouteState
            type="empty"
            title="No incidents recorded"
            message="Run a scan to generate correlated incident records from asset observations and risk decisions."
          />
        ) : (
          <div className="incident-board-shell">
            <aside className="incident-board-brief">
              <section className="command-surface incident-board-panel">
                <div className="eyebrow">Lead case</div>
                {leadIncident ? (
                  <Link href={`/incidents/${leadIncident.id}`} className="incident-lead-card">
                    <div className="incident-lead-head">
                      <div>
                        <span className="mono">{leadIncident.incident_uid}</span>
                        <h2>{leadIncident.title}</h2>
                      </div>
                      <RiskBadge level={leadIncident.severity} score={leadIncident.risk_score} />
                    </div>
                    <p>{leadIncident.summary}</p>
                    <div className="incident-lead-meta">
                      <span>{leadIncident.status}</span>
                      <span>{leadIncident.confidence_score}% confidence</span>
                      <span>{leadIncident.affected_assets.length} assets</span>
                      <span>{leadIncident.aether_sync_status || "Local Aether record"}</span>
                    </div>
                  </Link>
                ) : (
                  <p className="muted">Run a safe scan to promote the highest-risk case into this lead lane.</p>
                )}
              </section>

              <section className="command-surface incident-board-panel">
                <div className="eyebrow">Board posture</div>
                <div className="incident-posture-list">
                  {severityOrder.map((severity) => (
                    <div key={severity} className="incident-posture-row">
                      <strong>{severity}</strong>
                      <span>{incidents.filter((incident) => incident.severity === severity).length} incidents</span>
                    </div>
                  ))}
                </div>
              </section>
            </aside>

            <section className="incident-board-main">
              {lanes.map((lane) => (
                <section key={lane.severity} className={`incident-lane incident-lane-${lane.severity}`}>
                  <div className="incident-lane-head">
                    <div>
                      <span className="eyebrow">{lane.severity} lane</span>
                      <h3>{lane.items.length} incident{lane.items.length === 1 ? "" : "s"} in this severity band</h3>
                    </div>
                  </div>

                  <div className="incident-lane-cards">
                    {lane.items.map((incident) => (
                      <div key={incident.id}>
                        <Link className="incident-card" href={`/incidents/${incident.id}`}>
                          <div className="incident-card-head">
                            <div>
                              <span className="mono">{incident.incident_uid}</span>
                              <h4>{incident.title}</h4>
                            </div>
                            <RiskBadge level={incident.severity} score={incident.risk_score} />
                          </div>
                          <p>{incident.summary}</p>
                          <div className="incident-card-meta">
                            <span>{incident.status}</span>
                            <span>{incident.category}</span>
                            <span>{incident.confidence_score}% confidence</span>
                            <span>{incident.recommendations.length} recommendations</span>
                          </div>
                          <div className="incident-card-footer">
                            <strong>{incident.affected_assets.length} affected asset{incident.affected_assets.length === 1 ? "" : "s"}</strong>
                            <small>{incident.aether_sync_status || "Local Aether record"}</small>
                          </div>
                        </Link>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </section>
          </div>
        )}
      </div>
    </AppShell>
  );
}
