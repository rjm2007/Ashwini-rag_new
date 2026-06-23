"use client";

import { useState } from "react";
import { Check, X, Info, ChevronDown, ChevronRight } from "lucide-react";
import type { CoverageDecision } from "../../lib/types";

export type DecisionCardProps = {
  coverageDecision: CoverageDecision;
  explanation?: string;
  matchedComponent?: {
    coverage_id: string;
    coverage_name: string;
    hierarchy?: Record<string, string | null>;
  };
  assetEligibility?: import("../../lib/types").ClauseEligibility;
  durationMonths?: number | null;
  mileageLimit?: number | null;
  mileageUnit?: string | null;
  checks?: { type: string; passed: boolean | null; detail: string }[];
  evidence?: { page?: number; text_reference?: string; quote?: string; coverageId?: string }[];
  exclusions?: { title?: string; text?: string; page?: number }[];
  conditions?: { title?: string; text?: string; page?: number }[];
  confidence?: number;
  turnCostUsd?: number;
  limitOfLiability?: {
    amount: number;
    currency: string;
    basis?: string;
    by_class?: Record<string, number>;
  };
  deductible?: { amount: number; conditions?: string };
  planTier?: string;
  reasons?: string[];
};

const BANNER: Record<string, { label: string; bg: string; color: string; Icon: typeof Check }> = {
  covered: { label: "COVERED", bg: "var(--state-done)", color: "var(--conf-high)", Icon: Check },
  not_covered: { label: "NOT COVERED", bg: "#3d1515", color: "#f87171", Icon: X },
  partial: { label: "PARTIALLY COVERED", bg: "var(--bg-hover)", color: "var(--conf-medium)", Icon: Info },
  insufficient_evidence: { label: "NEED MORE INFO", bg: "var(--bg-hover)", color: "var(--text-muted)", Icon: Info },
};

export default function DecisionCard(props: DecisionCardProps) {
  const {
    coverageDecision,
    explanation,
    matchedComponent,
    durationMonths,
    mileageLimit,
    mileageUnit,
    checks,
    evidence,
    exclusions,
    conditions,
    confidence,
    turnCostUsd,
    limitOfLiability,
    deductible,
    planTier,
    reasons,
  } = props;

  const banner = BANNER[coverageDecision] || BANNER.insufficient_evidence;
  const Icon = banner.Icon;
  const [showExclusions, setShowExclusions] = useState(false);
  const [showConditions, setShowConditions] = useState(false);

  const hierarchy = matchedComponent?.hierarchy
    ? [matchedComponent.hierarchy.system, matchedComponent.hierarchy.subsystem, matchedComponent.hierarchy.component_group]
        .filter(Boolean)
        .join(" › ")
    : "";

  return (
    <div className="card" style={{ padding: 0, marginTop: 8, overflow: "hidden" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          background: banner.bg,
          color: banner.color,
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Icon size={14} />
          {banner.label}
        </span>
        {confidence != null ? <span>{Math.round(confidence * 100)}%</span> : null}
      </div>

      <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
        {matchedComponent ? (
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{matchedComponent.coverage_name}</div>
            <div style={{ fontSize: 11, fontFamily: "monospace", color: "var(--text-muted)" }}>
              {matchedComponent.coverage_id}
            </div>
            {hierarchy ? (
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{hierarchy}</div>
            ) : null}
          </div>
        ) : null}

        {explanation ? (
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "var(--text-primary)" }}>{explanation}</p>
        ) : null}

        <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
          <div>Duration: {props.assetEligibility?.duration_months != null ? `${props.assetEligibility.duration_months} months` : "No time limit"}</div>
          <div>Mileage: {props.assetEligibility?.warranty_mileage_limit != null ? `${props.assetEligibility.warranty_mileage_limit.toLocaleString()} miles` : "No mileage limit"}</div>
        </div>

        {checks?.length ? (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "var(--text-secondary)" }}>
            {checks.map((c) => (
              <li key={`${c.type}-${c.detail}`}>
                {c.detail} {c.passed === true ? "✓" : c.passed === false ? "✗" : ""}
              </li>
            ))}
          </ul>
        ) : reasons?.length ? (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "var(--text-secondary)" }}>
            {reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        ) : null}

        {(limitOfLiability?.amount || deductible?.amount || planTier) && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, fontSize: 11 }}>
            {limitOfLiability?.amount != null ? (
              <span style={{ padding: "2px 8px", borderRadius: 999, border: "1px solid var(--border)" }}>
                {limitOfLiability.by_class
                  ? Object.entries(limitOfLiability.by_class)
                      .map(([k, v]) => `${k} $${v.toLocaleString()}`)
                      .join(" · ")
                  : `$${limitOfLiability.amount.toLocaleString()} LOL`}
              </span>
            ) : null}
            {deductible?.amount != null ? (
              <span style={{ padding: "2px 8px", borderRadius: 999, border: "1px solid var(--border)" }}>
                ${deductible.amount} deductible
              </span>
            ) : null}
            {planTier ? (
              <span style={{ padding: "2px 8px", borderRadius: 999, background: "var(--bg-hover)" }}>
                {planTier}
              </span>
            ) : null}
          </div>
        )}

        {evidence?.length ? (
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>Sources</div>
            {evidence.map((ev, i) => (
              <div key={i} style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 6 }}>
                <span style={{ fontFamily: "monospace" }}>{ev.quote || ev.text_reference || "—"}</span>
                {ev.page != null ? (
                  <span style={{ marginLeft: 8, color: "var(--accent)" }}>p.{ev.page}</span>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        {exclusions?.length ? (
          <div>
            <button
              type="button"
              onClick={() => setShowExclusions(!showExclusions)}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: 12,
                color: "var(--text-primary)",
                cursor: "pointer",
              }}
            >
              {showExclusions ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              Exclusions ({exclusions.length})
            </button>
            {showExclusions ? (
              <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 11, color: "var(--text-secondary)" }}>
                {exclusions.map((ex) => (
                  <li key={ex.title || ex.text}>{ex.title ? `${ex.title}: ` : ""}{ex.text}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {conditions?.length ? (
          <div>
            <button
              type="button"
              onClick={() => setShowConditions(!showConditions)}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: 12,
                color: "var(--text-primary)",
                cursor: "pointer",
              }}
            >
              {showConditions ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              Conditions ({conditions.length})
            </button>
            {showConditions ? (
              <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 11, color: "var(--text-secondary)" }}>
                {conditions.map((c) => (
                  <li key={c.title || c.text}>{c.title ? `${c.title}: ` : ""}{c.text}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {turnCostUsd != null ? (
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Run cost: ${turnCostUsd.toFixed(4)}</div>
        ) : null}
      </div>
    </div>
  );
}
