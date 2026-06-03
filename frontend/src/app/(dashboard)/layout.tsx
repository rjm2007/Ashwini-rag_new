"use client";

import { ReactNode } from "react";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";
import ProtectedRoute from "../../components/ProtectedRoute";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-page)" }}>
        <Sidebar />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <Topbar />
          <main style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>{children}</main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
