"""Asset identity reconciliation for production-grade asset deduplication.

Prevents duplicate assets across scans by matching on MAC, hostname, IP,
and composite confidence scoring.
"""

from typing import Optional

from sqlalchemy.orm import Session

from apps.api.models.asset import Asset


class AssetIdentityResolver:
    """Resolves scan observations to existing assets with confidence scoring."""

    def __init__(self, db: Session):
        self.db = db

    def resolve(
        self,
        ip_address: Optional[str],
        mac_address: Optional[str],
        hostname: Optional[str],
        vendor: Optional[str],
        site: str = "",
    ) -> dict:
        """Match an observation to an existing asset or return new-asset signal.

        Returns dict:
            - asset: Asset | None
            - confidence: float (0.0 - 1.0)
            - matched_on: list[str]
            - is_new: bool
        """
        matches = []
        confidence = 0.0
        matched_fields = []

        # Strategy 1: MAC exact match (highest confidence)
        if mac_address:
            asset = (
                self.db.query(Asset).filter(Asset.mac_address == mac_address).first()
            )
            if asset:
                matches.append((asset, 0.95, ["mac_address"]))

        # Strategy 2: Hostname exact match within site
        if (
            hostname
            and hostname
            != f"host-{ip_address.replace('.', '-') if ip_address else 'unknown'}"
        ):
            query = self.db.query(Asset).filter(Asset.hostname == hostname)
            if site:
                query = query.filter(Asset.site == site)
            asset = query.first()
            if asset:
                matches.append((asset, 0.85, ["hostname"]))

        # Strategy 3: IP exact match (within recent scan window)
        if ip_address:
            asset = self.db.query(Asset).filter(Asset.ip_address == ip_address).first()
            if asset:
                # Lower confidence for IP-only matches (DHCP churn)
                matches.append((asset, 0.60, ["ip_address"]))

        # Strategy 4: Vendor + hostname similarity
        if vendor and hostname and len(hostname) > 3:
            # Look for same vendor + similar hostname prefix
            prefix = hostname.split("-")[0] if "-" in hostname else hostname[:4]
            assets = (
                self.db.query(Asset)
                .filter(
                    Asset.vendor == vendor,
                    Asset.hostname.like(f"{prefix}%"),
                )
                .all()
            )
            if assets:
                # Pick most recently seen
                asset = max(assets, key=lambda a: a.last_seen or a.created_at)
                matches.append((asset, 0.50, ["vendor_hostname_similarity"]))

        if not matches:
            return {
                "asset": None,
                "confidence": 0.0,
                "matched_on": [],
                "is_new": True,
            }

        # Pick highest confidence match
        best = max(matches, key=lambda m: m[1])
        asset, confidence, matched_fields = best

        return {
            "asset": asset,
            "confidence": round(confidence, 2),
            "matched_on": matched_fields,
            "is_new": False,
        }

    def get_identity_metadata(
        self,
        ip_address: Optional[str],
        mac_address: Optional[str],
        hostname: Optional[str],
        vendor: Optional[str],
        site: str = "",
    ) -> dict:
        """Get full identity resolution result with provenance."""
        result = self.resolve(ip_address, mac_address, hostname, vendor, site)

        return {
            "asset_id": result["asset"].id if result["asset"] else None,
            "identity_confidence": result["confidence"],
            "matched_on": result["matched_on"],
            "is_new_asset": result["is_new"],
            "mac_source": "arp_table" if mac_address else None,
            "hostname_source": "reverse_dns"
            if hostname and not hostname.startswith("host-")
            else "netbios_fallback",
            "vendor_source": "oui_cache"
            if vendor and vendor != "Unknown"
            else "unknown",
            "ip_source": "scan_observation",
        }
