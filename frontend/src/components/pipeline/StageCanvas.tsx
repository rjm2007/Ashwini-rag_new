"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { StageState, StageId } from "./stageModel";
import type { DocumentMasterSchema } from "../../lib/types";

/* ── Lazy-load stage visuals ── */
import dynamic from "next/dynamic";

const StageDocumentReceived = dynamic(() => import("./stages/StageDocumentReceived"), { ssr: false });
const StageStructureTree = dynamic(() => import("./stages/StageStructureTree"), { ssr: false });
const StageSectionExtraction = dynamic(() => import("./stages/StageSectionExtraction"), { ssr: false });
const StageEmbedding = dynamic(() => import("./stages/StageEmbedding"), { ssr: false });
const StageIndexing = dynamic(() => import("./stages/StageIndexing"), { ssr: false });
const StageCompletion = dynamic(() => import("./stages/StageCompletion"), { ssr: false });

interface StageCanvasProps {
  activeStage: StageState | null;
  stages: StageState[];
  masterSchema?: DocumentMasterSchema | null;
  filename?: string;
  docId?: string;
  onViewSummary?: () => void;
  onAskQuestions?: () => void;
}

/** Derive aggregate stats from stage sub-steps */
function deriveStats(stages: StageState[]) {
  let pageCount: number | undefined;
  let chunkCount: number | undefined;
  let embeddingCount: number | undefined;
  let totalDuration = 0;

  for (const stage of stages) {
    for (const ev of stage.subSteps) {
      if (ev.duration_ms) totalDuration += ev.duration_ms;
      const d = ev.detail as Record<string, unknown>;
      if (d?.page_count != null) pageCount = Number(d.page_count);
      if (d?.pages != null) pageCount = Number(d.pages);
      if (d?.chunk_count != null) chunkCount = Number(d.chunk_count);
      if (d?.chunks != null) chunkCount = Number(d.chunks);
      if (d?.embedding_count != null) embeddingCount = Number(d.embedding_count);
      if (d?.embeddings != null) embeddingCount = Number(d.embeddings);
      if (d?.vectors != null) embeddingCount = Number(d.vectors);
    }
  }

  return {
    pageCount,
    chunkCount: chunkCount ?? embeddingCount,
    embeddingCount: embeddingCount ?? chunkCount,
    totalDurationMs: totalDuration,
  };
}

export default function StageCanvas({
  activeStage,
  stages,
  masterSchema,
  filename,
  docId,
  onViewSummary,
  onAskQuestions,
}: StageCanvasProps) {
  const stats = useMemo(() => deriveStats(stages), [stages]);
  const stageId = activeStage?.id ?? "received";
  const isRunning = activeStage?.status === "running";

  /* Compute progress (fraction of done stages / total) */
  const doneCount = stages.filter((s) => s.status === "done").length;
  const totalCount = stages.length;
  const progressPct = Math.round((doneCount / totalCount) * 100);

  const renderVisual = () => {
    switch (stageId) {
      case "received":
        return (
          <StageDocumentReceived
            filename={filename ?? "Document"}
            pageCount={stats.pageCount}
          />
        );
      case "parsing":
      case "structure":
        return (
          <StageStructureTree
            filename={filename}
            pageCount={stats.pageCount}
            masterSchema={masterSchema}
            isRunning={isRunning}
          />
        );
      case "sections":
      case "schema":
        return (
          <StageSectionExtraction
            masterSchema={masterSchema}
            isRunning={isRunning}
          />
        );
      case "embeddings":
        return (
          <StageEmbedding
            totalChunks={stats.chunkCount}
            isRunning={isRunning}
          />
        );
      case "indexing":
        return (
          <StageIndexing
            totalVectors={stats.embeddingCount}
            isRunning={isRunning}
          />
        );
      case "complete":
        return (
          <StageCompletion
            pageCount={stats.pageCount}
            chunkCount={stats.chunkCount}
            embeddingCount={stats.embeddingCount}
            processingTime={formatTime(stats.totalDurationMs)}
            onViewSummary={onViewSummary}
            onAskQuestions={onAskQuestions}
            docId={docId}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div
      style={{
        flex: 1, display: "flex", flexDirection: "column",
        minWidth: 0, height: "100%", overflow: "hidden",
      }}
    >
      {/* Stage visual area */}
      <div
        style={{
          flex: 1, overflowY: "auto", padding: 24,
          display: "flex", flexDirection: "column",
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={stageId}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            style={{ flex: 1 }}
          >
            {renderVisual()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom progress/stats strip */}
      <div
        style={{
          flexShrink: 0,
          borderTop: "1px solid var(--border)",
          background: "var(--bg-surface)",
          padding: "12px 24px",
        }}
      >
        {/* Progress bar */}
        <div
          style={{
            height: 3, borderRadius: "var(--r-pill)",
            background: "var(--bg-hover)", marginBottom: 10,
            overflow: "hidden",
          }}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            style={{
              height: "100%", borderRadius: "var(--r-pill)",
              background: progressPct >= 100 ? "var(--state-done)" : "var(--accent)",
            }}
          />
        </div>

        {/* Inline stats */}
        <div
          style={{
            display: "flex", alignItems: "center", gap: 24,
            fontSize: 12, color: "var(--text-muted)",
          }}
        >
          <span>
            Progress{" "}
            <span className="mono" style={{ color: "var(--text-secondary)", fontWeight: 500 }}>
              {progressPct}%
            </span>
          </span>
          {stats.pageCount != null && (
            <span>
              Pages{" "}
              <span className="mono" style={{ color: "var(--text-secondary)" }}>
                {stats.pageCount}
              </span>
            </span>
          )}
          {stats.chunkCount != null && (
            <span>
              Chunks{" "}
              <span className="mono" style={{ color: "var(--text-secondary)" }}>
                {stats.chunkCount}
              </span>
            </span>
          )}
          {stats.embeddingCount != null && (
            <span>
              Embeddings{" "}
              <span className="mono" style={{ color: "var(--text-secondary)" }}>
                {stats.embeddingCount}
              </span>
            </span>
          )}
          {stats.totalDurationMs > 0 && (
            <span>
              Time{" "}
              <span className="mono" style={{ color: "var(--text-secondary)" }}>
                {formatTime(stats.totalDurationMs)}
              </span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function formatTime(ms: number): string {
  if (!ms) return "—";
  const sec = Math.floor(ms / 1000);
  const min = Math.floor(sec / 60);
  const remSec = sec % 60;
  if (min > 0) return `${String(min).padStart(2, "0")}:${String(remSec).padStart(2, "0")}s`;
  return `${sec}.${String(Math.round((ms % 1000) / 100))}s`;
}
