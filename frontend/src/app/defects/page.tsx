"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getDefects, getEligibleDefectDocuments, createDefect } from "@/lib/api";
import type { Defect, EligibleDocumentOption } from "@/lib/types";
import Topbar from "@/components/Topbar";
import { Wrench, Plus, X, Loader2, AlertCircle } from "lucide-react";

function decisionColor(d?: string) {
  switch ((d || "").toUpperCase()) {
    case "COVERED":
      return "#3FB950";
    case "POSSIBLY_COVERED":
      return "#D29922";
    case "NOT_COVERED":
      return "#F85149";
    default:
      return "#8B949E";
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
  documents,
  onClose,
  onCreated
}: {
  documents: EligibleDocumentOption[];
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [documentId, setDocumentId] = useState(documents[0]?.documentId || "");
  const [reportedDefect, setReportedDefect] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [currentMileage, setCurrentMileage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 480, maxWidth: "90vw", background: "var(--bg-panel)",
          border: "1px solid var(--border)", borderRadius: 12, padding: 24, color: "#FFF"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Report a defect</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}>
            <X size={18} />
          </button>
        </div>

        <label style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>
          Vehicle (make · model · year)
        </label>
        <select
          value={documentId}
          onChange={(e) => setDocumentId(e.target.value)}
          style={{
            width: "100%", padding: "8px 10px", marginBottom: 14, fontSize: 13,
            background: "var(--bg-app)", color: "#FFF", border: "1px solid var(--border)", borderRadius: 6
          }}
        >
          {documents.length === 0 && <option value="">No certified vehicles available</option>}
          {documents.map((d) => (
            <option key={d.documentId} value={d.documentId}>
              {d.make} · {d.model} · {d.year}
            </option>
          ))}
        </select>

        <label style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>
          What's wrong?
        </label>
        <textarea
          value={reportedDefect}
          onChange={(e) => setReportedDefect(e.target.value)}
          rows={3}
          placeholder="e.g. my engine is not working"
          style={{
            width: "100%", padding: "8px 10px", marginBottom: 14, fontSize: 13, resize: "vertical",
            background: "var(--bg-app)", color: "#FFF", border: "1px solid var(--border)", borderRadius: 6, boxSizing: "border-box"
          }}
        />

        <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>Purchase date</label>
            <input
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              style={{ width: "100%", padding: "8px 10px", fontSize: 13, background: "var(--bg-app)", color: "#FFF", border: "1px solid var(--border)", borderRadius: 6, boxSizing: "border-box" }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>Current mileage</label>
            <input
              type="number"
              value={currentMileage}
              onChange={(e) => setCurrentMileage(e.target.value)}
              placeholder="e.g. 145000"
              style={{ width: "100%", padding: "8px 10px", fontSize: 13, background: "var(--bg-app)", color: "#FFF", border: "1px solid var(--border)", borderRadius: 6, boxSizing: "border-box" }}
            />
          </div>
        </div>

        <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "0 0 14px" }}>
          Optional — leave blank if unknown, you can fill them in later from this defect's chat.
        </p>

        {error && (
          <p style={{ fontSize: 12, color: "#F85149", margin: "0 0 12px", display: "flex", alignItems: "center", gap: 6 }}>
            <AlertCircle size={14} /> {error}
          </p>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: "8px 16px", fontSize: 13, background: "transparent", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-secondary)", cursor: "pointer" }}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={submit}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", fontSize: 13,
              background: "var(--accent)", border: "none", borderRadius: 6, color: "white",
              cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1
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
  const [documents, setDocuments] = useState<EligibleDocumentOption[]>([]);
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
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--bg-app)" }}>
      <Topbar breadcrumbOverride="Defects" />
      <div style={{ padding: "24px", flex: 1, overflow: "auto", color: "#FFF" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Wrench size={24} color="var(--accent)" />
            <h1 style={{ fontSize: "24px", fontWeight: 600, margin: 0 }}>Defect Reports</h1>
          </div>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", fontSize: 13,
              background: "var(--accent)", border: "none", borderRadius: 6, color: "white", cursor: "pointer"
            }}
          >
            <Plus size={14} /> New Defect
          </button>
        </div>

        {error && <div style={{ color: "#ef4444", marginBottom: "16px" }}>{error}</div>}

        {loading ? (
          <div>Loading defects...</div>
        ) : defects.length === 0 ? (
          <div style={{ color: "var(--text-secondary)" }}>
            No defects reported yet. Click "New Defect" to check coverage for a vehicle problem.
          </div>
        ) : (
          <div style={{ background: "var(--bg-panel)", borderRadius: "8px", overflow: "hidden", border: "1px solid var(--border)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", background: "rgba(255,255,255,0.02)" }}>
                  <th style={{ padding: "12px 16px", fontWeight: 500, color: "var(--text-secondary)" }}>Reported Defect</th>
                  <th style={{ padding: "12px 16px", fontWeight: 500, color: "var(--text-secondary)" }}>Vehicle</th>
                  <th style={{ padding: "12px 16px", fontWeight: 500, color: "var(--text-secondary)" }}>Decision</th>
                  <th style={{ padding: "12px 16px", fontWeight: 500, color: "var(--text-secondary)" }}>Component</th>
                  <th style={{ padding: "12px 16px", fontWeight: 500, color: "var(--text-secondary)" }}>Date</th>
                  <th style={{ padding: "12px 16px", fontWeight: 500, color: "var(--text-secondary)" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {defects.map((d) => (
                  <tr key={d.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "12px 16px" }}>{d.reportedDefect}</td>
                    <td style={{ padding: "12px 16px" }}>{[d.make, d.model, d.year].filter(Boolean).join(" ") || "-"}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span
                        style={{
                          fontSize: 11, fontWeight: 600, color: decisionColor(d.primaryDecision),
                          padding: "2px 8px", borderRadius: 999, background: "rgba(255,255,255,0.06)"
                        }}
                      >
                        {decisionLabel(d.primaryDecision)}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {d.primaryComponent ? `${d.primaryComponent}${d.primaryCoverageId ? ` (${d.primaryCoverageId})` : ""}` : "-"}
                    </td>
                    <td style={{ padding: "12px 16px" }}>{d.createdAt ? new Date(d.createdAt).toLocaleDateString() : "-"}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <Link href={`/defects/${d.id}`} style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 500 }}>
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
        <NewDefectModal
          documents={documents}
          onClose={() => setShowModal(false)}
          onCreated={(id) => router.push(`/defects/${id}`)}
        />
      )}
    </div>
  );
}
