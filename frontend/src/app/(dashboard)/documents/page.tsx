"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FileText, Eye } from "lucide-react";
import { useDocuments } from "../../../hooks/useDocuments";
import DocumentStatusBadge from "../../../components/DocumentStatusBadge";
import LoadingSkeleton from "../../../components/LoadingSkeleton";
import EmptyState from "../../../components/EmptyState";

const headerCell = {
  padding: "10px 16px",
  fontSize: 12,
  fontWeight: 600,
  color: "#7A92A8",
  textTransform: "uppercase" as const,
  letterSpacing: "0.06em",
  textAlign: "left" as const
};

function vehicleLabel(doc: any): string {
  const parts = [doc.make, doc.model, doc.year].filter(Boolean);
  if (parts.length) return parts.join(" ");
  const meta = doc.metadataJson || {};
  const fromMeta = [meta.make, meta.model, meta.year].filter(Boolean);
  return fromMeta.length ? fromMeta.join(" ") : "—";
}

export default function DocumentsPage() {
  const { documents } = useDocuments();
  const [loading, setLoading] = useState(true);
  const [repoFilter, setRepoFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, [documents]);

  const filtered = useMemo(() => {
    return documents.filter((doc: any) => {
      const repoOk = repoFilter === "all" || doc.currentRepository === repoFilter;
      const statusOk = statusFilter === "all" || doc.processingStatus === statusFilter;
      return repoOk && statusOk;
    });
  }, [documents, repoFilter, statusFilter]);

  const selectStyle = {
    padding: "6px 10px",
    border: "1px solid #D1DCE8",
    borderRadius: 8,
    fontSize: 13,
    color: "#0A1628",
    backgroundColor: "#FFFFFF"
  };

  return (
    <div className="animate-page-in">
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 20
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h1 className="text-xl font-bold" style={{ color: "#0A1628" }}>
            Documents
          </h1>
          <span
            style={{
              backgroundColor: "#F0F4F8",
              color: "#3D5A80",
              fontSize: 12,
              padding: "2px 10px",
              borderRadius: 99,
              fontFamily: "DM Mono, monospace"
            }}
          >
            {filtered.length}
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select value={repoFilter} onChange={(e) => setRepoFilter(e.target.value)} style={selectStyle}>
            <option value="all">All repositories</option>
            <option value="pending_review">Pending review</option>
            <option value="certified">Certified</option>
            <option value="rejected">Rejected</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={selectStyle}>
            <option value="all">All statuses</option>
            <option value="ready_for_review">Ready for review</option>
            <option value="ocr_in_progress">OCR running</option>
            <option value="failed">Failed</option>
          </select>
          <button
            type="button"
            onClick={() => {
              setRepoFilter("all");
              setStatusFilter("all");
            }}
            style={{
              ...selectStyle,
              cursor: "pointer",
              backgroundColor: "#F0F4F8"
            }}
          >
            Reset
          </button>
        </div>
      </div>

      <div className="card" style={{ overflow: "hidden", borderRadius: 12 }}>
        {loading ? (
          <LoadingSkeleton type="row" count={5} />
        ) : documents.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No documents yet"
            description="Upload your first warranty PDF to get started."
            action={{ label: "Upload PDF", href: "/upload" }}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No matching documents"
            description="Try adjusting your filters."
          />
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#F0F4F8", borderBottom: "1px solid #D1DCE8" }}>
                <th style={headerCell}>File Name</th>
                <th style={headerCell}>Vehicle</th>
                <th style={headerCell}>Repository</th>
                <th style={headerCell}>Processing Status</th>
                <th style={headerCell}>Uploaded</th>
                <th style={{ ...headerCell, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((doc: any, index: number) => (
                <tr
                  key={doc.id}
                  style={{
                    backgroundColor: index % 2 === 0 ? "#FAFBFC" : "#FFFFFF",
                    borderBottom: "1px solid #F0F4F8"
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLTableRowElement).style.backgroundColor = "#F5F8FB";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLTableRowElement).style.backgroundColor =
                      index % 2 === 0 ? "#FAFBFC" : "#FFFFFF";
                  }}
                >
                  <td style={{ padding: "14px 16px" }}>
                    <Link
                      href={`/documents/${doc.id}`}
                      style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: "#0A1628",
                        maxWidth: 220,
                        display: "inline-block",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      }}
                    >
                      {doc.originalFilename}
                    </Link>
                  </td>
                  <td style={{ padding: "14px 16px", fontSize: 14, color: "#3D5A80" }}>
                    {vehicleLabel(doc)}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <DocumentStatusBadge status={doc.currentRepository} />
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <DocumentStatusBadge status={doc.processingStatus} />
                  </td>
                  <td style={{ padding: "14px 16px", fontSize: 14, color: "#7A92A8" }}>
                    {doc.uploadedAt
                      ? new Date(doc.uploadedAt).toLocaleDateString()
                      : "—"}
                  </td>
                  <td style={{ padding: "14px 16px", textAlign: "right" }}>
                    <Link
                      href={`/documents/${doc.id}`}
                      style={{
                        display: "inline-flex",
                        padding: 6,
                        borderRadius: 6,
                        color: "#7A92A8"
                      }}
                      aria-label="View"
                    >
                      <Eye size={16} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
