"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getDefect } from "@/lib/api";
import type { Defect } from "@/lib/types";
import DefectThread from "@/components/defect/DefectThread";

// This page lives inside the (dashboard) route group, so the shared Sidebar
// and Topbar come from that layout. It must not render its own Topbar, and it
// sizes itself against the viewport minus the 56px Topbar the layout supplies.
const CONTENT_HEIGHT = "calc(100vh - 56px)";

const COLORS = {
  bgPage: "var(--bg-raised)",
  bgPanel: "var(--bg-surface)",
  border: "var(--border)",
  textPrimary: "var(--text-primary)",
  textSecondary: "var(--text-muted)",
  done: "var(--state-done)",
  gate: "var(--warning)",
  failed: "var(--state-failed)",
  muted: "var(--text-muted)",
};

function decisionBadge(d?: string) {
  switch ((d || "").toUpperCase()) {
    case "COVERED":
      return { label: "Covered", color: COLORS.done };
    case "POSSIBLY_COVERED":
      return { label: "Possibly Covered", color: COLORS.gate };
    case "NOT_COVERED":
      return { label: "Not Covered", color: COLORS.failed };
    case "INFORMATION_ONLY":
      return { label: "More Info Needed", color: COLORS.muted };
    default:
      return { label: "Pending", color: COLORS.muted };
  }
}

export default function DefectThreadPage() {
  const params = useParams<{ id: string }>();
  const [defect, setDefect] = useState<Defect | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const res = await getDefect(params.id);
      setDefect(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: CONTENT_HEIGHT, background: COLORS.bgPage }}>
        <div style={{ padding: 24, color: COLORS.textSecondary, fontSize: 13 }}>Loading...</div>
      </div>
    );
  }
  if (!defect) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: CONTENT_HEIGHT, background: COLORS.bgPage }}>
        <div style={{ padding: 24, color: COLORS.failed, fontSize: 13 }}>Defect not found.</div>
      </div>
    );
  }

  const badge = decisionBadge(defect.primaryDecision);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: CONTENT_HEIGHT, background: COLORS.bgPage }}>
      <div style={{ padding: "16px 24px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", gap: 16 }}>
        <Link href="/defects" style={{ color: COLORS.textSecondary, textDecoration: "none", display: "flex", alignItems: "center", gap: 4, fontSize: 14 }}>
          <ArrowLeft size={16} /> Back to Defects
        </Link>
        <div style={{ display: "flex", gap: 16, color: COLORS.textSecondary, fontSize: 14, borderLeft: `1px solid ${COLORS.border}`, paddingLeft: 16 }}>
          <span style={{ color: COLORS.textPrimary, fontWeight: 600 }}>
            {[defect.make, defect.model, defect.year].filter(Boolean).join(" ") || "Unknown vehicle"}
          </span>
          <span>{defect.reportedDefect}</span>
        </div>
        <span
          style={{
            marginLeft: "auto", fontSize: 12, fontWeight: 700, color: badge.color,
            padding: "4px 12px", borderRadius: 999, background: `${badge.color}1A`,
          }}
        >
          {badge.label}
        </span>
      </div>

      {/* The thread is the page. A decision rail sits beside it so the verdict,
          matched component and asset facts stay visible while you read. */}
      {/* gridTemplateRows is load-bearing. Without it the implicit row is `auto`
          and grows to fit the whole conversation, so the pane never becomes the
          scroller and the composer is pushed below the fold with no way to
          reach it. minmax(0,1fr) caps the row at the container height. */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "grid",
          gridTemplateColumns: "1fr 330px",
          gridTemplateRows: "minmax(0, 1fr)",
        }}
      >
        <div
          style={{
            minWidth: 0,
            minHeight: 0,
            overflow: "hidden",
            borderRight: `1px solid ${COLORS.border}`,
          }}
        >
          <DefectThread defect={defect} onMessageSent={() => refresh()} />
        </div>

        <aside style={{ minHeight: 0, overflowY: "auto", background: COLORS.bgPanel }}>
          <RailSection title="Decision">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: badge.color,
                  padding: "4px 12px",
                  borderRadius: 999,
                  background: `${badge.color}1A`,
                }}
              >
                {badge.label}
              </span>
              {typeof defect.overallConfidenceScore === "number" && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
                  <div
                    style={{
                      width: 56,
                      height: 5,
                      borderRadius: 999,
                      background: "var(--bg-sunk)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.round(defect.overallConfidenceScore * 100)}%`,
                        height: "100%",
                        background:
                          defect.overallConfidenceScore >= 0.85
                            ? "var(--conf-high)"
                            : defect.overallConfidenceScore >= 0.7
                            ? "var(--conf-medium)"
                            : "var(--conf-low)",
                      }}
                    />
                  </div>
                  <span className="mono" style={{ fontSize: 11, color: COLORS.textSecondary }}>
                    {defect.overallConfidenceScore.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
            {defect.overallConfidenceScore != null && defect.overallConfidenceScore < 0.7 && (
              <p
                style={{
                  margin: 0,
                  padding: "9px 11px",
                  borderRadius: 8,
                  background: "var(--warning-bg)",
                  color: "var(--warning)",
                  fontSize: 12,
                  lineHeight: 1.55,
                }}
              >
                Below the 0.70 threshold — this was not decided automatically and needs a human to confirm.
              </p>
            )}
          </RailSection>

          <RailSection title="Matched component">
            <Field label="Component" value={defect.primaryComponent} />
            <Field label="Coverage ID" value={defect.primaryCoverageId} mono />
            <Field label="Warranty type" value={defect.warrantyType} />
          </RailSection>

          <RailSection title="Asset">
            <Field
              label="Vehicle"
              value={[defect.make, defect.model, defect.year].filter(Boolean).join(" ") || undefined}
            />
            <Field label="In service" value={defect.purchaseDate} mono />
            <Field
              label="Mileage"
              value={defect.currentMileage != null ? defect.currentMileage.toLocaleString() : undefined}
              mono
            />
            <Field label="Reported" value={defect.createdAt ? new Date(defect.createdAt).toLocaleDateString() : undefined} mono />
          </RailSection>
        </aside>
      </div>
    </div>
  );
}

function RailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ padding: "16px 18px", borderBottom: "1px solid var(--border)" }}>
      <h3
        style={{
          margin: "0 0 12px",
          fontSize: 9.5,
          letterSpacing: "0.13em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
          fontWeight: 600,
        }}
      >
        {title}
      </h3>
      {children}
    </section>
  );
}

function Field({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  const missing = value == null || value === "";
  return (
    <div style={{ display: "flex", gap: 12, padding: "7px 0", fontSize: 12.5, alignItems: "baseline" }}>
      <span style={{ width: 96, flexShrink: 0, color: "var(--text-muted)", fontSize: 11.5 }}>{label}</span>
      <span
        className={mono && !missing ? "mono" : undefined}
        style={{
          color: missing ? "var(--text-muted)" : "var(--text-primary)",
          fontStyle: missing ? "italic" : "normal",
          fontWeight: missing ? 400 : 600,
          fontSize: mono && !missing ? 12 : 12.5,
          wordBreak: "break-word",
        }}
      >
        {missing ? "not recorded" : value}
      </span>
    </div>
  );
}
