"use client";

import { ReactNode } from "react";
import { DepotSkyline, SkyGrain } from "./DepotSkyline";

export interface BandStat {
  label: string;
  value: ReactNode;
}

/**
 * Header level 2 — the band.
 *
 * The same dusk gradient compressed, with a thin skyline strip that keeps the
 * identity alive. Counts sit inline on the right instead of consuming a whole
 * card row below the header.
 *
 * Used on every section landing page: documents, upload, defects, review,
 * call-logs, settings, api-keys, chat.
 */
export default function BandHeader({
  title,
  subtitle,
  stats = [],
  action,
  count,
}: {
  title: string;
  subtitle?: string;
  stats?: BandStat[];
  action?: ReactNode;
  /** Optional badge after the title — used for the review queue's pending count. */
  count?: number | string;
}) {
  return (
    <div
      style={{
        position: "relative",
        height: 118,
        flexShrink: 0,
        overflow: "hidden",
        background: "var(--sky-band)",
      }}
    >
      <DepotSkyline height={22} opacity={0.9} />
      <SkyGrain opacity={0.26} />

      <div
        style={{
          position: "relative",
          zIndex: 3,
          height: "100%",
          padding: "20px 32px 0",
          display: "flex",
          alignItems: "flex-start",
          gap: 20,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <h1
            style={{
              margin: 0,
              fontSize: 27,
              fontWeight: 700,
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
              color: "var(--sky-ink)",
              display: "flex",
              alignItems: "center",
              gap: 11,
            }}
          >
            {title}
            {count !== undefined && count !== null && (
              <span
                className="mono"
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  background: "var(--warning)",
                  color: "var(--accent-fg)",
                  borderRadius: "var(--r-pill)",
                  padding: "2px 10px",
                }}
              >
                {count}
              </span>
            )}
          </h1>
          {subtitle && (
            <p
              style={{
                margin: "7px 0 0",
                fontSize: 12.5,
                lineHeight: 1.5,
                color: "rgba(255,246,234,0.7)",
                maxWidth: "58ch",
              }}
            >
              {subtitle}
            </p>
          )}
        </div>

        {stats.length > 0 && (
          <div style={{ marginLeft: "auto", display: "flex", gap: 24, textAlign: "right" }}>
            {stats.map((s) => (
              <div key={s.label}>
                <span
                  style={{
                    display: "block",
                    fontSize: 9,
                    letterSpacing: "0.13em",
                    textTransform: "uppercase",
                    color: "rgba(255,246,234,0.58)",
                    fontWeight: 600,
                  }}
                >
                  {s.label}
                </span>
                <b
                  className="tnum"
                  style={{
                    display: "block",
                    fontSize: 19,
                    fontWeight: 700,
                    letterSpacing: "-0.025em",
                    color: "var(--sky-ink)",
                    marginTop: 2,
                  }}
                >
                  {s.value}
                </b>
              </div>
            ))}
          </div>
        )}

        {action && (
          <div style={{ marginLeft: stats.length ? 18 : "auto", flexShrink: 0 }}>{action}</div>
        )}
      </div>
    </div>
  );
}

/**
 * Primary action styled to sit on the sky gradient — translucent rather than
 * solid, so it does not fight the horizon.
 */
export function SkyButton({
  children,
  onClick,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        fontSize: 12.5,
        fontWeight: 650,
        padding: "9px 15px",
        borderRadius: "var(--r-md)",
        background: "rgba(255,246,234,0.15)",
        color: "var(--sky-ink)",
        border: "1px solid rgba(255,255,255,0.22)",
        backdropFilter: "blur(10px)",
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}
