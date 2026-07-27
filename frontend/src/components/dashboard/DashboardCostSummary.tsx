"use client";

/**
 * Processing cost broken down by pipeline stage.
 *
 * The headline figures (today / month / avg per query) moved up into the sky
 * header on the dashboard, so this component no longer fetches: it renders the
 * `by_stage` map the page already has. That keeps the dashboard to a single
 * request for cost instead of two.
 */

export interface DailyCost {
  today_usd?: number;
  month_usd?: number;
  avg_per_query_usd?: number;
  by_stage?: Record<string, number>;
  /** Set by the backend when the AI service could not be reached. */
  unavailable?: boolean;
}

/**
 * Two decimals hid everything this platform actually spends: a real total of
 * $0.000721 rendered as "$0.00", which reads as "nothing was spent". Sub-cent
 * amounts get the precision they need; larger ones stay in plain dollars.
 */
export function formatUsd(value?: number): string {
  const n = value ?? 0;
  if (n === 0) return "$0.00";
  if (n < 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(2)}`;
}

export default function DashboardCostSummary({
  byStage,
  loading,
}: {
  byStage?: Record<string, number>;
  loading?: boolean;
}) {
  const stages = Object.entries(byStage || {}).sort((a, b) => b[1] - a[1]);
  const total = stages.reduce((sum, [, usd]) => sum + usd, 0);

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px 10px" }}>
        <h3 style={{ margin: 0, fontSize: 12.5, fontWeight: 650 }}>Cost by stage</h3>
        <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>today</span>
      </div>

      {loading ? (
        <div style={{ padding: "0 18px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ height: 10, borderRadius: 4, background: "var(--border)", opacity: 0.6 }} />
          ))}
        </div>
      ) : stages.length === 0 ? (
        <div style={{ padding: "0 18px 18px", fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.6 }}>
          No spend recorded today. Stage costs appear here once a document is processed
          or a question is answered.
        </div>
      ) : (
        <div style={{ padding: "0 18px 16px", display: "flex", flexDirection: "column", gap: 11 }}>
          {stages.map(([stage, usd]) => {
            const pct = total > 0 ? Math.max(2, (usd / total) * 100) : 0;
            return (
              <div key={stage}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)", textTransform: "capitalize" }}>
                    {stage.replace(/_/g, " ")}
                  </span>
                  <span className="mono tnum" style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                    {formatUsd(usd)}
                  </span>
                </div>
                <div
                  style={{
                    height: 6,
                    borderRadius: "var(--r-pill)",
                    background: "var(--bg-sunk)",
                    overflow: "hidden",
                  }}
                >
                  <div style={{ width: `${pct}%`, height: "100%", background: "var(--accent)" }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
