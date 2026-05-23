"use client";

import { useEffect, useState } from "react";
import { FileText, ShieldCheck, Clock, Gauge } from "lucide-react";
import api from "../../../lib/api";
import StatCard from "../../../components/StatCard";
import LoadingSkeleton from "../../../components/LoadingSkeleton";

const REPO_COLORS: Record<string, string> = {
  certified: "#16A34A",
  pending_review: "#D97706",
  rejected: "#DC2626",
  archived: "#7A92A8",
  reviewer_approved: "#FF6200"
};

const PROC_COLORS: Record<string, string> = {
  uploaded: "#2563EB",
  ocr_in_progress: "#7C3AED",
  extraction_in_progress: "#7C3AED",
  ready_for_review: "#D97706",
  certified: "#16A34A",
  failed: "#DC2626"
};

function StackedBar({
  data,
  colors
}: {
  data: Record<string, number>;
  colors: Record<string, string>;
}) {
  const entries = Object.entries(data || {}).filter(([, v]) => Number(v) > 0);
  const total = entries.reduce((s, [, v]) => s + Number(v), 0) || 1;

  return (
    <div>
      <div
        style={{
          height: 12,
          borderRadius: 6,
          overflow: "hidden",
          display: "flex",
          backgroundColor: "#E8EEF4"
        }}
      >
        {entries.map(([key, value]) => (
          <div
            key={key}
            style={{
              height: "100%",
              width: `${(Number(value) / total) * 100}%`,
              backgroundColor: colors[key] || "#7A92A8"
            }}
          />
        ))}
      </div>
      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        {entries.map(([key, value]) => (
          <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  backgroundColor: colors[key] || "#7A92A8"
                }}
              />
              <span style={{ fontSize: 13, color: "#3D5A80", textTransform: "capitalize" }}>
                {key.replace(/_/g, " ")}
              </span>
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#0A1628" }}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    api
      .get("/dashboard/stats")
      .then((response) => setStats(response.data))
      .catch(() => setStats(null));
  }, []);

  return (
    <div className="animate-page-in">
      <div style={{ marginBottom: 24 }}>
        <h1 className="text-xl font-bold" style={{ color: "#0A1628" }}>
          Dashboard
        </h1>
        <p className="text-sm" style={{ color: "#7A92A8" }}>
          Warranty platform overview
        </p>
      </div>

      {!stats ? (
        <LoadingSkeleton type="stat" />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={FileText}
              label="Total Documents"
              value={stats.totalDocuments ?? 0}
              iconColor="#2563EB"
              iconBg="#EFF6FF"
            />
            <StatCard
              icon={ShieldCheck}
              label="Certified"
              value={stats.repositoryBreakdown?.certified ?? 0}
              iconColor="#16A34A"
              iconBg="#F0FDF4"
            />
            <StatCard
              icon={Clock}
              label="Pending Review"
              value={stats.repositoryBreakdown?.pending_review ?? 0}
              iconColor="#D97706"
              iconBg="#FFFBEB"
            />
            <StatCard
              icon={Gauge}
              label="Avg Confidence"
              value={`${Math.round((stats.averageConfidence ?? 0) * 100)}%`}
              iconColor="#FF6200"
              iconBg="#FFF0E6"
              accent
            />
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="card" style={{ padding: 20 }}>
              <h2 className="mb-3 text-sm font-semibold" style={{ color: "#0A1628" }}>
                Repository Status
              </h2>
              <StackedBar data={stats.repositoryBreakdown || {}} colors={REPO_COLORS} />
            </div>
            <div className="card" style={{ padding: 20 }}>
              <h2 className="mb-3 text-sm font-semibold" style={{ color: "#0A1628" }}>
                Processing Pipeline
              </h2>
              <StackedBar data={stats.processingStatusBreakdown || {}} colors={PROC_COLORS} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
