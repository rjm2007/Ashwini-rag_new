"use client";

import { useState, useMemo } from "react";
import type { PipelineEvent } from "../../lib/types";
import type { DocumentMasterSchema } from "../../lib/types";
import { buildStages, getActiveStage } from "./stageModel";
import type { StageId } from "./stageModel";
import PipelineRail from "./PipelineRail";
import StageCanvas from "./StageCanvas";

interface PipelineTabProps {
  events: PipelineEvent[];
  processingStatus: string;
  isAdmin: boolean;
  onCertify?: () => void;
  masterSchema?: DocumentMasterSchema | null;
  filename?: string;
  docId?: string;
  onViewSummary?: () => void;
  onAskQuestions?: () => void;
}

export default function PipelineTab({
  events,
  processingStatus,
  isAdmin,
  onCertify,
  masterSchema,
  filename,
  docId,
  onViewSummary,
  onAskQuestions,
}: PipelineTabProps) {
  const stages = useMemo(
    () => buildStages(events, processingStatus),
    [events, processingStatus]
  );

  const autoActive = useMemo(() => getActiveStage(stages), [stages]);
  const [manualStage, setManualStage] = useState<StageId | null>(null);

  // If user clicks a stage in the rail, show that visual; otherwise follow auto
  const displayStage = manualStage
    ? stages.find((s) => s.id === manualStage) ?? autoActive
    : autoActive;

  const handleStageClick = (id: StageId) => {
    setManualStage((prev) => (prev === id ? null : id));
  };

  return (
    <div
      style={{
        display: "flex",
        height: "100%",
        minHeight: 0,
      }}
    >
      {/* Left: Processing Pipeline rail */}
      <PipelineRail
        stages={stages}
        activeStageId={displayStage?.id ?? null}
        onStageClick={handleStageClick}
        processingStatus={processingStatus}
        isAdmin={isAdmin}
        onCertify={onCertify}
      />

      {/* Right: Stage Canvas (animated visuals) */}
      <StageCanvas
        activeStage={displayStage}
        stages={stages}
        masterSchema={masterSchema}
        filename={filename}
        docId={docId}
        onViewSummary={onViewSummary}
        onAskQuestions={onAskQuestions}
      />
    </div>
  );
}
