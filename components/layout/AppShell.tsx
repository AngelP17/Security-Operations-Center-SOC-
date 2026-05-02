"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Gauge,
  Factory,
  AlertTriangle,
  Network,
  FileClock,
  Activity,
  ShieldCheck,
  ScanLine,
  Search,
  Play,
  UserCircle,
  Menu,
  X,
} from "lucide-react";
import { motion } from "framer-motion";
import { Toaster } from "sonner";
import { CmdKSearch } from "@/components/shared/CmdKSearch";
import { useForgeStore } from "@/lib/store";
import { useRunDemoScan, useRunLabScan } from "@/lib/hooks/use-command-center";
import { useCommandCenter } from "@/lib/hooks/use-command-center";
import { useActiveScanRun } from "@/lib/hooks/use-scans";

const navGroups = [
  {
    label: "Operations",
    items: [
      { href: "/command", label: "Command", icon: Gauge },
      { href: "/assets", label: "Assets", icon: Factory },
      { href: "/incidents", label: "Incidents", icon: AlertTriangle },
    ],
  },
  {
    label: "Investigation",
    items: [
      { href: "/scans", label: "Scans", icon: ScanLine },
      { href: "/topology", label: "Topology", icon: Network },
    ],
  },
  {
    label: "Output",
    items: [
      { href: "/reports", label: "Reports", icon: Activity },
      { href: "/settings", label: "Settings", icon: ShieldCheck },
    ],
  },
];

