"use client";

import { useState } from "react";

type EvidenceItem = { text?: string; page?: number; documentId?: string };

export default function EvidenceChips({ evidence }: { evidence: EvidenceItem[] }) {
  const [expanded, setExpanded] = useState(false);
  if (!evidence?.length) return null;

  const max = 4;
  const visible = expanded ? evidence : evidence.slice(0, max);
  const more = evidence.length - max;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
      {visible.map((item, i) => {
        const text = ((item as any).chunkText || item.text || "").slice(0, 30);
        const page = (item as any).pageNumber ?? item.page ?? "?";
        return (
          <span
            key={i}
            className="mono"
            style={{
              fontSize: 11,
              padding: "2px 8px",
              background: "var(--bg-raised)",
              border: "1px solid var(--border)",
              borderRadius: 4,
              color: "var(--text-secondary)"
            }}
          >
            p.{page} · {text}
            {(item.text || "").length > 30 ? "…" : ""}
          </span>
        );
      })}
      {!expanded && more > 0 ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mono"
          style={{
            fontSize: 11,
            padding: "2px 8px",
            background: "var(--bg-raised)",
            border: "1px solid var(--border)",
            borderRadius: 4,
            color: "var(--accent)",
            cursor: "pointer"
          }}
        >
          +{more} more
        </button>
      ) : null}
    </div>
  );
}
