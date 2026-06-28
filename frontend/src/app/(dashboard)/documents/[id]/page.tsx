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
import PipelineTab from "../../../../components/pipeline/PipelineTab";
import RequiredFieldsForm from "../../../../components/review/RequiredFieldsForm";
import CoverageExplorer, { CoverageSkeleton } from "../../../../components/coverage/CoverageExplorer";
import DocumentFloatingChat from "../../../../components/DocumentFloatingChat";
import WarrantyTypeBadge from "../../../../components/ui/WarrantyTypeBadge";
import ChatSidebar from "../../../../components/chat/ChatSidebar";
import type { SummaryPayload } from "../../../../lib/types";

/* ─── Lazy imports for new components (graceful fallback if not yet built) ─── */

let AnalystLockedPlaceholder: React.ComponentType<{ status?: string }> | null = null;
let LogsView: React.ComponentType<{ events: any[] }> | null = null;
let MetricsView: React.ComponentType<{ events: any[]; document?: any }> | null = null;
let CostView: React.ComponentType<{ documentId: string }> | null = null;
let ApprovalCard: React.ComponentType<{ docId: string; document: any; masterSchema?: any; onApproved?: () => void }> | null = null;


try { AnalystLockedPlaceholder = require("../../../../components/chat/AnalystLockedPlaceholder").default; } catch {}
try { LogsView = require("../../../../components/observability/LogsView").default; } catch {}
try { MetricsView = require("../../../../components/observability/MetricsView").default; } catch {}
try { CostView = require("../../../../components/observability/CostView").default; } catch {}
try { ApprovalCard = require("../../../../components/review/ApprovalCard").default; } catch {}

export default function DocumentDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { doc, loading, error, refresh } = useDocument(params.id);
  const processingStatus = doc?.processingStatus || "";
  const { events } = usePipelineEvents(params.id, processingStatus);
  const [leftTab, setLeftTab] = useState<"pipeline" | "summary" | "logs" | "metrics" | "cost">("pipeline");
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
    tabs.unshift({ key: "summary", label: "Coverage" });
    tabs.push({ key: "cost", label: "Cost" });
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
        {doc?.warrantyType && <WarrantyTypeBadge warrantyType={doc.warrantyType} />}
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
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
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
                    document={doc}
                    masterSchema={doc.masterSchemaJson}
                    onApproved={refresh}
                  />
                ) : (
                  <RequiredFieldsForm document={doc} onSaved={refresh} />
                )}
              </div>
            )}

            {leftTab === "pipeline" && (
              <div style={{ height: "100%", minHeight: 500 }}>
                <PipelineTab
                  events={events}
                  processingStatus={doc.processingStatus}
                  isAdmin={isAdmin}
                  onCertify={() => setCertifyConfirm(true)}
                  masterSchema={doc.masterSchemaJson}
                  filename={doc.originalFilename}
                  docId={params.id}
                  onViewSummary={() => setLeftTab("summary")}
                  onAskQuestions={() => {}}
                />
              </div>
            )}

            {leftTab === "summary" && chatReady && (
              <div style={{ padding: 24 }}>
                {summaryLoading ? (
                  <CoverageSkeleton />
                ) : summaryPayload ? (
                  <CoverageExplorer summary={summaryPayload} />
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
                    Coverage data is not available
                  </div>
                )}
              </div>
            )}

            {leftTab === "cost" && chatReady && (
              <div style={{ padding: 24 }}>
                {CostView ? (
                  <CostView documentId={params.id} />
                ) : (
                  <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Cost view loading…</div>
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

        {chatReady && <DocumentFloatingChat docId={params.id} filename={doc.originalFilename} document={doc} />}
      </div>
    </div>
  );
}
