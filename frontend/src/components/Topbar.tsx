"use client";

import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { getUser } from "../lib/auth";
import api from "../lib/api";

const PAGE_NAMES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/upload": "Upload",
  "/documents": "Documents",
  "/review": "Review Queue",
  "/chat": "Chat"
};

function getPageName(pathname: string): string {
  if (PAGE_NAMES[pathname]) return PAGE_NAMES[pathname];
  if (pathname.startsWith("/documents/")) return "Document Detail";
  if (pathname.startsWith("/review/")) return "Review Detail";
  if (pathname.startsWith("/chat/")) return "Chat Session";
  return "Page";
}

function getInitials(email: string): string {
  const parts = email.split("@")[0].split(/[._-]/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return email.substring(0, 2).toUpperCase();
}

export default function Topbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    setUser(getUser());
  }, []);

  useEffect(() => {
    api
      .get("/review/pending")
      .then((r) => setPendingCount(Array.isArray(r.data) ? r.data.length : 0))
      .catch(() => {});
  }, []);

  const pageName = getPageName(pathname || "");
  const initials = user?.email ? getInitials(user.email) : "??";

  return (
    <header
      style={{
        height: 64,
        backgroundColor: "#FFFFFF",
        borderBottom: "1px solid #D1DCE8",
        boxShadow: "0 1px 3px rgba(6,16,30,0.06)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        position: "sticky",
        top: 0,
        zIndex: 10
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 13, color: "#7A92A8" }}>Warranty AI</span>
        <span style={{ color: "#D1DCE8" }}>/</span>
        <span style={{ fontSize: 14, fontWeight: 600, color: "#0A1628" }}>{pageName}</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ position: "relative" }}>
          <Bell size={18} color="#7A92A8" />
          {pendingCount > 0 && (
            <span
              style={{
                position: "absolute",
                top: -4,
                right: -4,
                width: 8,
                height: 8,
                backgroundColor: "#FF6200",
                borderRadius: "50%",
                border: "1.5px solid white"
              }}
            />
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 13, color: "#3D5A80" }}>{user?.email || "Guest"}</span>
          <div
            style={{
              width: 32,
              height: 32,
              backgroundColor: "#FF6200",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#FFFFFF",
              fontSize: 11,
              fontWeight: 700,
              fontFamily: "DM Mono, monospace",
              flexShrink: 0
            }}
          >
            {initials}
          </div>
        </div>
      </div>
    </header>
  );
}
