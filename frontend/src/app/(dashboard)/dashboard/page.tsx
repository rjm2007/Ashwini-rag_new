"use client";

import Link from "next/link";
import DashboardCostSummary from "../../../components/dashboard/DashboardCostSummary";

export default function DashboardPage() {
  return (
    <div style={{ padding: 24, maxWidth: 960 }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>Dashboard</h1>
      <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>
        Warranty intelligence overview and processing costs.
      </p>
      <DashboardCostSummary />
      <Link href="/documents" style={{ fontSize: 13, color: "var(--accent)" }}>
        View certified documents →
      </Link>
    </div>
  );
}