const routeDetails: Record<string, { label: string; detail: string }> = {
  "/command": {
    label: "Command Center",
    detail: "Correlate live plant-floor risk with the response lane already attached.",
  },
  "/assets": {
    label: "Asset Intelligence",
    detail: "Search every device record with provenance, exposure, and authorization state in view.",
  },
  "/incidents": {
    label: "Incident Workbench",
    detail: "Keep severity, evidence, and the Aether handoff moving inside one operational thread.",
  },
  "/topology": {
    label: "Topology Investigation",
    detail: "Trace segment relationships without leaving the evidence context behind.",
  },
  "/scans": {
    label: "Scan Control Center",
    detail: "Monitor job progress, inspect evidence, and compare governed scan runs.",
  },
  "/reports": {
    label: "Reporting",
    detail: "Turn investigations into durable operational summaries for the next shift.",
  },
  "/settings": {
    label: "System Controls",
    detail: "Tune scanning behavior, routing, and workspace preferences without breaking flow.",
  },
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    labMode,
    scanTargetCidr,
    scanProfile,
    activeScanId,
    highContrastMode,
    setActiveScanId,
    setLabMode,
    setSelectedAssetId,
  } = useForgeStore();
  const demoScan = useRunDemoScan();
  const labScan = useRunLabScan();
  const { data: commandData } = useCommandCenter();
  const { activeScan } = useActiveScanRun();
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const currentRoute = Object.entries(routeDetails).find(([href]) => pathname === href || pathname.startsWith(`${href}/`))?.[1] ?? {
    label: "ForgeSentinel Workspace",
    detail: "Operational context remains connected as you move between command surfaces.",
  };
  const shellRouteKey = pathname.startsWith("/scans")
    ? "scans"
    : pathname.startsWith("/command")
      ? "command"
      : pathname.startsWith("/assets")
        ? "assets"
        : pathname.startsWith("/incidents")
          ? "incidents"
          : pathname.startsWith("/topology")
            ? "topology"
            : pathname.startsWith("/reports")
              ? "reports"
              : pathname.startsWith("/settings")
                ? "settings"
                : "workspace";

  const lastScan = commandData?.kpis?.last_scan_at;
  const scanStatus = lastScan
    ? `Last scan ${new Date(lastScan).toLocaleTimeString()}`
    : "No scan data";
  const freshnessLabel = commandData?.data_freshness
    ? `Data ${commandData.data_freshness}`
    : "Telemetry not hydrated";
  const isScanPending = demoScan.isPending || labScan.isPending;
  const liveScanLabel = activeScan
    ? `Active ${activeScan.status} · ${activeScan.progress_percent}%`
    : null;

  useEffect(() => {
    if (highContrastMode) {
      document.documentElement.classList.add("high-contrast");
    } else {
      document.documentElement.classList.remove("high-contrast");
    }
  }, [highContrastMode]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setSelectedAssetId(null);
        setSidebarOpen(false);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setSelectedAssetId]);

  async function handleScan() {
    if (labMode) {
      labScan.mutate(
        {
          targetCidr: scanTargetCidr,
          profile: scanProfile,
        },
        {
          onSuccess: (data) => {
            if (data?.id) setActiveScanId(data.id);
          },
        },
      );
      return;
    }
    demoScan.mutate(undefined, {
      onSuccess: (data) => {
        if (data?.id) setActiveScanId(data.id);
      },
    });
  }

  function handleSearchSubmit(event: React.FormEvent) {
    event.preventDefault();
    const query = search.trim();
    if (query) router.push(`/assets?query=${encodeURIComponent(query)}`);
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-frame">
          <div className="brand">
            <div className="brand-mark"><ShieldCheck size={20} /></div>
            <div className="brand-text">
              <strong>ForgeSentinel</strong>
              <div className="muted" style={{ fontSize: 11, letterSpacing: "0.06em" }}>Industrial command system</div>
            </div>
          </div>
          {navGroups.map((group) => (
            <div className="nav-section" key={group.label}>
              <div className="nav-label">{group.label}</div>
              {group.items.map((item) => {
                const active = pathname === item.href || (item.href !== "/command" && pathname.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <Link className={`nav-link ${active ? "active" : ""}`} href={item.href} key={item.href} onClick={() => setSidebarOpen(false)}>
                    <Icon size={16} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
          <div className="sidebar-status panel">
            <div className="eyebrow" style={{ marginBottom: 10 }}>Shift overview</div>
            <div className="sidebar-stat">
              <span className="muted">Site</span>
              <strong>Detroit Forge</strong>
            </div>
            <div className="sidebar-stat">
              <span className="muted">Scan lane</span>
              <strong>{labMode ? "Lab mode" : "Safe demo"}</strong>
            </div>
            <div className="sidebar-stat">
              <span className="muted">Analyst</span>
              <strong>Primary console</strong>
            </div>
          </div>
        </div>
      </aside>
      <div className="app-shell-stage" data-shell-route={shellRouteKey}>
        <header className="topbar" data-shell-route={shellRouteKey}>
          <div className="shell-topbar-left">
            <button
              className="btn shell-icon-btn"
              aria-label="Toggle sidebar"
              onClick={() => setSidebarOpen((s) => !s)}
              id="sidebar-toggle"
            >
              {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
            <div className="shell-route">
              <span className="shell-route-mark">Live workspace</span>
              <strong>{currentRoute.label}</strong>
              <p>{currentRoute.detail}</p>
            </div>
            <form className="search shell-search" onSubmit={handleSearchSubmit}>
              <Search size={16} />
              <input
                ref={searchRef}
                aria-label="Global command search"
                placeholder="Search hostname, IP, MAC, incident, port:3389, risk:critical, segment:production"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </form>
          </div>
          <div className="top-actions shell-topbar-right">
            <span className="chip" style={{ fontSize: 11 }}>Detroit Forge <ChevronDown size={13} /></span>
            <button className={`chip ${labMode ? "risk-high" : "risk-low"}`} style={{ fontSize: 11 }} onClick={() => setLabMode(!labMode)}>
              {labMode ? "Lab mode opt-in" : "Demo mode safe"}
            </button>
            <span className="chip" style={{ fontSize: 11 }}>{freshnessLabel}</span>
            {liveScanLabel ? (
              <Link href={`/scans/${activeScan?.id || activeScanId}`} className="chip" style={{ fontSize: 11, textDecoration: "none" }}>
                <ScanLine size={12} /> {liveScanLabel}
              </Link>
            ) : null}
            <span className="chip" style={{ fontSize: 11 }}>{scanStatus}</span>
            <button className="btn primary" onClick={handleScan} disabled={isScanPending}>
              <Play size={14} /> {isScanPending ? "Scanning..." : labMode ? "Run lab scan" : "Run demo scan"}
            </button>
            <span className="chip" style={{ fontSize: 11 }}><UserCircle size={15} /> Analyst</span>
          </div>
        </header>
        <main className="workspace" data-shell-route={shellRouteKey}>
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            {children}
          </motion.div>
        </main>
      </div>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "#0d1118",
            color: "#f4f1ea",
            border: "1px solid rgba(148, 163, 184, 0.12)",
          },
        }}
      />
      <CmdKSearch />
      <style jsx global>{`
        @media (max-width: 1024px) {
          #sidebar-toggle {
            display: inline-flex !important;
          }
        }
      `}</style>
    </div>
  );
}
