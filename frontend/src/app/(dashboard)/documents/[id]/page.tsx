"use client";

import { useEffect, useState } from "react";
import api from "../../../../lib/api";
import MetadataEditor from "../../../../components/MetadataEditor";

export default function DocumentDetailPage({ params }: { params: { id: string } }) {
  const [document, setDocument] = useState<any>(null);
  const [pdfUrl, setPdfUrl] = useState("");

  useEffect(() => {
    // This function loads document details and signed PDF URL.
    api.get(`/documents/${params.id}`).then((response) => setDocument(response.data));
    api.get(`/documents/${params.id}/pdf-url`).then((response) => setPdfUrl(response.data.url));
  }, [params.id]);

  return (
    <main className="grid grid-cols-2 gap-4">
      <div className="rounded bg-white p-4 shadow">
        <h2 className="mb-2 font-semibold">PDF Preview</h2>
        {pdfUrl ? <iframe title="pdf" src={pdfUrl} className="h-[600px] w-full" /> : <p>No PDF URL.</p>}
      </div>
      <div className="rounded bg-white p-4 shadow">
        <h2 className="mb-2 font-semibold">Metadata</h2>
        <MetadataEditor document={document} />
      </div>
    </main>
  );
}
