"use client";

import { useState, useEffect } from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import {
  Search,
  Gauge,
  Factory,
  AlertTriangle,
  Network,
  Activity,
  ShieldCheck,
} from "lucide-react";

export function CmdKSearch() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  if (!open) return null;

  const pages = [
    { label: "Command Center", href: "/command", icon: Gauge },
    { label: "Assets", href: "/assets", icon: Factory },
    { label: "Incidents", href: "/incidents", icon: AlertTriangle },
    { label: "Topology", href: "/topology", icon: Network },
    { label: "Reports", href: "/reports", icon: Activity },
    { label: "Settings", href: "/settings", icon: ShieldCheck },
  ];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        background: "rgba(0,0,0,0.6)",
        display: "grid",
        placeItems: "center",
      }}
      onClick={() => setOpen(false)}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 560,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Command>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "14px 16px",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <Search size={18} style={{ color: "var(--muted)" }} />
            <Command.Input
              placeholder="Search pages..."
              style={{
                flex: 1,
                background: "transparent",
                border: 0,
                outline: 0,
                color: "var(--text)",
                fontSize: 15,
              }}
            />
          </div>
          <Command.List
            style={{
              maxHeight: 320,
              overflow: "auto",
              padding: "8px 0",
            }}
          >
            <Command.Empty
              style={{
                padding: 16,
                textAlign: "center",
                color: "var(--muted)",
                fontSize: 14,
              }}
            >
              No results found.
            </Command.Empty>
            {pages.map((page) => {
              const Icon = page.icon;
              return (
                <Command.Item
                  key={page.href}
                  onSelect={() => {
                    router.push(page.href);
                    setOpen(false);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 16px",
                    cursor: "pointer",
                    color: "var(--text)",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "var(--elevated)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <Icon size={16} style={{ color: "var(--amber)" }} />
                  <span style={{ fontSize: 14 }}>{page.label}</span>
                </Command.Item>
              );
            })}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
