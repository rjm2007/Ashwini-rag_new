"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardCheck, FileText } from "lucide-react";
import api from "../../../lib/api";
import DocumentStatusBadge from "../../../components/DocumentStatusBadge";
import EmptyState from "../../../components/EmptyState";
import LoadingSkeleton from "../../../components/LoadingSkeleton";
import BandHeader from "../../../components/layout/BandHeader";

export default function ReviewPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/review/pending")
      .then((response) => setItems(Array.isArray(response.data) ? response.data : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="animate-page-in">
      <BandHeader
        title="Review queue"
        subtitle="Documents that cannot be certified until a person fills in what the extractor could not find."
        count={items.length}
      />

      <div style={{ padding: "20px 28px 28px" }}>
      {loading ? (
        <LoadingSkeleton type="card" count={3} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No documents pending review"
          description="Documents will appear here once they are processed and ready."
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {items.map((item) => {
            const doc = item.document || item;
            const filename =
              doc.originalFilename || item.originalFilename || `Document ${item.documentId || item.id}`;
            const meta = doc.metadataJson || item.metadataJson || {};
            const uploaded = doc.uploadedAt || item.uploadedAt;

            return (
              <div
                key={item.documentId || item.id}
                className="card"
                style={{
                  padding: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                  flexWrap: "wrap"
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flex: 1, minWidth: 200 }}>
                  <FileText size={20} color="var(--accent)" style={{ marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      {filename}
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-muted)", marginTop: 4 }}>
                      {uploaded ? new Date(uploaded).toLocaleDateString() : "—"}
                    </p>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <span
                    style={{
                      backgroundColor: "var(--bg-raised)",
                      color: "var(--text-secondary)",
                      fontSize: 12,
                      padding: "3px 8px",
                      borderRadius: 6
                    }}
                  >
                    {meta.make || doc.make || "—"}
                  </span>
                  <span
                    style={{
                      backgroundColor: "var(--bg-raised)",
                      color: "var(--text-secondary)",
                      fontSize: 12,
                      padding: "3px 8px",
                      borderRadius: 6
                    }}
                  >
                    {meta.model || doc.model || "—"}
                  </span>
                  <span
                    style={{
                      backgroundColor: "var(--bg-raised)",
                      color: "var(--text-secondary)",
                      fontSize: 12,
                      padding: "3px 8px",
                      borderRadius: 6
                    }}
                  >
                    {meta.year || doc.year || "—"}
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <DocumentStatusBadge status={item.finalStatus || "in_review"} />
                  <Link
                    href={`/review/${item.documentId || item.id}`}
                    style={{
                      backgroundColor: "var(--accent)",
                      color: "var(--accent-fg)",
                      padding: "6px 16px",
                      borderRadius: "var(--r-md)",
                      fontSize: 13,
                      fontWeight: 600,
                      textDecoration: "none"
                    }}
                  >
                    Review
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
}
