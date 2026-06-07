"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Database, Loader2 } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Props {
  totalVectors?: number;
  isRunning?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];

/* Category colors for the cluster dots on left side */
const CLUSTER_COLORS = [
  "#6366F1", "#3B82F6", "#8B5CF6",
  "#F43F5E", "#F59E0B", "#14B8A6",
];

/* Checklist items */
const CHECKLIST = [
  "Connecting to database",
  "Creating collection",
  "Uploading vectors",
  "Building index",
  "Optimizing search",
];

/* ------------------------------------------------------------------ */
/*  Dot generation — memoized                                          */
/* ------------------------------------------------------------------ */

interface Dot {
  id: number;
  color: string;
  /** Starting x in left cluster grid (0–1 range, ~0–0.3) */
  startX: number;
  startY: number;
  /** Travel delay offset */
  delay: number;
}

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 11) % 2147483647;
    return (s & 0x7fffffff) / 0x7fffffff;
  };
}

function generateDots(total: number): Dot[] {
  const count = Math.min(total, 60); // visual cap
  const rand = seededRandom(31);
  const dots: Dot[] = [];
  for (let i = 0; i < count; i++) {
    dots.push({
      id: i,
      color: CLUSTER_COLORS[i % CLUSTER_COLORS.length],
      startX: 0.05 + rand() * 0.22,
      startY: 0.1 + rand() * 0.8,
      delay: rand() * 2.5,
    });
  }
  return dots;
}

/* ------------------------------------------------------------------ */
/*  Cylinder SVG                                                       */
/* ------------------------------------------------------------------ */

