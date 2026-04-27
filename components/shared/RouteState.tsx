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

  if (type === "loading" && skeletonLayout) {
    return (
      <div className="command-surface" style={{ minWidth: 0, overflow: "hidden" }}>
        <div style={{ padding: 16 }}>
          <div className="skeleton skeleton-title" style={{ marginBottom: 16 }} />
          {skeletonLayout === "table" && (
            <div style={{ display: "grid", gap: 2 }}>
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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="command-surface" style={{ minHeight: 140, padding: 16 }}>
                  <div className="skeleton skeleton-title" style={{ width: "40%", marginBottom: 12 }} />
                  <div className="skeleton" style={{ width: "90%", height: 10, marginBottom: 8 }} />
                  <div className="skeleton" style={{ width: "70%", height: 10 }} />
                </div>
              ))}
            </div>
          )}
          {skeletonLayout === "chart" && (
            <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 180, paddingTop: 20 }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skeleton" style={{ flex: 1, height: `${30 + Math.random() * 60}%`, borderRadius: "8px 8px 0 0" }} />
              ))}
            </div>
          )}
          {skeletonLayout === "events" && (
            <div style={{ display: "grid", gap: 2 }}>
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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, minHeight: 320, placeItems: "center" }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="skeleton" style={{ width: "80%", height: 80, borderRadius: 16 }} />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="command-surface"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      style={{ minWidth: 0, overflow: "hidden" }}
    >
      <div className="empty-state">
        {type === "loading" ? (
          <div className="skeleton" style={{ width: 56, height: 56, borderRadius: 18 }} />
        ) : (
          <div className="empty-state-icon">
            <Icon size={28} />
          </div>
        )}
        <div style={{ display: "grid", gap: 6 }}>
          <h3>{title}</h3>
          {message ? <p>{message}</p> : null}
        </div>
        {actionLabel && onAction ? (
          <button className="btn primary" onClick={onAction}>
            {actionLabel}
          </button>
        ) : null}
        {type === "empty" && !actionLabel && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
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
