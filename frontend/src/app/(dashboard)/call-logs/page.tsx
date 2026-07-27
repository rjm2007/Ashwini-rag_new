"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Phone, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { listCallLogs } from "@/lib/api";
import type { CallLog } from "@/lib/types";
import BandHeader from "@/components/layout/BandHeader";

const COLORS = {
  bgPage: "var(--bg-raised)",
  bgCard: "var(--bg-surface)",
  border: "var(--border)",
  textPrimary: "var(--text-primary)",
  textSecondary: "var(--text-secondary)",
  accent: "var(--accent-hover)",
  accentSoft: "var(--accent-soft)",
  done: "var(--state-done)",
  doneSoft: "var(--success-bg)",
  failed: "var(--state-failed)",
  failedSoft: "var(--error-bg)",
  warn: "var(--warning)",
  warnSoft: "var(--warning-bg)",
};

function StatusBadge({ status }: { status: CallLog["status"] }) {
  if (status === "completed") {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600,
        color: COLORS.done, background: COLORS.doneSoft, padding: "3px 10px", borderRadius: 999 }}>
        <CheckCircle size={11} /> Completed
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600,
        color: COLORS.failed, background: COLORS.failedSoft, padding: "3px 10px", borderRadius: 999 }}>
        <XCircle size={11} /> Failed
      </span>
    );
  }
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600,
      color: COLORS.warn, background: COLORS.warnSoft, padding: "3px 10px", borderRadius: 999 }}>
      <Clock size={11} /> In Progress
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
}

export default function CallLogsPage() {
  const [logs, setLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    listCallLogs()
      .then((res) => setLogs(res.data))
      .catch(() => setError("Could not load call logs."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ minHeight: "100%", background: COLORS.bgPage }}>
      <BandHeader
        title="Call logs"
        subtitle="Transcripts and AI summaries from every voice call."
        stats={[
          { label: "Calls", value: logs.length },
          { label: "Completed", value: logs.filter((l) => l.status === "completed").length },
          { label: "Incomplete", value: logs.filter((l) => l.documentsPending?.length > 0).length },
        ]}
      />
      <div style={{ padding: "24px 32px 40px" }}>

      {/* States */}
      {loading && (
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
          <Loader2 size={28} color={COLORS.accent} className="animate-spin" />
        </div>
      )}

      {error && (
        <div style={{ padding: "14px 18px", borderRadius: 12, background: COLORS.failedSoft,
          color: COLORS.failed, fontSize: 13 }}>{error}</div>
      )}

      {!loading && !error && logs.length === 0 && (
        <div style={{ textAlign: "center", paddingTop: 80, color: COLORS.textSecondary }}>
          <Phone size={40} style={{ opacity: 0.2, marginBottom: 16 }} />
          <p style={{ fontSize: 15, fontWeight: 500 }}>No call logs yet.</p>
          <p style={{ fontSize: 13 }}>Calls you make from the Call page will appear here.</p>
        </div>
      )}

      {!loading && !error && logs.length > 0 && (
        <div style={{ background: COLORS.bgCard, borderRadius: 16, border: `1px solid ${COLORS.border}`,
          boxShadow: "0 1px 2px rgba(13,16,23,0.04)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--bg-raised)", borderBottom: `1px solid ${COLORS.border}` }}>
                {["Event", "Agent", "Status", "Date", ""].map((h) => (
                  <th key={h} style={{ padding: "12px 18px", textAlign: "left", fontSize: 11,
                    fontWeight: 600, color: COLORS.textSecondary, letterSpacing: "0.04em",
                    textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <tr key={log.id}
                  style={{ borderBottom: i < logs.length - 1 ? `1px solid ${COLORS.border}` : "none" }}>
                  <td style={{ padding: "14px 18px", maxWidth: 320 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: COLORS.textPrimary, margin: 0,
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {log.eventDescription || "Call logged"}
                    </p>
                    {log.summary && (
                      <p style={{ fontSize: 12, color: COLORS.textSecondary, margin: "3px 0 0",
                        overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical" as any }}>
                        {log.summary}
                      </p>
                    )}
                  </td>
                  <td style={{ padding: "14px 18px", fontSize: 13, color: COLORS.textSecondary,
                    whiteSpace: "nowrap" }}>
                    {log.agentName || log.agentKey}
                  </td>
                  <td style={{ padding: "14px 18px" }}>
                    <StatusBadge status={log.status} />
                  </td>
                  <td style={{ padding: "14px 18px", fontSize: 12, color: COLORS.textSecondary,
                    whiteSpace: "nowrap" }}>
                    {formatDate(log.startedAt)}
                  </td>
                  <td style={{ padding: "14px 18px" }}>
                    <Link href={`/call-logs/${log.id}`}
                      style={{ fontSize: 12, fontWeight: 600, color: COLORS.accent,
                        textDecoration: "none", padding: "6px 14px", borderRadius: 8,
                        background: COLORS.accentSoft, whiteSpace: "nowrap" }}>
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </div>
    </div>
  );
}
