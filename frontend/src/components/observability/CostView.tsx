"use client";

import { useEffect, useState } from "react";
import { getDocumentCost } from "../../lib/api";

export default function CostView({ documentId }: { documentId: string }) {
  const [data, setData] = useState<{ totalUsd?: number; breakdown?: Array<{ stage: string; usd: number }> } | null>(
    null
  );

  useEffect(() => {
    getDocumentCost(documentId)
      .then((r) => setData(r.data))
      .catch(() => setData({ totalUsd: 0, breakdown: [] }));
  }, [documentId]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="card" style={{ padding: 16 }}>
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Onboarding total</div>
        <div style={{ fontSize: 28, fontWeight: 600 }}>${(data?.totalUsd ?? 0).toFixed(4)}</div>
      </div>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {(data?.breakdown || []).map((row) => (
          <div
            key={row.stage}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "12px 16px",
              borderBottom: "1px solid var(--border)",
              fontSize: 13,
            }}
          >
            <span>{row.stage}</span>
            <span className="mono">${row.usd.toFixed(4)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
