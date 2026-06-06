"use client";

import React from "react";
import { motion } from "framer-motion";
import { Layers, Tag } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SectionExtractionProps {
  totalSections?: number;
  extractedCount?: number;
}

interface SectionDef {
  name: string;
  category: string;
  categoryColor: string;
  categoryBg: string;
  items: number;
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const SECTIONS: SectionDef[] = [
  {
    name: "Coverage Information",
    category: "Coverage clause",
    categoryColor: "#6366F1",
    categoryBg: "rgba(99, 102, 241, 0.1)",
    items: 14,
  },
  {
    name: "Vehicle Data",
    category: "Eligibility",
    categoryColor: "#0891B2",
    categoryBg: "rgba(8, 145, 178, 0.1)",
    items: 8,
  },
  {
    name: "Terms & Conditions",
    category: "Definition",
    categoryColor: "#7C3AED",
    categoryBg: "rgba(124, 58, 237, 0.1)",
    items: 22,
  },
  {
    name: "Exclusions",
    category: "Exclusion",
    categoryColor: "#EF4444",
    categoryBg: "rgba(239, 68, 68, 0.08)",
    items: 11,
  },
  {
    name: "Claim Procedures",
    category: "Claim procedure",
    categoryColor: "#16A34A",
    categoryBg: "rgba(22, 163, 74, 0.1)",
    items: 6,
  },
];

/* ------------------------------------------------------------------ */
/*  Animation                                                          */
/* ------------------------------------------------------------------ */

const ease = [0.16, 1, 0.3, 1] as const;

const listVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1, delayChildren: 0.15 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 10, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.35, ease },
  },
};

const chipVariants = {
  hidden: { opacity: 0, y: 6, scale: 0.8 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.25, ease, delay: 0.15 },
  },
};

const sweepVariants = {
  hidden: { x: "-100%" as any },
  visible: {
    x: "200%" as any,
    transition: { duration: 0.8, ease: "easeInOut", delay: 0.2 },
  },
};

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function SectionCard({ section, index }: { section: SectionDef; index: number }) {
  return (
    <motion.div
      variants={cardVariants}
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
      <motion.div
        variants={sweepVariants as any}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "50%",
          height: "100%",
          background:
            "linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.06), transparent)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 6,
            }}
          >
            <Layers size={14} color="var(--text-muted)" />
            <span
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: 14,
                fontWeight: 500,
                color: "var(--text-primary)",
              }}
            >
              {section.name}
            </span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {/* Category chip */}
            <motion.span
              variants={chipVariants}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "2px 8px",
                borderRadius: "var(--r-pill)",
                background: section.categoryBg,
                fontFamily: "Inter, sans-serif",
                fontSize: 11,
                fontWeight: 500,
                color: section.categoryColor,
                whiteSpace: "nowrap",
              }}
            >
              <Tag size={10} />
              {section.category}
            </motion.span>

            <span
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 11,
                color: "var(--text-muted)",
              }}
            >
              {section.items} items
            </span>
          </div>
        </div>

        {/* Index number */}
        <div
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 12,
            fontWeight: 600,
            color: "var(--text-muted)",
            width: 24,
            height: 24,
            borderRadius: "var(--r-sm)",
            background: "var(--bg-hover)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {index + 1}
        </div>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function SectionExtraction({
  totalSections,
  extractedCount,
}: SectionExtractionProps) {
  const total = totalSections ?? SECTIONS.length;
  const extracted = extractedCount ?? SECTIONS.length;
  const itemsFound = SECTIONS.reduce((s, sec) => s + sec.items, 0);
  const visibleSections = SECTIONS.slice(0, extracted);

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      style={{ width: "100%" }}
    >
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
            fontFamily: "Inter, sans-serif",
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-secondary)",
            textTransform: "uppercase" as const,
            letterSpacing: "0.04em",
          }}
        >
          Section Extraction
        </div>
        <div
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 12,
            color: "var(--text-muted)",
          }}
        >
          Sections extracted{" "}
          <span style={{ color: "var(--accent)", fontWeight: 600 }}>
            {extracted}
          </span>
          /{total} · Items found:{" "}
          <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>
            {itemsFound}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: 4,
          borderRadius: "var(--r-pill)",
          background: "var(--bg-hover)",
          marginBottom: 16,
          overflow: "hidden",
        }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(extracted / total) * 100}%` }}
          transition={{ duration: 0.6, ease }}
          style={{
            height: "100%",
            borderRadius: "var(--r-pill)",
            background: "var(--accent)",
          }}
        />
      </div>

      {/* Section cards */}
      <motion.div
        variants={listVariants}
        style={{ display: "flex", flexDirection: "column", gap: 8 }}
      >
        {visibleSections.map((section, idx) => (
          <SectionCard key={section.name} section={section} index={idx} />
        ))}
      </motion.div>
    </motion.div>
  );
}
