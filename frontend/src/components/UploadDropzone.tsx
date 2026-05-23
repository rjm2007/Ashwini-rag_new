"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  UploadCloud,
  FileText,
  CheckCircle,
  AlertCircle,
  Info,
  X
} from "lucide-react";
import api from "../lib/api";

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export default function UploadDropzone() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [dragHover, setDragHover] = useState(false);

  const reset = () => {
    setFile(null);
    setDocumentId(null);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const pickFile = (next?: File | null) => {
    if (!next) return;
    setFile(next);
    setError("");
    setDocumentId(null);
  };

  const onUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError("");
    const form = new FormData();
    form.append("file", file);
    try {
      const response = await api.post("/documents/upload", form);
      setDocumentId(response.data.documentId);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Upload failed.";
      setError(Array.isArray(msg) ? msg.join(", ") : String(msg));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
          backgroundColor: "#FFF0E6",
          border: "1px solid #FFD4B2",
          borderRadius: 8,
          padding: "10px 16px",
          marginBottom: 16
        }}
      >
        <Info size={16} color="#FF6200" style={{ marginTop: 2, flexShrink: 0 }} />
        <p style={{ fontSize: 13, color: "#3D5A80", margin: 0 }}>
          Upload warranty PDFs for AI processing. Text-based and scanned PDFs supported. Max 50MB.
        </p>
      </div>

      {documentId ? (
        <div className="card" style={{ padding: 32, textAlign: "center" }}>
          <CheckCircle size={40} color="#16A34A" style={{ margin: "0 auto 12px" }} />
          <p style={{ fontSize: 16, fontWeight: 600, color: "#16A34A" }}>Upload successful!</p>
          <div
            style={{
              marginTop: 12,
              padding: "8px 12px",
              backgroundColor: "#F0F4F8",
              border: "1px solid #D1DCE8",
              borderRadius: 8,
              fontFamily: "DM Mono, monospace",
              fontSize: 12,
              color: "#0A1628"
            }}
          >
            {documentId}
          </div>
          <div style={{ marginTop: 16, display: "flex", gap: 8, justifyContent: "center" }}>
            <Link
              href={`/documents/${documentId}`}
              style={{
                backgroundColor: "#FF6200",
                color: "white",
                padding: "8px 16px",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                textDecoration: "none"
              }}
            >
              View Document
            </Link>
            <button
              type="button"
              onClick={reset}
              style={{
                padding: "8px 16px",
                border: "1px solid #D1DCE8",
                borderRadius: 8,
                background: "white",
                fontSize: 14,
                cursor: "pointer"
              }}
            >
              Upload Another
            </button>
          </div>
        </div>
      ) : file ? (
        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <FileText size={20} color="#FF6200" />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 500, color: "#0A1628", margin: 0 }}>{file.name}</p>
              <p style={{ fontSize: 12, color: "#7A92A8", margin: 0 }}>{formatBytes(file.size)}</p>
            </div>
            {!uploading && (
              <button type="button" onClick={reset} style={{ border: "none", background: "none", cursor: "pointer" }}>
                <X size={16} color="#7A92A8" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onUpload}
            disabled={uploading}
            style={{
              width: "100%",
              padding: "10px",
              backgroundColor: uploading ? "#E05500" : "#FF6200",
              color: "white",
              border: "none",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: uploading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8
            }}
          >
            {uploading ? (
              <>
                <span
                  style={{
                    width: 14,
                    height: 14,
                    border: "2px solid rgba(255,255,255,0.3)",
                    borderTopColor: "white",
                    borderRadius: "50%",
                    animation: "spin 0.7s linear infinite",
                    display: "inline-block"
                  }}
                />
                Processing...
              </>
            ) : (
              "Upload PDF"
            )}
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragHover(true);
          }}
          onDragLeave={() => setDragHover(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragHover(false);
            pickFile(e.dataTransfer.files?.[0]);
          }}
          style={{
            border: `2px dashed ${dragHover ? "#FF6200" : "#D1DCE8"}`,
            borderRadius: 16,
            padding: "48px 24px",
            textAlign: "center",
            backgroundColor: dragHover ? "#FFF0E6" : "#FAFBFC",
            transition: "all 0.2s ease"
          }}
        >
          <UploadCloud size={48} color="#A8BCCF" style={{ margin: "0 auto" }} />
          <p style={{ fontSize: 14, fontWeight: 500, color: "#3D5A80", marginTop: 12 }}>
            Drag and drop your warranty PDF here
          </p>
          <p style={{ fontSize: 12, color: "#7A92A8", marginTop: 8 }}>— or —</p>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            style={{
              marginTop: 12,
              backgroundColor: "#F0F4F8",
              border: "1px solid #D1DCE8",
              color: "#0A1628",
              padding: "8px 20px",
              borderRadius: 8,
              fontSize: 14,
              cursor: "pointer"
            }}
          >
            Browse files
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0])}
          />
        </div>
      )}

      {error ? (
        <div
          style={{
            marginTop: 16,
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            backgroundColor: "#FEF2F2",
            border: "1px solid #FCA5A5",
            borderRadius: 8,
            padding: "12px 16px"
          }}
        >
          <AlertCircle size={16} color="#DC2626" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, color: "#DC2626", margin: 0 }}>{error}</p>
            <button
              type="button"
              onClick={reset}
              style={{
                marginTop: 8,
                padding: "6px 12px",
                backgroundColor: "#DC2626",
                color: "white",
                border: "none",
                borderRadius: 6,
                fontSize: 12,
                cursor: "pointer"
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
