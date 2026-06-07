"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Props {
  totalChunks?: number;
  isRunning?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Category Data                                                      */
/* ------------------------------------------------------------------ */

interface Category {
  key: string;
  name: string;
  color: string;
  proportion: number;
  /** Cluster center x (0-1) */
  cx: number;
  /** Cluster center y (0-1) */
  cy: number;
}

const CATEGORIES: Category[] = [
  { key: "coverage",  name: "Coverage Codes",  color: "#6366F1", proportion: 0.28, cx: 0.20, cy: 0.25 },
  { key: "vehicle",   name: "Vehicle Data",    color: "#3B82F6", proportion: 0.22, cx: 0.75, cy: 0.20 },
  { key: "period",    name: "Coverage Period",  color: "#8B5CF6", proportion: 0.15, cx: 0.18, cy: 0.72 },
  { key: "exclusions",name: "Exclusions",       color: "#F43F5E", proportion: 0.13, cx: 0.78, cy: 0.70 },
  { key: "claims",    name: "Claim Process",    color: "#F59E0B", proportion: 0.12, cx: 0.50, cy: 0.50 },
  { key: "general",   name: "General Info",     color: "#14B8A6", proportion: 0.10, cx: 0.50, cy: 0.88 },
];

/* ------------------------------------------------------------------ */
/*  Point generation — memoized                                        */
/* ------------------------------------------------------------------ */

interface Point {
  id: number;
  catIdx: number;
  /** Scattered x (0-1) */
  sx: number;
  /** Scattered y (0-1) */
  sy: number;
  /** Cluster target x */
  tx: number;
  /** Cluster target y */
  ty: number;
  /** Faux-depth value 0-1 for 3D mode */
  depth: number;
}

/** Seeded pseudo-random for stable point layout */
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generatePoints(total: number): Point[] {
  const cap = Math.min(total, 400);
  const rand = seededRandom(42);
  const points: Point[] = [];

  let remaining = cap;
  CATEGORIES.forEach((cat, ci) => {
    const count = ci === CATEGORIES.length - 1
      ? remaining
      : Math.round(cap * cat.proportion);
    remaining -= count;
    for (let i = 0; i < count; i++) {
      const angle = rand() * Math.PI * 2;
      const radius = 0.03 + rand() * 0.06;
      points.push({
        id: points.length,
        catIdx: ci,
        sx: 0.08 + rand() * 0.84,
        sy: 0.08 + rand() * 0.84,
        tx: cat.cx + Math.cos(angle) * radius,
        ty: cat.cy + Math.sin(angle) * radius,
        depth: rand(),
      });
    }
  });

  return points;
}

/* ------------------------------------------------------------------ */
/*  Beat / Phase config                                                */
/* ------------------------------------------------------------------ */

const BEAT_LABELS = [
  "Chunks created",
  "Embedding generation",
  "Vector space",
  "Cluster formation",
];

const BEAT_CAPTIONS = [
  (n: number) => `${n} chunks created`,
  () => "Generating embeddings…",
  () => "Mapping to vector space…",
  () => "Forming clusters…",
];

const BEAT_DURATIONS = [1200, 1500, 1800]; // ms before advancing past beat 0,1,2

/* ------------------------------------------------------------------ */
/*  Animation helpers                                                  */
/* ------------------------------------------------------------------ */

const ease = [0.16, 1, 0.3, 1] as const;

/* ------------------------------------------------------------------ */
/*  Chunk grid for beat 0                                              */
/* ------------------------------------------------------------------ */

