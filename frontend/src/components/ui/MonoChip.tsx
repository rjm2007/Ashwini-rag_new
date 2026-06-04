"use client";

import type { ReactNode } from "react";

export default function MonoChip({
  children,
  value,
  small,
  size
}: {
  children?: ReactNode;
  value?: string;
  small?: boolean;
  size?: "sm" | "md";
}) {
  const isSmall = small ?? size === "sm";
  return (
    <span
      style={{
        fontFamily: '"IBM Plex Mono", monospace',
        background: "var(--bg-raised)",
        border: "1px solid var(--border)",
        borderRadius: 4,
        fontSize: isSmall ? 10 : 12,
        padding: isSmall ? "1px 5px" : "2px 8px"
      }}
    >
      {children ?? value}
    </span>
  );
}
