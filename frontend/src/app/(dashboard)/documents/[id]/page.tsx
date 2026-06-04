"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ChevronLeft, FileText } from "lucide-react";
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

export default function DocumentDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { doc, loading, error, refresh } = useDocument(params.id);
  const processingStatus = doc?.processingStatus || "";
  const { events } = usePipelineEvents(params.id, processingStatus);
  const [leftTab, setLeftTab] = useState<"pipeline" | "summary">("pipeline");
  const [summaryPayload, setSummaryPayload] = useState<SummaryPayload | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [certifyConfirm, setCertifyConfirm] = useState(false);
  const [certifyError, setCertifyError] = useState("");
  const [certifying, setCertifying] = useState(false);
  const isAdmin = getUser()?.role === "admin";
  const certified = doc?.currentRepository === "certified";
  const showTabs = processingStatus === "processing_complete";

  useEffect(() => {
    if (processingStatus === "processing_complete") {
      setLeftTab("summary");
    }
  }, [processingStatus]);

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
      <div style={{ padding: 40, color: "var(--text-muted)" }}>Loading document…</div>
    );
  }

  if (error && !doc) {
    return (
      <div style={{ padding: 40, color: "var(--state-failed)" }}>{error}</div>
    );
  }

  if (!doc) return null;

  const bodyHeight = "calc(100vh - 48px - 56px)";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 48px)" }}>
      <header
        style={{
          height: 56,
          background: "var(--bg-surface)",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          padding: "0 20px",
          gap: 12,
          flexShrink: 0
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
            padding: 4
          }}
        >
          <ChevronLeft size={20} />
        </button>
        <FileText size={18} style={{ color: "var(--text-muted)" }} />
        <span
          style={{
            fontSize: 16,
            fontWeight: 500,
            color: "var(--text-primary)",
            maxWidth: "40%",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap"
          }}
        >
          {doc.originalFilename}
        </span>
        {doc.documentType ? <TypePill type={doc.documentType} /> : null}
        <StatusPill status={doc.processingStatus} />
        <div style={{ flex: 1 }} />
        {doc.processingStatus === "awaiting_certification" && (doc.requiredFieldsMissing ?? true) ? (
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              fontWeight: 500,
              color: "var(--state-failed)",
              background: "var(--warn-bg)",
              border: "1px solid var(--warn-border)",
              borderRadius: 99,
              padding: "2px 10px"
            }}
          >
            <AlertTriangle size={12} />
            Fields required
          </span>
        ) : null}
        {isAdmin && doc.processingStatus === "awaiting_certification" && !certifyConfirm ? (
          <button
            type="button"
            onClick={() => setCertifyConfirm(true)}
            style={{
              fontSize: 13,
              color: "var(--accent)",
              border: "1px solid var(--accent)",
              background: "transparent",
              borderRadius: 8,
              padding: "6px 14px",
              cursor: "pointer"
            }}
          >
            Certify document →
          </button>
        ) : null}
      </header>

      {certifyConfirm ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 20px",
            background: "var(--bg-raised)",
            borderBottom: "1px solid var(--border)",
            fontSize: 13,
            color: "var(--text-secondary)"
          }}
        >
          <span>This will start AI extraction and indexing. Confirm?</span>
          <button
            type="button"
            disabled={certifying}
            onClick={onCertify}
            style={{
              padding: "6px 14px",
              background: "var(--accent)",
              color: "var(--bg-page)",
              border: "none",
              borderRadius: 6,
              fontWeight: 500,
              cursor: "pointer"
            }}
          >
            Yes, certify
          </button>
          <button
            type="button"
            onClick={() => setCertifyConfirm(false)}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer"
            }}
          >
            Cancel
          </button>
        </div>
      ) : null}

      {certifyError ? (
        <p style={{ margin: 0, padding: "8px 20px", color: "var(--state-failed)", fontSize: 13 }}>
          {certifyError}
        </p>
      ) : null}

      <div style={{ display: "flex", height: bodyHeight, minHeight: 0 }}>
        <div
          style={{
            width: "60%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            borderRight: "1px solid var(--border)",
            minWidth: 0
          }}
        >
          {showTabs ? (
            <div
              style={{
                display: "flex",
                gap: 20,
                padding: "0 20px",
                borderBottom: "1px solid var(--border)",
                flexShrink: 0
              }}
            >
              {(["summary", "pipeline"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setLeftTab(tab)}
                  style={{
                    padding: "12px 0",
                    background: "none",
                    border: "none",
                    borderBottom: leftTab === tab ? "2px solid var(--accent)" : "2px solid transparent",
                    color: leftTab === tab ? "var(--text-primary)" : "var(--text-muted)",
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: "pointer",
                    textTransform: "capitalize"
                  }}
                >
                  {tab === "summary" ? "Summary" : "Pipeline log"}
                </button>
              ))}
            </div>
          ) : null}

          <div style={{ flex: 1, overflowY: "auto" }}>
            {doc.processingStatus === "awaiting_certification" ? (
              <RequiredFieldsForm document={doc} onSaved={refresh} />
            ) : null}
            {leftTab === "pipeline" || !showTabs ? (
              <PipelineView
                events={events}
                processingStatus={doc.processingStatus}
                isAdmin={isAdmin}
                onCertify={() => setCertifyConfirm(true)}
              />
            ) : summaryLoading ? (
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
                  height: "100%",
                  color: "var(--text-muted)",
                  fontSize: 13
                }}
              >
                Summary will appear after processing completes
              </div>
            )}
          </div>
        </div>

        <ChatSidebar docId={params.id} filename={doc.originalFilename} certified={certified} />
      </div>
    </div>
  );
}
