"use client";

import { ShieldCheck } from "lucide-react";
import { ReactNode } from "react";
import ConfidenceGauge from "./ConfidenceGauge";
import InlineEvidence from "./InlineEvidence";

export default function MessageBubble({
  role,
  content,
  timestamp,
  confidenceScore,
  evidenceJson
}: {
  role: string;
  content: string;
  timestamp?: string;
  confidenceScore?: number;
  evidenceJson?: any[];
  children?: ReactNode;
}) {
  const isUser = role === "user";

  if (isUser) {
    return (
      <div className="animate-slide-in" style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <div style={{ maxWidth: "75%" }}>
          <div
            style={{
              backgroundColor: "#FF6200",
              color: "white",
              borderRadius: "18px 18px 4px 18px",
              padding: "10px 14px",
              fontSize: 14,
              lineHeight: 1.6
            }}
          >
            {content}
          </div>
          {timestamp ? (
            <p style={{ fontSize: 10, color: "#7A92A8", textAlign: "right", marginTop: 4 }}>{timestamp}</p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-slide-in" style={{ marginBottom: 4 }}>
      <div style={{ display: "flex", justifyContent: "flex-start", gap: 10, marginBottom: 4 }}>
        <div
          style={{
            width: 28,
            height: 28,
            backgroundColor: "#06101E",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0
          }}
        >
          <ShieldCheck size={14} color="#FF6200" />
        </div>
        <div style={{ maxWidth: "75%" }}>
          <div
            style={{
              backgroundColor: "white",
              border: "1px solid #D1DCE8",
              borderRadius: "18px 18px 18px 4px",
              padding: "10px 14px",
              fontSize: 14,
              lineHeight: 1.6,
              color: "#0A1628"
            }}
          >
            <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{content}</p>
            {confidenceScore !== undefined && Number.isFinite(confidenceScore) ? (
              <div style={{ marginTop: 8 }}>
                <ConfidenceGauge value={confidenceScore} showLabel={false} />
              </div>
            ) : null}
          </div>
          {timestamp ? (
            <p style={{ fontSize: 10, color: "#7A92A8", marginTop: 4 }}>{timestamp}</p>
          ) : null}
        </div>
      </div>
      {evidenceJson ? (
        <div style={{ paddingLeft: 38, maxWidth: "min(100%, 520px)", position: "relative", zIndex: 1 }}>
          <InlineEvidence evidence={evidenceJson} />
        </div>
      ) : null}
    </div>
  );
}
