"use client";

import React from "react";
import { motion } from "framer-motion";
import { FileText, Box, Cpu, Clock, ShieldCheck, ArrowRight, Sparkles } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CompletionCelebrationProps {
  pageCount?: number;
  chunkCount?: number;
  embeddingCount?: number;
  processingTime?: string;
  confidence?: number;
  onViewSummary?: () => void;
  onAskQuestions?: () => void;
}

/* ------------------------------------------------------------------ */
/*  Animation presets                                                   */
/* ------------------------------------------------------------------ */

const ease = [0.16, 1, 0.3, 1] as const;

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function SuccessRing() {
  const circumference = 2 * Math.PI * 46; // r=46 in an 120×120 viewBox

  return (
    <div
      style={{
        position: "relative",
        width: 120,
        height: 120,
        margin: "0 auto 20px",
      }}
    >
      {/* Outer glow pulse */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{
          scale: [0.8, 1.2, 1],
          opacity: [0, 0.3, 0],
        }}
        transition={{ duration: 1.2, delay: 0.6, ease: "easeOut" }}
        style={{
          position: "absolute",
          inset: -12,
          borderRadius: "50%",
          border: "3px solid var(--state-done)",
        }}
      />

      <svg
        width="120"
        height="120"
        viewBox="0 0 120 120"
        style={{ display: "block" }}
      >
        {/* Background circle */}
        <circle
          cx="60"
          cy="60"
          r="46"
          fill="none"
          stroke="var(--border)"
          strokeWidth="4"
        />
        {/* Animated stroke */}
        <motion.circle
          cx="60"
          cy="60"
          r="46"
          fill="none"
          stroke="var(--state-done)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: 0 }}
          transition={{ duration: 1, delay: 0.2, ease }}
          style={{ transformOrigin: "center", transform: "rotate(-90deg)" }}
        />
        {/* Check mark */}
        <motion.path
          d="M40 60 L54 74 L80 48"
          fill="none"
          stroke="var(--state-done)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.9, ease }}
        />
      </svg>
    </div>
  );
}

function StatItem({
  icon,
  label,
  value,
  delay,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        flex: 1,
        minWidth: 80,
      }}
    >
      <div style={{ color: "var(--text-muted)" }}>{icon}</div>
      <div
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 18,
          fontWeight: 700,
          color: "var(--text-primary)",
          lineHeight: 1.2,
        }}
      >
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      <div
        style={{
          fontFamily: "Inter, sans-serif",
          fontSize: 11,
          color: "var(--text-muted)",
          textTransform: "uppercase" as const,
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function CompletionCelebration({
  pageCount = 0,
  chunkCount = 0,
  embeddingCount = 0,
  processingTime = "—",
  confidence = 0,
  onViewSummary,
  onAskQuestions,
}: CompletionCelebrationProps) {
  const confidencePercent =
    confidence > 1 ? confidence : Math.round(confidence * 100);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "32px 24px",
        width: "100%",
        maxWidth: 440,
        margin: "0 auto",
      }}
    >
      {/* Success ring */}
      <SuccessRing />

      {/* Heading */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1, duration: 0.35, ease }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 6,
        }}
      >
        <Sparkles size={20} color="var(--state-done)" />
        <h2
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 22,
            fontWeight: 700,
            color: "var(--text-primary)",
            margin: 0,
          }}
        >
          Processing Complete!
        </h2>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.25, duration: 0.3 }}
        style={{
          fontFamily: "Inter, sans-serif",
          fontSize: 14,
          color: "var(--text-secondary)",
          margin: "0 0 24px",
          textAlign: "center",
        }}
      >
        Your document has been fully processed and indexed.
      </motion.p>

      {/* Stats card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.35, duration: 0.4, ease }}
        style={{
          width: "100%",
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-lg)",
          padding: "20px 16px",
          boxShadow: "var(--shadow-sm)",
          marginBottom: 28,
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 12,
          }}
        >
          <StatItem
            icon={<FileText size={18} />}
            label="Pages"
            value={pageCount}
            delay={1.5}
          />
          <StatItem
            icon={<Box size={18} />}
            label="Chunks"
            value={chunkCount}
            delay={1.6}
          />
          <StatItem
            icon={<Cpu size={18} />}
            label="Embeddings"
            value={embeddingCount}
            delay={1.7}
          />
          <StatItem
            icon={<Clock size={18} />}
            label="Time"
            value={processingTime}
            delay={1.8}
          />
          <StatItem
            icon={<ShieldCheck size={18} />}
            label="Confidence"
            value={`${confidencePercent}%`}
            delay={1.9}
          />
        </div>
      </motion.div>

      {/* Action buttons */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2, duration: 0.35, ease }}
        style={{
          display: "flex",
          gap: 12,
          width: "100%",
          justifyContent: "center",
        }}
      >
        {/* View Summary — outline */}
        <button
          onClick={onViewSummary}
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 14,
            fontWeight: 500,
            padding: "10px 20px",
            borderRadius: "var(--r-sm)",
            border: "1px solid var(--border-strong)",
            background: "var(--bg-surface)",
            color: "var(--text-primary)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            transition: "background 0.15s, border-color 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              "var(--bg-hover)";
            (e.currentTarget as HTMLButtonElement).style.borderColor =
              "var(--accent)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              "var(--bg-surface)";
            (e.currentTarget as HTMLButtonElement).style.borderColor =
              "var(--border-strong)";
          }}
        >
          <FileText size={16} />
          View Summary
        </button>

        {/* Ask Questions — filled */}
        <button
          onClick={onAskQuestions}
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 14,
            fontWeight: 600,
            padding: "10px 20px",
            borderRadius: "var(--r-sm)",
            border: "none",
            background: "var(--accent)",
            color: "#fff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            transition: "background 0.15s",
            boxShadow: "var(--shadow-accent)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              "var(--accent-hover)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              "var(--accent)";
          }}
        >
          Ask Questions
          <ArrowRight size={16} />
        </button>
      </motion.div>
    </motion.div>
  );
}
