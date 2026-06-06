"use client";

import { motion } from "framer-motion";
import { FileText, Layers, Gauge, AlertTriangle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface StatStripProps {
  pageCount?: number;
  chunkCount?: number;
  confidence?: number;
  warningCount?: number;
}

interface StatItem {
  icon: LucideIcon;
  label: string;
  value: string;
  color: string;
}

export default function StatStrip({
  pageCount,
  chunkCount,
  confidence,
  warningCount,
}: StatStripProps) {
  const stats: StatItem[] = [
    {
      icon: FileText,
      label: "PAGES",
      value: pageCount != null ? String(pageCount) : "—",
      color: "var(--accent)",
    },
    {
      icon: Layers,
      label: "CHUNKS",
      value: chunkCount != null ? String(chunkCount) : "—",
      color: "var(--accent)",
    },
    {
      icon: Gauge,
      label: "CONFIDENCE",
      value: confidence != null ? `${confidence}%` : "—",
      color: confidence != null
        ? confidence >= 80
          ? "var(--conf-high)"
          : confidence >= 50
          ? "var(--conf-medium)"
          : "var(--conf-low)"
        : "var(--text-muted)",
    },
    {
      icon: AlertTriangle,
      label: "WARNINGS",
      value: warningCount != null ? String(warningCount) : "—",
      color:
        warningCount != null && warningCount > 0
          ? "var(--conf-medium)"
          : "var(--text-muted)",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      style={{
        display: "flex",
        alignItems: "stretch",
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--r-md)",
        boxShadow: "var(--shadow-xs)",
        overflow: "hidden",
        width: "100%",
      }}
    >
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.3,
              delay: index * 0.08,
              ease: [0.16, 1, 0.3, 1],
            }}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "18px 12px",
              borderRight:
                index < stats.length - 1
                  ? "1px solid var(--border)"
                  : "none",
              gap: 6,
            }}
          >
            <Icon
              size={14}
              style={{ color: "var(--text-muted)", marginBottom: 2 }}
            />
            <span
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 24,
                fontWeight: 600,
                color: stat.value === "—" ? "var(--text-muted)" : stat.color,
                lineHeight: 1,
              }}
            >
              {stat.value}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              {stat.label}
            </span>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