function ChunkGrid({ count }: { count: number }) {
  const cols = 12;
  const displayed = Math.min(count, 48);
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: 4,
        padding: 16,
      }}
    >
      {Array.from({ length: displayed }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25, delay: i * 0.04, ease }}
          style={{
            width: "100%",
            aspectRatio: "1",
            borderRadius: 4,
            background: CATEGORIES[i % CATEGORIES.length].color,
            opacity: 0.7,
          }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function StageEmbedding({ totalChunks = 382, isRunning = true }: Props) {
  /* --- state --- */
  const [beat, setBeat] = useState(isRunning ? 0 : 3);
  const [viewMode, setViewMode] = useState<"cluster" | "3d">("cluster");
  const [hoveredCat, setHoveredCat] = useState<number | null>(null);

  const points = useMemo(() => generatePoints(totalChunks), [totalChunks]);

  /* --- category counts --- */
  const catCounts = useMemo(() => {
    const counts = new Array(CATEGORIES.length).fill(0);
    points.forEach((p) => counts[p.catIdx]++);
    return counts;
  }, [points]);

  /* --- auto-advance beats while running --- */
  useEffect(() => {
    if (!isRunning) {
      setBeat(3);
      return;
    }
    if (beat >= 3) return;
    const timer = setTimeout(() => setBeat((b) => b + 1), BEAT_DURATIONS[beat]);
    return () => clearTimeout(timer);
  }, [beat, isRunning]);

  /* --- reduced motion --- */
  const prefersReduced = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  }, []);

  /* --- helpers --- */
  const getPointPos = useCallback(
    (p: Point) => {
      if (beat < 2) return { cx: p.sx, cy: p.sy };
      if (beat === 2 && viewMode === "3d") {
        return { cx: p.sx * 0.8 + 0.1, cy: p.sy * 0.8 + 0.1 };
      }
      if (beat >= 3) return { cx: p.tx, cy: p.ty };
      return { cx: p.sx, cy: p.sy };
    },
    [beat, viewMode]
  );

  const getPointRadius = useCallback(
    (p: Point) => {
      if (hoveredCat !== null && p.catIdx === hoveredCat) return 0.009;
      if (beat === 2 && viewMode === "3d") return 0.003 + p.depth * 0.005;
      return 0.005;
    },
    [beat, viewMode, hoveredCat]
  );

  const getPointOpacity = useCallback(
    (p: Point) => {
      if (hoveredCat !== null) {
        return p.catIdx === hoveredCat ? 1 : 0.15;
      }
      if (beat === 2 && viewMode === "3d") return 0.3 + p.depth * 0.7;
      return 0.75;
    },
    [beat, viewMode, hoveredCat]
  );

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div>
      {/* ---- Phase indicator ---- */}
      <div style={{ display: "flex", gap: 0, marginBottom: 12 }}>
        {BEAT_LABELS.map((label, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 10px",
              position: "relative",
            }}
          >
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                background: i <= beat ? "var(--accent)" : "var(--bg-hover)",
                color: i <= beat ? "#FFF" : "var(--text-muted)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
                fontWeight: 600,
                flexShrink: 0,
                transition: "all 300ms ease",
              }}
            >
              {i + 1}
            </div>
            <span
              style={{
                fontSize: 11,
                fontWeight: i <= beat ? 500 : 400,
                color: i <= beat ? "var(--text-primary)" : "var(--text-muted)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {label}
            </span>
            {/* Underline fill */}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: 2,
                background: "var(--border)",
              }}
            />
            <motion.div
              initial={{ width: "0%" }}
              animate={{ width: i <= beat ? "100%" : "0%" }}
              transition={{ duration: 0.5, ease }}
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                height: 2,
                background: "var(--accent)",
                borderRadius: 1,
              }}
            />
          </div>
        ))}
      </div>

      {/* ---- Header row ---- */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Sparkles size={16} style={{ color: "var(--accent)" }} />
          <h3
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--text-primary)",
              margin: 0,
              fontFamily: "Inter, sans-serif",
            }}
          >
            Embedding Space Visualization
          </h3>
        </div>

        {/* View mode toggle — only visible from beat 2+ */}
        {beat >= 2 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              display: "flex",
              gap: 2,
              background: "var(--bg-hover)",
              borderRadius: "var(--r-sm)",
              padding: 2,
            }}
          >
            {(["cluster", "3d"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setViewMode(m)}
                style={{
                  fontSize: 11,
                  padding: "4px 12px",
                  borderRadius: 6,
                  border: "none",
                  background: viewMode === m ? "var(--bg-surface)" : "transparent",
                  color: viewMode === m ? "var(--text-primary)" : "var(--text-muted)",
                  cursor: "pointer",
                  fontWeight: viewMode === m ? 500 : 400,
                  boxShadow: viewMode === m ? "var(--shadow-xs)" : "none",
                  fontFamily: "Inter, sans-serif",
                }}
              >
                {m === "cluster" ? "Cluster View" : "3D Space"}
              </button>
            ))}
          </motion.div>
        )}
      </div>

      {/* ---- Caption ---- */}
      <AnimatePresence mode="wait">
        <motion.div
          key={beat}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.3 }}
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 12,
            color: "var(--text-muted)",
            marginBottom: 10,
          }}
        >
          {BEAT_CAPTIONS[beat](totalChunks)}
        </motion.div>
      </AnimatePresence>

      {/* ---- Main canvas ---- */}
      <div
        style={{
          position: "relative",
          height: 380,
          overflow: "hidden",
          background: "var(--bg-raised)",
          borderRadius: "var(--r-md)",
          border: "1px solid var(--border)",
        }}
      >
        {/* Beat 0: chunk grid */}
        {beat === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: "absolute", inset: 0 }}
          >
            <ChunkGrid count={totalChunks} />
          </motion.div>
        )}

        {/* Beat 1+: SVG visualization */}
        {beat >= 1 && (
          <>
            {/* Grid lines */}
            <svg
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              {[20, 40, 60, 80].map((v) => (
                <g key={v}>
                  <line
                    x1={v} y1={0} x2={v} y2={100}
                    stroke="var(--border)" strokeWidth={0.15} opacity={0.5}
                  />
                  <line
                    x1={0} y1={v} x2={100} y2={v}
                    stroke="var(--border)" strokeWidth={0.15} opacity={0.5}
                  />
                </g>
              ))}
            </svg>

            {/* Points */}
            <svg
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
              viewBox="0 0 1 1"
              preserveAspectRatio="xMidYMid meet"
            >
              {points.map((p) => {
                const pos = getPointPos(p);
                const r = getPointRadius(p);
                const o = getPointOpacity(p);
                const cat = CATEGORIES[p.catIdx];

                return (
                  <motion.circle
                    key={p.id}
                    initial={
                      prefersReduced
                        ? { opacity: o, cx: pos.cx, cy: pos.cy, r }
                        : { opacity: 0, cx: p.sx, cy: p.sy, r: 0 }
                    }
                    animate={{
                      opacity: o,
                      cx: pos.cx,
                      cy: pos.cy,
                      r,
                    }}
                    transition={{
                      opacity: { duration: 0.3, delay: prefersReduced ? 0 : p.id * 0.01 },
                      r: { duration: 0.3 },
                      cx: { type: "spring", stiffness: 60, damping: 18, mass: 0.8 },
                      cy: { type: "spring", stiffness: 60, damping: 18, mass: 0.8 },
                    }}
                    fill={cat.color}
                  />
                );
              })}
            </svg>

            {/* Cluster labels (beat 3+) */}
            {beat >= 3 &&
              CATEGORIES.map((cat, ci) => (
                <motion.div
                  key={cat.key}
                  initial={prefersReduced ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: ci * 0.1 + 0.4 }}
                  onMouseEnter={() => setHoveredCat(ci)}
                  onMouseLeave={() => setHoveredCat(null)}
                  style={{
                    position: "absolute",
                    left: `${cat.cx * 100}%`,
                    top: `${cat.cy * 100}%`,
                    transform: "translate(-50%, -50%)",
                    padding: "4px 10px",
                    borderRadius: "var(--r-pill)",
                    background: "var(--bg-surface)",
                    border: `1px solid ${cat.color}`,
                    boxShadow: hoveredCat === ci ? "var(--shadow-md)" : "var(--shadow-xs)",
                    cursor: "pointer",
                    transition: "box-shadow 150ms ease",
                    zIndex: 10,
                    userSelect: "none",
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: cat.color,
                      fontFamily: "Inter, sans-serif",
                    }}
                  >
                    {cat.name}
                  </span>
                  {/* Tooltip */}
                  <AnimatePresence>
                    {hoveredCat === ci && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        transition={{ duration: 0.15 }}
                        style={{
                          position: "absolute",
                          top: "100%",
                          left: "50%",
                          transform: "translateX(-50%)",
                          marginTop: 6,
                          padding: "8px 12px",
                          borderRadius: "var(--r-sm)",
                          background: "var(--bg-surface)",
                          border: "1px solid var(--border)",
                          boxShadow: "var(--shadow-lg)",
                          whiteSpace: "nowrap",
                          zIndex: 20,
                          fontSize: 11,
                          color: "var(--text-secondary)",
                          fontFamily: "Inter, sans-serif",
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 600,
                            color: "var(--text-primary)",
                            marginBottom: 2,
                          }}
                        >
                          {cat.name} Cluster
                        </div>
                        <div>
                          {catCounts[ci]} chunks · similarity 0.9{ci + 1}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
          </>
        )}
      </div>

      {/* ---- Legend ---- */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginTop: 12,
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          {CATEGORIES.map((cat, ci) => (
            <div
              key={cat.key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 11,
                color: "var(--text-secondary)",
                fontFamily: "Inter, sans-serif",
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: cat.color,
                  flexShrink: 0,
                }}
              />
              {cat.name}
              <span
                className="mono"
                style={{ color: "var(--text-muted)", fontSize: 10 }}
              >
                {catCounts[ci]}
              </span>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div
          style={{
            display: "flex",
            gap: 16,
            fontSize: 11,
            color: "var(--text-muted)",
            fontFamily: "Inter, sans-serif",
            flexShrink: 0,
          }}
        >
          <span>
            Total chunks{" "}
            <span className="mono" style={{ color: "var(--text-secondary)" }}>
              {totalChunks}
            </span>
          </span>
          <span>
            Embedded{" "}
            <span className="mono" style={{ color: "var(--text-secondary)" }}>
              {beat >= 1 ? totalChunks : 0}
            </span>
          </span>
          <span>
            Dimensions{" "}
            <span className="mono" style={{ color: "var(--text-secondary)" }}>
              1536
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
