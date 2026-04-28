"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Asset } from "@/lib/types";

type AppState = {
  selectedAssetId: number | null;
  selectedIncidentId: number | null;
  labMode: boolean;
  riskFilter: string;
  scanTargetCidr: string;
  scanProfile: string;
  // Settings
  notificationsEnabled: boolean;
  autoScanEnabled: boolean;
  strictAuthAlerts: boolean;
  highContrastMode: boolean;
  setSelectedAssetId: (id: number | null) => void;
  setSelectedIncidentId: (id: number | null) => void;
  setLabMode: (enabled: boolean) => void;
  setRiskFilter: (risk: string) => void;
  setScanTargetCidr: (target: string) => void;
  setScanProfile: (profile: string) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setAutoScanEnabled: (enabled: boolean) => void;
  setStrictAuthAlerts: (enabled: boolean) => void;
  setHighContrastMode: (enabled: boolean) => void;
};

export const useForgeStore = create<AppState>()(
  persist(
    (set) => ({
      selectedAssetId: null,
      selectedIncidentId: null,
      labMode: false,
      riskFilter: "all",
      scanTargetCidr: "192.168.1.0/24",
      scanProfile: "safe_discovery",
      notificationsEnabled: true,
      autoScanEnabled: false,
      strictAuthAlerts: false,
      highContrastMode: false,
      setSelectedAssetId: (selectedAssetId) => set({ selectedAssetId }),
      setSelectedIncidentId: (selectedIncidentId) => set({ selectedIncidentId }),
      setLabMode: (labMode) => set({ labMode }),
      setRiskFilter: (riskFilter) => set({ riskFilter }),
      setScanTargetCidr: (scanTargetCidr) => set({ scanTargetCidr }),
      setScanProfile: (scanProfile) => set({ scanProfile }),
      setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
      setAutoScanEnabled: (autoScanEnabled) => set({ autoScanEnabled }),
      setStrictAuthAlerts: (strictAuthAlerts) => set({ strictAuthAlerts }),
      setHighContrastMode: (highContrastMode) => set({ highContrastMode }),
    }),
    {
      name: "forge-ops-store",
      partialize: (state) => ({
        labMode: state.labMode,
        riskFilter: state.riskFilter,
        scanTargetCidr: state.scanTargetCidr,
        scanProfile: state.scanProfile,
        notificationsEnabled: state.notificationsEnabled,
        autoScanEnabled: state.autoScanEnabled,
        strictAuthAlerts: state.strictAuthAlerts,
        highContrastMode: state.highContrastMode,
      }),
    },
  ),
);
