"use client";

import { useDocuments } from "../../../hooks/useDocuments";
import DocumentCard from "../../../components/DocumentCard";

export default function DocumentsPage() {
  const { documents } = useDocuments();
  return (
    <main>
      <h1 className="mb-4 text-xl font-semibold">Documents</h1>
      <div className="grid gap-3">
        {documents.map((item: any) => (
          <DocumentCard key={item.id} document={item} />
        ))}
      </div>
    </main>
  );
}
