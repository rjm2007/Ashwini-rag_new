"use client";

import { ReactNode } from "react";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";
import ProtectedRoute from "../../components/ProtectedRoute";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <Sidebar />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <Topbar />
          <main
            className="animate-page-in"
            style={{ flex: 1, padding: "24px", backgroundColor: "#F0F4F8" }}
          >
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
