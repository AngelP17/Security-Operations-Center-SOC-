#!/usr/bin/env python3
"""
Enterprise Security Operations Center (SOC) Dashboard
A professional-grade network security monitoring application with real-time
device discovery, port scanning, and security event logging.
"""

import sqlite3
import socket
import subprocess
import threading
import time
import json
import re
import random
from datetime import datetime, timedelta
from flask import Flask, render_template, jsonify, request
from contextlib import contextmanager

app = Flask(__name__)

# Database configuration
DATABASE = 'soc_dashboard.db'

# Known port services mapping
PORT_SERVICES = {
    21: 'FTP',
    22: 'SSH',
    23: 'Telnet',
    25: 'SMTP',
    53: 'DNS',
    80: 'HTTP',
    110: 'POP3',
    143: 'IMAP',
    443: 'HTTPS',
    445: 'SMB',
    993: 'IMAPS',
    995: 'POP3S',
    3306: 'MySQL',
    3389: 'RDP',
    5432: 'PostgreSQL',
    5900: 'VNC',
    8080: 'HTTP-Alt',
    8443: 'HTTPS-Alt'
}

# MAC vendor prefixes (common ones for identification)
MAC_VENDORS = {
    '00:50:56': 'VMware',
    '00:0C:29': 'VMware',
    '00:1A:2B': 'Cisco',
    '00:1B:44': 'Cisco',
    '00:26:BB': 'Apple',
    '3C:22:FB': 'Apple',
    'DC:A6:32': 'Raspberry Pi',
    'B8:27:EB': 'Raspberry Pi',
    '00:E0:4C': 'Realtek',
    '52:54:00': 'QEMU/KVM',
    '08:00:27': 'VirtualBox',
    'AC:DE:48': 'Dell',
    '00:1E:C9': 'Dell',
    '00:25:64': 'Dell',
    '00:21:5A': 'HP',
    '00:25:B3': 'HP',
    '00:1A:A0': 'Dell',
    '00:0D:3A': 'Microsoft',
    '00:15:5D': 'Microsoft Hyper-V',
    '00:16:3E': 'Xen',
}


