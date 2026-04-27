"""Real network scanning utilities for ForgeSentinel lab mode.

Performs TCP connect scans, ARP lookups, hostname resolution, and MAC OUI vendor
detection against authorized private network ranges only.
"""

import ipaddress
import json
import re
import socket
import struct
import subprocess
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Optional

# Ports to scan — OT/IT services relevant to manufacturing environments
DEFAULT_SCAN_PORTS = [
    21,  # FTP
    22,  # SSH
    23,  # Telnet
    25,  # SMTP
    53,  # DNS
    80,  # HTTP
    88,  # Kerberos
    110,  # POP3
    111,  # RPCbind
    135,  # MS-RPC
    139,  # NetBIOS
    143,  # IMAP
    389,  # LDAP
    443,  # HTTPS
    445,  # SMB
    502,  # Modbus
    587,  # SMTP submission
    631,  # IPP
    993,  # IMAPS
    995,  # POP3S
    1433,  # MSSQL
    1521,  # Oracle
    2049,  # NFS
    3306,  # MySQL
    3389,  # RDP
    5060,  # SIP
    5432,  # PostgreSQL
    5900,  # VNC
    6379,  # Redis
    8080,  # HTTP alternate
    8443,  # HTTPS alternate
    9000,  # Hadoop / Jenkins
    9200,  # Elasticsearch
    27017,  # MongoDB
]

# Timeout per port connect (seconds)
CONNECT_TIMEOUT = 1.5

# Max threads for port scanning
MAX_WORKERS = 50


def _tcp_connect(host: str, port: int, timeout: float = CONNECT_TIMEOUT) -> bool:
    """Attempt a TCP connection to host:port. Returns True if port is open."""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(timeout)
            result = s.connect_ex((host, port))
            return result == 0
    except Exception:
        return False


def scan_host_ports(
    ip: str, ports: list[int] = None, timeout: float = CONNECT_TIMEOUT
) -> list[int]:
    """Scan a list of ports on a single host using TCP connect."""
    ports = ports or DEFAULT_SCAN_PORTS
    open_ports = []
    with ThreadPoolExecutor(max_workers=min(MAX_WORKERS, len(ports))) as executor:
        futures = {executor.submit(_tcp_connect, ip, p, timeout): p for p in ports}
        for future in as_completed(futures):
            port = futures[future]
            try:
                if future.result():
                    open_ports.append(port)
            except Exception:
                continue
    return sorted(open_ports)


def resolve_hostname(ip: str) -> Optional[str]:
    """Try reverse DNS lookup. Return hostname or None."""
    try:
        hostname, _, _ = socket.gethostbyaddr(ip)
        return hostname.split(".")[0] if hostname else None
    except (socket.herror, socket.gaierror):
        return None


