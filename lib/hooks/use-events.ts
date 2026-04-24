import { useQuery } from "@tanstack/react-query";
import { getEvents } from "@/lib/api";

export function useEvents(limit = 50, offset = 0) {
  return useQuery({
    queryKey: ["events", limit, offset],
    queryFn: () => getEvents(limit, offset),
    refetchInterval: 10000,
  });
}
