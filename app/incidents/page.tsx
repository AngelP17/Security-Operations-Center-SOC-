"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { AppShell } from "@/components/layout/AppShell";
import { RiskBadge } from "@/components/shared/RiskBadge";
import { RouteState } from "@/components/shared/RouteState";
import { useIncidents } from "@/lib/hooks/use-incidents";
import type { Incident } from "@/lib/types";

export default function IncidentsPage() {
  const { data, isLoading, error } = useIncidents();

  if (isLoading) {
    return (
      <AppShell>
        <RouteState type="loading" title="Loading incidents..." />
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <RouteState type="error" title="Failed to load incidents" message="API connection failed." />
      </AppShell>
    );
  }

  const incidents: Incident[] = data?.items || [];

  return (
    <AppShell>
      <div className="page-head">
        <div>
          <div className="eyebrow">Correlated Security Incidents</div>
          <h1>Centralized case workflow</h1>
        </div>
      </div>
      {incidents.length === 0 ? (
        <RouteState type="empty" title="No incidents recorded" message="Run a scan to generate correlated incidents from asset observations and risk decisions." />
      ) : (
        <div className="grid">
          {incidents.map((incident, i) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              key={incident.id}
            >
              <Link
                className="panel"
                style={{ display: "block", textDecoration: "none", overflow: "hidden" }}
                href={`/incidents/${incident.id}`}
              >
                <div className="page-head" style={{ marginBottom: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <span className="mono muted">{incident.incident_uid}</span>
                    <h2 style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
                  }}
                >
                  {incident.summary}
                </p>
                <div className="filters" style={{ marginTop: 12, flexWrap: "wrap", gap: 8 }}>
                  <span className="chip">{incident.status}</span>
                  <span className="chip">{incident.confidence_score}% confidence</span>
                  <span className="chip">{(incident.affected_assets || []).length} affected assets</span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
