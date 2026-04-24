import type { RiskLevel } from "@/lib/types";
import { riskClass } from "@/lib/types";

export function RiskBadge({ level, score }: { level?: RiskLevel | string; score?: number }) {
  return (
    <span className={`risk-badge ${riskClass(level as string)}`}>
      {score !== undefined ? `${score} ` : null}
      {level || "unknown"}
    </span>
  );
}
