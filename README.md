# ForgeSentinel

ForgeSentinel is a manufacturing-focused SOC and Asset Risk Intelligence Platform. It discovers authorized network assets, records scan observations, normalizes assets, computes explainable risk decisions, correlates incidents, generates recommendations, stores audit replay events, and optionally creates Aether OpsCenter tickets for operational response.

This is not just a dashboard — it is an operational security decision system.

## UI Architecture

ForgeSentinel uses a three-zone industrial command shell. Every module is API-backed via the FastAPI backend.

```mermaid
graph TB
    subgraph "ForgeSentinel Industrial Command UI"
        Shell[Sentinel Shell<br/>Three-Zone Layout]

        subgraph "Operations"
            CMD[Command Center<br/>/command]
            AST[Asset Intelligence<br/>/assets]
            INC[Incident Workbench<br/>/incidents/:id]
        end

        subgraph "Investigation"
            TOP[Topology Investigation<br/>/topology]
            RPL[Audit Replay<br/>/replay/:entityId]
        end

        subgraph "Output"
            RPT[Reports<br/>/reports]
            SET[Settings<br/>/settings]
        end

        Shell --> CMD
        Shell --> AST
        Shell --> INC
        Shell --> TOP
        Shell --> RPL
        Shell --> RPT
        Shell --> SET
    end

    API[FastAPI Backend<br/>localhost:8000/api] -.-> Shell
    CMD -.->|GET /api/command| API
    AST -.->|GET /api/assets| API
    INC -.->|GET /api/incidents| API
    TOP -.->|GET /api/assets, /api/incidents| API
    RPL -.->|GET /api/replay| API
```

## Data Pipeline Architecture

The backend runs a deterministic pipeline from raw scan observations to auditable risk decisions and incident correlations.

```mermaid
graph TD
    A[Authorized Scan / Import] -->|POST /api/scans/demo or /lab| B[(scan_observations)]
    B --> C[asset_service.upsert_asset]
    C --> D[(security_events)]
    D --> E[risk_engine.compute]
    E --> F[(risk_decisions)]
    F --> G[correlation_engine.correlate]
    G --> H[(incidents)]
    H --> I[recommendation_engine.generate]
    I --> J[(recommendations)]
    J --> K[(audit_records)]
    K --> L[Next.js UI<br/>GET /api/command, /assets, /incidents, /events]

    H -->|Aether Enabled| M[Aether OpsCenter<br/>Ticket Creation]
    M --> N[(aether_links)]

    style A fill:#f9f,stroke:#333,stroke-width:2px
    style L fill:#bbf,stroke:#333,stroke-width:2px
    style M fill:#9f9,stroke:#333,stroke-width:2px
```

## Core Workflows

- **Command Center**: `/command` is the real-time SOC workspace with command summary, KPI grid, prioritized risk queue, active incident panel, live event stream, exposure charts, topology preview, and scan status.
- **Asset Intelligence**: `/assets` provides object-centric asset workflows with API-backed inventory, risk decisions, triggered rules, ports, evidence, and audit trails.
- **Incident Workbench**: `/incidents/[incidentId]` shows correlated security incidents with evidence timelines, decision traces, analyst notes, ranked recommendations, and Aether ticket creation.
- **Topology**: `/topology` visualizes assets by segment using React Flow with risk rings, incident correlations, and clickable asset details.
- **Audit Replay**: `/replay/[entityId]` provides asset and incident audit replay with expandable raw JSON for explainability.
- **Reports and Settings**: `/reports` and `/settings` support evidence packages, response governance, safe demo scanning, and opt-in lab scanning controls.

## Data Sources

- **Demo mode**: `POST /api/scans/demo` writes fixture observations to the database, then runs the full normalization → risk → correlation → recommendation pipeline. Safe by default.
- **Lab mode**: `POST /api/scans/lab` performs real TCP connect checks against authorized private networks only. Requires `REAL_SCAN_ENABLED=true`, admin privileges, and a CIDR inside `SCAN_ALLOWED_CIDRS`. Public internet scanning is blocked.
- **API endpoints**: All UI data comes from `GET /api/command`, `GET /api/assets`, `GET /api/incidents`, `GET /api/events`, etc.

## Aether Integration

ForgeSentinel detects and explains security risk. Aether OpsCenter routes and governs the operational response.

Environment variables:
- `AETHER_ENABLED=false` (default) — creates a local pending AetherLink with `sync_status="disabled"`
- `AETHER_API_BASE_URL` — Aether OpsCenter API endpoint
- `AETHER_API_TOKEN` — Authentication token

When `AETHER_ENABLED=true`, ForgeSentinel sends incident payloads (title, priority, affected assets, risk score, evidence, recommendations) to Aether and stores the ticket ID and URL locally.

## Risk Engine

Deterministic scoring based on:
- Exposure score (risky ports: Telnet, RDP, SMB, Modbus, VNC, etc.)
- Authorization score (unauthorized = +35, unknown = +18)
- Asset criticality (PLC = +28, production workstation = +22)
- Event severity (recent critical/high events)
- Recency score (newly discovered assets)
- Correlation score (existing incidents)
- Uncertainty penalty (unknown/unverified owner)

Total risk score is clamped 0-100. Levels: critical (≥80), high (≥60), medium (≥40), low.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 14 App Router, React 18, TypeScript |
| Backend | FastAPI, SQLAlchemy, SQLite |
| Styling | Tailwind-compatible design tokens plus production CSS |
| State | Zustand + TanStack React Query |
| Tables | TanStack Table |
| Charts | Recharts |
| Topology | React Flow |
| Motion | Framer Motion |
| Icons | Lucide React |
| API Client | Axios in `lib/api.ts` |

## Development

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
python3 -m venv api-venv
source api-venv/bin/activate
pip install fastapi uvicorn sqlalchemy pydantic pydantic-settings httpx python-dotenv

# Run both frontend and backend
npm run dev
```

- Frontend: http://localhost:3005
- Backend API: http://localhost:8000/api

## Production Build

```bash
# Build frontend
npm run build

# Start backend
source api-venv/bin/activate
PYTHONPATH=. uvicorn apps.api.main:app --port 8000
```

## Tests

```bash
source api-venv/bin/activate
pytest tests/test_api.py -v
```

Tests cover:
- Demo scan writes assets/events/incidents to DB
- Risk engine produces critical score for unauthorized SMB/RDP asset
- Lab scan blocked when `REAL_SCAN_ENABLED=false`
- Public CIDR rejected for lab scan
- Command endpoint returns database-backed metrics
- Aether ticket creation records pending link when integration is disabled

## Project Structure

```
app/                  Next.js App Router pages
components/           React components
lib/
  api.ts              Real API client (no hardcoded data)
  types.ts            TypeScript types matching API schema
  hooks/              TanStack React Query hooks
  fixtures/           Demo/seed data only
  query-client.tsx    React Query provider
  store.ts            Zustand state
apps/api/             FastAPI backend
  main.py             App entrypoint with CORS and routers
  config.py           Pydantic settings
  models/             SQLAlchemy ORM models
  schemas/            Pydantic request/response schemas
  routes/             FastAPI routers
  services/           Business logic (risk, correlation, scanning)
tests/                pytest test suite
```
