"use client";

import type { CoverageListItem } from "../../lib/types";

export default function CoverageListCard({ coverages }: { coverages: CoverageListItem[] }) {
  return (
    <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
      {coverages.map((row) => (
        <div
          key={`${row.documentId || ""}-${row.coverage_id}`}
          className="card"
          style={{ padding: 12, display: "flex", flexDirection: "column", gap: 6 }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
            <div>
              <span style={{ fontFamily: "monospace", fontSize: 12, color: "var(--accent)", fontWeight: 600 }}>
                {row.coverage_id}
              </span>
              <div style={{ fontSize: 14, fontWeight: 500, marginTop: 2 }}>{row.coverage_name}</div>
            </div>
            {row.coverage_type ? (
              <span
                style={{
                  fontSize: 10,
                  padding: "2px 8px",
                  borderRadius: 999,
                  background: "var(--bg-hover)",
                  color: "var(--text-muted)",
                }}
              >
                {row.coverage_type}
              </span>
            ) : null}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, fontSize: 11, color: "var(--text-secondary)" }}>
            {row.period_label ? <span>{row.period_label}</span> : null}
            {row.limit_of_liability?.amount != null ? (
              <span style={{ border: "1px solid var(--border)", borderRadius: 999, padding: "2px 8px" }}>
                ${row.limit_of_liability.amount.toLocaleString()} LOL
              </span>
            ) : null}
          </div>

          {row.eligibility_hint ? (
            <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5 }}>
              {row.eligibility_hint}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
