import type { ReactNode } from "react";
import type { EvidencePayload } from "../../lib/types";

/**
 * Build a map from citation number → evidence item.
 * Scans the answer text for [N] references (unique, sorted), then zips them
 * with evidenceJson in order. Matches backend evidence_used ordering.
 */
export function buildCitationMap(
  text: string,
  evidence: EvidencePayload[]
): Map<number, EvidencePayload> {
  const map = new Map<number, EvidencePayload>();
  if (!evidence.length) return map;
  const matches = [...text.matchAll(/\[(\d+)\]/g)];
  const unique = [...new Set(matches.map((m) => parseInt(m[1], 10)))].sort(
    (a, b) => a - b
  );
  unique.forEach((num, i) => {
    if (i < evidence.length) map.set(num, evidence[i]);
  });
  return map;
}

export function parseAnswerWithCitations(
  text: string,
  evidence?: EvidencePayload[]
): ReactNode[] {
  const citMap = evidence?.length
    ? buildCitationMap(text, evidence)
    : new Map<number, EvidencePayload>();
  const parts = text.split(/(\[\d+\])/g);
  return parts.map((part, i) => {
    const match = part.match(/^\[(\d+)\]$/);
    if (!match) return <span key={i}>{part}</span>;
    const num = parseInt(match[1], 10);
    const item = citMap.get(num);
    const heading =
      item?.sectionHeading &&
      String(item.sectionHeading).toLowerCase() !== "unknown"
        ? item.sectionHeading
        : null;
    const tooltip = heading ? `[${num}] ${heading}` : `Source ${num}`;
    return (
      <sup
        key={i}
        title={tooltip}
        style={{
          color: "var(--accent)",
          fontSize: 10,
          fontWeight: 600,
          cursor: "help",
          marginLeft: 1,
          userSelect: "none",
          fontFamily: "'IBM Plex Mono', monospace",
        }}
      >
        [{num}]
      </sup>
    );
  });
}
