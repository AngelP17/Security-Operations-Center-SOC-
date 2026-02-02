# Architecture Overview

This document provides a high-level architecture overview of the Integrate Security Operations Center (SOC) Dashboard.

## System Architecture

```mermaid
graph TB
    subgraph Client["Frontend (React + TypeScript)"]
        UI[UI Components]
        Login[Login Component]
        Dashboard[Dashboard Component]
        Sidebar[AppSidebar]
        Charts[Analytics Charts]
    end

    subgraph Services["Services Layer"]
        Auth[Authentication Service]
        API[API Service]
        Firebase[Firebase Config]
    end

    subgraph Backend["Backend (Python Flask)"]
        FlaskApp[Flask Application]
        SOCApp[SOC Application Logic]
        DB[(SQLite Database)]
    end

    subgraph Infrastructure["Infrastructure"]
        Docker[Docker Container]
        Vite[Vite Dev Server]
    end

    UI --> Dashboard
    Login --> Auth
    Dashboard --> Sidebar
    Dashboard --> Charts
    Dashboard --> API
    Auth --> Firebase
    API --> FlaskApp
    FlaskApp --> SOCApp
    SOCApp --> DB
    Docker --> FlaskApp
    Vite --> UI
```

## Component Architecture

```mermaid
flowchart LR
    subgraph Pages["Pages"]
        LoginPage[Login]
        DashboardPage[Dashboard]
    end

    subgraph Layout["Layout Components"]
        AppSidebar[AppSidebar]
        Breadcrumb[Breadcrumb]
    end

    subgraph Dashboard["Dashboard Components"]
        AlertList[Alert List]
        PerformanceCards[Performance Cards]
        NetworkView[Network View]
        Analytics[Analytics Charts]
        SecurityEvents[Security Events]
        ThreatMonitor[Threat Monitor]
    end

    subgraph UI["UI Library (Shadcn/ui)"]
        Card[Card]
        Button[Button]
        Input[Input]
        Badge[Badge]
        ScrollArea[ScrollArea]
        Chart[Chart]
    end

    LoginPage --> DashboardPage
    DashboardPage --> AppSidebar
    DashboardPage --> Dashboard
    Dashboard --> UI
```

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite |
| UI Components | Shadcn/ui, Radix UI, Lucide Icons |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Backend | Python Flask |
| Database | SQLite |
| Auth | Firebase |
| Deployment | Docker, Docker Compose |

## Data Flow

```mermaid
sequenceDiagram
    participant User
    participant React as React App
    participant Auth as Firebase Auth
    participant Flask as Flask Backend
    participant DB as SQLite DB

    User->>React: Login
    React->>Auth: Authenticate
    Auth-->>React: Auth Token
    React->>Flask: API Request + Token
    Flask->>DB: Query Data
    DB-->>Flask: Results
    Flask-->>React: JSON Response
    React-->>User: Render Dashboard
```

## Directory Structure

```
├── src/
│   ├── App.tsx           # Main application component
│   ├── main.tsx          # Entry point
│   ├── components/
│   │   ├── Login.tsx     # Authentication component
│   │   ├── dashboard/    # Dashboard-specific components
│   │   ├── layout/       # Layout components (sidebar)
│   │   └── ui/           # Shadcn/ui components
│   ├── contexts/         # React contexts
│   ├── services/         # API and service layers
│   └── types/            # TypeScript type definitions
├── app.py                # Flask backend
├── soc_app.py            # SOC application logic
├── templates/            # HTML templates
├── Dockerfile            # Container configuration
└── docker-compose.yml    # Multi-container setup
```
