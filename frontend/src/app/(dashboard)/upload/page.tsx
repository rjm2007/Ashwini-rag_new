"use client";

import UploadDropzone from "../../../components/UploadDropzone";

export default function UploadPage() {
  return (
    <div className="animate-page-in" style={{ maxWidth: 640, margin: "0 auto" }}>
      <h1 className="mb-2 text-xl font-bold" style={{ color: "#0A1628" }}>
        Upload Warranty PDF
      </h1>
      <p className="mb-6 text-sm" style={{ color: "#7A92A8" }}>
        Documents enter the review pipeline after upload and become searchable once certified.
      </p>
      <UploadDropzone />
    </div>
  );
}