def resolve_netbios_name(ip: str, timeout: float = 2.0) -> Optional[str]:
    """Try to get NetBIOS name using nmblookup (samba). Falls back silently."""
    try:
        result = subprocess.run(
            ["nmblookup", "-A", ip],
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        if result.returncode == 0:
            # Parse output for active NetBIOS name
            for line in result.stdout.splitlines():
                if "<00>" in line and "ACTIVE" in line.upper():
                    parts = line.split()
                    if parts:
                        return parts[0].strip()
    except (subprocess.TimeoutExpired, FileNotFoundError, Exception):
        pass
    return None


def get_mac_from_arp(ip: str) -> Optional[str]:
    """Read the system ARP table to find MAC address for an IP."""
    try:
        # macOS / Linux
        result = subprocess.run(
            ["arp", "-n", ip],
            capture_output=True,
            text=True,
            timeout=3.0,
        )
        output = result.stdout + result.stderr
        # Look for MAC patterns
        mac_pattern = re.compile(r"([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})")
        match = mac_pattern.search(output)
        if match:
            return match.group(0).upper().replace("-", ":")
    except (subprocess.TimeoutExpired, FileNotFoundError, Exception):
        pass
    return None


def lookup_vendor_from_mac(mac: Optional[str]) -> str:
    """Return vendor name from MAC OUI database if available."""
    if not mac:
        return "Unknown"
    oui = mac.replace(":", "")[:6].upper()
    # In a production setup, load from ieee oui.txt or API.
    # Here we use a small built-in mapping for common OT/IT vendors.
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
        "0002B3": "Intel",
        "000347": "Dell",
        "000502": "Apple",
        "00055E": "Hewlett-Packard",
        "0007E9": "Intel",
        "00095B": "IBM",
        "000A95": "Apple",
        "000C29": "VMware",
        "000D3A": "Intel",
        "000E0C": "Asustek",
        "000F20": "Intel",
        "001018": "Broadcom",
        "0010A4": "IBM",
        "001125": "Apple",
        "001143": "Intel",
        "001279": "Intel",
        "0013CE": "Hewlett-Packard",
        "0014C2": "Nintendo",
        "0015C5": "Intel",
        "0016CB": "Intel",
        "0017F2": "Intel",
        "00188B": "Intel",
        "001999": "Hewlett-Packard",
        "001A6B": "Intel",
        "001B11": "Intel",
        "001C25": "Intel",
        "001D09": "Intel",
        "001E4F": "Intel",
        "001F3B": "Intel",
        "0020ED": "Intel",
        "0021CC": "Yokogawa",
        "0022FA": "Intel",
        "0023AE": "Intel",
        "0024D7": "Intel",
        "0026C7": "Intel",
        "00270E": "Intel",
        "002710": "Intel",
        "0028F8": "SMC",
        "002A10": "Intel",
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
        "00A0D2": "Intel",
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
    return VENDOR_MAP.get(oui, "Unknown")


def guess_asset_type(open_ports: list[int], hostname: str = "") -> str:
    """Heuristic asset type classification from open ports and hostname."""
    hostname_lower = hostname.lower()
    if 502 in open_ports or "plc" in hostname_lower:
        return "plc"
    if any(p in open_ports for p in [5900, 3389]) and "hmi" in hostname_lower:
        return "hmi"
    if "hmi" in hostname_lower:
        return "hmi"
    if 9100 in open_ports or "prn" in hostname_lower or "print" in hostname_lower:
        return "printer"
    if 1433 in open_ports or "srv" in hostname_lower or "server" in hostname_lower:
        return "server"
    if 3389 in open_ports or any(p in open_ports for p in [22, 23]):
        if "ws" in hostname_lower or "workstation" in hostname_lower:
            return "workstation"
    if 80 in open_ports or 443 in open_ports:
        if "cam" in hostname_lower or "dvr" in hostname_lower or "nv" in hostname_lower:
            return "camera"
    if (
        "router" in hostname_lower
        or "gw" in hostname_lower
        or "firewall" in hostname_lower
    ):
        return "network"
    if "switch" in hostname_lower:
        return "network"
    if "ap" in hostname_lower or "wifi" in hostname_lower:
        return "wireless"
    if any(p in open_ports for p in [5900, 3389, 22]):
        return "workstation"
    if 80 in open_ports or 443 in open_ports:
        return "server"
    if not open_ports:
        return "unknown"
    return "device"


def scan_single_host(ip: str, ports: list[int] = None) -> dict:
    """Scan a single host comprehensively.

    Returns dict with:
        - ip_address
        - hostname (or None)
        - mac_address (or None)
        - vendor
        - open_ports: list[int]
        - asset_type: str
    """
    ports = ports or DEFAULT_SCAN_PORTS
    open_ports = scan_host_ports(ip, ports)

    # Try reverse DNS
    hostname = resolve_hostname(ip)
    # Try NetBIOS if DNS fails and port 139/445 is open
    if not hostname and any(p in open_ports for p in [139, 445]):
        hostname = resolve_netbios_name(ip)

    mac = get_mac_from_arp(ip)
    vendor = lookup_vendor_from_mac(mac) if mac else "Unknown"
    asset_type = guess_asset_type(open_ports, hostname or "")

    return {
        "ip_address": ip,
        "hostname": hostname or f"host-{ip.replace('.', '-')}",
        "mac_address": mac,
        "vendor": vendor,
        "open_ports": open_ports,
        "asset_type": asset_type,
    }


def scan_network_range(
    network: ipaddress.IPv4Network,
    ports: list[int] = None,
    max_hosts: int = 30,
    host_workers: int = 20,
) -> list[dict]:
    """Scan a network range, returning results for responsive hosts only.

    Only hosts with at least one open port or a resolvable MAC are included.
    """
    ports = ports or DEFAULT_SCAN_PORTS
    hosts = list(network.hosts())[:max_hosts]
    results = []
    lock = threading.Lock()

    def _scan_one(ip_obj):
        ip_str = str(ip_obj)
        try:
            result = scan_single_host(ip_str, ports)
            has_mac = result["mac_address"] is not None
            has_ports = len(result["open_ports"]) > 0
            if has_ports or has_mac:
                with lock:
                    results.append(result)
        except Exception:
            pass

    with ThreadPoolExecutor(max_workers=host_workers) as executor:
        list(executor.map(_scan_one, hosts))

    return results
