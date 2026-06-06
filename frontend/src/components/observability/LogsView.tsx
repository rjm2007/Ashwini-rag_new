"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Download,
  ChevronDown,
  Info,
  AlertTriangle,
  AlertCircle,
  Bug,
} from "lucide-react";
import type { PipelineEvent } from "../../lib/types";

interface LogsViewProps {
  events: Array<PipelineEvent>;
}

type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";

interface LogEntry {
  id: string;
  time: string;
  level: LogLevel;
  service: string;
  message: string;
}

function mapEventToLevel(event: PipelineEvent): LogLevel {
  if (event.status === "failed") return "ERROR";
  if (event.status === "running") return "INFO";
  if (event.status === "done") return "INFO";
  return "DEBUG";
}

function mapEventToService(event: PipelineEvent): string {
  return event.stage || "pipeline";
}

function mapEventsToLogs(events: PipelineEvent[]): LogEntry[] {
  return events.map((event) => {
    const level = mapEventToLevel(event);
    const time = event.created_at
      ? new Date(event.created_at).toISOString().replace("T", " ").substring(0, 19)
      : "—";

    let message = `[${event.step_key}] ${event.step_label}`;
    if (event.status === "done" && event.duration_ms != null) {
      message += ` — completed in ${event.duration_ms}ms`;
    }
    if (event.status === "failed") {
      const detail = event.detail;
      const errorMsg =
        typeof detail === "object" && detail !== null
          ? (detail as Record<string, unknown>).error || (detail as Record<string, unknown>).message || ""
          : "";
      message += errorMsg ? ` — ${errorMsg}` : " — failed";
    }
    if (event.status === "running") {
      message += " — running";
    }

    return {
      id: event.id,
      time,
      level,
      service: mapEventToService(event),
      message,
    };
  });
}

const LEVEL_STYLES: Record<LogLevel, { color: string; bg: string }> = {
  INFO: { color: "var(--accent)", bg: "var(--accent-soft)" },
  WARN: { color: "var(--conf-medium)", bg: "rgba(217, 119, 6, 0.08)" },
  ERROR: { color: "var(--state-failed)", bg: "rgba(239, 68, 68, 0.08)" },
  DEBUG: { color: "var(--text-muted)", bg: "var(--bg-hover)" },
};

const LEVEL_ICONS: Record<LogLevel, React.ReactNode> = {
  INFO: <Info size={12} />,
  WARN: <AlertTriangle size={12} />,
  ERROR: <AlertCircle size={12} />,
  DEBUG: <Bug size={12} />,
};

function SelectDropdown({
  value,
  options,
  onChange,
  placeholder,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          appearance: "none",
          padding: "6px 28px 6px 10px",
          fontSize: 12,
          color: "var(--text-primary)",
          background: "var(--bg-raised)",
          border: "1px solid var(--border)",
          borderRadius: 6,
          cursor: "pointer",
          outline: "none",
          fontFamily: "inherit",
        }}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      <ChevronDown
        size={12}
        style={{
          position: "absolute",
          right: 8,
          pointerEvents: "none",
          color: "var(--text-muted)",
        }}
      />
    </div>
  );
}

