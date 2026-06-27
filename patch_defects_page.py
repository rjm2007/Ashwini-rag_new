import os

path = r'c:\Users\rudra\Desktop\Waranty_POC\warranty-platform\frontend\src\app\defects\[id]\page.tsx'

content = """"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getDefect } from "@/lib/api";
import type { Defect } from "@/lib/types";
import Topbar from "@/components/Topbar";
import { decisionBadge } from "@/components/chat/ClauseResultsCard";
import DefectFloatingChat from "@/components/DefectFloatingChat";

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

  const badge = decisionBadge(defect?.primaryDecision);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--bg-app)" }}>
      <Topbar breadcrumbOverride="Defect Details" />

      <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <Link href="/defects" style={{ color: "var(--text-secondary)", textDecoration: "none", display: "flex", alignItems: "center", gap: "4px", fontSize: "14px" }}>
            <ArrowLeft size={16} /> Back to Defects
          </Link>
          {defect && (
            <div style={{ display: "flex", gap: "16px", color: "var(--text-secondary)", fontSize: "14px", borderLeft: "1px solid var(--border)", paddingLeft: "16px" }}>
              <span style={{ color: "#FFF", fontWeight: 500 }}>
                {[defect.make, defect.model, defect.year].filter(Boolean).join(" ") || "Unknown vehicle"}
              </span>
              <span>{defect.reportedDefect}</span>
            </div>
          )}
        </div>
        {defect && (
          <span style={{ fontSize: 12, fontWeight: 600, color: badge.color, padding: "4px 10px", borderRadius: 999, background: "rgba(255,255,255,0.06)" }}>
            {badge.label}
          </span>
        )}
      </div>

      <div style={{ flex: 1, padding: "40px", display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}>
        {loading ? (
          <div style={{ color: "var(--text-secondary)", textAlign: "center", marginTop: "40px" }}>Loading thread...</div>
        ) : (
          <div style={{ maxWidth: 600, width: "100%", background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: 12, padding: 32, textAlign: "center" }}>
            <h2 style={{ fontSize: 18, fontWeight: 500, color: "#FFF", marginBottom: 12 }}>Defect Analysis Complete</h2>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 24 }}>
              The AI Warranty Analyst has processed this defect. The conversation history and verdict are available in the chat assistant.
            </p>
            <div style={{ fontSize: 13, color: "var(--text-muted)", background: "rgba(0,0,0,0.2)", padding: "12px", borderRadius: 8 }}>
              Click the floating button in the bottom right to continue the discussion or review the detailed breakdown.
            </div>
          </div>
        )}
      </div>

      {defect && <DefectFloatingChat defect={defect} onMessageSent={refresh} />}
    </div>
  );
}
"""

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Patched defects/[id]/page.tsx")
