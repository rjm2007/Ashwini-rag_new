"use client";

import { useState } from "react";

export default function EligibilityForm({
  fields,
  prompt,
  onSubmit,
}: {
  fields: string[];
  prompt: string;
  onSubmit: (values: Record<string, string>) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});

  return (
    <div className="card" style={{ padding: 14, marginTop: 8 }}>
      <p style={{ fontSize: 13, margin: "0 0 12px" }}>{prompt}</p>
      {fields.includes("purchase_date") ? (
        <label style={{ display: "block", marginBottom: 10, fontSize: 12 }}>
          In-service / purchase date
          <input
            type="date"
            value={values.purchase_date || ""}
            onChange={(e) => setValues((v) => ({ ...v, purchase_date: e.target.value }))}
            style={{ display: "block", width: "100%", marginTop: 4, padding: 8 }}
          />
        </label>
      ) : null}
      {fields.includes("current_mileage") ? (
        <label style={{ display: "block", marginBottom: 10, fontSize: 12 }}>
          Current odometer
          <input
            type="number"
            value={values.current_mileage || ""}
            onChange={(e) => setValues((v) => ({ ...v, current_mileage: e.target.value }))}
            style={{ display: "block", width: "100%", marginTop: 4, padding: 8 }}
          />
        </label>
      ) : null}
      <button
        type="button"
        onClick={() => onSubmit(values)}
        style={{
          padding: "8px 14px",
          background: "var(--accent)",
          color: "var(--text-inverse)",
          border: "none",
          borderRadius: "var(--r-sm)",
          cursor: "pointer",
          fontSize: 13,
        }}
      >
        Check coverage
      </button>
    </div>
  );
}
