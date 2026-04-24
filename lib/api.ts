import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api",
  timeout: 15000,
});

export async function getCommandCenter() {
  const { data } = await api.get("/command/");
  return data;
}

export async function getAssets(filters?: Record<string, string>) {
  const { data } = await api.get("/assets/", { params: filters });
  return data;
}

export async function getAsset(assetId: number) {
  const { data } = await api.get(`/assets/${assetId}`);
  return data;
}

export async function getAssetRisk(assetId: number) {
  const { data } = await api.get(`/assets/${assetId}/risk`);
  return data;
}

export async function getEvents(limit = 50, offset = 0) {
  const { data } = await api.get("/events/", { params: { limit, offset } });
  return data;
}

export async function getIncidents() {
  const { data } = await api.get("/incidents/");
  return data;
}

export async function getIncident(incidentId: number) {
  const { data } = await api.get(`/incidents/${incidentId}`);
  return data;
}

export async function getIncidentEvidence(incidentId: number) {
  const { data } = await api.get(`/incidents/${incidentId}/evidence`);
  return data;
}

export async function getAssetReplay(assetId: number) {
  const { data } = await api.get(`/replay/assets/${assetId}`);
  return data;
}

export async function getIncidentReplay(incidentId: number) {
  const { data } = await api.get(`/replay/incidents/${incidentId}`);
  return data;
}

export async function runDemoScan() {
  const { data } = await api.post("/scans/demo");
  return data;
}

export async function runLabScan(targetCidr: string) {
  const { data } = await api.post("/scans/lab", { target_cidr: targetCidr });
  return data;
}

export async function acceptRecommendation(incidentId: number, recommendationId: number) {
  const { data } = await api.post(`/incidents/${incidentId}/recommendations/${recommendationId}/accept`);
  return data;
}

export async function rejectRecommendation(incidentId: number, recommendationId: number, reason: string) {
  const { data } = await api.post(`/incidents/${incidentId}/recommendations/${recommendationId}/reject`, { reason });
  return data;
}

export async function createAetherTicket(incidentId: number) {
  const { data } = await api.post(`/incidents/${incidentId}/create-aether-ticket`);
  return data;
}

export async function getTopology() {
  const assetsRes = await api.get("/assets/");
  const incidentsRes = await api.get("/incidents/");
  const assets = assetsRes.data.items || [];
  const incidents = incidentsRes.data.items || [];
  const nodes = assets.map((a: any) => ({
    id: String(a.id),
    label: a.hostname || a.ip_address,
    segment: a.segment || "Unknown",
    risk: a.risk_score || 0,
    status: a.authorization_state || "unknown",
  }));
  const edges: { source: string; target: string; relationship: string }[] = [];
  const segMap: Record<string, string[]> = {};
  for (const a of assets) {
    const seg = a.segment || "Unknown";
    if (!segMap[seg]) segMap[seg] = [];
    segMap[seg].push(String(a.id));
  }
  for (const ids of Object.values(segMap)) {
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        edges.push({ source: ids[i], target: ids[j], relationship: "same_segment_exposure" });
      }
    }
  }
  for (const inc of incidents) {
    const aff = inc.affected_assets || [];
    for (let i = 0; i < aff.length; i++) {
      for (let j = i + 1; j < aff.length; j++) {
        const src = assets.find((a: any) => a.hostname === aff[i] || a.asset_uid === aff[i]);
        const tgt = assets.find((a: any) => a.hostname === aff[j] || a.asset_uid === aff[j]);
        if (src && tgt) {
          edges.push({ source: String(src.id), target: String(tgt.id), relationship: "incident_correlation" });
        }
      }
    }
  }
  return { nodes, edges };
}
