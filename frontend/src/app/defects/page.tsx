"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getDefects } from "@/lib/api";
import type { Defect } from "@/lib/types";
import Topbar from "@/components/Topbar";
import { Wrench } from "lucide-react";

export default function DefectsPage() {
  const [defects, setDefects] = useState<Defect[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchDefects() {
      try {
        const res = await getDefects();
        if (Array.isArray(res.data)) {
          setDefects(res.data);
        } else {
          setDefects((res.data as any)?.data || []);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load defects.");
      } finally {
        setLoading(false);
      }
    }
    fetchDefects();
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--bg-app)" }}>
      <Topbar breadcrumbOverride="Defects" />
      <div style={{ padding: "24px", flex: 1, overflow: "auto", color: "#FFF" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
          <Wrench size={24} color="var(--accent)" />
          <h1 style={{ fontSize: "24px", fontWeight: 600, margin: 0 }}>Defect Reports</h1>
        </div>

        {error && <div style={{ color: "#ef4444", marginBottom: "16px" }}>{error}</div>}

        {loading ? (
          <div>Loading defects...</div>
        ) : defects.length === 0 ? (
          <div>No defects found.</div>
        ) : (
          <div style={{ background: "var(--bg-panel)", borderRadius: "8px", overflow: "hidden", border: "1px solid var(--border)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", background: "rgba(255,255,255,0.02)" }}>
                  <th style={{ padding: "12px 16px", fontWeight: 500, color: "var(--text-secondary)" }}>Reported Defect</th>
                  <th style={{ padding: "12px 16px", fontWeight: 500, color: "var(--text-secondary)" }}>Document ID</th>
                  <th style={{ padding: "12px 16px", fontWeight: 500, color: "var(--text-secondary)" }}>Vehicle</th>
                  <th style={{ padding: "12px 16px", fontWeight: 500, color: "var(--text-secondary)" }}>Created By</th>
                  <th style={{ padding: "12px 16px", fontWeight: 500, color: "var(--text-secondary)" }}>Date</th>
                  <th style={{ padding: "12px 16px", fontWeight: 500, color: "var(--text-secondary)" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {defects.map((d) => (
                  <tr key={d.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "12px 16px" }}>{d.reportedDefect}</td>
                    <td style={{ padding: "12px 16px", fontFamily: "monospace", fontSize: "12px" }}>{d.documentId.substring(0, 8)}...</td>
                    <td style={{ padding: "12px 16px" }}>
                      {[d.make, d.model, d.year].filter(Boolean).join(" ") || "-"}
                    </td>
                    <td style={{ padding: "12px 16px" }}>{d.createdBy}</td>
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
    </div>
  );
}
