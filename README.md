# Enterprise SOC Dashboard

A professional-grade Security Operations Center (SOC) dashboard with real-time network monitoring, device discovery, and security event logging.

![SOC Dashboard](https://img.shields.io/badge/status-production-green) ![Python](https://img.shields.io/badge/python-3.8+-blue) ![Flask](https://img.shields.io/badge/flask-3.0+-lightgrey)

## Features

### KPI Dashboard
- **Total Inventory** - Device count with online/offline status
- **Security Risks** - Count of unauthorized and high-risk devices
- **Network Health** - Overall network health percentage
- **Warnings** - Medium risk alert count

### Network Traffic Chart
- Real-time visualization of inbound vs outbound traffic
- Interactive Chart.js implementation with tooltips
- 24-hour traffic history

### Security Events Feed
- Real-time scrolling event log
- Severity-based color coding (Critical/High/Medium/Low)
- Automatic logging for device discovery and authorization changes

### Enhanced Device Inventory
| Column | Description |
|--------|-------------|
| Status | Online/Offline indicator with visual badge |
| Hostname | Device name with forensic tooltip (MAC, vendor, first/last seen) |
| IP Address | Network address |
| MAC Address | Hardware address with vendor detection |
| Vendor | Device manufacturer (auto-detected) |
| Ping | Response time with color coding |
| Trust | Authorized/Untrusted status |
| Actions | Authorize/Delete controls |

### Visual Enhancements
- **Toast Notifications** - Slide-in alerts for all actions
- **Scanning Animation** - Pulsing indicator during network scans
- **Forensic Tooltips** - Hover for detailed device information
- **Search** - Filter inventory by IP, hostname, MAC, or vendor

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/Security-Operations-Center-SOC-.git
cd Security-Operations-Center-SOC-

# Install dependencies
pip install -r requirements.txt

# Run the application
python app.py
```

Visit `http://localhost:5000` in your browser.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/security/stats` | GET | Dashboard KPI statistics |
| `/api/security/events` | GET/POST | Security event log |
| `/api/security/inventory` | GET | Device inventory with details |
| `/api/security/traffic` | GET | Network traffic data for chart |
| `/api/security/scan` | POST | Start network discovery scan |
| `/api/security/device` | POST | Add device manually |
| `/api/security/device/<ip>` | DELETE | Remove device |
| `/api/security/device/<ip>/authorize` | POST | Toggle device authorization |
| `/api/security/simulate` | POST | Generate demo data |

## Database Schema

```sql
-- Network devices
network_devices (
  ip_address, hostname, mac_address, vendor,
  status, is_authorized, open_ports, risk_level,
  first_seen, last_seen, ping_ms, notes
)

-- Security events log
security_events (
  event_type, severity, ip_address,
  description, created_at
)

-- Network traffic history
network_traffic (
  timestamp, inbound_mb, outbound_mb
)
```

## Real-Time Features

- **Port Scanning** - Detects open ports (HTTP, SSH, RDP, Telnet, etc.)
- **Vendor Detection** - Identifies device manufacturer from MAC address
- **Risk Assessment** - Auto-calculates risk level based on ports and authorization
- **Live Updates** - Dashboard refreshes every 30 seconds

## Technology Stack

- **Backend**: Python Flask
- **Database**: SQLite
- **Frontend**: Vanilla JavaScript, Chart.js
- **Styling**: Custom CSS (Dark theme matching enterprise design)

## License

MIT License
