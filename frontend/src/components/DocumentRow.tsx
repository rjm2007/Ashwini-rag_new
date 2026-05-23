"use client";

import Link from "next/link";
import { Eye, FileText } from "lucide-react";
import DocumentStatusBadge from "./DocumentStatusBadge";

function formatVehicle(metadata: any): string {
  if (!metadata) {
    return "—";
  }
  const parts = [metadata.make, metadata.model, metadata.year].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : "—";
}

function formatDate(value?: string): string {
  if (!value) {
    return "—";
  }
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit"
    });
  } catch {
    return value;
  }
}

export default function DocumentRow({ document }: { document: any }) {
  const repository = document.currentRepository || "—";
  const processingStatus = document.processingStatus || "—";

  return (
    <tr
      className="border-b transition-colors hover:bg-[var(--bg-primary)]"
      style={{ borderColor: "var(--border)" }}
    >
      <td className="px-4 py-3">
        <Link
          href={`/documents/${document.id}`}
          className="flex items-center gap-3"
          style={{ color: "var(--text-primary)" }}
        >
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
            style={{ background: "var(--accent-light)", color: "var(--accent)" }}
          >
            <FileText size={16} />
          </div>
          <span className="max-w-[280px] truncate text-sm font-medium">
            {document.originalFilename}
          </span>
        </Link>
      </td>
      <td className="px-4 py-3 text-sm" style={{ color: "var(--text-secondary)" }}>
        {formatVehicle(document.metadataJson)}
      </td>
      <td className="px-4 py-3">
        <DocumentStatusBadge status={repository} />
      </td>
      <td className="px-4 py-3">
        <DocumentStatusBadge status={processingStatus} />
      </td>
      <td
        className="px-4 py-3 font-mono text-xs"
        style={{ color: "var(--text-muted)" }}
      >
        {formatDate(document.uploadedAt || document.createdAt)}
      </td>
      <td className="px-4 py-3 text-right">
        <Link
          href={`/documents/${document.id}`}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border"
          style={{
            borderColor: "var(--border)",
            color: "var(--text-secondary)"
          }}
          aria-label="View document"
        >
          <Eye size={14} />
        </Link>
      </td>
    </tr>
  );
}
