import datetime
import hashlib
import json

from sqlalchemy.orm import Session

from apps.api.models.asset import Asset


class AssetService:
    def upsert_asset(self, db: Session, observation_data: dict) -> Asset:
        mac = observation_data.get("mac_address")
        ip = observation_data.get("ip_address")
        hostname = observation_data.get("hostname", "unknown")
        ports = observation_data.get("open_ports", [])
        vendor = observation_data.get("vendor", "")
        site = observation_data.get("site", "")
        segment = observation_data.get("segment", "")
        asset_type = observation_data.get("asset_type", "")
        owner = observation_data.get("owner", "")
        authorization_state = observation_data.get("authorization_state", "unknown")

        asset = None
        if mac:
            asset = db.query(Asset).filter(Asset.mac_address == mac).first()
        if not asset and ip:
            asset = db.query(Asset).filter(Asset.ip_address == ip).first()

        now = datetime.datetime.utcnow()

        uid_base = f"{hostname}-{mac or ip}"
        short_hash = hashlib.md5(uid_base.encode()).hexdigest()[:8]
        asset_uid = f"asset-{hostname}-{short_hash}"

        if (
            authorization_state == "authorized"
            and owner
            and owner not in ("Unverified", "Unknown", "")
        ):
            final_auth = "authorized"
        elif authorization_state == "unauthorized":
            final_auth = "unauthorized"
        elif not owner or owner in ("Unverified", "Unknown", ""):
            final_auth = "unknown"
        else:
            final_auth = authorization_state

        if asset:
            asset.ip_address = ip or asset.ip_address
            asset.hostname = hostname or asset.hostname
            asset.mac_address = mac or asset.mac_address
            asset.site = site or asset.site
            asset.segment = segment or asset.segment
            asset.asset_type = asset_type or asset.asset_type
            asset.owner = owner or asset.owner
            asset.authorization_state = final_auth
            asset.last_seen = now
            asset.open_ports = ports
            asset.metadata_ = {
                **(asset.metadata_ or {}),
                "vendor": vendor,
            }
            asset.updated_at = now
            db.commit()
            db.refresh(asset)
            return asset

        asset = Asset(
            asset_uid=asset_uid,
            hostname=hostname,
            ip_address=ip,
            mac_address=mac,
            site=site,
            segment=segment,
            asset_type=asset_type,
            authorization_state=final_auth,
            owner=owner,
            status="watch",
            first_seen=now,
            last_seen=now,
            open_ports_json=json.dumps(ports),
            metadata_json=json.dumps({"vendor": vendor}),
        )
        db.add(asset)
        db.commit()
        db.refresh(asset)
        return asset

    def get_assets(self, db: Session, filters: dict = None) -> list[Asset]:
        query = db.query(Asset)
        if filters:
            if filters.get("segment"):
                query = query.filter(Asset.segment == filters["segment"])
            if filters.get("authorization_state"):
                query = query.filter(
                    Asset.authorization_state == filters["authorization_state"]
                )
            if filters.get("status"):
                query = query.filter(Asset.status == filters["status"])
        query = query.order_by(Asset.last_seen.desc())
        return query.all()

    def get_asset(self, db: Session, asset_id: int) -> Asset | None:
        return db.query(Asset).filter(Asset.id == asset_id).first()

    def get_asset_count_by_segment(self, db: Session) -> dict:
        assets = db.query(Asset).all()
        counts = {}
        for asset in assets:
            seg = asset.segment or "Unknown"
            counts[seg] = counts.get(seg, 0) + 1
        return counts

    def get_asset_count_by_authorization(self, db: Session) -> dict:
        assets = db.query(Asset).all()
        counts = {}
        for asset in assets:
            auth = asset.authorization_state or "unknown"
            counts[auth] = counts.get(auth, 0) + 1
        return counts


asset_service = AssetService()
