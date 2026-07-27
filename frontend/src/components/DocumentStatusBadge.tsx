/**
 * Processing status for a document.
 *
 * Previously this carried a light-theme palette hardcoded as hex, set
 * `fontFamily: "DM Mono"` — a face this app never loads — and applied a
 * `.pulse` class that was never defined. All three are fixed here by going
 * through the token set.
 */

type Tone = "info" | "running" | "warn" | "ok" | "bad" | "accent" | "neutral";

const TONE: Record<Tone, { fg: string; bg: string }> = {
  info:    { fg: "var(--info)",         bg: "var(--info-bg)" },
  running: { fg: "var(--state-running)", bg: "var(--accent-soft)" },
  warn:    { fg: "var(--warning)",      bg: "var(--warning-bg)" },
  ok:      { fg: "var(--state-done)",   bg: "var(--success-bg)" },
  bad:     { fg: "var(--state-failed)", bg: "var(--error-bg)" },
  accent:  { fg: "var(--accent)",       bg: "var(--accent-soft)" },
  neutral: { fg: "var(--text-muted)",   bg: "var(--neu-bg)" },
};

const STATUS_CONFIG: Record<string, { tone: Tone; label: string; pulse: boolean }> = {
  uploaded:                { tone: "info",    label: "UPLOADED",   pulse: false },
  ocr_in_progress:         { tone: "running", label: "OCR RUNNING", pulse: true },
  ocr_complete:            { tone: "info",    label: "OCR DONE",   pulse: false },
  extraction_in_progress:  { tone: "running", label: "EXTRACTING", pulse: true },
  extraction_complete:     { tone: "warn",    label: "EXTRACTED",  pulse: false },
  embedded:                { tone: "warn",    label: "EMBEDDED",   pulse: false },
  ready_for_review:        { tone: "warn",    label: "READY",      pulse: false },
  certified:               { tone: "ok",      label: "CERTIFIED",  pulse: false },
  rejected:                { tone: "bad",     label: "REJECTED",   pulse: false },
  failed:                  { tone: "bad",     label: "FAILED",     pulse: false },
  pending_review:          { tone: "warn",    label: "PENDING",    pulse: false },
  reviewer_approved:       { tone: "accent",  label: "REVIEWER ✓", pulse: false },
};

const DEFAULT_CONFIG = { tone: "neutral" as Tone, label: "UNKNOWN", pulse: false };

export default function DocumentStatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status?.toLowerCase()] || DEFAULT_CONFIG;
  const tone = TONE[cfg.tone];

  return (
    <span
      className="mono"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        backgroundColor: tone.bg,
        color: tone.fg,
        fontSize: 10.5,
        fontWeight: 600,
        letterSpacing: "0.06em",
        padding: "3px 8px",
        borderRadius: "var(--r-pill)",
        whiteSpace: "nowrap",
      }}
    >
      <span
        className={cfg.pulse ? "animate-breathe" : undefined}
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          backgroundColor: "currentColor",
          flexShrink: 0,
        }}
      />
      {cfg.label}
    </span>
  );
}
