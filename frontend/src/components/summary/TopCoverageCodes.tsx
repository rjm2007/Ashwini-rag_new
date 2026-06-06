"use client";

import { useState } from "react";
import { ShieldCheck, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { MasterSchema, FieldWrapper } from "../../lib/types";

interface TopCoverageCodesProps {
  masterSchema: MasterSchema;
}

interface CoverageCodeEntry {
  code: string;
  description: string;
  confidence: number;
}

function extractCodes(schema: MasterSchema): CoverageCodeEntry[] {
  const entries: CoverageCodeEntry[] = [];

  // Try coverage_code_table profile first
  const codeTable = schema.profiles?.coverage_code_table;
  if (codeTable?.coverage_codes) {
    for (const row of codeTable.coverage_codes) {
      const codeField = row.code as FieldWrapper | undefined;
      const descField = row.description as FieldWrapper | undefined;
      if (codeField?.value != null) {
        entries.push({
          code: String(codeField.value),
          description: descField?.value != null ? String(descField.value) : "No description",
          confidence: Math.round((codeField.confidence ?? 0.8) * 100),
        });
      }
    }
  }

  // Also check warranty_certificate covered_components for code-like data
  const warranty = schema.profiles?.warranty_certificate;
  if (warranty?.covered_components && entries.length === 0) {
    for (const comp of warranty.covered_components) {
      const compField = comp.component as FieldWrapper | undefined;
      const tierField = comp.tier as FieldWrapper | undefined;
      if (compField?.value != null) {
        entries.push({
          code: String(tierField?.value ?? compField.value).substring(0, 12),
          description: String(compField.value),
          confidence: Math.round((compField.confidence ?? 0.75) * 100),
        });
      }
    }
  }

  // Check extensions for any coverage-related data
  if (schema.extensions && entries.length === 0) {
    for (const ext of schema.extensions) {
      if (ext.raw_fields) {
        for (const [key, fw] of Object.entries(ext.raw_fields)) {
          if (key.toLowerCase().includes("code") && fw.value != null) {
            entries.push({
              code: String(fw.value),
              description: ext.heading || ext.label || key.replace(/_/g, " "),
              confidence: Math.round((fw.confidence ?? 0.7) * 100),
            });
          }
        }
      }
    }
  }

  return entries;
}

const VISIBLE_COUNT = 5;

export default function TopCoverageCodes({ masterSchema }: TopCoverageCodesProps) {
  const [showAll, setShowAll] = useState(false);
  const allCodes = extractCodes(masterSchema);
  const visibleCodes = showAll ? allCodes : allCodes.slice(0, VISIBLE_COUNT);
  const hasMore = allCodes.length > VISIBLE_COUNT;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--r-md)",
        boxShadow: "var(--shadow-xs)",
        padding: "20px 24px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 16,
        }}
      >
        <ShieldCheck size={16} style={{ color: "var(--accent)" }} />
        <h3
          style={{
            margin: 0,
            fontSize: 14,
            fontWeight: 600,
            color: "var(--text-primary)",
          }}
        >
          Top Coverage Codes
        </h3>
        <span
          style={{
            marginLeft: "auto",
            fontSize: 11,
            color: "var(--text-muted)",
            fontFamily: "'IBM Plex Mono', monospace",
          }}
        >
          {allCodes.length} found
        </span>
      </div>

      {/* Code list */}
      {allCodes.length === 0 ? (
        <p
          style={{
            fontSize: 13,
            color: "var(--text-muted)",
            margin: 0,
            padding: "12px 0",
            textAlign: "center",
          }}
        >
          No coverage codes extracted
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          <AnimatePresence mode="popLayout">
            {visibleCodes.map((entry, i) => (
              <motion.div
                key={entry.code + i}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 0",
                  borderBottom:
                    i < visibleCodes.length - 1
                      ? "1px solid var(--border)"
                      : "none",
                }}
              >
                {/* Code ID */}
                <span
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 12,
                    fontWeight: 500,
                    color: "var(--accent)",
                    backgroundColor: "var(--accent-soft)",
                    padding: "3px 8px",
                    borderRadius: "var(--r-sm)",
                    flexShrink: 0,
                    minWidth: 60,
                    textAlign: "center",
                  }}
                >
                  {entry.code}
                </span>

                {/* Description + confidence bar */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      fontSize: 12,
                      color: "var(--text-primary)",
                      display: "block",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      marginBottom: 4,
                    }}
                  >
                    {entry.description}
                  </span>
                  <div
                    style={{
                      height: 4,
                      backgroundColor: "var(--bg-hover)",
                      borderRadius: "var(--r-pill)",
                      overflow: "hidden",
                    }}
                  >
                    <motion.div
                      style={{
                        height: "100%",
                        backgroundColor: "var(--accent)",
                        borderRadius: "var(--r-pill)",
                      }}
                      initial={{ width: "0%" }}
                      animate={{ width: `${entry.confidence}%` }}
                      transition={{
                        duration: 0.5,
                        delay: i * 0.08,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                    />
                  </div>
                </div>

                {/* Confidence % */}
                <span
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 11,
                    color: "var(--text-muted)",
                    flexShrink: 0,
                    width: 32,
                    textAlign: "right",
                  }}
                >
                  {entry.confidence}%
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* View All link */}
      {hasMore && (
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            marginTop: 12,
            padding: 0,
            background: "none",
            border: "none",
            color: "var(--accent)",
            fontSize: 12,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          {showAll ? "Show Less" : "View All Coverage Codes"}
          <ChevronRight
            size={14}
            style={{
              transform: showAll ? "rotate(90deg)" : "none",
              transition: "transform 0.2s ease",
            }}
          />
        </button>
      )}
    </motion.div>
  );
}