function DatabaseCylinder({ settle }: { settle: boolean }) {
  return (
    <motion.div
      animate={settle ? { scale: [1, 1.03, 1] } : { scale: 1 }}
      transition={settle ? { duration: 0.6, ease } : { duration: 0 }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <svg width={80} height={120} viewBox="0 0 80 120">
        <defs>
          <linearGradient id="cyl-fill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6366F1" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#6366F1" stopOpacity={0.12} />
          </linearGradient>
          <linearGradient id="cyl-top" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366F1" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#6366F1" stopOpacity={0.2} />
          </linearGradient>
        </defs>

        {/* Body */}
        <rect x={10} y={30} width={60} height={65} rx={0} fill="url(#cyl-fill)" />

        {/* Bottom ellipse */}
        <ellipse cx={40} cy={95} rx={30} ry={12} fill="url(#cyl-fill)" stroke="var(--accent)" strokeWidth={1} opacity={0.6} />

        {/* Left + right edges */}
        <line x1={10} y1={30} x2={10} y2={95} stroke="var(--accent)" strokeWidth={1} opacity={0.4} />
        <line x1={70} y1={30} x2={70} y2={95} stroke="var(--accent)" strokeWidth={1} opacity={0.4} />

        {/* Top ellipse */}
        <ellipse cx={40} cy={30} rx={30} ry={12} fill="url(#cyl-top)" stroke="var(--accent)" strokeWidth={1} />

        {/* Database icon hint */}
        <text x={40} y={68} textAnchor="middle" fontSize={10} fill="var(--accent)" fontFamily="IBM Plex Mono" fontWeight={500} opacity={0.7}>
          Qdrant
        </text>
      </svg>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Traveling dot                                                      */
/* ------------------------------------------------------------------ */

function TravelingDot({ dot, isRunning }: { dot: Dot; isRunning: boolean }) {
  if (!isRunning) return null;

  return (
    <motion.div
      initial={{ left: `${dot.startX * 100}%`, top: `${dot.startY * 100}%`, opacity: 0.8, scale: 1 }}
      animate={{
        left: ["${dot.startX * 100}%", "85%", "85%"],
        top: [`${dot.startY * 100}%`, "50%", "30%"],
        opacity: [0.8, 0.9, 0],
        scale: [1, 0.8, 0],
      }}
      transition={{
        duration: 2.2,
        delay: dot.delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      style={{
        position: "absolute",
        width: 5,
        height: 5,
        borderRadius: "50%",
        background: dot.color,
        zIndex: 3,
        pointerEvents: "none",
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Checklist item                                                     */
/* ------------------------------------------------------------------ */

function ChecklistItem({
  label,
  done,
  active,
  index,
}: {
  label: string;
  done: boolean;
  active: boolean;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, delay: index * 0.1, ease }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 0",
      }}
    >
      {/* Status icon */}
      {done ? (
        <motion.div
          initial={{ scale: 0.6 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 20 }}
          style={{
            width: 18, height: 18, borderRadius: "50%",
            background: "var(--state-done)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Check size={10} color="#fff" strokeWidth={3} />
        </motion.div>
      ) : active ? (
        <div
          style={{
            width: 18, height: 18, borderRadius: "50%",
            border: "2px solid var(--accent)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Loader2 size={10} color="var(--accent)" className="animate-spin" />
        </div>
      ) : (
        <div
          style={{
            width: 18, height: 18, borderRadius: "50%",
            border: "2px solid var(--state-idle)",
            flexShrink: 0,
          }}
        />
      )}

      <span
        style={{
          fontSize: 12,
          fontWeight: done || active ? 500 : 400,
          color: done ? "var(--text-secondary)" : active ? "var(--text-primary)" : "var(--text-muted)",
        }}
      >
        {label}
        {done && (
          <span className="mono" style={{ color: "var(--state-done)", marginLeft: 6, fontSize: 11 }}>
            ✓
          </span>
        )}
      </span>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function StageIndexing({
  totalVectors = 382,
  isRunning = true,
}: Props) {
  const dots = useMemo(() => generateDots(totalVectors), [totalVectors]);

  /* Auto-advance checklist */
  const [checkStep, setCheckStep] = useState(isRunning ? 0 : CHECKLIST.length);
  const [indexedCount, setIndexedCount] = useState(isRunning ? 0 : totalVectors);

  useEffect(() => {
    if (!isRunning) {
      setCheckStep(CHECKLIST.length);
      setIndexedCount(totalVectors);
      return;
    }
    if (checkStep >= CHECKLIST.length) return;
    const timer = setTimeout(() => setCheckStep((c) => c + 1), 600);
    return () => clearTimeout(timer);
  }, [checkStep, isRunning, totalVectors]);

  /* Animate indexed count */
  useEffect(() => {
    if (!isRunning) {
      setIndexedCount(totalVectors);
      return;
    }
    if (indexedCount >= totalVectors) return;
    const step = Math.max(1, Math.floor(totalVectors / 30));
    const timer = setTimeout(
      () => setIndexedCount((c) => Math.min(c + step, totalVectors)),
      120
    );
    return () => clearTimeout(timer);
  }, [indexedCount, isRunning, totalVectors]);

  const allDone = checkStep >= CHECKLIST.length;
  const progressPct = Math.round((indexedCount / totalVectors) * 100);

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 16,
        }}
      >
        <Database size={16} style={{ color: "var(--accent)" }} />
        <h3
          style={{
            fontSize: 14, fontWeight: 600,
            color: "var(--text-primary)", margin: 0,
          }}
        >
          Indexing to Vector Database
        </h3>
        {isRunning && !allDone && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ display: "inline-flex", alignItems: "center", gap: 3, marginLeft: 6 }}
          >
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--accent)" }}
              />
            ))}
          </motion.div>
        )}
      </div>

      {/* Main visual: clusters → connectors → database */}
      <div
        style={{
          position: "relative",
          height: 300,
          background: "var(--bg-raised)",
          borderRadius: "var(--r-md)",
          border: "1px solid var(--border)",
          overflow: "hidden",
          marginBottom: 16,
        }}
      >
        {/* Left: cluster dots */}
        <div
          style={{
            position: "absolute",
            left: 16,
            top: 16,
            bottom: 16,
            width: "25%",
          }}
        >
          {dots.slice(0, 36).map((dot) => (
            <div
              key={dot.id}
              style={{
                position: "absolute",
                left: `${((dot.startX - 0.05) / 0.22) * 100}%`,
                top: `${((dot.startY - 0.1) / 0.8) * 100}%`,
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: dot.color,
                opacity: 0.6,
              }}
            />
          ))}
        </div>

        {/* Center: connector lines (static) */}
        <svg
          style={{
            position: "absolute",
            left: "28%",
            top: 0,
            width: "44%",
            height: "100%",
            pointerEvents: "none",
          }}
        >
          {[0.2, 0.35, 0.5, 0.65, 0.8].map((y, i) => (
            <motion.line
              key={i}
              x1="0"
              y1={`${y * 100}%`}
              x2="100%"
              y2="50%"
              stroke="var(--border-strong)"
              strokeWidth={0.5}
              opacity={0.5}
              strokeDasharray="4 4"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.8, delay: i * 0.1 }}
            />
          ))}
        </svg>

        {/* Traveling dots on connectors (while running) */}
        {isRunning && dots.slice(0, 20).map((dot) => (
          <TravelingDot key={`t-${dot.id}`} dot={dot} isRunning={isRunning} />
        ))}

        {/* Right: Database cylinder */}
        <div
          style={{
            position: "absolute",
            right: 24,
            top: "50%",
            transform: "translateY(-50%)",
          }}
        >
          <DatabaseCylinder settle={allDone && !isRunning} />
        </div>
      </div>

      {/* Progress bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <span className="mono" style={{ fontSize: 12, color: "var(--text-muted)", flexShrink: 0 }}>
          Vectors indexed
        </span>
        <div
          style={{
            flex: 1,
            height: 6,
            borderRadius: "var(--r-pill)",
            background: "var(--bg-hover)",
            overflow: "hidden",
          }}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.3, ease }}
            style={{
              height: "100%",
              borderRadius: "var(--r-pill)",
              background: allDone ? "var(--state-done)" : "var(--accent)",
            }}
          />
        </div>
        <span className="mono" style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 500, flexShrink: 0 }}>
          {indexedCount}/{totalVectors}
        </span>
      </div>

      {/* Bottom row: checklist + stats */}
      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
        {/* Checklist */}
        <div style={{ flex: 1 }}>
          {CHECKLIST.map((label, i) => (
            <ChecklistItem
              key={label}
              label={label}
              done={i < checkStep}
              active={i === checkStep && isRunning}
              index={i}
            />
          ))}
        </div>

        {/* Stats */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r-sm)",
            padding: "12px 16px",
            minWidth: 160,
          }}
        >
          <StatRow label="Vectors indexed" value={`${indexedCount}`} />
          <StatRow label="Collection" value="warranty_docs" />
          <StatRow label="Engine" value="Qdrant" />
          <StatRow
            label="Status"
            value={allDone ? "Complete" : "Indexing…"}
            valueColor={allDone ? "var(--state-done)" : "var(--accent)"}
          />
        </div>
      </div>
    </div>
  );
}

function StatRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{label}</span>
      <span
        className="mono"
        style={{
          fontSize: 11,
          fontWeight: 500,
          color: valueColor ?? "var(--text-secondary)",
        }}
      >
        {value}
      </span>
    </div>
  );
}
