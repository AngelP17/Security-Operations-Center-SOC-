import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="route-state-shell" style={{ minHeight: "100dvh", display: "grid", placeItems: "center" }}>
      <div className="route-state-inner" style={{ textAlign: "center" }}>
        <Loader2 size={36} className="spin" style={{ margin: "0 auto 16px", color: "var(--amber)" }} />
        <h2 style={{ fontSize: 22, lineHeight: 1.1, letterSpacing: "-0.03em" }}>Loading ForgeSentinel workspace</h2>
        <p className="muted" style={{ marginTop: 10, lineHeight: 1.55 }}>Initializing command surface, asset archive, and incident telemetry...</p>
      </div>
    </div>
  );
}
