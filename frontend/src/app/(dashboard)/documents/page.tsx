"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, ChevronRight, Upload } from "lucide-react";
import api from "../../../lib/api";
import StatusPill from "../../../components/ui/StatusPill";
import TypePill from "../../../components/ui/TypePill";
import MonoChip from "../../../components/ui/MonoChip";
import { useAuth } from "../../../hooks/useAuth";
import type { DocumentItem } from "../../../lib/types";

function relativeDate(value?: string): string {
  if (!value) return "—";
  const d = new Date(value);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

export default function DocumentsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const showUpload = user?.role === "admin" || user?.role === "reviewer";

  const fetchDocs = () => {
    api
      .get("/documents")
      .then((r) => setDocuments(r.data.data || []))
      .catch(() => setDocuments([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDocs();
    const interval = setInterval(fetchDocs, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ padding: "20px 24px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h1 style={{ fontSize: 18, fontWeight: 500, margin: 0, color: "var(--text-primary)" }}>
            Documents
          </h1>
          <MonoChip value={String(documents.length)} size="sm" />
        </div>
        {showUpload ? (
          <Link
            href="/upload"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              padding: "6px 14px",
              border: "1px solid var(--accent)",
              borderRadius: 8,
              color: "var(--accent)",
              background: "transparent"
            }}
          >
            <Upload size={14} />
            Upload
          </Link>
        ) : null}
      </div>

      <div style={{ width: "100%" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 160px 140px 120px 40px",
            gap: 12,
            padding: "10px 12px",
            fontSize: 11,
            fontWeight: 500,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            borderBottom: "1px solid var(--border)"
          }}
        >
          <span>Document</span>
          <span>Type</span>
          <span>Status</span>
          <span>Uploaded</span>
          <span />
        </div>

        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                style={{
                  height: 48,
                  margin: "4px 0",
                  background: "var(--bg-raised)",
                  borderRadius: 6,
                  animation: "breathe 1.4s ease-in-out infinite",
                  animationDelay: `${i * 200}ms`
                }}
              />
            ))
          : null}

        {!loading && documents.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 16px" }}>
            <p style={{ color: "var(--text-secondary)", marginBottom: 8 }}>No documents yet</p>
            <Link href="/upload" style={{ color: "var(--accent)", fontSize: 13 }}>
              Upload your first document →
            </Link>
          </div>
        ) : null}

        {!loading &&
          documents.map((doc) => (
            <div
              key={doc.id}
              role="button"
              tabIndex={0}
              onClick={() => router.push(`/documents/${doc.id}`)}
              onKeyDown={(e) => e.key === "Enter" && router.push(`/documents/${doc.id}`)}
              className="doc-row"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 160px 140px 120px 40px",
                gap: 12,
                alignItems: "center",
                height: 48,
                padding: "0 12px",
                borderBottom: "1px solid var(--border)",
                cursor: "pointer"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                <FileText size={14} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                <span
                  style={{
                    fontSize: 13,
                    color: "var(--text-primary)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap"
                  }}
                >
                  {doc.originalFilename}
                </span>
              </div>
              <div>
                <TypePill docType={doc.documentType || "generic_document"} />
              </div>
              <div>
                <StatusPill status={doc.processingStatus} />
              </div>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {relativeDate(doc.uploadedAt)}
              </span>
              <ChevronRight
                size={16}
                className="row-chevron"
                style={{ color: "var(--text-muted)", opacity: 0 }}
              />
            </div>
          ))}
      </div>

      <style jsx>{`
        .doc-row:hover {
          background: var(--bg-hover);
        }
        .doc-row:hover .row-chevron {
          opacity: 1 !important;
        }
      `}</style>
    </div>
  );
}