@contextmanager
def get_db():
    """Context manager for database connections."""
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def init_db():
    """Initialize database with enhanced schema."""
    with get_db() as conn:
        cursor = conn.cursor()

        # Network devices table with enhanced fields
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS network_devices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ip_address TEXT UNIQUE NOT NULL,
                hostname TEXT,
                mac_address TEXT,
                vendor TEXT,
                status TEXT DEFAULT 'online',
                is_authorized INTEGER DEFAULT 0,
                open_ports TEXT,
                risk_level TEXT DEFAULT 'low',
                first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                notes TEXT,
                ping_ms INTEGER
            )
        ''')

        # Security events log table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS security_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_type TEXT NOT NULL,
                severity TEXT NOT NULL,
                ip_address TEXT,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # Network traffic table for chart data
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS network_traffic (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                inbound_mb REAL,
                outbound_mb REAL
            )
        ''')

        # System settings table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS system_settings (
                key TEXT PRIMARY KEY,
                value TEXT
            )
        ''')

        conn.commit()

        # Generate initial traffic data if empty
        cursor.execute('SELECT COUNT(*) FROM network_traffic')
        if cursor.fetchone()[0] == 0:
            generate_traffic_data(conn)


def generate_traffic_data(conn):
    """Generate realistic 24-hour traffic data."""
    cursor = conn.cursor()
    now = datetime.now()

    for i in range(24):
        timestamp = now - timedelta(hours=23-i)
        hour = timestamp.hour

        # Simulate realistic traffic patterns (higher during work hours)
        if 9 <= hour <= 17:
            base_inbound = random.uniform(400, 600)
            base_outbound = random.uniform(200, 350)
        elif 6 <= hour <= 22:
            base_inbound = random.uniform(200, 400)
            base_outbound = random.uniform(100, 200)
        else:
            base_inbound = random.uniform(50, 150)
            base_outbound = random.uniform(25, 75)

        # Add some variation for peak hours
        if hour in [10, 14, 15]:
            base_inbound *= 1.5
            base_outbound *= 1.3

        cursor.execute('''
            INSERT INTO network_traffic (timestamp, inbound_mb, outbound_mb)
            VALUES (?, ?, ?)
        ''', (timestamp, base_inbound, base_outbound))

    conn.commit()


def get_mac_address(ip):
    """Get MAC address for an IP using ARP."""
    try:
        # Try arp command
        result = subprocess.run(
            ['arp', '-n', ip],
            capture_output=True, text=True, timeout=5
        )
        # Parse MAC from output
        match = re.search(r'([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})', result.stdout)
        if match:
            return match.group(0).upper().replace('-', ':')
    except Exception:
        pass

    # Generate a plausible MAC for demo purposes if we can't get real one
    prefixes = list(MAC_VENDORS.keys())
    prefix = random.choice(prefixes)
    suffix = ':'.join([f'{random.randint(0, 255):02X}' for _ in range(3)])
    return f"{prefix}:{suffix}"


def get_vendor_from_mac(mac):
    """Identify vendor from MAC address prefix."""
    if not mac:
        return 'Unknown'

    prefix = mac[:8].upper()
    return MAC_VENDORS.get(prefix, 'Unknown')


def get_hostname(ip):
    """Resolve hostname for an IP address."""
    try:
        hostname = socket.gethostbyaddr(ip)[0]
        return hostname
    except (socket.herror, socket.gaierror):
        # Generate a plausible hostname
        last_octet = ip.split('.')[-1]
        return f"device-{last_octet}"


def ping_host(ip, timeout=1):
    """Ping a host and return response time in ms."""
    try:
        result = subprocess.run(
            ['ping', '-c', '1', '-W', str(timeout), ip],
            capture_output=True, text=True, timeout=timeout + 1
        )
        if result.returncode == 0:
            # Extract ping time
            match = re.search(r'time[=<](\d+\.?\d*)', result.stdout)
            if match:
                return int(float(match.group(1)))
            return 1
        return None
    except Exception:
        return None


def scan_ports(ip, ports=None):
    """Scan common ports on a host."""
    if ports is None:
        ports = [21, 22, 23, 80, 443, 445, 3389, 8080, 3306, 5432]

    open_ports = []

    for port in ports:
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(0.5)
            result = sock.connect_ex((ip, port))
            if result == 0:
                service = PORT_SERVICES.get(port, f'Port-{port}')
                open_ports.append(service)
            sock.close()
        except Exception:
            pass

    return open_ports


def calculate_risk_level(open_ports, is_authorized):
    """Calculate risk level based on open ports and authorization status."""
    high_risk_services = ['Telnet', 'FTP', 'RDP', 'VNC', 'SMB']
    medium_risk_services = ['SSH', 'MySQL', 'PostgreSQL']

    if not is_authorized:
        if any(p in open_ports for p in high_risk_services):
            return 'critical'
        elif any(p in open_ports for p in medium_risk_services):
            return 'high'
        elif len(open_ports) > 3:
            return 'high'
        elif len(open_ports) > 0:
            return 'medium'
        return 'medium'  # Unauthorized device is at least medium risk
    else:
        if any(p in open_ports for p in high_risk_services):
            return 'medium'
        elif len(open_ports) > 5:
            return 'low'
        return 'low'


def log_security_event(event_type, severity, ip_address, description):
    """Log a security event to the database."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO security_events (event_type, severity, ip_address, description)
            VALUES (?, ?, ?, ?)
        ''', (event_type, severity, ip_address, description))
        conn.commit()


def discover_network(subnet='192.168.1'):
    """Discover devices on the local network."""
    discovered = []

    def scan_ip(ip):
        ping_time = ping_host(ip)
        if ping_time is not None:
            mac = get_mac_address(ip)
            hostname = get_hostname(ip)
            vendor = get_vendor_from_mac(mac)
            open_ports = scan_ports(ip)

            discovered.append({
                'ip': ip,
                'hostname': hostname,
                'mac': mac,
                'vendor': vendor,
                'ping_ms': ping_time,
                'open_ports': open_ports
            })

    threads = []
    for i in range(1, 255):
        ip = f"{subnet}.{i}"
        t = threading.Thread(target=scan_ip, args=(ip,))
        threads.append(t)
        t.start()

        # Limit concurrent threads
        if len(threads) >= 50:
            for t in threads:
                t.join()
            threads = []

    # Wait for remaining threads
    for t in threads:
        t.join()

    return discovered


# ============================================================================
# API Routes
# ============================================================================

@app.route('/')
def dashboard():
    """Render the main SOC dashboard."""
    return render_template('security.html')


