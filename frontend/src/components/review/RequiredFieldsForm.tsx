"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { patchReviewMetadata } from "../../lib/api";
import type { DocumentDetail } from "../../lib/types";

export default function RequiredFieldsForm({
  document,
  onSaved
}: {
  document: DocumentDetail;
  onSaved: () => void;
}) {
  const meta = document.metadataJson || {};
  const [make, setMake] = useState(document.make || "");
  const [model, setModel] = useState(document.model || "");
  const [year, setYear] = useState(document.year ? String(document.year) : "");
  const [vin, setVin] = useState(String(meta.vin || ""));
  const [chassisId, setChassisId] = useState(String(meta.chassis_id || ""));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setMake(document.make || "");
    setModel(document.model || "");
    setYear(document.year ? String(document.year) : "");
    setVin(String((document.metadataJson || {}).vin || ""));
    setChassisId(String((document.metadataJson || {}).chassis_id || ""));
  }, [document]);

  if (document.requiredFieldsMissing === false) {
    return (
      <div
        style={{
          margin: "16px 20px 0",
          padding: "12px 16px",
          background: "rgba(63, 185, 80, 0.08)",
          border: "1px solid var(--state-done)",
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 13,
          color: "var(--state-done)"
        }}
      >
        <CheckCircle2 size={16} />
        Fields verified — admin can certify
      </div>
    );
  }

  const save = async () => {
    if (!document.id) return;
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      await patchReviewMetadata(document.id, {
        make: make.trim() || undefined,
        model: model.trim() || undefined,
        year: year.trim() ? parseInt(year, 10) : undefined,
        vin: vin.trim() || undefined,
        chassisId: chassisId.trim() || undefined
      });
      setSaved(true);
      onSaved();
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const labelStyle = {
    display: "block" as const,
    fontSize: 12,
    color: "var(--text-secondary)",
    marginBottom: 4
  };
  const requiredLabel = { ...labelStyle, color: "var(--state-failed)" };
  const inputStyle = {
    width: "100%",
    padding: "7px 10px",
    fontSize: 13,
    color: "var(--text-primary)",
    background: "var(--bg-raised)",
    border: "1px solid var(--border)",
    borderRadius: 6,
    outline: "none",
    boxSizing: "border-box" as const
  };

  return (
    <div
      style={{
        margin: "16px 20px 0",
        padding: 16,
        background: "var(--warn-bg)",
        border: "1px solid var(--warn-border)",
        borderRadius: 8
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 12 }}>
        <AlertTriangle size={16} style={{ color: "var(--state-failed)", flexShrink: 0, marginTop: 2 }} />
        <div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "var(--state-failed)" }}>
            Required fields missing before certification
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
            Fill Make and Model. Admin cannot certify until these are set.
          </p>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          marginBottom: 12
        }}
      >
        <div>
          <label style={requiredLabel}>Make *</label>
          <input style={inputStyle} value={make} onChange={(e) => setMake(e.target.value)} placeholder="e.g. Volvo Truck" />
        </div>
        <div>
          <label style={requiredLabel}>Model *</label>
          <input style={inputStyle} value={model} onChange={(e) => setModel(e.target.value)} placeholder="e.g. VNL64T" />
        </div>
        <div>
          <label style={labelStyle}>Year</label>
          <input style={inputStyle} value={year} onChange={(e) => setYear(e.target.value)} placeholder="e.g. 2019" />
        </div>
        <div>
          <label style={labelStyle}>VIN (optional)</label>
          <input style={inputStyle} value={vin} onChange={(e) => setVin(e.target.value)} placeholder="17-character VIN" />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={labelStyle}>Chassis ID (optional)</label>
          <input style={inputStyle} value={chassisId} onChange={(e) => setChassisId(e.target.value)} placeholder="e.g. 218380" />
        </div>
      </div>

      {error ? <p style={{ fontSize: 12, color: "var(--state-failed)", margin: "0 0 8px" }}>{error}</p> : null}
      {saved ? (
        <p style={{ fontSize: 12, color: "var(--state-done)", margin: "0 0 8px" }}>
          Fields saved. Admin can now certify.
        </p>
      ) : null}

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          disabled={saving}
          onClick={save}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 14px",
            fontSize: 13,
            color: "var(--accent)",
            background: "transparent",
            border: "1px solid var(--accent)",
            borderRadius: 6,
            cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.7 : 1
          }}
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : null}
          {saving ? "Saving…" : "Save fields →"}
        </button>
      </div>
    </div>
  );
}
