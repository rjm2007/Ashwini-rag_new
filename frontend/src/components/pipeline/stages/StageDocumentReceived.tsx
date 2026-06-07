"use client";

import React from "react";
import { motion } from "framer-motion";
import { CheckCircle, FileText } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Props {
  filename: string;
  fileSize?: string;
  pageCount?: number;
}

/* ------------------------------------------------------------------ */
/*  Animation helpers                                                   */
/* ------------------------------------------------------------------ */

const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** Base delay after which checklist items start appearing */
const CHECKLIST_START = 0.4;
/** Gap between each checklist item */
const CHECKLIST_GAP = 0.18;

/* ------------------------------------------------------------------ */
/*  Validation item                                                    */
/* ------------------------------------------------------------------ */

function ValidationItem({
  text,
  index,
}: {
  text: string;
  index: number;
}) {
  const delay = CHECKLIST_START + index * CHECKLIST_GAP;

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.26, delay, ease }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "7px 0",
      }}
    >
      {/* Checkmark — springs in from 0.6→1 */}
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          type: "spring",
          stiffness: 480,
          damping: 22,
          delay: delay + 0.06,
        }}
        style={{ display: "flex", flexShrink: 0 }}
      >
        <CheckCircle size={17} color="var(--state-done)" strokeWidth={2.2} />
      </motion.div>

      {/* Text — fades muted → secondary */}
      <motion.span
        initial={{ color: "var(--text-muted)" }}
        animate={{ color: "var(--text-secondary)" }}
        transition={{ duration: 0.35, delay: delay + 0.1 }}
        style={{
          fontFamily: "Inter, sans-serif",
          fontSize: 13,
          lineHeight: 1.45,
        }}
      >
        {text}
      </motion.span>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Pulse ring (single-shot indigo ring)                               */
/* ------------------------------------------------------------------ */

function AcceptancePulseRing({ delay }: { delay: number }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        marginTop: 18,
        marginBottom: 4,
        position: "relative",
        height: 28,
      }}
    >
      <motion.div
        initial={{ scale: 1, opacity: 0.5 }}
        animate={{ scale: 1.8, opacity: 0 }}
        transition={{ duration: 0.7, delay, ease: "easeOut" }}
        style={{
          position: "absolute",
          width: 48,
          height: 48,
          top: "50%",
          left: "50%",
          marginTop: -24,
          marginLeft: -24,
          borderRadius: "50%",
          border: "2.5px solid var(--accent)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Inline stats row                                                   */
/* ------------------------------------------------------------------ */

function StatsRow({
  fileSize,
  pageCount,
  delay,
}: {
  fileSize?: string;
  pageCount?: number;
  delay: number;
}) {
  const parts: string[] = [];
  if (fileSize) parts.push(`File ${fileSize}`);
  if (pageCount != null) parts.push(`Pages ${pageCount}`);
  parts.push("Format PDF");

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay, ease }}
      style={{
        display: "flex",
        justifyContent: "center",
        flexWrap: "wrap",
        gap: 6,
        marginTop: 10,
      }}
    >
      {parts.map((p, i) => (
        <span
          key={i}
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11.5,
            color: "var(--text-muted)",
            letterSpacing: "0.01em",
          }}
        >
          {p}
          {i < parts.length - 1 && (
            <span
              style={{
                margin: "0 4px",
                color: "var(--border-strong)",
              }}
            >
              ·
            </span>
          )}
        </span>
      ))}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function StageDocumentReceived({
  filename,
  fileSize,
  pageCount,
}: Props) {
  const sizeLabel = fileSize ?? "—";
  const pagesLabel = pageCount != null ? String(pageCount) : "—";
  const subtitleParts = [fileSize, "PDF Document"].filter(Boolean).join(" · ");

  const validations = [
    "File format valid ✓",
    `File size OK${fileSize ? ` (${sizeLabel})` : ""} ✓`,
    `Pages: ${pagesLabel} ✓`,
  ];

  /** Delay at which the last checklist item finishes appearing */
  const lastChecklistDelay =
    CHECKLIST_START + (validations.length - 1) * CHECKLIST_GAP + 0.3;

  return (
    <div style={{ position: "relative" }}>
      {/* ─── Document card ─── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease }}
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-md)",
          padding: "20px 22px 18px",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        {/* Header — icon + filename + subtitle */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: "var(--r-sm)",
              background: "var(--accent-soft)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <FileText size={20} color="var(--accent)" />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: 14,
                fontWeight: 600,
                color: "var(--text-primary)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {filename}
            </div>
            {subtitleParts && (
              <div
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 12,
                  color: "var(--text-muted)",
                  marginTop: 2,
                }}
              >
                {subtitleParts}
              </div>
            )}
          </div>
        </div>

        {/* Divider */}
        <div
          style={{
            height: 1,
            background: "var(--border)",
            marginBottom: 10,
          }}
        />

        {/* Validation heading */}
        <div
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "var(--text-muted)",
            marginBottom: 4,
          }}
        >
          Validation
        </div>

        {/* Checklist */}
        {validations.map((text, i) => (
          <ValidationItem key={i} text={text} index={i} />
        ))}
      </motion.div>

      {/* ─── Acceptance pulse ring (single shot, indigo) ─── */}
      <AcceptancePulseRing delay={lastChecklistDelay} />

      {/* ─── Inline stats row ─── */}
      <StatsRow
        fileSize={fileSize}
        pageCount={pageCount}
        delay={lastChecklistDelay + 0.15}
      />
    </div>
  );
}
