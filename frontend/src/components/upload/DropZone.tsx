"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UploadCloud, FileText, CheckCircle, X } from "lucide-react";
import api from "../../lib/api";
import MonoChip from "../ui/MonoChip";

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

type ZoneState = "idle" | "selected" | "uploading" | "success" | "error";

export default function DropZone() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [zoneState, setZoneState] = useState<ZoneState>("idle");
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [dragHover, setDragHover] = useState(false);
  const [redirectTimer, setRedirectTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const reset = () => {
    setFile(null);
    setDocumentId(null);
    setError("");
    setZoneState("idle");
    if (inputRef.current) inputRef.current.value = "";
    if (redirectTimer) clearTimeout(redirectTimer);
  };

  const pickFile = (next?: File | null) => {
    if (!next) return;
    setFile(next);
    setError("");
    setDocumentId(null);
    setZoneState("selected");
  };

  const onUpload = async () => {
    if (!file) return;
    setZoneState("uploading");
    setError("");
    const form = new FormData();
    form.append("file", file);
    try {
      const response = await api.post("/documents/upload", form);
      setDocumentId(response.data.documentId);
      setZoneState("success");
      setFile(null);
      const t = setTimeout(() => router.push(`/documents/${response.data.documentId}`), 1500);
      setRedirectTimer(t);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message ||
        "Upload failed";
      setError(Array.isArray(msg) ? msg.join(", ") : String(msg));
      setZoneState("error");
    }
  };

  useEffect(() => () => {
    if (redirectTimer) clearTimeout(redirectTimer);
  }, [redirectTimer]);

  const zoneHeight = zoneState === "selected" ? 80 : 240;
  const isDisabled = zoneState === "uploading";

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!isDisabled) setDragHover(true);
        }}
        onDragLeave={() => setDragHover(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragHover(false);
          if (!isDisabled) pickFile(e.dataTransfer.files?.[0]);
        }}
        style={{
          height: zoneHeight,
          borderRadius: 12,
          border: `2px dashed ${zoneState === "error" ? "var(--state-failed)" : dragHover ? "var(--accent)" : "var(--border)"}`,
          background: dragHover ? "var(--accent-dim)" : "transparent",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
          opacity: isDisabled ? 0.6 : 1,
          transition: "all 0.2s ease",
          cursor: isDisabled ? "not-allowed" : "pointer"
        }}
        onClick={() => !isDisabled && zoneState !== "selected" && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          style={{ display: "none" }}
          onChange={(e) => pickFile(e.target.files?.[0])}
        />

        {zoneState === "idle" || zoneState === "error" ? (
          <>
            <UploadCloud size={36} style={{ color: "var(--text-muted)", marginBottom: 8 }} />
            <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: 0 }}>Drag & drop a PDF here</p>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "8px 0" }}>or</p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                inputRef.current?.click();
              }}
              style={{
                fontSize: 13,
                color: "var(--accent)",
                border: "1px solid var(--accent)",
                borderRadius: 6,
                background: "transparent",
                padding: "6px 14px",
                cursor: "pointer"
              }}
            >
              Browse files
            </button>
          </>
        ) : null}

        {zoneState === "selected" && file ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12, width: "100%" }}>
            <FileText size={20} style={{ color: "var(--accent)" }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="mono" style={{ fontSize: 13, margin: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
                {file.name}
              </p>
              <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>{formatBytes(file.size)}</p>
            </div>
            <button type="button" onClick={(e) => { e.stopPropagation(); reset(); }} style={{ background: "none", border: "none", cursor: "pointer" }}>
              <X size={16} color="var(--text-muted)" />
            </button>
          </div>
        ) : null}

        {zoneState === "success" ? (
          <div className="animate-scale-in" style={{ textAlign: "center" }}>
            <CheckCircle size={28} style={{ color: "var(--state-done)", marginBottom: 8 }} />
            <p style={{ fontSize: 13, color: "var(--state-done)", margin: 0 }}>Upload complete</p>
            {documentId ? (
              <div style={{ marginTop: 8 }}>
                <MonoChip value={documentId} size="sm" />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {zoneState === "selected" && file ? (
        <button
          type="button"
          onClick={onUpload}
          style={{
            marginTop: 12,
            width: "100%",
            padding: "10px",
            background: "var(--accent)",
            color: "var(--bg-page)",
            border: "none",
            borderRadius: 8,
            fontWeight: 500,
            cursor: "pointer"
          }}
        >
          Upload document
        </button>
      ) : null}

      {zoneState === "uploading" ? (
        <div style={{ marginTop: 12 }}>
          <div
            style={{
              height: 4,
              width: "100%",
              background: "var(--bg-raised)",
              borderRadius: 2,
              overflow: "hidden",
              position: "relative"
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                width: "40%",
                background: "var(--accent)",
                animation: "shimmer 1.2s ease-in-out infinite"
              }}
            />
          </div>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 8 }}>Uploading…</p>
        </div>
      ) : null}

      {zoneState === "success" && documentId ? (
        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
          <Link
            href={`/documents/${documentId}`}
            style={{
              flex: 1,
              textAlign: "center",
              padding: "8px",
              border: "1px solid var(--accent)",
              borderRadius: 8,
              color: "var(--accent)",
              fontSize: 13
            }}
          >
            View pipeline →
          </Link>
          <button
            type="button"
            onClick={() => redirectTimer && clearTimeout(redirectTimer)}
            style={{
              padding: "8px 12px",
              border: "1px solid var(--border)",
              borderRadius: 8,
              background: "transparent",
              color: "var(--text-muted)",
              fontSize: 12,
              cursor: "pointer"
            }}
          >
            Stay
          </button>
        </div>
      ) : null}

      {zoneState === "error" ? (
        <div style={{ marginTop: 12 }}>
          <p style={{ fontSize: 13, color: "var(--state-failed)", margin: "0 0 8px" }}>
            Upload failed — {error}
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              fontSize: 13,
              padding: "6px 12px",
              border: "1px solid var(--border)",
              borderRadius: 6,
              background: "transparent",
              color: "var(--text-secondary)",
              cursor: "pointer"
            }}
          >
            Try again
          </button>
        </div>
      ) : null}
    </div>
  );
}
