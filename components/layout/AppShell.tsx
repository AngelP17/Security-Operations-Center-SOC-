"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChevronDown, Play, Search, Shield, UserCircle } from "lucide-react";
import { motion } from "framer-motion";
import { navGroups } from "@/lib/security-data";
import { useForgeStore } from "@/lib/store";
import { runDemoScan } from "@/lib/api";
import { useState } from "react";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { labMode, setLabMode } = useForgeStore();
  const [scanStatus, setScanStatus] = useState("Safe demo scan completed 2m ago");

  async function handleScan() {
    const result = await runDemoScan();
    setScanStatus(`${result.mode} complete: ${result.discovered} assets`);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Shield size={20} /></div>
          <div className="brand-text">
            <strong>ForgeSentinel</strong>
            <div className="muted" style={{ fontSize: 11 }}>Industrial Command UI</div>
          </div>
        </div>
        {navGroups.map((group) => (
          <div className="nav-section" key={group.label}>
            <div className="nav-label">{group.label}</div>
            {group.items.map((item) => {
              const active = pathname === item.href || (item.href !== "/command" && pathname.startsWith(item.href.split("/")[1] ? `/${item.href.split("/")[1]}` : item.href));
              const Icon = item.icon;
              return (
                <Link className={`nav-link ${active ? "active" : ""}`} href={item.href} key={item.href}>
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
          <div className="search">
            <Search size={16} />
            <input aria-label="Global command search" placeholder="Search hostname, IP, MAC, incident, port:3389, risk:critical, segment:production" />
          </div>
          <div className="top-actions">
            <span className="chip">Detroit Forge <ChevronDown size={13} /></span>
            <button className={`chip ${labMode ? "risk-high" : "risk-low"}`} onClick={() => setLabMode(!labMode)}>
              {labMode ? "Lab mode opt-in" : "Demo mode safe"}
            </button>
            <span className="chip">{scanStatus}</span>
            <button className="btn primary" onClick={handleScan}><Play size={15} /> Run scan</button>
            <button className="btn" aria-label="Notifications"><Bell size={15} /></button>
            <span className="chip"><UserCircle size={15} /> Analyst A. Pinzon</span>
          </div>
        </header>
        <main className="workspace">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
