"use client";

import type { PipelineEvent } from "../../lib/types";
import StepRow, { eventToStepRow, StepRowData } from "./StepRow";
import CertifyGate from "./CertifyGate";
import Act2Parallel from "./Act2Parallel";

const ACT1_STEPS: { step_key: string; step_label: string }[] = [
  { step_key: "pdf_received", step_label: "PDF received" },
  { step_key: "docling_parse", step_label: "Parsing document (Docling)" },
  { step_key: "document_tree", step_label: "Building document tree" },
  { step_key: "section_classify", step_label: "Classifying sections" },
  { step_key: "type_detect", step_label: "Detecting document type" },
  { step_key: "vehicle_llm_fallback", step_label: "Recovering vehicle fields (regex + LLM)" }
];

const ACT2_SCHEMA_FALLBACK: { step_key: string; step_label: string }[] = [
  { step_key: "schema_vehicle_identification", step_label: "Extracting: Vehicle & issuer details" },
  { step_key: "schema_vehicle_and_header", step_label: "Extracting: Vehicle & invoice header" },
  { step_key: "schema_coverage_summary", step_label: "Extracting: Coverage clauses" },
  { step_key: "schema_coverage_codes", step_label: "Extracting: Coverage codes table" },
  { step_key: "schema_exclusions", step_label: "Extracting: Exclusions & limitations" },
  { step_key: "schema_claim_procedure", step_label: "Extracting: Claim procedure & eligibility" },
  { step_key: "schema_line_items", step_label: "Extracting: Invoice line items & totals" },
  { step_key: "schema_full_document", step_label: "Extracting: Document contents" },
  { step_key: "schema_normalize", step_label: "Normalizing & validating fields" },
  { step_key: "schema_save", step_label: "Saving master schema to database" },
  { step_key: "summary_generate", step_label: "Generating AI summary" }
];

const ACT2_EMBED_STEPS: { step_key: string; step_label: string }[] = [
  { step_key: "chunk_generate", step_label: "Generating chunks" },
  { step_key: "metadata_enrich", step_label: "Enriching metadata" },
  { step_key: "embed_generate", step_label: "Creating embeddings (OpenAI)" },
  { step_key: "qdrant_index", step_label: "Indexing (Qdrant)" }
];

function mergeActSteps(
  staticSteps: { step_key: string; step_label: string }[],
  eventMap: Map<string, PipelineEvent>,
  act: 1 | 2
): StepRowData[] {
  const known = new Set(staticSteps.map((s) => s.step_key));
  const rows: StepRowData[] = staticSteps.map((s) => {
    const ev = eventMap.get(s.step_key);
    if (ev) return eventToStepRow(ev);
    return { step_key: s.step_key, step_label: s.step_label, status: "idle" };
  });
  for (const ev of eventMap.values()) {
    if (ev.act === act && !known.has(ev.step_key)) {
      rows.push(eventToStepRow(ev));
    }
  }
  return rows;
}

export default function PipelineView({
  events,
  processingStatus,
  isAdmin,
  onCertify
}: {
  events: PipelineEvent[];
  processingStatus: string;
  isAdmin: boolean;
  onCertify?: () => void;
}) {
  const eventMap = new Map<string, PipelineEvent>();
  for (const e of events) eventMap.set(e.step_key, e);

  const act1Steps = mergeActSteps(ACT1_STEPS, eventMap, 1);
  const act2Started = events.some((e) => e.act === 2);

  const schemaFromEvents = events
    .filter((e) => e.act === 2 && e.stage === "schema")
    .sort((a, b) => a.sequence - b.sequence)
    .map((e) => eventToStepRow(e));

  const schemaSteps =
    schemaFromEvents.length > 0
      ? schemaFromEvents
      : act2Started
        ? mergeActSteps(ACT2_SCHEMA_FALLBACK, eventMap, 2)
        : [];

  const embedFromEvents = events
    .filter((e) => e.act === 2 && e.stage === "embedding")
    .sort((a, b) => a.sequence - b.sequence)
    .map((e) => eventToStepRow(e));

  const embeddingSteps =
    embedFromEvents.length > 0
      ? embedFromEvents
      : act2Started
        ? mergeActSteps(ACT2_EMBED_STEPS, eventMap, 2)
        : [];

  const sectionLabel = {
    fontSize: 11,
    fontWeight: 500,
    color: "var(--text-muted)",
    textTransform: "uppercase" as const,
    marginBottom: 8,
    letterSpacing: "0.04em"
  };

  return (
    <div style={{ padding: 20 }}>
      <p style={sectionLabel}>ACT 1 — Structural Parse</p>
      <div className="card" style={{ padding: 12, marginBottom: 8 }}>
        {act1Steps.map((step, i) => (
          <div key={step.step_key} className="animate-fade-slide" style={{ animationDelay: `${i * 50}ms` }}>
            <StepRow step={step} />
          </div>
        ))}
      </div>

      <CertifyGate
        processingStatus={processingStatus}
        isAdmin={isAdmin}
        act2Started={act2Started}
        onCertify={onCertify}
      />

      <p style={{ ...sectionLabel, marginTop: 8 }}>ACT 2 — Schema + Embedding (parallel)</p>
      <Act2Parallel schemaSteps={schemaSteps} embeddingSteps={embeddingSteps} dimmed={!act2Started} />
    </div>
  );
}
