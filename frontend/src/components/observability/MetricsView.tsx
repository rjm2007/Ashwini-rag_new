"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Clock, Zap, HardDrive, Cpu } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { PipelineEvent } from "../../lib/types";
import type { DocumentDetail } from "../../lib/types";

interface MetricsViewProps {
  events: Array<PipelineEvent>;
  document?: DocumentDetail;
}

interface DerivedMetrics {
  processingTimeMs: number | null;
  throughput: string | null;
  memoryUsage: string | null;
  cpuUsage: string | null;
  totalPages: number | null;
  totalChunks: number | null;
  totalEmbeddings: number | null;
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
  avgStepDuration: number | null;
}

function deriveMetrics(
  events: PipelineEvent[],
  document?: DocumentDetail
): DerivedMetrics {
  const completed = events.filter((e) => e.status === "done");
  const failed = events.filter((e) => e.status === "failed");

  // Total processing time: sum of all durations
  const durations = events
    .map((e) => e.duration_ms)
    .filter((d): d is number => d != null);
  const totalDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) : null;

  // Average step duration
  const avgStepDuration =
    durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : null;

  // Try to find page/chunk/embedding counts from event details
  let totalPages: number | null = null;
  let totalChunks: number | null = null;
  let totalEmbeddings: number | null = null;

  for (const event of events) {
    const detail = event.detail || {};
    if (detail.page_count != null) totalPages = Number(detail.page_count);
    if (detail.pages != null) totalPages = Number(detail.pages);
    if (detail.chunk_count != null) totalChunks = Number(detail.chunk_count);
    if (detail.chunks != null) totalChunks = Number(detail.chunks);
    if (detail.embedding_count != null) totalEmbeddings = Number(detail.embedding_count);
    if (detail.embeddings != null) totalEmbeddings = Number(detail.embeddings);
    if (detail.total_chunks != null) totalChunks = Number(detail.total_chunks);
    if (detail.total_embeddings != null) totalEmbeddings = Number(detail.total_embeddings);
  }

  // Throughput: pages per second if we have both
  let throughput: string | null = null;
  if (totalPages != null && totalDuration != null && totalDuration > 0) {
    const pps = (totalPages / (totalDuration / 1000)).toFixed(1);
    throughput = `${pps} pages/s`;
  }

  return {
    processingTimeMs: totalDuration,
    throughput,
    memoryUsage: null,
    cpuUsage: null,
    totalPages,
    totalChunks,
    totalEmbeddings,
    totalSteps: events.length,
    completedSteps: completed.length,
    failedSteps: failed.length,
    avgStepDuration,
  };
}

interface ChartDataPoint {
  name: string;
  duration: number;
  index: number;
}

function buildChartData(events: PipelineEvent[]): ChartDataPoint[] {
  return events
    .filter((e) => e.duration_ms != null)
    .sort((a, b) => a.sequence - b.sequence)
    .map((event, i) => ({
      name: event.step_label || event.step_key || `Step ${i + 1}`,
      duration: event.duration_ms ?? 0,
      index: i,
    }));
}

function formatDuration(ms: number | null): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

interface StatTileProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  delay: number;
}

function StatTile({ icon, label, value, delay }: StatTileProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: [0.16, 1, 0.3, 1] }}
      style={{
        background: "var(--bg-raised)",
        border: "1px solid var(--border)",
        borderRadius: "var(--r-md)",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        textAlign: "center",
      }}
    >
      {icon}
      <span
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 20,
          fontWeight: 600,
          color: value === "—" ? "var(--text-muted)" : "var(--text-primary)",
          lineHeight: 1,
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontSize: 11,
          color: "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          fontWeight: 500,
        }}
      >
        {label}
      </span>
    </motion.div>
  );
}

