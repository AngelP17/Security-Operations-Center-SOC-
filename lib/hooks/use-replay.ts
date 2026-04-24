import { useQuery } from "@tanstack/react-query";
import { getAssetReplay, getIncidentReplay } from "@/lib/api";

export function useAssetReplay(assetId?: number) {
  return useQuery({
    queryKey: ["replay", "asset", assetId],
    queryFn: () => (assetId ? getAssetReplay(assetId) : null),
    enabled: !!assetId,
  });
}

export function useIncidentReplay(incidentId?: number) {
  return useQuery({
    queryKey: ["replay", "incident", incidentId],
    queryFn: () => (incidentId ? getIncidentReplay(incidentId) : null),
    enabled: !!incidentId,
  });
}