export default function LogsView({ events }: LogsViewProps) {
  const [levelFilter, setLevelFilter] = useState<string>("");
  const [serviceFilter, setServiceFilter] = useState<string>("");
  const [search, setSearch] = useState("");

  const allLogs = useMemo(() => mapEventsToLogs(events), [events]);

  const services = useMemo(() => {
    const set = new Set(allLogs.map((l) => l.service));
    return Array.from(set).sort();
  }, [allLogs]);

  const filteredLogs = useMemo(() => {
    return allLogs.filter((log) => {
      if (levelFilter && log.level !== levelFilter) return false;
      if (serviceFilter && log.service !== serviceFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          log.message.toLowerCase().includes(q) ||
          log.service.toLowerCase().includes(q) ||
          log.time.includes(q)
        );
      }
      return true;
    });
  }, [allLogs, levelFilter, serviceFilter, search]);

  const handleDownload = () => {
    const content = filteredLogs
      .map((l) => `${l.time} [${l.level}] [${l.service}] ${l.message}`)
      .join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pipeline-logs.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--r-md)",
        boxShadow: "var(--shadow-xs)",
        overflow: "hidden",
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "12px 16px",
          borderBottom: "1px solid var(--border)",
          flexWrap: "wrap",
        }}
      >
        <SelectDropdown
          value={levelFilter}
          options={["INFO", "WARN", "ERROR", "DEBUG"]}
          onChange={setLevelFilter}
          placeholder="All Levels"
        />
        <SelectDropdown
          value={serviceFilter}
          options={services}
          onChange={setServiceFilter}
          placeholder="All Services"
        />
        <div
          style={{
            position: "relative",
            flex: 1,
            minWidth: 140,
          }}
        >
          <Search
            size={13}
            style={{
              position: "absolute",
              left: 8,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-muted)",
            }}
          />
          <input
            type="text"
            placeholder="Search logs…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "6px 10px 6px 28px",
              fontSize: 12,
              color: "var(--text-primary)",
              background: "var(--bg-raised)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              outline: "none",
              boxSizing: "border-box",
              fontFamily: "inherit",
            }}
          />
        </div>
        <button
          type="button"
          onClick={handleDownload}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "6px 12px",
            fontSize: 12,
            color: "var(--accent)",
            background: "var(--accent-soft)",
            border: "1px solid var(--border-accent)",
            borderRadius: 6,
            cursor: "pointer",
            fontWeight: 500,
            flexShrink: 0,
          }}
        >
          <Download size={12} />
          Download
        </button>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            fontSize: 12,
            borderCollapse: "collapse",
          }}
        >
          <thead>
            <tr
              style={{
                borderBottom: "1px solid var(--border)",
                color: "var(--text-muted)",
                textAlign: "left",
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              <th style={{ padding: "8px 12px", fontWeight: 500 }}>Time</th>
              <th style={{ padding: "8px 8px", fontWeight: 500 }}>Level</th>
              <th style={{ padding: "8px 8px", fontWeight: 500 }}>Service</th>
              <th style={{ padding: "8px 12px", fontWeight: 500 }}>Message</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  style={{
                    padding: "24px 12px",
                    textAlign: "center",
                    color: "var(--text-muted)",
                    fontSize: 13,
                  }}
                >
                  No log entries match your filters
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => {
                const levelStyle = LEVEL_STYLES[log.level];
                return (
                  <tr
                    key={log.id}
                    style={{
                      borderBottom: "1px solid var(--border)",
                      cursor: "default",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLTableRowElement).style.background =
                        "var(--bg-hover)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLTableRowElement).style.background =
                        "transparent";
                    }}
                  >
                    <td
                      style={{
                        padding: "8px 12px",
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: 11,
                        color: "var(--text-secondary)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {log.time}
                    </td>
                    <td style={{ padding: "8px 8px" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "2px 8px",
                          borderRadius: "var(--r-pill)",
                          fontSize: 10,
                          fontWeight: 600,
                          color: levelStyle.color,
                          background: levelStyle.bg,
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                        }}
                      >
                        {LEVEL_ICONS[log.level]}
                        {log.level}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "8px 8px",
                        fontSize: 11,
                        color: "var(--text-secondary)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {log.service}
                    </td>
                    <td
                      style={{
                        padding: "8px 12px",
                        fontSize: 12,
                        color: "var(--text-primary)",
                        maxWidth: 400,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {log.message}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer count */}
      <div
        style={{
          padding: "8px 16px",
          borderTop: "1px solid var(--border)",
          fontSize: 11,
          color: "var(--text-muted)",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span>
          {filteredLogs.length} of {allLogs.length} entries
        </span>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
          {events.length} events
        </span>
      </div>
    </motion.div>
  );
}
