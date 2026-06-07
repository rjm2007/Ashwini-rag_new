"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Layers, Tag, Database } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Props {
  masterSchema?: any;
  isRunning?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Section data                                                       */
/* ------------------------------------------------------------------ */

interface SectionDef {
  name: string;
  tag: string;
  tagColor: string;
  tagBg: string;
  items: number;
}

const SECTIONS: SectionDef[] = [
  { name: "Coverage Information", tag: "Coverage clause", tagColor: "#6366F1", tagBg: "rgba(99,102,241,0.10)", items: 14 },
  { name: "Vehicle Data", tag: "Eligibility", tagColor: "#3B82F6", tagBg: "rgba(59,130,246,0.10)", items: 8 },
  { name: "Terms & Conditions", tag: "Definition", tagColor: "#8B5CF6", tagBg: "rgba(139,92,246,0.10)", items: 22 },
  { name: "Exclusions", tag: "Exclusion", tagColor: "#F43F5E", tagBg: "rgba(244,63,94,0.08)", items: 11 },
  { name: "Claim Procedures", tag: "Claim procedure", tagColor: "#16A34A", tagBg: "rgba(22,163,74,0.10)", items: 6 },
];

const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function SectionCard({
  section,
  index,
  visible,
  schemaAssembling,
}: {
  section: SectionDef;
  index: number;
  visible: boolean;
  schemaAssembling: boolean;
}) {
  const [tagVisible, setTagVisible] = useState(false);
  const [sweepComplete, setSweepComplete] = useState(false);

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => setTagVisible(true), 250);
      const sweepTimer = setTimeout(() => setSweepComplete(true), 600);
      return () => {
        clearTimeout(timer);
        clearTimeout(sweepTimer);
      };
    }
  }, [visible]);

  if (!visible) {
    // Skeleton state
    return (
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-sm)",
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div style={{ width: 14, height: 14, borderRadius: 3, background: "var(--bg-hover)" }} />
        <div style={{ flex: 1 }}>
          <div style={{ height: 10, borderRadius: 3, background: "var(--bg-hover)", width: "60%" }} />
          <div style={{ height: 8, borderRadius: 3, background: "var(--bg-hover)", width: "40%", marginTop: 6 }} />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.06, ease }}
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--r-sm)",
        padding: "14px 16px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Highlight sweep */}
      {!sweepComplete && (
        <motion.div
          initial={{ x: "-100%" }}
          animate={{ x: "200%" }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "50%",
            height: "100%",
            background: "linear-gradient(90deg, transparent, rgba(99,102,241,0.06), transparent)",
            pointerEvents: "none",
          }}
        />
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <Layers size={14} color="var(--text-muted)" />
            <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>
              {section.name}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Category tag — drops in */}
            <AnimatePresence>
              {tagVisible && (
                <motion.span
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, ease }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "2px 8px",
                    borderRadius: "var(--r-pill)",
                    background: section.tagBg,
                    fontSize: 11,
                    fontWeight: 500,
                    color: section.tagColor,
                    whiteSpace: "nowrap",
                  }}
                >
                  <Tag size={10} />
                  {section.tag}
                </motion.span>
              )}
            </AnimatePresence>

            <span className="mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>
              {section.items} items
            </span>
          </div>
        </div>

        {/* Index badge */}
        <div
          className="mono"
          style={{
            width: 24, height: 24, borderRadius: "var(--r-sm)",
            background: "var(--bg-hover)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 600, color: "var(--text-muted)",
            flexShrink: 0,
          }}
        >
          {index + 1}
        </div>
      </div>

      {/* Schema chip emission — animated during assembly */}
      {schemaAssembling && sweepComplete && (
        <motion.div
          initial={{ opacity: 1, x: 0 }}
          animate={{ opacity: 0, x: 100 }}
          transition={{ duration: 0.6, delay: 0.3 + index * 0.12, ease }}
          style={{
            position: "absolute",
            right: 40,
            top: "50%",
            transform: "translateY(-50%)",
            padding: "2px 6px",
            borderRadius: "var(--r-pill)",
            background: section.tagBg,
            fontSize: 9,
            fontWeight: 600,
            color: section.tagColor,
            pointerEvents: "none",
          }}
        >
          {section.tag}
        </motion.div>
      )}
    </motion.div>
  );
}

/* Schema assembly target */
function SchemaStack({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, ease }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        padding: "16px 20px",
        background: "var(--bg-surface)",
        border: "1px solid var(--border-accent)",
        borderRadius: "var(--r-md)",
        boxShadow: "var(--shadow-sm)",
        minWidth: 140,
      }}
    >
      <Database size={20} style={{ color: "var(--accent)" }} />
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>
        Master Schema
      </div>
      <div className="mono" style={{ fontSize: 10, color: "var(--text-muted)" }}>
        Assembling…
      </div>

      {/* Stacked chips representing collected sections */}
      <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 4 }}>
        {SECTIONS.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.3 + i * 0.12, ease }}
            style={{
              padding: "2px 8px",
              borderRadius: "var(--r-pill)",
              background: s.tagBg,
              fontSize: 9,
              fontWeight: 500,
              color: s.tagColor,
              textAlign: "center",
            }}
          >
            {s.tag}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function StageSectionExtraction({
  masterSchema,
  isRunning = true,
}: Props) {
  const [revealedCount, setRevealedCount] = useState(isRunning ? 0 : SECTIONS.length);
  const [showSchema, setShowSchema] = useState(!isRunning);

  // Progressive reveal while running
  useEffect(() => {
    if (!isRunning) {
      setRevealedCount(SECTIONS.length);
      setShowSchema(true);
      return;
    }
    if (revealedCount >= SECTIONS.length) {
      // All sections revealed, show schema assembly
      const timer = setTimeout(() => setShowSchema(true), 400);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => setRevealedCount((c) => c + 1), 300);
    return () => clearTimeout(timer);
  }, [revealedCount, isRunning]);

  const totalItems = SECTIONS.reduce((s, sec) => s + sec.items, 0);

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        <div
          style={{
            fontSize: 13, fontWeight: 600,
            color: "var(--text-secondary)",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          Section Extraction
        </div>
        <div className="mono" style={{ fontSize: 12, color: "var(--text-muted)" }}>
          Sections extracted{" "}
          <span style={{ color: "var(--accent)", fontWeight: 600 }}>{revealedCount}</span>
          /{SECTIONS.length} · Items{" "}
          <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>{totalItems}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: 4, borderRadius: "var(--r-pill)",
          background: "var(--bg-hover)", marginBottom: 16, overflow: "hidden",
        }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(revealedCount / SECTIONS.length) * 100}%` }}
          transition={{ duration: 0.5, ease }}
          style={{
            height: "100%", borderRadius: "var(--r-pill)",
            background: "var(--accent)",
          }}
        />
      </div>

      {/* Layout: section cards + schema stack */}
      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
        {/* Section cards column */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          {SECTIONS.map((section, idx) => (
            <SectionCard
              key={section.name}
              section={section}
              index={idx}
              visible={idx < revealedCount}
              schemaAssembling={showSchema}
            />
          ))}
        </div>

        {/* Schema assembly stack */}
        <SchemaStack visible={showSchema} />
      </div>
    </div>
  );
}
