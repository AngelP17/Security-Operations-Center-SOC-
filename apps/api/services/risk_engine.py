

from apps.api.models.asset import Asset


class RiskEngine:
    PORT_RISK_MAP = {
        23: ("Telnet", 25),
        3389: ("RDP", 20),
        445: ("SMB", 18),
        502: ("Modbus", 20),
        5900: ("VNC", 18),
        1433: ("MSSQL", 14),
        135: ("RPC", 10),
        9100: ("JetDirect", 8),
    }

    def compute(
        self,
        asset: Asset,
        events: list,
        existing_incidents: list,
    ) -> dict:
        ports = asset.open_ports or []
        port_numbers = [p.get("port", p) if isinstance(p, dict) else p for p in ports]

        auth_state = asset.authorization_state or "unknown"
        atype = (asset.asset_type or "").lower()
        aseg = (asset.segment or "").lower()

        exposure_score = 0.0
        for p in port_numbers:
            if p in self.PORT_RISK_MAP:
                name, weight = self.PORT_RISK_MAP[p]
                exposure_score += weight
            elif p > 1024:
                exposure_score += 8
        if "production" in aseg and exposure_score > 0:
            exposure_score += 8
        exposure_score = min(exposure_score, 100)

        if auth_state == "unauthorized":
            authorization_score = 35.0
        elif auth_state == "unknown":
            authorization_score = 18.0
        else:
            authorization_score = 0.0
        if atype == "plc":
            asset_criticality_score = 28.0
        elif atype in ("hmi", "workstation") and "production" in aseg:
            asset_criticality_score = 22.0
        elif atype == "server":
            asset_criticality_score = 14.0
        else:
            asset_criticality_score = 4.0

        severity_weights = {"critical": 18, "high": 12, "medium": 8, "low": 3}
        event_severity_score = 0.0
        if events:
            max_sev = 0
            for e in events:
                sev = getattr(e, "severity", "low") or "low"
                max_sev = max(max_sev, severity_weights.get(sev, 0))
            event_severity_score = float(max_sev)

        recency_score = (
            7.0
            if asset.first_seen
            and asset.last_seen
            and (asset.last_seen - asset.first_seen).total_seconds() < 300
            else 0.0
        )

        correlation_score = 5.0 if existing_incidents else 0.0

        owner = asset.owner or ""
        uncertainty_penalty = (
            5.0 if (not owner or owner in ("Unverified", "Unknown", "")) else 0.0
        )

        risk_score = (
            exposure_score
            + authorization_score
            + asset_criticality_score
            + event_severity_score
            + recency_score
            + correlation_score
            - uncertainty_penalty
        )
        risk_score = max(0.0, min(100.0, risk_score))

        if risk_score >= 80:
            risk_level = "critical"
        elif risk_score >= 60:
            risk_level = "high"
        elif risk_score >= 40:
            risk_level = "medium"
        else:
            risk_level = "low"

        if (
            auth_state == "authorized"
            and owner
            and owner not in ("Unverified", "Unknown", "")
        ):
            confidence_score = 95.0
        elif auth_state == "authorized":
            confidence_score = 90.0
        elif auth_state == "unknown":
            confidence_score = 85.0
        else:
            confidence_score = 80.0

        triggered_rules = []
        explanation = []

        if exposure_score > 0:
            risky_ports = []
            for p in port_numbers:
                if p in self.PORT_RISK_MAP:
                    risky_ports.append(f"{self.PORT_RISK_MAP[p][0]}({p})")
            if risky_ports:
                triggered_rules.append("exposed_risky_service")
                explanation.append(
                    f"Exposes risky services: {', '.join(risky_ports)} contributing {exposure_score:.1f} exposure points"
                )

        if auth_state == "unauthorized":
            triggered_rules.append("unauthorized_asset")
            explanation.append(
                f"Asset is unauthorized (score: {authorization_score:.1f})"
            )
        elif auth_state == "unknown":
            triggered_rules.append("unknown_authorization")
            explanation.append(
                f"Asset authorization is unknown (score: {authorization_score:.1f})"
            )

        if asset_criticality_score >= 16:
            triggered_rules.append("high_criticality_asset")
            explanation.append(
                f"High criticality asset type '{asset.asset_type}' (score: {asset_criticality_score:.1f})"
            )

        if event_severity_score >= 15:
            triggered_rules.append("severe_events")
            explanation.append(
                f"Recent severe security events detected (score: {event_severity_score:.1f})"
            )

        if correlation_score > 0:
            triggered_rules.append("correlated_incidents")
            explanation.append(
                f"Asset has correlated incidents (score: {correlation_score:.1f})"
            )

        if uncertainty_penalty > 0:
            triggered_rules.append("uncertainty_penalty")
            explanation.append(
                f"Owner unknown/unverified, applying uncertainty penalty ({uncertainty_penalty:.1f})"
            )

        feature_snapshot = {
            "hostname": asset.hostname,
            "ip_address": asset.ip_address,
            "mac_address": asset.mac_address,
            "segment": asset.segment,
            "asset_type": asset.asset_type,
            "authorization_state": auth_state,
            "owner": asset.owner,
            "open_ports": port_numbers,
            "site": asset.site,
        }

        score_breakdown = [
            {"label": "Exposure", "value": round(exposure_score, 2)},
            {"label": "Authorization", "value": round(authorization_score, 2)},
            {"label": "Asset Criticality", "value": round(asset_criticality_score, 2)},
            {"label": "Event Severity", "value": round(event_severity_score, 2)},
            {"label": "Recency", "value": round(recency_score, 2)},
            {"label": "Correlation", "value": round(correlation_score, 2)},
            {"label": "Uncertainty Penalty", "value": round(-uncertainty_penalty, 2)},
        ]

        return {
            "risk_score": round(risk_score, 2),
            "risk_level": risk_level,
            "confidence_score": confidence_score,
            "exposure_score": exposure_score,
            "authorization_score": authorization_score,
            "asset_criticality_score": asset_criticality_score,
            "event_severity_score": event_severity_score,
            "recency_score": recency_score,
            "correlation_score": correlation_score,
            "uncertainty_penalty": uncertainty_penalty,
            "feature_snapshot": feature_snapshot,
            "triggered_rules": triggered_rules,
            "explanation": explanation,
            "score_breakdown": score_breakdown,
        }


risk_engine = RiskEngine()
