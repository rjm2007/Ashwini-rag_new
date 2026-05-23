"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import api from "../../../../lib/api";
import MetadataEditor from "../../../../components/MetadataEditor";

function StatusBanner({ finalStatus }: { finalStatus?: string }) {
  const status = (finalStatus || "in_review").toLowerCase();
  let bg = "#EFF6FF";
  let border = "#BFDBFE";
  let color = "#1D4ED8";
  let text = "🔵 Awaiting Reviewer Approval";

  if (status === "reviewer_approved") {
    bg = "#FFFBEB";
    border = "#FDE68A";
    color = "#B45309";
    text = "🟡 Awaiting Admin Final Approval";
  } else if (status === "certified") {
    bg = "#F0FDF4";
    border = "#BBF7D0";
    color = "#15803D";
    text = "✅ Document Certified";
  } else if (status === "rejected") {
    bg = "#FEF2F2";
    border = "#FCA5A5";
    color = "#B91C1C";
    text = "❌ Document Rejected";
  }

  return (
    <div
      style={{
        backgroundColor: bg,
        border: `1px solid ${border}`,
        borderRadius: 8,
        padding: "10px 16px",
        marginBottom: 16
      }}
    >
      <p style={{ fontSize: 14, fontWeight: 600, color }}>{text}</p>
    </div>
  );
}

export default function ReviewDetailPage({ params }: { params: { id: string } }) {
  const [document, setDocument] = useState<any>(null);
  const [pdfUrl, setPdfUrl] = useState("");
  const [state, setState] = useState<any>(null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const refresh = async () => {
    const [docResponse, stateResponse, urlResponse] = await Promise.all([
      api.get(`/documents/${params.id}`),
      api.get(`/review/${params.id}/state`),
      api.get(`/documents/${params.id}/pdf-url`).catch(() => ({ data: { url: "" } }))
    ]);
    setDocument(docResponse.data);
    setState(stateResponse.data);
    setPdfUrl(urlResponse.data.url || "");
  };

  useEffect(() => {
    refresh().catch(() => {
      setDocument(null);
      setState(null);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const runAction = async (kind: "reviewer-approve" | "admin-approve" | "reject") => {
    if (!window.confirm("Are you sure?")) return;
    setBusy(true);
    setMessage("");
    try {
      if (kind === "reject") {
        await api.post(`/review/${params.id}/reject`, {
          reason: comment || "Missing coverage details."
        });
      } else if (kind === "reviewer-approve") {
        await api.post(`/review/${params.id}/reviewer-approve`, {
          comment: comment || "Looks good."
        });
      } else {
        await api.post(`/review/${params.id}/admin-approve`, {
          comment: comment || "Certified."
        });
      }
      await refresh();
      setMessage("Action completed successfully.");
    } catch {
      setMessage("Action failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const textareaStyle = {
    width: "100%",
    padding: "8px 12px",
    border: "1px solid #D1DCE8",
    borderRadius: 8,
    fontSize: 14,
    fontFamily: "DM Sans, sans-serif",
    resize: "vertical" as const,
    minHeight: 72,
    boxSizing: "border-box" as const
  };

  return (
    <div className="animate-page-in">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <div className="card lg:w-[55%]" style={{ overflow: "hidden", flexShrink: 0 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "12px 16px",
              backgroundColor: "#F0F4F8",
              borderBottom: "1px solid #D1DCE8"
            }}
          >
            <span className="truncate text-sm font-semibold" style={{ color: "#0A1628" }}>
              {document?.originalFilename || "PDF Preview"}
            </span>
            {pdfUrl ? (
              <a href={pdfUrl} target="_blank" rel="noreferrer" style={{ color: "#7A92A8" }}>
                <Download size={14} />
              </a>
            ) : null}
          </div>
          {pdfUrl ? (
            <iframe title="pdf" src={pdfUrl} style={{ width: "100%", height: 560, border: "none" }} />
          ) : (
            <p style={{ padding: 24, color: "#7A92A8" }}>No PDF preview.</p>
          )}
        </div>

        <div className="lg:w-[45%] lg:min-w-0">
          <StatusBanner finalStatus={state?.finalStatus} />

          <p
            className="mb-2 text-xs font-bold uppercase tracking-wide"
            style={{ color: "#7A92A8" }}
          >
            Document Details
          </p>
          <div className="card" style={{ padding: 16, marginBottom: 16 }}>
            <MetadataEditor document={document} readOnly={false} />
          </div>

          <div className="card" style={{ padding: 16 }}>
            <h2 className="mb-3 text-sm font-semibold" style={{ color: "#0A1628" }}>
              Review Actions
            </h2>

            {message ? (
              <p
                className="mb-3 text-sm"
                style={{
                  color: message.includes("failed") ? "#DC2626" : "#16A34A"
                }}
              >
                {message}
              </p>
            ) : null}

            {(state?.canReviewerApprove || state?.canAdminApprove || state?.canReject) && (
              <>
                <label className="mb-1 block text-sm" style={{ color: "#3D5A80" }}>
                  Add a comment (optional)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Describe your decision..."
                  rows={3}
                  style={{ ...textareaStyle, marginBottom: 12 }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#FF6200";
                    e.target.style.boxShadow = "0 0 0 3px #FFF0E6";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#D1DCE8";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {state?.canReviewerApprove && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => runAction("reviewer-approve")}
                  style={{
                    width: "100%",
                    padding: "10px",
                    backgroundColor: busy ? "#E8EEF4" : "#FF6200",
                    color: "white",
                    border: "none",
                    borderRadius: 8,
                    fontWeight: 600,
                    cursor: busy ? "not-allowed" : "pointer"
                  }}
                >
                  {busy ? "Processing..." : "Approve as Reviewer"}
                </button>
              )}
              {state?.canAdminApprove && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => runAction("admin-approve")}
                  style={{
                    width: "100%",
                    padding: "10px",
                    backgroundColor: busy ? "#E8EEF4" : "#16A34A",
                    color: "white",
                    border: "none",
                    borderRadius: 8,
                    fontWeight: 600,
                    cursor: busy ? "not-allowed" : "pointer"
                  }}
                >
                  {busy ? "Processing..." : "Certify Document"}
                </button>
              )}
              {state?.canReject && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => runAction("reject")}
                  style={{
                    width: "100%",
                    padding: "10px",
                    backgroundColor: "transparent",
                    color: "#DC2626",
                    border: "1px solid #DC2626",
                    borderRadius: 8,
                    fontWeight: 600,
                    cursor: busy ? "not-allowed" : "pointer"
                  }}
                >
                  {busy ? "Processing..." : "Reject"}
                </button>
              )}
              {!state?.canReviewerApprove &&
                !state?.canAdminApprove &&
                !state?.canReject && (
                  <p style={{ fontSize: 13, color: "#7A92A8" }}>No further actions available</p>
                )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
