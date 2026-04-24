from sqlalchemy.orm import Session

from apps.api.models.incident import Recommendation


class RecommendationEngine:
    TEMPLATES = {
        "exposed_remote_access": [
            {
                "rank": 1,
                "action_type": "isolate",
                "action_label": "Isolate asset at switch port",
                "rationale": "The asset is unauthorized and exposing remote access services. "
                "Immediate network isolation prevents further unauthorized access while investigation proceeds.",
                "expected_benefit": "Eliminates the attack vector within minutes, preventing potential lateral movement.",
                "confidence": 96.0,
                "requires_approval": True,
            },
            {
                "rank": 2,
                "action_type": "verify",
                "action_label": "Verify owner and maintenance window",
                "rationale": "The asset may be a legitimate contractor device. "
                "Verifying ownership determines if this is a policy violation or an expected device.",
                "expected_benefit": "Reduces false positives and identifies responsible parties for remediation.",
                "confidence": 88.0,
                "requires_approval": False,
            },
            {
                "rank": 3,
                "action_type": "evidence",
                "action_label": "Attach packet/service evidence to case",
                "rationale": "Capturing current network state and service banners provides forensic evidence "
                "for the incident record and potential regulatory requirements.",
                "expected_benefit": "Ensures evidentiary integrity for post-incident review and compliance.",
                "confidence": 91.0,
                "requires_approval": False,
            },
        ],
        "unauthorized_production_asset": [
            {
                "rank": 1,
                "action_type": "isolate",
                "action_label": "Quarantine asset and verify authorization",
                "rationale": "An unauthorized asset on the production network poses immediate risk to "
                "manufacturing operations. Quarantine prevents interference with OT processes.",
                "expected_benefit": "Prevents unauthorized interaction with production systems and data exfiltration.",
                "confidence": 92.0,
                "requires_approval": True,
            },
            {
                "rank": 2,
                "action_type": "verify",
                "action_label": "Cross-reference with CMDB",
                "rationale": "Compare discovered asset against the Configuration Management Database "
                "to determine if the device was recently provisioned but not yet registered.",
                "expected_benefit": "Identifies gap in asset management processes and validates authorization status.",
                "confidence": 85.0,
                "requires_approval": False,
            },
        ],
        "ot_exposure": [
            {
                "rank": 1,
                "action_type": "restrict",
                "action_label": "Restrict control protocol access",
                "rationale": "OT protocols like Modbus lack authentication. Restricting access to authorized "
                "engineering workstations reduces the attack surface for process manipulation.",
                "expected_benefit": "Limits control protocol access to authorized endpoints only, mitigating manipulation risk.",
                "confidence": 94.0,
                "requires_approval": True,
            },
            {
                "rank": 2,
                "action_type": "review",
                "action_label": "Schedule firmware review",
                "rationale": "Exposed OT devices may have outdated firmware with known vulnerabilities. "
                "A firmware review ensures the device is running a hardened, supported version.",
                "expected_benefit": "Addresses underlying vulnerability and improves long-term security posture.",
                "confidence": 82.0,
                "requires_approval": False,
            },
        ],
    }

    def generate(
        self,
        db: Session,
        incident,
        risk_decision_data: dict,
    ) -> list[Recommendation]:
        category = incident.category
        templates = self.TEMPLATES.get(category, [])
        recommendations = []

        risk_decision_id = None
        from apps.api.models.risk import RiskDecision as RiskDecisionModel
        from apps.api.models.incident import IncidentAssetLink

        asset_links = (
            db.query(IncidentAssetLink)
            .filter(IncidentAssetLink.incident_id == incident.id)
            .all()
        )
        asset_ids = [link.asset_id for link in asset_links]

        if asset_ids:
            rd_obj = (
                db.query(RiskDecisionModel)
                .filter(RiskDecisionModel.asset_id.in_(asset_ids))
                .first()
            )
            if rd_obj:
                risk_decision_id = rd_obj.id

        for template in templates:
            rec = Recommendation(
                incident_id=incident.id,
                risk_decision_id=risk_decision_id,
                rank=template["rank"],
                action_type=template["action_type"],
                action_label=template["action_label"],
                rationale=template["rationale"],
                expected_benefit=template["expected_benefit"],
                confidence=template["confidence"],
                requires_approval=template["requires_approval"],
                status="pending",
            )
            db.add(rec)
            recommendations.append(rec)

        db.commit()
        for rec in recommendations:
            db.refresh(rec)

        return recommendations


recommendation_engine = RecommendationEngine()
