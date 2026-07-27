"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle, XCircle, Clock, FileText, AlertCircle, Loader2 } from "lucide-react";
import { getCallLog } from "@/lib/api";
import type { CallLog } from "@/lib/types";

const COLORS = {
  bgPage: "#F1F5F9",
  bgCard: "#FFFFFF",
  border: "#E2E8F0",
  textPrimary: "#0F172A",
  textSecondary: "#64748B",
  accent: "#4F46E5",
  accentSoft: "#EEF2FF",
  done: "#16A34A",
  doneSoft: "#F0FDF4",
  failed: "#DC2626",
  failedSoft: "#FEF2F2",
  warn: "#D97706",
  warnSoft: "#FFFBEB",
};

function StatusBadge({ status }: { status: CallLog["status"] }) {
  if (status === "completed") {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600,
        color: COLORS.done, background: COLORS.doneSoft, padding: "4px 12px", borderRadius: 999 }}>
        <CheckCircle size={12} /> Completed
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600,
        color: COLORS.failed, background: COLORS.failedSoft, padding: "4px 12px", borderRadius: 999 }}>
        <XCircle size={12} /> Failed
      </span>
    );
  }
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600,
      color: COLORS.warn, background: COLORS.warnSoft, padding: "4px 12px", borderRadius: 999 }}>
      <Clock size={12} /> In Progress
    </span>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: COLORS.bgCard, borderRadius: 14, border: `1px solid ${COLORS.border}`,
      padding: "22px 24px", marginBottom: 16 }}>
      <h2 style={{ fontSize: 13, fontWeight: 700, color: COLORS.textSecondary, textTransform: "uppercase",
        letterSpacing: "0.06em", margin: "0 0 14px" }}>{title}</h2>
      {children}
    </div>
  );
}

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
}

export default function CallLogDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [log, setLog] = useState<CallLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const id = params?.id as string;
    if (!id) return;
    getCallLog(id)
      .then((res) => setLog(res.data))
      .catch(() => setError("Could not load this call log."))
      .finally(() => setLoading(false));
  }, [params?.id]);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", paddingTop: 100 }}>
        <Loader2 size={28} color={COLORS.accent} className="animate-spin" />
      </div>
    );
  }

  if (error || !log) {
    return (
      <div style={{ padding: "40px 32px" }}>
        <div style={{ padding: "14px 18px", borderRadius: 12, background: COLORS.failedSoft,
          color: COLORS.failed, fontSize: 13 }}>{error || "Call log not found."}</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100%", background: COLORS.bgPage, padding: "32px 32px" }}>
      {/* Back button */}
      <button type="button" onClick={() => router.back()}
        style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 500,
          color: COLORS.textSecondary, background: "transparent", border: "none", cursor: "pointer",
          padding: "4px 0", marginBottom: 24 }}>
        <ArrowLeft size={15} /> Back to Call Logs
      </button>

      {/* Title row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 24 }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: COLORS.textPrimary, margin: "0 0 6px" }}>
            {log.eventDescription || "Call Log"}
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <StatusBadge status={log.status} />
            <span style={{ fontSize: 12, color: COLORS.textSecondary }}>
              {log.agentName || log.agentKey}
            </span>
            <span style={{ fontSize: 12, color: COLORS.textSecondary }}>•</span>
            <span style={{ fontSize: 12, color: COLORS.textSecondary }}>{formatDate(log.startedAt)}</span>
            {log.endedAt && (
              <>
                <span style={{ fontSize: 12, color: COLORS.textSecondary }}>→</span>
                <span style={{ fontSize: 12, color: COLORS.textSecondary }}>{formatDate(log.endedAt)}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 0 }}>
        {/* Left column */}
        <div>
          {/* Summary */}
          {log.summary && (
            <Section title="Summary">
              <p style={{ fontSize: 14, lineHeight: 1.7, color: COLORS.textPrimary, margin: 0 }}>
                {log.summary}
              </p>
            </Section>
          )}

          {/* Recommendation */}
          {log.recommendation && (
            <Section title="Recommended Next Step">
              <div style={{ display: "flex", gap: 10 }}>
                <AlertCircle size={16} color={COLORS.accent} style={{ flexShrink: 0, marginTop: 2 }} />
                <p style={{ fontSize: 14, lineHeight: 1.6, color: COLORS.textPrimary, margin: 0 }}>
                  {log.recommendation}
                </p>
              </div>
            </Section>
          )}
        </div>

        {/* Right column */}
        <div>
          {/* Documents */}
          {(log.documentsCollected?.length > 0 || log.documentsPending?.length > 0) && (
            <Section title="Documentation Checklist">
              {log.documentsCollected?.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: COLORS.done, margin: "0 0 8px" }}>
                    Collected
                  </p>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                    {log.documentsCollected.map((doc, i) => (
                      <li key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: COLORS.textPrimary }}>
                        <CheckCircle size={13} color={COLORS.done} style={{ flexShrink: 0 }} />
                        {doc}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {log.documentsPending?.length > 0 && (
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: COLORS.warn, margin: "0 0 8px" }}>
                    Still Needed
                  </p>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                    {log.documentsPending.map((doc, i) => (
                      <li key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: COLORS.textPrimary }}>
                        <Clock size={13} color={COLORS.warn} style={{ flexShrink: 0 }} />
                        {doc}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Section>
          )}

          {/* Metadata */}
          <Section title="Call Details">
            <dl style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 0", margin: 0 }}>
              {[
                ["Agent", log.agentName || log.agentKey],
                ["Started", formatDate(log.startedAt)],
                ["Ended", formatDate(log.endedAt)],
                ["End Reason", log.endedReason || "—"],
              ].map(([label, value]) => (
                <div key={label} style={{ gridColumn: "span 2", display: "flex", gap: 8, alignItems: "baseline" }}>
                  <dt style={{ fontSize: 12, color: COLORS.textSecondary, minWidth: 90 }}>{label}</dt>
                  <dd style={{ fontSize: 13, color: COLORS.textPrimary, margin: 0 }}>{value}</dd>
                </div>
              ))}
            </dl>
          </Section>
        </div>
      </div>

      {/* Full transcript */}
      {log.transcript && (
        <div style={{ background: COLORS.bgCard, borderRadius: 14, border: `1px solid ${COLORS.border}`,
          padding: "22px 24px", marginTop: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <FileText size={15} color={COLORS.textSecondary} />
            <h2 style={{ fontSize: 13, fontWeight: 700, color: COLORS.textSecondary, textTransform: "uppercase",
              letterSpacing: "0.06em", margin: 0 }}>Full Transcript</h2>
          </div>
          <pre style={{ fontSize: 13, lineHeight: 1.8, color: COLORS.textPrimary, fontFamily: "inherit",
            whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0, maxHeight: 480,
            overflowY: "auto" }}>
            {log.transcript}
          </pre>
        </div>
      )}
    </div>
  );
}
