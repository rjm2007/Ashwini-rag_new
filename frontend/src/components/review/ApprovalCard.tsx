"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck, Loader2, CheckCircle2, AlertCircle, Gauge, Target, ClipboardCheck,
} from "lucide-react";
import { certifyDocument, patchReviewMetadata } from "../../lib/api";
import type { DocumentMasterSchema } from "../../lib/types";
import type { DocumentDetail } from "../../lib/types";

interface ApprovalCardProps {
  docId: string;
  document: DocumentDetail;
  masterSchema?: DocumentMasterSchema;
  onApproved?: () => void;
}

type ApprovalState = "idle" | "confirming" | "loading" | "success" | "error";
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

function extractConfidence(s?: DocumentMasterSchema): number | null {
  if (!s?.quality) {
    const conf = (s as { document?: { extraction_confidence?: number } })?.document?.extraction_confidence;
    return conf != null ? Math.round(conf * 100) : null;
  }
  const { fields_extracted = 0, fields_missing = 0 } = s.quality;
  const total = fields_extracted + fields_missing;
  return total === 0 ? null : Math.round((fields_extracted / total) * 100);
}
function extractCoverage(s?: DocumentMasterSchema): number | null {
  if (!s?.quality?.overall_completeness) return null;
  return Math.round(s.quality.overall_completeness * 100);
}
function extractValidation(s?: DocumentMasterSchema): string {
  if (!s?.quality) return "Unknown";
  const low = s.quality.fields_low_confidence ?? 0;
  return low === 0 ? "Passed" : `${low} issue${low > 1 ? "s" : ""}`;
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 10px", fontSize: 13, color: "var(--text-primary)",
  background: "var(--bg-raised)", border: "1px solid var(--border)",
  borderRadius: 6, outline: "none", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 4,
};
const reqLabel: React.CSSProperties = { ...labelStyle, color: "var(--state-failed)" };

