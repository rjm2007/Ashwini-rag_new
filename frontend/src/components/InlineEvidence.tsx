"use client";

import { useState } from "react";
import { ChevronDown, FileText } from "lucide-react";

function normalizeEvidence(evidence: unknown): any[] {
  if (!evidence) return [];
  if (Array.isArray(evidence)) return evidence;
  if (typeof evidence === "string") {
    try {
      const parsed = JSON.parse(evidence);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function SourceCard({ item, index }: { item: any; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const text = item.chunkText || item.text || "";
  const isLong = text.length > 280;
  const heading =
    item.sectionHeading && String(item.sectionHeading).toLowerCase() !== "unknown"
      ? item.sectionHeading
      : null;

  return (
    <details
      open={index === 0}
      style={{
        border: "1px solid #D1DCE8",
        borderRadius: 8,
        backgroundColor: "#FFFFFF",
        overflow: "hidden"
      }}
    >
      <summary
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 12px",
          cursor: "pointer",
          listStyle: "none",
          userSelect: "none"
        }}
      >
        <ChevronDown size={14} color="#7A92A8" style={{ flexShrink: 0 }} />
        <span
          style={{
            backgroundColor: "#FFF0E6",
            color: "#C24A00",
            fontSize: 10,
            fontWeight: 700,
            padding: "2px 7px",
            borderRadius: 99,
            fontFamily: "DM Mono, monospace",
            flexShrink: 0
          }}
        >
          Page {item.pageNumber ?? "?"}
        </span>
        {heading ? (
          <span
            style={{
              fontSize: 12,
              color: "#3D5A80",
              fontWeight: 500,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flex: 1
            }}
          >
            {heading}
          </span>
        ) : (
          <span style={{ fontSize: 12, color: "#7A92A8", flex: 1 }}>Source {index + 1}</span>
        )}
      </summary>
      <div style={{ padding: "0 12px 12px", borderTop: "1px solid #F0F4F8" }}>
        <p
          style={{
            fontSize: 12,
            color: "#0A1628",
            lineHeight: 1.6,
            margin: "10px 0 0",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word"
          }}
        >
          {expanded || !isLong ? text : `${text.slice(0, 280).trimEnd()}…`}
        </p>
        {isLong ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              setExpanded((v) => !v);
            }}
            style={{
              marginTop: 8,
              fontSize: 12,
              fontWeight: 600,
              color: "#C24A00",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0
            }}
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        ) : null}
      </div>
    </details>
  );
}

export default function InlineEvidence({ evidence }: { evidence: unknown }) {
  const items = normalizeEvidence(evidence);
  if (items.length === 0) return null;

  return (
    <details
      className="evidence-sources"
      style={{
        marginTop: 8,
        border: "1px solid #D1DCE8",
        borderRadius: 8,
        backgroundColor: "#FAFBFC",
        overflow: "hidden"
      }}
    >
      <summary
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 12px",
          cursor: "pointer",
          fontSize: 12,
          fontWeight: 600,
          color: "#3D5A80",
          listStyle: "none",
          userSelect: "none"
        }}
      >
        <FileText size={14} color="#FF6200" />
        <span>
          {items.length} source{items.length !== 1 ? "s" : ""} cited — click to expand
        </span>
      </summary>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          padding: "8px 10px 10px",
          borderTop: "1px solid #D1DCE8",
          maxHeight: 360,
          overflowY: "auto"
        }}
      >
        {items.map((item, i) => (
          <SourceCard key={i} item={item} index={i} />
        ))}
      </div>
    </details>
  );
}
