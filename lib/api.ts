import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api",
  timeout: 8000
});

export async function runDemoScan() {
  return {
    mode: "safe-demo",
    discovered: 6,
    scenario: "Unknown contractor laptop appeared on production segment and exposed SMB/RDP.",
    completedAt: new Date().toISOString()
  };
}

export async function runLabScan(targetCidr: string, optIn: boolean) {
  if (!optIn) {
    throw new Error("Real scanning requires explicit lab mode opt-in.");
  }

  return api.post("/scan", { targetCidr, mode: "lab-opt-in" });
}
