"use client";

import React from "react";
import { motion } from "framer-motion";
import { CheckCircle, FileText, HardDrive, Layers } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface StageDocumentReceivedProps {
  filename: string;
  fileSize?: string;
  pageCount?: number;
}

/* ------------------------------------------------------------------ */
/*  Animation presets                                                   */
/* ------------------------------------------------------------------ */

const ease = [0.16, 1, 0.3, 1] as const;

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease },
  },
};

const listContainerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.2, delayChildren: 0.35 },
  },
};

const checkItemVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3, ease },
  },
};

const pulseRingVariants = {
  hidden: { scale: 0.6, opacity: 0 },
  visible: {
    scale: [0.6, 1.3, 1] as any,
    opacity: [0, 0.5, 0] as any,
    transition: { duration: 0.9, delay: 1.3, ease: "easeOut" },
  },
};

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function ValidationItem({ text }: { text: string }) {
  return (
    <motion.div
      variants={checkItemVariants}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 0",
      }}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 25, delay: 0.1 }}
      >
        <CheckCircle size={18} color="var(--state-done)" strokeWidth={2.2} />
      </motion.div>
      <span
        style={{
          fontFamily: "Inter, sans-serif",
          fontSize: 13,
          color: "var(--text-secondary)",
          lineHeight: 1.4,
        }}
      >
        {text}
      </span>
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
}: StageDocumentReceivedProps) {
  const pages = pageCount ?? 0;

  const validations = [
    "File format valid ✓",
    `File size OK${fileSize ? ` (${fileSize})` : ""} ✓`,
    `Pages parsed: ${pages} ✓`,
    pages > 1 ? "Multi-page document ✓" : "Single-page document ✓",
  ];

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      style={{ position: "relative" }}
    >
      {/* ---- Document card ---- */}
      <motion.div
        variants={cardVariants}
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-md)",
          padding: "20px 20px 16px",
          boxShadow: "var(--shadow-sm)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Acceptance pulse ring — positioned behind content */}
        <motion.div
          variants={pulseRingVariants as any}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 180,
            height: 180,
            marginLeft: -90,
            marginTop: -90,
            borderRadius: "50%",
            border: "3px solid var(--state-done)",
            pointerEvents: "none",
          }}
        />

        {/* Header row */}
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
              width: 40,
              height: 40,
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
            <div
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 12,
                color: "var(--text-muted)",
                marginTop: 2,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {fileSize && (
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <HardDrive size={12} /> {fileSize}
                </span>
              )}
              {pages > 0 && (
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Layers size={12} /> {pages} pages
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div
          style={{
            height: 1,
            background: "var(--border)",
            marginBottom: 12,
          }}
        />

        {/* Validation checklist */}
        <motion.div variants={listContainerVariants}>
          <div
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase" as const,
              letterSpacing: "0.05em",
              color: "var(--text-muted)",
              marginBottom: 6,
            }}
          >
            Validation
          </div>
          {validations.map((text, i) => (
            <ValidationItem key={i} text={text} />
          ))}
        </motion.div>

        {/* Accepted banner */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3, duration: 0.35, ease }}
          style={{
            marginTop: 14,
            padding: "8px 12px",
            borderRadius: "var(--r-sm)",
            background: "rgba(22, 163, 74, 0.08)",
            border: "1px solid rgba(22, 163, 74, 0.2)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <CheckCircle size={16} color="var(--state-done)" />
          <span
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 13,
              fontWeight: 500,
              color: "var(--state-done)",
            }}
          >
            Document accepted for processing
          </span>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
