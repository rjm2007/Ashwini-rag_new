"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Check,
  FileText,
  Box,
  Cpu,
  Clock,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Props {
  pageCount?: number;
  chunkCount?: number;
  embeddingCount?: number;
  processingTime?: string;
  confidence?: number;
  onViewSummary?: () => void;
  onAskQuestions?: () => void;
  docId?: string;
}

/* ------------------------------------------------------------------ */
/*  Animation helpers                                                   */
/* ------------------------------------------------------------------ */

const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];

const RING_RADIUS = 50;
const RING_STROKE = 6;
const RING_VIEWBOX = (RING_RADIUS + RING_STROKE) * 2; // 112
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS; // ~314.16
const RING_DURATION = 0.5; // seconds

/* ------------------------------------------------------------------ */
/*  Spark burst data                                                   */
/* ------------------------------------------------------------------ */

interface Spark {
  angle: number; // radians
  distance: number; // px from center
  size: number; // px diameter
  delay: number; // seconds
}

function generateSparks(count: number, seed: number): Spark[] {
  // Deterministic pseudo-random so layout doesn't shift between renders
  let s = seed;
  const rand = () => {
    s = (s * 16807 + 11) % 2147483647;
    return (s & 0x7fffffff) / 0x7fffffff;
  };

  const sparks: Spark[] = [];
  for (let i = 0; i < count; i++) {
    sparks.push({
      angle: rand() * Math.PI * 2,
      distance: 40 + rand() * 55,
      size: 3 + rand() * 4,
      delay: rand() * 0.25,
    });
  }
  return sparks;
}

/* ------------------------------------------------------------------ */
/*  Success ring with check                                            */
/* ------------------------------------------------------------------ */