export default function ApprovalCard({
  docId, document, masterSchema, onApproved,
}: ApprovalCardProps) {
  const [state, setState] = useState<ApprovalState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const meta = (document.metadataJson || {}) as Record<string, unknown>;
  const [make, setMake] = useState(document.make || "");
  const [model, setModel] = useState(document.model || "");
  const [year, setYear] = useState(document.year ? String(document.year) : "");
  const [vin, setVin] = useState(String(meta.vin || ""));
  const [chassisId, setChassisId] = useState(String(meta.chassis_id || ""));
  const [purchaseDate, setPurchaseDate] = useState(document.assetPurchaseDate || "");
  const [currentMileage, setCurrentMileage] = useState(document.assetCurrentMileage ? String(document.assetCurrentMileage) : "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Sync from parent when document refreshes
  useEffect(() => {
    const m = (document.metadataJson || {}) as Record<string, unknown>;
    setMake(document.make || "");
    setModel(document.model || "");
    setYear(document.year ? String(document.year) : "");
    setVin(String(m.vin || ""));
    setChassisId(String(m.chassis_id || ""));
    setPurchaseDate(document.assetPurchaseDate || "");
    setCurrentMileage(document.assetCurrentMileage ? String(document.assetCurrentMileage) : "");
  }, [document]);

  const isCoverageTable = document.documentType === "coverage_code_table";
  // Client-side mirror of the backend gate: Make (+ Model unless coverage_code_table)
  const hasRequiredFields =
    !!make.trim() && (isCoverageTable || !!model.trim());

  const confidence = extractConfidence(masterSchema);
  const coverage = extractCoverage(masterSchema);
  const validation = extractValidation(masterSchema);
  const validationPassed = validation === "Passed";
  const showMetrics = !!masterSchema?.quality;

  const save = async () => {
    setSaving(true);
    setSaved(false);
    setErrorMsg("");
    try {
      await patchReviewMetadata(docId, {
        make: make.trim() || undefined,
        model: model.trim() || undefined,
        year: year.trim() ? parseInt(year, 10) : undefined,
        vin: vin.trim() || undefined,
        chassisId: chassisId.trim() || undefined,
        purchase_date: purchaseDate.trim() || undefined,
        current_mileage: currentMileage.trim() ? parseInt(currentMileage, 10) : undefined,
      });
      setSaved(true);
      onApproved?.();
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setErrorMsg(e?.response?.data?.message || e?.message || "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirm = async () => {
    setState("loading");
    setErrorMsg("");
    try {
      await certifyDocument(docId);
      setState("success");
      onApproved?.();
    } catch (err: unknown) {
      // Surface the REAL backend message, not the generic axios wrapper
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setErrorMsg(
        e?.response?.data?.message || e?.message || "Certification failed. Please try again."
      );
      setState("error");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--r-lg)",
        boxShadow: "var(--shadow-sm)",
        overflow: "hidden",
      }}
    >
      {/* ─── Header ─── */}
      <div
        style={{
          padding: "20px 24px 16px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 36, height: 36, borderRadius: "var(--r-sm)",
            background: "var(--accent-soft)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}
        >
          <ShieldCheck size={18} style={{ color: "var(--accent)" }} />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>
            Document Ready for Review
          </h3>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
            Confirm the required vehicle fields, then certify to run extraction.
          </p>
        </div>
      </div>

      {/* ─── Metric chips — only when a schema exists (post-extraction) ─── */}
      {showMetrics && (
        <div style={{ padding: "16px 24px", display: "flex", gap: 10, flexWrap: "wrap" }}>
          <MetricChip
            icon={<Gauge size={14} />}
            label="Confidence"
            value={confidence != null ? `${confidence}%` : "—"}
          />
          <MetricChip
            icon={<Target size={14} style={{ color: "var(--accent)" }} />}
            label="Coverage"
            value={coverage != null ? `${coverage}%` : "—"}
          />
          <MetricChip
            icon={<ClipboardCheck size={14} />}
            label="Validation"
            value={validation}
            ok={validationPassed}
          />
        </div>
      )}

      {/* ─── Required-fields FORM ─── */}
      <div style={{ padding: "16px 24px 8px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={reqLabel}>Make *</label>
            <input
              style={inputStyle}
              value={make}
              onChange={(e) => setMake(e.target.value)}
              placeholder="e.g. Volvo Truck"
            />
          </div>
          <div>
            <label style={isCoverageTable ? labelStyle : reqLabel}>
              Model {isCoverageTable ? "" : "*"}
            </label>
            <input
              style={inputStyle}
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="e.g. VNL64T"
            />
          </div>
          <div>
            <label style={labelStyle}>Year</label>
            <input
              style={inputStyle}
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="e.g. 2019"
            />
          </div>
          <div>
            <label style={labelStyle}>VIN (optional)</label>
            <input
              style={inputStyle}
              value={vin}
              onChange={(e) => setVin(e.target.value)}
              placeholder="17-character VIN"
            />
          </div>
          <div style={{ gridColumn: "1" }}>
            <label style={labelStyle}>Chassis ID (optional)</label>
            <input
              style={inputStyle}
              value={chassisId}
              onChange={(e) => setChassisId(e.target.value)}
              placeholder="e.g. 218380"
            />
          </div>
          <div>
            <label style={labelStyle}>Purchase Date</label>
            <input
              type="date"
              style={inputStyle}
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Current Mileage</label>
            <input
              type="number"
              style={inputStyle}
              value={currentMileage}
              onChange={(e) => setCurrentMileage(e.target.value)}
              placeholder="e.g. 120000"
            />
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 10,
          }}
        >
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
            {isCoverageTable ? "Requires Make." : "Requires Make + Model."}
          </span>
          <button
            type="button"
            disabled={saving}
            onClick={save}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 14px", fontSize: 13,
              color: "var(--accent)", background: "transparent",
              border: "1px solid var(--accent)", borderRadius: 6,
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            {saving ? "Saving…" : "Save fields"}
          </button>
        </div>
        {saved && (
          <p style={{ fontSize: 12, color: "var(--state-done)", margin: "8px 0 0" }}>
            Fields saved.
          </p>
        )}
        {errorMsg && state === "idle" && (
          <p style={{ fontSize: 12, color: "var(--state-failed)", margin: "8px 0 0" }}>
            {errorMsg}
          </p>
        )}
      </div>

      {/* ─── Action area ─── */}
      <div style={{ padding: "8px 24px 20px" }}>
        <AnimatePresence mode="wait">
          {state === "idle" && (
            <motion.button
              key="approve"
              type="button"
              onClick={() => hasRequiredFields && setState("confirming")}
              disabled={!hasRequiredFields}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              whileTap={{ scale: 0.99 }}
              title={hasRequiredFields ? "" : "Fill the required fields above first"}
              style={{
                width: "100%", padding: "12px 20px", fontSize: 14, fontWeight: 600,
                color: "#FFFFFF",
                background: hasRequiredFields ? "var(--accent)" : "var(--border-strong)",
                border: "none", borderRadius: "var(--r-sm)",
                cursor: hasRequiredFields ? "pointer" : "not-allowed",
                boxShadow: hasRequiredFields ? "var(--shadow-accent)" : "none",
                display: "flex", alignItems: "center", justifyContent: "center",
                gap: 8, letterSpacing: "0.02em",
              }}
            >
              <ShieldCheck size={16} /> APPROVE DOCUMENT
            </motion.button>
          )}

          {state === "confirming" && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              style={{
                background: "rgba(217,119,6,0.06)",
                border: "1px solid var(--conf-medium)",
                borderRadius: "var(--r-sm)",
                padding: "14px 16px",
              }}
            >
              <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--text-primary)", lineHeight: 1.5 }}>
                This will certify the document and run extraction + embedding. Proceed?
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={handleConfirm}
                  style={{
                    flex: 1, padding: "8px 16px", fontSize: 13, fontWeight: 600,
                    color: "#FFFFFF", background: "var(--accent)",
                    border: "none", borderRadius: 6, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  }}
                >
                  <CheckCircle2 size={14} /> Yes, Certify
                </button>
                <button
                  type="button"
                  onClick={() => setState("idle")}
                  style={{
                    padding: "8px 16px", fontSize: 13, fontWeight: 500,
                    color: "var(--text-secondary)",
                    background: "var(--bg-surface)", border: "1px solid var(--border)",
                    borderRadius: 6, cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}

          {state === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                gap: 8, padding: "12px", color: "var(--text-secondary)", fontSize: 13,
              }}
            >
              <Loader2 size={16} className="animate-spin" /> Certifying…
            </motion.div>
          )}

          {state === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                gap: 8, padding: "12px",
                color: "var(--state-done)", fontSize: 13, fontWeight: 600,
              }}
            >
              <CheckCircle2 size={16} /> Certified — running extraction…
            </motion.div>
          )}

          {state === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: "var(--error-bg)",
                border: "1px solid var(--state-failed)",
                borderRadius: "var(--r-sm)",
                padding: "12px 14px",
              }}
            >
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <AlertCircle
                  size={16}
                  style={{ color: "var(--state-failed)", flexShrink: 0, marginTop: 1 }}
                />
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--state-failed)", lineHeight: 1.5 }}>
                    {errorMsg}
                  </p>
                  <button
                    type="button"
                    onClick={() => setState("idle")}
                    style={{
                      marginTop: 8, padding: "4px 10px", fontSize: 12,
                      color: "var(--text-secondary)",
                      background: "var(--bg-surface)", border: "1px solid var(--border)",
                      borderRadius: 6, cursor: "pointer",
                    }}
                  >
                    Try again
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* ─── Metric chip sub-component ─── */
function MetricChip({
  icon, label, value, ok,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  ok?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "8px 14px", background: "var(--bg-raised)",
        borderRadius: "var(--r-sm)", flex: 1, minWidth: 0,
      }}
    >
      {icon}
      <div style={{ minWidth: 0 }}>
        <span
          style={{
            display: "block", fontSize: 10, color: "var(--text-muted)",
            textTransform: "uppercase", letterSpacing: "0.04em",
          }}
        >
          {label}
        </span>
        <span
          style={{
            display: "block", fontSize: 13, fontWeight: 600,
            fontFamily: "'IBM Plex Mono', monospace",
            color: ok === false ? "var(--conf-medium)" : "var(--text-primary)",
          }}
        >
          {value}
        </span>
      </div>
    </div>
  );
}
