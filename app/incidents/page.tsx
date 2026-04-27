"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { AppShell } from "@/components/layout/AppShell";
import { RiskBadge } from "@/components/shared/RiskBadge";
import { RouteState } from "@/components/shared/RouteState";
import { useIncidents } from "@/lib/hooks/use-incidents";
import { withDemoData, demoIncidents } from "@/lib/demo";
import type { Incident } from "@/lib/types";

export default function IncidentsPage() {
  const { data, isLoading, error } = useIncidents();

  if (isLoading) {
    return (
      <AppShell>
        <RouteState type="loading" skeletonLayout="cards" title="Loading incidents..." />
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <RouteState type="error" title="Failed to load incidents" message="API connection failed." actionLabel="Retry" onAction={() => window.location.reload()} />
      </AppShell>
    );
  }

  const incidents: Incident[] = withDemoData(data?.items, demoIncidents);

  return (
    <AppShell>
      <div className="page-head">
        <div>
          <div className="eyebrow">Correlated Security Incidents</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em" }}>Centralized case workflow</h1>
        </div>
      </div>
      {incidents.length === 0 ? (
        <RouteState type="empty" title="No incidents recorded" message="Run a scan to generate correlated incidents from asset observations and risk decisions." />
      ) : (
        <div className="grid" style={{ gap: 12 }}>
          {incidents.map((incident, i) => (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              key={incident.id}
            >
              <Link
                className="command-surface"
                style={{ display: "block", textDecoration: "none", overflow: "hidden" }}
                href={`/incidents/${incident.id}`}
              >
                <div style={{ padding: 18, display: "grid", gap: 10 }}>
                  <div className="page-head" style={{ marginBottom: 0 }}>
                    <div style={{ minWidth: 0 }}>
                      <span className="mono muted" style={{ fontSize: 11 }}>{incident.incident_uid}</span>
                      <h2 style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 15, fontWeight: 700, marginTop: 2 }}>
                        {incident.title}
                      </h2>
                    </div>
                    <RiskBadge level={incident.severity} score={incident.risk_score} />
                  </div>
                  <p
                    className="muted"
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      fontSize: 13,
                      lineHeight: 1.5,
                    }}
                  >
                    {incident.summary}
                  </p>
                  <div className="filters" style={{ flexWrap: "wrap", gap: 8 }}>
                    <span className="chip">{incident.status}</span>
                    <span className="chip">{incident.confidence_score}% confidence</span>
                    <span className="chip">{(incident.affected_assets || []).length} affected assets</span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
