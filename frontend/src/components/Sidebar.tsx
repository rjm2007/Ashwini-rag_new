"use client";

import Link from "next/link";
import { useAuth } from "../hooks/useAuth";

export default function Sidebar() {
  const { user } = useAuth();
  const role = user?.role || "user";
  const items =
    role === "admin"
      ? [
          { href: "/dashboard", label: "Dashboard" },
          { href: "/upload", label: "Upload" },
          { href: "/documents", label: "Documents" },
          { href: "/review", label: "Review" },
          { href: "/chat", label: "Chat" }
        ]
      : role === "reviewer"
        ? [
            { href: "/dashboard", label: "Dashboard" },
            { href: "/documents", label: "Documents" },
            { href: "/review", label: "Review" },
            { href: "/chat", label: "Chat" }
          ]
        : [{ href: "/chat", label: "Chat" }];

  return (
    <aside className="w-60 border-r border-slate-200 bg-white p-4">
      <h2 className="mb-1 text-sm font-semibold text-slate-800">Warranty Platform</h2>
      <p className="mb-4 text-xs text-slate-500">{role.toUpperCase()}</p>
      <nav className="space-y-2">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