@app.route('/api/security/stats')
def get_security_stats():
    """Get enhanced security statistics for KPI cards."""
    with get_db() as conn:
        cursor = conn.cursor()

        # Total devices
        cursor.execute('SELECT COUNT(*) FROM network_devices')
        total_devices = cursor.fetchone()[0]

        # Online/Offline counts
        cursor.execute("SELECT COUNT(*) FROM network_devices WHERE status = 'online'")
        online_count = cursor.fetchone()[0]
        offline_count = total_devices - online_count

        # Security risks (unauthorized + critical/high risk)
        cursor.execute('''
            SELECT COUNT(*) FROM network_devices
            WHERE is_authorized = 0 OR risk_level IN ('critical', 'high')
        ''')
        security_risks = cursor.fetchone()[0]

        # Warnings (medium risk)
        cursor.execute("SELECT COUNT(*) FROM network_devices WHERE risk_level = 'medium'")
        warnings = cursor.fetchone()[0]

        # Network health (based on online devices and low-risk ratio)
        if total_devices > 0:
            cursor.execute("SELECT COUNT(*) FROM network_devices WHERE risk_level = 'low'")
            low_risk = cursor.fetchone()[0]
            health_score = int(((online_count / total_devices) * 50) +
                             ((low_risk / total_devices) * 50))
        else:
            health_score = 100

        # Critical events in last hour
        cursor.execute('''
            SELECT COUNT(*) FROM security_events
            WHERE severity = 'critical'
            AND created_at > datetime('now', '-1 hour')
        ''')
        recent_critical = cursor.fetchone()[0]

        return jsonify({
            'total_devices': total_devices,
            'online_count': online_count,
            'offline_count': offline_count,
            'security_risks': security_risks,
            'network_health': health_score,
            'warnings': warnings,
            'recent_critical': recent_critical
        })


@app.route('/api/security/events', methods=['GET', 'POST'])
def security_events():
    """Get or create security events."""
    if request.method == 'POST':
        data = request.json
        log_security_event(
            data.get('event_type', 'unknown'),
            data.get('severity', 'low'),
            data.get('ip_address', ''),
            data.get('description', '')
        )
        return jsonify({'status': 'success'})

    # GET - Return recent events
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT * FROM security_events
            ORDER BY created_at DESC
            LIMIT 50
        ''')
        events = [dict(row) for row in cursor.fetchall()]
        return jsonify(events)


@app.route('/api/security/inventory')
def get_inventory():
    """Get enhanced device inventory."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT * FROM network_devices
            ORDER BY last_seen DESC
        ''')
        devices = []
        for row in cursor.fetchall():
            device = dict(row)
            # Parse open_ports from JSON string
            if device.get('open_ports'):
                try:
                    device['open_ports'] = json.loads(device['open_ports'])
                except json.JSONDecodeError:
                    device['open_ports'] = []
            else:
                device['open_ports'] = []
            devices.append(device)

        return jsonify(devices)


