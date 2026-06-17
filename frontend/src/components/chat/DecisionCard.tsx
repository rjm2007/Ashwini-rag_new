"use client";

import CoverageDecisionTag from "./CoverageDecision";
import type { CoverageDecision } from "../../lib/types";

export default function DecisionCard({
  decision,
  reasons,
  turnCostUsd,
}: {
  decision: CoverageDecision;
  reasons?: string[];
  turnCostUsd?: number;
}) {
  return (
    <div className="card" style={{ padding: 14, marginTop: 8 }}>
      <CoverageDecisionTag decision={decision} />
      {reasons?.length ? (
        <ul style={{ margin: "10px 0 0", paddingLeft: 18, fontSize: 12, color: "var(--text-secondary)" }}>
          {reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      ) : null}
      {turnCostUsd != null ? (
        <div style={{ marginTop: 8, fontSize: 11, color: "var(--text-muted)" }}>
          Turn cost: ${turnCostUsd.toFixed(4)}
        </div>
      ) : null}
    </div>
  );
}
