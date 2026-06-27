import React from "react";
import AnswerMarkdown from "./AnswerMarkdown";
import type { MultiDecisionResponse, ClauseResult } from "../../lib/types";

const TEXT_PRIMARY = "#E6EDF3";
const TEXT_SECONDARY = "#B7C2CC";

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
      return { label: "Covered", color: "#3FB950" };
    case "POSSIBLY_COVERED":
      return { label: "Possibly Covered", color: "#D29922" };
    case "NOT_COVERED":
      return { label: "Not Covered", color: "#F85149" };
    case "INFORMATION_ONLY":
      return { label: "More Info Needed", color: "#8B949E" };
    default:
      return { label: "Result", color: "#8B949E" };
  }
}

function decisionColor(d: string): string {
  if (d === "COVERED") return "#3FB950";
  if (d === "NOT_COVERED") return "#F85149";
  if (d === "POSSIBLY_COVERED") return "#D29922";
  return "#8B949E";
}

function Eligibility({ e }: { e?: ClauseResult["asset_eligibility"] }) {
  if (!e) return null;
  const dur = e.duration_months != null ? `${e.duration_months} months` : "No time limit";
  const mil =
    e.warranty_mileage_limit != null ? `${e.warranty_mileage_limit.toLocaleString()} miles` : "No mileage limit";
  return (
    <div style={{ fontFamily: "monospace", fontSize: "0.8rem", color: TEXT_SECONDARY, marginTop: "0.4rem" }}>
      <div>Duration: {dur}</div>
      <div>Mileage limit: {mil}</div>
      {e.warranty_expiration_date && <div>Expires: {e.warranty_expiration_date}</div>}
      {e.current_mileage != null && <div>Current mileage: {e.current_mileage.toLocaleString()}</div>}
      <div>
        Time: {e.time_eligible == null ? "n/a" : e.time_eligible ? "eligible ✓" : "expired ✗"}
        {"   "}Mileage: {e.mileage_eligible == null ? "n/a" : e.mileage_eligible ? "eligible ✓" : "exceeded ✗"}
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
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", color: TEXT_PRIMARY }}>
      {data.user_message ? (
        <div style={{ marginBottom: "0.75rem" }}>
          <AnswerMarkdown text={data.user_message} />
        </div>
      ) : null}

      {di && (
        <div style={{ background: "#161B22", borderRadius: 8, padding: "0.75rem", color: TEXT_PRIMARY }}>
          <div style={{ fontWeight: 600, color: TEXT_PRIMARY }}>Reported: {String(di.reported_defect || "")}</div>
          <div style={{ fontSize: "0.85rem", color: TEXT_SECONDARY, marginTop: 4 }}>
            Interpreted as{" "}
            <b style={{ color: TEXT_PRIMARY }}>{String(di.interpreted_component || "")}</b> ·{" "}
            {String(di.interpreted_failure_type || "")} · {String(di.defect_category || "")}
          </div>
        </div>
      )}

      {results
        .filter((c) => c.warranty_heading || c.why_matched || c.explanation)
        .map((c) => (
          <div
            key={c.coverage_id + String(c.rank)}
            style={{
              background: "#161B22",
              borderRadius: 8,
              padding: "0.85rem",
              borderLeft: `3px solid ${decisionColor(c.decision)}`,
              color: TEXT_PRIMARY,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span style={{ fontWeight: 700, color: TEXT_PRIMARY }}>{c.warranty_heading}</span>{" "}
                <span style={{ fontFamily: "monospace", fontSize: "0.75rem", color: TEXT_SECONDARY }}>
                  {c.coverage_id}
                </span>
              </div>
              <span style={{ color: decisionColor(c.decision), fontWeight: 700, fontSize: "0.85rem" }}>
                {DECISION_LABEL[c.decision] || c.decision} · {confidenceWord(c.context_confidence_score || 0)}
              </span>
            </div>
            {c.why_matched && (
              <div style={{ fontSize: "0.88rem", marginTop: "0.4rem", color: TEXT_PRIMARY }}>{c.why_matched}</div>
            )}
            {c.explanation && (
              <div style={{ fontSize: "0.88rem", marginTop: "0.3rem", color: TEXT_SECONDARY }}>{c.explanation}</div>
            )}
            {c.decision !== "INFORMATION_ONLY" && <Eligibility e={c.asset_eligibility} />}
            {c.matched_context_summary && (
              <div style={{ fontSize: "0.82rem", marginTop: "0.4rem", color: TEXT_SECONDARY, fontStyle: "italic" }}>
                {c.matched_context_summary}
              </div>
            )}
            {c.page_number != null && (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: "0.72rem",
                  marginTop: "0.5rem",
                  padding: "2px 8px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.08)",
                  color: "#00D9C0",
                  fontFamily: "monospace",
                  fontWeight: 600,
                }}
              >
                📄 Page {c.page_number}
              </div>
            )}
          </div>
        ))}

      {ex && ex.exclusion_result && (
        <div style={{ background: "#161B22", borderRadius: 8, padding: "0.7rem", fontSize: "0.85rem", color: TEXT_PRIMARY }}>
          <b style={{ color: TEXT_PRIMARY }}>Exclusion check:</b>{" "}
          <span style={{ color: TEXT_SECONDARY }}>
            {String(ex.exclusion_result || "")}
            {ex.exclusion_confidence_score != null
              ? ` (${Math.round(Number(ex.exclusion_confidence_score) * 100)}%)`
              : ""}{" "}
            — {String(ex.explanation || "")}
          </span>
        </div>
      )}
    </div>
  );
}
