"use client";

import { useState } from "react";
import { RouteState } from "@/components/shared/RouteState";
import { Loader2 } from "lucide-react";

export default function Error({ reset }: { reset: () => void }) {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = () => {
    setIsRetrying(true);
    reset();
    // Reset the local loading state after a brief delay to simulate recovery
    setTimeout(() => setIsRetrying(false), 800);
  };

  if (isRetrying) {
    return (
      <div className="panel" style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <div style={{ textAlign: "center" }}>
          <Loader2 size={32} className="spin" style={{ margin: "0 auto 12px", color: "var(--amber)" }} />
          <h2>Recovering workspace...</h2>
          <p className="muted" style={{ marginTop: 8 }}>Please wait while we restore the UI state.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="panel" style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <div style={{ textAlign: "center", maxWidth: 480 }}>
        <RouteState
          type="error"
          title="Command workspace unavailable"
          message="The local UI state could not be initialized."
          actionLabel="Retry"
          onAction={handleRetry}
        />
      </div>
    </div>
  );
}
