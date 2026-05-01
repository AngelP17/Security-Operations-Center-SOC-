# ForgeSentinel UI Overhaul and Aether Hardening

Date: 2026-04-27

## Summary

This pass redesigned and tightened the active Next.js command UI and kept the legacy Vite dashboard usable. The main goals were to improve the topology experience, make Aether incident ticket creation reliable, remove fake or placeholder controls, and ship a complete Scan Control Center with real TCP connect scanning evidence.

## Scan Control Center

```mermaid
graph TD
    subgraph "Scan Lifecycle"
        REQ[POST /api/scans/demo or /lab] --> QUEUE[Queued]
        QUEUE --> RUN[Running]
        RUN --> COMP[Completed]
        RUN --> FAIL[Failed]
        RUN --> CAN[Cancelled]
    end

    subgraph "Evidence Pipeline"
        COMP --> HOSTS[scan_host_results]
        COMP --> PORTS[scan_port_results]
        COMP --> FIND[exposure_findings]
        HOSTS --> ASSET[Asset Identity Reconciliation]
        PORTS --> ASSET
        FIND --> UI[Exposure Badges]
    end

    subgraph "Frontend Surfaces"
        SCN[/scans<br/>Scan Control Center]
        SEV[/scans/:id<br/>Scan Evidence Theater]
        AST[/assets<br/>Asset Detail Drawer]
    end

    UI --> SCN
    UI --> SEV
    UI --> AST

    style REQ fill:#f9f,stroke:#333
    style COMP fill:#9f9,stroke:#333
    style SCN fill:#bbf,stroke:#333
    style SEV fill:#bbf,stroke:#333
```

- `/scans` — Scan Control Center with live progress, history ledger, profile selector, and exposure findings
- `/scans/[scanRunId]` — Scan Evidence Theater with lifecycle panel, host evidence table, port ledger, and exposure findings
- Toast notifications (Sonner) for scan lifecycle events (queued, running, completed, failed, cancelled)
- Scan status polling via `useScanStatus` hook (2.5s intervals)
- Exposure badges (`ExposureBadge`, `ExposureBadgeStack`) rendered in Asset Detail Drawer
- Demo scans seed assets but do not populate host/port evidence (known limitation)
- Lab scans perform real TCP connect scanning with full evidence population

## Real TCP Connect Scanning

The `ProductionScanner` class performs actual network scanning:
- **Host discovery**: ICMP ping sweep, ARP probe, TCP ping against common ports
- **Port scanning**: Real `socket.connect_ex()` against configurable port lists
- **Service fingerprinting**: Safe banner grabbing for HTTP/HTTPS, SSH, FTP, SMTP
- **Hostname resolution**: Reverse DNS + NetBIOS fallback
- **MAC discovery**: ARP table parsing with active ARP probes
- **Vendor attribution**: MAC OUI lookup with offline cache + 200+ vendor static fallback
- **Rate limiting**: Per-profile concurrent host/port limits, delay between hosts
- **Background execution**: Scans run asynchronously with lifecycle control

## Aether Integration

```mermaid
graph TD
    INC[Incident Created<br/>correlation_engine] --> AETHER{Aether Enabled?}
    AETHER -->|No| PENDING[Create Pending AetherLink<br/>sync_status: disabled]
    AETHER -->|Yes| EXISTS{Existing Link?}

    EXISTS -->|synced / pending / disabled| RETURN[Return Existing Link<br/>Idempotent]
    EXISTS -->|None| CREATE[Create Aether Ticket<br/>POST Aether OpsCenter]

    CREATE -->|Success| SYNCED[Store Ticket ID + URL<br/>sync_status: synced]
    CREATE -->|Failure| ERROR[sync_status: error]

    PENDING --> UI[Incident Workbench UI]
    RETURN --> UI
    SYNCED --> UI
    ERROR --> UI

    style INC fill:#f9f,stroke:#333
    style SYNCED fill:#9f9,stroke:#333
    style ERROR fill:#f99,stroke:#333
    style PENDING fill:#ff9,stroke:#333
    style RETURN fill:#ff9,stroke:#333
```

- Incident responses now include the latest Aether ticket state:
  - `aether_ticket_id`
  - `aether_ticket_url`
  - `aether_sync_status`
- Aether ticket creation is idempotent. If an incident already has a usable Aether link in `synced`, `disabled`, or `pending` state, the backend returns the existing link instead of creating duplicates.
- The incident workbench now displays clear Aether states:
  - synced
  - pending
  - disabled
  - error
- If Aether returns a ticket URL, the UI exposes an external link to open it.
- Tests cover disabled mode and duplicate prevention.

## Next.js UI Changes

- A second image-led redesign pass used generated UI references for the command center and topology surfaces, then translated them into the app.
- `/command` now opens with a cinematic editorial command hero:
  - industrial image treatment
  - restrained amber accent
  - real scan and topology CTAs
  - GSAP entrance animation and scroll-linked motion
  - inline media embedded in display typography
- `/command` now uses a gapless 12-column bento intelligence layout for risk queue, incident focus, live events, exposed services, and scan status.
- `/command` includes a kinetic marquee and sticky investigation stack to avoid the previous generic dashboard-card rhythm.
- `/topology` was rebuilt around a more meaningful React Flow graph:
  - segment anchor nodes
  - asset nodes with hostname, IP, authorization, ports, type icon, and risk ring
  - risk filters
  - segment filter
  - incident correlation edges
  - empty state when filters hide all nodes
- `/topology` now includes a persistent investigation rail with visible asset counts, critical/unauthorized totals, Aether handoff guidance, and active incident paths, so small datasets do not leave a large empty graph void.
- `/incidents/[incidentId]` now wires recommendation acceptance to the existing API.
- Report-generation controls that are not backed by an implementation are disabled and labeled honestly instead of acting as fake buttons.
- The global search bar now routes to `/assets?query=...`.
- `/assets` applies global search query filtering across hostname, IP, MAC, asset UID, authorization, segment, type, and open ports.
- Notification and drawer actions without backend support are disabled with explanatory titles.
- Shared CSS now includes clearer disabled states, Aether status styling, topology node styling, segment-node styling, and stable topology node dimensions.

## Legacy Vite UI Changes

- `addDevice()` now calls `/api/security/add-device` instead of logging a placeholder.
- Removed unused placeholder trust/delete API helpers.
- The legacy canvas network map now supports drag panning.
- High/critical risk devices render as warning nodes in the map.
- The advanced event filter, Add User control, and unsupported theme/report-style controls are no longer fake active buttons.
- Settings controls that can be session-backed now update local session state and show real feedback.

## Verification

The following checks passed:

```bash
npm run build
npm run vite:build
npm run test:api
npm run lint:api
```

API test result:

```text
7 passed
```

Lint result:

```text
All checks passed!
```

Vite build result:

```text
build/assets/vendor-radix-BKpyJZn8.js    83.47 kB
build/assets/vendor-react-7PqXWhc5.js   141.85 kB
build/assets/vendor-charts-C4PUiUni.js  392.90 kB
build/assets/index-8ZkTux9d.js          582.53 kB
```

## Notes

- The Next.js app remains the primary production surface.
- The Vite dashboard remains supported enough to avoid dead controls and placeholder behavior.
- Report generation, notifications, and asset-level feedback workflows are intentionally marked unavailable until real backend workflows are added.
- `.next/` was already untracked before this pass and remains an untracked generated build directory.
- `ruff` is now installed in `api-venv` and tracked in `apps/api/requirements.txt`.
- Vite build uses vendor chunk splitting (react, radix, motion, charts, data) for optimal caching.
