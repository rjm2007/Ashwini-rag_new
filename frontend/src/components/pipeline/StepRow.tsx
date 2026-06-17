"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import StatusDot from "../ui/StatusDot";
import type { PipelineEvent } from "../../lib/types";

export type StepRowData = {
  step_key: string;
  step_label: string;
  status: "running" | "done" | "failed" | "idle";
  duration_ms?: number | null;
  detail?: Record<string, unknown>;
};

function timingText(step: StepRowData): { text: string; color: string; breathe?: boolean } {
  if (step.status === "done") {
    const sec = ((step.duration_ms ?? 1000) / 1000).toFixed(1);
    const cost = step.detail?.stage_cost_usd;
    const costText =
      typeof cost === "number" ? ` · $${cost.toFixed(4)}` : "";
    return { text: `done in ${sec}s${costText}`, color: "var(--state-done)" };
  }
  if (step.status === "running") return { text: "running…", color: "var(--accent)" };
  if (step.status === "failed") return { text: "failed", color: "var(--state-failed)" };
  return { text: "waiting", color: "var(--state-idle)" };
}

export default function StepRow({ step }: { step: StepRowData }) {
  const [open, setOpen] = useState(false);
  const timing = timingText(step);
  const hasDetail = step.detail && Object.keys(step.detail).length > 0;

  return (
    <div style={{ borderBottom: "1px solid var(--border)" }}>
      <button
        type="button"
        onClick={() => hasDetail && setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          width: "100%",
          padding: "8px 0",
          background: "none",
          border: "none",
          cursor: hasDetail ? "pointer" : "default",
          color: "inherit",
          textAlign: "left",
          gap: 10
        }}
      >
        <StatusDot status={step.status === "idle" ? "idle" : step.status} />
        <span style={{ flex: 1, fontSize: 13, color: "var(--text-primary)" }}>{step.step_label}</span>
        <span className="mono" style={{ fontSize: 11, color: timing.color }}>
          {timing.text}
        </span>
        {hasDetail ? (
          <ChevronDown
            size={12}
            style={{
              color: "var(--text-muted)",
              transform: open ? "rotate(180deg)" : "none",
              transition: "transform 0.15s"
            }}
          />
        ) : null}
      </button>
      {open && hasDetail ? (
        <div
          className="mono"
          style={{
            fontSize: 11,
            color: "var(--text-muted)",
            background: "var(--bg-raised)",
            borderRadius: 6,
            padding: 8,
            marginBottom: 8
          }}
        >
          {Object.entries(step.detail!).map(([k, v]) => (
            <div key={k}>
              {k}: {typeof v === "object" ? JSON.stringify(v) : String(v)}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function eventToStepRow(event: PipelineEvent): StepRowData {
  return {
    step_key: event.step_key,
    step_label: event.step_label,
    status: event.status === "idle" ? "idle" : event.status,
    duration_ms: event.duration_ms,
    detail: event.detail
  };
}
