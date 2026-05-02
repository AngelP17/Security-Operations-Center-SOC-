"use client";

import { useState, useRef } from "react";
import { useParams } from "next/navigation";
import { ChevronDown, ChevronRight, Clock, Activity, FileText, Globe, Zap, ArrowRight } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { RouteState } from "@/components/shared/RouteState";
import { useAssetReplay, useIncidentReplay } from "@/lib/hooks/use-replay";
import type { ReplayStep } from "@/lib/types";

gsap.registerPlugin(ScrollTrigger);

const stepIconMap: Record<string, React.ComponentType<{ size?: number | string; color?: string }>> = {
  network: Globe,
  file: FileText,
  process: Zap,
  scan: Activity,
  correlation: Activity,
  risk: Zap,
};

function StepIcon({ eventType }: { eventType: string }) {
  const key = Object.keys(stepIconMap).find((k) => eventType.toLowerCase().includes(k));
  const Icon = key ? stepIconMap[key] : Activity;
  return <Icon size={14} color="var(--amber)" />;
}

export default function ReplayPage() {
  const params = useParams();
  const entityId = params.entityId as string;
  const [open, setOpen] = useState<string | null>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  const assetId = entityId.startsWith("asset-") ? Number(entityId.replace("asset-", "")) : undefined;
  const incidentId = entityId.startsWith("inc-") ? Number(entityId.replace("inc-", "")) : undefined;

  const assetReplay = useAssetReplay(assetId);
  const incidentReplay = useIncidentReplay(incidentId);

  const loading = assetReplay.isLoading || incidentReplay.isLoading;
  const error = assetReplay.error || incidentReplay.error;

  let steps: ReplayStep[] = [];
  let entityType = "unknown";
  let entityTitle = entityId;

  if (assetReplay.data?.steps) {
    steps = assetReplay.data.steps;
    entityType = "asset";
    entityTitle = `Asset ${entityId.replace("asset-", "")}`;
  } else if (incidentReplay.data?.steps) {
    steps = incidentReplay.data.steps;
    entityType = "incident";
    entityTitle = `Incident ${entityId.replace("inc-", "")}`;
  }

  useGSAP(() => {
    const ctx = gsap.context(() => {
      gsap.from(".replay-hero > *", {
        y: 36,
        opacity: 0,
        duration: 0.9,
        stagger: 0.1,
        ease: "power3.out",
      });

      gsap.from(".replay-timeline-item", {
        x: 24,
        opacity: 0,
        duration: 0.6,
        stagger: 0.08,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ".replay-timeline",
          start: "top 85%",
        },
      });
    }, pageRef);
    return () => ctx.revert();
  }, { scope: pageRef });

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
        <RouteState
          type="error"
          title="Replay unavailable"
          message="The audit replay service could not retrieve the decision trail."
          actionLabel="Retry"
          onAction={() => window.location.reload()}
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div ref={pageRef} className="replay-page overflow-x-hidden w-full max-w-full">
        <section className="replay-hero">
          <div className="replay-copy">
            <div className="eyebrow">Audit replay</div>
            <h1>
              Explainability{" "}
              <span className="inline-photo inline-photo-signal" aria-hidden="true" />
              {" "}
              trail for <span className="mono">{entityTitle}</span>
            </h1>
            <p>
              Replay proves how an observation became an asset, a risk decision, a correlated incident,
              and a recommendation. Every step carries actor attribution, timestamp evidence, and payload context.
            </p>
          </div>
          <div className="replay-overview">
            <article>
              <span>Entity type</span>
              <strong>{entityType}</strong>
              <small>Replay subject</small>
            </article>
            <article>
              <span>Trail length</span>
              <strong>{steps.length}</strong>
              <small>Recorded decision steps</small>
            </article>
            <article>
              <span>First actor</span>
              <strong>{steps[0]?.actor_type || "—"}</strong>
              <small>Initial observation source</small>
            </article>
            <article>
              <span>Last event</span>
              <strong>{steps[steps.length - 1]?.event_type || "—"}</strong>
              <small>Most recent decision</small>
            </article>
          </div>
        </section>

        <section className="replay-timeline">
          {steps.length === 0 ? (
            <RouteState
              type="empty"
              title="No replay steps recorded"
              message="Audit records will be generated after scans and risk decisions are processed. Run a discovery scan to begin."
            />
          ) : (
            <div className="replay-timeline-list">
              {steps.map((step, index) => {
                const key = `${step.timestamp}-${step.event_type}-${index}`;
                const expanded = open === key;
                return (
                  <div className={`replay-timeline-item ${expanded ? "expanded" : ""}`} key={key}>
                    <button
                      type="button"
                      className="replay-timeline-trigger"
                      onClick={() => setOpen(expanded ? null : key)}
                    >
                      <span className="replay-timeline-marker">
                        <StepIcon eventType={step.event_type} />
                      </span>
                      <span className="replay-timeline-time">
                        <Clock size={12} />
                        <span className="mono">{new Date(step.timestamp).toLocaleTimeString()}</span>
                      </span>
                      <span className="replay-timeline-event">{step.event_type}</span>
                      <span className="replay-timeline-actor">
                        <span className="chip" style={{ fontSize: 10 }}>{step.actor_type}</span>
                      </span>
                      <span className="replay-timeline-chevron">
                        {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                      </span>
                    </button>

                    <div className="replay-timeline-body">
                      <p className="replay-timeline-desc">{step.description}</p>
                      <div className="replay-timeline-meta">
                        <span className="chip" style={{ fontSize: 10 }}>{step.entity_type} #{step.entity_id}</span>
                        {step.actor_id ? <span className="chip" style={{ fontSize: 10 }}>Actor {step.actor_id}</span> : null}
                      </div>
                      {expanded ? (
                        <pre className="replay-timeline-payload mono">{JSON.stringify(step.payload, null, 2)}</pre>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="command-action" style={{ borderTop: "1px solid rgba(244,241,234,0.08)", marginTop: 40, padding: "clamp(56px, 8vw, 112px) 0" }}>
          <div>
            <div className="eyebrow">Continue investigation</div>
            <h2>Replay is only useful when it connects to the current operational picture.</h2>
            <p style={{ maxWidth: 600, marginTop: 16, color: "rgba(244,241,234,0.68)", lineHeight: 1.6 }}>
              Return to the command center to see how this trail fits into the active response lane, or open the incident workbench to act on the recommendations that emerged from these steps.
            </p>
            <div className="hero-actions" style={{ marginTop: 28 }}>
              <Link href="/command" className="taste-btn taste-btn-primary">
                Return to command
                <ArrowRight size={17} />
              </Link>
              <Link href="/incidents" className="taste-btn">
                Open incident workbench
                <Activity size={17} />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
