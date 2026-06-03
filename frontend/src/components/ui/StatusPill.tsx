function getStatusStyle(status: string): { border: string; color: string } {
  const s = (status || "unknown").toLowerCase();
  const accent = ["processing", "parsing", "structuring", "classifying", "schema_extraction", "embedding", "ocr_in_progress", "extraction_in_progress"];
  const amber = ["awaiting_certification", "ready_for_review", "reviewer_approved"];
  const green = ["certified", "processing_complete", "embedded", "extraction_complete", "ocr_complete"];
  const red = ["failed", "rejected"];

  if (accent.some((k) => s.includes(k))) return { border: "var(--accent)", color: "var(--accent)" };
  if (amber.some((k) => s.includes(k))) return { border: "#ECC94B", color: "#ECC94B" };
  if (green.some((k) => s.includes(k))) return { border: "#48BB78", color: "#48BB78" };
  if (red.some((k) => s.includes(k))) return { border: "#FC8181", color: "#FC8181" };
  return { border: "var(--text-muted)", color: "var(--text-muted)" };
}

function formatLabel(status: string): string {
  return (status || "unknown").replace(/_/g, " ");
}

export default function StatusPill({ status }: { status: string }) {
  const style = getStatusStyle(status);
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 500,
        padding: "2px 8px",
        borderRadius: 99,
        border: `1px solid ${style.border}`,
        color: style.color,
        background: "transparent",
        textTransform: "capitalize",
        whiteSpace: "nowrap"
      }}
    >
      {formatLabel(status)}
    </span>
  );
}
