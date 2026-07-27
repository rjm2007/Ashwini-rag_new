"use client";

import { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";
import { getDailyCost } from "../../lib/api";

interface DailyCost {
  today_usd?: number;
  month_usd?: number;
  avg_per_query_usd?: number;
  by_stage?: Record<string, number>;
  /** Set by the backend when the AI service could not be reached. */
  unavailable?: boolean;
}

type Load = { state: "loading" } | { state: "error" } | { state: "ready"; data: DailyCost };

export default function DashboardCostSummary() {
  // Previously this held `null` for both "still loading" and "request failed",
  // and rendered nothing in either case — so a broken dashboard looked simply
  // empty, with no way to tell the two apart.
  const [load, setLoad] = useState<Load>({ state: "loading" });

  useEffect(() => {
    let cancelled = false;
    getDailyCost()
      .then((res) => {
        if (cancelled) return;
        const data = res.data as DailyCost;
        setLoad(data?.unavailable ? { state: "error" } : { state: "ready", data });
      })
      .catch(() => {
        if (!cancelled) setLoad({ state: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (load.state === "loading") {
    return (
      <div style={GRID}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="card" style={{ padding: 14 }}>
            <Skeleton width={72} height={10} />
            <div style={{ height: 8 }} />
            <Skeleton width={96} height={20} />
          </div>
        ))}
      </div>
    );
  }

  if (load.state === "error") {
    return (
      <div
        className="card"
        style={{
          padding: 14,
          marginBottom: 24,
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
  const stages = Object.entries(data.by_stage || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <div style={GRID}>
      <CostTile label="Today's cost" value={formatUsd(data.today_usd)} />
      <CostTile label="This month" value={formatUsd(data.month_usd)} />
      <CostTile label="Avg cost / query" value={formatUsd(data.avg_per_query_usd)} />
      {stages.map(([stage, usd]) => (
        <CostTile key={stage} label={stage} value={formatUsd(usd)} />
      ))}
    </div>
  );
}

/**
 * Two decimals hid everything this platform actually spends: a real total of
 * $0.000721 rendered as "$0.00", which reads as "nothing was spent". Sub-cent
 * amounts get the precision they need; larger ones stay in plain dollars.
 */
function formatUsd(value?: number): string {
  const n = value ?? 0;
  if (n === 0) return "$0.00";
  if (n < 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(2)}`;
}

const GRID: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: 12,
  marginBottom: 24,
};

function CostTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="card" style={{ padding: 14 }}>
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 600, fontFamily: "monospace" }}>{value}</div>
    </div>
  );
}

function Skeleton({ width, height }: { width: number; height: number }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 4,
        background: "var(--border)",
        opacity: 0.6,
      }}
    />
  );
}
