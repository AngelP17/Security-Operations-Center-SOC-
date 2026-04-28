"use client";

import { AlertTriangle, SearchX, Play, Network, TicketCheck } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

export function RouteState({
  type,
  title,
  message,
  actionLabel,
  onAction,
  skeletonLayout,
}: {
  type: "loading" | "empty" | "error";
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  skeletonLayout?: "table" | "cards" | "chart" | "events" | "topology";
}) {
  const Icon = type === "error" ? AlertTriangle : SearchX;
  const chartBars = [36, 52, 68, 44, 74, 58];

  if (type === "loading" && skeletonLayout) {
    return (
      <div className="command-surface route-state-shell route-state-loading" style={{ minWidth: 0, overflow: "hidden" }}>
        <div className="route-state-inner">
          <div className="route-state-head">
            <div>
              <span className="route-state-kicker">System state</span>
              <div className="skeleton skeleton-title" style={{ marginTop: 10, width: 220 }} />
            </div>
            <div className="route-state-orbit" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </div>
          {skeletonLayout === "table" && (
            <div className="route-state-table-skeleton">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="table-skeleton-row">
                  <div className="skeleton" style={{ width: "60%" }} />
                  <div className="skeleton" style={{ width: "80%" }} />
                  <div className="skeleton" style={{ width: "70%" }} />
                  <div className="skeleton" style={{ width: "90%" }} />
                  <div className="skeleton" style={{ width: "50%" }} />
                </div>
              ))}
            </div>
          )}
          {skeletonLayout === "cards" && (
            <div className="route-state-card-grid">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="route-state-card">
                  <div className="skeleton skeleton-title" style={{ width: "40%", marginBottom: 12 }} />
                  <div className="skeleton" style={{ width: "90%", height: 10, marginBottom: 8 }} />
                  <div className="skeleton" style={{ width: "70%", height: 10 }} />
                </div>
              ))}
            </div>
          )}
          {skeletonLayout === "chart" && (
            <div className="route-state-chart-skeleton">
              {chartBars.map((height, i) => (
                <div key={i} className="skeleton route-state-chart-bar" style={{ height: `${height}%` }} />
              ))}
            </div>
          )}
          {skeletonLayout === "events" && (
            <div className="route-state-event-skeleton">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "80px 1fr 120px", gap: 12, alignItems: "center", padding: "10px 0" }}>
                  <div className="skeleton" style={{ height: 10 }} />
                  <div className="skeleton" style={{ height: 10, width: "80%" }} />
                  <div className="skeleton" style={{ height: 10, width: "60%" }} />
                </div>
              ))}
            </div>
          )}
          {skeletonLayout === "topology" && (
            <div className="route-state-topology-skeleton">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="skeleton route-state-topology-node" />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="command-surface route-state-shell"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      style={{ minWidth: 0, overflow: "hidden" }}
    >
      <div className="route-state-inner route-state-empty">
        <div className="route-state-head">
          <div>
            <span className="route-state-kicker">{type === "error" ? "Attention required" : "No active result"}</span>
            <h3>{title}</h3>
          </div>
          {type === "loading" ? (
            <div className="skeleton" style={{ width: 56, height: 56, borderRadius: 18 }} />
          ) : (
            <div className="empty-state-icon">
              <Icon size={28} />
            </div>
          )}
        </div>
        <div className="route-state-copy">
          {message ? <p>{message}</p> : null}
          <div className="route-state-guidance">
            <span>Routes stay usable even when data is thin.</span>
            <span>Empty, loading, and error states should still feel designed.</span>
          </div>
        </div>
        {actionLabel && onAction ? (
          <button className="btn primary" onClick={onAction}>
            {actionLabel}
          </button>
        ) : null}
        {type === "empty" && !actionLabel && (
          <div className="route-state-links">
            <Link href="/command" className="btn primary" style={{ textDecoration: "none" }}>
              <Play size={14} /> Run scan
            </Link>
            <Link href="/topology" className="btn" style={{ textDecoration: "none" }}>
              <Network size={14} /> Inspect topology
            </Link>
            <Link href="/incidents" className="btn" style={{ textDecoration: "none" }}>
              <TicketCheck size={14} /> Review incidents
            </Link>
          </div>
        )}
      </div>
    </motion.div>
  );
}
