"use client";

import { useEffect, useState } from "react";
import { getDailyCost } from "../../lib/api";

export default function DashboardCostSummary() {
  const [data, setData] = useState<{
    today_usd?: number;
    month_usd?: number;
    avg_per_query_usd?: number;
    by_model?: Array<{ model: string; cost_usd: number }>;
  } | null>(null);

  useEffect(() => {
    getDailyCost()
      .then((res) => setData(res.data))
      .catch(() => setData(null));
  }, []);

  if (!data) return null;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
      <CostTile label="Today's cost" value={`$${(data.today_usd ?? 0).toFixed(2)}`} />
      <CostTile label="This month" value={`$${(data.month_usd ?? 0).toFixed(2)}`} />
      <CostTile label="Avg cost / query" value={`$${(data.avg_per_query_usd ?? 0).toFixed(4)}`} />
      {data.by_model?.slice(0, 3).map((row) => (
        <CostTile key={row.model} label={row.model} value={`$${row.cost_usd.toFixed(4)}`} />
      ))}
    </div>
  );
}

function CostTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="card" style={{ padding: 14 }}>
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 600, fontFamily: "monospace" }}>{value}</div>
    </div>
  );
}
