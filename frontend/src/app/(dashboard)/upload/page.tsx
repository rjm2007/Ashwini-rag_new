"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "../../../lib/api";
import DropZone from "../../../components/upload/DropZone";
import StatusPill from "../../../components/ui/StatusPill";
import type { DocumentItem } from "../../../lib/types";

function relativeDate(value?: string): string {
  if (!value) return "—";
  const d = new Date(value);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
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
    <div style={{ maxWidth: 560, margin: "40px auto", padding: "0 24px" }}>
      <h1 style={{ fontSize: 20, fontWeight: 500, margin: "0 0 8px", color: "var(--text-primary)" }}>
        Upload document
      </h1>
      <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 24 }}>
        Documents enter the pipeline immediately after upload.
      </p>

      <DropZone />

      <div style={{ marginTop: 24 }}>
        <p
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: 10
          }}
        >
          Recent uploads
        </p>
        {recent.map((doc) => (
          <button
            key={doc.id}
            type="button"
            onClick={() => router.push(`/documents/${doc.id}`)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              padding: "8px 0",
              background: "none",
              border: "none",
              borderBottom: "1px solid var(--border)",
              cursor: "pointer",
              textAlign: "left"
            }}
          >
            <span
              style={{
                fontSize: 13,
                color: "var(--text-primary)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                flex: 1,
                marginRight: 12
              }}
            >
              {doc.originalFilename}
            </span>
            <StatusPill status={doc.processingStatus} />
            <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 12, flexShrink: 0 }}>
              {relativeDate(doc.uploadedAt)}
            </span>
          </button>
        ))}
        {recent.length === 0 ? (
          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
            No uploads yet.{" "}
            <Link href="/documents" style={{ color: "var(--accent)" }}>
              View documents
            </Link>
          </p>
        ) : null}
      </div>
    </div>
  );
}
