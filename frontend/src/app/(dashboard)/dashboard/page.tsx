"use client";

import { useEffect, useState } from "react";
import api from "../../../lib/api";

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    // This function loads dashboard statistics from backend.
    api.get("/dashboard/stats").then((response) => setStats(response.data)).catch(() => setStats(null));
  }, []);

  return (
    <main className="mx-auto w-full max-w-6xl">
      <h1 className="mb-5 text-xl font-semibold text-slate-800">Dashboard</h1>

      {!stats ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
          Loading dashboard...
        </div>
      ) : null}

      {stats ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate-500">Total Documents</p>
              <p className="mt-2 text-3xl font-semibold text-slate-800">{stats.totalDocuments ?? 0}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate-500">Average Confidence</p>
              <p className="mt-2 text-3xl font-semibold text-slate-800">
                {Math.round((stats.averageConfidence ?? 0) * 100)}%
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate-500">Certified Docs</p>
              <p className="mt-2 text-3xl font-semibold text-slate-800">
                {stats.repositoryBreakdown?.certified ?? 0}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-800">Repository Breakdown</h2>
              <div className="mt-3 space-y-2">
                {Object.entries(stats.repositoryBreakdown || {}).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                    <span className="text-sm text-slate-700">{key}</span>
                    <span className="text-sm font-semibold text-slate-800">{String(value)}</span>
                  </div>
                ))}
              </div>
            </section>
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-800">Processing Status</h2>
              <div className="mt-3 space-y-2">
                {Object.entries(stats.processingStatusBreakdown || {}).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                    <span className="text-sm text-slate-700">{key}</span>
                    <span className="text-sm font-semibold text-slate-800">{String(value)}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </>
      ) : null}
    </main>
  );
}
