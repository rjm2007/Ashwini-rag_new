"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, ChevronRight, Upload, Search, Filter } from "lucide-react";
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
  if (mins < 1) return "Just now";
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
  const [search, setSearch] = useState("");
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

  const filtered = documents.filter((d) =>
    d.originalFilename.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: "24px 28px" }}>
      {/* Page header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 600,
              margin: 0,
              color: "var(--text-primary)",
              letterSpacing: "-0.01em",
            }}
          >
            Documents
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "4px 0 0" }}>
            {documents.length} document{documents.length !== 1 ? "s" : ""} in your workspace
          </p>
        </div>
        {showUpload && (
          <Link
            href="/upload"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              fontWeight: 600,
              padding: "9px 20px",
              background: "var(--accent)",
              color: "var(--text-inverse)",
              borderRadius: "var(--r-sm)",
              boxShadow: "var(--shadow-accent)",
              textDecoration: "none",
            }}
          >
            <Upload size={15} />
            Upload Document
          </Link>
        )}
      </div>

      {/* Search/filter bar */}
      <div
        className="card"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "10px 16px",
          marginBottom: 16,
        }}
      >
        <Search size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
        <input
          type="text"
          placeholder="Search documents..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
            border: "none",
            background: "transparent",
            fontSize: 13,
            color: "var(--text-primary)",
            outline: "none",
          }}
        />
        <button
          type="button"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            padding: "5px 12px",
            borderRadius: "var(--r-sm)",
            border: "1px solid var(--border)",
            background: "transparent",
            color: "var(--text-secondary)",
            cursor: "pointer",
          }}
        >
          <Filter size={13} />
          Filter
        </button>
      </div>

      {/* Document table */}
      <div className="card" style={{ overflow: "hidden" }}>
        {/* Header row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 120px 100px 160px 120px 40px",
            gap: 12,
            padding: "12px 20px",
            fontSize: 11,
            fontWeight: 500,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            borderBottom: "1px solid var(--border)",
            background: "var(--bg-raised)",
          }}
        >
          <span>Document</span>
          <span>Type</span>
          <span>Coverages</span>
          <span>Status</span>
          <span>Uploaded</span>
          <span />
        </div>

        {/* Loading skeletons */}
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                style={{
                  height: 56,
                  margin: "0 20px",
                  borderBottom: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    height: 14,
                    width: `${30 + Math.random() * 40}%`,
                    background: "var(--bg-hover)",
                    borderRadius: 4,
                    animation: "breathe 1.4s ease-in-out infinite",
                    animationDelay: `${i * 200}ms`,
                  }}
                />
              </div>
            ))
          : null}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "56px 16px" }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "var(--accent-soft)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <FileText size={24} style={{ color: "var(--accent)" }} />
            </div>
            <p
              style={{
                color: "var(--text-secondary)",
                marginBottom: 8,
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              {search ? "No matching documents" : "No documents yet"}
            </p>
            <Link
              href="/upload"
              style={{ color: "var(--accent)", fontSize: 13, fontWeight: 500 }}
            >
              Upload your first document →
            </Link>
          </div>
        )}

        {/* Document rows */}
        {!loading &&
          filtered.map((doc, i) => (
            <div
              key={doc.id}
              role="button"
              tabIndex={0}
              onClick={() => router.push(`/documents/${doc.id}`)}
              onKeyDown={(e) => e.key === "Enter" && router.push(`/documents/${doc.id}`)}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 120px 100px 160px 120px 40px",
                gap: 12,
                alignItems: "center",
                height: 56,
                padding: "0 20px",
                borderBottom:
                  i < filtered.length - 1 ? "1px solid var(--border)" : "none",
                cursor: "pointer",
                transition: "background 120ms ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--bg-hover)";
                const chevron = e.currentTarget.querySelector(
                  ".row-chevron"
                ) as HTMLElement;
                if (chevron) chevron.style.opacity = "1";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                const chevron = e.currentTarget.querySelector(
                  ".row-chevron"
                ) as HTMLElement;
                if (chevron) chevron.style.opacity = "0";
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "var(--r-sm)",
                    background: "var(--accent-soft)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <FileText size={15} style={{ color: "var(--accent)" }} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: "var(--text-primary)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      display: "block",
                    }}
                  >
                    {doc.originalFilename}
                  </span>
                  <span
                    className="mono"
                    style={{
                      fontSize: 10,
                      color: "var(--text-muted)",
                    }}
                  >
                    {doc.id.slice(0, 8)}
                  </span>
                </div>
              </div>
              <div>
                <TypePill type={doc.documentType || "generic_document"} />
              </div>
              <div>
                <MonoChip value={String(doc.coverageCount ?? 0)} />
              </div>
              <div>
                <StatusPill status={doc.processingStatus} />
              </div>
              <span
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  fontFamily: "'IBM Plex Mono', monospace",
                }}
              >
                {relativeDate(doc.uploadedAt)}
              </span>
              <ChevronRight
                size={16}
                className="row-chevron"
                style={{ color: "var(--text-muted)", opacity: 0, transition: "opacity 120ms ease" }}
              />
            </div>
          ))}
      </div>
    </div>
  );
}
