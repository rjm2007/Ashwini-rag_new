"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  FileText,
  Shield,
  ShieldCheck,
  XCircle,
  Loader2,
} from "lucide-react";
import { getUser } from "../../../../lib/auth";
import { certifyDocument, getDocumentSummary } from "../../../../lib/api";
import { useDocument } from "../../../../hooks/useDocument";
import { usePipelineEvents } from "../../../../hooks/usePipelineEvents";
import StatusPill from "../../../../components/ui/StatusPill";
import TypePill from "../../../../components/ui/TypePill";
import PipelineView from "../../../../components/pipeline/PipelineView";
import RequiredFieldsForm from "../../../../components/review/RequiredFieldsForm";
import SummaryView, { SummarySkeleton } from "../../../../components/summary/SummaryView";
import ChatSidebar from "../../../../components/chat/ChatSidebar";
import type { MasterSchema, SummaryPayload } from "../../../../lib/types";

/* ─── Lazy imports for new components (graceful fallback if not yet built) ─── */
let AiAnalystPanel: React.ComponentType<{ docId: string; filename: string }> | null = null;
let AnalystLockedPlaceholder: React.ComponentType<{ status?: string }> | null = null;
let LogsView: React.ComponentType<{ events: any[] }> | null = null;
let MetricsView: React.ComponentType<{ events: any[]; document?: any }> | null = null;
let ApprovalCard: React.ComponentType<{ docId: string; masterSchema?: any; onApproved?: () => void }> | null = null;

try { AiAnalystPanel = require("../../../../components/chat/AiAnalystPanel").default; } catch {}
try { AnalystLockedPlaceholder = require("../../../../components/chat/AnalystLockedPlaceholder").default; } catch {}
try { LogsView = require("../../../../components/observability/LogsView").default; } catch {}
try { MetricsView = require("../../../../components/observability/MetricsView").default; } catch {}
try { ApprovalCard = require("../../../../components/review/ApprovalCard").default; } catch {}

