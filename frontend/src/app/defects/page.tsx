"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getDefects, getEligibleDefectDocuments, createDefect } from "@/lib/api";
import type { Defect, EligibleVehicleGroup } from "@/lib/types";
import Topbar from "@/components/Topbar";
import { Wrench, Plus, X, Loader2, AlertCircle } from "lucide-react";
import MicButton from "@/components/MicButton";

const COLORS = {
  bgPage: "#F8FAFC",
  bgPanel: "#FFFFFF",
  border: "#D1DCE8",
  textPrimary: "#0A1628",
  textSecondary: "#7A92A8",
  accent: "#4F46E5",
  done: "#16A34A",
  gate: "#D97706",
  failed: "#DC2626",
  muted: "#9AA6B5",
};

function decisionColor(d?: string) {
  switch ((d || "").toUpperCase()) {
    case "COVERED":
      return COLORS.done;
    case "POSSIBLY_COVERED":
      return COLORS.gate;
    case "NOT_COVERED":
      return COLORS.failed;
    default:
      return COLORS.muted;
  }
}
function decisionLabel(d?: string) {
  switch ((d || "").toUpperCase()) {
    case "COVERED":
      return "Covered";
    case "POSSIBLY_COVERED":
      return "Possibly Covered";
    case "NOT_COVERED":
      return "Not Covered";
    case "INFORMATION_ONLY":
      return "More Info Needed";
    default:
      return "Pending";
  }
}

