"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, ChevronRight, Loader2 } from "lucide-react";
import type { StageState, StageId } from "./stageModel";
import StepRow, { eventToStepRow } from "./StepRow";
import CertifyGate from "./CertifyGate";

function StatusDotStage({ status }: { status: StageState["status"] }) {
  if (status === "done") {
    return (
      <motion.div
        initial={{ scale: 0.6 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 20 }}
        style={{
          width: 22, height: 22, borderRadius: "50%",
          background: "var(--state-done)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Check size={12} color="#FFF" strokeWidth={3} />
      </motion.div>
    );
  }
  if (status === "running") {
    return (
      <div
        style={{
          width: 22, height: 22, borderRadius: "50%",
          border: "2px solid var(--accent)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, position: "relative",
        }}
      >
        <div
          className="animate-breathe"
          style={{
            position: "absolute", inset: -3, borderRadius: "50%",
            border: "2px solid var(--accent)", opacity: 0.3,
          }}
        />
        <Loader2 size={12} color="var(--accent)" className="animate-spin" />
      </div>
    );
  }
  if (status === "failed") {
    return (
      <div
        style={{
          width: 22, height: 22, borderRadius: "50%",
          background: "var(--state-failed)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <X size={12} color="#FFF" strokeWidth={3} />
      </div>
    );
  }
  // waiting
  return (
    <div
      style={{
        width: 22, height: 22, borderRadius: "50%",
        border: "2px solid var(--state-idle)",
        flexShrink: 0,
      }}
    />
  );
}

function formatDuration(ms: number | null): string {
  if (ms == null) return "";
  const sec = ms / 1000;
  if (sec < 60) return `${sec.toFixed(1)}s`;
  const min = Math.floor(sec / 60);
  const remSec = Math.floor(sec % 60);
  return `${min}m ${remSec}s`;
}

function timingLabel(stage: StageState): { text: string; color: string } {
  if (stage.status === "done") {
    return {
      text: stage.durationMs != null ? `done in ${formatDuration(stage.durationMs)}` : "done",
      color: "var(--state-done)",
    };
  }
  if (stage.status === "running") return { text: "running…", color: "var(--accent)" };
  if (stage.status === "failed") return { text: "failed", color: "var(--state-failed)" };
  return { text: "waiting", color: "var(--state-idle)" };
}

interface PipelineRailProps {
  stages: StageState[];
  activeStageId: StageId | null;
  onStageClick: (id: StageId) => void;
  processingStatus: string;
  isAdmin: boolean;
  onCertify?: () => void;
}

export default function PipelineRail({
  stages,
  activeStageId,
  onStageClick,
  processingStatus,
  isAdmin,
  onCertify,
}: PipelineRailProps) {
  const [expandedStage, setExpandedStage] = useState<StageId | null>(null);
  const act2Started = stages.some(
    (s) => s.subSteps.some((e) => e.act === 2 && e.status !== "idle")
  );

  // Insert CertifyGate between stage 4 (sections) and stage 5 (schema)
  const gateIndex = stages.findIndex((s) => s.id === "schema");

  return (
    <div
      style={{
        width: 300, flexShrink: 0,
        background: "var(--bg-surface)",
        borderRight: "1px solid var(--border)",
        overflowY: "auto",
        display: "flex", flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px 16px 12px",
          fontSize: 11, fontWeight: 600,
          color: "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        Processing Pipeline
      </div>

      {/* Stage rows */}
      <div style={{ padding: "0 12px 16px" }}>
        {stages.map((stage, i) => {
          const timing = timingLabel(stage);
          const isActive = activeStageId === stage.id;
          const isExpanded = expandedStage === stage.id;
          const hasSubSteps = stage.subSteps.length > 0;
          const isDone = stage.status === "done";
          const isAboveIdx = i > 0;

          return (
            <div key={stage.id}>
              {/* CertifyGate inline between Act 1 and Act 2 */}
              {i === gateIndex && (
                <CertifyGate
                  processingStatus={processingStatus}
                  isAdmin={isAdmin}
                  act2Started={act2Started}
                  onCertify={onCertify}
                />
              )}

              {/* Connector line between stages */}
              {isAboveIdx && i !== gateIndex && (
                <div
                  style={{
                    width: 2, height: 16,
                    marginLeft: 10, /* center under 22px dot */
                    background:
                      stages[i - 1].status === "done"
                        ? "var(--accent)"
                        : "var(--border)",
                    transition: "background 300ms ease",
                  }}
                />
              )}

              {/* Stage row */}
              <button
                type="button"
                onClick={() => onStageClick(stage.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  width: "100%",
                  padding: "10px 8px",
                  borderRadius: "var(--r-sm)",
                  background: isActive ? "var(--accent-soft)" : "transparent",
                  border: isActive ? "1px solid var(--border-accent)" : "1px solid transparent",
                  cursor: "pointer",
                  transition: "all 150ms ease",
                  textAlign: "left",
                }}
              >
                <StatusDotStage status={stage.status} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: stage.status === "running" || isActive ? 600 : 400,
                      color:
                        stage.status === "running" || isActive
                          ? "var(--text-primary)"
                          : stage.status === "done"
                          ? "var(--text-secondary)"
                          : "var(--text-muted)",
                    }}
                  >
                    {stage.label}
                  </div>
                  <div
                    className="mono"
                    style={{ fontSize: 11, color: timing.color, marginTop: 1 }}
                  >
                    {timing.text}
                  </div>
                </div>

                {/* Expand chevron (if has sub-steps) */}
                {hasSubSteps && (
                  <ChevronRight
                    size={14}
                    style={{
                      color: "var(--text-muted)",
                      transform: isExpanded ? "rotate(90deg)" : "none",
                      transition: "transform 150ms ease",
                      flexShrink: 0,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedStage(isExpanded ? null : stage.id);
                    }}
                  />
                )}
              </button>

              {/* Expanded sub-steps */}
              <AnimatePresence>
                {isExpanded && hasSubSteps && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    style={{ overflow: "hidden", marginLeft: 32 }}
                  >
                    <div
                      className="card"
                      style={{
                        padding: "6px 10px", marginTop: 4, marginBottom: 4,
                        borderLeft: "2px solid var(--border-accent)",
                      }}
                    >
                      {stage.subSteps
                        .sort((a, b) => a.sequence - b.sequence)
                        .map((ev) => (
                          <StepRow key={ev.step_key} step={eventToStepRow(ev)} />
                        ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