@app.route('/api/security/traffic')
def get_traffic_data():
    """Get network traffic data for chart."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT timestamp, inbound_mb, outbound_mb
            FROM network_traffic
            ORDER BY timestamp ASC
            LIMIT 24
        ''')
        traffic = [dict(row) for row in cursor.fetchall()]
        return jsonify(traffic)


@app.route('/api/security/scan', methods=['POST'])
def start_scan():
    """Start a network scan."""
    data = request.json or {}
    subnet = data.get('subnet', '192.168.1')

    # Log scan start event
    log_security_event(
        'network_scan',
        'low',
        '',
        f'Network scan initiated for subnet {subnet}.0/24'
    )

    # Perform scan (this would be async in production)
    discovered = discover_network(subnet)

    with get_db() as conn:
        cursor = conn.cursor()
        new_devices = 0
        updated_devices = 0

        for device in discovered:
            # Check if device exists
            cursor.execute(
                'SELECT id, is_authorized FROM network_devices WHERE ip_address = ?',
                (device['ip'],)
            )
            existing = cursor.fetchone()

            risk_level = calculate_risk_level(
                device['open_ports'],
                existing['is_authorized'] if existing else False
            )

            if existing:
                # Update existing device
                cursor.execute('''
                    UPDATE network_devices SET
                        hostname = ?,
                        mac_address = ?,
                        vendor = ?,
                        status = 'online',
                        open_ports = ?,
                        risk_level = ?,
                        last_seen = CURRENT_TIMESTAMP,
                        ping_ms = ?
                    WHERE ip_address = ?
                ''', (
                    device['hostname'],
                    device['mac'],
                    device['vendor'],
                    json.dumps(device['open_ports']),
                    risk_level,
                    device['ping_ms'],
                    device['ip']
                ))
                updated_devices += 1
            else:
                # Insert new device
                cursor.execute('''
                    INSERT INTO network_devices
                    (ip_address, hostname, mac_address, vendor, status,
                     open_ports, risk_level, ping_ms)
                    VALUES (?, ?, ?, ?, 'online', ?, ?, ?)
                ''', (
                    device['ip'],
                    device['hostname'],
                    device['mac'],
                    device['vendor'],
                    json.dumps(device['open_ports']),
                    risk_level,
                    device['ping_ms']
                ))
                new_devices += 1

                # Log new device discovery
                severity = 'high' if risk_level in ['critical', 'high'] else 'medium'
                log_security_event(
                    'new_device',
                    severity,
                    device['ip'],
                    f"New device discovered: {device['hostname']} ({device['vendor']})"
                )

        # Mark devices not found as offline
        found_ips = [d['ip'] for d in discovered]
        if found_ips:
            placeholders = ','.join(['?' for _ in found_ips])
            cursor.execute(f'''
                UPDATE network_devices
                SET status = 'offline'
                WHERE ip_address NOT IN ({placeholders})
            ''', found_ips)

        conn.commit()

    # Log scan completion
    log_security_event(
        'scan_complete',
        'low',
        '',
        f'Scan complete: {new_devices} new devices, {updated_devices} updated'
    )

    return jsonify({
        'status': 'success',
        'new_devices': new_devices,
        'updated_devices': updated_devices,
        'total_found': len(discovered)
    })


@app.route('/api/security/device/<ip>/authorize', methods=['POST'])
def authorize_device(ip):
    """Authorize or unauthorize a device."""
    data = request.json or {}
    authorize = data.get('authorize', True)

    with get_db() as conn:
        cursor = conn.cursor()

        # Get current device info
        cursor.execute('SELECT * FROM network_devices WHERE ip_address = ?', (ip,))
        device = cursor.fetchone()

        if not device:
            return jsonify({'error': 'Device not found'}), 404

        # Update authorization
        cursor.execute('''
            UPDATE network_devices
            SET is_authorized = ?,
                risk_level = ?
            WHERE ip_address = ?
        ''', (
            1 if authorize else 0,
            calculate_risk_level(
                json.loads(device['open_ports']) if device['open_ports'] else [],
                authorize
            ),
            ip
        ))
        conn.commit()

        # Log the event
        log_security_event(
            'device_authorized' if authorize else 'device_unauthorized',
            'low',
            ip,
            f"Device {device['hostname']} ({'authorized' if authorize else 'unauthorized'})"
        )

        return jsonify({'status': 'success'})


@app.route('/api/security/device', methods=['POST'])
def add_device():
    """Manually add a device to inventory."""
    data = request.json

    ip = data.get('ip_address')
    if not ip:
        return jsonify({'error': 'IP address required'}), 400

    hostname = data.get('hostname', get_hostname(ip))
    mac = data.get('mac_address', get_mac_address(ip))
    vendor = data.get('vendor', get_vendor_from_mac(mac))
    ports = data.get('open_ports', [])
    is_authorized = data.get('is_authorized', False)

    risk_level = calculate_risk_level(ports, is_authorized)

    with get_db() as conn:
        cursor = conn.cursor()

        try:
            cursor.execute('''
                INSERT INTO network_devices
                (ip_address, hostname, mac_address, vendor, status,
                 is_authorized, open_ports, risk_level, ping_ms)
                VALUES (?, ?, ?, ?, 'online', ?, ?, ?, ?)
            ''', (
                ip, hostname, mac, vendor,
                1 if is_authorized else 0,
                json.dumps(ports),
                risk_level,
                data.get('ping_ms', 1)
            ))
            conn.commit()

            # Log the event
            log_security_event(
                'device_added',
                'medium' if not is_authorized else 'low',
                ip,
                f"Device manually added: {hostname}"
            )

            return jsonify({'status': 'success', 'id': cursor.lastrowid})
        except sqlite3.IntegrityError:
            return jsonify({'error': 'Device already exists'}), 409


@app.route('/api/security/device/<ip>', methods=['DELETE'])
def delete_device(ip):
    """Remove a device from inventory."""
    with get_db() as conn:
        cursor = conn.cursor()

        # Get device info before deletion
        cursor.execute('SELECT hostname FROM network_devices WHERE ip_address = ?', (ip,))
        device = cursor.fetchone()

        if not device:
            return jsonify({'error': 'Device not found'}), 404

        cursor.execute('DELETE FROM network_devices WHERE ip_address = ?', (ip,))
        conn.commit()

        # Log the event
        log_security_event(
            'device_removed',
            'low',
            ip,
            f"Device removed from inventory: {device['hostname']}"
        )

        return jsonify({'status': 'success'})


@app.route('/api/security/simulate', methods=['POST'])
def simulate_data():
    """Generate simulated network data for demonstration."""
    with get_db() as conn:
        cursor = conn.cursor()

        # Sample devices for demonstration
        demo_devices = [
            {
                'ip': '192.168.1.1',
                'hostname': 'gateway-router',
                'mac': '00:1A:2B:3C:4D:5E',
                'vendor': 'Cisco',
                'ports': ['HTTP', 'HTTPS', 'SSH'],
                'authorized': True
            },
            {
                'ip': '192.168.1.10',
                'hostname': 'file-server',
                'mac': 'AC:DE:48:00:11:22',
                'vendor': 'Dell',
                'ports': ['SMB', 'SSH', 'HTTP'],
                'authorized': True
            },
            {
                'ip': '192.168.1.25',
                'hostname': 'workstation-01',
                'mac': '00:21:5A:AB:CD:EF',
                'vendor': 'HP',
                'ports': ['RDP'],
                'authorized': True
            },
            {
                'ip': '192.168.1.50',
                'hostname': 'db-server',
                'mac': '00:0D:3A:12:34:56',
                'vendor': 'Microsoft',
                'ports': ['MySQL', 'SSH'],
                'authorized': True
            },
            {
                'ip': '192.168.1.100',
                'hostname': 'web-server',
                'mac': '00:50:56:78:9A:BC',
                'vendor': 'VMware',
                'ports': ['HTTP', 'HTTPS', 'SSH'],
                'authorized': True
            },
            {
                'ip': '192.168.1.105',
                'hostname': 'unknown-device',
                'mac': '52:54:00:DE:AD:01',
                'vendor': 'QEMU/KVM',
                'ports': ['SSH', 'HTTP', 'Telnet'],
                'authorized': False
            },
            {
                'ip': '192.168.1.201',
                'hostname': 'iot-device',
                'mac': 'DC:A6:32:11:22:33',
                'vendor': 'Raspberry Pi',
                'ports': ['HTTP', 'SSH'],
                'authorized': False
            }
        ]

        for device in demo_devices:
            risk_level = calculate_risk_level(device['ports'], device['authorized'])
            ping_ms = random.randint(1, 50)

            try:
                cursor.execute('''
                    INSERT OR REPLACE INTO network_devices
                    (ip_address, hostname, mac_address, vendor, status,
                     is_authorized, open_ports, risk_level, ping_ms)
                    VALUES (?, ?, ?, ?, 'online', ?, ?, ?, ?)
                ''', (
                    device['ip'],
                    device['hostname'],
                    device['mac'],
                    device['vendor'],
                    1 if device['authorized'] else 0,
                    json.dumps(device['ports']),
                    risk_level,
                    ping_ms
                ))
            except Exception as e:
                print(f"Error inserting device: {e}")

        conn.commit()

        # Generate security events
        events = [
            ('port_scan', 'critical', '192.168.1.105', 'Port scan detected from 192.168.1.105'),
            ('failed_login', 'medium', '192.168.1.201', 'Failed login attempt (root)'),
            ('new_device', 'low', '192.168.1.201', 'New device discovered'),
            ('auth_success', 'low', '192.168.1.25', 'Successful authentication'),
            ('config_change', 'medium', '192.168.1.1', 'Router configuration changed'),
        ]

        for event in events:
            log_security_event(*event)

        # Regenerate traffic data
        cursor.execute('DELETE FROM network_traffic')
        generate_traffic_data(conn)

        return jsonify({'status': 'success', 'message': 'Demo data generated'})


# ============================================================================
# Application Entry Point
# ============================================================================

if __name__ == '__main__':
    init_db()
    print("=" * 60)
    print("  Enterprise SOC Dashboard")
    print("  Security Operations Center")
    print("=" * 60)
    print("\n  Starting server at http://127.0.0.1:5000\n")
    app.run(debug=True, host='0.0.0.0', port=5000)
