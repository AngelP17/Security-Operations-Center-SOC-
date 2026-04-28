"""Scan profiles for ForgeSentinel production-grade scanning.

Profiles define what to scan, how fast, and how deep — with safety limits.
"""

from dataclasses import dataclass
from typing import Optional


@dataclass
class ScanProfile:
    name: str
    ports: list[int]
    timeout: float
    max_hosts: int
    max_concurrent_hosts: int
    max_concurrent_ports: int
    delay_between_hosts_ms: int
    description: str
    banner_grab: bool = False
    ot_protocol_probes: bool = False
    icmp_discovery: bool = True
    arp_discovery: bool = True
    tcp_ping_discovery: bool = True
    rate_limit_per_second: int = 100
    retry_count: int = 1


# Default comprehensive port list
DEFAULT_SCAN_PORTS = [
    21,
    22,
    23,
    25,
    53,
    80,
    88,
    110,
    111,
    135,
    139,
    143,
    389,
    443,
    445,
    502,
    587,
    631,
    993,
    995,
    1433,
    1521,
    2049,
    3306,
    3389,
    5060,
    5432,
    5900,
    6379,
    8080,
    8443,
    9000,
    9200,
    27017,
]

# OT-specific ports (Modbus, Ethernet/IP, BACnet, etc.)
OT_PORTS = [
    80,
    443,
    502,
    44818,
    102,
    20000,
    47808,
    2404,
    18245,
    1911,
    4840,
    34962,
    34963,
    34964,
]

SCAN_PROFILES: dict[str, ScanProfile] = {
    "safe_discovery": ScanProfile(
        name="safe_discovery",
        ports=[22, 80, 443, 445, 3389, 9100],
        timeout=1.0,
        max_hosts=256,
        max_concurrent_hosts=20,
        max_concurrent_ports=50,
        delay_between_hosts_ms=100,
        description="Low-impact discovery scan for quick asset enumeration",
        banner_grab=False,
        ot_protocol_probes=False,
        icmp_discovery=True,
        arp_discovery=True,
        tcp_ping_discovery=True,
        rate_limit_per_second=50,
    ),
    "ot_visibility": ScanProfile(
        name="ot_visibility",
        ports=OT_PORTS,
        timeout=1.5,
        max_hosts=256,
        max_concurrent_hosts=10,
        max_concurrent_ports=30,
        delay_between_hosts_ms=500,
        description="OT-aware exposure scan for industrial control systems",
        banner_grab=False,
        ot_protocol_probes=True,
        icmp_discovery=False,
        arp_discovery=True,
        tcp_ping_discovery=True,
        rate_limit_per_second=20,
    ),
    "windows_domain": ScanProfile(
        name="windows_domain",
        ports=[53, 88, 135, 139, 389, 445, 3389, 5985, 9389],
        timeout=1.0,
        max_hosts=512,
        max_concurrent_hosts=30,
        max_concurrent_ports=60,
        delay_between_hosts_ms=50,
        description="Windows Active Directory and domain exposure assessment",
        banner_grab=False,
        ot_protocol_probes=False,
        icmp_discovery=True,
        arp_discovery=True,
        tcp_ping_discovery=True,
        rate_limit_per_second=80,
    ),
    "deep_private": ScanProfile(
        name="deep_private",
        ports=DEFAULT_SCAN_PORTS,
        timeout=1.5,
        max_hosts=1024,
        max_concurrent_hosts=50,
        max_concurrent_ports=100,
        delay_between_hosts_ms=0,
        description="Broader authorized private network assessment",
        banner_grab=True,
        ot_protocol_probes=False,
        icmp_discovery=True,
        arp_discovery=True,
        tcp_ping_discovery=True,
        rate_limit_per_second=100,
    ),
    "conservative_ot": ScanProfile(
        name="conservative_ot",
        ports=[80, 443, 502, 44818, 102],
        timeout=3.0,
        max_hosts=64,
        max_concurrent_hosts=1,
        max_concurrent_ports=10,
        delay_between_hosts_ms=1000,
        description="Ultra-conservative OT scan — one host at a time, minimal probes",
        banner_grab=False,
        ot_protocol_probes=False,
        icmp_discovery=False,
        arp_discovery=True,
        tcp_ping_discovery=False,
        rate_limit_per_second=5,
        retry_count=2,
    ),
}


def get_profile(name: str) -> Optional[ScanProfile]:
    return SCAN_PROFILES.get(name)


def list_profiles() -> list[dict]:
    return [
        {
            "name": p.name,
            "description": p.description,
            "max_hosts": p.max_hosts,
            "timeout": p.timeout,
            "delay_between_hosts_ms": p.delay_between_hosts_ms,
            "banner_grab": p.banner_grab,
            "ot_protocol_probes": p.ot_protocol_probes,
            "port_count": len(p.ports),
            "max_concurrent_hosts": p.max_concurrent_hosts,
            "rate_limit_per_second": p.rate_limit_per_second,
        }
        for p in SCAN_PROFILES.values()
    ]
