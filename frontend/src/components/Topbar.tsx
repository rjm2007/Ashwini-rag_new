"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getUser } from "../lib/auth";

function getInitials(email: string): string {
  const parts = email.split("@")[0].split(/[._-]/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return email.substring(0, 2).toUpperCase();
}

function getBreadcrumb(pathname: string): string {
  if (pathname === "/documents") return "Documents";
  if (pathname === "/upload") return "Upload";
  if (pathname.startsWith("/documents/")) {
    const parts = pathname.split("/");
    return `Documents / ${parts[parts.length - 1].slice(0, 8)}…`;
  }
  if (pathname.startsWith("/review")) return "Review";
  return "Document Intelligence";
}

export default function Topbar({ breadcrumbOverride }: { breadcrumbOverride?: string }) {
  const pathname = usePathname();
  const [user, setUser] = useState<{ email?: string; role?: string } | null>(null);

  useEffect(() => {
    setUser(getUser());
  }, []);

  const breadcrumb = breadcrumbOverride || getBreadcrumb(pathname || "");
  const initials = user?.email ? getInitials(user.email) : "??";
  const role = user?.role || "user";

  return (
    <header
      style={{
        height: 48,
        background: "var(--bg-surface)",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        flexShrink: 0
      }}
    >
      <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{breadcrumb}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 500,
            padding: "2px 8px",
            borderRadius: 99,
            border: "1px solid var(--border)",
            color: "var(--text-secondary)",
            textTransform: "uppercase"
          }}
        >
          {role}
        </span>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "var(--accent)",
            color: "var(--bg-page)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 10,
            fontWeight: 600,
            fontFamily: "IBM Plex Mono, monospace"
          }}
        >
          {initials}
        </div>
      </div>
    </header>
  );
}
