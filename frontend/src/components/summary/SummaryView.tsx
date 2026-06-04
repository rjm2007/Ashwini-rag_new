"use client";

import { useState } from "react";
import {
  FileText,
  Truck,
  ShieldCheck,
  Table,
  Receipt,
  Layers,
  ChevronDown
} from "lucide-react";
import SectionCard from "../ui/SectionCard";
import FieldRow from "../ui/FieldRow";
import MonoChip from "../ui/MonoChip";
import type { FieldWrapper, MasterSchema } from "../../lib/types";

const DOC_FIELDS = [
  ["document_type", "Document type"],
  ["issuer", "Issuer"],
  ["document_date", "Document date"],
  ["effective_date", "Effective date"],
  ["expiration_date", "Expiration date"],
  ["source_system", "Source system"],
  ["language", "Language"]
] as const;

const VEHICLE_FIELDS = [
  ["make", "Make"],
  ["model", "Model"],
  ["model_year", "Model year"],
  ["vin", "VIN"],
  ["chassis_id", "Chassis ID"],
  ["marketing_type", "Marketing type"],
  ["in_service_date", "In service date"],
  ["meter_reading", "Meter reading"]
] as const;

function getProfile(summary: MasterSchema) {
  const docType = summary.document?.document_type?.value as string | undefined;
  const type = (docType || "generic_document").toLowerCase();
  return { type, profile: summary.profiles?.[type as keyof typeof summary.profiles] };
}

function VinFieldRow({ label, fw }: { label: string; fw?: FieldWrapper | null }) {
  if (!fw || fw.status === "missing" || fw.value == null) {
    return <FieldRow label={label} fieldWrapper={fw} />;
  }
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "5px 0",
        borderBottom: "1px solid var(--border)"
      }}
    >
      <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{label}</span>
      <MonoChip value={String(fw.value)} />
    </div>
  );
}

export default function SummaryView({
  summary,
  fallbackTitle,
  aiSummaryText
}: {
  summary: MasterSchema;
  fallbackTitle?: string;
  aiSummaryText?: string | null;
}) {
  const { type, profile } = getProfile(summary);
  const extracted = summary.quality?.fields_extracted ?? 0;
  const missing = summary.quality?.fields_missing ?? 0;
  const title =
    summary.document?.title?.value != null
      ? String(summary.document.title.value)
      : fallbackTitle || "Document";

  return (
    <div style={{ padding: 20 }}>
      {aiSummaryText !== undefined && (
        <div
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "16px 20px",
            marginBottom: 16
          }}
        >
          <p
            style={{
              margin: "0 0 8px",
              fontSize: 11,
              fontWeight: 500,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.04em"
            }}
          >
            AI Summary
          </p>
          {aiSummaryText ? (
            <p
              style={{
                margin: 0,
                fontSize: 14,
                lineHeight: 1.7,
                color: "var(--text-primary)",
                fontStyle: "italic"
              }}
            >
              {aiSummaryText}
            </p>
          ) : (
            <p style={{ margin: 0, fontSize: 13, color: "var(--accent)" }}>Generating…</p>
          )}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 500, margin: 0, color: "var(--text-primary)" }}>{title}</h2>
        <span
          className="mono"
          style={{
            fontSize: 12,
            padding: "4px 10px",
            background: "var(--bg-raised)",
            borderRadius: 4,
            color: "var(--text-secondary)"
          }}
        >
          {extracted}/{extracted + missing} fields extracted
        </span>
      </div>

      <SectionCard icon={FileText} title="Document">
        {DOC_FIELDS.map(([key, label]) => (
          <FieldRow key={key} label={label} fieldWrapper={summary.document?.[key] as FieldWrapper} />
        ))}
      </SectionCard>

      <SectionCard icon={Truck} title="Vehicle">
        {VEHICLE_FIELDS.map(([key, label]) =>
          key === "vin" ? (
            <VinFieldRow key={key} label={label} fw={summary.vehicle?.[key] as FieldWrapper} />
          ) : (
            <FieldRow key={key} label={label} fieldWrapper={summary.vehicle?.[key] as FieldWrapper} />
          )
        )}
      </SectionCard>

      {type === "warranty_certificate" && profile ? (
        <WarrantyProfile profile={profile as Record<string, unknown>} />
      ) : null}
      {type === "coverage_code_table" && profile ? (
        <CoverageTableProfile profile={profile as Record<string, unknown>} />
      ) : null}
      {type === "repair_invoice" && profile ? (
        <InvoiceProfile profile={profile as Record<string, unknown>} />
      ) : null}
      {type === "generic_document" && profile ? (
        <SectionCard icon={FileText} title="Extracted Content">
          {Object.entries(profile as Record<string, FieldWrapper>).map(([key, fw]) => (
            <FieldRow key={key} label={key.replace(/_/g, " ")} fieldWrapper={fw} />
          ))}
        </SectionCard>
      ) : null}

      {summary.extensions && summary.extensions.length > 0 ? (
        <ExtensionsAccordion extensions={summary.extensions} />
      ) : null}
    </div>
  );
}

