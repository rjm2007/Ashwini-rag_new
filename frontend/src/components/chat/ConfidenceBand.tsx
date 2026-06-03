"use client";

import { useEffect, useState } from "react";
import type { ConfidenceBand as ConfidenceBandType } from "../../lib/types";

function bandFromScore(confidence: number): ConfidenceBandType {
  if (confidence >= 0.75) return "high";
  if (confidence >= 0.45) return "medium";
  return "low";
}

const COLORS: Record<ConfidenceBandType, string> = {
  high: "var(--confidence-high)",
  medium: "var(--confidence-mid)",
  low: "var(--confidence-low)"
};

export default function ConfidenceBand({
  confidence,
  band: bandProp
}: {
  confidence: number;
  band?: ConfidenceBandType;
}) {
  const band = bandProp || bandFromScore(confidence);
  const [width, setWidth] = useState(0);
  const pct = Math.round(confidence * 100);

  useEffect(() => {
    const t = requestAnimationFrame(() => setWidth(pct));
    return () => cancelAnimationFrame(t);
  }, [pct]);

  return (
    <div style={{ marginTop: 8 }}>
      <p className="mono" style={{ fontSize: 11, color: COLORS[band], margin: "0 0 4px" }}>
        {band} confidence · {pct}%
      </p>
      <div
        style={{
          height: 3,
          width: "100%",
          background: "var(--bg-raised)",
          borderRadius: 2,
          overflow: "hidden"
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${width}%`,
            background: COLORS[band],
            borderRadius: 2,
            transition: "width 400ms ease-out"
          }}
        />
      </div>
    </div>
  );
}