function NewDefectModal({
  groups,
  onClose,
  onCreated
}: {
  groups: EligibleVehicleGroup[];
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [groupIndex, setGroupIndex] = useState(0);
  const [documentId, setDocumentId] = useState(groups[0]?.vehicles[0]?.documentId || "");
  const [reportedDefect, setReportedDefect] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [currentMileage, setCurrentMileage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const selectedGroup = groups[groupIndex];

  const onGroupChange = (idx: number) => {
    setGroupIndex(idx);
    setDocumentId(groups[idx]?.vehicles[0]?.documentId || "");
  };

  const submit = async () => {
    if (!documentId || reportedDefect.trim().length < 3) {
      setError("Pick a vehicle and describe the defect (at least a few words).");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await createDefect(
        documentId,
        reportedDefect.trim(),
        purchaseDate || undefined,
        currentMileage ? parseInt(currentMileage, 10) : undefined
      );
      onCreated(res.data.id);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to create defect.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "8px 10px",
    fontSize: 13,
    background: COLORS.bgPage,
    color: COLORS.textPrimary,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 6,
    boxSizing: "border-box" as const,
  };
  const labelStyle = { display: "block" as const, fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 };

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(10,22,40,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 480, maxWidth: "90vw", background: COLORS.bgPanel,
          border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 24,
          boxShadow: "0 12px 32px rgba(10,22,40,0.18)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16, color: COLORS.textPrimary }}>Report a defect</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: COLORS.textSecondary, cursor: "pointer" }}>
            <X size={18} />
          </button>
        </div>

        {/* Step 1 — pick the vehicle type. One entry per unique Make/Model/Year. */}
        <label style={labelStyle}>Vehicle (make · model · year)</label>
        <select
          value={groupIndex}
          onChange={(e) => onGroupChange(parseInt(e.target.value, 10))}
          style={{ ...inputStyle, marginBottom: selectedGroup && selectedGroup.vehicles.length > 1 ? 10 : 14 }}
        >
          {groups.length === 0 && <option value={0}>No certified vehicles available</option>}
          {groups.map((g, idx) => (
            <option key={`${g.make}-${g.model}-${g.year}`} value={idx}>
              {[g.make, g.model, g.year].filter(Boolean).join(" · ")}
              {g.vehicles.length > 1 ? ` (${g.vehicles.length} vehicles)` : ""}
            </option>
          ))}
        </select>

        {/* Step 2 — only shown when this Make/Model/Year has more than one VIN behind it. */}
        {selectedGroup && selectedGroup.vehicles.length > 1 && (
          <>
            <label style={labelStyle}>Which one? (Standard / VIN)</label>
            <select
              value={documentId}
              onChange={(e) => setDocumentId(e.target.value)}
              style={{ ...inputStyle, marginBottom: 14 }}
            >
              {selectedGroup.vehicles.map((v) => {
                const typeLabel = v.warrantyType === "non_standard" ? "Non-Standard" : "Standard";
                const suffix = v.vinSuffix ? ` · ...${v.vinSuffix}` : "";
                return (
                  <option key={v.documentId} value={v.documentId}>
                    {typeLabel}{suffix}
                  </option>
                );
              })}
            </select>
          </>
        )}

        {/* Only one vehicle behind this Make/Model/Year — nothing to pick, just say what it is. */}
        {selectedGroup && selectedGroup.vehicles.length === 1 && (
          <p style={{ fontSize: 11, color: COLORS.textSecondary, margin: "6px 0 14px" }}>
            {selectedGroup.vehicles[0].warrantyType === "non_standard" ? "Non-Standard" : "Standard"} warranty
            {selectedGroup.vehicles[0].vinSuffix ? ` · VIN ...${selectedGroup.vehicles[0].vinSuffix}` : ""}
          </p>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <label style={labelStyle}>What's wrong?</label>
          <MicButton
            onTranscribed={(text) =>
              setReportedDefect((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text))
            }
          />
        </div>
        <textarea
          value={reportedDefect}
          onChange={(e) => setReportedDefect(e.target.value)}
          rows={3}
          placeholder="e.g. my engine is not working (or tap the mic and speak in any language)"
          style={{ ...inputStyle, marginBottom: 14, resize: "vertical" }}
        />

        <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Purchase date</label>
            <input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Current mileage</label>
            <input
              type="number"
              value={currentMileage}
              onChange={(e) => setCurrentMileage(e.target.value)}
              placeholder="e.g. 145000"
              style={inputStyle}
            />
          </div>
        </div>

        <p style={{ fontSize: 11, color: COLORS.textSecondary, margin: "0 0 14px" }}>
          Optional — leave blank if unknown, you can fill them in later from this defect's chat.
        </p>

        {error && (
          <p style={{ fontSize: 12, color: COLORS.failed, margin: "0 0 12px", display: "flex", alignItems: "center", gap: 6 }}>
            <AlertCircle size={14} /> {error}
          </p>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: "8px 16px", fontSize: 13, background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 6, color: COLORS.textSecondary, cursor: "pointer" }}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={submit}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", fontSize: 13,
              background: COLORS.accent, border: "none", borderRadius: 6, color: "#FFFFFF",
              cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : null}
            {submitting ? "Checking…" : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DefectsPage() {
  const router = useRouter();
  const [defects, setDefects] = useState<Defect[]>([]);
  const [documents, setDocuments] = useState<EligibleVehicleGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [defectsRes, docsRes] = await Promise.all([getDefects(), getEligibleDefectDocuments()]);
        setDefects(Array.isArray(defectsRes.data) ? defectsRes.data : (defectsRes.data as any)?.data || []);
        setDocuments(Array.isArray(docsRes.data) ? docsRes.data : (docsRes.data as any)?.data || []);
      } catch (err) {
        console.error(err);
        setError("Failed to load defects.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: COLORS.bgPage }}>
      <Topbar breadcrumbOverride="Defects" />
      <div style={{ padding: 24, flex: 1, overflow: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Wrench size={24} color={COLORS.accent} />
            <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0, color: COLORS.textPrimary }}>Defect Reports</h1>
          </div>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", fontSize: 13,
              background: COLORS.accent, border: "none", borderRadius: 6, color: "#FFFFFF", cursor: "pointer",
              fontWeight: 600,
            }}
          >
            <Plus size={14} /> New Defect
          </button>
        </div>

        {error && <div style={{ color: COLORS.failed, marginBottom: 16, fontSize: 13 }}>{error}</div>}

        {loading ? (
          <div style={{ color: COLORS.textSecondary, fontSize: 13 }}>Loading defects...</div>
        ) : defects.length === 0 ? (
          <div style={{ color: COLORS.textSecondary, fontSize: 13 }}>
            No defects reported yet. Click "New Defect" to check coverage for a vehicle problem.
          </div>
        ) : (
          <div style={{ background: COLORS.bgPanel, borderRadius: 8, overflow: "hidden", border: `1px solid ${COLORS.border}` }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${COLORS.border}`, background: "#F1F5F9" }}>
                  <th style={{ padding: "12px 16px", fontWeight: 500, fontSize: 12, color: COLORS.textSecondary }}>Reported Defect</th>
                  <th style={{ padding: "12px 16px", fontWeight: 500, fontSize: 12, color: COLORS.textSecondary }}>Vehicle</th>
                  <th style={{ padding: "12px 16px", fontWeight: 500, fontSize: 12, color: COLORS.textSecondary }}>Warranty Type</th>
                  <th style={{ padding: "12px 16px", fontWeight: 500, fontSize: 12, color: COLORS.textSecondary }}>Decision</th>
                  <th style={{ padding: "12px 16px", fontWeight: 500, fontSize: 12, color: COLORS.textSecondary }}>Component</th>
                  <th style={{ padding: "12px 16px", fontWeight: 500, fontSize: 12, color: COLORS.textSecondary }}>Date</th>
                  <th style={{ padding: "12px 16px", fontWeight: 500, fontSize: 12, color: COLORS.textSecondary }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {defects.map((d) => (
                  <tr key={d.id} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: COLORS.textPrimary }}>{d.reportedDefect}</td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: COLORS.textPrimary }}>
                      {[d.make, d.model, d.year].filter(Boolean).join(" ") || "-"}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span
                        style={{
                          fontSize: 11, fontWeight: 700,
                          color: d.warrantyType === "non_standard" ? COLORS.gate : COLORS.accent,
                          padding: "2px 10px", borderRadius: 999,
                          background: d.warrantyType === "non_standard" ? `${COLORS.gate}1A` : `${COLORS.accent}1A`,
                        }}
                      >
                        {d.warrantyType === "non_standard" ? "Non-Standard" : "Standard"}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span
                        style={{
                          fontSize: 11, fontWeight: 700, color: decisionColor(d.primaryDecision),
                          padding: "2px 10px", borderRadius: 999, background: `${decisionColor(d.primaryDecision)}1A`,
                        }}
                      >
                        {decisionLabel(d.primaryDecision)}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: COLORS.textPrimary }}>
                      {d.primaryComponent ? `${d.primaryComponent}${d.primaryCoverageId ? ` (${d.primaryCoverageId})` : ""}` : "-"}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: COLORS.textPrimary }}>
                      {d.createdAt ? new Date(d.createdAt).toLocaleDateString() : "-"}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <Link href={`/defects/${d.id}`} style={{ color: COLORS.accent, textDecoration: "none", fontWeight: 600, fontSize: 13 }}>
                        View Thread
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <NewDefectModal groups={documents} onClose={() => setShowModal(false)} onCreated={(id) => router.push(`/defects/${id}`)} />
      )}
    </div>
  );
}
