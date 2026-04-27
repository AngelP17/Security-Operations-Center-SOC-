"use client";

import { X, CheckCircle2, FileText, RotateCcw, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useForgeStore } from "@/lib/store";
import { RiskBadge } from "./RiskBadge";
import { useAsset } from "@/lib/hooks/use-assets";
import { useAssetRisk } from "@/lib/hooks/use-assets";
import { useAssetReplay } from "@/lib/hooks/use-replay";
import { RouteState } from "./RouteState";

const sectionVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export function AssetDetailDrawer() {
  const { selectedAssetId, setSelectedAssetId } = useForgeStore();
  const { data: asset, isLoading: assetLoading } = useAsset(selectedAssetId || undefined);
  const { data: risk, isLoading: riskLoading } = useAssetRisk(selectedAssetId || undefined);
  const { data: replay, isLoading: replayLoading } = useAssetReplay(selectedAssetId || undefined);

  return (
    <AnimatePresence>
      {selectedAssetId ? (
        <>
          <motion.div
            className="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedAssetId(null)}
          />
          <motion.aside
            className="drawer"
            initial={{ x: 440 }}
            animate={{ x: 0 }}
            exit={{ x: 440 }}
            transition={{ type: "spring", damping: 30, stiffness: 280 }}
          >
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
                <motion.section
                  className="panel"
                  custom={0}
                  initial="hidden"
                  animate="visible"
                  variants={sectionVariants}
                >
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
                </motion.section>

                <motion.section
                  className="panel"
                  custom={1}
                  initial="hidden"
                  animate="visible"
                  variants={sectionVariants}
                >
                  <h2>Asset Identity</h2>
                  <div className="metric-list" style={{ marginTop: 12 }}>
                    <div className="metric-row"><span>Type</span><strong>{asset.asset_type?.toUpperCase()}</strong></div>
                    <div className="metric-row"><span>Segment</span><strong>{asset.segment}</strong></div>
                    <div className="metric-row"><span>Authorization</span><strong>{asset.authorization_state}</strong></div>
                    <div className="metric-row"><span>Owner</span><strong>{asset.owner || "—"}</strong></div>
                    <div className="metric-row"><span>Site</span><strong>{asset.site}</strong></div>
                  </div>
                </motion.section>

                <motion.section
                  className="panel"
                  custom={2}
                  initial="hidden"
                  animate="visible"
                  variants={sectionVariants}
                >
                  <h2>Open Ports</h2>
                  <div className="filters" style={{ marginTop: 12 }}>
                    {(asset.open_ports || []).map((port: any) => (
                      <span className="chip mono" key={port.port}>{port.port}/{port.service}</span>
                    ))}
                  </div>
                </motion.section>

                <motion.section
                  className="panel"
                  custom={3}
                  initial="hidden"
                  animate="visible"
                  variants={sectionVariants}
                >
                  <h2>Triggered Rules</h2>
                  <div className="filters" style={{ marginTop: 12 }}>
                    {(risk?.triggered_rules || []).map((rule: string) => (
                      <span className="chip" key={rule}>{rule}</span>
                    ))}
                  </div>
                </motion.section>

                <motion.section
                  className="panel"
                  custom={4}
                  initial="hidden"
                  animate="visible"
                  variants={sectionVariants}
                >
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
                </motion.section>

                <motion.section
                  className="panel"
                  custom={5}
                  initial="hidden"
                  animate="visible"
                  variants={sectionVariants}
                >
                  <h2>Actions</h2>
                  <div className="filters" style={{ marginTop: 12 }}>
                    <button className="btn" disabled title="Asset feedback workflow is not implemented in this build"><CheckCircle2 size={15} /> Confirm unavailable</button>
                    <button className="btn" disabled title="Recommendation acceptance is available from the incident workbench"><ShieldAlert size={15} /> Use incident workbench</button>
                    <button className="btn" disabled title="Risk recomputation runs through scan workflows"><RotateCcw size={15} /> Recompute unavailable</button>
                    <button className="btn" disabled title="Report generation is not implemented in this build"><FileText size={15} /> Report unavailable</button>
                  </div>
                </motion.section>
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
