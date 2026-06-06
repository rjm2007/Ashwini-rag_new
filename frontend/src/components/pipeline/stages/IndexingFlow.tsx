"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Database,
  CheckCircle,
  Circle,
  Loader2,
  Cable,
  FolderPlus,
  Upload,
  BarChart3,
  Search,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface IndexingFlowProps {
  totalVectors?: number;
  indexedCount?: number;
}

interface IndexStep {
  label: string;
  icon: React.ReactNode;
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const STEPS: IndexStep[] = [
  { label: "Connecting to database...", icon: <Cable size={14} /> },
  { label: "Creating collection...", icon: <FolderPlus size={14} /> },
  { label: "Uploading vectors...", icon: <Upload size={14} /> },
  { label: "Building index...", icon: <BarChart3 size={14} /> },
  { label: "Optimizing search...", icon: <Search size={14} /> },
];

/* ------------------------------------------------------------------ */
/*  Animation                                                          */
/* ------------------------------------------------------------------ */

const ease = [0.16, 1, 0.3, 1] as const;

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.35, delayChildren: 0.2 },
  },
};

const stepVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3, ease },
  },
};

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

/** A tiny animated particle flowing along the connector */
function StreamParticle({ delay, top }: { delay: number; top: number }) {
  return (
    <motion.div
      initial={{ left: 0, opacity: 0 }}
      animate={{
        left: ["0%", "100%"],
        opacity: [0, 1, 1, 0],
      }}
      transition={{
        duration: 1.6,
        delay,
        repeat: Infinity,
        repeatDelay: 0.6,
        ease: "linear",
      }}
      style={{
        position: "absolute",
        top,
        width: 6,
        height: 6,
        borderRadius: "50%",
        background: "var(--accent)",
        filter: "blur(0.5px)",
      }}
    />
  );
}

function DatabaseCylinder() {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.4, ease }}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg width="56" height="68" viewBox="0 0 56 68" fill="none">
        {/* cylinder body */}
        <ellipse cx="28" cy="14" rx="24" ry="10" fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth="1.5" />
        <rect x="4" y="14" width="48" height="40" fill="var(--accent-soft)" />
        <line x1="4" y1="14" x2="4" y2="54" stroke="var(--accent)" strokeWidth="1.5" />
        <line x1="52" y1="14" x2="52" y2="54" stroke="var(--accent)" strokeWidth="1.5" />
        <ellipse cx="28" cy="54" rx="24" ry="10" fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth="1.5" />
        {/* inner ellipse lines */}
        <ellipse cx="28" cy="28" rx="24" ry="8" fill="none" stroke="var(--accent)" strokeWidth="0.7" opacity="0.3" />
        <ellipse cx="28" cy="41" rx="24" ry="8" fill="none" stroke="var(--accent)" strokeWidth="0.7" opacity="0.3" />
        {/* icon in center */}
        <Database x="18" y="26" width="20" height="20" color="var(--accent)" />
      </svg>
    </motion.div>
  );
}

function StepItem({
  step,
  index,
  activeIndex,
}: {
  step: IndexStep;
  index: number;
  activeIndex: number;
}) {
  const isDone = index < activeIndex;
  const isActive = index === activeIndex;

  let statusIcon: React.ReactNode;
  if (isDone) {
    statusIcon = <CheckCircle size={16} color="var(--state-done)" strokeWidth={2.2} />;
  } else if (isActive) {
    statusIcon = (
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      >
        <Loader2 size={16} color="var(--accent)" strokeWidth={2.2} />
      </motion.div>
    );
  } else {
    statusIcon = <Circle size={16} color="var(--state-idle)" strokeWidth={1.5} />;
  }

  return (
    <motion.div
      variants={stepVariants}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "7px 0",
      }}
    >
      {statusIcon}
      <span
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontFamily: "Inter, sans-serif",
          fontSize: 13,
          fontWeight: isActive ? 500 : 400,
          color: isDone
            ? "var(--text-secondary)"
            : isActive
            ? "var(--text-primary)"
            : "var(--text-muted)",
          transition: "color 0.3s",
        }}
      >
        {step.icon}
        {step.label}
      </span>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function IndexingFlow({
  totalVectors,
  indexedCount,
}: IndexingFlowProps) {
  const total = totalVectors ?? 1536;
  const indexed = indexedCount ?? 0;
  const progress = total > 0 ? Math.min((indexed / total) * 100, 100) : 0;

  // determine which step is active based on progress
  const activeIndex =
    progress >= 100
      ? STEPS.length
      : progress >= 70
      ? 4
      : progress >= 45
      ? 3
      : progress >= 20
      ? 2
      : progress >= 5
      ? 1
      : 0;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      style={{ width: "100%" }}
    >
      {/* Header */}
      <div
        style={{
          fontFamily: "Inter, sans-serif",
          fontSize: 13,
          fontWeight: 600,
          color: "var(--text-secondary)",
          textTransform: "uppercase" as const,
          letterSpacing: "0.04em",
          marginBottom: 16,
        }}
      >
        Indexing
      </div>

      {/* Visualization: vectors → database */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 0,
          marginBottom: 20,
          padding: "12px 16px",
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-md)",
        }}
      >
        {/* Vector dots column */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            alignItems: "center",
            width: 40,
          }}
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.08, duration: 0.2 }}
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "var(--accent)",
                opacity: 0.4 + i * 0.12,
              }}
            />
          ))}
        </div>

        {/* Connector line with streaming particles */}
        <div
          style={{
            flex: 1,
            height: 30,
            position: "relative",
            minWidth: 80,
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 14,
              left: 0,
              right: 0,
              height: 2,
              background: "var(--border)",
            }}
          />
          <StreamParticle delay={0} top={11} />
          <StreamParticle delay={0.5} top={11} />
          <StreamParticle delay={1.0} top={11} />
        </div>

        {/* Database cylinder */}
        <DatabaseCylinder />
      </div>

      {/* Step checklist */}
      <motion.div
        variants={containerVariants}
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-md)",
          padding: "14px 16px",
          marginBottom: 16,
        }}
      >
        {STEPS.map((step, idx) => (
          <StepItem
            key={step.label}
            step={step}
            index={idx}
            activeIndex={activeIndex}
          />
        ))}
      </motion.div>

      {/* Progress bar */}
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-md)",
          padding: "14px 16px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          <span
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 13,
              fontWeight: 500,
              color: "var(--text-secondary)",
            }}
          >
            Vectors indexed
          </span>
          <span
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            {indexed.toLocaleString()}/{total.toLocaleString()}
          </span>
        </div>

        <div
          style={{
            height: 6,
            borderRadius: "var(--r-pill)",
            background: "var(--bg-hover)",
            overflow: "hidden",
          }}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease }}
            style={{
              height: "100%",
              borderRadius: "var(--r-pill)",
              background:
                progress >= 100
                  ? "var(--state-done)"
                  : "var(--accent)",
            }}
          />
        </div>

        {progress >= 100 && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.3 }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginTop: 10,
              fontFamily: "Inter, sans-serif",
              fontSize: 12,
              fontWeight: 500,
              color: "var(--state-done)",
            }}
          >
            <CheckCircle size={14} />
            Indexing complete — ready for search
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
