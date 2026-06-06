"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Gauge,
  Target,
  ClipboardCheck,
} from "lucide-react";
import { certifyDocument } from "../../lib/api";
import type { MasterSchema, FieldWrapper } from "../../lib/types";

interface ApprovalCardProps {
  docId: string;
  masterSchema?: MasterSchema;
  onApproved?: () => void;
}

type ApprovalState = "idle" | "confirming" | "loading" | "success" | "error";

function extractConfidence(schema?: MasterSchema): number | null {
  if (!schema?.quality) return null;
  const { fields_extracted = 0, fields_missing = 0 } = schema.quality;
  const total = fields_extracted + fields_missing;
  if (total === 0) return null;
  return Math.round((fields_extracted / total) * 100);
}

function extractCoverageScore(schema?: MasterSchema): number | null {
  if (!schema?.quality?.overall_completeness) return null;
  return Math.round(schema.quality.overall_completeness * 100);
}

function extractValidationStatus(schema?: MasterSchema): string {
  if (!schema?.quality) return "Unknown";
  const lowConf = schema.quality.fields_low_confidence ?? 0;
  if (lowConf === 0) return "Passed";
  return `${lowConf} issue${lowConf > 1 ? "s" : ""}`;
}

interface MetricChipProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  bgColor: string;
}

function MetricChip({ icon, label, value, color, bgColor }: MetricChipProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 14px",
        background: bgColor,
        borderRadius: "var(--r-sm)",
        flex: 1,
        minWidth: 0,
      }}
    >
      {icon}
      <div style={{ minWidth: 0 }}>
        <span
          style={{
            display: "block",
            fontSize: 10,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          {label}
        </span>
        <span
          style={{
            display: "block",
            fontSize: 13,
            fontWeight: 600,
            fontFamily: "'IBM Plex Mono', monospace",
            color,
          }}
        >
          {value}
        </span>
      </div>
    </div>
  );
}

const EASE_PRIMARY: [number, number, number, number] = [0.16, 1, 0.3, 1];

