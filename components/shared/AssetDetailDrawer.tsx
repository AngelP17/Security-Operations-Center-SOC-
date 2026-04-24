"use client";

import { X, CheckCircle2, FileText, RotateCcw, ShieldAlert, Wifi } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useForgeStore } from "@/lib/store";
import { RiskBadge } from "./RiskBadge";
import { useAsset } from "@/lib/hooks/use-assets";
import { useAssetRisk } from "@/lib/hooks/use-assets";
import { useAssetReplay } from "@/lib/hooks/use-replay";
import { RouteState } from "./RouteState";

export function AssetDetailDrawer() {
  const { selectedAssetId, setSelectedAssetId } = useForgeStore();
  const { data: asset, isLoading: assetLoading } = useAsset(selectedAssetId || undefined);
  const { data: risk, isLoading: riskLoading } = useAssetRisk(selectedAssetId || undefined);
  const { data: replay, isLoading: replayLoading } = useAssetReplay(selectedAssetId || undefined);

  return (
    <AnimatePresence>
      {selectedAssetId ? (
        <>
          <motion.div className="backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedAssetId(null)} />
          <motion.aside className="drawer" initial={{ x: 540 }} animate={{ x: 0 }} exit={{ x: 540 }} transition={{ type: "spring", damping: 30, stiffness: 280 }}>
            <div className="page-head">
              <div>
                <div className="eyebrow">Asset biography</div>
                {assetLoading ? (
                  <h1>Loading...</h1>
                ) : asset ? (
                  <>
                    <h1>{asset.hostname}</h1>
                    <p className="mono muted">{asset.ip_address} · {asset.mac_address}</p>
                  </>
                ) : (
                  <h1>Asset not found</h1>
                )}
              </div>
              <button className="btn" onClick={() => setSelectedAssetId(null)} aria-label="Close drawer"><X size={16} /></button>
            </div>

            {asset && !assetLoading ? (
              <div className="grid">
                <section className="panel">
                  <div className="page-head" style={{ marginBottom: 10 }}>
                    <h2>Risk Decision</h2>
                    {risk && !riskLoading ? <RiskBadge level={risk.risk_level} score={risk.risk_score} /> : null}
                  </div>
                  {risk && !riskLoading ? (
                    <>
                      <p className="muted">{risk.explanation?.[0] || "Risk decision computed from asset features and events."}</p>
                      <div className="metric-list" style={{ marginTop: 10 }}>
                        {(risk.score_breakdown || []).map((item: any) => (
                          <div className="metric-row" key={item.label}>
                            <span>{item.label}</span>
                            <strong className="mono">{item.value > 0 ? "+" : ""}{item.value}</strong>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <RouteState type="loading" title="Loading risk..." />
                  )}
                </section>

                <section className="panel">
                  <h2>Asset Identity</h2>
                  <div className="metric-list" style={{ marginTop: 12 }}>
                    <div className="metric-row"><span>Type</span><strong>{asset.asset_type?.toUpperCase()}</strong></div>
                    <div className="metric-row"><span>Segment</span><strong>{asset.segment}</strong></div>
                    <div className="metric-row"><span>Authorization</span><strong>{asset.authorization_state}</strong></div>
                    <div className="metric-row"><span>Owner</span><strong>{asset.owner || "—"}</strong></div>
                    <div className="metric-row"><span>Site</span><strong>{asset.site}</strong></div>
                  </div>
                </section>

                <section className="panel">
                  <h2>Open Ports</h2>
                  <div className="filters" style={{ marginTop: 12 }}>
                    {(asset.open_ports || []).map((port: any) => (
                      <span className="chip mono" key={port.port}>{port.port}/{port.service}</span>
                    ))}
                  </div>
                </section>

                <section className="panel">
                  <h2>Triggered Rules</h2>
                  <div className="filters" style={{ marginTop: 12 }}>
                    {(risk?.triggered_rules || []).map((rule: string) => (
                      <span className="chip" key={rule}>{rule}</span>
                    ))}
                  </div>
                </section>

                <section className="panel">
                  <h2>Audit Replay</h2>
                  {replayLoading ? (
                    <RouteState type="loading" title="Loading replay..." />
                  ) : replay?.steps?.length ? (
                    <div style={{ marginTop: 8, maxHeight: 200, overflow: "auto" }}>
                      {(replay.steps || []).slice(0, 10).map((step: any, i: number) => (
                        <div key={i} style={{ padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: 12 }}>
                          <span className="mono muted">{new Date(step.timestamp).toLocaleTimeString()}</span>
                          {" "}· {step.event_type}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="muted">No audit steps recorded yet.</p>
                  )}
                </section>

                <section className="panel">
                  <h2>Actions</h2>
                  <div className="filters" style={{ marginTop: 12 }}>
                    <button className="btn"><CheckCircle2 size={15} /> Confirm true positive</button>
                    <button className="btn"><ShieldAlert size={15} /> Accept recommendation</button>
                    <button className="btn"><RotateCcw size={15} /> Recompute risk</button>
                    <button className="btn"><FileText size={15} /> Create report</button>
                  </div>
                </section>
              </div>
            ) : (
              <RouteState type="loading" title="Loading asset..." />
            )}
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
