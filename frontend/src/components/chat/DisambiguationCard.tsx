"use client";

interface Candidate {
  coverage_id: string;
  label: string;
}

export default function DisambiguationCard({
  prompt,
  candidates,
  onSelect,
}: {
  prompt: string;
  candidates: Candidate[];
  onSelect: (coverageId: string) => void;
}) {
  return (
    <div className="card" style={{ padding: 14, marginTop: 8 }}>
      <p style={{ fontSize: 13, margin: "0 0 10px", color: "var(--text-primary)" }}>{prompt}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {candidates.map((c) => (
          <button
            key={c.coverage_id}
            type="button"
            onClick={() => onSelect(c.coverage_id)}
            style={{
              textAlign: "left",
              padding: "10px 12px",
              borderRadius: "var(--r-sm)",
              border: "1px solid var(--border)",
              background: "var(--bg-raised)",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}