export default function DocumentDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { doc, loading, error, refresh } = useDocument(params.id);
  const processingStatus = doc?.processingStatus || "";
  const { events } = usePipelineEvents(params.id, processingStatus);
  const [leftTab, setLeftTab] = useState<"pipeline" | "summary" | "logs" | "metrics">("pipeline");
  const [summaryPayload, setSummaryPayload] = useState<SummaryPayload | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [certifyConfirm, setCertifyConfirm] = useState(false);
  const [certifyError, setCertifyError] = useState("");
  const [certifying, setCertifying] = useState(false);
  const isAdmin = getUser()?.role === "admin";
  const certified = doc?.currentRepository === "certified";

  /* ─── Lifecycle contract (§4) ─── */
  const chatReady = processingStatus === "processing_complete";
  const isProcessing = [
    "uploaded", "parsing", "structuring", "classifying",
    "schema_extraction", "embedding",
  ].includes(processingStatus);
  const isAwaitingCert = processingStatus === "awaiting_certification";

  /* ─── Switch to summary tab when processing completes ─── */
  useEffect(() => {
    if (processingStatus === "processing_complete") {
      setLeftTab("summary");
    }
  }, [processingStatus]);

  /* ─── Load summary data when complete ─── */
  useEffect(() => {
    if (processingStatus !== "processing_complete") {
      setSummaryPayload(null);
      return;
    }
    setSummaryLoading(true);
    getDocumentSummary(params.id)
      .then((r) => setSummaryPayload(r.data))
      .catch(() => setSummaryPayload(null))
      .finally(() => setSummaryLoading(false));
  }, [params.id, processingStatus]);

  const onCertify = async () => {
    setCertifying(true);
    setCertifyError("");
    try {
      await certifyDocument(params.id);
      setCertifyConfirm(false);
      await refresh();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Certification failed";
      setCertifyError(String(msg));
    } finally {
      setCertifying(false);
    }
  };

  if (loading && !doc) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          color: "var(--text-muted)",
        }}
      >
        <Loader2 size={24} className="animate-spin" style={{ marginRight: 8 }} />
        Loading document…
      </div>
    );
  }

  if (error && !doc) {
    return (
      <div style={{ padding: 40, color: "var(--state-failed)" }}>{error}</div>
    );
  }

  if (!doc) return null;

  const tabs: { key: typeof leftTab; label: string }[] = [
    { key: "pipeline", label: "Pipeline" },
    { key: "logs", label: "Logs" },
    { key: "metrics", label: "Metrics" },
  ];

  // Add summary tab when processing is complete
  if (chatReady) {
    tabs.unshift({ key: "summary", label: "Summary" });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 56px)" }}>
      {/* ═══ Document Header ═══ */}
      <header
        style={{
          height: 60,
          background: "var(--bg-surface)",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          padding: "0 24px",
          gap: 12,
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={() => router.push("/documents")}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-muted)",
            padding: 4,
            borderRadius: 6,
            display: "flex",
            alignItems: "center",
          }}
        >
          <ChevronLeft size={20} />
        </button>

        <FileText size={20} style={{ color: "var(--accent)", flexShrink: 0 }} />

        <span
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: "var(--text-primary)",
            maxWidth: "40%",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            letterSpacing: "-0.01em",
          }}
        >
          {doc.originalFilename}
        </span>

        {doc.documentType ? <TypePill type={doc.documentType} /> : null}
        <StatusPill status={doc.processingStatus} />

        <div style={{ flex: 1 }} />

        {/* Header right actions */}
        {isProcessing && (
          <button
            type="button"
            style={{
              fontSize: 12,
              color: "var(--state-failed)",
              border: "1px solid var(--state-failed)",
              background: "var(--error-bg)",
              borderRadius: "var(--r-sm)",
              padding: "6px 14px",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            <XCircle size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />
            Cancel Processing
          </button>
        )}

        {isAwaitingCert && isAdmin && !certifyConfirm && (
          <button
            type="button"
            onClick={() => setCertifyConfirm(true)}
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-inverse)",
              background: "var(--accent)",
              border: "none",
              borderRadius: "var(--r-sm)",
              padding: "8px 20px",
              cursor: "pointer",
              boxShadow: "var(--shadow-accent)",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Shield size={16} />
            Approve Document
          </button>
        )}

        {chatReady && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              fontWeight: 500,
              color: "var(--state-done)",
              background: "var(--success-bg)",
              borderRadius: "var(--r-pill)",
              padding: "5px 14px",
            }}
          >
            <ShieldCheck size={14} />
            Certified
          </div>
        )}
      </header>

      {/* ═══ Certify confirmation bar ═══ */}
      {certifyConfirm && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 24px",
            background: "var(--accent-soft)",
            borderBottom: "1px solid var(--border-accent)",
            fontSize: 13,
            color: "var(--text-secondary)",
          }}
        >
          <Shield size={16} style={{ color: "var(--accent)" }} />
          <span>This will certify the document and run AI extraction + embedding. Proceed?</span>
          <button
            type="button"
            disabled={certifying}
            onClick={onCertify}
            style={{
              padding: "6px 16px",
              background: "var(--accent)",
              color: "var(--text-inverse)",
              border: "none",
              borderRadius: "var(--r-sm)",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            {certifying ? "Certifying…" : "Yes, certify"}
          </button>
          <button
            type="button"
            onClick={() => setCertifyConfirm(false)}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {certifyError && (
        <div
          style={{
            margin: 0,
            padding: "10px 24px",
            color: "var(--state-failed)",
            fontSize: 13,
            background: "var(--error-bg)",
            borderBottom: "1px solid var(--state-failed)",
          }}
        >
          {certifyError}
        </div>
      )}

      {/* ═══ Body: left workspace + right analyst ═══ */}
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {/* ─── Left column (workspace) ─── */}
        <div
          style={{
            width: chatReady ? "60%" : "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            borderRight: chatReady ? "1px solid var(--border)" : "none",
            minWidth: 0,
            transition: "width 300ms ease",
          }}
        >
          {/* Tab bar */}
          <div
            style={{
              display: "flex",
              gap: 0,
              padding: "0 24px",
              borderBottom: "1px solid var(--border)",
              flexShrink: 0,
              background: "var(--bg-surface)",
            }}
          >
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setLeftTab(tab.key)}
                style={{
                  padding: "14px 16px",
                  background: "none",
                  border: "none",
                  borderBottom:
                    leftTab === tab.key
                      ? "2px solid var(--accent)"
                      : "2px solid transparent",
                  color:
                    leftTab === tab.key
                      ? "var(--text-primary)"
                      : "var(--text-muted)",
                  fontSize: 13,
                  fontWeight: leftTab === tab.key ? 600 : 400,
                  cursor: "pointer",
                  transition: "all 150ms ease",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ flex: 1, overflowY: "auto", background: "var(--bg-page)" }}>
            {/* Required fields form at awaiting_certification */}
            {isAwaitingCert && (
              <div style={{ padding: 24 }}>
                {ApprovalCard ? (
                  <ApprovalCard
                    docId={params.id}
                    masterSchema={summaryPayload?.masterSchema}
                    onApproved={refresh}
                  />
                ) : (
                  <RequiredFieldsForm document={doc} onSaved={refresh} />
                )}
              </div>
            )}

            {leftTab === "pipeline" && (
              <PipelineView
                events={events}
                processingStatus={doc.processingStatus}
                isAdmin={isAdmin}
                onCertify={() => setCertifyConfirm(true)}
              />
            )}

            {leftTab === "summary" && chatReady && (
              <div style={{ padding: 24 }}>
                {summaryLoading ? (
                  <SummarySkeleton />
                ) : summaryPayload?.masterSchema ? (
                  <SummaryView
                    summary={summaryPayload.masterSchema as MasterSchema}
                    fallbackTitle={doc.originalFilename}
                    aiSummaryText={summaryPayload.aiSummaryText}
                  />
                ) : (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      height: 200,
                      color: "var(--text-muted)",
                      fontSize: 13,
                    }}
                  >
                    Summary data is not available
                  </div>
                )}
              </div>
            )}

            {leftTab === "logs" && (
              <div style={{ padding: 24 }}>
                {LogsView ? (
                  <LogsView events={events} />
                ) : (
                  <div style={{ color: "var(--text-muted)", fontSize: 13, padding: 20 }}>
                    Logs view loading…
                  </div>
                )}
              </div>
            )}

            {leftTab === "metrics" && (
              <div style={{ padding: 24 }}>
                {MetricsView ? (
                  <MetricsView events={events} document={doc} />
                ) : (
                  <div style={{ color: "var(--text-muted)", fontSize: 13, padding: 20 }}>
                    Metrics view loading…
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ─── Right column: AI Analyst or Locked Placeholder ─── */}
        {chatReady ? (
          AiAnalystPanel ? (
            <AiAnalystPanel docId={params.id} filename={doc.originalFilename} />
          ) : (
            <ChatSidebar
              docId={params.id}
              filename={doc.originalFilename}
              certified={certified}
            />
          )
        ) : (
          <div
            style={{
              width: "40%",
              height: "100%",
              background: "var(--bg-surface)",
              borderLeft: "1px solid var(--border)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {AnalystLockedPlaceholder ? (
              <AnalystLockedPlaceholder status={processingStatus} />
            ) : (
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 32,
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    background: "var(--accent-soft)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 16,
                  }}
                >
                  <Shield size={28} style={{ color: "var(--accent)" }} className="animate-breathe" />
                </div>
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: "var(--text-primary)",
                    marginBottom: 6,
                  }}
                >
                  AI Analyst will be ready soon
                </p>
                <p style={{ fontSize: 13, color: "var(--text-muted)", maxWidth: 260 }}>
                  The analyst activates once document processing completes.
                </p>
                <div
                  style={{
                    marginTop: 16,
                    fontSize: 12,
                    color: "var(--accent)",
                    background: "var(--accent-soft)",
                    padding: "4px 12px",
                    borderRadius: "var(--r-pill)",
                  }}
                >
                  {processingStatus === "awaiting_certification"
                    ? "Awaiting approval…"
                    : processingStatus === "embedding"
                    ? "Generating embeddings…"
                    : processingStatus === "schema_extraction"
                    ? "Extracting schema…"
                    : "Processing…"}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
