#!/usr/bin/env python3
"""
SOC Dashboard - Standalone Security Operations Center
Uses SQLite for local persistence - no external database required
"""

import os
import json
import hashlib
import socket
import sqlite3
import subprocess
import platform
import urllib.request
from functools import wraps
from flask import Flask, render_template, jsonify, request, session, redirect
from datetime import datetime
import random

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'soc-dashboard-secret-key-2025')

# SQLite database file
DB_FILE = 'soc_dashboard.db'

# Default users (admin:admin123)
DEFAULT_USERS = [
    {
        'username': 'admin',
        'password_hash': hashlib.sha256('admin123'.encode()).hexdigest(),
        'role': 'admin',
        'display_name': 'SOC Admin'
    },
    {
        'username': 'analyst',
        'password_hash': hashlib.sha256('analyst123'.encode()).hexdigest(),
        'role': 'viewer',
        'display_name': 'Security Analyst'
    }
]

# Demo devices to populate on first run
DEMO_DEVICES = [
    {'ip': '192.168.1.1', 'hostname': 'gateway-router', 'mac': 'AA:BB:CC:DD:EE:01', 'vendor': 'Cisco', 'ports': '22,80,443', 'authorized': 1, 'risk': 'low'},
    {'ip': '192.168.1.10', 'hostname': 'web-server-01', 'mac': 'AA:BB:CC:DD:EE:10', 'vendor': 'Dell', 'ports': '22,80,443,8080', 'authorized': 1, 'risk': 'low'},
    {'ip': '192.168.1.20', 'hostname': 'db-server-prod', 'mac': 'AA:BB:CC:DD:EE:20', 'vendor': 'HP', 'ports': '22,3306,5432', 'authorized': 1, 'risk': 'medium'},
    {'ip': '192.168.1.50', 'hostname': 'workstation-admin', 'mac': 'AA:BB:CC:DD:EE:50', 'vendor': 'Lenovo', 'ports': '22,3389', 'authorized': 1, 'risk': 'low'},
    {'ip': '192.168.1.105', 'hostname': 'unknown-device', 'mac': 'FF:FF:FF:AA:BB:CC', 'vendor': 'Unknown', 'ports': '22,23,80', 'authorized': 0, 'risk': 'critical'},
    {'ip': '192.168.1.200', 'hostname': 'nas-storage', 'mac': 'AA:BB:CC:DD:EE:C8', 'vendor': 'Synology', 'ports': '22,80,443,445', 'authorized': 1, 'risk': 'medium'},
    {'ip': '192.168.1.201', 'hostname': 'printer-office', 'mac': 'AA:BB:CC:DD:EE:C9', 'vendor': 'HP', 'ports': '80,9100', 'authorized': 1, 'risk': 'low'},
]

DEMO_EVENTS = [
    {'type': 'port_scan', 'severity': 'critical', 'ip': '192.168.1.105', 'desc': 'Port scan detected from 192.168.1.105'},
    {'type': 'failed_login', 'severity': 'high', 'ip': '192.168.1.201', 'desc': 'Failed SSH login attempt (root)'},
    {'type': 'new_device', 'severity': 'medium', 'ip': '192.168.1.201', 'desc': 'New device discovered on network'},
    {'type': 'device_authorized', 'severity': 'low', 'ip': '192.168.1.50', 'desc': 'Device authorized by admin'},
]

