"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, FileText } from "lucide-react";
import { buildCitationMap } from "./CitationChip";
import type { EvidencePayload } from "../../lib/types";

interface SourcesPanelProps {
  sources: EvidencePayload[];
  answerText?: string;
}

function SourceCard({
  item,
  citNum,
  defaultOpen,
}: {
  item: EvidencePayload;
  citNum: number;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  // read real fields first, fall back to old field names for stored messages
  const chunkText = item.chunkText || item.text || "";
  const pageNum = item.pageNumber ?? item.page;
  const heading =
    item.sectionHeading &&
    String(item.sectionHeading).toLowerCase() !== "unknown"
      ? item.sectionHeading
      : null;


  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: "var(--r-sm)",
        background: "var(--bg-raised)",
        overflow: "hidden",
      }}
    >
      {/* Card header — always visible */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 10px",
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        {/* Citation badge [N] */}
        <span
          style={{
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: "var(--accent-soft)",
            color: "var(--accent)",
            fontSize: 10,
            fontWeight: 700,
            fontFamily: "'IBM Plex Mono', monospace",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {citNum}
        </span>

        {/* Page number */}
        {pageNum != null && (
          <span
            style={{
              fontSize: 11,
              fontFamily: "'IBM Plex Mono', monospace",
              color: "var(--text-muted)",
              flexShrink: 0,
            }}
          >
            p.{pageNum}
          </span>
        )}

        {/* Section heading — truncated */}
        <span
          style={{
            fontSize: 12,
            color: heading ? "var(--text-secondary)" : "var(--text-muted)",
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {heading || "Source"}
        </span>

        {/* Expand chevron */}
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.18 }}
          style={{ flexShrink: 0 }}
        >
          <ChevronDown size={13} color="var(--text-muted)" />
        </motion.span>
      </button>

      {/* Expanded chunk text */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: "hidden" }}
          >
            <div
              style={{
                padding: "0 10px 10px 38px",
                borderTop: "1px solid var(--border)",
                paddingTop: 8,
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: 12,
                  color: "var(--text-muted)",
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  fontFamily: "inherit",
                }}
              >
                {(() => {
                  // Tidy the raw chunk for display only: collapse whitespace, drop an exact
                  // first-half/second-half duplication (e.g. "36 mo / 350k / 36 mo / 350k"),
                  // and clamp length. No "N chars total" noise.
                  const clean = (chunkText || "").replace(/\s+/g, " ").trim();
                  const half = Math.floor(clean.length / 2);
                  const deduped =
                    half > 0 && clean.slice(0, half).trim() === clean.slice(half).trim()
                      ? clean.slice(0, half).trim()
                      : clean;
                  return deduped.length > 240 ? `${deduped.slice(0, 240)}…` : deduped;
                })()}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function SourcesPanel({
  sources,
  answerText = "",
}: SourcesPanelProps) {
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);

  if (!sources?.length) return null;

  // Build citation number → source mapping (same logic as CitationChip)
  const citMap = buildCitationMap(answerText, sources);
  // Determine display order: pairs of [citNum, item] sorted by citNum
  const orderedPairs: Array<[number, EvidencePayload]> = sources.map(
    (item, i) => {
      // Find the citation number that maps to this evidence index
      let citNum = i + 1;
      for (const [num, mappedItem] of citMap.entries()) {
        if (mappedItem === item) {
          citNum = num;
          break;
        }
      }
      return [citNum, item];
    }
  );

  const MAX_INITIAL = 3;
  const visible = showAll ? orderedPairs : orderedPairs.slice(0, MAX_INITIAL);
  const more = orderedPairs.length - MAX_INITIAL;

  return (
    <div style={{ marginTop: 10 }}>
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "2px 0",
          marginBottom: open ? 8 : 0,
        }}
      >
        <FileText size={12} color="var(--text-muted)" />
        <span
          style={{
            fontSize: 11,
            color: "var(--text-muted)",
            fontFamily: "'IBM Plex Mono', monospace",
          }}
        >
          Sources
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            fontFamily: "'IBM Plex Mono', monospace",
            color: "var(--accent)",
          }}
        >
          ({sources.length})
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.18 }}
        >
          <ChevronDown size={12} color="var(--text-muted)" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="sources"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: "hidden" }}
          >
            <div
              style={{ display: "flex", flexDirection: "column", gap: 6 }}
            >
              {visible.map(([citNum, item], i) => (
                <SourceCard
                  key={i}
                  item={item}
                  citNum={citNum}
                  defaultOpen={i === 0}
                />
              ))}
              {!showAll && more > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAll(true)}
                  style={{
                    fontSize: 11,
                    fontFamily: "'IBM Plex Mono', monospace",
                    color: "var(--accent)",
                    background: "none",
                    border: "1px solid var(--border-accent)",
                    borderRadius: "var(--r-sm)",
                    padding: "4px 10px",
                    cursor: "pointer",
                    alignSelf: "flex-start",
                  }}
                >
                  +{more} more source{more > 1 ? "s" : ""}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
