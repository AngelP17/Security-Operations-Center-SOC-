import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelScan,
  getScan,
  getScanFindings,
  getScanHosts,
  getScanPorts,
  getScans,
  getScanStatus,
} from "@/lib/api";

const TERMINAL_SCAN_STATES = new Set(["completed", "failed", "cancelled"]);

export function isTerminalScanState(status?: string | null) {
  return status ? TERMINAL_SCAN_STATES.has(status) : false;
}

export function useScans(limit = 50, offset = 0) {
  return useQuery({
    queryKey: ["scans", limit, offset],
    queryFn: () => getScans(limit, offset),
    refetchInterval: 10_000,
  });
}

export function useScan(scanRunId?: number) {
  return useQuery({
    queryKey: ["scan", scanRunId],
    queryFn: () => getScan(scanRunId as number),
    enabled: typeof scanRunId === "number",
  });
}

export function useScanStatus(scanRunId?: number) {
  const detailQuery = useScan(scanRunId);

  return useQuery({
    queryKey: ["scan-status", scanRunId],
    queryFn: () => getScanStatus(scanRunId as number),
    enabled: typeof scanRunId === "number",
    refetchInterval: (query) => {
      const status = (query.state.data as { status?: string } | undefined)?.status
        || detailQuery.data?.status;
      return isTerminalScanState(status) ? false : 2_500;
    },
  });
}

export function useActiveScanRun() {
  const scansQuery = useScans(8, 0);
  const activeScan = useMemo(
    () => scansQuery.data?.items.find((scan) => !isTerminalScanState(scan.status)) || null,
    [scansQuery.data?.items],
  );
  return { ...scansQuery, activeScan };
}

export function useScanHosts(scanRunId?: number) {
  return useQuery({
    queryKey: ["scan-hosts", scanRunId],
    queryFn: () => getScanHosts(scanRunId as number),
    enabled: typeof scanRunId === "number",
  });
}

export function useScanPorts(scanRunId?: number) {
  return useQuery({
    queryKey: ["scan-ports", scanRunId],
    queryFn: () => getScanPorts(scanRunId as number),
    enabled: typeof scanRunId === "number",
  });
}

export function useScanFindings(scanRunId?: number) {
  return useQuery({
    queryKey: ["scan-findings", scanRunId],
    queryFn: () => getScanFindings(scanRunId as number),
    enabled: typeof scanRunId === "number",
  });
}

export function useCancelScan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cancelScan,
    onSuccess: (_, scanRunId) => {
      queryClient.invalidateQueries({ queryKey: ["scans"] });
      queryClient.invalidateQueries({ queryKey: ["scan", scanRunId] });
      queryClient.invalidateQueries({ queryKey: ["scan-status", scanRunId] });
    },
  });
}
