# ForgeSentinel

ForgeSentinel is a manufacturing-focused SOC and Asset Risk Intelligence Platform. It discovers network assets, detects unauthorized devices and risky exposed services, correlates security events, prioritizes response actions, and preserves an auditable incident history for OT and manufacturing environments.

The product is framed around the **Sentinel Industrial Command UI**, a premium dark command-center interface for senior analysts and OT security teams.

## Core Workflows

- **Command Center**: `/command` is the flagship SOC surface with KPI cards, prioritized risk queue, active incident focus, live security events, exposure charts, and scan status.
- **Asset Intelligence**: `/assets` replaces ticket queues with object-centric asset workflows, asset biographies, risk decisions, triggered rules, ports, evidence, recommendations, and audit trails.
- **Incident Workbench**: `/incidents/[incidentId]` replaces ticket events with correlated security incidents, evidence timelines, decision traces, analyst notes, and ranked response recommendations.
- **Topology**: `/topology` visualizes assets by segment using React Flow with risk rings and clickable asset details.
- **Audit Replay**: `/replay/[entityId]` replaces ticket replay with asset and incident audit replay, including expandable raw JSON for explainability.
- **Reports and Settings**: `/reports` and `/settings` support evidence packages, response governance, safe demo scanning, and opt-in lab scanning controls.

## Security Posture

ForgeSentinel defaults to **safe demo scanning**. Demo scans use local scenario data and do not touch real networks.

Real scanning is modeled only as an **explicit opt-in lab mode**. The UI makes this state visible in the topbar and settings screen, and the API wrapper rejects lab scans unless opt-in is provided.

Demo scenario:

> Unknown contractor laptop appeared on production segment and exposed SMB/RDP.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 14 App Router, React 18, TypeScript |
| Styling | Tailwind-compatible design tokens plus production CSS |
| State | Zustand |
| Tables | TanStack Table |
| Charts | Recharts |
| Topology | React Flow |
| Motion | Framer Motion |
| Icons | Lucide React |
| API Wrapper | Axios in `lib/api.ts` |

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000/command](http://localhost:3000/command).

## Production Build

```bash
npm run build
```

The legacy Vite implementation remains in `src/` for reference, while the production ForgeSentinel UI now lives in the Next app router under `app/`, `components/`, and `lib/`.
