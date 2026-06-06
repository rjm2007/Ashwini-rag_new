"use client";

import { Info } from "lucide-react";
import { motion } from "framer-motion";
import type { MasterSchema, FieldWrapper } from "../../lib/types";

interface KeyInformationProps {
  masterSchema: MasterSchema;
}

function extractValue(fw?: FieldWrapper | null): string | null {
  if (!fw || fw.status === "missing" || fw.value == null) return null;
  return String(fw.value);
}

interface FieldEntry {
  label: string;
  value: string | null;
  isMono: boolean;
}

function getFields(schema: MasterSchema): FieldEntry[] {
  const vehicle = schema.vehicle || {};
  const profiles = schema.profiles || {};
  const warranty = profiles.warranty_certificate;
  const coverageSummary = warranty?.coverage_summary;

  const make = extractValue(vehicle.make as FieldWrapper);
  const model = extractValue(vehicle.model as FieldWrapper);
  const vehicleName =
    make && model ? `${make} ${model}` : make || model || null;

  // Try to get coverage code from coverage_code_table or warranty profile
  const codeTable = profiles.coverage_code_table;
  let coverageCode: string | null = null;
  if (codeTable?.coverage_codes && codeTable.coverage_codes.length > 0) {
    coverageCode = extractValue(codeTable.coverage_codes[0].code as FieldWrapper);
  }

  // Coverage period / dates from coverage_summary or document
  const doc = schema.document || {};
  const coverageStart =
    extractValue(coverageSummary?.start_date as FieldWrapper) ||
    extractValue(doc.effective_date as FieldWrapper);
  const coverageEnd =
    extractValue(coverageSummary?.end_date as FieldWrapper) ||
    extractValue(doc.expiration_date as FieldWrapper);
  const coveragePeriod =
    extractValue(coverageSummary?.coverage_period as FieldWrapper) ||
    extractValue(coverageSummary?.duration as FieldWrapper);

  // Status
  const status = extractValue(doc.status as FieldWrapper) || extractValue(doc.document_type as FieldWrapper);

  return [
    { label: "Vehicle", value: vehicleName, isMono: false },
    { label: "VIN", value: extractValue(vehicle.vin as FieldWrapper), isMono: true },
    { label: "Coverage Code", value: coverageCode, isMono: true },
    { label: "Coverage Period", value: coveragePeriod, isMono: false },
    { label: "Coverage Start", value: coverageStart, isMono: true },
    { label: "Coverage End", value: coverageEnd, isMono: true },
    { label: "Status", value: status, isMono: false },
  ];
}

export default function KeyInformation({ masterSchema }: KeyInformationProps) {
  const fields = getFields(masterSchema);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--r-md)",
        boxShadow: "var(--shadow-xs)",
        padding: "20px 24px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 16,
        }}
      >
        <Info size={16} style={{ color: "var(--accent)" }} />
        <h3
          style={{
            margin: 0,
            fontSize: 14,
            fontWeight: 600,
            color: "var(--text-primary)",
          }}
        >
          Key Information
        </h3>
      </div>

      {/* 2-column grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0",
        }}
      >
        {fields.map((field, index) => (
          <div
            key={field.label}
            style={{
              padding: "10px 0",
              borderBottom:
                index < fields.length - 1 ? "1px solid var(--border)" : "none",
              gridColumn: index === fields.length - 1 && fields.length % 2 !== 0 ? "1 / -1" : undefined,
            }}
          >
            <span
              style={{
                display: "block",
                fontSize: 11,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                marginBottom: 4,
              }}
            >
              {field.label}
            </span>
            <span
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 500,
                color: field.value
                  ? "var(--text-primary)"
                  : "var(--text-muted)",
                fontFamily: field.isMono && field.value
                  ? "'IBM Plex Mono', monospace"
                  : "inherit",
              }}
            >
              {field.value || "—"}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
