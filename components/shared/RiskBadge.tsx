import type { RiskLevel } from "@/lib/security-data";
import { riskClass } from "@/lib/security-data";

export function RiskBadge({ level, score }: { level: RiskLevel; score?: number }) {
  return (
    <span className={`risk-badge ${riskClass(level)}`}>
      {score ? `${score} ` : null}{level}
    </span>
  );
}
