"use client";

const steps = [
  { num: 1, label: "Upload your document" },
  { num: 2, label: "AI processes and extracts" },
  { num: 3, label: "Review and approve" },
  { num: 4, label: "Ask questions" },
];

export default function HowItWorks() {
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
        How it works
      </h3>

      <ol
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {steps.map((step) => (
          <li
            key={step.num}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "var(--accent-soft)",
                color: "var(--accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: 700,
                flexShrink: 0,
                fontFamily: "'IBM Plex Mono', monospace",
              }}
            >
              {step.num}
            </span>
            <span
              style={{
                fontSize: 13,
                color: "var(--text-secondary)",
                lineHeight: 1.5,
              }}
            >
              {step.label}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
