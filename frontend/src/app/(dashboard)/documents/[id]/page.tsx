"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import api from "../../../../lib/api";
import StatusPipeline from "../../../../components/StatusPipeline";
import DocumentStatusBadge from "../../../../components/DocumentStatusBadge";
import ConfidenceGauge from "../../../../components/ConfidenceGauge";
import LoadingSkeleton from "../../../../components/LoadingSkeleton";

export default function DocumentDetailPage({ params }: { params: { id: string } }) {
  const [document, setDocument] = useState<any>(null);
  const [pdfUrl, setPdfUrl] = useState("");
  const [jsonOpen, setJsonOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/documents/${params.id}`).then((r) => r.data),
      api.get(`/documents/${params.id}/pdf-url`).then((r) => r.data.url).catch(() => "")
    ])
      .then(([doc, url]) => {
        setDocument(doc);
        setPdfUrl(url || "");
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  const meta = document?.metadataJson || {};
  const coverage = meta.coverage_components || [];
  const exclusions = meta.exclusions || [];

  const fieldRow = (label: string, value: React.ReactNode) => (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 0",
        borderBottom: "1px solid #F0F4F8"
      }}
    >
      <span style={{ fontSize: 14, fontWeight: 500, color: "#7A92A8" }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 500, color: "#0A1628" }}>{value}</span>
    </div>
  );

  return (
    <div className="animate-page-in">
      <div className="grid gap-5 lg:grid-cols-5">
        <div className="card lg:col-span-3" style={{ overflow: "hidden", borderRadius: 12 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              backgroundColor: "#F0F4F8",
              borderBottom: "1px solid #D1DCE8"
            }}
          >
            <span
              className="truncate text-sm font-semibold"
              style={{ color: "#0A1628", maxWidth: "80%" }}
            >
              {document?.originalFilename || "PDF Preview"}
            </span>
            {pdfUrl ? (
              <a
                href={pdfUrl}
                target="_blank"
                rel="noreferrer"
                style={{ color: "#7A92A8", display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}
              >
                <Download size={14} />
                Download
              </a>
            ) : null}
          </div>
          {loading ? (
            <div style={{ padding: 20 }}>
              <LoadingSkeleton type="card" count={1} />
            </div>
          ) : pdfUrl ? (
            <iframe title="pdf" src={pdfUrl} style={{ width: "100%", height: 560, border: "none" }} />
          ) : (
            <p style={{ padding: 24, color: "#7A92A8", fontSize: 14 }}>No PDF preview available.</p>
          )}
        </div>

        <div className="card lg:col-span-2" style={{ padding: 20 }}>
          {loading ? (
            <LoadingSkeleton type="card" count={2} />
          ) : (
            <>
              <StatusPipeline currentStatus={document?.processingStatus || "uploaded"} />

              <h2
                className="mb-2 mt-4 border-b pb-2 text-sm font-semibold"
                style={{ color: "#0A1628", borderColor: "#D1DCE8" }}
              >
                Extracted Metadata
              </h2>

              {fieldRow("Make", document?.make || meta.make || "—")}
              {fieldRow("Model", document?.model || meta.model || "—")}
              {fieldRow("Year", document?.year || meta.year || "—")}
              {fieldRow("Warranty Type", document?.warrantyType || meta.warranty_type || "—")}
              {fieldRow("Country", document?.country || meta.country || "—")}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 0",
                  borderBottom: "1px solid #F0F4F8"
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 500, color: "#7A92A8" }}>Confidence</span>
                <ConfidenceGauge value={Number(document?.confidenceScore || 0)} />
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 0",
                  borderBottom: "1px solid #F0F4F8"
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 500, color: "#7A92A8" }}>Status</span>
                <DocumentStatusBadge status={document?.processingStatus || "unknown"} />
              </div>

              {coverage.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <p
                    className="mb-2 text-xs font-bold uppercase tracking-wide"
                    style={{ color: "#7A92A8" }}
                  >
                    Coverage Components
                  </p>
                  <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none" }}>
                    {coverage.map((item: any, i: number) => (
                      <li
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 8,
                          fontSize: 13,
                          color: "#0A1628",
                          marginBottom: 6
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            backgroundColor: "#FF6200",
                            marginTop: 6,
                            flexShrink: 0
                          }}
                        />
                        {typeof item === "string" ? item : JSON.stringify(item)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {exclusions.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <p
                    className="mb-2 text-xs font-bold uppercase tracking-wide"
                    style={{ color: "#7A92A8" }}
                  >
                    Exclusions
                  </p>
                  <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none" }}>
                    {exclusions.map((item: any, i: number) => (
                      <li
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 8,
                          fontSize: 13,
                          color: "#B91C1C",
                          backgroundColor: "#FEF2F2",
                          padding: "6px 10px",
                          borderRadius: 6,
                          marginBottom: 6
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            backgroundColor: "#DC2626",
                            marginTop: 6,
                            flexShrink: 0
                          }}
                        />
                        {typeof item === "string" ? item : JSON.stringify(item)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                type="button"
                onClick={() => setJsonOpen(!jsonOpen)}
                style={{
                  marginTop: 16,
                  fontSize: 12,
                  color: "#C24A00",
                  fontWeight: 600,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0
                }}
              >
                {jsonOpen ? "▼ Hide Full JSON" : "▶ Full Metadata JSON"}
              </button>
              {jsonOpen && (
                <pre
                  style={{
                    marginTop: 8,
                    padding: 12,
                    backgroundColor: "#F0F4F8",
                    borderRadius: 8,
                    fontSize: 11,
                    fontFamily: "DM Mono, monospace",
                    overflow: "auto",
                    maxHeight: 240,
                    color: "#3D5A80"
                  }}
                >
                  {JSON.stringify(meta, null, 2)}
                </pre>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
