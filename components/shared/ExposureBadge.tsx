"use client";

import { ShieldAlert, ShieldX, ShieldCheck, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

const severityConfig = {
  critical: { color: "#ef4444", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.3)", icon: ShieldX },
  high: { color: "#f97316", bg: "rgba(249,115,22,0.12)", border: "rgba(249,115,22,0.3)", icon: ShieldAlert },
  medium: { color: "#eab308", bg: "rgba(234,179,8,0.12)", border: "rgba(234,179,8,0.3)", icon: AlertTriangle },
  low: { color: "#22c55e", bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.3)", icon: ShieldCheck },
};

export function ExposureBadge({ severity, count }: { severity: string; count?: number }) {
  const config = severityConfig[severity as keyof typeof severityConfig] || severityConfig.low;
  const Icon = config.icon;

  return (
    <motion.span
      className="exposure-badge"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        borderRadius: 6,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        color: config.color,
        background: config.bg,
        border: `1px solid ${config.border}`,
        backdropFilter: "blur(8px)",
      }}
    >
      <Icon size={10} />
      {severity}
      {typeof count === "number" ? ` · ${count}` : null}
    </motion.span>
  );
}

export function ExposureBadgeStack({ findings }: { findings: { severity: string }[] }) {
  const counts = findings.reduce((acc, f) => {
    acc[f.severity] = (acc[f.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const ordered = ["critical", "high", "medium", "low"].filter((s) => counts[s]);

  return (
    <span className="exposure-badge-stack" style={{ display: "inline-flex", gap: 4, flexWrap: "wrap" }}>
      {ordered.map((severity) => (
        <ExposureBadge key={severity} severity={severity} count={counts[severity]} />
      ))}
    </span>
  );
}
