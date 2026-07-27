"use client";

import { useEffect, useState } from "react";
import api from "../lib/api";

interface MetadataEditorProps {
  document: any;
  readOnly?: boolean;
}

export default function MetadataEditor({ document, readOnly = false }: MetadataEditorProps) {
  const [make, setMake] = useState(document?.make || "");
  const [model, setModel] = useState(document?.model || "");
  const [year, setYear] = useState(String(document?.year || ""));
  const [warrantyType, setWarrantyType] = useState(document?.warrantyType || "");
  const [country, setCountry] = useState(document?.country || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setMake(document?.make || "");
    setModel(document?.model || "");
    setYear(String(document?.year || ""));
    setWarrantyType(document?.warrantyType || "");
    setCountry(document?.country || "");
  }, [document]);

  const inputStyle = {
    width: "100%",
    padding: "8px 12px",
    border: "1px solid var(--border)",
    borderRadius: 8,
    fontSize: 14,
    color: "var(--text-primary)",
    outline: "none",
    fontFamily: "DM Sans, sans-serif",
    boxSizing: "border-box" as const
  };

  const labelStyle = {
    display: "block" as const,
    fontSize: 12,
    fontWeight: 600,
    color: "var(--text-muted)",
    marginBottom: 6,
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em"
  };

  const save = async () => {
    if (!document?.id) return;
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      await api.patch(`/review/${document.id}/metadata`, {
        make: make || undefined,
        model: model || undefined,
        year: year ? Number(year) : undefined,
        warrantyType: warrantyType || undefined,
        country: country || undefined
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const fields = [
    { label: "Make", value: make, setter: setMake, placeholder: "e.g. Freightliner" },
    { label: "Model", value: model, setter: setModel, placeholder: "e.g. Cascadia" },
    { label: "Year", value: year, setter: setYear, placeholder: "e.g. 2023" },
    { label: "Warranty Type", value: warrantyType, setter: setWarrantyType, placeholder: "e.g. Powertrain" },
    { label: "Country", value: country, setter: setCountry, placeholder: "e.g. USA" }
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {fields.map((f) => (
        <div key={f.label}>
          <label style={labelStyle}>{f.label}</label>
          {readOnly ? (
            <p style={{ fontSize: 14, color: "var(--text-primary)", fontWeight: 500, padding: "4px 0" }}>
              {f.value || "—"}
            </p>
          ) : (
            <input
              style={inputStyle}
              value={f.value}
              onChange={(e) => f.setter(e.target.value)}
              placeholder={f.placeholder}
              onFocus={(e) => {
                e.target.style.borderColor = "var(--accent)";
                e.target.style.boxShadow = "0 0 0 3px var(--accent-soft)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "var(--border)";
                e.target.style.boxShadow = "none";
              }}
            />
          )}
        </div>
      ))}

      {!readOnly && (
        <div style={{ marginTop: 4 }}>
          {error && <p style={{ fontSize: 13, color: "var(--state-failed)", marginBottom: 8 }}>{error}</p>}
          {saved && <p style={{ fontSize: 13, color: "var(--state-done)", marginBottom: 8 }}>✓ Changes saved</p>}
          <button
            onClick={save}
            disabled={saving}
            style={{
              width: "100%",
              padding: "10px",
              backgroundColor: saving ? "var(--bg-raised)" : "var(--accent)",
              color: saving ? "var(--text-muted)" : "white",
              border: "none",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: saving ? "not-allowed" : "pointer",
              transition: "background-color 0.15s ease"
            }}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      )}
    </div>
  );
}
