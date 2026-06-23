import React from "react";
import type { MultiDecisionResponse, ClauseResult } from "../../lib/types";

const DECISION_LABEL: Record<string, string> = {
  COVERED: "Covered",
  POSSIBLY_COVERED: "Possibly Covered",
  NOT_COVERED: "Not Covered",
  INFORMATION_ONLY: "More Info Needed",
};

function confidenceWord(score: number): string {
  if (score >= 0.85) return "strong match";
  if (score >= 0.65) return "likely match";
  return "possible match";
}

export function decisionBadge(d?: string): { label: string; color: string } {
  switch ((d || "").toUpperCase()) {
    case "COVERED":
      return { label: "Covered", color: "var(--state-done, #3FB950)" };
    case "POSSIBLY_COVERED":
      return { label: "Possibly Covered", color: "var(--state-gate, #D29922)" };
    case "NOT_COVERED":
      return { label: "Not Covered", color: "var(--state-failed, #F85149)" };
    case "INFORMATION_ONLY":
      return { label: "More Info Needed", color: "var(--text-muted, #8B949E)" };
    default:
      return { label: "Result", color: "var(--text-muted, #8B949E)" };
  }
}

function decisionColor(d: string): string {
  if (d === "COVERED") return "var(--state-done, #3FB950)";
  if (d === "NOT_COVERED") return "var(--state-failed, #F85149)";
  if (d === "POSSIBLY_COVERED") return "var(--state-gate, #D29922)";
  return "var(--text-muted, #8B949E)";
}

function Eligibility({ e }: { e?: ClauseResult["asset_eligibility"] }) {
  if (!e) return null;
  const dur =
    e.duration_months != null ? `${e.duration_months} months` : "No time limit";
  const mil =
    e.warranty_mileage_limit != null
      ? `${e.warranty_mileage_limit.toLocaleString()} miles`
      : "No mileage limit";
  return (
    <div style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "0.8rem", opacity: 0.9, marginTop: "0.4rem" }}>
      <div>Duration: {dur}</div>
      <div>Mileage limit: {mil}</div>
      {e.warranty_expiration_date && <div>Expires: {e.warranty_expiration_date}</div>}
      {e.current_mileage != null && <div>Current mileage: {e.current_mileage.toLocaleString()}</div>}
      <div>
        Time:{" "}
        {e.time_eligible == null ? "n/a" : e.time_eligible ? "eligible ✓" : "expired ✗"}
        {"   "}Mileage:{" "}
        {e.mileage_eligible == null ? "n/a" : e.mileage_eligible ? "eligible ✓" : "exceeded ✗"}
      </div>
    </div>
  );
}

export default function ClauseResultsCard({ data }: { data: MultiDecisionResponse }) {
  if (!data) return null;
  const di = data.defect_interpretation;
  const ex = data.exclusions_checked && data.exclusions_checked[0];
  const results = data.clause_results || [];
  
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {/* User-facing verdict message (rendered as plain text with markdown bold) */}
      {data.user_message ? (
        <div style={{ whiteSpace: "pre-wrap", marginBottom: "0.75rem" }}>{data.user_message}</div>
      ) : null}

      {/* Defect interpretation header */}
      {di && (
        <div style={{ background: "var(--bg-surface, #161B22)", borderRadius: 8, padding: "0.75rem" }}>
          <div style={{ fontWeight: 600 }}>Reported: {String(di.reported_defect || "")}</div>
          <div style={{ fontSize: "0.85rem", opacity: 0.85 }}>
            Interpreted as <b>{String(di.interpreted_component || "")}</b> · {String(di.interpreted_failure_type || "")} · {String(di.defect_category || "")}
          </div>
        </div>
      )}

      {/* One card per matched clause */}
      {results.map((c) => {
        const pct = Math.round((c.context_confidence_score || 0) * 100);
        return (
          <div key={c.coverage_id + String(c.rank)} style={{ background: "var(--bg-surface, #161B22)", borderRadius: 8, padding: "0.85rem", borderLeft: `3px solid ${decisionColor(c.decision)}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span style={{ fontWeight: 700 }}>{c.warranty_heading}</span>{" "}
                <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "0.75rem", opacity: 0.6 }}>
                  {c.coverage_id}
                </span>
              </div>
              <span style={{ color: decisionColor(c.decision), fontWeight: 700, fontSize: "0.85rem" }}>
                {DECISION_LABEL[c.decision] || c.decision} · {confidenceWord(c.context_confidence_score || 0)}
              </span>
            </div>
            {c.why_matched && <div style={{ fontSize: "0.88rem", marginTop: "0.4rem" }}>{c.why_matched}</div>}
            {c.explanation && <div style={{ fontSize: "0.88rem", marginTop: "0.3rem", opacity: 0.9 }}>{c.explanation}</div>}
            {c.decision !== "INFORMATION_ONLY" && <Eligibility e={c.asset_eligibility} />}
            {(c.page_number != null || c.chunk_id) && (
              <div style={{ fontSize: "0.72rem", opacity: 0.55, marginTop: "0.4rem", fontFamily: "var(--font-mono, monospace)" }}>
                Source: {c.page_number != null ? `p.${c.page_number}` : ""} {c.chunk_id ? `· ${c.chunk_id}` : ""}
              </div>
            )}
          </div>
        );
      })}

      {/* Exclusion check (shared) */}
      {ex && ex.exclusion_result && (
        <div style={{ background: "var(--bg-surface, #161B22)", borderRadius: 8, padding: "0.7rem", fontSize: "0.85rem" }}>
          <b>Exclusion check:</b> {String(ex.exclusion_result || "")}
          {ex.exclusion_confidence_score != null ? ` (${Math.round(Number(ex.exclusion_confidence_score) * 100)}%)` : ""} — {String(ex.explanation || "")}
        </div>
      )}
    </div>
  );
}
