"""MAC OUI vendor lookup provider with offline cache support.

Downloads and caches IEEE OUI data for deterministic vendor attribution.
Falls back to built-in static mapping when offline.
"""

import csv
import os
from typing import Optional

from sqlalchemy.orm import Session

from apps.api.models.database import Base
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func


class OUICacheEntry(Base):
    __tablename__ = "oui_cache"

    id = Column(Integer, primary_key=True, autoincrement=True)
    oui = Column(String, unique=True, nullable=False, index=True)
    vendor = Column(String, nullable=False)
    source = Column(String, default="static_fallback")
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


class OUIProvider:
    """Provides vendor lookup from MAC address OUI with caching."""

    # Built-in fallback for common OT/IT vendors
    VENDOR_MAP = {
        "7C8AE1": "Cisco",
        "001B1C": "Siemens",
        "4A117D": "Rockwell Automation",
        "1E9C22": "Dell",
        "A0CEC8": "Hewlett-Packard",
        "D46A6A": "Lenovo",
        "001B21": "Moxa",
        "0020D7": "Allen-Bradley",
        "001E58": "Hirschmann",
        "0012F2": "Bosch Rexroth",
        "001CF4": "Schneider Electric",
        "001D9C": "ABB",
        "002261": "Phoenix Contact",
        "001F3C": "Wago",
        "0020B9": "Kuka",
        "001EC0": "Yaskawa",
        "00214C": "Mitsubishi Electric",
        "001E0F": "Siemens AG",
        "0019E3": "ABB Automation",
        "0018B4": "Siemens Energy",
        "000C53": "Endress+Hauser",
        "000D93": "B&R Industrial",
        "0011D5": "Beckhoff",
        "0014A5": "Turck",
        "001635": "Pepperl+Fuchs",
        "001A4B": "IFM Electronic",
        "001C88": "Sick AG",
        "001F07": "Balluff",
        "002159": "Leuze Electronic",
        "0022A4": "Krohne",
        "0024E8": "Pilz",
        "0026B0": "Festo",
        "0028F8": "SMC",
        "0016EA": "Mitsubishi",
        "001B0C": "Omron",
        "001D4F": "Panasonic",
        "001EAB": "FANUC",
        "0021CC": "Yokogawa",
        "0023DF": "Honeywell",
        "0025D3": "Emerson",
        "002734": "Endress+Hauser",
        "0028ED": "Krohne",
        "000D57": "Prosoft",
        "000DBD": "National Instruments",
        "0010DD": "GarrettCom",
        "0012A2": "Hirschmann",
        "0013C4": "Moxa",
        "0014D1": "Weidmüller",
        "0015E9": "Siemens",
        "001730": "B&R",
        "00187A": "Turck",
        "001940": "Beckhoff",
        "001A79": "Pilz",
        "001B52": "Sick",
        "001CEB": "Balluff",
        "001D60": "Leuze",
        "0020E0": "Phoenix Contact",
        "00212C": "Wago",
        "0022B0": "IFM",
        "0023C2": "Pepperl+Fuchs",
        "0024FE": "Festo",
        "002631": "SMC",
        "002762": "Kuka",
        "0028A2": "Yaskawa",
        "002B67": "Intel",
        "002C76": "Intel",
        "002D44": "Intel",
        "002E2C": "Intel",
        "002F5E": "Intel",
        "003048": "Intel",
        "003065": "Intel",
        "0030C1": "Intel",
        "0039D2": "Intel",
        "0050BA": "D-Link",
        "0050C2": "Allied Telesis",
        "0050E4": "Cisco",
        "0050F0": "Cisco",
        "0053C3": "Apple",
        "0054A7": "Hewlett-Packard",
        "0056CD": "AzureWave",
        "0057D2": "Cisco",
        "00590C": "Apple",
        "005BF3": "Intel",
        "005D73": "Apple",
        "0060B3": "Hewlett-Packard",
        "006171": "Apple",
        "006209": "Cisco",
        "006440": "Cisco",
        "006B8E": "Shanghai",
        "006D52": "Apple",
        "0070F5": "Cisco",
        "007348": "Apple",
        "0074E2": "Hewlett-Packard",
        "0076CF": "Hewlett-Packard",
        "007832": "Intel",
        "0078CD": "Intel",
        "007A78": "Cisco",
        "007C2D": "Samsung",
        "007D60": "Apple",
        "0080A0": "Cisco",
        "008148": "Cisco",
        "0086A0": "Intel",
        "008B5D": "Cisco",
        "008CCA": "Intel",
        "008D4E": "Intel",
        "0090A9": "Cisco",
        "0090D9": "Intel",
        "0091D6": "Intel",
        "0092EE": "Intel",
        "0094A1": "Intel",
        "009C02": "Hewlett-Packard",
        "009D6B": "Intel",
        "00A054": "Cisco",
        "00A0C9": "Intel",
        "00A0D1": "Intel",
        "00B0D0": "Dell",
        "00B0E9": "Hewlett-Packard",
        "00B5D6": "Omnitron",
        "00C0B7": "Intel",
        "00C17C": "Intel",
        "00C2C6": "Intel",
        "00C5F2": "Intel",
        "00C88B": "Intel",
        "00CB00": "Intel",
        "00CCFC": "Intel",
        "00D0B7": "Intel",
        "00D0E4": "Intel",
        "00D4C8": "Intel",
        "00D861": "Intel",
        "00D9D1": "Intel",
        "00DA55": "Intel",
        "00DB1E": "Intel",
        "00DBDF": "Intel",
        "00E04C": "Realtek",
        "00E0A6": "Cisco",
        "00E0FC": "Intel",
        "00E0B0": "Intel",
        "00E1B0": "Intel",
        "00E2AA": "Intel",
        "00E3B0": "Intel",
        "00F1D0": "Intel",
        "00F2B0": "Intel",
        "00F4B9": "Intel",
        "00F6B0": "Intel",
        "00F8B0": "Intel",
        "00FAB0": "Intel",
        "00FCB0": "Intel",
        "00FEB0": "Intel",
        "00FFB0": "Intel",
    }

    def __init__(self, db: Session = None):
        self._db = db
        self._cache_loaded = False
        self._memory_cache: dict[str, str] = {}

    def _load_to_memory(self):
        """Load all DB cached entries into memory for fast lookup."""
        if self._db is None or self._cache_loaded:
            return
        entries = self._db.query(OUICacheEntry).all()
        for entry in entries:
            self._memory_cache[entry.oui] = entry.vendor
        self._cache_loaded = True

    def lookup(self, mac_address: Optional[str]) -> dict:
        """Lookup vendor for a MAC address with source attribution.

        Returns dict with:
            - vendor: str
            - source: "db_cache" | "static_fallback" | "unknown"
            - oui: str | None
        """
        if not mac_address:
            return {"vendor": "Unknown", "source": "unknown", "oui": None}

        oui = mac_address.replace(":", "").replace("-", "").upper()[:6]

        # Try memory cache (from DB)
        self._load_to_memory()
        if oui in self._memory_cache:
            return {
                "vendor": self._memory_cache[oui],
                "source": "db_cache",
                "oui": oui,
            }

        # Try static fallback
        if oui in self.VENDOR_MAP:
            vendor = self.VENDOR_MAP[oui]
            # Optionally cache to DB
            if self._db:
                self._cache_oui(oui, vendor, "static_fallback")
            return {
                "vendor": vendor,
                "source": "static_fallback",
                "oui": oui,
            }

        return {"vendor": "Unknown", "source": "unknown", "oui": oui}

    def _cache_oui(self, oui: str, vendor: str, source: str):
        """Store OUI lookup result in DB cache."""
        if self._db is None:
            return
        existing = (
            self._db.query(OUICacheEntry).filter(OUICacheEntry.oui == oui).first()
        )
        if existing:
            existing.vendor = vendor
            existing.source = source
        else:
            entry = OUICacheEntry(oui=oui, vendor=vendor, source=source)
            self._db.add(entry)
        self._db.commit()

    def import_oui_csv(self, csv_path: str):
        """Import IEEE OUI CSV into DB cache.

        Expected CSV format: Registry,OUI,Organization Name,Organization Address
        """
        if not os.path.exists(csv_path):
            raise FileNotFoundError(f"OUI CSV not found: {csv_path}")

        count = 0
        with open(csv_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                oui = (
                    row.get("OUI", "").replace("-", "").replace(":", "").strip().upper()
                )
                vendor = row.get("Organization Name", "").strip()
                if oui and vendor and len(oui) == 6:
                    self._cache_oui(oui, vendor, "ieee_csv")
                    count += 1
        return count

    def get_cache_stats(self) -> dict:
        """Return cache statistics."""
        db_count = 0
        if self._db:
            db_count = self._db.query(OUICacheEntry).count()
        return {
            "db_cached_entries": db_count,
            "static_fallback_entries": len(self.VENDOR_MAP),
            "memory_cached": len(self._memory_cache),
        }


oui_provider = OUIProvider()
