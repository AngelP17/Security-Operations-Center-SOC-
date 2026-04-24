import { useQuery } from "@tanstack/react-query";
import { getAssets, getAsset, getAssetRisk } from "@/lib/api";

export function useAssets(filters?: Record<string, string>) {
  return useQuery({
    queryKey: ["assets", filters],
    queryFn: () => getAssets(filters),
  });
}

export function useAsset(assetId?: number) {
  return useQuery({
    queryKey: ["asset", assetId],
    queryFn: () => (assetId ? getAsset(assetId) : null),
    enabled: !!assetId,
  });
}

export function useAssetRisk(assetId?: number) {
  return useQuery({
    queryKey: ["asset-risk", assetId],
    queryFn: () => (assetId ? getAssetRisk(assetId) : null),
    enabled: !!assetId,
  });
}
