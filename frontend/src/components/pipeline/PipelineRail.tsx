"use client";

import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Circle, Loader2 } from "lucide-react";
import type { PipelineEvent } from "../../lib/types";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface PipelineRailProps {
  events: PipelineEvent[];
  processingStatus: string;
}

type StepStatus = "done" | "running" | "waiting" | "failed";

interface StepDef {
  key: string;
  label: string;
}

/* ------------------------------------------------------------------ */
/*  Step definitions                                                   */
/* ------------------------------------------------------------------ */

const STEPS: StepDef[] = [
  { key: "document_received", label: "Document Received" },
  { key: "parsing_document", label: "Parsing Document" },
  { key: "detecting_structure", label: "Detecting Structure" },
  { key: "extracting_sections", label: "Extracting Sections" },
  { key: "building_schema", label: "Building Schema" },
  { key: "generating_embeddings", label: "Generating Embeddings" },
  { key: "indexing", label: "Indexing" },
  { key: "complete", label: "Complete" },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function resolveStatus(raw: string | undefined): StepStatus {
  if (!raw) return "waiting";
  if (raw === "done" || raw === "completed") return "done";
  if (raw === "running" || raw === "in_progress") return "running";
  if (raw === "failed") return "failed";
  return "waiting";
}

function buildStepStatuses(events: PipelineEvent[]): Map<string, StepStatus> {
  const map = new Map<string, StepStatus>();
  for (const ev of events) {
    const key = ev.step_key;
    const existing = map.get(key);
    const incoming = resolveStatus(ev.status);
    // running / done / failed all override waiting; done overrides running
    if (
      !existing ||
      existing === "waiting" ||
      (existing === "running" && (incoming === "done" || incoming === "failed"))
    ) {
      map.set(key, incoming);
    }
  }
  return map;
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

const breathingPulse = {
  scale: [1, 1.35, 1],
  opacity: [0.5, 0.15, 0.5],
};

function StatusDot({ status }: { status: StepStatus }) {
  const size = 24;

  if (status === "done") {
    return (
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: "var(--state-done)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Check size={14} color="#fff" strokeWidth={3} />
      </motion.div>
    );
  }

  if (status === "running") {
    return (
      <div
        style={{
          position: "relative",
          width: size,
          height: size,
          flexShrink: 0,
        }}
      >
        {/* breathing pulse ring */}
        <motion.div
          animate={breathingPulse}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position: "absolute",
            inset: -4,
            borderRadius: "50%",
            border: "2px solid var(--accent)",
          }}
        />
        {/* spinning ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
          style={{
            width: size,
            height: size,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Loader2 size={18} color="var(--accent)" strokeWidth={2.5} />
        </motion.div>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <motion.div
        initial={{ scale: 0.6 }}
        animate={{ scale: 1 }}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: "var(--state-failed)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <X size={14} color="#fff" strokeWidth={3} />
      </motion.div>
    );
  }

  // waiting
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: "2px solid var(--state-idle)",
        background: "transparent",
        flexShrink: 0,
      }}
    />
  );
}

function ConnectorLine({ filled }: { filled: boolean }) {
  return (
    <div
      style={{
        width: 2,
        height: 28,
        marginLeft: 11, // center under 24px dot
        background: filled ? "var(--accent)" : "var(--border)",
        transition: "background 0.4s ease",
      }}
    />
  );
}

function subStatusLabel(status: StepStatus): string {
  switch (status) {
    case "done":
      return "Completed";
    case "running":
      return "In Progress";
    case "failed":
      return "Failed";
    default:
      return "Waiting";
  }
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function PipelineRail({ events, processingStatus }: PipelineRailProps) {
  const statusMap = useMemo(() => buildStepStatuses(events), [events]);

  // If processingStatus is "completed"/"done", mark all as done
  const allDone =
    processingStatus === "completed" ||
    processingStatus === "done" ||
    processingStatus === "complete";

  const resolvedSteps = STEPS.map((step) => ({
    ...step,
    status: allDone ? ("done" as StepStatus) : (statusMap.get(step.key) ?? "waiting"),
  }));

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      style={{
        width: 280,
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--r-lg)",
        padding: "20px 16px",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div
        style={{
          fontFamily: "Inter, sans-serif",
          fontSize: 13,
          fontWeight: 600,
          color: "var(--text-secondary)",
          textTransform: "uppercase" as const,
          letterSpacing: "0.04em",
          marginBottom: 16,
        }}
      >
        Processing Pipeline
      </div>

      {resolvedSteps.map((step, idx) => {
        const isLast = idx === resolvedSteps.length - 1;
        const labelColor =
          step.status === "running"
            ? "var(--text-primary)"
            : step.status === "done"
            ? "var(--text-secondary)"
            : "var(--text-muted)";
        const labelWeight = step.status === "running" ? 600 : 400;
        const subColor =
          step.status === "running"
            ? "var(--accent)"
            : step.status === "failed"
            ? "var(--state-failed)"
            : "var(--text-muted)";

        return (
          <div key={step.key}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <StatusDot status={step.status} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: 14,
                    fontWeight: labelWeight,
                    color: labelColor,
                    lineHeight: 1.3,
                    transition: "color 0.3s, font-weight 0.3s",
                  }}
                >
                  {step.label}
                </div>
                <div
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: 12,
                    color: subColor,
                    marginTop: 1,
                    transition: "color 0.3s",
                  }}
                >
                  {subStatusLabel(step.status)}
                </div>
              </div>
            </div>

            {!isLast && (
              <ConnectorLine
                filled={step.status === "done" || step.status === "running"}
              />
            )}
          </div>
        );
      })}
    </motion.div>
  );
}
