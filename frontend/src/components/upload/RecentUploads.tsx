"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";

interface RecentDoc {
  id: string;
  originalFilename: string;
  fileSize?: number;
  processingStatus: string;
  createdAt: string;
}

interface RecentUploadsProps {
  documents: RecentDoc[];
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr > 1 ? "s" : ""} ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay} day${diffDay > 1 ? "s" : ""} ago`;
}

function formatFileSize(bytes?: number): string {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function statusColor(status: string): { bg: string; color: string } {
  const s = status.toLowerCase();
  if (s === "processing_complete" || s === "complete" || s === "done")
    return { bg: "rgba(22,163,74,0.10)", color: "#16A34A" };
  if (s === "failed" || s === "error")
    return { bg: "rgba(239,68,68,0.10)", color: "#EF4444" };
  return { bg: "rgba(99,102,241,0.10)", color: "#6366F1" };
}

function statusLabel(status: string): string {
  const s = status.toLowerCase();
  if (s === "processing_complete" || s === "complete" || s === "done") return "Complete";
  if (s === "failed" || s === "error") return "Failed";
  return "Processing";
}

function UploadRow({ doc }: { doc: RecentDoc }) {
  const [hovered, setHovered] = useState(false);
  const sc = statusColor(doc.processingStatus);
  const sizeStr = formatFileSize(doc.fileSize);

  return (
    <Link
      href={`/documents/${doc.id}`}
      style={{ textDecoration: "none", color: "inherit", display: "block" }}
    >
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "10px 12px",
          borderRadius: "var(--r-sm)",
          background: hovered ? "var(--bg-hover)" : "transparent",
          boxShadow: hovered ? "var(--shadow-xs)" : "none",
          transition: "background 150ms ease, box-shadow 150ms ease, transform 150ms ease",
          transform: hovered ? "translateY(-1px)" : "none",
          cursor: "pointer",
        }}
      >
        {/* File icon */}
        <span
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
          <FileText size={16} color="var(--accent)" />
        </span>

        {/* Filename + meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "var(--text-primary)",
              margin: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {doc.originalFilename}
          </p>
          <p
            style={{
              fontSize: 11,
              color: "var(--text-muted)",
              margin: "2px 0 0",
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          >
            {sizeStr && <>{sizeStr} · </>}
            {formatRelativeTime(doc.createdAt)}
          </p>
        </div>

        {/* Status pill */}
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            padding: "3px 10px",
            borderRadius: "var(--r-pill)",
            background: sc.bg,
            color: sc.color,
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {statusLabel(doc.processingStatus)}
        </span>
      </div>
    </Link>
  );
}

export default function RecentUploads({ documents }: RecentUploadsProps) {
  if (!documents.length) return null;

  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--r-md)",
        padding: 24,
      }}
    >
      <h3
        style={{
          fontSize: 15,
          fontWeight: 600,
          color: "var(--text-primary)",
          margin: "0 0 12px",
        }}
      >
        Recent Uploads
      </h3>

      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {documents.map((doc) => (
          <UploadRow key={doc.id} doc={doc} />
        ))}
      </div>
    </div>
  );
}
