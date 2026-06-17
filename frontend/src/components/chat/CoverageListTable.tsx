"use client";

import type { CoverageComponent } from "../../lib/types";

export default function CoverageListTable({ coverages }: { coverages: Partial<CoverageComponent>[] }) {
  return (
    <div className="card" style={{ marginTop: 8, overflow: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ textAlign: "left", color: "var(--text-muted)" }}>
            <th style={{ padding: 10 }}>Code</th>
            <th style={{ padding: 10 }}>Name</th>
            <th style={{ padding: 10 }}>Period</th>
          </tr>
        </thead>
        <tbody>
          {coverages.map((row) => (
            <tr key={row.coverage_id} style={{ borderTop: "1px solid var(--border)" }}>
              <td style={{ padding: 10, fontFamily: "monospace" }}>{row.coverage_id}</td>
              <td style={{ padding: 10 }}>{row.coverage_name}</td>
              <td style={{ padding: 10 }}>{row.coverage_period?.duration_text || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
