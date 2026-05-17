"use client";

import Link from "next/link";
import DocumentStatusBadge from "./DocumentStatusBadge";

export default function DocumentCard({ document }: { document: any }) {
  const effectiveStatus =
    document.currentRepository === "certified" || document.currentRepository === "rejected"
      ? document.currentRepository
      : document.processingStatus;

  return (
    <Link href={`/documents/${document.id}`} className="rounded bg-white p-4 shadow">
      <div className="flex items-center justify-between">
        <p className="font-medium">{document.originalFilename}</p>
        <DocumentStatusBadge status={effectiveStatus} />
      </div>
      <p className="text-xs text-slate-500">{document.currentRepository}</p>
    </Link>
  );
}
