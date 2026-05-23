"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardCheck, FileText } from "lucide-react";
import api from "../../../lib/api";
import DocumentStatusBadge from "../../../components/DocumentStatusBadge";
import EmptyState from "../../../components/EmptyState";
import LoadingSkeleton from "../../../components/LoadingSkeleton";

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
      <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
        <h1 className="text-xl font-bold" style={{ color: "#0A1628" }}>
          Review Queue
        </h1>
        <span
          style={{
            backgroundColor: "#FF6200",
            color: "#FFFFFF",
            fontSize: 11,
            fontWeight: 700,
            padding: "2px 10px",
            borderRadius: 99,
            fontFamily: "DM Mono, monospace"
          }}
        >
          {items.length}
        </span>
      </div>
      <p className="mb-5 text-sm" style={{ color: "#7A92A8" }}>
        Showing documents that require your action
      </p>

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
                  <FileText size={20} color="#FF6200" style={{ marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "#0A1628" }}>
                      {filename}
                    </p>
                    <p className="text-xs" style={{ color: "#7A92A8", marginTop: 4 }}>
                      {uploaded ? new Date(uploaded).toLocaleDateString() : "—"}
                    </p>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <span
                    style={{
                      backgroundColor: "#F0F4F8",
                      color: "#3D5A80",
                      fontSize: 12,
                      padding: "3px 8px",
                      borderRadius: 6
                    }}
                  >
                    {meta.make || doc.make || "—"}
                  </span>
                  <span
                    style={{
                      backgroundColor: "#F0F4F8",
                      color: "#3D5A80",
                      fontSize: 12,
                      padding: "3px 8px",
                      borderRadius: 6
                    }}
                  >
                    {meta.model || doc.model || "—"}
                  </span>
                  <span
                    style={{
                      backgroundColor: "#F0F4F8",
                      color: "#3D5A80",
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
                      backgroundColor: "#FF6200",
                      color: "white",
                      padding: "6px 16px",
                      borderRadius: 8,
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
  );
}
