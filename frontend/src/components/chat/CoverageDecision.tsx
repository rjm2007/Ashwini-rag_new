import type { CoverageDecision as CoverageDecisionType } from "../../lib/types";

const CONFIG: Record<string, { bg: string; color: string; label: string }> = {
  covered: { bg: "rgba(72,187,120,0.12)", color: "#48BB78", label: "COVERED" },
  covered_with_limits: { bg: "rgba(72,187,120,0.12)", color: "#48BB78", label: "COVERED" },
  not_covered: { bg: "rgba(252,129,129,0.12)", color: "#FC8181", label: "NOT COVERED" },
  partial: { bg: "rgba(236,201,75,0.12)", color: "#ECC94B", label: "PARTIAL" },
  insufficient_evidence: { bg: "rgba(74,85,104,0.2)", color: "var(--text-muted)", label: "INSUFFICIENT" },
  answered: { bg: "rgba(63,185,80,0.12)", color: "var(--state-done)", label: "ANSWERED" },
  not_in_document: { bg: "rgba(210,153,34,0.12)", color: "var(--gate-amber)", label: "NOT IN DOCUMENT" },
  needs_clarification: { bg: "rgba(74,85,104,0.2)", color: "var(--text-muted)", label: "NEEDS CLARIFICATION" },
};

export default function CoverageDecision({ decision }: { decision: CoverageDecisionType | string }) {
  const key = (decision || "insufficient_evidence").toLowerCase().replace(/-/g, "_");
  const cfg = CONFIG[key] || CONFIG.insufficient_evidence;

  return (
    <span
      style={{
        display: "inline-flex",
        marginTop: 6,
        fontSize: 10,
        fontWeight: 500,
        textTransform: "uppercase",
        padding: "2px 8px",
        borderRadius: 4,
        background: cfg.bg,
        color: cfg.color
      }}
    >
      {cfg.label}
    </span>
  );
}

export function inferCoverageDecision(
  confidence: number,
  meta?: Record<string, unknown>
): CoverageDecisionType {
  const fromMeta =
    (meta?.coverageDecision as string) ||
    (meta?.coverage_decision as string);
  if (fromMeta) return fromMeta as CoverageDecisionType;
  if (confidence >= 0.75) return "covered";
  if (confidence >= 0.45) return "partial";
  return "insufficient_evidence";
}
