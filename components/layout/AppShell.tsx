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
import { useRunDemoScan } from "@/lib/hooks/use-command-center";
import { useCommandCenter } from "@/lib/hooks/use-command-center";

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

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { labMode, setLabMode, setSelectedAssetId } = useForgeStore();
  const demoScan = useRunDemoScan();
  const { data: commandData } = useCommandCenter();
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const lastScan = commandData?.kpis?.last_scan_at;
  const scanStatus = lastScan
    ? `Last scan ${new Date(lastScan).toLocaleTimeString()}`
    : "No scan data";

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
    demoScan.mutate();
  }

  function handleSearchSubmit(event: React.FormEvent) {
    event.preventDefault();
    const query = search.trim();
    if (query) router.push(`/assets?query=${encodeURIComponent(query)}`);
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><ShieldCheck size={20} /></div>
          <div className="brand-text">
            <strong>ForgeSentinel</strong>
            <div className="muted" style={{ fontSize: 11, letterSpacing: "0.06em" }}>Industrial Command UI</div>
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
      </aside>
      <div>
        <header className="topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              className="btn"
              aria-label="Toggle sidebar"
              onClick={() => setSidebarOpen((s) => !s)}
              style={{ display: "none" }}
              id="sidebar-toggle"
            >
              {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
            <form className="search" onSubmit={handleSearchSubmit}>
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
          <div className="top-actions">
            <span className="chip" style={{ fontSize: 11 }}>Detroit Forge <ChevronDown size={13} /></span>
            <button className={`chip ${labMode ? "risk-high" : "risk-low"}`} style={{ fontSize: 11 }} onClick={() => setLabMode(!labMode)}>
              {labMode ? "Lab mode opt-in" : "Demo mode safe"}
            </button>
            <span className="chip" style={{ fontSize: 11 }}>{scanStatus}</span>
            <button className="btn primary" onClick={handleScan} disabled={demoScan.isPending}>
              <Play size={14} /> {demoScan.isPending ? "Scanning..." : "Run scan"}
            </button>
            <span className="chip" style={{ fontSize: 11 }}><UserCircle size={15} /> Analyst</span>
          </div>
        </header>
        <main className="workspace">
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
