"use client";

import { useState } from "react";
import api from "../lib/api";

export default function UploadDropzone() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    // This function stores selected PDF and waits for explicit upload click.
    const file = event.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
    setMessage("");
    setError("");
  };

  const onUpload = async () => {
    // This function uploads selected PDF file to backend endpoint.
    if (!selectedFile) {
      return;
    }
    setUploading(true);
    setMessage("");
    setError("");
    const form = new FormData();
    form.append("file", selectedFile);
    try {
      const response = await api.post("/documents/upload", form);
      setMessage(`Uploaded: ${response.data.documentId}`);
    } catch (err: any) {
      const backendMessage =
        err?.response?.data?.message || "Upload failed. Please check logs and try again.";
      setError(Array.isArray(backendMessage) ? backendMessage.join(", ") : String(backendMessage));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="rounded bg-white p-4 shadow">
      <input type="file" accept="application/pdf" onChange={onFileChange} />
      <button
        type="button"
        className="ml-3 rounded bg-blue-600 px-3 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
        onClick={onUpload}
        disabled={!selectedFile || uploading}
      >
        {uploading ? "Uploading..." : "Upload"}
      </button>
      {selectedFile && <p className="mt-2 text-xs text-slate-600">Selected: {selectedFile.name}</p>}
      {message && <p className="mt-2 text-sm text-green-700">{message}</p>}
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
