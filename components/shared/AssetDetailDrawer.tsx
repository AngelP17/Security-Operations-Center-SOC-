"use client";

import { X, CheckCircle2, FileText, RotateCcw, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useForgeStore } from "@/lib/store";
import { RiskBadge } from "./RiskBadge";

export function AssetDetailDrawer() {
  const { selectedAsset, setSelectedAsset } = useForgeStore();

  return (
    <AnimatePresence>
      {selectedAsset ? (
        <>
          <motion.div className="backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedAsset(null)} />
          <motion.aside className="drawer" initial={{ x: 540 }} animate={{ x: 0 }} exit={{ x: 540 }} transition={{ type: "spring", damping: 30, stiffness: 280 }}>
            <div className="page-head">
              <div>
                <div className="eyebrow">Asset biography</div>
                <h1>{selectedAsset.hostname}</h1>
                <p className="mono muted">{selectedAsset.ip} · {selectedAsset.mac}</p>
              </div>
              <button className="btn" onClick={() => setSelectedAsset(null)} aria-label="Close drawer"><X size={16} /></button>
            </div>
            <div className="grid">
              <section className="panel">
                <div className="page-head" style={{ marginBottom: 10 }}>
                  <h2>Risk Decision</h2>
                  <RiskBadge level={selectedAsset.riskLevel} score={selectedAsset.risk} />
                </div>
                <p className="muted">{selectedAsset.reason}</p>
              </section>
              <section className="panel metric-list">
                <h2>Score Breakdown</h2>
                {selectedAsset.scoreBreakdown.map((item) => (
                  <div className="metric-row" key={item.label}>
                    <span>{item.label}</span>
                    <strong className="mono">{item.value > 0 ? "+" : ""}{item.value}</strong>
                  </div>
                ))}
              </section>
              <section className="panel">
                <h2>Asset Identity</h2>
                <div className="metric-list" style={{ marginTop: 12 }}>
                  <div className="metric-row"><span>What is it?</span><strong>{selectedAsset.type.toUpperCase()}</strong></div>
                  <div className="metric-row"><span>Where is it?</span><strong>{selectedAsset.segment}</strong></div>
                  <div className="metric-row"><span>Authorized?</span><strong>{selectedAsset.authorization}</strong></div>
                  <div className="metric-row"><span>Changed recently?</span><strong>{selectedAsset.newSinceLastScan ? "New since scan" : "Stable"}</strong></div>
                </div>
              </section>
              <section className="panel">
                <h2>Open Ports</h2>
                <div className="filters" style={{ marginTop: 12 }}>
                  {selectedAsset.ports.map((port) => <span className="chip mono" key={port.port}>{port.port}/{port.service}</span>)}
                </div>
              </section>
              <section className="panel">
                <h2>Recommendations</h2>
                <p className="muted" style={{ marginTop: 8 }}>{selectedAsset.recommendation}</p>
              </section>
              <section className="panel">
                <h2>Evidence & Audit Trail</h2>
                {[...selectedAsset.evidence, ...selectedAsset.audit].map((item) => <p className="muted" style={{ marginTop: 8 }} key={item}>• {item}</p>)}
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
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
