"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  FileText,
  UploadCloud,
  BarChart3,
  FileStack,
  Puzzle,
  Settings,
  LogOut,
  ChevronLeft,
  AlertCircle,
  Phone,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { logout } from "../lib/auth";
import { useState } from "react";

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
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { href: "/documents", icon: Home, title: "Home", roles: ["admin", "reviewer", "user"] },
    { href: "/documents", icon: FileText, title: "Documents", roles: ["admin", "reviewer", "user"] },
    { href: "/upload", icon: UploadCloud, title: "Upload", roles: ["admin", "reviewer"] },
    { href: "/documents", icon: BarChart3, title: "Analytics", roles: ["admin"] },
    { href: "/documents", icon: FileStack, title: "Templates", roles: ["admin"] },
    { href: "/documents", icon: Puzzle, title: "Integrations", roles: ["admin"] },
    { href: "/defects", icon: AlertCircle, title: "Defects", roles: ["admin", "reviewer", "user"] },
    { href: "/call", icon: Phone, title: "Call", roles: ["admin", "reviewer", "user"] },
    { href: "/documents", icon: Settings, title: "Settings", roles: ["admin", "reviewer", "user"] },
  ].filter((item) => item.roles.includes(role));

  const handleLogout = () => {
    logout();
    window.location.href = "/";
  };

  const sidebarWidth = collapsed ? 64 : 248;

  return (
    <aside
      style={{
        width: sidebarWidth,
        minHeight: "100vh",
        background: "var(--bg-sidebar)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        transition: "width 200ms var(--ease-out)",
        overflow: "hidden",
      }}
    >
      {/* Brand */}
      <div
        style={{
          padding: collapsed ? "20px 12px" : "20px 20px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          minHeight: 64,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: "var(--accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <FileText size={18} color="#FFF" />
        </div>
        {!collapsed && (
          <div style={{ overflow: "hidden", whiteSpace: "nowrap" }}>
            <div
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: "#FFFFFF",
                lineHeight: 1.2,
              }}
            >
              Fixyee
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--text-sidebar)",
                lineHeight: 1.3,
              }}
            >
              AI Document Intelligence
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 2,
          padding: collapsed ? "8px 8px" : "8px 12px",
        }}
      >
        {navItems.map((item) => {
          const isActive =
            (item.title === "Documents" && pathname?.startsWith("/documents")) ||
            (item.title === "Upload" && pathname?.startsWith("/upload")) ||
            (item.title === "Defects" && pathname?.startsWith("/defects")) ||
            (item.title === "Call" && pathname?.startsWith("/call")) ||
            (item.title === "Home" && pathname === "/documents");
          const Icon = item.icon;
          return (
            <Link
              key={item.title}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: collapsed ? "10px 12px" : "10px 12px",
                borderRadius: 8,
                background: isActive ? "var(--bg-sidebar-active)" : "transparent",
                color: isActive ? "var(--text-sidebar-active)" : "var(--text-sidebar)",
                fontSize: 13,
                fontWeight: isActive ? 500 : 400,
                textDecoration: "none",
                transition: "all 150ms ease",
                position: "relative",
                whiteSpace: "nowrap",
                borderLeft: isActive ? "2px solid var(--accent)" : "2px solid transparent",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "var(--bg-sidebar-hover)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "transparent";
                }
              }}
            >
              <Icon
                size={20}
                style={{
                  color: isActive ? "var(--accent)" : "var(--text-sidebar)",
                  flexShrink: 0,
                }}
              />
              {!collapsed && <span>{item.title}</span>}
          </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        style={{
          margin: collapsed ? "0 8px 8px" : "0 12px 8px",
          padding: "8px",
          borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.08)",
          background: "transparent",
          color: "var(--text-sidebar)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 150ms ease",
        }}
      >
        <ChevronLeft
          size={16}
          style={{
            transform: collapsed ? "rotate(180deg)" : "none",
            transition: "transform 200ms ease",
          }}
        />
      </button>

      {/* User block */}
      <div
        style={{
          padding: collapsed ? "12px 8px" : "12px 16px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "var(--accent)",
            color: "#FFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 600,
            fontFamily: "'IBM Plex Mono', monospace",
            flexShrink: 0,
          }}
        >
          {initials}
        </div>
        {!collapsed && (
          <div style={{ flex: 1, overflow: "hidden", minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "#FFF",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {user?.email?.split("@")[0] || "Admin User"}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--text-sidebar)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {user?.email || "admin@docintel.com"}
            </div>
          </div>
        )}
        {!collapsed && (
          <button
            type="button"
            onClick={handleLogout}
            title="Logout"
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-sidebar)",
              cursor: "pointer",
              padding: 4,
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
            }}
          >
            <LogOut size={16} />
          </button>
        )}
      </div>
    </aside>
  );
}
