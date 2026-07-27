"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertCircle, ArrowRight, FileText } from "lucide-react";
import api, { getDailyCost } from "../../../lib/api";
import SkyHeader, { SkyKpi } from "../../../components/layout/SkyHeader";
import DashboardCostSummary, {
  DailyCost,
  formatUsd,
} from "../../../components/dashboard/DashboardCostSummary";
import DocumentStatusBadge from "../../../components/DocumentStatusBadge";
import type { DocumentItem } from "../../../lib/types";

type Load<T> = { state: "loading" } | { state: "error" } | { state: "ready"; data: T };

/** "Tuesday, 28 July" — the header states the day, not the word "Dashboard". */
function today(): string {
  const d = new Date();
  const weekday = d.toLocaleDateString("en-GB", { weekday: "long" });
  const rest = d.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
  return `${weekday}, ${rest}`;
}

/**
 * The subtitle is written from the data rather than being a fixed string. That
 * one sentence is most of why the page reads as live rather than as a report.
 */
function summarise(docs: DocumentItem[], pending: number | null): string {
  if (docs.length === 0) {
    return "No documents indexed yet. Upload a warranty PDF and it will be read, split into coverage components and made searchable.";
  }
  const coverages = docs.reduce((n, d) => n + (d.coverageCount || 0), 0);
  const head = `${docs.length} document${docs.length === 1 ? "" : "s"} indexed${
    coverages > 0 ? ` and ${coverages} coverage components extracted` : ""
  }.`;
  if (pending && pending > 0) {
    return `${head} ${pending} ${
      pending === 1 ? "document is" : "documents are"
    } waiting on you before they can answer questions.`;
  }
  return `${head} Nothing is waiting on review.`;
}

export default function DashboardPage() {
  const [cost, setCost] = useState<Load<DailyCost>>({ state: "loading" });
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [pending, setPending] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    getDailyCost()
      .then((res) => {
        if (cancelled) return;
        const data = res.data as DailyCost;
        setCost(data?.unavailable ? { state: "error" } : { state: "ready", data });
      })
      .catch(() => !cancelled && setCost({ state: "error" }));

    api
      .get("/documents")
      .then((res) => !cancelled && setDocs(res.data?.data || []))
      .catch(() => !cancelled && setDocs([]));

    api
      .get("/review/pending")
      .then((res) => !cancelled && setPending(Array.isArray(res.data) ? res.data.length : null))
      .catch(() => !cancelled && setPending(null));

    return () => {
      cancelled = true;
    };
  }, []);

  const costData = cost.state === "ready" ? cost.data : undefined;
  const dash = "—";

  const kpis: SkyKpi[] = [
    {
      label: "Cost today",
      value: costData ? formatUsd(costData.today_usd) : dash,
    },
    {
      label: "This month",
      value: costData ? formatUsd(costData.month_usd) : dash,
    },
    {
      label: "Avg / query",
      value: costData ? formatUsd(costData.avg_per_query_usd) : dash,
    },
    {
      label: "Pending review",
      value: pending ?? dash,
      note: pending ? (pending === 1 ? "document" : "documents") : undefined,
      noteTone: "warn",
    },
  ];

  const recent = docs.slice(0, 6);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "auto" }}>
      <SkyHeader title={today()} subtitle={summarise(docs, pending)} kpis={kpis} />

      <div
        style={{
          padding: "20px 32px 28px",
          display: "grid",
          gridTemplateColumns: "1.5fr 1fr",
          gap: 16,
          alignItems: "start",
        }}
      >
        {/* Recent documents */}
        <div className="card" style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px 10px" }}>
            <h3 style={{ margin: 0, fontSize: 12.5, fontWeight: 650 }}>Recent documents</h3>
            <Link
              href="/documents"
              style={{
                marginLeft: "auto",
                fontSize: 11.5,
                color: "var(--accent)",
                fontWeight: 600,
              }}
            >
              All documents
            </Link>
          </div>

          {recent.length === 0 ? (
            <div
              style={{
                padding: "22px 18px 26px",
                textAlign: "center",
                color: "var(--text-muted)",
                fontSize: 13,
                lineHeight: 1.6,
              }}
            >
              <FileText size={40} style={{ opacity: 0.5, marginBottom: 10 }} />
              <div style={{ fontWeight: 650, color: "var(--text-primary)", marginBottom: 5 }}>
                No documents yet
              </div>
              <div style={{ maxWidth: "40ch", margin: "0 auto" }}>
                Upload a warranty PDF and it will appear here once it has been read and indexed.
              </div>
              <Link
                href="/upload"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 14,
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: "var(--accent)",
                }}
              >
                Upload your first document <ArrowRight size={14} />
              </Link>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead>
                <tr>
                  <Th>Document</Th>
                  <Th align="right">Coverages</Th>
                  <Th align="right">Status</Th>
                </tr>
              </thead>
              <tbody>
                {recent.map((d) => (
                  <tr key={d.id}>
                    <Td>
                      <Link href={`/documents/${d.id}`} style={{ display: "block" }}>
                        <b
                          style={{
                            display: "block",
                            color: "var(--text-primary)",
                            fontWeight: 600,
                            letterSpacing: "-0.005em",
                          }}
                        >
                          {d.originalFilename}
                        </b>
                        <span
                          className="mono"
                          style={{
                            display: "block",
                            fontSize: 11,
                            color: "var(--text-muted)",
                            marginTop: 2,
                          }}
                        >
                          {d.documentType || "unclassified"}
                        </span>
                      </Link>
                    </Td>
                    <Td align="right">
                      <span className="mono tnum" style={{ color: "var(--text-secondary)" }}>
                        {d.coverageCount ?? 0}
                      </span>
                    </Td>
                    <Td align="right">
                      <DocumentStatusBadge status={d.processingStatus} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Cost */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {cost.state === "error" ? (
            <div
              className="card"
              style={{
                padding: 14,
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
                color: "var(--state-failed)",
              }}
            >
              <AlertCircle size={15} />
              Couldn&apos;t load cost data — the AI service is unreachable.
            </div>
          ) : (
            <DashboardCostSummary
              byStage={costData?.by_stage}
              loading={cost.state === "loading"}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function Th({ children, align }: { children: React.ReactNode; align?: "right" }) {
  return (
    <th
      style={{
        textAlign: align || "left",
        fontSize: 9.5,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: "var(--text-muted)",
        fontWeight: 600,
        padding: "9px 18px",
        background: "var(--bg-raised)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      {children}
    </th>
  );
}

function Td({ children, align }: { children: React.ReactNode; align?: "right" }) {
  return (
    <td
      style={{
        textAlign: align || "left",
        padding: "10px 18px",
        borderBottom: "1px solid var(--border)",
        color: "var(--text-secondary)",
        verticalAlign: "middle",
      }}
    >
      {children}
    </td>
  );
}
