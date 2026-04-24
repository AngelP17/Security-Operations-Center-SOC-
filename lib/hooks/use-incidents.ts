import { useQuery } from "@tanstack/react-query";
import { getIncidents, getIncident, getIncidentEvidence } from "@/lib/api";

export function useIncidents() {
  return useQuery({
    queryKey: ["incidents"],
    queryFn: getIncidents,
  });
}

export function useIncident(incidentId?: number) {
  return useQuery({
    queryKey: ["incident", incidentId],
    queryFn: () => (incidentId ? getIncident(incidentId) : null),
    enabled: !!incidentId,
  });
}

export function useIncidentEvidence(incidentId?: number) {
  return useQuery({
    queryKey: ["incident-evidence", incidentId],
    queryFn: () => (incidentId ? getIncidentEvidence(incidentId) : null),
    enabled: !!incidentId,
  });
}