export default function ApprovalCard({
  docId,
  masterSchema,
  onApproved,
}: ApprovalCardProps) {
  const [state, setState] = useState<ApprovalState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const confidence = extractConfidence(masterSchema);
  const coverageScore = extractCoverageScore(masterSchema);
  const validationStatus = extractValidationStatus(masterSchema);
  const validationPassed = validationStatus === "Passed";

  const handleClick = () => {
    if (state === "idle") {
      setState("confirming");
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
      const message =
        err instanceof Error ? err.message : "Certification failed. Please try again.";
      setErrorMsg(message);
      setState("error");
    }
  };

  const handleCancel = () => {
    setState("idle");
    setErrorMsg("");
  };

  const handleRetry = () => {
    setState("idle");
    setErrorMsg("");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE_PRIMARY }}
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--r-lg)",
        boxShadow: "var(--shadow-sm)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
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
            width: 36,
            height: 36,
            borderRadius: "var(--r-sm)",
            background: "var(--accent-soft)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <ShieldCheck size={18} style={{ color: "var(--accent)" }} />
        </div>
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            Document Ready for Review
          </h3>
          <p
            style={{
              margin: "2px 0 0",
              fontSize: 12,
              color: "var(--text-secondary)",
            }}
          >
            Review metrics and approve to certify this document
          </p>
        </div>
      </div>

      {/* Metric chips */}
      <div
        style={{
          padding: "16px 24px",
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <MetricChip
          icon={
            <Gauge
              size={14}
              style={{
                color:
                  confidence != null && confidence >= 80
                    ? "var(--conf-high)"
                    : confidence != null && confidence >= 50
                    ? "var(--conf-medium)"
                    : "var(--conf-low)",
              }}
            />
          }
          label="Confidence"
          value={confidence != null ? `${confidence}%` : "—"}
          color={
            confidence != null && confidence >= 80
              ? "var(--conf-high)"
              : confidence != null && confidence >= 50
              ? "var(--conf-medium)"
              : "var(--conf-low)"
          }
          bgColor={
            confidence != null && confidence >= 80
              ? "rgba(16, 185, 129, 0.08)"
              : confidence != null && confidence >= 50
              ? "rgba(217, 119, 6, 0.08)"
              : "rgba(239, 68, 68, 0.08)"
          }
        />
        <MetricChip
          icon={<Target size={14} style={{ color: "var(--accent)" }} />}
          label="Coverage"
          value={coverageScore != null ? `${coverageScore}%` : "—"}
          color="var(--accent)"
          bgColor="var(--accent-soft)"
        />
        <MetricChip
          icon={
            <ClipboardCheck
              size={14}
              style={{
                color: validationPassed
                  ? "var(--state-done)"
                  : "var(--conf-medium)",
              }}
            />
          }
          label="Validation"
          value={validationStatus}
          color={
            validationPassed ? "var(--state-done)" : "var(--conf-medium)"
          }
          bgColor={
            validationPassed
              ? "rgba(22, 163, 74, 0.08)"
              : "rgba(217, 119, 6, 0.08)"
          }
        />
      </div>

      {/* Required fields placeholder */}
      <div
        style={{
          padding: "0 24px 16px",
        }}
      >
        <div
          style={{
            border: "1px dashed var(--border)",
            borderRadius: "var(--r-sm)",
            padding: "12px 16px",
            background: "var(--bg-raised)",
            fontSize: 12,
            color: "var(--text-muted)",
            textAlign: "center",
          }}
        >
          Required fields review area
        </div>
      </div>

      {/* Action area */}
      <div style={{ padding: "0 24px 20px" }}>
        <AnimatePresence mode="wait">
          {state === "idle" && (
            <motion.button
              key="approve"
              type="button"
              onClick={handleClick}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              whileTap={{ scale: 0.99 }}
              style={{
                width: "100%",
                padding: "12px 20px",
                fontSize: 14,
                fontWeight: 600,
                color: "#FFFFFF",
                background: "var(--accent)",
                border: "none",
                borderRadius: "var(--r-sm)",
                cursor: "pointer",
                boxShadow: "var(--shadow-accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                letterSpacing: "0.02em",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  "var(--accent-hover)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  "var(--accent)";
              }}
            >
              <ShieldCheck size={16} />
              APPROVE DOCUMENT
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
                background: "rgba(217, 119, 6, 0.06)",
                border: "1px solid var(--conf-medium)",
                borderRadius: "var(--r-sm)",
                padding: "14px 16px",
              }}
            >
              <p
                style={{
                  margin: "0 0 12px",
                  fontSize: 13,
                  color: "var(--text-primary)",
                  lineHeight: 1.5,
                }}
              >
                This will certify the document and run embedding. Proceed?
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={handleConfirm}
                  style={{
                    flex: 1,
                    padding: "8px 16px",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#FFFFFF",
                    background: "var(--accent)",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  <CheckCircle2 size={14} />
                  Yes, Certify
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  style={{
                    padding: "8px 16px",
                    fontSize: 13,
                    fontWeight: 500,
                    color: "var(--text-secondary)",
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    cursor: "pointer",
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
              exit={{ opacity: 0 }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "14px 0",
                gap: 8,
                color: "var(--accent)",
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              <Loader2
                size={16}
                style={{ animation: "spin 1s linear infinite" }}
              />
              Certifying document…
            </motion.div>
          )}

          {state === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "14px 0",
                gap: 8,
                color: "var(--state-done)",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              <CheckCircle2 size={16} />
              Document certified successfully
            </motion.div>
          )}

          {state === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                background: "var(--error-bg)",
                border: "1px solid var(--state-failed)",
                borderRadius: "var(--r-sm)",
                padding: "14px 16px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  marginBottom: 10,
                }}
              >
                <AlertCircle
                  size={16}
                  style={{
                    color: "var(--state-failed)",
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                />
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    color: "var(--state-failed)",
                  }}
                >
                  {errorMsg}
                </p>
              </div>
              <button
                type="button"
                onClick={handleRetry}
                style={{
                  padding: "6px 14px",
                  fontSize: 12,
                  fontWeight: 500,
                  color: "var(--state-failed)",
                  background: "transparent",
                  border: "1px solid var(--state-failed)",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                Try Again
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
