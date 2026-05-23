const STATUS_CONFIG: Record<
  string,
  { dot: string; bg: string; text: string; label: string; pulse: boolean }
> = {
  uploaded: { dot: "#2563EB", bg: "#EFF6FF", text: "#1D4ED8", label: "UPLOADED", pulse: false },
  ocr_in_progress: { dot: "#7C3AED", bg: "#F5F3FF", text: "#6D28D9", label: "OCR RUNNING", pulse: true },
  ocr_complete: { dot: "#7C3AED", bg: "#F5F3FF", text: "#6D28D9", label: "OCR DONE", pulse: false },
  extraction_in_progress: { dot: "#7C3AED", bg: "#F5F3FF", text: "#6D28D9", label: "EXTRACTING", pulse: true },
  extraction_complete: { dot: "#D97706", bg: "#FFFBEB", text: "#B45309", label: "EXTRACTED", pulse: false },
  embedded: { dot: "#D97706", bg: "#FFFBEB", text: "#B45309", label: "EMBEDDED", pulse: false },
  ready_for_review: { dot: "#D97706", bg: "#FFFBEB", text: "#B45309", label: "READY", pulse: false },
  certified: { dot: "#16A34A", bg: "#F0FDF4", text: "#15803D", label: "CERTIFIED", pulse: false },
  rejected: { dot: "#DC2626", bg: "#FEF2F2", text: "#B91C1C", label: "REJECTED", pulse: false },
  failed: { dot: "#DC2626", bg: "#FEF2F2", text: "#B91C1C", label: "FAILED", pulse: false },
  pending_review: { dot: "#D97706", bg: "#FFFBEB", text: "#B45309", label: "PENDING", pulse: false },
  reviewer_approved: { dot: "#FF6200", bg: "#FFF0E6", text: "#C24A00", label: "REVIEWER ✓", pulse: false }
};

const DEFAULT_CONFIG = {
  dot: "#7A92A8",
  bg: "#F0F4F8",
  text: "#3D5A80",
  label: "UNKNOWN",
  pulse: false
};

export default function DocumentStatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status?.toLowerCase()] || DEFAULT_CONFIG;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        backgroundColor: cfg.bg,
        color: cfg.text,
        fontSize: 11,
        fontWeight: 600,
        fontFamily: "DM Mono, monospace",
        letterSpacing: "0.06em",
        padding: "3px 8px",
        borderRadius: 99
      }}
    >
      <span
        className={cfg.pulse ? "pulse" : ""}
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          backgroundColor: cfg.dot,
          flexShrink: 0
        }}
      />
      {cfg.label}
    </span>
  );
}
