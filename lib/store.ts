"use client";

import { create } from "zustand";
import type { Asset } from "@/lib/types";

type AppState = {
  selectedAssetId: number | null;
  selectedIncidentId: number | null;
  labMode: boolean;
  riskFilter: string;
  setSelectedAssetId: (id: number | null) => void;
  setSelectedIncidentId: (id: number | null) => void;
  setLabMode: (enabled: boolean) => void;
  setRiskFilter: (risk: string) => void;
};

export const useForgeStore = create<AppState>((set) => ({
  selectedAssetId: null,
  selectedIncidentId: null,
  labMode: false,
  riskFilter: "all",
  setSelectedAssetId: (selectedAssetId) => set({ selectedAssetId }),
  setSelectedIncidentId: (selectedIncidentId) => set({ selectedIncidentId }),
  setLabMode: (labMode) => set({ labMode }),
  setRiskFilter: (riskFilter) => set({ riskFilter }),
}));
