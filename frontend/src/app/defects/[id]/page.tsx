"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getDefect } from "@/lib/api";
import type { Defect } from "@/lib/types";
import Topbar from "@/components/Topbar";
import DefectFloatingChat from "@/components/DefectFloatingChat";

const COLORS = {
  bgPage: "#F8FAFC",
  bgPanel: "#FFFFFF",
  border: "#D1DCE8",
  textPrimary: "#0A1628",
  textSecondary: "#7A92A8",
  done: "#16A34A",
  gate: "#D97706",
  failed: "#DC2626",
  muted: "#9AA6B5",
};

function decisionBadge(d?: string) {
  switch ((d || "").toUpperCase()) {
    case "COVERED":
      return { label: "Covered", color: COLORS.done };
    case "POSSIBLY_COVERED":
      return { label: "Possibly Covered", color: COLORS.gate };
    case "NOT_COVERED":
      return { label: "Not Covered", color: COLORS.failed };
    case "INFORMATION_ONLY":
      return { label: "More Info Needed", color: COLORS.muted };
    default:
      return { label: "Pending", color: COLORS.muted };
  }
}

export default function DefectThreadPage() {
  const params = useParams<{ id: string }>();
  const [defect, setDefect] = useState<Defect | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const res = await getDefect(params.id);
      setDefect(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: COLORS.bgPage }}>
        <Topbar breadcrumbOverride="Defect Details" />
        <div style={{ padding: 24, color: COLORS.textSecondary, fontSize: 13 }}>Loading...</div>
      </div>
    );
  }
  if (!defect) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: COLORS.bgPage }}>
        <Topbar breadcrumbOverride="Defect Details" />
        <div style={{ padding: 24, color: COLORS.failed, fontSize: 13 }}>Defect not found.</div>
      </div>
    );
  }

  const badge = decisionBadge(defect.primaryDecision);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: COLORS.bgPage }}>
      <Topbar breadcrumbOverride="Defect Details" />

      <div style={{ padding: "16px 24px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", gap: 16 }}>
        <Link href="/defects" style={{ color: COLORS.textSecondary, textDecoration: "none", display: "flex", alignItems: "center", gap: 4, fontSize: 14 }}>
          <ArrowLeft size={16} /> Back to Defects
        </Link>
        <div style={{ display: "flex", gap: 16, color: COLORS.textSecondary, fontSize: 14, borderLeft: `1px solid ${COLORS.border}`, paddingLeft: 16 }}>
          <span style={{ color: COLORS.textPrimary, fontWeight: 600 }}>
            {[defect.make, defect.model, defect.year].filter(Boolean).join(" ") || "Unknown vehicle"}
          </span>
          <span>{defect.reportedDefect}</span>
        </div>
        <span
          style={{
            marginLeft: "auto", fontSize: 12, fontWeight: 700, color: badge.color,
            padding: "4px 12px", borderRadius: 999, background: `${badge.color}1A`,
          }}
        >
          {badge.label}
        </span>
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ maxWidth: 480, textAlign: "center" }}>
          <h2 style={{ fontSize: 18, color: COLORS.textPrimary, margin: "0 0 8px" }}>Defect Analysis Complete</h2>
          <p style={{ fontSize: 14, color: COLORS.textSecondary, lineHeight: 1.6 }}>
            The AI Warranty Analyst has processed this defect. The conversation history and verdict are available in the chat assistant.
          </p>
          <div style={{ marginTop: 16, padding: "10px 16px", background: COLORS.bgPanel, border: `1px solid ${COLORS.border}`, borderRadius: 8, fontSize: 13, color: COLORS.textSecondary }}>
            Click the floating button in the bottom right to continue the discussion or review the detailed breakdown.
          </div>
        </div>
      </div>

      <DefectFloatingChat defect={defect} onMessageSent={() => refresh()} />
    </div>
  );
}
