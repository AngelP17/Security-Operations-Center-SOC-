"use client";

import { useMemo } from "react";
import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { ExternalLink } from "lucide-react";
import { assets, type Asset } from "@/lib/security-data";
import { RiskBadge } from "@/components/shared/RiskBadge";
import { useForgeStore } from "@/lib/store";

const columnHelper = createColumnHelper<Asset>();

export function RiskQueue() {
  const { setSelectedAsset, riskFilter, setRiskFilter } = useForgeStore();
  const data = useMemo(
    () => assets.filter((asset) => riskFilter === "all" || asset.riskLevel === riskFilter).sort((a, b) => b.risk - a.risk),
    [riskFilter]
  );
  const columns = [
    columnHelper.accessor("risk", { header: "Risk", cell: (info) => <RiskBadge level={info.row.original.riskLevel} score={info.getValue()} /> }),
    columnHelper.accessor("hostname", { header: "Asset", cell: (info) => <strong>{info.getValue()}</strong> }),
    columnHelper.accessor("ip", { header: "IP", cell: (info) => <span className="mono">{info.getValue()}</span> }),
    columnHelper.accessor("segment", { header: "Segment" }),
    columnHelper.accessor("reason", { header: "Reason" }),
    columnHelper.accessor("triggeredRules", { header: "Triggered Rules", cell: (info) => <span className="mono">{info.getValue().slice(0, 2).join(", ")}</span> }),
    columnHelper.accessor("recommendation", { header: "Recommendation" }),
    columnHelper.accessor("lastSeen", { header: "Last Seen", cell: (info) => <span className="mono">{info.getValue()}</span> }),
    columnHelper.display({ id: "actions", cell: () => <span className="row-actions"><ExternalLink size={15} /></span> })
  ];

  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() });

  return (
    <section className="panel">
      <div className="page-head">
        <div>
          <div className="eyebrow">Prioritized Risk Queue</div>
          <h2>Queue by security risk decision</h2>
        </div>
        <div className="filters">
          {["all", "critical", "high", "medium", "low"].map((level) => (
            <button className={`filter ${riskFilter === level ? "active" : ""}`} key={level} onClick={() => setRiskFilter(level)}>
              {level}
            </button>
          ))}
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>{group.headers.map((header) => <th key={header.id}>{flexRender(header.column.columnDef.header, header.getContext())}</th>)}</tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} onClick={() => setSelectedAsset(row.original)}>
                {row.getVisibleCells().map((cell) => <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
