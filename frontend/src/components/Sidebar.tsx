"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Upload,
  FileText,
  ClipboardCheck,
  MessageCircle,
  LogOut,
  ShieldCheck
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { logout } from "../lib/auth";

const ALL_NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "reviewer", "user"] },
  { href: "/upload", label: "Upload", icon: Upload, roles: ["admin"] },
  { href: "/documents", label: "Documents", icon: FileText, roles: ["admin", "reviewer"] },
  { href: "/review", label: "Review", icon: ClipboardCheck, roles: ["admin", "reviewer"] },
  { href: "/chat", label: "Chat", icon: MessageCircle, roles: ["admin", "reviewer", "user"] }
];

export default function Sidebar() {
  const { user } = useAuth();
  const pathname = usePathname();
  const role = user?.role || "user";

  const navItems = ALL_NAV_ITEMS.filter((item) => item.roles.includes(role));

  const handleLogout = () => {
    logout();
    window.location.href = "/";
  };

  return (
    <aside
      className="flex flex-col"
      style={{
        width: "256px",
        minHeight: "100vh",
        backgroundColor: "#06101E",
        borderRight: "1px solid #1A2B42",
        flexShrink: 0
      }}
    >
      <div style={{ padding: "20px", borderBottom: "1px solid #1A2B42" }}>
        <div className="flex items-center gap-2.5">
          <div
            style={{
              width: 32,
              height: 32,
              backgroundColor: "#FF6200",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0
            }}
          >
            <ShieldCheck size={18} color="white" />
          </div>
          <span style={{ color: "#FFFFFF", fontSize: 14, fontWeight: 700 }}>Warranty AI</span>
        </div>
        <div style={{ marginTop: 10 }}>
          <span
            style={{
              backgroundColor: "#FF6200",
              color: "#FFFFFF",
              fontSize: 10,
              fontWeight: 600,
              padding: "2px 8px",
              borderRadius: 99,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              fontFamily: "DM Mono, monospace"
            }}
          >
            {role}
          </span>
        </div>
      </div>

      <nav style={{ flex: 1, padding: "12px 8px" }}>
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: isActive ? "10px 16px 10px 13px" : "10px 16px",
                marginBottom: 2,
                borderRadius: 8,
                backgroundColor: isActive ? "#1A2B42" : "transparent",
                borderLeft: isActive ? "3px solid #FF6200" : "3px solid transparent",
                color: isActive ? "#FFFFFF" : "#8BAABF",
                fontSize: 14,
                fontWeight: 500,
                textDecoration: "none",
                transition: "all 0.15s ease"
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "#0D1B2E";
                  (e.currentTarget as HTMLElement).style.color = "#FFFFFF";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                  (e.currentTarget as HTMLElement).style.color = "#8BAABF";
                }
              }}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div style={{ borderTop: "1px solid #1A2B42" }}>
        <div
          style={{
            padding: "12px 20px 4px",
            fontSize: 11,
            color: "#4A6680",
            fontFamily: "DM Mono, monospace"
          }}
        >
          v1.0 POC
        </div>
        <button
          onClick={handleLogout}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            width: "100%",
            padding: "10px 20px 16px",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#8BAABF",
            fontSize: 14,
            transition: "color 0.15s ease"
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = "#FFFFFF";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = "#8BAABF";
          }}
        >
          <LogOut size={16} />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
}
