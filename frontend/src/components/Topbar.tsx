"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, Search } from "lucide-react";
import { getUser } from "../lib/auth";

function getInitials(email: string): string {
  const parts = email.split("@")[0].split(/[._-]/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return email.substring(0, 2).toUpperCase();
}

function getBreadcrumb(pathname: string): { parts: string[] } {
  if (pathname === "/documents") return { parts: ["Documents"] };
  if (pathname === "/upload") return { parts: ["Upload"] };
  if (pathname.startsWith("/documents/")) {
    return { parts: ["Documents", "Document Detail"] };
  }
  if (pathname.startsWith("/review/")) {
    return { parts: ["Review", "Document Review"] };
  }
  if (pathname === "/review") return { parts: ["Review"] };
  if (pathname === "/chat") return { parts: ["AI Chat"] };
  return { parts: ["Document Intelligence"] };
}

export default function Topbar({ breadcrumbOverride }: { breadcrumbOverride?: string }) {
  const pathname = usePathname();
  const [user, setUser] = useState<{ email?: string; role?: string } | null>(null);

  useEffect(() => {
    setUser(getUser());
  }, []);

  const { parts } = getBreadcrumb(pathname || "");
  const initials = user?.email ? getInitials(user.email) : "??";
  const role = user?.role || "user";

  return (
    <header
      style={{
        height: 56,
        background: "var(--bg-surface)",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        flexShrink: 0,
      }}
    >
      {/* Breadcrumb */}
      <nav style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {breadcrumbOverride ? (
          <span style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>
            {breadcrumbOverride}
          </span>
        ) : (
          parts.map((part, i) => (
            <span key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {i > 0 && (
                <span style={{ color: "var(--text-muted)", fontSize: 12 }}>/</span>
              )}
              <span
                style={{
                  fontSize: 13,
                  color: i === parts.length - 1 ? "var(--text-primary)" : "var(--text-secondary)",
                  fontWeight: i === parts.length - 1 ? 500 : 400,
                }}
              >
                {part}
              </span>
            </span>
          ))
        )}
      </nav>

      {/* Right actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* Search (decorative) */}
        <button
          type="button"
          style={{
            width: 36,
            height: 36,
            borderRadius: "var(--r-sm)",
            border: "none",
            background: "transparent",
            color: "var(--text-muted)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Search size={18} />
        </button>

        {/* Bell */}
        <button
          type="button"
          style={{
            width: 36,
            height: 36,
            borderRadius: "var(--r-sm)",
            border: "none",
            background: "transparent",
            color: "var(--text-muted)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          <Bell size={18} />
        </button>

        {/* Divider */}
        <div
          style={{
            width: 1,
            height: 24,
            background: "var(--border)",
          }}
        />

        {/* Role pill */}
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            padding: "3px 10px",
            borderRadius: "var(--r-pill)",
            border: "1px solid var(--border)",
            color: "var(--text-secondary)",
            textTransform: "capitalize",
            letterSpacing: "0.02em",
          }}
        >
          {role}
        </span>

        {/* Avatar */}
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "var(--accent)",
            color: "var(--text-inverse)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 600,
            fontFamily: "'IBM Plex Mono', monospace",
          }}
        >
          {initials}
        </div>
      </div>
    </header>
  );
}
