"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface Cluster {
  name: string;
  color: string;
  count: number;
  cx: number;
  cy: number;
}

const CLUSTERS: Cluster[] = [
  { name: "Coverage Codes", color: "var(--cat-coverage)", count: 45, cx: 0.25, cy: 0.3 },
  { name: "Vehicle Data", color: "var(--cat-vehicle)", count: 38, cx: 0.7, cy: 0.25 },
  { name: "Claims Process", color: "var(--cat-claims)", count: 32, cx: 0.2, cy: 0.7 },
  { name: "Terms & Conditions", color: "var(--cat-terms)", count: 28, cx: 0.75, cy: 0.65 },
  { name: "Exclusions", color: "var(--cat-exclusions)", count: 22, cx: 0.5, cy: 0.5 },
  { name: "General", color: "var(--cat-emissions)", count: 17, cx: 0.5, cy: 0.85 },
];

function generatePoints(clusters: Cluster[], totalCount: number) {
  const points: { x: number; y: number; cluster: number; delay: number }[] = [];
  let idx = 0;
  clusters.forEach((c, ci) => {
    for (let i = 0; i < c.count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.04 + Math.random() * 0.08;
      points.push({
        x: c.cx + Math.cos(angle) * radius,
        y: c.cy + Math.sin(angle) * radius,
        cluster: ci,
        delay: idx * 0.012,
      });
      idx++;
    }
  });
  // Fill remaining with scattered points
  while (points.length < totalCount) {
    points.push({
      x: 0.1 + Math.random() * 0.8,
      y: 0.1 + Math.random() * 0.8,
      cluster: -1,
      delay: idx * 0.012,
    });
    idx++;
  }
  return points;
}

export default function EmbeddingVisualization({
  totalChunks = 382,
  embeddedCount = 382,
  progress = 100,
}: {
  totalChunks?: number;
  embeddedCount?: number;
  progress?: number;
}) {
  const [phase, setPhase] = useState(0); // 0-3 for the 4-beat sequence
  const [hoveredCluster, setHoveredCluster] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"cluster" | "3d">("cluster");

  const points = useMemo(() => generatePoints(CLUSTERS, totalChunks), [totalChunks]);

  // Auto-advance through phases
  useEffect(() => {
    if (phase >= 3) return;
    const timer = setTimeout(
      () => setPhase((p) => p + 1),
      phase === 0 ? 1200 : phase === 1 ? 1500 : 1800
    );
    return () => clearTimeout(timer);
  }, [phase]);

  const PHASE_LABELS = [
    "Chunks Created",
    "Embedding Generation",
    "Vector Space Formation",
    "Cluster Formation",
  ];

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
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
            }}
          >
            Embedding Space Visualization
          </h3>
        </div>

        <div style={{ display: "flex", gap: 2, background: "var(--bg-hover)", borderRadius: "var(--r-sm)", padding: 2 }}>
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
              }}
            >
              {m === "cluster" ? "Cluster View" : "3D Space"}
            </button>
          ))}
        </div>
      </div>

      {/* Phase indicator */}
      <div
        style={{
          display: "flex",
          gap: 0,
          marginBottom: 16,
        }}
      >
        {PHASE_LABELS.map((label, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              borderBottom: `2px solid ${i <= phase ? "var(--accent)" : "var(--border)"}`,
              transition: "border-color 300ms ease",
            }}
          >
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                background: i <= phase ? "var(--accent)" : "var(--bg-hover)",
                color: i <= phase ? "#FFF" : "var(--text-muted)",
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
                fontWeight: i <= phase ? 500 : 400,
                color: i <= phase ? "var(--text-primary)" : "var(--text-muted)",
                whiteSpace: "nowrap",
              }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Canvas */}
      <div
        className="card"
        style={{
          position: "relative",
          height: 380,
          overflow: "hidden",
          background: "var(--bg-raised)",
        }}
      >
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
          {phase >= 1 &&
            points.map((p, i) => {
              const cluster = p.cluster >= 0 ? CLUSTERS[p.cluster] : null;
              const isHovered = hoveredCluster !== null && p.cluster === hoveredCluster;
              const color = cluster?.color || "var(--text-muted)";
              const scatterX = phase < 2 ? 0.1 + Math.random() * 0.8 : p.x;
              const scatterY = phase < 2 ? 0.1 + Math.random() * 0.8 : p.y;

              return (
                <motion.circle
                  key={i}
                  initial={{ opacity: 0, r: 0 }}
                  animate={{
                    opacity: isHovered ? 1 : 0.7,
                    r: isHovered ? 0.008 : 0.005,
                    cx: phase >= 3 ? p.x : scatterX,
                    cy: phase >= 3 ? p.y : scatterY,
                  }}
                  transition={{
                    opacity: { duration: 0.3, delay: p.delay },
                    r: { duration: 0.3 },
                    cx: { duration: 0.9, ease: [0.16, 1, 0.3, 1] },
                    cy: { duration: 0.9, ease: [0.16, 1, 0.3, 1] },
                  }}
                  fill={color}
                />
              );
            })}
        </svg>

        {/* Cluster labels */}
        {phase >= 3 &&
          CLUSTERS.map((c, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: i * 0.1 + 0.5 }}
              onMouseEnter={() => setHoveredCluster(i)}
              onMouseLeave={() => setHoveredCluster(null)}
              style={{
                position: "absolute",
                left: `${c.cx * 100}%`,
                top: `${c.cy * 100}%`,
                transform: "translate(-50%, -50%)",
                padding: "4px 10px",
                borderRadius: "var(--r-pill)",
                background: "var(--bg-surface)",
                border: `1px solid ${c.color}`,
                boxShadow: hoveredCluster === i ? "var(--shadow-md)" : "var(--shadow-xs)",
                cursor: "pointer",
                transition: "box-shadow 150ms ease",
                zIndex: 10,
              }}
            >
              <span style={{ fontSize: 10, fontWeight: 600, color: c.color }}>
                {c.name}
              </span>
              {hoveredCluster === i && (
                <div
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
                  }}
                >
                  <div style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: 2 }}>
                    {c.name} Cluster
                  </div>
                  <div>{c.count} chunks · similarity 0.{88 + i}</div>
                </div>
              )}
            </motion.div>
          ))}
      </div>

      {/* Legend + Stats */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginTop: 12,
          gap: 16,
        }}
      >
        {/* Cluster legend */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          {CLUSTERS.map((c, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 11,
                color: "var(--text-secondary)",
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: c.color,
                }}
              />
              {c.name}
              <span className="mono" style={{ color: "var(--text-muted)", fontSize: 10 }}>
                {c.count}
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
              {embeddedCount}
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
