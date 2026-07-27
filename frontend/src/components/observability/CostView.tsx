"use client";

import { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";
import { getDocumentCost } from "../../lib/api";

interface DocumentCost {
  totalUsd?: number;
  breakdown?: Array<{ stage: string; usd: number }>;
  /** Set by the backend when the AI service could not be reached. */
  unavailable?: boolean;
}

type Load = { state: "loading" } | { state: "error" } | { state: "ready"; data: DocumentCost };

export default function CostView({ documentId }: { documentId: string }) {
  // This used to render "$0.0000" while the request was still in flight and
  // again if it failed — presenting a confident zero for a number it did not
  // have. Loading and failure are now distinct from a real zero.
  const [load, setLoad] = useState<Load>({ state: "loading" });

  useEffect(() => {
    let cancelled = false;
    setLoad({ state: "loading" });
    getDocumentCost(documentId)
      .then((r) => {
        if (cancelled) return;
        const data = r.data as DocumentCost;
        setLoad(data?.unavailable ? { state: "error" } : { state: "ready", data });
      })
      .catch(() => {
        if (!cancelled) setLoad({ state: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [documentId]);

  if (load.state === "loading") {
    return (
      <div className="card" style={{ padding: 16 }}>
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Onboarding total</div>
        <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 8 }}>Loading…</div>
      </div>
    );
  }

  if (load.state === "error") {
    return (
      <div
        className="card"
        style={{
          padding: 16,
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 13,
          color: "var(--state-failed)",
        }}
      >
        <AlertCircle size={15} />
        Couldn&apos;t load cost data — the AI service is unreachable.
      </div>
    );
  }

  const { data } = load;
  const breakdown = data.breakdown || [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="card" style={{ padding: 16 }}>
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Onboarding total</div>
        <div style={{ fontSize: 28, fontWeight: 600 }}>${(data.totalUsd ?? 0).toFixed(4)}</div>
      </div>

      {breakdown.length === 0 ? (
        <div className="card" style={{ padding: 16, fontSize: 13, color: "var(--text-muted)" }}>
          No cost events recorded for this document.
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {breakdown.map((row) => (
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
      )}
    </div>
  );
}
