# ForgeSentinel Architecture

ForgeSentinel adapts the Aether OpsCenter pattern from tickets into an operational security decision system for manufacturing networks.

## Domain Translation

| Aether OpsCenter Concept | ForgeSentinel Concept |
| --- | --- |
| Tickets | Assets |
| Ticket events | Security events |
| Priority decisions | Risk decisions |
| Ticket recommendations | Security response recommendations |
| Incident clusters | Correlated security incidents |
| Ticket replay | Asset / incident audit replay |

## Product Model

ForgeSentinel centers the analyst workflow on durable security objects:

- **Asset**: hostname, IP, MAC, segment, authorization state, owner, open ports, risk score, evidence, recommendations, and audit history.
- **Security Event**: scanner observations, identity changes, exposure detections, risk decisions, recommendation generation, and analyst actions.
- **Incident**: correlated security events and affected assets with status, severity, confidence, timeline, notes, and response stack.
- **Replay Step**: append-only trace of how raw observations become normalized assets, risk decisions, incidents, and recommendations.

## UI Architecture

```mermaid
graph TD
    App[Next.js 14 App Router] --> Shell[Sentinel Industrial Command UI Shell]
    Shell --> Command[/command]
    Shell --> Assets[/assets]
    Shell --> Incidents[/incidents and /incidents/:id]
    Shell --> Topology[/topology]
    Shell --> Replay[/replay/:entityId]
    Shell --> Reports[/reports]
    Shell --> Settings[/settings]

    Data[lib/security-data.ts] --> Command
    Data --> Assets
    Data --> Incidents
    Data --> Topology
    Data --> Replay

    Store[Zustand UI Store] --> Drawer[Asset Detail Drawer]
    Assets --> Drawer
    Command --> Drawer
    Topology --> Drawer

    API[lib/api.ts] --> SafeDemo[Safe demo scan]
    API --> LabMode[Opt-in lab scan gate]
```

## Safety Model

Safe demo scanning is the default operating state and uses local scenario data. Real scanning is represented as lab mode and requires explicit opt-in before `runLabScan` will issue an API request.

This design prevents a portfolio/demo environment from accidentally scanning a real network while still documenting how a production scanner integration would be gated.

## Design System

**Sentinel Industrial Command UI** uses graphite, slate, off-white type, amber risk accents, red critical accents, green healthy accents, and restrained cyan highlights. The layout is a three-zone command system:

1. Left navigation grouped by Operations, Investigation, and Output.
2. Main operational workspace.
3. Right rail or drawer for context, recommendations, and audit evidence.

The interface prioritizes dense readable tables, risk-first queues, object-centric asset biographies, decision writeback, investigation timelines, graph context, and auditable action loops.