function WarrantyProfile({ profile }: { profile: Record<string, unknown> }) {
  const coverage = profile.coverage_summary as Record<string, FieldWrapper> | undefined;
  const components = profile.covered_components as Array<Record<string, FieldWrapper>> | undefined;
  const exclusions = profile.exclusions as Array<{ clause_no?: FieldWrapper; title?: FieldWrapper; text?: FieldWrapper }> | undefined;
  const towing = profile.towing as Record<string, FieldWrapper> | undefined;

  return (
    <SectionCard icon={ShieldCheck} title="Warranty Coverage">
      {coverage
        ? Object.entries(coverage).map(([key, fw]) => (
            <FieldRow key={key} label={key.replace(/_/g, " ")} fieldWrapper={fw} />
          ))
        : null}
      {components && components.length > 0 ? (
        <div style={{ marginTop: 12, overflowX: "auto" }}>
          <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ color: "var(--text-muted)", textAlign: "left" }}>
                <th style={{ padding: "6px 8px" }}>Component</th>
                <th>Tier</th>
                <th>Qualifications</th>
                <th>Limits</th>
              </tr>
            </thead>
            <tbody>
              {components.map((row, i) => (
                <tr key={i} style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={{ padding: "6px 8px" }}>{String(row.component?.value ?? "—")}</td>
                  <td>{String(row.tier?.value ?? "—")}</td>
                  <td>{String(row.qualifications?.value ?? "—")}</td>
                  <td>
                    {[row.limit_duration?.value, row.limit_distance?.value].filter(Boolean).join(" / ") || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {exclusions && exclusions.length > 0 ? (
        <ol style={{ margin: "12px 0 0", paddingLeft: 20, fontSize: 12, color: "var(--text-secondary)" }}>
          {exclusions.map((ex, i) => (
            <ExclusionItem key={i} ex={ex} />
          ))}
        </ol>
      ) : null}
      {towing ? (
        <div style={{ marginTop: 12 }}>
          <FieldRow label="Towing covered" fieldWrapper={towing.covered} />
          <FieldRow label="Cap" fieldWrapper={towing.cap_amount} />
          <FieldRow label="Conditions" fieldWrapper={towing.conditions} />
        </div>
      ) : null}
    </SectionCard>
  );
}

function ExclusionItem({
  ex
}: {
  ex: { clause_no?: FieldWrapper; title?: FieldWrapper; text?: FieldWrapper };
}) {
  const [open, setOpen] = useState(false);
  const text = String(ex.text?.value ?? "");
  const line = `${ex.clause_no?.value ?? ""}. ${ex.title?.value ?? ""} — ${text.slice(0, 80)}${text.length > 80 ? "…" : ""}`;
  return (
    <li style={{ marginBottom: 6, cursor: text.length > 80 ? "pointer" : "default" }} onClick={() => setOpen(!open)}>
      {open ? text : line}
    </li>
  );
}

function CoverageTableProfile({ profile }: { profile: Record<string, unknown> }) {
  const codes = profile.coverage_codes as Array<Record<string, FieldWrapper>> | undefined;
  return (
    <SectionCard icon={Table} title="Coverage Codes">
      {codes && codes.length > 0 ? (
        <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ color: "var(--text-muted)" }}>
              <th style={{ padding: "6px 8px" }}>Code</th>
              <th>Description</th>
              <th>Duration</th>
              <th>Start → End</th>
            </tr>
          </thead>
          <tbody>
            {codes.map((row, i) => (
              <tr key={i} style={{ borderTop: "1px solid var(--border)" }}>
                <td style={{ padding: "6px 8px" }}>
                  {row.code?.value != null ? <MonoChip value={String(row.code.value)} size="sm" /> : "—"}
                </td>
                <td>{String(row.description?.value ?? "—")}</td>
                <td>{String(row.duration?.value ?? "—")}</td>
                <td>
                  {String(row.start_date?.value ?? "—")} → {String(row.end_date?.value ?? "—")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p style={{ color: "var(--text-muted)", fontSize: 12 }}>No coverage codes extracted</p>
      )}
    </SectionCard>
  );
}

function InvoiceProfile({ profile }: { profile: Record<string, unknown> }) {
  const lineItems = profile.line_items as Array<Record<string, FieldWrapper>> | undefined;
  const totals = profile.totals as Record<string, FieldWrapper> | undefined;

  return (
    <SectionCard icon={Receipt} title="Invoice">
      <FieldRow label="Invoice no" fieldWrapper={profile.invoice_no as FieldWrapper} />
      <FieldRow label="Date" fieldWrapper={profile.invoice_date as FieldWrapper} />
      <FieldRow label="Customer" fieldWrapper={profile.customer as FieldWrapper} />
      <FieldRow label="Complaint" fieldWrapper={profile.complaint as FieldWrapper} />
      <FieldRow label="Correction" fieldWrapper={profile.correction as FieldWrapper} />
      {lineItems && lineItems.length > 0 ? (
        <table style={{ width: "100%", fontSize: 12, marginTop: 12, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ color: "var(--text-muted)" }}>
              <th>Part No</th>
              <th>Description</th>
              <th>Qty</th>
              <th>Unit</th>
              <th>Extended</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((row, i) => (
              <tr key={i} style={{ borderTop: "1px solid var(--border)" }}>
                <td>{String(row.part_no?.value ?? "—")}</td>
                <td>{String(row.description?.value ?? "—")}</td>
                <td>{String(row.quantity?.value ?? "—")}</td>
                <td>{String(row.unit_price?.value ?? "—")}</td>
                <td>{String(row.extended_price?.value ?? "—")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      {totals ? (
        <div style={{ marginTop: 12 }}>
          {["parts_total", "labor_total", "core_charge", "tax_total", "grand_total"].map((k) =>
            totals[k] ? (
              <FieldRow key={k} label={k.replace(/_/g, " ")} fieldWrapper={totals[k]} />
            ) : null
          )}
        </div>
      ) : null}
    </SectionCard>
  );
}

function ExtensionsAccordion({ extensions }: { extensions: MasterSchema["extensions"] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <SectionCard icon={Layers} title="Additional Sections">
      {extensions?.map((ext, i) => {
        const id = ext.section_id || String(i);
        const isOpen = openId === id;
        return (
          <div key={id} style={{ borderBottom: "1px solid var(--border)", padding: "8px 0" }}>
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: "100%",
                background: "none",
                border: "none",
                color: "var(--text-primary)",
                cursor: "pointer",
                fontSize: 13,
                textAlign: "left"
              }}
            >
              <ChevronDown
                size={14}
                style={{ transform: isOpen ? "rotate(180deg)" : "none", color: "var(--text-muted)" }}
              />
              {ext.heading || ext.label || `Section ${i + 1}`}
            </button>
            {isOpen ? (
              <div style={{ paddingLeft: 22, marginTop: 8 }}>
                {ext.summary ? (
                  <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>{ext.summary}</p>
                ) : null}
                {ext.raw_fields
                  ? Object.entries(ext.raw_fields).map(([k, fw]) => (
                      <FieldRow key={k} label={k} fieldWrapper={fw} />
                    ))
                  : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </SectionCard>
  );
}

export function SummarySkeleton() {
  return (
    <div style={{ padding: 20 }}>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            height: 120,
            background: "var(--bg-raised)",
            borderRadius: 10,
            marginBottom: 12,
            animation: "breathe 1.4s ease-in-out infinite",
            animationDelay: `${i * 200}ms`
          }}
        />
      ))}
    </div>
  );
}
