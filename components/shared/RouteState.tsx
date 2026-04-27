"use client";

import { AlertTriangle, Loader2, SearchX } from "lucide-react";
import { motion } from "framer-motion";

export function RouteState({
  type,
  title,
  message,
  actionLabel,
  onAction
}: {
  type: "loading" | "empty" | "error";
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const Icon = type === "loading" ? Loader2 : type === "error" ? AlertTriangle : SearchX;

  return (
    <motion.div
      className="panel"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      style={{
        minHeight: 320,
        display: "grid",
        placeItems: "center",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.035), transparent 42%), linear-gradient(145deg, rgba(18,24,36,0.98), rgba(13,17,24,0.98)), radial-gradient(circle at 50% 0%, rgba(217,154,43,0.08), transparent 50%)",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 480, padding: "24px 16px" }}>
        {type === "loading" ? (
          <div style={{ margin: "0 auto 16px", display: "grid", placeItems: "center", gap: 14 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: "rgba(217,154,43,0.12)",
                border: "1px solid rgba(217,154,43,0.35)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <Loader2 size={24} className="spin" style={{ color: "var(--amber)" }} />
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              <div
                style={{
                  height: 10,
                  width: 180,
                  borderRadius: 999,
                  background: "rgba(148,163,184,0.12)",
                  animation: "pulse 1.6s ease-in-out infinite",
                  margin: "0 auto",
                }}
              />
              <div
                style={{
                  height: 10,
                  width: 120,
                  borderRadius: 999,
                  background: "rgba(148,163,184,0.08)",
                  animation: "pulse 1.6s ease-in-out 0.3s infinite",
                  margin: "0 auto",
                }}
              />
            </div>
          </div>
        ) : (
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "rgba(217,154,43,0.12)",
              border: "1px solid rgba(217,154,43,0.35)",
              display: "grid",
              placeItems: "center",
              margin: "0 auto 16px",
            }}
          >
            <Icon size={28} style={{ color: "var(--amber)" }} />
          </div>
        )}
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>{title}</h2>
        {message ? <p className="muted" style={{ marginTop: 10, lineHeight: 1.55 }}>{message}</p> : null}
        {actionLabel && onAction ? (
          <button className="btn primary" onClick={onAction} style={{ marginTop: 20 }}>
            {actionLabel}
          </button>
        ) : null}
      </div>
    </motion.div>
  );
}