function SuccessRing({ skipAnim }: { skipAnim: boolean }) {
  const center = RING_VIEWBOX / 2;

  return (
    <div
      style={{
        position: "relative",
        width: RING_VIEWBOX,
        height: RING_VIEWBOX,
        margin: "0 auto 22px",
      }}
    >
      <svg
        width={RING_VIEWBOX}
        height={RING_VIEWBOX}
        viewBox={`0 0 ${RING_VIEWBOX} ${RING_VIEWBOX}`}
        style={{ display: "block" }}
      >
        {/* Background track */}
        <circle
          cx={center}
          cy={center}
          r={RING_RADIUS}
          fill="none"
          stroke="var(--border)"
          strokeWidth={RING_STROKE}
        />

        {/* Animated green stroke */}
        <motion.circle
          cx={center}
          cy={center}
          r={RING_RADIUS}
          fill="none"
          stroke="var(--state-done)"
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          initial={skipAnim ? false : { strokeDashoffset: CIRCUMFERENCE }}
          animate={{ strokeDashoffset: 0 }}
          transition={
            skipAnim
              ? { duration: 0 }
              : { duration: RING_DURATION, ease }
          }
          style={{ transformOrigin: "center", transform: "rotate(-90deg)" }}
        />
      </svg>

      {/* Check icon — springs in after ring completes */}
      <motion.div
        initial={skipAnim ? false : { scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={
          skipAnim
            ? { duration: 0 }
            : {
                type: "spring",
                stiffness: 400,
                damping: 20,
                delay: RING_DURATION + 0.08,
              }
        }
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: "var(--state-done)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Check size={26} color="#fff" strokeWidth={2.8} />
        </div>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Spark burst                                                        */
/* ------------------------------------------------------------------ */

function SparkBurst() {
  const sparks = useMemo(() => generateSparks(20, 42), []);

  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        top: RING_VIEWBOX / 2,
        left: "50%",
        width: 0,
        height: 0,
        pointerEvents: "none",
      }}
    >
      {sparks.map((sp, i) => {
        const tx = Math.cos(sp.angle) * sp.distance;
        const ty = Math.sin(sp.angle) * sp.distance;

        return (
          <motion.div
            key={i}
            initial={{ x: 0, y: 0, opacity: 0.85, scale: 1 }}
            animate={{ x: tx, y: ty, opacity: 0, scale: 0.3 }}
            transition={{
              duration: 0.9,
              delay: RING_DURATION + 0.12 + sp.delay,
              ease: "easeOut",
            }}
            style={{
              position: "absolute",
              width: sp.size,
              height: sp.size,
              borderRadius: "50%",
              background: "var(--state-done)",
              marginLeft: -sp.size / 2,
              marginTop: -sp.size / 2,
            }}
          />
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Stat item                                                          */
/* ------------------------------------------------------------------ */

function StatItem({
  icon,
  label,
  value,
  delay,
  skipAnim,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  delay: number;
  skipAnim: boolean;
}) {
  return (
    <motion.div
      initial={skipAnim ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={skipAnim ? { duration: 0 } : { duration: 0.3, delay, ease }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 3,
        flex: 1,
        minWidth: 72,
      }}
    >
      <div style={{ color: "var(--text-muted)" }}>{icon}</div>
      <div
        className="mono"
        style={{
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
          textTransform: "uppercase",
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

export default function StageCompletion({
  pageCount = 0,
  chunkCount = 0,
  embeddingCount = 0,
  processingTime = "—",
  confidence = 0,
  onViewSummary,
  onAskQuestions,
  docId,
}: Props) {
  /* ── Burst guard ── */
  const storageKey = `completion-played-${docId ?? "default"}`;
  const hasPlayedRef = useRef(false);
  const [showBurst, setShowBurst] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(storageKey)) {
        hasPlayedRef.current = true;
      } else {
        setShowBurst(true);
        sessionStorage.setItem(storageKey, "1");
      }
    } catch {
      // sessionStorage unavailable — show burst once
      if (!hasPlayedRef.current) {
        setShowBurst(true);
        hasPlayedRef.current = true;
      }
    }
  }, [storageKey]);

  const skipAnim = hasPlayedRef.current && !showBurst;

  const confidencePercent =
    confidence > 1 ? confidence : Math.round(confidence * 100);

  /* Delay offsets (used only when animating) */
  const headingDelay = RING_DURATION + 0.35;
  const cardDelay = headingDelay + 0.18;
  const statBaseDelay = cardDelay + 0.18;
  const buttonsDelay = statBaseDelay + 0.5;

  return (
    <motion.div
      initial={skipAnim ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={skipAnim ? { duration: 0 } : { duration: 0.35 }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "32px 24px",
        width: "100%",
        maxWidth: 460,
        margin: "0 auto",
        position: "relative",
      }}
    >
      {/* ─── Success ring ─── */}
      <SuccessRing skipAnim={skipAnim} />

      {/* ─── Spark burst (one-shot, guarded) ─── */}
      {showBurst && <SparkBurst />}

      {/* ─── Heading ─── */}
      <motion.h2
        initial={skipAnim ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={
          skipAnim
            ? { duration: 0 }
            : { duration: 0.35, delay: headingDelay, ease }
        }
        style={{
          fontFamily: "Inter, sans-serif",
          fontSize: 22,
          fontWeight: 600,
          color: "var(--text-primary)",
          margin: "0 0 6px",
          textAlign: "center",
        }}
      >
        Processing Complete!
      </motion.h2>

      <motion.p
        initial={skipAnim ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={
          skipAnim
            ? { duration: 0 }
            : { duration: 0.28, delay: headingDelay + 0.12 }
        }
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

      {/* ─── Result card with stat grid ─── */}
      <motion.div
        initial={skipAnim ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={
          skipAnim
            ? { duration: 0 }
            : { duration: 0.38, delay: cardDelay, ease }
        }
        style={{
          width: "100%",
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-md)",
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
            gap: 14,
          }}
        >
          <StatItem
            icon={<FileText size={17} />}
            label="Pages"
            value={pageCount}
            delay={statBaseDelay}
            skipAnim={skipAnim}
          />
          <StatItem
            icon={<Box size={17} />}
            label="Chunks"
            value={chunkCount}
            delay={statBaseDelay + 0.08}
            skipAnim={skipAnim}
          />
          <StatItem
            icon={<Cpu size={17} />}
            label="Embeddings"
            value={embeddingCount}
            delay={statBaseDelay + 0.16}
            skipAnim={skipAnim}
          />
          <StatItem
            icon={<Clock size={17} />}
            label="Time"
            value={processingTime}
            delay={statBaseDelay + 0.24}
            skipAnim={skipAnim}
          />
          <StatItem
            icon={<ShieldCheck size={17} />}
            label="Confidence"
            value={`${confidencePercent}%`}
            delay={statBaseDelay + 0.32}
            skipAnim={skipAnim}
          />
        </div>
      </motion.div>

      {/* ─── Action buttons ─── */}
      <motion.div
        initial={skipAnim ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={
          skipAnim
            ? { duration: 0 }
            : { duration: 0.32, delay: buttonsDelay, ease }
        }
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
            padding: "10px 22px",
            borderRadius: "var(--r-sm)",
            border: "1.5px solid var(--accent)",
            background: "var(--bg-surface)",
            color: "var(--accent)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            transition: "background 0.15s, border-color 0.15s",
          }}
          onMouseEnter={(e) => {
            const t = e.currentTarget;
            t.style.background = "var(--accent-soft)";
          }}
          onMouseLeave={(e) => {
            const t = e.currentTarget;
            t.style.background = "var(--bg-surface)";
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
            padding: "10px 22px",
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
            e.currentTarget.style.background = "var(--accent-hover)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--accent)";
          }}
        >
          Ask Questions
          <ArrowRight size={16} />
        </button>
      </motion.div>
    </motion.div>
  );
}
