"use client";

import { ReactNode } from "react";
import { DepotSkyline, SkyGrain } from "./DepotSkyline";

export interface SkyKpi {
  label: string;
  value: ReactNode;
  /** Small trailing note beside the value, e.g. "+6" or "3 to review". */
  note?: string;
  noteTone?: "good" | "warn" | "bad" | "muted";
}

const NOTE_TONE: Record<string, string> = {
  good: "#7FE3B8",
  warn: "#FFCE85",
  bad: "#FFA8A6",
  muted: "rgba(255,246,234,0.6)",
};

/**
 * Header level 1 — the full sky.
 *
 * Deliberately used on ONLY two routes: the dashboard and login. Atmosphere is
 * a first-impression device; on the fourth visit of a working day it becomes
 * friction. Every other page gets BandHeader (level 2) or the Topbar (level 3).
 *
 * Height is 240px rather than the 280px in the spec because this renders below
 * the global 56px Topbar, which the spec's standalone mockups did not include.
 */
export default function SkyHeader({
  title,
  subtitle,
  kpis = [],
  children,
}: {
  title: string;
  subtitle?: string;
  kpis?: SkyKpi[];
  children?: ReactNode;
}) {
  return (
    <div
      style={{
        position: "relative",
        height: 276,
        flexShrink: 0,
        overflow: "hidden",
        background: "var(--sky)",
      }}
    >
      {/* The sun, behind both the glass panels and the skyline */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: "50%",
          bottom: 34,
          width: 190,
          height: 190,
          transform: "translateX(-50%)",
          borderRadius: "50%",
          background: "var(--sun)",
          pointerEvents: "none",
        }}
      />
      <DepotSkyline height={124} />
      <SkyGrain />

      {/* The 46px bottom padding is load-bearing: it leaves a clear band of
          silhouette below the KPI row. Without it the glass panels sit flush on
          the skyline and the buildings never read. */}
      <div
        style={{
          position: "relative",
          zIndex: 3,
          height: "100%",
          padding: "26px 32px 46px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 38,
            fontWeight: 700,
            letterSpacing: "-0.04em",
            lineHeight: 1,
            color: "var(--sky-ink)",
            textShadow: "0 2px 26px rgba(0,0,0,0.45)",
            textWrap: "balance",
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            style={{
              margin: "11px 0 0",
              fontSize: 13.5,
              lineHeight: 1.55,
              color: "var(--sky-ink-dim)",
              maxWidth: "58ch",
            }}
          >
            {subtitle}
          </p>
        )}

        {kpis.length > 0 && (
          <div style={{ marginTop: "auto", display: "flex", gap: 12 }}>
            {kpis.map((k) => (
              <div
                key={k.label}
                className="glass"
                style={{ flex: 1, borderRadius: "var(--r-lg)", padding: "11px 15px" }}
              >
                <span
                  style={{
                    display: "block",
                    fontSize: 9.5,
                    letterSpacing: "0.13em",
                    textTransform: "uppercase",
                    color: "rgba(255,246,234,0.6)",
                    fontWeight: 600,
                  }}
                >
                  {k.label}
                </span>
                <b
                  className="tnum"
                  style={{
                    display: "block",
                    fontSize: 24,
                    fontWeight: 700,
                    letterSpacing: "-0.03em",
                    color: "var(--sky-ink)",
                    marginTop: 4,
                  }}
                >
                  {k.value}
                  {k.note && (
                    <em
                      style={{
                        fontStyle: "normal",
                        fontSize: 11,
                        fontWeight: 600,
                        marginLeft: 7,
                        color: NOTE_TONE[k.noteTone || "muted"],
                      }}
                    >
                      {k.note}
                    </em>
                  )}
                </b>
              </div>
            ))}
          </div>
        )}

        {children}
      </div>
    </div>
  );
}
