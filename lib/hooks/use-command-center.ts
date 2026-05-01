import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCommandCenter, getScanProfiles, runDemoScan, runLabScan } from "@/lib/api";

export function useCommandCenter() {
  return useQuery({
    queryKey: ["command-center"],
    queryFn: getCommandCenter,
    refetchInterval: 15000,
  });
}

export function useRunDemoScan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: runDemoScan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["command-center"] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      queryClient.invalidateQueries({ queryKey: ["topology"] });
      queryClient.invalidateQueries({ queryKey: ["scans"] });
    },
  });
}

export function useRunLabScan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: runLabScan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["command-center"] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      queryClient.invalidateQueries({ queryKey: ["topology"] });
      queryClient.invalidateQueries({ queryKey: ["scans"] });
    },
  });
}

export function useScanProfiles() {
  return useQuery({
    queryKey: ["scan-profiles"],
    queryFn: getScanProfiles,
    staleTime: 60_000,
  });
}
