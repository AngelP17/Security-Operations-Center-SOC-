# Security Operations Center (SOC) Dashboard

A professional enterprise-grade Security Operations Center dashboard built with Flask, featuring real-time network monitoring, device inventory, and security event tracking.

## Features

- **SOC Dashboard** - Enterprise command center with KPI metrics
- **Device Inventory** - Track network devices with IP, MAC, vendor, open ports
- **Security Events** - Real-time security event logging and alerting
- **Port Analysis** - Vulnerability assessment based on open ports
- **User Authentication** - Role-based access control (Admin/Viewer)
- **Password Recovery** - Secure token-based password reset

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Set environment variables
export DATABASE_URL="your_postgres_url"
export SECRET_KEY="your_secret_key"

# Run the application
python app.py
```

## Tech Stack

- **Backend**: Flask + PostgreSQL
- **Frontend**: Tailwind CSS + Chart.js
- **Authentication**: Session-based with SHA-256 password hashing

## Screenshots

The SOC Dashboard includes:
- KPI Cards (Total Inventory, Security Risks, Network Health, Warnings)
- Network Traffic Chart
- Security Events Feed
- Device Inventory Table with forensic tooltips

## License

MIT License
