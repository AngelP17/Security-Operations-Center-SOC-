"use client";

import { AlertTriangle, Loader2, SearchX } from "lucide-react";

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
    <div className="panel" style={{ minHeight: 260, display: "grid", placeItems: "center" }}>
      <div style={{ textAlign: "center", maxWidth: 420 }}>
        <Icon size={32} className={type === "loading" ? "spin" : ""} style={{ margin: "0 auto 12px", color: "var(--amber)" }} />
        <h2>{title}</h2>
        {message ? <p className="muted" style={{ marginTop: 8 }}>{message}</p> : null}
        {actionLabel && onAction ? (
          <button className="btn primary" onClick={onAction} style={{ marginTop: 16 }}>
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
