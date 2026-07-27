"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  FileText,
  UploadCloud,
  Settings,
  KeyRound,
  LogOut,
  ChevronLeft,
  AlertCircle,
  Phone,
  History,
  Truck,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { logout } from "../lib/auth";
import api from "../lib/api";

function getInitials(email: string): string {
  const parts = email.split("@")[0].split(/[._-]/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return email.substring(0, 2).toUpperCase();
}

type NavItem = {
  href: string;
  icon: LucideIcon;
  title: string;
  roles: string[];
  /** Route prefixes that should light this item up. */
  match: string[];
  /** Renders the pending-review count. */
  badge?: "review";
};

type NavGroup = { label: string; items: NavItem[] };

const ALL: string[] = ["admin", "reviewer", "user"];

/**
 * Grouped rather than a flat list of ten. Ten items is an inventory; five
 * groups of two is a structure you can navigate without reading every label.
 *
 * `/review` and `/chat` are included here deliberately — both routes already
 * existed and neither was reachable from navigation.
 */
const GROUPS: NavGroup[] = [
  {
    label: "Workspace",
    items: [
      { href: "/dashboard", icon: Home, title: "Home", roles: ALL, match: ["/dashboard"] },
      { href: "/documents", icon: FileText, title: "Documents", roles: ALL, match: ["/documents"] },
      { href: "/upload", icon: UploadCloud, title: "Upload", roles: ["admin", "reviewer"], match: ["/upload"] },
    ],
  },
  {
    label: "Claims",
    items: [
      { href: "/defects", icon: AlertCircle, title: "Defects", roles: ALL, match: ["/defects"] },
      { href: "/review", icon: ShieldCheck, title: "Review", roles: ["admin", "reviewer"], match: ["/review"], badge: "review" },
    ],
  },
  {
    label: "Voice",
    items: [
      { href: "/call", icon: Phone, title: "Call", roles: ALL, match: ["/call"] },
      { href: "/call-logs", icon: History, title: "Call Logs", roles: ALL, match: ["/call-logs"] },
    ],
  },
  // No "Assistant" entry. A global chat has no document in scope, so it
  // answers coverage questions with "I couldn't find any coverage rows for
  // this document." The useful assistants are the document-scoped one on
  // /documents/[id] and the defect thread on /defects/[id], both of which
  // already know which warranty they are reading.
  {
    label: "Admin",
    items: [
      { href: "/settings", icon: Settings, title: "Settings", roles: ALL, match: ["/settings"] },
      { href: "/api-keys", icon: KeyRound, title: "API Keys", roles: ["admin"], match: ["/api-keys"] },
    ],
  },
];

/** `/call` must not light up while on `/call-logs`. */
function isActive(pathname: string, item: NavItem): boolean {
  return item.match.some((m) => {
    if (m === "/call") return pathname === "/call" || pathname.startsWith("/call/");
    if (m === "/dashboard") return pathname === "/dashboard";
    return pathname === m || pathname.startsWith(m + "/");
  });
}

export default function Sidebar() {
  const { user } = useAuth();
  const pathname = usePathname() || "";
  const role = user?.role || "user";
  const initials = user?.email ? getInitials(user.email) : "??";
  const [collapsed, setCollapsed] = useState(false);
  const [pendingReview, setPendingReview] = useState<number | null>(null);

  // Pending-review count. Degrades silently: if the call fails the badge is
  // simply absent rather than showing a wrong number.
  useEffect(() => {
    let cancelled = false;
    api
      .get("/review/pending")
      .then((res) => {
        if (cancelled) return;
        setPendingReview(Array.isArray(res.data) ? res.data.length : null);
      })
      .catch(() => {
        if (!cancelled) setPendingReview(null);
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

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
        borderRight: "1px solid var(--border-sidebar)",
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
          <Truck size={19} color="var(--accent-fg)" />
        </div>
        {!collapsed && (
          <div style={{ overflow: "hidden", whiteSpace: "nowrap" }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.2 }}>
              Warranty Platform
            </div>
            <div style={{ fontSize: 11, color: "var(--text-sidebar-dim)", lineHeight: 1.3 }}>
              Fleet coverage intelligence
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
          gap: 1,
          padding: collapsed ? "4px 8px" : "4px 12px",
          overflowY: "auto",
        }}
      >
        {GROUPS.map((group) => {
          const visible = group.items.filter((i) => i.roles.includes(role));
          if (visible.length === 0) return null;
          return (
            <div key={group.label} style={{ display: "contents" }}>
              {!collapsed && (
                <div
                  className="mono"
                  style={{
                    fontSize: 9,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    color: "var(--text-sidebar-dim)",
                    padding: "12px 9px 5px",
                  }}
                >
                  {group.label}
                </div>
              )}
              {collapsed && <div style={{ height: 10 }} />}
              {visible.map((item) => {
                const active = isActive(pathname, item);
                const Icon = item.icon;
                const showBadge =
                  item.badge === "review" && pendingReview !== null && pendingReview > 0;
                return (
                  <Link
                    key={item.title}
                    href={item.href}
                    title={collapsed ? item.title : undefined}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: collapsed ? "10px 12px" : "9px 11px",
                      borderRadius: 9,
                      background: active ? "var(--bg-sidebar-active)" : "transparent",
                      color: active ? "var(--text-sidebar-active)" : "var(--text-sidebar)",
                      fontSize: 13,
                      fontWeight: active ? 650 : 400,
                      textDecoration: "none",
                      transition: "background 150ms ease, color 150ms ease",
                      position: "relative",
                      whiteSpace: "nowrap",
                      boxShadow: active ? "inset 2px 0 0 var(--accent)" : "none",
                    }}
                    onMouseEnter={(e) => {
                      if (!active) e.currentTarget.style.background = "var(--bg-sidebar-hover)";
                    }}
                    onMouseLeave={(e) => {
                      if (!active) e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <Icon
                      size={18}
                      style={{
                        color: active ? "var(--accent)" : "var(--text-sidebar)",
                        flexShrink: 0,
                        opacity: active ? 1 : 0.8,
                      }}
                    />
                    {!collapsed && <span style={{ flex: 1 }}>{item.title}</span>}
                    {showBadge &&
                      (collapsed ? (
                        <span
                          style={{
                            position: "absolute",
                            top: 7,
                            right: 9,
                            width: 7,
                            height: 7,
                            borderRadius: "50%",
                            background: "var(--warning)",
                          }}
                        />
                      ) : (
                        <span
                          className="mono"
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            background: "var(--warning)",
                            color: "var(--accent-fg)",
                            borderRadius: "var(--r-pill)",
                            padding: "1px 6px",
                          }}
                        >
                          {pendingReview}
                        </span>
                      ))}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        style={{
          margin: collapsed ? "0 8px 8px" : "0 12px 8px",
          padding: "8px",
          borderRadius: 8,
          border: "1px solid var(--border-sidebar)",
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
          borderTop: "1px solid var(--border-sidebar)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          className="mono"
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            background: "var(--accent)",
            color: "var(--accent-fg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {initials}
        </div>
        {!collapsed && (
          <div style={{ flex: 1, overflow: "hidden", minWidth: 0 }}>
            <div
              style={{
                fontSize: 12.5,
                fontWeight: 600,
                color: "var(--text-primary)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {user?.email?.split("@")[0] || "Admin User"}
            </div>
            <div
              style={{
                fontSize: 10.5,
                color: "var(--text-sidebar-dim)",
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
            title="Log out"
            aria-label="Log out"
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
