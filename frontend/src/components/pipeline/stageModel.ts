/**
 * stageModel.ts — Maps raw PipelineEvent[] into the 8 friendly stages for the Pipeline rail.
 *
 * Each stage groups related backend step_keys. A stage is:
 * - "done" when ALL its sub-steps are done
 * - "running" if ANY sub-step is running OR the processingStatus maps to it
 * - "failed" if ANY sub-step failed
 * - "waiting" otherwise
 */

import type { PipelineEvent } from "../../lib/types";

export type StageId =
  | "received"
  | "parsing"
  | "structure"
  | "sections"
  | "schema"
  | "embeddings"
  | "indexing"
  | "complete";

export interface StageState {
  id: StageId;
  label: string;
  status: "done" | "running" | "waiting" | "failed";
  durationMs: number | null;
  subSteps: PipelineEvent[];
}

/* ── Step key → stage mapping ── */

const STEP_TO_STAGE: Record<string, StageId> = {
  // Stage 1: Document Received
  pdf_received: "received",

  // Stage 2: Parsing Document
  docling_parse: "parsing",

  // Stage 3: Detecting Structure
  document_tree: "structure",
  build_tree: "structure",
  type_detect: "structure",
  detect_type: "structure",

  // Stage 4: Extracting Sections
  section_classify: "sections",
  classify_sections: "sections",
  vehicle_llm_fallback: "sections",

  // Stage 5: Building Schema (act 2 schema extraction)
  schema_vehicle_identification: "schema",
  schema_vehicle_and_header: "schema",
  schema_coverage_summary: "schema",
  schema_coverage_codes: "schema",
  schema_exclusions: "schema",
  schema_claim_procedure: "schema",
  schema_line_items: "schema",
  schema_full_document: "schema",
  schema_normalize: "schema",
  schema_save: "schema",
  summary_generate: "schema",

  // Stage 6: Generating Embeddings
  chunk_generate: "embeddings",
  metadata_enrich: "embeddings",
  embed_generate: "embeddings",

  // Stage 7: Indexing
  qdrant_index: "indexing",

  // Stage 8: Complete — inferred from processingStatus, not a step_key
};

/* ── Processing status → implied active stage ── */

const STATUS_TO_STAGE: Record<string, StageId> = {
  uploaded: "received",
  parsing: "parsing",
  structuring: "structure",
  classifying: "sections",
  schema_extraction: "schema",
  embedding: "embeddings",
  awaiting_certification: "schema",  // between act 1 and act 2
  processing_complete: "complete",
};

/* ── Stage definitions in order ── */

const STAGE_DEFS: { id: StageId; label: string }[] = [
  { id: "received",   label: "Document Received" },
  { id: "parsing",    label: "Parsing Document" },
  { id: "structure",  label: "Detecting Structure" },
  { id: "sections",   label: "Extracting Sections" },
  { id: "schema",     label: "Building Schema" },
  { id: "embeddings", label: "Generating Embeddings" },
  { id: "indexing",   label: "Indexing" },
  { id: "complete",   label: "Complete" },
];

function resolveStage(stepKey: string, stage?: string): StageId | null {
  // Direct step_key lookup
  if (STEP_TO_STAGE[stepKey]) return STEP_TO_STAGE[stepKey];
  // Fallback: use the event's stage field
  if (stage === "schema") return "schema";
  if (stage === "embedding") return "embeddings";
  return null;
}

export function buildStages(
  events: PipelineEvent[],
  processingStatus: string
): StageState[] {
  // Group events by stage
  const buckets = new Map<StageId, PipelineEvent[]>();
  for (const def of STAGE_DEFS) buckets.set(def.id, []);

  for (const ev of events) {
    const sid = resolveStage(ev.step_key, ev.stage);
    if (sid && buckets.has(sid)) {
      buckets.get(sid)!.push(ev);
    }
  }

  // The implied active stage from processingStatus
  const impliedActive = STATUS_TO_STAGE[processingStatus] ?? null;
  const isTerminal = processingStatus === "processing_complete" || processingStatus === "failed";

  return STAGE_DEFS.map((def) => {
    const subSteps = buckets.get(def.id) ?? [];
    let status: StageState["status"] = "waiting";
    let durationMs: number | null = null;

    if (subSteps.length > 0) {
      const anyFailed = subSteps.some((s) => s.status === "failed");
      const anyRunning = subSteps.some((s) => s.status === "running");
      const allDone = subSteps.every((s) => s.status === "done");

      if (anyFailed) {
        status = "failed";
      } else if (allDone) {
        status = "done";
      } else if (anyRunning) {
        status = "running";
      } else {
        // Has idle sub-steps but some done — if impliedActive matches, mark running
        status = impliedActive === def.id ? "running" : "waiting";
      }

      // Sum durations of completed sub-steps
      const totalMs = subSteps.reduce((sum, s) => sum + (s.duration_ms ?? 0), 0);
      if (totalMs > 0) durationMs = totalMs;
    } else {
      // No events for this stage
      if (def.id === "complete" && isTerminal) {
        status = processingStatus === "failed" ? "failed" : "done";
      } else if (impliedActive === def.id) {
        status = "running";
      }
    }

    // If processingStatus is terminal and this stage is before "complete", mark done
    // (unless it was already failed)
    if (isTerminal && status === "waiting" && def.id !== "complete") {
      const stageIdx = STAGE_DEFS.findIndex((d) => d.id === def.id);
      const completeIdx = STAGE_DEFS.findIndex((d) => d.id === "complete");
      if (stageIdx < completeIdx) {
        status = "done";
      }
    }

    return {
      id: def.id,
      label: def.label,
      status,
      durationMs,
      subSteps,
    };
  });
}

/**
 * Returns the active stage: the first running stage, or if none,
 * the latest completed stage (for showing its end-state visual).
 */
export function getActiveStage(stages: StageState[]): StageState | null {
  const running = stages.find((s) => s.status === "running");
  if (running) return running;
  // Find last done stage
  const done = [...stages].reverse().find((s) => s.status === "done");
  return done ?? stages[0] ?? null;
}

/** Map stage id → visual component name */
export const STAGE_TO_VISUAL: Record<StageId, string> = {
  received:   "StageDocumentReceived",
  parsing:    "StageStructureTree",
  structure:  "StageStructureTree",
  sections:   "StageSectionExtraction",
  schema:     "StageSectionExtraction",
  embeddings: "StageEmbedding",
  indexing:   "StageIndexing",
  complete:   "StageCompletion",
};
