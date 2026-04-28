"use client";

import { useState } from "react";
import { RouteState } from "@/components/shared/RouteState";
import { Loader2, AlertTriangle } from "lucide-react";

export default function Error({ reset }: { reset: () => void }) {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = () => {
    setIsRetrying(true);
    reset();
    setTimeout(() => setIsRetrying(false), 800);
  };

  if (isRetrying) {
    return (
      <div className="route-state-shell" style={{ minHeight: "100dvh", display: "grid", placeItems: "center" }}>
        <div className="route-state-inner" style={{ textAlign: "center", maxWidth: 400 }}>
          <Loader2 size={40} className="spin" style={{ margin: "0 auto 16px", color: "var(--amber)" }} />
          <h2 style={{ fontSize: 22, lineHeight: 1.1, letterSpacing: "-0.03em" }}>Recovering workspace...</h2>
          <p className="muted" style={{ marginTop: 10, lineHeight: 1.55 }}>Restoring command surface state and reconnecting telemetry.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="route-state-shell" style={{ minHeight: "100dvh", display: "grid", placeItems: "center" }}>
      <div className="route-state-inner" style={{ textAlign: "center", maxWidth: 480 }}>
        <div style={{ width: 56, height: 56, borderRadius: 18, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", display: "grid", placeItems: "center", margin: "0 auto 20px" }}>
          <AlertTriangle size={24} color="var(--critical)" />
        </div>
        <h2 style={{ fontSize: 28, lineHeight: 1.05, letterSpacing: "-0.04em" }}>Command workspace unavailable</h2>
        <p className="muted" style={{ marginTop: 12, lineHeight: 1.6, maxWidth: 380, margin: "12px auto 0" }}>
          The local UI state could not be initialized. This may indicate a configuration or connectivity issue.
        </p>
        <button
          type="button"
          className="taste-btn taste-btn-primary"
          onClick={handleRetry}
          style={{ marginTop: 28 }}
        >
          Retry workspace
        </button>
      </div>
    </div>
  );
}
