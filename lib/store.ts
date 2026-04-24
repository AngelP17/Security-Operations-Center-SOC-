"use client";

import { create } from "zustand";
import type { Asset } from "@/lib/security-data";

type AppState = {
  selectedAsset: Asset | null;
  labMode: boolean;
  riskFilter: string;
  setSelectedAsset: (asset: Asset | null) => void;
  setLabMode: (enabled: boolean) => void;
  setRiskFilter: (risk: string) => void;
};

export const useForgeStore = create<AppState>((set) => ({
  selectedAsset: null,
  labMode: false,
  riskFilter: "all",
  setSelectedAsset: (selectedAsset) => set({ selectedAsset }),
  setLabMode: (labMode) => set({ labMode }),
  setRiskFilter: (riskFilter) => set({ riskFilter })
}));
