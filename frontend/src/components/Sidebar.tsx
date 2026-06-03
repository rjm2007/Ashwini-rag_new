"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, UploadCloud, Settings } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { logout } from "../lib/auth";

function getInitials(email: string): string {
  const parts = email.split("@")[0].split(/[._-]/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return email.substring(0, 2).toUpperCase();
}

export default function Sidebar() {
  const { user } = useAuth();
  const pathname = usePathname();
  const role = user?.role || "user";
  const initials = user?.email ? getInitials(user.email) : "??";

  const navItems = [
    { href: "/documents", icon: FileText, title: "Documents", roles: ["admin", "reviewer", "user"] },
    { href: "/upload", icon: UploadCloud, title: "Upload", roles: ["admin", "reviewer"] }
  ].filter((item) => item.roles.includes(role));

  const handleLogout = () => {
    logout();
    window.location.href = "/";
  };

  return (
    <aside
      style={{
        width: 52,
        minHeight: "100vh",
        background: "var(--bg-surface)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        flexShrink: 0,
        padding: "8px 0"
      }}
    >
      <nav style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href === "/documents" && pathname?.startsWith("/documents")) ||
            pathname?.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.title}
              style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: isActive ? "var(--accent-dim)" : "transparent",
                color: isActive ? "var(--accent)" : "var(--text-muted)"
              }}
            >
              <Icon size={20} />
            </Link>
          );
        })}
        <button
          type="button"
          title="Settings"
          style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "transparent",
            border: "none",
            color: "var(--text-muted)",
            cursor: "default",
            marginTop: 4
          }}
        >
          <Settings size={20} />
        </button>
      </nav>

      <button
        type="button"
        title={user?.email || "Account"}
        onClick={handleLogout}
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          background: "var(--accent)",
          color: "var(--bg-page)",
          border: "none",
          fontSize: 11,
          fontWeight: 600,
          cursor: "pointer",
          marginBottom: 8,
          fontFamily: "IBM Plex Mono, monospace"
        }}
      >
        {initials}
      </button>
    </aside>
  );
}
