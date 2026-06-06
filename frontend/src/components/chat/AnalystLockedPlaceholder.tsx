"use client";

import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface AnalystLockedPlaceholderProps {
  status?: string;
}

const STATUS_MAP: Record<string, string> = {
  parsing: "Parsing document...",
  structuring: "Detecting structure...",
  classifying: "Extracting sections...",
  awaiting_certification: "Awaiting approval...",
  schema_extraction: "Generating schema...",
  embedding: "Generating embeddings...",
};

function humanStatus(status?: string): string {
  if (!status) return "Processing...";
  const key = status.toLowerCase().replace(/-/g, "_");
  return STATUS_MAP[key] || "Processing...";
}

export default function AnalystLockedPlaceholder({ status }: AnalystLockedPlaceholderProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        minHeight: 320,
        padding: 32,
        textAlign: "center",
      }}
    >
      {/* Breathing sparkle icon */}
      <motion.div
        animate={{ scale: [1, 1.1, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "var(--accent-soft)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 20,
        }}
      >
        <Sparkles size={24} color="var(--accent)" />
      </motion.div>

      {/* Main label */}
      <p
        style={{
          fontSize: 14,
          fontWeight: 500,
          color: "var(--text-primary)",
          margin: "0 0 8px",
          lineHeight: 1.5,
        }}
      >
        The AI analyst will be ready once processing completes.
      </p>

      {/* Live status echo */}
      <motion.p
        key={status}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          fontSize: 12,
          color: "var(--text-muted)",
          margin: 0,
          fontFamily: "'IBM Plex Mono', monospace",
        }}
      >
        {humanStatus(status)}
      </motion.p>
    </div>
  );
}