interface DetailRowProps {
  label: string;
  value: string | number | null;
}

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "8px 0",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{label}</span>
      <span
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 12,
          fontWeight: 500,
          color: value != null ? "var(--text-primary)" : "var(--text-muted)",
        }}
      >
        {value != null ? String(value) : "—"}
      </span>
    </div>
  );
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--r-sm)",
        padding: "8px 12px",
        boxShadow: "var(--shadow-md)",
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 11,
          color: "var(--text-muted)",
          marginBottom: 2,
        }}
      >
        {label}
      </p>
      <p
        style={{
          margin: 0,
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 13,
          fontWeight: 600,
          color: "var(--accent)",
        }}
      >
        {formatDuration(payload[0].value)}
      </p>
    </div>
  );
};

export default function MetricsView({ events, document }: MetricsViewProps) {
  const metrics = useMemo(() => deriveMetrics(events, document), [events, document]);
  const chartData = useMemo(() => buildChartData(events), [events]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      style={{ display: "flex", flexDirection: "column", gap: 20 }}
    >
      {/* 4 Stat tiles */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
        }}
      >
        <StatTile
          icon={<Clock size={18} style={{ color: "var(--accent)" }} />}
          label="Processing Time"
          value={formatDuration(metrics.processingTimeMs)}
          delay={0}
        />
        <StatTile
          icon={<Zap size={18} style={{ color: "var(--conf-medium)" }} />}
          label="Throughput"
          value={metrics.throughput || "—"}
          delay={0.05}
        />
        <StatTile
          icon={<HardDrive size={18} style={{ color: "var(--state-done)" }} />}
          label="Memory Usage"
          value={metrics.memoryUsage || "—"}
          delay={0.1}
        />
        <StatTile
          icon={<Cpu size={18} style={{ color: "var(--cat-terms)" }} />}
          label="CPU Usage"
          value={metrics.cpuUsage || "—"}
          delay={0.15}
        />
      </div>

      {/* Detailed metrics */}
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-md)",
          boxShadow: "var(--shadow-xs)",
          padding: "20px 24px",
        }}
      >
        <h4
          style={{
            margin: "0 0 12px",
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-primary)",
          }}
        >
          Detailed Metrics
        </h4>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0 32px",
          }}
        >
          <DetailRow label="Total Pages" value={metrics.totalPages} />
          <DetailRow label="Total Chunks" value={metrics.totalChunks} />
          <DetailRow label="Total Embeddings" value={metrics.totalEmbeddings} />
          <DetailRow label="Pipeline Steps" value={metrics.totalSteps} />
          <DetailRow label="Completed Steps" value={metrics.completedSteps} />
          <DetailRow label="Failed Steps" value={metrics.failedSteps} />
          <DetailRow
            label="Avg Step Duration"
            value={metrics.avgStepDuration != null ? formatDuration(metrics.avgStepDuration) : null}
          />
          <DetailRow
            label="Total Duration"
            value={metrics.processingTimeMs != null ? formatDuration(metrics.processingTimeMs) : null}
          />
        </div>
      </div>

      {/* Processing Performance chart */}
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-md)",
          boxShadow: "var(--shadow-xs)",
          padding: "20px 24px",
        }}
      >
        <h4
          style={{
            margin: "0 0 16px",
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-primary)",
          }}
        >
          Processing Performance
        </h4>
        {chartData.length > 0 ? (
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: "var(--text-muted)" }}
                  tickLine={false}
                  axisLine={{ stroke: "var(--border)" }}
                  interval="preserveStartEnd"
                  angle={-20}
                  textAnchor="end"
                  height={50}
                />
                <YAxis
                  tick={{
                    fontSize: 10,
                    fill: "var(--text-muted)",
                    fontFamily: "'IBM Plex Mono', monospace",
                  }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val: number) => formatDuration(val)}
                  width={55}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="duration"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  dot={{
                    fill: "var(--accent)",
                    stroke: "var(--bg-surface)",
                    strokeWidth: 2,
                    r: 4,
                  }}
                  activeDot={{
                    fill: "var(--accent)",
                    stroke: "var(--bg-surface)",
                    strokeWidth: 2,
                    r: 6,
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div
            style={{
              height: 200,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-muted)",
              fontSize: 13,
              border: "1px dashed var(--border)",
              borderRadius: "var(--r-sm)",
            }}
          >
            No performance data available
          </div>
        )}
      </div>
    </motion.div>
  );
}
