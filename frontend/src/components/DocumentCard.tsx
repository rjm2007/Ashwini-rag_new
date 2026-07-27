"use client";

import Link from "next/link";
import { Eye, FileText } from "lucide-react";
import DocumentStatusBadge from "./DocumentStatusBadge";

export default function DocumentCard({ document }: { document: any }) {
  const vehicle = [document.make, document.model, document.year].filter(Boolean).join(" ") || "—";

  return (
    <Link
      href={`/documents/${document.id}`}
      className="card"
      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 16 }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <FileText size={18} color="var(--accent)" />
        <div>
          <p style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{document.originalFilename}</p>
          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{vehicle}</p>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <DocumentStatusBadge status={document.currentRepository} />
        <Eye size={16} color="var(--text-muted)" />
      </div>
    </Link>
  );
}
