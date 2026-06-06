"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Clock, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import api from "../../../lib/api";
import DropZone from "../../../components/upload/DropZone";
import StatusPill from "../../../components/ui/StatusPill";
import type { DocumentItem } from "../../../lib/types";

/* ── Lazy imports for new components ── */
let UploadTips: React.ComponentType | null = null;
let HowItWorks: React.ComponentType | null = null;
try { UploadTips = require("../../../components/upload/UploadTips").default; } catch {}
try { HowItWorks = require("../../../components/upload/HowItWorks").default; } catch {}

function relativeDate(value?: string): string {
  if (!value) return "—";
  const d = new Date(value);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? "s" : ""} ago`;
  return `${Math.floor(hrs / 24)} day${Math.floor(hrs / 24) > 1 ? "s" : ""} ago`;
}

function formatSize(bytes?: number): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function statusIcon(status: string) {
  if (status === "processing_complete")
    return <CheckCircle2 size={14} style={{ color: "var(--state-done)" }} />;
  if (status === "failed")
    return <AlertCircle size={14} style={{ color: "var(--state-failed)" }} />;
  return <Loader2 size={14} style={{ color: "var(--accent)" }} className="animate-spin" />;
}

export default function UploadPage() {
  const router = useRouter();
  const [recent, setRecent] = useState<DocumentItem[]>([]);

  useEffect(() => {
    api.get("/documents").then((r) => {
      const list = (r.data.data || []) as DocumentItem[];
      setRecent(list.slice(0, 5));
    });
  }, []);

  return (
    <div style={{ maxWidth: 1040, margin: "0 auto", padding: "32px 32px" }}>
      {/* Page title */}
      <h1
        style={{
          fontSize: 22,
          fontWeight: 600,
          margin: "0 0 4px",
          color: "var(--text-primary)",
          letterSpacing: "-0.01em",
        }}
      >
        Upload Document
      </h1>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 28 }}>
        Drag & drop your document to start intelligent analysis
      </p>

      {/* Main layout: dropzone left, tips right */}
      <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
        {/* Hero upload zone */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <DropZone />
        </div>

        {/* Right rail: tips + how it works */}
        <div style={{ width: 320, flexShrink: 0, display: "flex", flexDirection: "column", gap: 16 }}>
          {UploadTips ? (
            <UploadTips />
          ) : (
            <div
              className="card"
              style={{ padding: 20 }}
            >
              <h3
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  margin: "0 0 12px",
                }}
              >
                Upload Tips
              </h3>
              {[
                "PDF format only",
                "Up to 100MB file size",
                "Clear scans work best",
                "Multi-page documents supported",
                "AI will extract all key information",
              ].map((tip, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 0",
                    fontSize: 13,
                    color: "var(--text-secondary)",
                  }}
                >
                  <CheckCircle2 size={14} style={{ color: "var(--state-done)", flexShrink: 0 }} />
                  {tip}
                </div>
              ))}
            </div>
          )}

          {HowItWorks ? (
            <HowItWorks />
          ) : (
            <div
              className="card"
              style={{ padding: 20 }}
            >
              <h3
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  margin: "0 0 12px",
                }}
              >
                How it works
              </h3>
              {[
                "Upload your document",
                "AI processes and extracts",
                "Review and approve",
                "Ask questions",
              ].map((step, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "8px 0",
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: "var(--accent-soft)",
                      color: "var(--accent)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    {i + 1}
                  </div>
                  <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{step}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Uploads */}
      <div
        className="card"
        style={{ marginTop: 28, padding: 0, overflow: "hidden" }}
      >
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h3
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            Recent Uploads
          </h3>
          <Link
            href="/documents"
            style={{
              fontSize: 12,
              color: "var(--accent)",
              fontWeight: 500,
            }}
          >
            View all →
          </Link>
        </div>

        {recent.length === 0 ? (
          <div
            style={{
              padding: "32px 20px",
              textAlign: "center",
              color: "var(--text-muted)",
              fontSize: 13,
            }}
          >
            No uploads yet. Drop a PDF above to get started.
          </div>
        ) : (
          recent.map((doc, i) => (
            <button
              key={doc.id}
              type="button"
              onClick={() => router.push(`/documents/${doc.id}`)}
              className="card-hover"
              style={{
                display: "flex",
                alignItems: "center",
                width: "100%",
                padding: "12px 20px",
                background: "none",
                border: "none",
                borderBottom: i < recent.length - 1 ? "1px solid var(--border)" : "none",
                cursor: "pointer",
                textAlign: "left",
                gap: 12,
                transition: "background 150ms ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--bg-hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "var(--r-sm)",
                  background: "var(--accent-soft)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <FileText size={16} style={{ color: "var(--accent)" }} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: "var(--text-primary)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {doc.originalFilename}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text-muted)",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginTop: 2,
                  }}
                >
                  <span>{formatSize((doc as any).fileSize)}</span>
                  <span>·</span>
                  <Clock size={10} />
                  <span>{relativeDate(doc.uploadedAt)}</span>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <StatusPill status={doc.processingStatus} />
                {statusIcon(doc.processingStatus)}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
