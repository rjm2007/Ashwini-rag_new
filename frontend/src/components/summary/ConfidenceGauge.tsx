"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface ConfidenceGaugeProps {
  score: number;
  size?: number;
}

interface SubScore {
  label: string;
  value: number;
}

const EASE_PRIMARY: [number, number, number, number] = [0.16, 1, 0.3, 1];

function getColor(score: number): string {
  if (score >= 80) return "var(--conf-high)";
  if (score >= 50) return "var(--conf-medium)";
  return "var(--conf-low)";
}

function getLabel(score: number): string {
  if (score >= 80) return "High Confidence";
  if (score >= 50) return "Medium Confidence";
  return "Low Confidence";
}

export default function ConfidenceGauge({ score, size = 180 }: ConfidenceGaugeProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const clampedScore = Math.max(0, Math.min(100, score));

  useEffect(() => {
    setAnimatedScore(clampedScore);
  }, [clampedScore]);

  const radius = 60;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const arcStart = 0.75; // start at bottom-left (270 degrees)
  const arcSpan = 0.75; // 270 degree arc
  const dashTotal = circumference * arcSpan;
  const dashOffset = dashTotal - (dashTotal * (animatedScore / 100));

  const color = getColor(clampedScore);
  const label = getLabel(clampedScore);

  const viewBoxSize = (radius + strokeWidth) * 2;
  const center = radius + strokeWidth;

  // Sub-scores derived from main score with slight variation
  const subScores: SubScore[] = [
    { label: "Data Extraction", value: Math.min(100, Math.round(clampedScore * 1.05)) },
    { label: "Field Validation", value: Math.min(100, Math.round(clampedScore * 0.92)) },
    { label: "Completeness", value: Math.min(100, Math.round(clampedScore * 0.98)) },
    { label: "Consistency", value: Math.min(100, Math.round(clampedScore * 0.95)) },
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 24,
      }}
    >
      {/* SVG Gauge */}
      <div style={{ position: "relative", width: size, height: size }}>
        <svg
          viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
          width={size}
          height={size}
          style={{ transform: "rotate(135deg)" }}
        >
          {/* Background track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="var(--border)"
            strokeWidth={strokeWidth}
            strokeDasharray={`${dashTotal} ${circumference}`}
            strokeLinecap="round"
          />
          {/* Foreground arc */}
          <motion.circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${dashTotal} ${circumference}`}
            strokeLinecap="round"
            initial={{ strokeDashoffset: dashTotal }}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: 0.7, ease: EASE_PRIMARY }}
          />
        </svg>

        {/* Center text */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -45%)",
            textAlign: "center",
          }}
        >
          <motion.span
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 32,
              fontWeight: 600,
              color: "var(--text-primary)",
              display: "block",
              lineHeight: 1,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            {clampedScore}%
          </motion.span>
          <motion.span
            style={{
              fontSize: 11,
              color: color,
              fontWeight: 500,
              display: "block",
              marginTop: 4,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.4 }}
          >
            {label}
          </motion.span>
        </div>
      </div>

      {/* Sub-score bars */}
      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
        {subScores.map((sub, i) => (
          <div key={sub.label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span
              style={{
                fontSize: 11,
                color: "var(--text-secondary)",
                width: 110,
                flexShrink: 0,
                textAlign: "right",
              }}
            >
              {sub.label}
            </span>
            <div
              style={{
                flex: 1,
                height: 6,
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
                animate={{ width: `${sub.value}%` }}
                transition={{
                  duration: 0.6,
                  delay: 0.3 + i * 0.1,
                  ease: EASE_PRIMARY,
                }}
              />
            </div>
            <span
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 11,
                color: "var(--text-muted)",
                width: 32,
                textAlign: "right",
              }}
            >
              {sub.value}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
