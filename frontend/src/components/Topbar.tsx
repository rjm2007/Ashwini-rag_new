"use client";

import { getUser, logout } from "../lib/auth";

export default function Topbar() {
  const user = typeof window !== "undefined" ? getUser() : null;

  const onLogout = () => {
    // This function logs out and redirects user to login page.
    logout();
    window.location.href = "/";
  };

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
      <p className="text-sm text-slate-600">
        Signed in as <span className="font-medium text-slate-800">{user?.email || "Guest"}</span>
      </p>
      <button className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm text-white" onClick={onLogout}>
        Logout
      </button>
    </header>
  );
}
