import { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import MonoChip from "./MonoChip";
import PageChip from "./PageChip";
import type { FieldWrapper } from "../../lib/types";

function isVin(value: unknown): boolean {
  if (typeof value !== "string") return false;
  return /^[A-HJ-NPR-Z0-9]{17}$/i.test(value.trim());
}

export default function FieldRow({
  label,
  fieldWrapper
}: {
  label: string;
  fieldWrapper?: FieldWrapper | null;
}) {
  const fw = fieldWrapper;
  const status = fw?.status ?? "missing";
  const value = fw?.value;
  const confidence = fw?.confidence ?? 0;
  const page = fw?.page;

  let right: ReactNode = null;

  if (status === "not_applicable") {
    right = <span style={{ color: "var(--text-muted)" }}>-</span>;
  } else if (status === "missing" || value == null) {
    right = (
      <span style={{ color: "var(--text-muted)", fontStyle: "italic", fontSize: 12 }}>
        Not found in document
      </span>
    );
  } else if (status === "low_confidence") {
    const display = String(value);
    right = (
      <span style={{ display: "flex", alignItems: "center", gap: 4, fontWeight: 500, color: "var(--text-primary)" }}>
        {isVin(display) ? <MonoChip value={display} /> : display}
        <AlertTriangle size={12} style={{ color: "#ECC94B" }} />
        <span className="mono" style={{ fontSize: 10, color: "#ECC94B" }}>
          {Math.round(confidence * 100)}%
        </span>
        {page != null ? <PageChip page={page} /> : null}
      </span>
    );
  } else {
    const display = String(value);
    right = (
      <span style={{ display: "flex", alignItems: "center", fontWeight: 500, color: "var(--text-primary)" }}>
        {isVin(display) ? <MonoChip value={display} /> : display}
        {page != null ? <PageChip page={page} /> : null}
      </span>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "5px 0",
        borderBottom: "1px solid var(--border)",
        gap: 12
      }}
    >
      <span style={{ fontSize: 12, color: "var(--text-secondary)", flexShrink: 0 }}>{label}</span>
      <span style={{ textAlign: "right", fontSize: 13 }}>{right}</span>
    </div>
  );
}
