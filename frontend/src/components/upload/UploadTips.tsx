"use client";

import { Check } from "lucide-react";

const tips = [
  "PDF format only",
  "Up to 100MB file size",
  "Clear scans work best",
  "Multi-page documents supported",
  "AI will extract all key information",
];

export default function UploadTips() {
  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--r-md)",
        padding: 24,
      }}
    >
      <h3
        style={{
          fontSize: 15,
          fontWeight: 600,
          color: "var(--text-primary)",
          margin: "0 0 16px",
        }}
      >
        Upload Tips
      </h3>

      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
        {tips.map((tip) => (
          <li
            key={tip}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 13,
              color: "var(--text-secondary)",
              lineHeight: 1.5,
            }}
          >
            <span
              style={{
                width: 20,
                height: 20,
                borderRadius: "var(--r-sm)",
                background: "var(--accent-soft)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Check size={12} color="var(--accent)" strokeWidth={2.5} />
            </span>
            {tip}
          </li>
        ))}
      </ul>
    </div>
  );
}
