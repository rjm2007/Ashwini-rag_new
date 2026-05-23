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
        <FileText size={18} color="#FF6200" />
        <div>
          <p style={{ fontSize: 14, fontWeight: 500, color: "#0A1628" }}>{document.originalFilename}</p>
          <p style={{ fontSize: 12, color: "#7A92A8" }}>{vehicle}</p>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <DocumentStatusBadge status={document.currentRepository} />
        <Eye size={16} color="#7A92A8" />
      </div>
    </Link>
  );
}
