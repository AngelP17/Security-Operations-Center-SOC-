import { useQuery } from "@tanstack/react-query";
import { getAssetExposureFindings, getEvents } from "@/lib/api";

export function useEvents(limit = 50, offset = 0, filters?: { asset_id?: number; event_type?: string; severity?: string }) {
  return useQuery({
    queryKey: ["events", limit, offset, filters],
    queryFn: () => getEvents(limit, offset, filters),
    refetchInterval: 10000,
  });
}

export function useAssetExposureFindings(assetId?: number) {
  return useQuery({
    queryKey: ["asset-exposure", assetId],
    queryFn: () => getAssetExposureFindings(assetId as number),
    enabled: typeof assetId === "number",
  });
}
