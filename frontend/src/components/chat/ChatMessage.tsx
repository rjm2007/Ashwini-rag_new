"use client";

import CoverageDecision, { inferCoverageDecision } from "./CoverageDecision";
import ConfidenceBand from "./ConfidenceBand";
import SourcesPanel from "./SourcesPanel";
import RaiseQueryInline from "./RaiseQueryInline";
import AnswerMarkdown from "./AnswerMarkdown";
import type { ChatMessageItem, EvidencePayload } from "../../lib/types";

export default function ChatMessage({
  message,
  sessionId,
  documentId,
  pairedQuestion
}: {
  message: ChatMessageItem;
  sessionId?: string;
  documentId?: string;
  pairedQuestion?: string;
}) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="animate-fade-slide" style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <div
          style={{
            maxWidth: "85%",
            background: "var(--bg-raised)",
            border: "1px solid var(--border)",
            borderRadius: "12px 12px 2px 12px",
            padding: "10px 14px",
            fontSize: 13,
            color: "var(--text-primary)"
          }}
        >
          {message.content}
        </div>
      </div>
    );
  }

  const confidence = message.confidenceScore ?? 0;
  const decision =
    message.coverageDecision ||
    inferCoverageDecision(confidence, message.metadataFiltersAppliedJson);
  const evidence = (message.evidenceJson || []) as EvidencePayload[];

  return (
    <div className="animate-fade-slide" style={{ display: "flex", justifyContent: "flex-start", marginBottom: 12 }}>
      <div
        style={{
          maxWidth: "90%",
          background: "var(--bg-page)",
          border: "1px solid var(--border)",
          borderRadius: "12px 12px 12px 2px",
          padding: "10px 14px",
          fontSize: 13,
          color: "var(--text-primary)",
          lineHeight: 1.6
        }}
      >
        <div>
          <AnswerMarkdown text={message.content} evidence={evidence} />
        </div>
        <CoverageDecision decision={decision} />
        {confidence > 0 ? <ConfidenceBand confidence={confidence} /> : null}
        <SourcesPanel sources={evidence} answerText={message.content} />
        {sessionId && pairedQuestion ? (
          <RaiseQueryInline
            sessionId={sessionId}
            question={pairedQuestion}
            answerSnapshot={message.content}
            documentId={documentId}
          />
        ) : null}
      </div>
    </div>
  );
}