# --- DATABASE FUNCTIONS ---
def get_db():
    """Get SQLite database connection."""
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initialize SQLite database with tables."""
    conn = get_db()
    cur = conn.cursor()
    
    # Users table
    cur.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT DEFAULT 'viewer',
            display_name TEXT
        )
    ''')
    
    # Network devices table
    cur.execute('''
        CREATE TABLE IF NOT EXISTS network_devices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ip_address TEXT UNIQUE NOT NULL,
            hostname TEXT DEFAULT 'Unknown',
            mac_address TEXT,
            vendor TEXT DEFAULT 'Unknown',
            status TEXT DEFAULT 'unknown',
            is_authorized INTEGER DEFAULT 0,
            open_ports TEXT DEFAULT '',
            risk_level TEXT DEFAULT 'low',
            first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            notes TEXT
        )
    ''')
    
    # Security events table
    cur.execute('''
        CREATE TABLE IF NOT EXISTS security_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_type TEXT NOT NULL,
            severity TEXT DEFAULT 'low',
            ip_address TEXT,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    conn.commit()
    
    # Check if users exist, if not add defaults
    cur.execute("SELECT COUNT(*) as count FROM users")
    if cur.fetchone()['count'] == 0:
        print("[DB] Adding default users...")
        for u in DEFAULT_USERS:
            cur.execute('''
                INSERT INTO users (username, password_hash, role, display_name)
                VALUES (?, ?, ?, ?)
            ''', (u['username'], u['password_hash'], u['role'], u['display_name']))
        conn.commit()
        print("[DB] Default users added: admin/admin123, analyst/analyst123")
    
    # Check if devices exist, if not add demo data
    cur.execute("SELECT COUNT(*) as count FROM network_devices")
    if cur.fetchone()['count'] == 0:
        print("[DB] Adding demo devices...")
        for d in DEMO_DEVICES:
            cur.execute('''
                INSERT INTO network_devices (ip_address, hostname, mac_address, vendor, open_ports, is_authorized, risk_level, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'up')
            ''', (d['ip'], d['hostname'], d['mac'], d['vendor'], d['ports'], d['authorized'], d['risk']))
        conn.commit()
        print(f"[DB] Added {len(DEMO_DEVICES)} demo devices")
    
    # Check if events exist, if not add demo events
    cur.execute("SELECT COUNT(*) as count FROM security_events")
    if cur.fetchone()['count'] == 0:
        print("[DB] Adding demo security events...")
        for e in DEMO_EVENTS:
            cur.execute('''
                INSERT INTO security_events (event_type, severity, ip_address, description)
                VALUES (?, ?, ?, ?)
            ''', (e['type'], e['severity'], e['ip'], e['desc']))
        conn.commit()
        print(f"[DB] Added {len(DEMO_EVENTS)} demo events")
    
    conn.close()
    print("[DB] SQLite database initialized successfully")

# --- NETWORK SCANNING HELPERS ---

# Global OUI database cache
OUI_DATABASE = {}

def load_oui_database():
    """Load MAC OUI database for vendor identification"""
    global OUI_DATABASE
    oui_file = 'oui.txt'

    # Download if not exists
    if not os.path.exists(oui_file):
        try:
            print("[INIT] Downloading MAC OUI database...")
            url = 'https://standards-oui.ieee.org/oui/oui.txt'
            urllib.request.urlretrieve(url, oui_file)
            print("[INIT] OUI database downloaded successfully")
        except Exception as e:
            print(f"[INIT] Could not download OUI database: {e}")
            return

    # Parse OUI file
    try:
        with open(oui_file, 'r', encoding='utf-8', errors='ignore') as f:
            for line in f:
                if '(hex)' in line:
                    parts = line.split('(hex)')
                    if len(parts) == 2:
                        oui = parts[0].strip().replace('-', '').upper()
                        vendor = parts[1].strip()
                        OUI_DATABASE[oui] = vendor
        print(f"[INIT] Loaded {len(OUI_DATABASE)} MAC vendors")
    except Exception as e:
        print(f"[INIT] Error loading OUI database: {e}")

def get_vendor_from_mac(mac):
    """Lookup vendor from MAC address OUI"""
    if not mac or mac == 'Unknown' or ':' not in mac:
        return 'Unknown'

    try:
        # Extract first 3 bytes (OUI)
        oui = mac.replace(':', '').replace('-', '').upper()[:6]
        return OUI_DATABASE.get(oui, 'Unknown')
    except:
        return 'Unknown'

def get_mac_from_arp(ip):
    """Get MAC address from ARP cache"""
    try:
        system = platform.system()

        # Ping first to populate ARP cache
        if system == 'Windows':
            subprocess.run(['ping', '-n', '1', '-w', '1000', ip],
                          stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        else:  # Linux/Mac
            subprocess.run(['ping', '-c', '1', '-W', '1', ip],
                          stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        # Read ARP cache
        if system == 'Windows':
            result = subprocess.run(['arp', '-a', ip], capture_output=True, text=True)
        else:  # Linux/Mac
            result = subprocess.run(['arp', '-n', ip], capture_output=True, text=True)

        # Parse output for MAC address
        for line in result.stdout.split('\n'):
            if ip in line:
                # Look for MAC address pattern
                parts = line.split()
                for part in parts:
                    # MAC address formats: AA:BB:CC:DD:EE:FF or AA-BB-CC-DD-EE-FF
                    if (':' in part or '-' in part) and len(part.replace(':', '').replace('-', '')) == 12:
                        mac = part.replace('-', ':').upper()
                        # Validate it's not incomplete
                        if mac.count(':') == 5:
                            return mac
    except Exception as e:
        print(f"[SCAN] Error getting MAC for {ip}: {e}")

    return None

def get_enhanced_hostname(ip):
    """Get hostname with multiple fallback methods"""
    hostname = None

    # Method 1: DNS reverse lookup
    try:
        hostname = socket.gethostbyaddr(ip)[0]
        if hostname and hostname != ip:
            return hostname
    except:
        pass

    # Method 2: Try NetBIOS (Windows) - via nmblookup if available
    if not hostname:
        try:
            result = subprocess.run(['nmblookup', '-A', ip],
                                  capture_output=True, text=True, timeout=2)
            for line in result.stdout.split('\n'):
                if '<00>' in line and 'GROUP' not in line:
                    parts = line.split()
                    if parts:
                        hostname = parts[0].strip()
                        break
        except:
            pass

    # Method 3: Try nbtstat on Windows
    if not hostname and platform.system() == 'Windows':
        try:
            result = subprocess.run(['nbtstat', '-A', ip],
                                  capture_output=True, text=True, timeout=2)
            for line in result.stdout.split('\n'):
                if '<00>' in line and 'UNIQUE' in line:
                    hostname = line.split()[0].strip()
                    break
        except:
            pass

    # Fallback: Use IP-based naming
    if not hostname:
        hostname = f"host-{ip.split('.')[-1]}"

    return hostname

# --- AUTH HELPERS ---
def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password, password_hash):
    return hash_password(password) == password_hash

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        # DEVELOPMENT MODE: Allow unauthenticated access for Firebase frontend
        # In production, implement Firebase token verification
        if 'user' not in session:
            # Create a mock user session for development
            session['user'] = {
                'username': 'firebase_user',
                'role': 'admin',
                'display_name': 'Firebase User'
            }
        return f(*args, **kwargs)
    return decorated

def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        # DEVELOPMENT MODE: Allow unauthenticated access for Firebase frontend
        # In production, implement Firebase token verification
        if 'user' not in session:
            # Create a mock admin session for development
            session['user'] = {
                'username': 'firebase_user',
                'role': 'admin',
                'display_name': 'Firebase User'
            }
        elif session['user'].get('role') != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        return f(*args, **kwargs)
    return decorated

# --- ROUTES ---
@app.route('/login')
def login_page():
    if 'user' in session:
        return redirect('/')
    return render_template('login.html')

@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.json
    username = data.get('username', '').strip()
    password = data.get('password', '')
    
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM users WHERE username = ?", (username,))
    user = cur.fetchone()
    conn.close()
    
    if user and verify_password(password, user['password_hash']):
        session['user'] = {
            'username': user['username'],
            'role': user['role'],
            'display_name': user['display_name']
        }
        return jsonify({'status': 'success', 'user': session['user']})
    return jsonify({'error': 'Invalid credentials'}), 401

@app.route('/api/logout', methods=['POST'])
def api_logout():
    session.pop('user', None)
    return jsonify({'status': 'success'})

@app.route('/api/me')
def api_me():
    if 'user' in session:
        return jsonify(session['user'])
    return jsonify({'error': 'Not authenticated'}), 401

@app.route('/')
def index():
    if 'user' not in session:
        return redirect('/login')
    return redirect('/security')

@app.route('/security')
def security_dashboard():
    if 'user' not in session:
        return redirect('/login')
    return render_template('security.html')

# --- SOC API ENDPOINTS ---
@app.route('/api/security/inventory')
@login_required
def api_security_inventory():
    """Get all network devices."""
    conn = get_db()
    cur = conn.cursor()
    cur.execute('''
        SELECT ip_address, hostname, mac_address, vendor, status, 
               is_authorized, open_ports, risk_level, last_seen, first_seen, notes
        FROM network_devices
        ORDER BY last_seen DESC
    ''')
    devices = cur.fetchall()
    conn.close()
    
    result = []
    for d in devices:
        ports = d['open_ports'] or ''
        port_list = [p.strip() for p in ports.split(',') if p.strip()]
        
        result.append({
            'ip_address': d['ip_address'],
            'hostname': d['hostname'] or 'Unknown',
            'mac_address': d['mac_address'] or '',
            'vendor': d['vendor'] or 'Unknown',
            'status': d['status'] or 'unknown',
            'is_authorized': d['is_authorized'],
            'open_ports': port_list,
            'risk_level': d['risk_level'] or 'low',
            'last_seen': d['last_seen'] or 'Unknown',
            'first_seen': d['first_seen'] or 'Unknown',
            'notes': d['notes'] or ''
        })
    
    return jsonify(result)

@app.route('/api/security/stats')
@login_required
def api_security_stats():
    """Get SOC dashboard statistics."""
    conn = get_db()
    cur = conn.cursor()
    
    cur.execute('SELECT COUNT(*) as total FROM network_devices')
    total = cur.fetchone()['total']
    
    cur.execute('SELECT COUNT(*) as count FROM network_devices WHERE is_authorized = 0')
    unauthorized = cur.fetchone()['count']
    
    cur.execute("SELECT COUNT(*) as count FROM network_devices WHERE risk_level = 'critical' OR risk_level = 'high'")
    security_risks = cur.fetchone()['count']
    
    cur.execute("SELECT COUNT(*) as count FROM network_devices WHERE risk_level = 'medium'")
    warnings = cur.fetchone()['count']
    
    cur.execute("SELECT COUNT(*) as count FROM network_devices WHERE status = 'up'")
    online = cur.fetchone()['count']
    
    conn.close()
    
    network_health = int((online / total * 100)) if total > 0 else 100
    
    return jsonify({
        'total': total,
        'unauthorized': unauthorized,
        'authorized': total - unauthorized,
        'security_risks': security_risks,
        'warnings': warnings,
        'network_health': network_health,
        'online': online,
        'offline': total - online
    })

@app.route('/api/security/events')
@login_required
def api_security_events():
    """Get recent security events."""
    conn = get_db()
    cur = conn.cursor()
    cur.execute('''
        SELECT id, event_type, severity, ip_address, description, created_at
        FROM security_events
        ORDER BY created_at DESC
        LIMIT 50
    ''')
    events = cur.fetchall()
    conn.close()
    
    result = []
    for e in events:
        created_at = e['created_at']
        if created_at:
            try:
                dt = datetime.strptime(created_at, '%Y-%m-%d %H:%M:%S')
                time_str = dt.strftime('%H:%M %p')
            except:
                time_str = str(created_at)[-8:]
        else:
            time_str = 'Unknown'
        
        result.append({
            'id': e['id'],
            'event_type': e['event_type'],
            'severity': e['severity'],
            'ip_address': e['ip_address'] or '',
            'description': e['description'] or '',
            'time': time_str
        })
    
    return jsonify(result)

@app.route('/api/security/events', methods=['POST'])
@login_required
def api_log_security_event():
    """Log a new security event."""
    data = request.json
    event_type = data.get('event_type', 'info')
    severity = data.get('severity', 'low')
    ip_address = data.get('ip_address', '')
    description = data.get('description', '')
    
    conn = get_db()
    cur = conn.cursor()
    cur.execute('''
        INSERT INTO security_events (event_type, severity, ip_address, description)
        VALUES (?, ?, ?, ?)
    ''', (event_type, severity, ip_address, description))
    conn.commit()
    conn.close()
    
    return jsonify({'status': 'success'}), 201

@app.route('/api/security/authorize/<ip>', methods=['POST'])
@admin_required
def api_authorize_device(ip):
    """Authorize a device by IP address."""
    conn = get_db()
    cur = conn.cursor()
    
    cur.execute('''
        UPDATE network_devices 
        SET is_authorized = 1, 
            notes = COALESCE(notes, '') || ' [Authorized by ' || ? || ' on ' || ? || ']'
        WHERE ip_address = ?
    ''', (session['user']['username'], datetime.now().strftime('%Y-%m-%d %H:%M'), ip))
    
    updated = cur.rowcount > 0
    conn.commit()
    
    # Log the authorization event
    if updated:
        cur.execute('''
            INSERT INTO security_events (event_type, severity, ip_address, description)
            VALUES ('device_authorized', 'low', ?, ?)
        ''', (ip, f'Device {ip} authorized by {session["user"]["username"]}'))
        conn.commit()
    
    conn.close()
    
    if updated:
        print(f"[SOC] Device {ip} authorized by {session['user']['username']}")
        return jsonify({'status': 'success'})
    return jsonify({'error': 'Device not found'}), 404

@app.route('/api/security/add-device', methods=['POST'])
@admin_required
def api_add_device():
    """Manually add a device to the inventory."""
    data = request.json
    ip_address = data.get('ip_address', '').strip()
    hostname = data.get('hostname', 'Unknown').strip()
    mac_address = data.get('mac_address', '').strip()
    vendor = data.get('vendor', 'Unknown').strip()
    open_ports = data.get('open_ports', '').strip()
    is_authorized = 1 if data.get('is_authorized', False) else 0
    
    if not ip_address:
        return jsonify({'error': 'IP address required'}), 400
    
    # Determine risk level based on ports
    risk_level = 'low'
    if open_ports:
        risky_ports = ['22', '23', '3389', '445', '21']
        if any(p.strip() in risky_ports for p in open_ports.split(',')):
            risk_level = 'medium'
        if '23' in open_ports:  # Telnet is high risk
            risk_level = 'high'
    
    conn = get_db()
    cur = conn.cursor()
    
    try:
        cur.execute('''
            INSERT OR REPLACE INTO network_devices 
            (ip_address, hostname, mac_address, vendor, open_ports, risk_level, status, is_authorized, first_seen, last_seen)
            VALUES (?, ?, ?, ?, ?, ?, 'up', ?, datetime('now'), datetime('now'))
        ''', (ip_address, hostname, mac_address, vendor, open_ports, risk_level, is_authorized))
        
        # Log security event
        cur.execute('''
            INSERT INTO security_events (event_type, severity, ip_address, description)
            VALUES ('device_added', 'low', ?, ?)
        ''', (ip_address, f'Device added: {hostname} ({ip_address})'))
        
        conn.commit()
        conn.close()
        
        print(f"[SOC] Device {ip_address} added by {session['user']['username']}")
        return jsonify({'status': 'success'}), 201
    except Exception as e:
        conn.close()
        print(f"[SOC] Error adding device: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/security/scan', methods=['POST'])
@admin_required
def api_network_scan():
    """Perform real network scan on local subnet."""
    try:
        # Get local IP to determine subnet
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
        
        subnet = '.'.join(local_ip.split('.')[:-1])
        print(f"[SOC] Starting network scan on subnet {subnet}.0/24")
        
        discovered = []
        common_ports = [22, 23, 80, 443, 445, 3389, 8080, 3306, 5432, 21, 25, 53, 110, 143]
        
        # Scan limited range for speed (1-30)
        for i in range(1, 31):
            ip = f"{subnet}.{i}"
            open_ports = []
            
            for port in common_ports:
                try:
                    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                    sock.settimeout(0.15)  # Fast timeout
                    result = sock.connect_ex((ip, port))
                    if result == 0:
                        open_ports.append(str(port))
                    sock.close()
                except:
                    pass
            
            if open_ports:
                # Get hostname with enhanced methods
                hostname = get_enhanced_hostname(ip)

                # Get real MAC address from ARP
                mac = get_mac_from_arp(ip)
                if not mac:
                    # Fallback to random MAC if ARP fails
                    mac = ':'.join([f'{random.randint(0, 255):02X}' for _ in range(6)])

                # Get vendor from MAC address OUI
                vendor = get_vendor_from_mac(mac)

                # Fallback vendor guessing if OUI lookup fails
                if vendor == 'Unknown':
                    if '80' in open_ports and '443' in open_ports:
                        vendor = 'Web Server'
                    elif '3306' in open_ports:
                        vendor = 'MySQL Server'
                    elif '5432' in open_ports:
                        vendor = 'PostgreSQL'
                    elif '22' in open_ports and len(open_ports) == 1:
                        vendor = 'Linux/Unix'
                    elif '3389' in open_ports:
                        vendor = 'Windows'

                # Determine risk level
                risky_ports = ['22', '23', '3389', '445', '21']
                risk = 'low'
                if any(p in open_ports for p in risky_ports):
                    risk = 'medium'
                if '23' in open_ports:  # Telnet is high risk
                    risk = 'high'
                
                device = {
                    'ip_address': ip,
                    'hostname': hostname[:50],
                    'mac_address': mac,
                    'vendor': vendor,
                    'open_ports': ','.join(open_ports),
                    'risk_level': risk,
                    'status': 'up'
                }
                discovered.append(device)
                
                # Save to database
                conn = get_db()
                cur = conn.cursor()
                cur.execute('''
                    INSERT OR REPLACE INTO network_devices 
                    (ip_address, hostname, mac_address, vendor, open_ports, risk_level, status, is_authorized, first_seen, last_seen)
                    VALUES (?, ?, ?, ?, ?, ?, 'up', 0, 
                            COALESCE((SELECT first_seen FROM network_devices WHERE ip_address = ?), datetime('now')),
                            datetime('now'))
                ''', (ip, hostname[:50], mac, vendor, ','.join(open_ports), risk, ip))
                conn.commit()
                conn.close()
        
        # Log scan event
        conn = get_db()
        cur = conn.cursor()
        cur.execute('''
            INSERT INTO security_events (event_type, severity, ip_address, description)
            VALUES ('network_scan', 'low', ?, ?)
        ''', (local_ip, f'Network scan completed: {len(discovered)} devices found on {subnet}.0/24'))
        conn.commit()
        conn.close()
        
        print(f"[SOC] Scan complete. Discovered {len(discovered)} devices")
        return jsonify({
            'status': 'success',
            'discovered': len(discovered),
            'subnet': f"{subnet}.0/24",
            'devices': discovered
        })
    except Exception as e:
        print(f"[SOC] Scan error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/traffic')
@login_required
def api_traffic_data():
    """Return network traffic data for charts."""
    # Generate realistic traffic pattern (in production, this would come from SNMP or packet capture)
    import math
    labels = [f"{str(h).zfill(2)}:00" for h in range(24)]
    current_hour = datetime.now().hour
    
    # Create realistic traffic patterns with peaks and valleys
    inbound = []
    outbound = []
    for h in range(24):
        # Base traffic with business hours pattern
        base = 200 if 8 <= h <= 18 else 100
        
        # Add variation
        variation = random.randint(-50, 50)
        peak_modifier = 1.5 if h in [9, 14, 16] else 1.0  # Peak hours
        
        inbound.append(int((base + variation) * peak_modifier))
        outbound.append(int((base + variation + random.randint(-30, 30)) * peak_modifier * 1.2))
    
    return jsonify({
        'labels': labels,
        'inbound': inbound,
        'outbound': outbound
    })

# Enable CORS for React frontend
@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
    response.headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,DELETE,OPTIONS'
    return response

# --- STARTUP ---
if __name__ == '__main__':
    print("\n" + "="*50)
    print(" SOC DASHBOARD - Security Operations Center")
    print("="*50)
    print("\n[INIT] Initializing SQLite database...")
    init_db()
    print("\n[INIT] Loading MAC vendor database...")
    load_oui_database()
    print("\n[START] Server starting...")
    print(f" Open browser to: http://127.0.0.1:5001")
    print(" Login: admin / admin123")
    print("="*50 + "\n")
    app.run(debug=True, port=5001)
